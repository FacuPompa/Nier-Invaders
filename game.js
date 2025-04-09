const game = document.getElementById('game');
const player = document.getElementById('player');
const startScreen = document.getElementById('start-screen');
const victoryScreen = document.getElementById('victory-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const bgMusic = document.getElementById('bg-music');
bgMusic.volume = 0.2;


const enemies = [];
const bulletsPlayer = [];
const bulletsEnemy = [];


let playerX = game.clientWidth / 2 - 30;
let playerLives = 3;
let score = 0;
let gameRunning = false;


const livesDisplay = document.createElement('div');
livesDisplay.id = 'lives';
livesDisplay.textContent = `Vidas: ${playerLives}`;
game.appendChild(livesDisplay);

const scoreDisplay = document.createElement('div');
scoreDisplay.id = 'score';
scoreDisplay.textContent = `Puntos: ${score}`;
game.appendChild(scoreDisplay);


document.addEventListener('keydown', (e) => {
    const speed = 10;
    if (!gameRunning) return;

    if (e.key === 'a' && playerX > 0) {
        playerX -= speed;
    } else if (e.key === 'd' && playerX < game.clientWidth - 60) {
        playerX += speed;
    } else if (e.code === 'Space') {
        shootPlayer();
    }

    player.style.left = `${playerX}px`;
});


function shootPlayer(){
    const bullet = document.createElement('div');
    bullet.classList.add('bullet-player');
    bullet.style.left = `${playerX + 26}px`;
    bullet.style.top = `${player.offsetTop - 20}px`;
    game.appendChild(bullet);
    bulletsPlayer.push(bullet);
}

function createStars() {
    for (let i = 0; i < 100; i++) {
      const star = document.createElement('div');
      star.classList.add('star');
      star.style.left = `${Math.random() * window.innerWidth}px`;
      star.style.top = `${Math.random() * window.innerHeight}px`;
      star.style.animationDuration = `${Math.random() * 5 + 5}s`;
      game.appendChild(star);
    }
  }
  createStars();

function movePlayerBullets() {
    bulletsPlayer.forEach((bullet, index) => {
        bullet.style.top = `${bullet.offsetTop - 7}px`;
        if (bullet.offsetTop < 0) {
            game.removeChild(bullet);
            bulletsPlayer.splice(index, 1);
        }
    });
}

function spawnEnemy() {
    const enemy = document.createElement('div');
    enemy.classList.add('enemy');
    enemy.style.left = `${Math.random() * (game.clientWidth - 50)}px`;
    enemy.style.top = '0px';
    game.appendChild(enemy);
    enemies.push(enemy);
}

function moveEnemies() {
    enemies.forEach((enemy, index) => {
        let currentTop = parseFloat(enemy.style.top);
        enemy.style.top = `${currentTop + 1}px`;

        if (Math.random() < 0.005) {
            shootEnemy(enemy);
        }

        if (currentTop > game.clientHeight) {
            game.removeChild(enemy);
            enemies.splice(index, 1);
        }
    });
}

function shootEnemy(enemy) {
    const bullet = document.createElement('div');
    bullet.classList.add('bullet-enemy');
    bullet.style.left = `${enemy.offsetLeft + 13}px`;
    bullet.style.top = `${enemy.offsetTop + 40}px`;
    game.appendChild(bullet);
    bulletsEnemy.push(bullet);
}

function moveEnemyBullets() {
    bulletsEnemy.forEach((bullet, index) => {
        bullet.style.top = `${bullet.offsetTop + 5}px`;
        if (bullet.offsetTop > game.clientHeight) {
            game.removeChild(bullet);
            bulletsEnemy.splice(index, 1);
        }
    });
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

function loseLife() {
    playerLives--;
    livesDisplay.textContent = `Vidas: ${playerLives}`;
    if (playerLives <= 0) {
        gameOver();
    }
}

function gameOver() {
    gameRunning = false;
    alert('¡GAME OVER!');
    location.reload();
}

function showVictoryScreen() {
    gameRunning = false;
    victoryScreen.style.display = 'flex';
}

function updateScore() {
    score++;
    scoreDisplay.textContent = `Puntos: ${score}`;
}


startBtn.addEventListener('click', () => {
    startScreen.style.display = 'none';
    gameRunning = true;
    bgMusic.volume = 0.1;
    bgMusic.play();
});

restartBtn.addEventListener('click', () => {
    location.reload();
});


setInterval(() => {
    if (!gameRunning) return;

    if (Math.random() < 0.02) spawnEnemy();
    moveEnemies();
    movePlayerBullets();
    moveEnemyBullets();

    bulletsPlayer.forEach((bullet, bIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (isColliding(bullet, enemy)) {
                if (game.contains(bullet)) game.removeChild(bullet);
                if (game.contains(enemy)) game.removeChild(enemy);
                bulletsPlayer.splice(bIndex, 1);
                enemies.splice(eIndex, 1);
                updateScore();
            }
        });
    });

    bulletsEnemy.forEach((bullet, index) => {
        if (isColliding(bullet, player)) {
            if (game.contains(bullet)) game.removeChild(bullet);
            bulletsEnemy.splice(index, 1);
            loseLife();
        }
    });

    if (score >= 20) {
        showVictoryScreen();
    }

}, 30);
