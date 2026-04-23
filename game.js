const game = document.getElementById('game');
const player = document.getElementById('player');
const startScreen = document.getElementById('start-screen');
const victoryScreen = document.getElementById('victory-screen');
const startBtn = document.getElementById('start-btn');
const survivalBtn = document.getElementById('survival-btn');
const restartBtn = document.getElementById('restart-btn');
const pauseScreen = document.getElementById('pause-screen');
const resumeBtn = document.getElementById('resume-btn');
const restartBtnPause = document.getElementById('restart-btn-pause');
const menuBtn = document.getElementById('menu-btn');
const bgMusic = document.getElementById('bg-music');
const victoryTitle = victoryScreen.querySelector('h1');
const victoryMessage = victoryScreen.querySelector('p');

bgMusic.volume = 0.1;

const resultMenuBtn = document.createElement('button');
resultMenuBtn.id = 'menu-btn-result';
resultMenuBtn.textContent = 'Volver al menú';
victoryScreen.appendChild(resultMenuBtn);

const PLAYER_SIZE = 60;
const PLAYER_PADDING = 20;
const PLAYER_SPEED = 340;
const PLAYER_FIRE_COOLDOWN = 0.22;
const DOUBLE_SHOT_FIRE_COOLDOWN = 0.14;
const POWERUP_DURATION = 9;
const SHIELD_DURATION = 9;
const INVINCIBILITY_DURATION = 1.15;
const PLAYER_BULLET_SPEED = 650;
const ENEMY_BULLET_SPEED = 290;
const POWERUP_SPEED = 95;

const campaignLevels = [
  {
    name: 'Desembarco',
    objective: 'Eliminá 12 drones scouts',
    goal: 12,
    spawnInterval: 1.35,
    groupSize: 1,
    pattern: 'single',
    enemyWeights: { scout: 1 }
  },
  {
    name: 'Formación doble',
    objective: 'Derrotá 18 unidades hostiles',
    goal: 18,
    spawnInterval: 1.15,
    groupSize: 2,
    pattern: 'pair',
    enemyWeights: { scout: 0.65, striker: 0.35 }
  },
  {
    name: 'Caza precisa',
    objective: 'Borrá 24 enemigos y resistí el fuego cruzado',
    goal: 24,
    spawnInterval: 1.02,
    groupSize: 3,
    pattern: 'line',
    enemyWeights: { scout: 0.35, striker: 0.65 }
  },
  {
    name: 'Blindaje',
    objective: 'Rompe 28 defensores blindados',
    goal: 28,
    spawnInterval: 0.92,
    groupSize: 3,
    pattern: 'cluster',
    enemyWeights: { striker: 0.6, tank: 0.4 }
  },
  {
    name: 'Eclipse',
    objective: 'Derrotá 36 enemigos y limpiá el campo',
    goal: 36,
    spawnInterval: 0.8,
    groupSize: 4,
    pattern: 'arc',
    enemyWeights: { scout: 0.25, striker: 0.5, tank: 0.25 }
  }
];

const ENEMY_SPECS = {
  scout: {
    width: 46,
    height: 46,
    health: 1,
    speed: 112,
    fireInterval: [2.3, 3.4],
    score: 10,
    oscillation: 56
  },
  striker: {
    width: 52,
    height: 52,
    health: 1,
    speed: 136,
    fireInterval: [1.5, 2.3],
    score: 20,
    oscillation: 28
  },
  tank: {
    width: 66,
    height: 66,
    health: 3,
    speed: 76,
    fireInterval: [1.0, 1.8],
    score: 40,
    oscillation: 18
  }
};

const enemies = [];
const playerBullets = [];
const enemyBullets = [];
const powerUps = [];
const managedTimers = new Set();
const keys = {
  left: false,
  right: false
};

