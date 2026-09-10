/**
 * CHICKEN INVADERS - SPACE SHOOTER
 * Built with HTML5 Canvas & Web Audio API
 */

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const wrapper = document.getElementById('game-wrapper');

  function resizeCanvas() {
    canvas.width = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // --- AUDIO SYNTHESIZER (Web Audio API) ---
  class SoundEffects {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playShoot() {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    }

    playExplosion() {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
    }

    playPowerup() {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    }

    playGameOver() {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.8);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.8);
    }
  }

  const sfx = new SoundEffects();

  // --- STATE MANAGEMENT ---
  const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, GAMEOVER: 3 };
  let currentState = STATE.MENU;

  let score = 0;
  let highScore = parseInt(localStorage.getItem('ci_highscore') || '0', 10);
  let wave = 1;
  let health = 100;
  let screenShakeTimer = 0;

  const keys = { left: false, right: false, shoot: false };

  // --- GAME OBJECTS ---
  class BackgroundStars {
    constructor() {
      this.stars = Array.from({ length: 60 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 1.5 + 0.5,
        alpha: Math.random()
      }));
    }

    update() {
      this.stars.forEach(s => {
        s.y += s.speed;
        if (s.y > canvas.height) {
          s.y = 0;
          s.x = Math.random() * canvas.width;
        }
      });
    }

    draw() {
      ctx.fillStyle = '#ffffff';
      this.stars.forEach(s => {
        ctx.globalAlpha = s.alpha;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      });
      ctx.globalAlpha = 1.0;
    }
  }

  class Player {
    constructor() {
      this.width = 44;
      this.height = 48;
      this.x = canvas.width / 2 - this.width / 2;
      this.y = canvas.height - 80;
      this.speed = 6;
      this.lastShot = 0;
      this.powerups = { rapid: 0, shield: 0, double: 0 };
    }

    reset() {
      this.x = canvas.width / 2 - this.width / 2;
      this.y = canvas.height - 80;
      this.powerups = { rapid: 0, shield: 0, double: 0 };
    }

    update() {
      if (keys.left && this.x > 0) this.x -= this.speed;
      if (keys.right && this.x < canvas.width - this.width) this.x += this.speed;

      Object.keys(this.powerups).forEach(k => {
        if (this.powerups[k] > 0) this.powerups[k]--;
      });

      const fireInterval = this.powerups.rapid > 0 ? 100 : 220;
      if (keys.shoot && Date.now() - this.lastShot > fireInterval) {
        this.shoot();
        this.lastShot = Date.now();
      }
    }

    shoot() {
      sfx.playShoot();
      if (this.powerups.rapid > 0) {
        bullets.push(new Bullet(this.x + 8, this.y, -1.5, -12));
        bullets.push(new Bullet(this.x + this.width - 8, this.y, 1.5, -12));
      } else {
        bullets.push(new Bullet(this.x + this.width / 2, this.y, 0, -11));
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

      if (this.powerups.shield > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00f0ff';
        ctx.stroke();
      }

      // Ship Vector Hull
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(20, 20);
      ctx.lineTo(0, 12);
      ctx.lineTo(-20, 20);
      ctx.closePath();
      ctx.fill();

      // Cockpit Glow
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.ellipse(0, -2, 6, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Thruster Flame
      ctx.fillStyle = Math.random() > 0.5 ? '#ff9900' : '#ff0055';
      ctx.beginPath();
      ctx.moveTo(-8, 16);
      ctx.lineTo(0, 28 + Math.random() * 6);
      ctx.lineTo(8, 16);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  class Bullet {
    constructor(x, y, vx, vy) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.radius = 4;
      this.markedForDeletion = false;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.y < -10 || this.x < 0 || this.x > canvas.width) {
        this.markedForDeletion = true;
      }
    }

    draw() {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe600';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffe600';
      ctx.fill();
      ctx.restore();
    }
  }

  class EnemyChicken {
    constructor(x, y, type) {
      this.x = x;
      this.y = y;
      this.type = type; // 1: Scout, 2: Heavy, 3: Boss
      this.width = type === 3 ? 60 : type === 2 ? 44 : 34;
      this.height = type === 3 ? 55 : type === 2 ? 40 : 30;
      this.hp = type === 3 ? 8 : type === 2 ? 3 : 1;
      this.speedY = type === 1 ? 2.2 : type === 2 ? 1.4 : 0.8;
      this.sineOffset = Math.random() * Math.PI * 2;
      this.markedForDeletion = false;
      this.lastEggShot = Date.now() + Math.random() * 2000;
    }

    update() {
      this.y += this.speedY;
      this.x += Math.sin(this.y * 0.03 + this.sineOffset) * 1.5;

      // Drop Egg
      if (Date.now() - this.lastEggShot > Math.max(1200, 2600 - wave * 120)) {
        if (Math.random() < 0.35) {
          enemyEggs.push(new EggBomb(this.x + this.width / 2, this.y + this.height));
        }
        this.lastEggShot = Date.now();
      }

      if (this.y > canvas.height) {
        this.markedForDeletion = true;
        if (player.powerups.shield <= 0) {
          health -= 10;
        }
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

      let bodyColor = '#ffffff';
      let combColor = '#ff0055';
      if (this.type === 2) { bodyColor = '#ffe600'; combColor = '#ff5500'; }
      if (this.type === 3) { bodyColor = '#d000ff'; combColor = '#00f0ff'; }

      const flap = Math.sin(Date.now() * 0.01) * 8;

      // Wings
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(-this.width / 2, 0, 10, 6 + flap / 2, 0, 0, Math.PI * 2);
      ctx.ellipse(this.width / 2, 0, 10, 6 + flap / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.beginPath();
      ctx.arc(0, 0, this.width / 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Comb
      ctx.fillStyle = combColor;
      ctx.beginPath();
      ctx.arc(0, -this.height / 2, 5, 0, Math.PI * 2);
      ctx.arc(-5, -this.height / 2.4, 4, 0, Math.PI * 2);
      ctx.arc(5, -this.height / 2.4, 4, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#ff9900';
      ctx.beginPath();
      ctx.moveTo(-4, 2);
      ctx.lineTo(0, 10);
      ctx.lineTo(4, 2);
      ctx.closePath();
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-6, -4, 3, 0, Math.PI * 2);
      ctx.arc(6, -4, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  class EggBomb {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.speed = 3.5;
      this.radius = 5;
      this.markedForDeletion = false;
    }

    update() {
      this.y += this.speed;
      if (this.y > canvas.height + 10) this.markedForDeletion = true;
    }

    draw() {
      ctx.save();
      ctx.fillStyle = '#fffabb';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#ffe600';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.radius, this.radius * 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class PowerUp {
    constructor(x, y, type) {
      this.x = x;
      this.y = y;
      this.type = type; // 'rapid', 'shield', 'double'
      this.speed = 2;
      this.radius = 12;
      this.markedForDeletion = false;
    }

    update() {
      this.y += this.speed;
      if (this.y > canvas.height + 20) this.markedForDeletion = true;
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      let color = '#ff9900';
      let label = '⚡';
      if (this.type === 'shield') { color = '#00d2ff'; label = '🛡'; }
      if (this.type === 'double') { color = '#e0115f'; label = '2X'; }

      ctx.fillStyle = color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 1);
      ctx.restore();
    }
  }

  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.vx = (Math.random() - 0.5) * 7;
      this.vy = (Math.random() - 0.5) * 7;
      this.alpha = 1;
      this.size = Math.random() * 4 + 2;
      this.markedForDeletion = false;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= 0.03;
      if (this.alpha <= 0) this.markedForDeletion = true;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // --- INSTANCES & ARRAYS ---
  const bgStars = new BackgroundStars();
  const player = new Player();
  let bullets = [];
  let enemies = [];
  let enemyEggs = [];
  let powerups = [];
  let particles = [];

  function spawnWave() {
    const count = 5 + wave * 3;
    const cols = Math.min(8, Math.floor(canvas.width / 50));
    const spacingX = canvas.width / (cols + 1);

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = spacingX * (col + 1) - 20;
      const y = -100 - row * 50;

      let type = 1;
      if (wave >= 2 && Math.random() > 0.6) type = 2;
      if (wave >= 3 && i === 0) type = 3;

      enemies.push(new EnemyChicken(x, y, type));
    }
  }

  function triggerExplosion(x, y, color = '#ff5500', count = 16) {
    sfx.playExplosion();
    screenShakeTimer = 8;
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y, color));
    }
  }

  function checkCollisions() {
    // 1. Bullets vs Enemies
    bullets.forEach(bullet => {
      enemies.forEach(enemy => {
        if (!bullet.markedForDeletion && !enemy.markedForDeletion) {
          if (
            bullet.x > enemy.x &&
            bullet.x < enemy.x + enemy.width &&
            bullet.y > enemy.y &&
            bullet.y < enemy.y + enemy.height
          ) {
            bullet.markedForDeletion = true;
            enemy.hp--;

            particles.push(new Particle(bullet.x, bullet.y, '#ffe600'));

            if (enemy.hp <= 0) {
              enemy.markedForDeletion = true;
              triggerExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

              const pts = enemy.type * 100 * (player.powerups.double > 0 ? 2 : 1);
              score += pts;

              if (Math.random() < 0.25) {
                const types = ['rapid', 'shield', 'double'];
                const pType = types[Math.floor(Math.random() * types.length)];
                powerups.push(new PowerUp(enemy.x + enemy.width / 2, enemy.y, pType));
              }
            }
          }
        }
      });
    });

    // 2. Enemy Eggs vs Player
    enemyEggs.forEach(egg => {
      if (!egg.markedForDeletion) {
        const dist = Math.hypot(egg.x - (player.x + player.width / 2), egg.y - (player.y + player.height / 2));
        if (dist < egg.radius + player.width / 3) {
          egg.markedForDeletion = true;
          if (player.powerups.shield <= 0) {
            health -= 15;
            triggerExplosion(egg.x, egg.y, '#ff0055', 8);
          } else {
            sfx.playShoot();
          }
        }
      }
    });

    // 3. Enemies vs Player directly
    enemies.forEach(enemy => {
      if (!enemy.markedForDeletion) {
        if (
          player.x < enemy.x + enemy.width &&
          player.x + player.width > enemy.x &&
          player.y < enemy.y + enemy.height &&
          player.y + player.height > enemy.y
        ) {
          enemy.markedForDeletion = true;
          triggerExplosion(enemy.x, enemy.y);
          if (player.powerups.shield <= 0) {
            health -= 25;
          }
        }
      }
    });

    // 4. Powerups vs Player
    powerups.forEach(p => {
      if (!p.markedForDeletion) {
        const dist = Math.hypot(p.x - (player.x + player.width / 2), p.y - (player.y + player.height / 2));
        if (dist < p.radius + player.width / 2) {
          p.markedForDeletion = true;
          sfx.playPowerup();
          player.powerups[p.type] = 400; // Powerup timer
        }
      }
    });
  }

  function updateUI() {
    document.getElementById('score-val').innerText = score;
    document.getElementById('highscore-val').innerText = highScore;
    document.getElementById('wave-val').innerText = wave;
    document.getElementById('health-bar-fill').style.width = Math.max(0, health) + '%';

    const badgesContainer = document.getElementById('powerup-badges');
    badgesContainer.innerHTML = '';
    if (player.powerups.rapid > 0) badgesContainer.innerHTML += `<span class="badge badge-rapid">RAPID FIRE</span>`;
    if (player.powerups.shield > 0) badgesContainer.innerHTML += `<span class="badge badge-shield">SHIELD</span>`;
    if (player.powerups.double > 0) badgesContainer.innerHTML += `<span class="badge badge-double">2X SCORE</span>`;
  }

  function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (screenShakeTimer > 0) {
      ctx.save();
      const dx = (Math.random() - 0.5) * screenShakeTimer * 2;
      const dy = (Math.random() - 0.5) * screenShakeTimer * 2;
      ctx.translate(dx, dy);
      screenShakeTimer--;
    }

    bgStars.update();
    bgStars.draw();

    if (currentState === STATE.PLAYING) {
      player.update();
      player.draw();

      bullets.forEach(b => { b.update(); b.draw(); });
      bullets = bullets.filter(b => !b.markedForDeletion);

      enemies.forEach(e => { e.update(); e.draw(); });
      enemies = enemies.filter(e => !e.markedForDeletion);

      enemyEggs.forEach(egg => { egg.update(); egg.draw(); });
      enemyEggs = enemyEggs.filter(egg => !egg.markedForDeletion);

      powerups.forEach(p => { p.update(); p.draw(); });
      powerups = powerups.filter(p => !p.markedForDeletion);

      particles.forEach(p => { p.update(); p.draw(); });
      particles = particles.filter(p => !p.markedForDeletion);

      checkCollisions();
      updateUI();

      if (enemies.length === 0) {
        wave++;
        spawnWave();
      }

      if (health <= 0) {
        gameOver();
      }
    }

    if (screenShakeTimer > 0) {
      ctx.restore();
    }

    requestAnimationFrame(gameLoop);
  }

  function startGame() {
    sfx.init();
    score = 0;
    health = 100;
    wave = 1;
    bullets = [];
    enemies = [];
    enemyEggs = [];
    powerups = [];
    particles = [];
    player.reset();

    spawnWave();

    currentState = STATE.PLAYING;
    document.querySelectorAll('.screen-overlay').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.screen-overlay').forEach(el => el.classList.add('hide'));
    document.getElementById('btn-pause').classList.remove('hide');
  }

  function gameOver() {
    sfx.playGameOver();
    currentState = STATE.GAMEOVER;

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('ci_highscore', highScore.toString());
    }

    document.getElementById('final-score').innerText = score;
    document.getElementById('final-highscore').innerText = highScore;
    document.getElementById('final-wave').innerText = wave;

    document.getElementById('btn-pause').classList.add('hide');
    document.getElementById('screen-gameover').classList.remove('hide');
    document.getElementById('screen-gameover').classList.add('active');
  }

  function pauseGame() {
    if (currentState === STATE.PLAYING) {
      currentState = STATE.PAUSED;
      document.getElementById('screen-pause').classList.remove('hide');
      document.getElementById('screen-pause').classList.add('active');
    }
  }

  function resumeGame() {
    if (currentState === STATE.PAUSED) {
      currentState = STATE.PLAYING;
      document.getElementById('screen-pause').classList.remove('active');
      document.getElementById('screen-pause').classList.add('hide');
    }
  }

  // --- INPUT LISTENERS ---
  window.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'Space') keys.shoot = true;
    if (e.code === 'KeyP') {
      if (currentState === STATE.PLAYING) pauseGame();
      else if (currentState === STATE.PAUSED) resumeGame();
    }
  });

  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'Space') keys.shoot = false;
  });

  const setupTouchBtn = (id, keyName) => {
    const btn = document.getElementById(id);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[keyName] = true; });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; });
  };
  setupTouchBtn('btn-touch-left', 'left');
  setupTouchBtn('btn-touch-right', 'right');
  setupTouchBtn('btn-touch-fire', 'shoot');

  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-restart').addEventListener('click', startGame);
  document.getElementById('btn-pause').addEventListener('click', pauseGame);
  document.getElementById('btn-resume').addEventListener('click', resumeGame);

  document.getElementById('highscore-val').innerText = highScore;

  requestAnimationFrame(gameLoop);
});
