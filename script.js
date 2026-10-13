// --- Audio Synthesis via Web Audio API (Zero external assets needed) ---
class SoundManager {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playJump() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {}
  }

  playScoreMilestone() {
    if (!this.enabled || !this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.08 + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.08);
        osc.stop(this.ctx.currentTime + idx * 0.08 + 0.12);
      });
    } catch (e) {}
  }

  playGameOver() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(250, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }
}

// --- Main Dino Game Engine ---
class CyberDinoGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // UI elements
    this.scoreEl = document.getElementById('score');
    this.hiScoreEl = document.getElementById('hiScore');
    this.speedEl = document.getElementById('speedDisplay');
    this.startScreen = document.getElementById('startScreen');
    this.gameOverScreen = document.getElementById('gameOverScreen');
    this.finalScoreEl = document.getElementById('finalScore');
    this.bestScoreSummaryEl = document.getElementById('bestScoreSummary');
    this.startBtn = document.getElementById('startBtn');
    this.restartBtn = document.getElementById('restartBtn');
    this.soundToggleBtn = document.getElementById('soundToggleBtn');
    this.soundIcon = document.getElementById('soundIcon');

    // Audio
    this.sounds = new SoundManager();

    // Game state
    this.isRunning = false;
    this.isGameOver = false;
    this.score = 0;
    this.hiScore = parseInt(localStorage.getItem('cyber_dino_hi_score') || '0', 10);
    this.hiScoreEl.textContent = this.formatScore(this.hiScore);

    // Baseline coordinates
    this.groundY = 270;
    this.baseSpeed = 6;
    this.gameSpeed = 6;
    this.spawnTimer = 0;
    this.minSpawnInterval = 65;

    // Entities
    this.dino = {
      x: 70,
      y: 0,
      width: 44,
      height: 52,
      dy: 0,
      gravity: 0.85,
      jumpForce: -14.5,
      grounded: true,
      ducking: false,
      runFrame: 0,
      legSwitchTimer: 0
    };
    this.dino.y = this.groundY - this.dino.height;

    this.obstacles = [];
    this.particles = [];
    this.stars = [];
    this.clouds = [];
    this.groundOffset = 0;

    this.initBackgroundEnvironment();
    this.setupEventListeners();
    this.drawInitialState();
  }

  formatScore(num) {
    return Math.floor(num).toString().padStart(5, '0');
  }

  initBackgroundEnvironment() {
    // Distant futuristic floating city skyline & stars
    this.stars = [];
    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * (this.groundY - 60),
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.7 + 0.3,
        flickerSpeed: Math.random() * 0.05 + 0.01
      });
    }

    this.clouds = [];
    for (let i = 0; i < 4; i++) {
      this.clouds.push({
        x: Math.random() * this.canvas.width,
        y: 30 + Math.random() * 80,
        width: 60 + Math.random() * 40,
        height: 14 + Math.random() * 8,
        speed: 0.5 + Math.random() * 0.5
      });
    }
  }

  setupEventListeners() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        this.handleJumpPress();
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        this.handleDuckPress(true);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        this.handleDuckPress(false);
      }
    });

    // Button controls
    this.startBtn.addEventListener('click', () => {
      this.sounds.init();
      this.startGame();
    });

    this.restartBtn.addEventListener('click', () => {
      this.sounds.init();
      this.resetGame();
    });

    // Touch on-screen buttons
    const touchJump = document.getElementById('touchJumpBtn');
    const touchDuck = document.getElementById('touchDuckBtn');

    if (touchJump) {
      touchJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.sounds.init();
        this.handleJumpPress();
      });
    }

    if (touchDuck) {
      touchDuck.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleDuckPress(true);
      });
      touchDuck.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.handleDuckPress(false);
      });
    }

    // Audio toggle
    this.soundToggleBtn.addEventListener('click', () => {
      this.sounds.enabled = !this.sounds.enabled;
      this.soundIcon.textContent = this.sounds.enabled ? '🔊' : '🔇';
      this.soundToggleBtn.innerHTML = `${this.soundIcon.outerHTML} Audio: ${this.sounds.enabled ? 'ON' : 'OFF'}`;
      if (this.sounds.enabled) this.sounds.init();
    });

    // Canvas click to jump if running
    this.canvas.addEventListener('pointerdown', () => {
      this.sounds.init();
      if (!this.isRunning && !this.isGameOver) {
        this.startGame();
      } else if (this.isRunning) {
        this.handleJumpPress();
      } else if (this.isGameOver) {
        this.resetGame();
      }
    });
  }

  handleJumpPress() {
    if (!this.isRunning) {
      if (this.isGameOver) {
        this.resetGame();
      } else {
        this.startGame();
      }
      return;
    }

    if (this.dino.grounded) {
      this.dino.dy = this.dino.jumpForce;
      this.dino.grounded = false;
      this.sounds.playJump();
      this.createJumpParticles(this.dino.x + 20, this.groundY);
    }
  }

  handleDuckPress(isDucking) {
    if (!this.isRunning) return;
    this.dino.ducking = isDucking;
    if (isDucking) {
      this.dino.height = 32;
      this.dino.width = 54;
      // Faster descent if ducking mid-air
      if (!this.dino.grounded) {
        this.dino.dy += 3.5;
      }
    } else {
      this.dino.height = 52;
      this.dino.width = 44;
    }
  }

  startGame() {
    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.isRunning = true;
    this.isGameOver = false;
    this.score = 0;
    this.gameSpeed = this.baseSpeed;
    this.obstacles = [];
    this.particles = [];
    this.spawnTimer = 40;
    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  resetGame() {
    this.startGame();
  }

  gameOver() {
    this.isRunning = false;
    this.isGameOver = true;
    this.sounds.playGameOver();

    // Trigger hit burst particles
    this.createHitParticles(this.dino.x + this.dino.width / 2, this.dino.y + this.dino.height / 2);

    if (this.score > this.hiScore) {
      this.hiScore = Math.floor(this.score);
      localStorage.setItem('cyber_dino_hi_score', this.hiScore.toString());
      this.hiScoreEl.textContent = this.formatScore(this.hiScore);
    }

    this.finalScoreEl.textContent = this.formatScore(this.score);
    this.bestScoreSummaryEl.textContent = this.formatScore(this.hiScore);
    this.gameOverScreen.classList.remove('hidden');

    // Redraw with defeat frame
    this.render();
  }

  createJumpParticles(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x + (Math.random() * 20 - 10),
        y: y - 2,
        vx: (Math.random() - 0.5) * 3 - 2,
        vy: -Math.random() * 2,
        size: Math.random() * 3 + 2,
        color: '#00f3ff',
        alpha: 1,
        decay: 0.04
      });
    }
  }

  createHitParticles(x, y) {
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 6 + 2;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: Math.random() * 4 + 2,
        color: Math.random() > 0.5 ? '#ff007f' : '#00f3ff',
        alpha: 1,
        decay: 0.03
      });
    }
  }

  spawnObstacle() {
    const isPterodactyl = this.score > 250 && Math.random() < 0.35;

    if (isPterodactyl) {
      // High or low flying cyber bird
      const flyHeights = [this.groundY - 55, this.groundY - 30];
      const y = flyHeights[Math.floor(Math.random() * flyHeights.length)];
      this.obstacles.push({
        type: 'flyer',
        x: this.canvas.width + 20,
        y: y,
        width: 44,
        height: 28,
        wingFrame: 0,
        wingTimer: 0
      });
    } else {
      // Neon cactus / cyber barrier
      const cactusCount = Math.random() < 0.3 && this.score > 150 ? 2 : 1;
      const height = 44 + Math.floor(Math.random() * 14);
      const width = cactusCount === 2 ? 46 : 24;

      this.obstacles.push({
        type: 'cactus',
        x: this.canvas.width + 20,
        y: this.groundY - height,
        width: width,
        height: height,
        double: cactusCount === 2
      });
    }
  }

  update(dt) {
    // Score increase
    const prevMilestone = Math.floor(this.score / 100);
    this.score += 0.18;
    const currMilestone = Math.floor(this.score / 100);
    if (currMilestone > prevMilestone && currMilestone > 0) {
      this.sounds.playScoreMilestone();
    }

    this.scoreEl.textContent = this.formatScore(this.score);

    // Speed progression curve
    this.gameSpeed = this.baseSpeed + Math.min(Math.floor(this.score / 200) * 0.8, 8.5);
    this.speedEl.textContent = `${(this.gameSpeed / this.baseSpeed).toFixed(1)}x`;

    // Ground scroll offset
    this.groundOffset = (this.groundOffset + this.gameSpeed) % 40;

    // Dino Physics
    if (!this.dino.grounded) {
      this.dino.dy += this.dino.gravity;
      this.dino.y += this.dino.dy;

      if (this.dino.y >= this.groundY - this.dino.height) {
        this.dino.y = this.groundY - this.dino.height;
        this.dino.dy = 0;
        this.dino.grounded = true;
      }
    } else {
      this.dino.legSwitchTimer += 1;
      if (this.dino.legSwitchTimer > 5) {
        this.dino.runFrame = 1 - this.dino.runFrame;
        this.dino.legSwitchTimer = 0;
      }
    }

    // Clouds
    for (const cloud of this.clouds) {
      cloud.x -= cloud.speed + this.gameSpeed * 0.1;
      if (cloud.x + cloud.width < 0) {
        cloud.x = this.canvas.width + 50;
        cloud.y = 30 + Math.random() * 80;
      }
    }

    // Obstacle spawn
    this.spawnTimer--;
    if (this.spawnTimer <= 0) {
      this.spawnObstacle();
      const variation = Math.floor(Math.random() * 35);
      this.spawnTimer = Math.max(this.minSpawnInterval - Math.floor(this.gameSpeed * 2.5), 38) + variation;
    }

    // Obstacles update & collision
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.gameSpeed;

      if (obs.type === 'flyer') {
        obs.wingTimer++;
        if (obs.wingTimer > 6) {
          obs.wingFrame = 1 - obs.wingFrame;
          obs.wingTimer = 0;
        }
      }

      // Hitbox with slight forgiveness margin (4px)
      const hitMargin = 5;
      const dinoBox = {
        l: this.dino.x + hitMargin,
        r: this.dino.x + this.dino.width - hitMargin,
        t: this.dino.y + hitMargin,
        b: this.dino.y + this.dino.height
      };
      const obsBox = {
        l: obs.x + hitMargin,
        r: obs.x + obs.width - hitMargin,
        t: obs.y + hitMargin,
        b: obs.y + obs.height
      };

      if (
        dinoBox.l < obsBox.r &&
        dinoBox.r > obsBox.l &&
        dinoBox.t < obsBox.b &&
        dinoBox.b > obsBox.t
      ) {
        this.gameOver();
        return;
      }

      if (obs.x + obs.width < -30) {
        this.obstacles.splice(i, 1);
      }
    }

    // Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // --- Rendering ---
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Sky & Backdrop elements
    this.renderSkyAndStars();
    this.renderCitySilhouette();

    // 2. Ground line with neon scanline grid
    this.renderGround();

    // 3. Obstacles
    this.renderObstacles();

    // 4. Dino Character
    this.renderDino();

    // 5. Particle Effects
    this.renderParticles();
  }

  renderSkyAndStars() {
    for (const star of this.stars) {
      star.alpha += (Math.random() - 0.5) * star.flickerSpeed;
      if (star.alpha > 0.9) star.alpha = 0.9;
      if (star.alpha < 0.2) star.alpha = 0.2;

      this.ctx.fillStyle = `rgba(200, 230, 255, ${star.alpha})`;
      this.ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    // Neon synth clouds
    for (const c of this.clouds) {
      this.ctx.fillStyle = 'rgba(121, 40, 202, 0.15)';
      this.ctx.fillRect(c.x, c.y, c.width, c.height);
      this.ctx.fillStyle = 'rgba(0, 243, 255, 0.25)';
      this.ctx.fillRect(c.x + 8, c.y + c.height - 3, c.width - 16, 2);
    }
  }

  renderCitySilhouette() {
    // Distant futuristic skyline
    this.ctx.fillStyle = 'rgba(16, 22, 42, 0.6)';
    const baseY = this.groundY;
    const bldgs = [
      { x: 30, w: 45, h: 80 }, { x: 90, w: 30, h: 120 }, { x: 140, w: 55, h: 65 },
      { x: 220, w: 40, h: 95 }, { x: 280, w: 70, h: 140 }, { x: 370, w: 35, h: 70 },
      { x: 440, w: 60, h: 110 }, { x: 530, w: 40, h: 85 }, { x: 600, w: 50, h: 130 },
      { x: 690, w: 45, h: 75 }, { x: 760, w: 65, h: 105 }, { x: 840, w: 40, h: 90 }
    ];

    bldgs.forEach(b => {
      this.ctx.fillRect(b.x, baseY - b.h, b.w, b.h);
      // Window lights
      this.ctx.fillStyle = 'rgba(0, 243, 255, 0.2)';
      this.ctx.fillRect(b.x + 6, baseY - b.h + 10, b.w - 12, 4);
      this.ctx.fillStyle = 'rgba(16, 22, 42, 0.6)';
    });
  }

  renderGround() {
    const y = this.groundY;

    // Glowing main baseline
    this.ctx.strokeStyle = '#00f3ff';
    this.ctx.shadowColor = '#00f3ff';
    this.ctx.shadowBlur = 10;
    this.ctx.lineWidth = 3;

    this.ctx.beginPath();
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(this.canvas.width, y);
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;

    // Perspective terrain dashes
    this.ctx.fillStyle = 'rgba(0, 243, 255, 0.4)';
    for (let x = -this.groundOffset; x < this.canvas.width; x += 36) {
      this.ctx.fillRect(x, y + 8, 18, 2);
      this.ctx.fillRect(x + 12, y + 20, 24, 2);
    }
  }

  renderDino() {
    const d = this.dino;
    this.ctx.save();
    this.ctx.translate(d.x, d.y);

    const mainColor = '#00f3ff';
    const accentColor = '#ff007f';
    const visorColor = '#ffe600';

    this.ctx.shadowColor = mainColor;
    this.ctx.shadowBlur = 12;
    this.ctx.fillStyle = mainColor;

    if (!d.ducking) {
      // --- STANDING / RUNNING DINO ---
      // Head
      this.ctx.fillRect(18, 0, 26, 16);
      // Snout
      this.ctx.fillRect(36, 6, 8, 10);
      // Cyber Visor / Eye
      this.ctx.fillStyle = visorColor;
      this.ctx.fillRect(30, 4, 10, 4);
      this.ctx.fillStyle = mainColor;

      // Neck & Spine
      this.ctx.fillRect(16, 14, 16, 14);

      // Cyber Back Spikes
      this.ctx.fillStyle = accentColor;
      this.ctx.fillRect(10, 6, 4, 6);
      this.ctx.fillRect(6, 14, 4, 6);
      this.ctx.fillRect(2, 22, 4, 6);
      this.ctx.fillStyle = mainColor;

      // Torso
      this.ctx.fillRect(10, 22, 22, 18);
      // Tiny cyber arm
      this.ctx.fillRect(28, 28, 8, 4);

      // Tail
      this.ctx.fillRect(2, 24, 10, 10);
      this.ctx.fillRect(0, 20, 4, 6);

      // Legs animation
      if (d.grounded) {
        if (d.runFrame === 0) {
          // Left forward, right back
          this.ctx.fillRect(14, 40, 5, 12);
          this.ctx.fillRect(24, 40, 5, 8);
          this.ctx.fillRect(27, 46, 5, 6);
        } else {
          // Right forward, left back
          this.ctx.fillRect(14, 40, 5, 8);
          this.ctx.fillRect(11, 46, 5, 6);
          this.ctx.fillRect(24, 40, 5, 12);
        }
      } else {
        // Jumping legs tucked
        this.ctx.fillRect(12, 40, 6, 8);
        this.ctx.fillRect(22, 40, 6, 8);
      }
    } else {
      // --- DUCKING DINO ---
      // Head lowered
      this.ctx.fillRect(28, 4, 26, 14);
      // Visor
      this.ctx.fillStyle = visorColor;
      this.ctx.fillRect(40, 6, 10, 4);
      this.ctx.fillStyle = mainColor;

      // Elongated body
      this.ctx.fillRect(8, 12, 32, 14);
      // Back spikes
      this.ctx.fillStyle = accentColor;
      this.ctx.fillRect(4, 8, 4, 6);
      this.ctx.fillStyle = mainColor;

      // Tail
      this.ctx.fillRect(0, 10, 8, 8);

      // Crawling legs
      if (d.runFrame === 0) {
        this.ctx.fillRect(16, 26, 8, 6);
        this.ctx.fillRect(32, 24, 6, 8);
      } else {
        this.ctx.fillRect(16, 24, 6, 8);
        this.ctx.fillRect(32, 26, 8, 6);
      }
    }

    this.ctx.restore();
  }

  renderObstacles() {
    for (const obs of this.obstacles) {
      this.ctx.save();
      this.ctx.translate(obs.x, obs.y);

      if (obs.type === 'cactus') {
        // Cyber Neon Cacti
        this.ctx.shadowColor = '#00f3ff';
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = '#00f3ff';

        if (!obs.double) {
          // Main stem
          this.ctx.fillRect(8, 0, 8, obs.height);
          // Left branch
          this.ctx.fillRect(2, 12, 6, 4);
          this.ctx.fillRect(2, 8, 4, 6);
          // Right branch
          this.ctx.fillRect(16, 18, 6, 4);
          this.ctx.fillRect(18, 14, 4, 6);
        } else {
          // Double cluster
          this.ctx.fillRect(6, 4, 8, obs.height - 4);
          this.ctx.fillRect(0, 14, 6, 4);
          this.ctx.fillRect(26, 0, 10, obs.height);
          this.ctx.fillRect(36, 14, 6, 4);
        }

        // Circuit core line
        this.ctx.fillStyle = '#ff007f';
        this.ctx.fillRect(10, 4, 4, obs.height - 8);

      } else if (obs.type === 'flyer') {
        // Cyber Pterodactyl / Drone
        this.ctx.shadowColor = '#ff007f';
        this.ctx.shadowBlur = 12;
        this.ctx.fillStyle = '#ff007f';

        // Head and beak
        this.ctx.fillRect(0, 10, 14, 8);
        this.ctx.fillRect(0, 14, 6, 4);

        // Cyber eye
        this.ctx.fillStyle = '#ffe600';
        this.ctx.fillRect(8, 10, 3, 3);
        this.ctx.fillStyle = '#ff007f';

        // Body
        this.ctx.fillRect(12, 8, 22, 12);
        this.ctx.fillRect(34, 12, 8, 4); // Tail

        // Flapping wings
        if (obs.wingFrame === 0) {
          // Wing Up
          this.ctx.fillRect(18, 0, 12, 8);
          this.ctx.fillRect(22, 0, 6, 4);
        } else {
          // Wing Down
          this.ctx.fillRect(18, 20, 12, 8);
          this.ctx.fillRect(22, 24, 6, 4);
        }
      }

      this.ctx.restore();
    }
  }

  renderParticles() {
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 6;
      this.ctx.fillRect(p.x, p.y, p.size, p.size);
      this.ctx.restore();
    }
  }

  drawInitialState() {
    this.render();
  }

  gameLoop(currentTime) {
    if (!this.isRunning) return;

    this.update();
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

// Initialise upon DOM readiness
window.addEventListener('DOMContentLoaded', () => {
  new CyberDinoGame();
});
