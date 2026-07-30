"use strict";

document.querySelectorAll("#current-year, .current-year").forEach((year) => {
  year.textContent = new Date().getFullYear();
});

const postIndex = [
  { id: "leetcode-131", title: "[Leetcode] 131. Palindrome Partitioning", keywords: "backtracking palindrome dfs", excerpt: "모든 palindrome partitioning을 구하는 문제" },
  { id: "leetcode-2597", title: "[Leetcode] 2597. The Number of Beautiful Subsets", keywords: "dp backtracking divide conquer", excerpt: "차이 조건을 만족하는 부분집합의 개수" },
  { id: "leetcode-1255", title: "[Leetcode] 1255. Maximum Score Words Formed by Letters", keywords: "backtracking search", excerpt: "문자로 만들 수 있는 단어들의 최대 점수" },
  { id: "leetcode-1208", title: "[Leetcode] 1208. Get Equal Substrings Within Budget", keywords: "two pointer sliding window", excerpt: "예산 안에서 만들 수 있는 최대 부분문자열" },
  { id: "leetcode-1404", title: "[Leetcode] 1404. Number of Steps to Reduce a Number", keywords: "implementation bit manipulation", excerpt: "이진 표현을 1로 줄이는 시행 횟수" },
  { id: "leetcode-1442", title: "[Leetcode] 1442. Count Triplets That Can Form Two Arrays of Equal XOR", keywords: "prefix xor dp brute force", excerpt: "두 배열의 XOR가 같아지는 triplet 개수" },
  { id: "leetcode-2024", title: "[Leetcode] 2024. Maximize the Confusion of an Exam", keywords: "two pointer sliding window", excerpt: "T 또는 F의 가장 긴 연속 구간" }
];

const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector("#post-search");
const searchResults = document.querySelector("#search-results");
if (searchForm && searchInput && searchResults) {
  function renderResults(query) {
    const normalized = query.trim().toLowerCase();
    const matches = postIndex.filter((post) => `${post.title} ${post.keywords} ${post.excerpt}`.toLowerCase().includes(normalized));
    searchResults.innerHTML = matches.length
      ? matches.map((post) => `<article class="search-result"><p class="post-meta">LeetCode</p><h2><a href="blog.html#${post.id}">${post.title}</a></h2><p class="muted">${post.excerpt}</p></article>`).join("")
      : `<p class="muted">검색 결과가 없습니다.</p>`;
  }
  searchForm.addEventListener("submit", (event) => { event.preventDefault(); renderResults(searchInput.value); });
  renderResults("");
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