const state = {
  mode: null,
  phase: 'menu',
  lives: 3,
  score: 0,
  playerX: 0,
  playerY: 0,
  fireCooldown: 0,
  invincibilityTime: 0,
  doubleShotTime: 0,
  shieldTime: 0,
  levelIndex: 0,
  levelDefeated: 0,
  levelMissed: 0,
  spawnTimer: 0,
  survivalElapsed: 0,
  survivalWave: 1,
  survivalSpawnTimer: 0
};

const livesDisplay = createHudItem('lives');
const scoreDisplay = createHudItem('score');
const modeDisplay = createHudItem('mode');
const statusDisplay = createHudItem('status');
const levelDisplay = createHudItem('level');
const objectiveDisplay = createHudItem('objective');

const banner = document.createElement('div');
banner.id = 'banner';
banner.style.display = 'none';
game.appendChild(banner);

const countdown = document.createElement('div');
countdown.id = 'countdown';
countdown.style.display = 'none';
game.appendChild(countdown);

createStars();
updateHUD();
resetToMenuUI();

function createHudItem(id) {
  const element = document.createElement('div');
  element.id = id;
  element.classList.add('hud-item');
  game.appendChild(element);
  return element;
}

function createStars() {
  const count = 90;
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.classList.add('star');
    const size = random(1, 2.7);
    const duration = random(7, 16);
    star.style.left = `${random(0, game.clientWidth)}px`;
    star.style.top = `${random(0, game.clientHeight)}px`;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.opacity = `${random(0.3, 0.85)}`;
    star.style.animationDuration = `${duration}s`;
    star.style.animationDelay = `${random(0, 6)}s`;
    game.appendChild(star);
  }
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function weightedPick(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = Math.random() * total;

  for (const [key, weight] of entries) {
    cursor -= weight;
    if (cursor <= 0) return key;
  }

  return entries[entries.length - 1][0];
}

function safeRemove(node) {
  if (node && node.parentNode === game) {
    game.removeChild(node);
  }
}

function clearManagedTimers() {
  for (const timer of managedTimers) {
    clearTimeout(timer);
  }
  managedTimers.clear();
}

function schedule(callback, delay) {
  const timer = window.setTimeout(() => {
    managedTimers.delete(timer);
    callback();
  }, delay);

  managedTimers.add(timer);
  return timer;
}

function removeCollection(collection) {
  while (collection.length > 0) {
    const entity = collection.pop();
    if (entity && entity.el) {
      safeRemove(entity.el);
    }
  }
}

function clearDynamicNodes() {
  game.querySelectorAll('.explosion').forEach((node) => safeRemove(node));
}

function resetCollections() {
  removeCollection(enemies);
  removeCollection(playerBullets);
  removeCollection(enemyBullets);
  removeCollection(powerUps);
  clearDynamicNodes();
}

function hideTransientUI() {
  banner.style.display = 'none';
  countdown.style.display = 'none';
  pauseScreen.style.display = 'none';
  victoryScreen.style.display = 'none';
}

function resetState() {
  state.mode = null;
  state.phase = 'menu';
  state.lives = 3;
  state.score = 0;
  state.playerX = 0;
  state.playerY = 0;
  state.fireCooldown = 0;
  state.invincibilityTime = 0;
  state.doubleShotTime = 0;
  state.shieldTime = 0;
  state.levelIndex = 0;
  state.levelDefeated = 0;
  state.levelMissed = 0;
  state.spawnTimer = 0;
  state.survivalElapsed = 0;
  state.survivalWave = 1;
  state.survivalSpawnTimer = 0;
  keys.left = false;
  keys.right = false;
}

function resetToMenuUI() {
  clearManagedTimers();
  resetCollections();
  resetState();
  game.classList.remove('arcade-mode');
  hideTransientUI();
  startScreen.style.display = 'flex';
  player.style.display = 'none';
  player.classList.remove('shielded', 'hit');
  bgMusic.pause();
  bgMusic.currentTime = 0;
  updateHUD();
}

function getCurrentLevel() {
  return campaignLevels[state.levelIndex] || null;
}

function setGamePhase(phase) {
  state.phase = phase;
  updateHUD();
}

