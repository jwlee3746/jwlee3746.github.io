"use strict";

const year = document.querySelector("#current-year");
if (year) {
  year.textContent = new Date().getFullYear();
}

const board = document.querySelector("#game-board");
const gameStatus = document.querySelector("#game-status");
const scoreElement = document.querySelector("#score");
const highScoreElement = document.querySelector("#high-score");
const startButton = document.querySelector("#start-game");
const pauseButton = document.querySelector("#pause-game");
const restartButton = document.querySelector("#restart-game");
const directionButtons = document.querySelectorAll("[data-direction]");

if (board && gameStatus && scoreElement && highScoreElement && startButton && pauseButton && restartButton) {
  const context = board.getContext("2d");
  const tileCount = 16;
  const tileSize = board.width / tileCount;
  const tickRate = 140;
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  let snake;
  let direction;
  let food;
  let score;
  let highScore = readHighScore();
  let gameState = "idle";
  let timerId = null;

  function readHighScore() {
    try {
      return Number.parseInt(localStorage.getItem("snake-high-score") || "0", 10) || 0;
    } catch (error) {
      return 0;
    }
  }

  function saveHighScore() {
    try {
      localStorage.setItem("snake-high-score", String(highScore));
    } catch (error) {
      // Storage is optional; the current score remains available in memory.
    }
  }

  function updateScoreboard() {
    scoreElement.textContent = String(score);
    highScoreElement.textContent = String(highScore);
  }

  function setStatus(message) {
    gameStatus.textContent = message;
  }

  function randomFood() {
    const openCells = [];
    for (let y = 0; y < tileCount; y += 1) {
      for (let x = 0; x < tileCount; x += 1) {
        if (!snake.some((segment) => segment.x === x && segment.y === y)) {
          openCells.push({ x, y });
        }
      }
    }
    return openCells[Math.floor(Math.random() * openCells.length)] || { x: 0, y: 0 };
  }

  function draw() {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, board.width, board.height);
    context.fillStyle = "#ff6b6b";
    context.beginPath();
    context.arc(food.x * tileSize + tileSize / 2, food.y * tileSize + tileSize / 2, tileSize * .3, 0, Math.PI * 2);
    context.fill();
    snake.forEach((segment, index) => {
      context.fillStyle = index === 0 ? "#3182f6" : "#75aef8";
      context.fillRect(segment.x * tileSize + 1, segment.y * tileSize + 1, tileSize - 2, tileSize - 2);
    });
  }

  function resetGame() {
    snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    direction = directions.right;
    score = 0;
    food = randomFood();
    gameState = "idle";
    updateScoreboard();
    setStatus("시작 버튼을 눌러 게임을 시작하세요.");
    pauseButton.disabled = true;
    pauseButton.textContent = "일시정지";
    draw();
  }

  function stopTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function startGame() {
    if (gameState === "running") return;
    if (gameState === "game-over") resetGame();
    gameState = "running";
    setStatus("게임 중입니다.");
    pauseButton.disabled = false;
    startButton.textContent = "진행 중";
    if (timerId === null) timerId = window.setInterval(step, tickRate);
  }

  function pauseGame() {
    if (gameState === "running") {
      gameState = "paused";
      stopTimer();
      pauseButton.textContent = "계속하기";
      setStatus("일시정지했습니다.");
    } else if (gameState === "paused") {
      startGame();
      pauseButton.textContent = "일시정지";
    }
  }

  function gameOver() {
    gameState = "game-over";
    stopTimer();
    if (score > highScore) {
      highScore = score;
      saveHighScore();
    }
    updateScoreboard();
    pauseButton.disabled = true;
    startButton.textContent = "다시 시작";
    setStatus("게임 오버! 다시 시작해보세요.");
  }

  function step() {
    const head = snake[0];
    const nextHead = { x: head.x + direction.x, y: head.y + direction.y };
    const hitWall = nextHead.x < 0 || nextHead.x >= tileCount || nextHead.y < 0 || nextHead.y >= tileCount;
    const hitSelf = snake.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);
    if (hitWall || hitSelf) {
      gameOver();
      return;
    }
    snake.unshift(nextHead);
    if (nextHead.x === food.x && nextHead.y === food.y) {
      score += 1;
      food = randomFood();
      updateScoreboard();
    } else {
      snake.pop();
    }
    draw();
  }

  function changeDirection(name) {
    const nextDirection = directions[name];
    if (!nextDirection || gameState === "game-over") return;
    if (nextDirection.x === -direction.x && nextDirection.y === -direction.y) return;
    direction = nextDirection;
    if (gameState === "idle") startGame();
  }

  document.addEventListener("keydown", (event) => {
    const keyMap = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
    if (keyMap[event.key]) {
      event.preventDefault();
      changeDirection(keyMap[event.key]);
    }
    if (event.code === "Space") {
      event.preventDefault();
      pauseGame();
    }
  });

  directionButtons.forEach((button) => {
    button.addEventListener("click", () => changeDirection(button.dataset.direction));
  });
  startButton.addEventListener("click", startGame);
  pauseButton.addEventListener("click", pauseGame);
  restartButton.addEventListener("click", resetGame);
  resetGame();
}
