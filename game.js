'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - azul pálido
  '#ffb74d', // L - orange
  '#f06292', // + (plus)      - rosa
  '#4db6ac', // U             - verde agua
  '#9575cd', // Y             - violeta
  '#fff176', // 1x1 (single)  - amarillo claro
  '#a1887f', // 3x3 hueca     - marrón
  '#ce93d8', // comodín (tinte)
  '#ef5350', // power-up: bomba
  '#fff59d', // power-up: rayo
  '#f48fb1', // power-up: tinte
  '#80cbc4', // power-up: gravedad
  '#81d4fa', // power-up: congelar
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[0,8,0],[8,8,8],[0,8,0]],                          // + (plus, pentominó)
  [[9,0,9],[9,9,9],[0,0,0]],                          // U (pentominó)
  [[0,10,0,0],[10,10,0,0],[0,10,0,0],[0,10,0,0]],     // Y (pentominó)
  [[11]],                                              // 1x1 (single, recompensa Tetris)
  [[12,12,12],[12,0,12],[12,12,12]],                  // 3x3 hueca (reto)
  [[13]],                                              // comodín (tinte, solo en tablero)
  [[14]],                                              // power-up: bomba
  [[15]],                                              // power-up: rayo
  [[16]],                                              // power-up: tinte
  [[17]],                                              // power-up: gravedad
  [[18]],                                              // power-up: congelar
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const STANDARD_TYPES = [1, 2, 3, 4, 5, 6, 7];
const SPECIAL_TYPES = [8, 9, 10, 12]; // +, U, Y, 3x3 hueca (1x1 solo por recompensa)
const SPECIAL_CHANCE = 0.10;
const SINGLE_TYPE = 11;
const WILD_TYPE = 13;
const POWERUP_TYPES = [14, 15, 16, 17, 18]; // bomba, rayo, tinte, gravedad, congelar
const INVENTORY_MAX = 3;
const FREEZE_MS = 5000;

// Icono y nombre por id de pieza especial (se pinta centrado en drawBlock)
const PIECE_ICONS = {
  13: '★', 14: '💥', 15: '⚡', 16: '🎨', 17: '⬇', 18: '❄',
};
const POWERUP_NAMES = {
  14: 'Bomba', 15: 'Rayo', 16: 'Tinte', 17: 'Gravedad', 18: 'Congelar',
};

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggle = document.getElementById('theme-toggle');
const powerupsEl = document.getElementById('powerups');
const freezeIndicatorEl = document.getElementById('freeze-indicator');

const THEME_KEY = 'tetris-theme';
let themeColors = {};

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, forcedQueue, inventory, freezeRemaining;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function makePiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function randomPiece() {
  const pool = Math.random() < SPECIAL_CHANCE ? SPECIAL_TYPES : STANDARD_TYPES;
  return makePiece(pool[Math.floor(Math.random() * pool.length)]);
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    const row = board[r];
    if (row.every(v => v !== 0) || row.some(v => v === WILD_TYPE)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    const prevLines = lines;
    lines += cleared;
    score += (LINE_SCORES[cleared] ?? (800 + (cleared - 4) * 200)) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    if (cleared >= 4) forcedQueue.push(SINGLE_TYPE);
    if (Math.floor(lines / 5) > Math.floor(prevLines / 5)) {
      forcedQueue.push(POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]);
    }
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  if (POWERUP_TYPES.includes(current.type) && inventory.length < INVENTORY_MAX) {
    inventory.push(current.type);
    updatePowerupHUD();
    spawn();
    return;
  }
  merge();
  clearLines();
  spawn();
}

function currentCenter() {
  return {
    cx: current.x + Math.floor(current.shape[0].length / 2),
    cy: current.y + Math.floor(current.shape.length / 2),
  };
}

function clearCell(r, c) {
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) board[r][c] = 0;
}

function applyBomb() {
  const { cx, cy } = currentCenter();
  for (let r = cy - 1; r <= cy + 1; r++)
    for (let c = cx - 1; c <= cx + 1; c++)
      clearCell(r, c);
}

function applyBolt() {
  const { cx, cy } = currentCenter();
  if (cy >= 0 && cy < ROWS) for (let c = 0; c < COLS; c++) clearCell(cy, c);
  for (let r = 0; r < ROWS; r++) clearCell(r, cx);
}

function applyDye() {
  const colors = new Set();
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] && board[r][c] !== WILD_TYPE) colors.add(board[r][c]);
  if (!colors.size) return;
  const list = [...colors];
  const target = list[Math.floor(Math.random() * list.length)];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] === target) board[r][c] = WILD_TYPE;
}

function applyGravity() {
  for (let c = 0; c < COLS; c++) {
    const values = [];
    for (let r = 0; r < ROWS; r++)
      if (board[r][c]) values.push(board[r][c]);
    for (let r = ROWS - 1; r >= 0; r--)
      board[r][c] = values.length ? values.pop() : 0;
  }
}

function usePowerup(index) {
  const type = inventory[index];
  if (!type) return;
  switch (type) {
    case 14: applyBomb(); clearLines(); break;
    case 15: applyBolt(); clearLines(); break;
    case 16: applyDye(); clearLines(); break;
    case 17: applyGravity(); clearLines(); break;
    case 18: freezeRemaining = FREEZE_MS; break;
    default: return;
  }
  inventory.splice(index, 1);
  updatePowerupHUD();
  updateHUD();
}

function spawn() {
  current = next;
  next = forcedQueue.length ? makePiece(forcedQueue.shift()) : randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function updatePowerupHUD() {
  const slots = powerupsEl.querySelectorAll('.slot');
  slots.forEach((slot, i) => {
    const type = inventory[i];
    if (type) {
      slot.textContent = PIECE_ICONS[type];
      slot.title = POWERUP_NAMES[type];
      slot.classList.remove('empty');
    } else {
      slot.textContent = '';
      slot.title = '';
      slot.classList.add('empty');
    }
  });
  freezeIndicatorEl.textContent = freezeRemaining > 0
    ? `Congelado: ${(freezeRemaining / 1000).toFixed(1)}s`
    : '';
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = themeColors.blockHighlight;
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  const icon = PIECE_ICONS[colorIndex];
  if (icon) {
    context.fillStyle = '#1a1a25';
    context.font = `${Math.floor(size * 0.6)}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(icon, x * size + size / 2, y * size + size / 2 + 1);
  }
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = themeColors.gridLine;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  if (freezeRemaining > 0) {
    freezeRemaining = Math.max(0, freezeRemaining - dt);
    dropAccum = 0;
    updatePowerupHUD();
  } else {
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  forcedQueue = [];
  inventory = [];
  freezeRemaining = 0;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  updatePowerupHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'Digit1':
    case 'Digit2':
    case 'Digit3':
      usePowerup(Number(e.code.slice(5)) - 1);
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

function refreshThemeColors() {
  const style = getComputedStyle(document.documentElement);
  themeColors.gridLine = style.getPropertyValue('--grid-line').trim();
  themeColors.blockHighlight = style.getPropertyValue('--block-highlight').trim();
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  themeToggle.checked = theme === 'light';
  refreshThemeColors();
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === 'light' ? 'light' : 'dark');
}

themeToggle.addEventListener('change', () => {
  const theme = themeToggle.checked ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  draw();
  drawNext();
});

initTheme();
init();