function centerPlayer() {
  state.playerX = Math.max(0, (game.clientWidth - PLAYER_SIZE) / 2);
  state.playerY = Math.max(0, game.clientHeight - PLAYER_SIZE - PLAYER_PADDING);
  renderPlayer();
}

function clampPlayerToArena() {
  state.playerX = clamp(state.playerX, 0, Math.max(0, game.clientWidth - PLAYER_SIZE));
  state.playerY = Math.max(0, game.clientHeight - PLAYER_SIZE - PLAYER_PADDING);
  renderPlayer();
}

function renderPlayer() {
  player.style.left = `${state.playerX}px`;
  player.style.top = `${state.playerY}px`;
}

function createBulletElement(className, x, y, vx, vy) {
  const bullet = document.createElement('div');
  bullet.className = className;
  bullet.style.left = `${x}px`;
  bullet.style.top = `${y}px`;
  game.appendChild(bullet);

  return {
    el: bullet,
    x,
    y,
    vx,
    vy
  };
}

function spawnExplosion(x, y) {
  const explosion = document.createElement('div');
  explosion.classList.add('explosion');
  explosion.style.left = `${x}px`;
  explosion.style.top = `${y}px`;
  game.appendChild(explosion);

  schedule(() => {
    safeRemove(explosion);
  }, 450);
}

function spawnPowerUp(x, y, sourceType) {
  const chance = sourceType === 'tank' ? 0.5 : sourceType === 'striker' ? 0.35 : 0.25;
  if (Math.random() > chance) return;

  const roll = Math.random();
  const type = roll < 0.4 ? 'doubleShot' : roll < 0.72 ? 'shield' : 'extraLife';

  const powerUp = document.createElement('div');
  powerUp.classList.add('power-up', type);
  powerUp.dataset.type = type;
  powerUp.style.left = `${x}px`;
  powerUp.style.top = `${y}px`;
  game.appendChild(powerUp);

  powerUps.push({
    el: powerUp,
    x,
    y,
    vy: POWERUP_SPEED
  });
}

function showBanner(title, subtitle, duration = 1500) {
  banner.innerHTML = subtitle
    ? `<strong>${title}</strong><span>${subtitle}</span>`
    : `<strong>${title}</strong>`;

  banner.style.display = 'flex';

  schedule(() => {
    banner.style.display = 'none';
  }, duration);
}

function showCountdown(seconds, onComplete) {
  countdown.style.display = 'block';

  const tick = (value) => {
    countdown.textContent = `${value}`;
    if (value === 0) {
      schedule(() => {
        countdown.style.display = 'none';
        onComplete();
      }, 350);
      return;
    }

    schedule(() => tick(value - 1), 1000);
  };

  tick(seconds);
}

function updateHUD() {
  livesDisplay.textContent = `Vidas: ${state.lives}`;
  scoreDisplay.textContent = `Puntos: ${state.score}`;

  if (state.mode === 'campaign') {
    const level = getCurrentLevel();
    modeDisplay.textContent = 'Modo: niveles';
    levelDisplay.textContent = level
      ? `Nivel ${state.levelIndex + 1}/${campaignLevels.length} · ${level.name}`
      : 'Campaña completada';
    objectiveDisplay.textContent = level
      ? `${level.objective} · Restan ${Math.max(0, level.goal - state.levelDefeated)}`
      : 'Misión completada';
    statusDisplay.textContent = state.phase === 'paused'
      ? 'Pausa'
      : `Escapados: ${state.levelMissed}${state.doubleShotTime > 0 ? ' · Doble disparo' : ''}${state.shieldTime > 0 ? ' · Escudo' : ''}`;
  } else if (state.mode === 'survival') {
    modeDisplay.textContent = 'Modo: libre';
    levelDisplay.textContent = `Oleada ${state.survivalWave}`;
    objectiveDisplay.textContent = `Sobreviví el mayor tiempo posible · Tiempo ${Math.floor(state.survivalElapsed)}s`;
    statusDisplay.textContent = state.phase === 'paused'
      ? 'Pausa'
      : `${enemies.length} enemigos activos${state.doubleShotTime > 0 ? ' · Doble disparo' : ''}${state.shieldTime > 0 ? ' · Escudo' : ''}`;
  } else {
    modeDisplay.textContent = 'Modo: menú';
    levelDisplay.textContent = 'Listo para jugar';
    objectiveDisplay.textContent = 'Elegí modo niveles o modo libre';
    statusDisplay.textContent = '';
  }

  player.classList.toggle('shielded', state.shieldTime > 0);
}

