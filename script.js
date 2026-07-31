"use strict";

document.querySelectorAll("#current-year, .current-year").forEach((year) => {
  year.textContent = new Date().getFullYear();
});

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
  const player = { x: board.width / 2 - 18, y: board.height - 58, width: 36, height: 42, speed: 280 };
  const obstacles = [];
  const gameSpeed = 150;
  let score = 0;
  let highScore = readHighScore();
  let gameState = "idle";
  let animationId = null;
  let lastFrame = 0;
  let spawnElapsed = 0;
  let elapsed = 0;
  let moveDirection = 0;

  function readHighScore() {
    try {
      return Number.parseInt(localStorage.getItem("poop-dodge-high-score") || "0", 10) || 0;
    } catch (error) {
      return 0;
    }
  }

  function saveHighScore() {
    try {
      localStorage.setItem("poop-dodge-high-score", String(highScore));
    } catch (error) {
      // 최고 점수 저장은 선택 기능입니다.
    }
  }

  function setStatus(message) {
    gameStatus.textContent = message;
  }

  function updateScore() {
    scoreElement.textContent = String(score);
    highScoreElement.textContent = String(highScore);
  }

  function draw() {
    context.fillStyle = "#f7f7f7";
    context.fillRect(0, 0, board.width, board.height);
    context.fillStyle = "#e8e8e8";
    for (let y = 20; y < board.height; y += 40) {
      context.fillRect(0, y, board.width, 1);
    }
    context.fillStyle = "#3182f6";
    context.beginPath();
    context.roundRect(player.x, player.y, player.width, player.height, 10);
    context.fill();
    context.fillStyle = "#fff";
    context.fillRect(player.x + 9, player.y + 10, 5, 5);
    context.fillRect(player.x + 22, player.y + 10, 5, 5);
    context.fillStyle = "#191919";
    obstacles.forEach((obstacle) => {
      context.font = "30px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("💩", obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
    });
  }

  function resetGame() {
    stopTimer();
    player.x = board.width / 2 - player.width / 2;
    obstacles.length = 0;
    score = 0;
    elapsed = 0;
    spawnElapsed = 0;
    moveDirection = 0;
    gameState = "idle";
    startButton.textContent = "시작";
    pauseButton.disabled = true;
    pauseButton.textContent = "일시정지";
    updateScore();
    setStatus("시작 버튼을 눌러 똥을 피해보세요.");
    draw();
  }

  function stopTimer() {
    if (animationId !== null) {
      window.cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function startGame() {
    if (gameState === "running") return;
    if (gameState === "game-over") resetGame();
    gameState = "running";
    lastFrame = performance.now();
    setStatus("똥을 피하는 중입니다!");
    startButton.textContent = "진행 중";
    pauseButton.disabled = false;
    animationId = window.requestAnimationFrame(gameLoop);
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

  function endGame() {
    gameState = "game-over";
    stopTimer();
    if (score > highScore) {
      highScore = score;
      saveHighScore();
    }
    updateScore();
    pauseButton.disabled = true;
    startButton.textContent = "다시 시작";
    setStatus("게임 오버! 똥에 맞았습니다.");
  }

  function spawnObstacle() {
    const width = 34;
    obstacles.push({
      x: Math.random() * (board.width - width),
      y: -width,
      width,
      height: width,
      speed: gameSpeed + Math.min(score * 4, 100)
    });
  }

  function overlaps(first, second) {
    const padding = 6;
    return first.x + padding < second.x + second.width - padding
      && first.x + first.width - padding > second.x
      && first.y + padding < second.y + second.height - padding
      && first.y + first.height - padding > second.y;
  }

  function gameLoop(timestamp) {
    if (gameState !== "running") return;
    const delta = Math.min(timestamp - lastFrame, 50) / 1000;
    lastFrame = timestamp;
    elapsed += delta;
    spawnElapsed += delta;
    player.x += moveDirection * player.speed * delta;
    player.x = Math.max(0, Math.min(board.width - player.width, player.x));
    if (spawnElapsed >= Math.max(.38, .8 - score * .01)) {
      spawnObstacle();
      spawnElapsed = 0;
    }
    obstacles.forEach((obstacle) => { obstacle.y += obstacle.speed * delta; });
    while (obstacles.length && obstacles[0].y > board.height) obstacles.shift();
    score = Math.floor(elapsed);
    updateScore();
    if (obstacles.some((obstacle) => overlaps(player, obstacle))) {
      endGame();
      return;
    }
    draw();
    animationId = window.requestAnimationFrame(gameLoop);
  }

  function setMoveDirection(direction) {
    moveDirection = direction === "left" ? -1 : direction === "right" ? 1 : 0;
    if (gameState === "idle") startGame();
  }

  document.addEventListener("keydown", (event) => {
    const keyMap = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
    if (keyMap[event.key]) {
      event.preventDefault();
      setMoveDirection(keyMap[event.key]);
    } else if (event.code === "Space") {
      event.preventDefault();
      pauseGame();
    }
  });
  document.addEventListener("keyup", (event) => {
    if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D"].includes(event.key)) moveDirection = 0;
  });
  directionButtons.forEach((button) => button.addEventListener("click", () => setMoveDirection(button.dataset.direction)));
  startButton.addEventListener("click", startGame);
  pauseButton.addEventListener("click", pauseGame);
  restartButton.addEventListener("click", resetGame);
  resetGame();
}