function startSession(mode) {
  clearManagedTimers();
  resetCollections();
  resetState();

  state.mode = mode;
  state.phase = 'countdown';

  game.classList.add('arcade-mode');
  startScreen.style.display = 'none';
  victoryScreen.style.display = 'none';
  pauseScreen.style.display = 'none';
  player.style.display = 'block';
  player.classList.remove('shielded', 'hit');
  bgMusic.volume = 0.08;
  bgMusic.currentTime = 0;
  bgMusic.play().catch(() => {});

  requestAnimationFrame(() => {
    centerPlayer();
    showCountdown(3, () => {
      if (state.mode === 'campaign') {
        beginCampaignLevel();
      } else {
        beginSurvivalMode();
      }
    });
  });
}

function beginCampaignLevel() {
  const level = getCurrentLevel();
  if (!level) {
    finishCampaignVictory();
    return;
  }

  state.phase = 'playing';
  state.levelDefeated = 0;
  state.levelMissed = 0;
  state.spawnTimer = 0;
  state.fireCooldown = 0;
  state.invincibilityTime = 0;
  state.doubleShotTime = 0;
  state.shieldTime = 0;
  centerPlayer();
  showBanner(`Nivel ${state.levelIndex + 1}`, `${level.name} · ${level.objective}`, 2200);
  updateHUD();
}

function beginSurvivalMode() {
  state.phase = 'playing';
  state.survivalElapsed = 0;
  state.survivalWave = 1;
  state.survivalSpawnTimer = 0;
  state.fireCooldown = 0;
  state.invincibilityTime = 0;
  state.doubleShotTime = 0;
  state.shieldTime = 0;
  centerPlayer();
  showBanner('Modo libre', 'Oleadas infinitas y enemigos cada vez más agresivos', 2200);
  updateHUD();
}

function goToMenu() {
  clearManagedTimers();
  resetToMenuUI();
}

function showResult(title, message) {
  clearManagedTimers();
  state.phase = 'result';
  hideTransientUI();
  player.style.display = 'none';
  bgMusic.pause();

  victoryTitle.textContent = title;
  victoryMessage.textContent = message;
  victoryScreen.style.display = 'flex';
  updateHUD();
}

function finishCampaignVictory() {
  showResult('¡Victoria!', `Completaste la campaña con ${state.score} puntos.`);
}

function finishGameOver() {
  const extra = state.mode === 'survival'
    ? `Aguantaste ${Math.floor(state.survivalElapsed)} segundos`
    : `Perdiste en el nivel ${state.levelIndex + 1}`;

  showResult('Game Over', `${extra}. Puntaje final: ${state.score}.`);
}

function togglePause() {
  if (state.phase !== 'playing' && state.phase !== 'paused') return;
  if (state.phase === 'paused') {
    state.phase = 'playing';
    pauseScreen.style.display = 'none';
    bgMusic.volume = 0.08;
  } else {
    state.phase = 'paused';
    pauseScreen.style.display = 'flex';
    bgMusic.volume = 0.03;
  }
  keys.left = false;
  keys.right = false;
  updateHUD();
}

function shootPlayer() {
  if (state.phase !== 'playing' || state.fireCooldown > 0) return;

  const doubleShotActive = state.doubleShotTime > 0;
  state.fireCooldown = doubleShotActive ? DOUBLE_SHOT_FIRE_COOLDOWN : PLAYER_FIRE_COOLDOWN;

  const bulletY = state.playerY - 18;

  if (doubleShotActive) {
    playerBullets.push(createBulletElement('bullet-player bullet-player--double', state.playerX + 12, bulletY, 0, -PLAYER_BULLET_SPEED));
    playerBullets.push(createBulletElement('bullet-player bullet-player--double', state.playerX + 40, bulletY, 0, -PLAYER_BULLET_SPEED));
  } else {
    playerBullets.push(createBulletElement('bullet-player', state.playerX + 26, bulletY, 0, -PLAYER_BULLET_SPEED));
  }
}

function getFormationOffsets(pattern) {
  switch (pattern) {
    case 'pair':
      return [
        { x: -70, y: 0 },
        { x: 70, y: 18 }
      ];
    case 'line':
      return [
        { x: -120, y: 0 },
        { x: 0, y: -18 },
        { x: 120, y: 0 }
      ];
    case 'cluster':
      return [
        { x: -70, y: 0 },
        { x: -20, y: -28 },
        { x: 25, y: -12 },
        { x: 72, y: 0 }
      ];
    case 'arc':
      return [
        { x: -150, y: 0 },
        { x: -70, y: -32 },
        { x: 70, y: -32 },
        { x: 150, y: 0 }
      ];
    case 'single':
    default:
      return [{ x: 0, y: 0 }];
  }
}

function spawnEnemy(type, x, y, speedMultiplier = 1) {
  const spec = ENEMY_SPECS[type];
  if (!spec) return;

  const enemyEl = document.createElement('div');
  enemyEl.classList.add('enemy', `enemy--${type}`);
  enemyEl.dataset.type = type;
  enemyEl.style.width = `${spec.width}px`;
  enemyEl.style.height = `${spec.height}px`;
  game.appendChild(enemyEl);

  const enemy = {
    el: enemyEl,
    type,
    x: clamp(x, 0, Math.max(0, game.clientWidth - spec.width)),
    y,
    width: spec.width,
    height: spec.height,
    health: spec.health,
    age: 0,
    phase: random(0, Math.PI * 2),
    baseX: x,
    speedMultiplier,
    oscillation: spec.oscillation * random(0.85, 1.15),
    fireCooldown: random(spec.fireInterval[0], spec.fireInterval[1]) / speedMultiplier
  };

  enemies.push(enemy);
  renderEnemy(enemy);
}

function renderEnemy(enemy) {
  enemy.el.style.left = `${enemy.x}px`;
  enemy.el.style.top = `${enemy.y}px`;
}

function spawnCampaignGroup() {
  const level = getCurrentLevel();
  if (!level) return;

  const offsets = getFormationOffsets(level.pattern);
  const difficultyMultiplier = 1 + state.levelIndex * 0.11;
  const anchorX = random(120, Math.max(120, game.clientWidth - 120));
  const anchorY = -80;

  offsets.slice(0, level.groupSize).forEach((offset) => {
    const type = weightedPick(level.enemyWeights);
    spawnEnemy(type, anchorX + offset.x, anchorY + offset.y, difficultyMultiplier);
  });
}

function spawnSurvivalGroup() {
  const patternPool = ['single', 'pair', 'line', 'cluster', 'arc'];
  const pattern = patternPool[(state.survivalWave - 1) % patternPool.length];
  const offsets = getFormationOffsets(pattern);
  const groupSize = clamp(1 + Math.floor(state.survivalWave / 3), 1, 4);

  const weights = { scout: 1 };
  if (state.survivalWave >= 2) weights.striker = 0.4 + state.survivalWave * 0.05;
  if (state.survivalWave >= 5) weights.tank = 0.18 + state.survivalWave * 0.02;

  const difficultyMultiplier = 1 + state.survivalWave * 0.08;
  const anchorX = random(120, Math.max(120, game.clientWidth - 120));
  const anchorY = -80;

  offsets.slice(0, groupSize).forEach((offset) => {
    const type = weightedPick(weights);
    spawnEnemy(type, anchorX + offset.x, anchorY + offset.y, difficultyMultiplier);
  });
}

function createEnemyBullet(x, y, vx, vy, extraClass = '') {
  const bullet = document.createElement('div');
  bullet.className = `bullet-enemy${extraClass ? ` ${extraClass}` : ''}`;
  bullet.style.left = `${x}px`;
  bullet.style.top = `${y}px`;
  game.appendChild(bullet);

  enemyBullets.push({
    el: bullet,
    x,
    y,
    vx,
    vy
  });
}

function shootEnemy(enemy) {
  const centerX = enemy.x + enemy.width / 2;
  const bottomY = enemy.y + enemy.height - 4;
  const speedMultiplier = state.mode === 'survival'
    ? 1 + state.survivalWave * 0.04
    : 1 + state.levelIndex * 0.05;

  if (enemy.type === 'tank') {
    const spread = [-0.32, 0, 0.32];
    spread.forEach((angle, index) => {
      const vx = Math.sin(angle) * ENEMY_BULLET_SPEED * speedMultiplier;
      const vy = Math.cos(angle) * ENEMY_BULLET_SPEED * speedMultiplier;
      createEnemyBullet(centerX - 11, bottomY, vx, vy, index === 1 ? '' : 'bullet-enemy--spread');
    });
    return;
  }

  if (enemy.type === 'striker') {
    const targetX = state.playerX + PLAYER_SIZE / 2;
    const targetY = state.playerY + PLAYER_SIZE / 2;
    const dx = targetX - centerX;
    const dy = targetY - bottomY;
    const distance = Math.hypot(dx, dy) || 1;
    const velocity = ENEMY_BULLET_SPEED * 1.1 * speedMultiplier;
    createEnemyBullet(centerX - 11, bottomY, (dx / distance) * velocity, (dy / distance) * velocity);
    return;
  }

  createEnemyBullet(centerX - 11, bottomY, 0, ENEMY_BULLET_SPEED * speedMultiplier);
}

function destroyEnemy(index, cause = 'bullet', options = {}) {
  const enemy = enemies[index];
  if (!enemy) return;

  const { awardScore = false, spawnLoot = false } = options;

  if (awardScore) {
    state.score += ENEMY_SPECS[enemy.type].score;
    if (state.mode === 'campaign') {
      state.levelDefeated += 1;
    }
  } else if (cause === 'escape' || cause === 'collision') {
    if (state.mode === 'campaign') {
      state.levelMissed += 1;
    }
  }

  if (cause !== 'escape') {
    spawnExplosion(enemy.x + enemy.width / 2 - 22, enemy.y + enemy.height / 2 - 22);
  }

  if (spawnLoot) {
    spawnPowerUp(enemy.x + enemy.width / 2 - 10, enemy.y + enemy.height / 2 - 10, enemy.type);
  }

  safeRemove(enemy.el);
  enemies.splice(index, 1);
}

function isColliding(a, b) {
  const aRect = a.getBoundingClientRect();
  const bRect = b.getBoundingClientRect();
  return (
    aRect.left < bRect.right &&
    aRect.right > bRect.left &&
    aRect.top < bRect.bottom &&
    aRect.bottom > bRect.top
  );
}

function isShieldActive() {
  return state.shieldTime > 0;
}

function loseLife() {
  if (state.phase !== 'playing') return;
  if (state.invincibilityTime > 0) return;

  state.lives -= 1;
  state.invincibilityTime = INVINCIBILITY_DURATION;
  player.classList.add('hit');
  schedule(() => {
    player.classList.remove('hit');
  }, 350);

  if (state.lives <= 0) {
    state.lives = 0;
    finishGameOver();
  }
}

function applyPowerUp(type) {
  if (type === 'doubleShot') {
    state.doubleShotTime = POWERUP_DURATION;
  } else if (type === 'shield') {
    state.shieldTime = SHIELD_DURATION;
  } else if (type === 'extraLife') {
    state.lives = Math.min(5, state.lives + 1);
  }
  updateHUD();
}

function updatePlayer(dt) {
  if (keys.left) {
    state.playerX -= PLAYER_SPEED * dt;
  }
  if (keys.right) {
    state.playerX += PLAYER_SPEED * dt;
  }

  state.playerX = clamp(state.playerX, 0, Math.max(0, game.clientWidth - PLAYER_SIZE));
  state.playerY = Math.max(0, game.clientHeight - PLAYER_SIZE - PLAYER_PADDING);
  renderPlayer();
}

function updateCampaignSpawns(dt) {
  const level = getCurrentLevel();
  if (!level || state.levelDefeated >= level.goal) return;

  state.spawnTimer += dt;
  while (state.spawnTimer >= level.spawnInterval && state.levelDefeated < level.goal) {
    state.spawnTimer -= level.spawnInterval;
    spawnCampaignGroup();
  }
}

function updateSurvivalSpawns(dt) {
  state.survivalElapsed += dt;
  const nextWave = 1 + Math.floor(state.survivalElapsed / 18);

  if (nextWave !== state.survivalWave) {
    state.survivalWave = nextWave;
    showBanner(`Oleada ${state.survivalWave}`, 'La presión aumenta', 1400);
  }

  const interval = Math.max(0.42, 1.2 - state.survivalWave * 0.065);
  state.survivalSpawnTimer += dt;

  while (state.survivalSpawnTimer >= interval) {
    state.survivalSpawnTimer -= interval;
    spawnSurvivalGroup();
  }
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const spec = ENEMY_SPECS[enemy.type];

    enemy.age += dt;
    enemy.fireCooldown -= dt;

    const speed = spec.speed * enemy.speedMultiplier;

    if (enemy.type === 'scout') {
      enemy.y += speed * dt;
      enemy.x = enemy.baseX + Math.sin(enemy.age * 5.2 + enemy.phase) * enemy.oscillation;
    } else if (enemy.type === 'striker') {
      enemy.y += speed * dt;
      const targetCenter = state.playerX + PLAYER_SIZE / 2;
      const enemyCenter = enemy.x + enemy.width / 2;
      const steer = clamp((targetCenter - enemyCenter) * 1.7, -120, 120);
      enemy.x += steer * dt;
      enemy.x += Math.sin(enemy.age * 2.8 + enemy.phase) * 18 * dt;
    } else {
      enemy.y += speed * dt;
      enemy.x = enemy.baseX + Math.sin(enemy.age * 2.2 + enemy.phase) * (enemy.oscillation * 0.55);
    }

    enemy.x = clamp(enemy.x, 0, Math.max(0, game.clientWidth - enemy.width));
    renderEnemy(enemy);

    if (enemy.fireCooldown <= 0) {
      shootEnemy(enemy);
      enemy.fireCooldown = random(spec.fireInterval[0], spec.fireInterval[1]) / enemy.speedMultiplier;
    }

    if (enemy.y > game.clientHeight + 80) {
      destroyEnemy(i, 'escape');
      loseLife();
      continue;
    }

    if (isColliding(enemy.el, player)) {
      const shielded = isShieldActive();
      destroyEnemy(i, shielded ? 'shield' : 'collision');
      if (!shielded) {
        loseLife();
      }
    }
  }
}

function updatePlayerBullets(dt) {
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const bullet = playerBullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.el.style.left = `${bullet.x}px`;
    bullet.el.style.top = `${bullet.y}px`;

    if (bullet.y < -40) {
      safeRemove(bullet.el);
      playerBullets.splice(i, 1);
      continue;
    }

    let hitEnemy = false;

    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      if (!isColliding(bullet.el, enemy.el)) continue;

      enemy.health -= 1;
      hitEnemy = true;

      if (enemy.health <= 0) {
        destroyEnemy(j, 'bullet', { awardScore: true, spawnLoot: true });
      }

      break;
    }

    if (hitEnemy) {
      safeRemove(bullet.el);
      playerBullets.splice(i, 1);
    }
  }
}

function updateEnemyBullets(dt) {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.el.style.left = `${bullet.x}px`;
    bullet.el.style.top = `${bullet.y}px`;

    if (
      bullet.y > game.clientHeight + 40 ||
      bullet.x < -40 ||
      bullet.x > game.clientWidth + 40
    ) {
      safeRemove(bullet.el);
      enemyBullets.splice(i, 1);
      continue;
    }

    if (!isColliding(bullet.el, player)) continue;

    safeRemove(bullet.el);
    enemyBullets.splice(i, 1);

    if (!isShieldActive()) {
      loseLife();
    }
  }
}

function updatePowerUps(dt) {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i];
    powerUp.y += powerUp.vy * dt;
    powerUp.el.style.top = `${powerUp.y}px`;

    if (powerUp.y > game.clientHeight + 40) {
      safeRemove(powerUp.el);
      powerUps.splice(i, 1);
      continue;
    }

    if (!isColliding(powerUp.el, player)) continue;

    const type = powerUp.el.dataset.type;
    safeRemove(powerUp.el);
    powerUps.splice(i, 1);
    applyPowerUp(type);
  }
}

function checkCampaignProgress() {
  const level = getCurrentLevel();
  if (!level || state.phase !== 'playing') return;

  if (state.levelDefeated >= level.goal && enemies.length === 0) {
    state.phase = 'intermission';
    showBanner('Nivel superado', 'Preparando la siguiente misión', 1600);

    schedule(() => {
      state.levelIndex += 1;
      if (state.levelIndex >= campaignLevels.length) {
        finishCampaignVictory();
      } else {
        beginCampaignLevel();
      }
    }, 1600);
  }
}

function updateTimers(dt) {
  state.fireCooldown = Math.max(0, state.fireCooldown - dt);
  state.invincibilityTime = Math.max(0, state.invincibilityTime - dt);
  state.doubleShotTime = Math.max(0, state.doubleShotTime - dt);
  state.shieldTime = Math.max(0, state.shieldTime - dt);
}

function gameLoop(now) {
  if (!gameLoop.lastTime) {
    gameLoop.lastTime = now;
  }

  const dt = Math.min((now - gameLoop.lastTime) / 1000, 0.05);
  gameLoop.lastTime = now;

  if (state.phase === 'playing') {
    updateTimers(dt);
    updatePlayer(dt);

    if (state.mode === 'campaign') {
      updateCampaignSpawns(dt);
    } else if (state.mode === 'survival') {
      updateSurvivalSpawns(dt);
    }

    updateEnemies(dt);
    updatePlayerBullets(dt);
    updateEnemyBullets(dt);
    updatePowerUps(dt);
    checkCampaignProgress();
  } else {
    gameLoop.lastTime = now;
  }

  updateHUD();
  requestAnimationFrame(gameLoop);
}

function restartCurrentMode() {
  if (!state.mode) {
    startSession('campaign');
    return;
  }

  startSession(state.mode);
}

startBtn.addEventListener('click', () => startSession('campaign'));
survivalBtn.addEventListener('click', () => startSession('survival'));
restartBtn.addEventListener('click', restartCurrentMode);
restartBtnPause.addEventListener('click', restartCurrentMode);
menuBtn.addEventListener('click', goToMenu);
resultMenuBtn.addEventListener('click', goToMenu);
resumeBtn.addEventListener('click', togglePause);

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  if (event.code === 'Escape') {
    togglePause();
    return;
  }

  if (state.phase !== 'playing') return;

  if (event.code === 'Space') {
    event.preventDefault();
    shootPlayer();
    return;
  }

  if (key === 'a' || key === 'arrowleft') {
    keys.left = true;
  } else if (key === 'd' || key === 'arrowright') {
    keys.right = true;
  }
});

document.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();

  if (key === 'a' || key === 'arrowleft') {
    keys.left = false;
  } else if (key === 'd' || key === 'arrowright') {
    keys.right = false;
  }
});

window.addEventListener('resize', () => {
  if (state.phase !== 'menu') {
    clampPlayerToArena();
  }
});

requestAnimationFrame(gameLoop);
