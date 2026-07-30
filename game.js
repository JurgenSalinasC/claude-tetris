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
const T_TYPE = 3;
const POWERUP_TYPES = [14, 15, 16, 17, 18]; // bomba, rayo, tinte, gravedad, congelar
const INVENTORY_MAX = 3;
const FREEZE_MS = 5000;
const QUEUE_MAX = 5;

// ---- Retos (modo desafío) ----
const CHALLENGES = [
  { id: 'sprint40', name: 'Sprint 40', desc: 'Limpia 40 líneas en 2 minutos', targetLines: 40, timeLimitMs: 120000 },
  { id: 'garbage', name: 'Marea de basura', desc: 'Sobrevive 2 min con basura subiendo cada 10s', surviveMs: 120000, garbageEveryMs: 10000 },
  { id: 'prefilled', name: 'Terreno hostil', desc: 'Tablero con bloques pre-colocados', targetLines: 20, prefillRows: 6 },
  { id: 'blind', name: 'Piezas invisibles', desc: 'Las piezas se ocultan al asentarse', targetLines: 20, hideLocked: true },
  { id: 'reverse', name: 'Rotación inversa', desc: 'La rotación se invierte en niveles altos', targetLines: 30, reverseFromLevel: 3 },
];
const CHALLENGES_KEY = 'tetris-challenges';

// ---- Habilidades cargables ----
const ABILITIES = [
  { id: 'see5', name: 'Visión x5', desc: 'Ve las siguientes 5 piezas durante 10 turnos', icon: '👁' },
  { id: 'swap', name: 'Intercambio', desc: 'Cambia la pieza actual por otra al azar', icon: '🔄' },
  { id: 'slow', name: 'Cámara lenta', desc: 'Ralentiza la caída 10 segundos', icon: '🐢' },
  { id: 'undo', name: 'Deshacer', desc: 'Deshace la última colocación', icon: '⏪' },
  { id: 'clearBottom', name: 'Fila limpia', desc: 'Elimina la fila inferior del tablero', icon: '🧹' },
];
const ENERGY_MAX = 100;
const SEE5_TURNS = 10;
const SLOW_MS = 10000;
const SLOW_FACTOR = 2.5;

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
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const holdSectionEl = document.getElementById('hold-section');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const themeToggle = document.getElementById('theme-toggle');
const powerupsEl = document.getElementById('powerups');
const freezeIndicatorEl = document.getElementById('freeze-indicator');
const comboSectionEl = document.getElementById('combo-section');
const comboValueEl = document.getElementById('combo-value');
const b2bBadgeEl = document.getElementById('b2b-badge');
const energyFillEl = document.getElementById('energy-fill');
const energyBarEl = document.getElementById('energy-bar');
const abilityStatusEl = document.getElementById('ability-status');
const objectiveSectionEl = document.getElementById('objective-section');
const objectiveDescEl = document.getElementById('objective-desc');
const objectiveProgressEl = document.getElementById('objective-progress');
const menuEl = document.getElementById('menu');
const menuClassicBtn = document.getElementById('menu-classic-btn');
const menuChallengeBtn = document.getElementById('menu-challenge-btn');
const challengeListEl = document.getElementById('challenge-list');
const abilityMenuEl = document.getElementById('ability-menu');
const abilityCardsEl = document.getElementById('ability-cards');

const THEME_KEY = 'tetris-theme';
let themeColors = {};

let board, current, nextQueue, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, forcedQueue, inventory, freezeRemaining;
let combo, b2bActive, lastMoveWasRotation, effects;
let mode, modeCfg, modeTimer, garbageAccum, revealRemaining;
let energy, see5Remaining, slowRemaining, lastSnapshot;
let holdType, holdUsed;
let abilityMenuOpen;

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

function rotateCCW(shape) {
  return rotateCW(rotateCW(rotateCW(shape)));
}

function tryRotate() {
  const reversed = modeCfg?.reverseFromLevel && level >= modeCfg.reverseFromLevel;
  const rotated = reversed ? rotateCCW(current.shape) : rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastMoveWasRotation = true;
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

// Regla de las 3 esquinas: T-spin si la última acción fue una rotación de una
// pieza T y al menos 3 de las 4 esquinas de su caja 3x3 están ocupadas (o fuera del tablero).
function detectTSpin() {
  if (current.type !== T_TYPE || !lastMoveWasRotation) return false;
  const cx = current.x + 1;
  const cy = current.y + 1;
  const corners = [
    [cx - 1, cy - 1], [cx + 1, cy - 1],
    [cx - 1, cy + 1], [cx + 1, cy + 1],
  ];
  let occupied = 0;
  for (const [x, y] of corners) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS || board[y][x]) occupied++;
  }
  return occupied >= 3;
}

function clearLines() {
  let cleared = 0;
  const rows = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    const row = board[r];
    if (row.every(v => v !== 0) || row.some(v => v === WILD_TYPE)) {
      rows.push(r);
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return { cleared, rows };
}

function isBoardEmpty() {
  return board.every(row => row.every(v => v === 0));
}

// Centraliza puntuación, combo, T-spin, back-to-back, perfect clear y energía.
// fromLock=false (usado por power-ups) suma la puntuación base pero no altera
// combo/B2B/energía, ya que no es una limpieza obtenida jugando.
function applyLineScore(cleared, { tspin = false, fromLock = true } = {}) {
  if (cleared === 0) {
    if (fromLock) combo = -1;
    updateHUD();
    updateComboHUD();
    return;
  }

  const prevLines = lines;
  lines += cleared;
  level = Math.floor(lines / 10) + 1;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);

  let base = LINE_SCORES[cleared] ?? (800 + (cleared - 4) * 200);
  let comboMult = 1;
  let b2bMult = 1;
  const isSpecialClear = tspin || cleared >= 4;

  if (fromLock) {
    combo++;
    comboMult = 1 + Math.max(combo, 0);
    if (tspin) base += cleared === 0 ? 400 : 400 * cleared;
    if (isSpecialClear) {
      if (b2bActive) b2bMult = 1.5;
      b2bActive = true;
    } else {
      b2bActive = false;
    }
  }

  let total = Math.round(base * comboMult * level * b2bMult);
  if (fromLock && combo > 0) total += 50 * combo * level;

  let perfectClear = false;
  if (fromLock && isBoardEmpty()) {
    perfectClear = true;
    total += (cleared >= 4 ? 3000 : 1000) * level;
  }

  score += total;

  if (cleared >= 4) queueReward(SINGLE_TYPE);
  if (Math.floor(lines / 5) > Math.floor(prevLines / 5)) {
    queueReward(POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]);
  }

  if (fromLock) {
    energy = Math.min(ENERGY_MAX, energy + cleared * 8 + (tspin ? 10 : 0));
    if (combo > 0) spawnFloatingText(`COMBO x${comboMult}`, '#7aa2f7');
    if (tspin) spawnFloatingText(cleared === 0 ? 'T-SPIN' : `T-SPIN ${['', 'SINGLE', 'DOUBLE', 'TRIPLE'][cleared] ?? ''}`, '#ba68c8');
    if (b2bMult > 1) spawnFloatingText('B2B TETRIS', '#ffb74d');
    if (perfectClear) spawnFloatingText('PERFECT CLEAR', '#fff176');
    spawnBoardFlash(Math.min(1, 0.2 + combo * 0.1));
  }

  updateHUD();
  updateComboHUD();
  updateEnergyHUD();
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
  lastMoveWasRotation = false;
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function snapshotState() {
  return {
    board: board.map(row => [...row]),
    score, lines, level, combo, b2bActive, energy,
    holdType, holdUsed, dropInterval,
    current: { type: current.type, shape: current.shape.map(r => [...r]), x: current.x, y: current.y },
  };
}

function lockPiece() {
  if (POWERUP_TYPES.includes(current.type) && inventory.length < INVENTORY_MAX) {
    inventory.push(current.type);
    updatePowerupHUD();
    holdUsed = false;
    lastMoveWasRotation = false;
    spawn();
    return;
  }
  lastSnapshot = snapshotState();
  const tspin = detectTSpin();
  merge();
  const { cleared, rows } = clearLines();
  applyLineScore(cleared, { tspin, fromLock: true });
  if (cleared) {
    spawnRowParticles(rows);
    revealRemaining = 600;
  }
  checkModeProgress(cleared);
  holdUsed = false;
  lastMoveWasRotation = false;
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
  let didClear = false;
  switch (type) {
    case 14: applyBomb(); didClear = true; break;
    case 15: applyBolt(); didClear = true; break;
    case 16: applyDye(); didClear = true; break;
    case 17: applyGravity(); didClear = true; break;
    case 18: freezeRemaining = FREEZE_MS; break;
    default: return;
  }
  if (didClear) {
    const { cleared, rows } = clearLines();
    applyLineScore(cleared, { fromLock: false });
    if (cleared) spawnRowParticles(rows);
  }
  inventory.splice(index, 1);
  updatePowerupHUD();
  updateHUD();
}

// ---- Cola de piezas siguientes ----

function refillQueue() {
  while (nextQueue.length < QUEUE_MAX) {
    nextQueue.push(forcedQueue.length ? makePiece(forcedQueue.shift()) : randomPiece());
  }
}

// Inserta una pieza de recompensa en la 2ª posición de la cola en vez de al
// final, para que llegue pronto incluso con una cola larga de "next".
function queueReward(type) {
  nextQueue.splice(1, 0, makePiece(type));
}

function spawn() {
  current = nextQueue.shift();
  refillQueue();
  if (see5Remaining > 0) {
    see5Remaining--;
    updateEnergyHUD();
  }
  if (collide(current.shape, current.x, current.y)) {
    endGame(false);
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  updateObjectiveHUD();
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

function updateComboHUD() {
  const active = combo > 0;
  comboSectionEl.classList.toggle('hidden', !active);
  comboValueEl.textContent = `x${1 + Math.max(combo, 0)}`;
  b2bBadgeEl.classList.toggle('hidden', !b2bActive);
}

function updateEnergyHUD() {
  const pct = Math.min(100, (energy / ENERGY_MAX) * 100);
  energyFillEl.style.width = `${pct}%`;
  energyBarEl.classList.toggle('full', energy >= ENERGY_MAX);
  const parts = [];
  if (see5Remaining > 0) parts.push(`Visión x5: ${see5Remaining}`);
  if (slowRemaining > 0) parts.push(`Lento: ${(slowRemaining / 1000).toFixed(1)}s`);
  abilityStatusEl.textContent = parts.join(' · ');
}

function updateObjectiveHUD() {
  if (!modeCfg) {
    objectiveSectionEl.classList.add('hidden');
    return;
  }
  objectiveSectionEl.classList.remove('hidden');
  objectiveDescEl.textContent = modeCfg.desc;
  const bits = [];
  if (modeCfg.targetLines) bits.push(`${lines}/${modeCfg.targetLines} líneas`);
  if (modeTimer != null) {
    const s = Math.max(0, Math.ceil(modeTimer / 1000));
    bits.push(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
  }
  objectiveProgressEl.textContent = bits.join(' · ');
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const hidden = colorIndex === 'hidden';
  const color = hidden ? themeColors.hiddenBlock : COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = themeColors.blockHighlight;
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  const icon = hidden ? null : PIECE_ICONS[colorIndex];
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

// ---- Efectos visuales (sin audio) ----

function spawnFloatingText(text, color) {
  effects.push({
    kind: 'text', text, color,
    x: (COLS * BLOCK) / 2, y: (ROWS * BLOCK) / 2,
    vy: -0.03, life: 1200, maxLife: 1200,
  });
}

function spawnRowParticles(rows) {
  for (const r of rows) {
    for (let i = 0; i < 14; i++) {
      effects.push({
        kind: 'particle',
        x: Math.random() * COLS * BLOCK,
        y: r * BLOCK + BLOCK / 2,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.15 - Math.random() * 0.2,
        color: themeColors.blockHighlight,
        life: 500, maxLife: 500,
      });
    }
  }
}

function spawnBoardFlash(intensity) {
  effects.push({ kind: 'flash', intensity, life: 250, maxLife: 250 });
}

function updateEffects(dt) {
  for (const e of effects) {
    e.life -= dt;
    if (e.kind === 'text') e.y += e.vy * dt;
    if (e.kind === 'particle') { e.x += e.vx * dt; e.y += e.vy * dt; }
  }
  effects = effects.filter(e => e.life > 0);
}

function drawEffects() {
  for (const e of effects) {
    const alpha = Math.max(0, e.life / e.maxLife);
    if (e.kind === 'flash') {
      ctx.globalAlpha = alpha * e.intensity * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    } else if (e.kind === 'particle') {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x, e.y, 3, 3);
      ctx.globalAlpha = 1;
    } else if (e.kind === 'text') {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = e.color;
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.text, e.x, e.y);
      ctx.globalAlpha = 1;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  const hidden = modeCfg?.hideLocked && revealRemaining <= 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const v = board[r][c];
      drawBlock(ctx, c, r, hidden && v ? 'hidden' : v, BLOCK);
    }

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

  drawEffects();
}

function drawShapeInBox(context, canvasEl, shape, boxCells, size) {
  context.clearRect(0, 0, canvasEl.width, canvasEl.height);
  const offX = Math.floor((boxCells - shape[0].length) / 2);
  const offY = Math.floor((boxCells - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(context, offX + c, offY + r, shape[r][c], size);
}

function drawNext() {
  if (see5Remaining > 0) {
    nextCanvas.width = 120;
    nextCanvas.height = 360;
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextQueue.slice(0, 5).forEach((piece, i) => {
      const offX = Math.floor((4 - piece.shape[0].length) / 2);
      const offY = Math.floor((4 - piece.shape.length) / 2);
      for (let r = 0; r < piece.shape.length; r++)
        for (let c = 0; c < piece.shape[r].length; c++)
          drawBlock(nextCtx, offX + c, offY + r + i * 4, piece.shape[r][c], 20);
    });
  } else {
    nextCanvas.width = 120;
    nextCanvas.height = 120;
    drawShapeInBox(nextCtx, nextCanvas, nextQueue[0].shape, 4, 30);
  }
}

function drawHold() {
  holdSectionEl.classList.toggle('hold-locked', holdUsed);
  if (holdType === null) {
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    return;
  }
  drawShapeInBox(holdCtx, holdCanvas, PIECES[holdType], 4, 30);
}

// ---- Modo desafío ----

function loadCompletedChallenges() {
  try {
    return JSON.parse(localStorage.getItem(CHALLENGES_KEY)) ?? [];
  } catch {
    return [];
  }
}

function markChallengeComplete(id) {
  const done = loadCompletedChallenges();
  if (!done.includes(id)) {
    done.push(id);
    localStorage.setItem(CHALLENGES_KEY, JSON.stringify(done));
  }
}

function prefillBoard(rowCount) {
  for (let i = 0; i < rowCount; i++) {
    const r = ROWS - 1 - i;
    const gaps = new Set();
    while (gaps.size < 2 + Math.floor(Math.random() * 2)) {
      gaps.add(Math.floor(Math.random() * COLS));
    }
    for (let c = 0; c < COLS; c++) {
      board[r][c] = gaps.has(c) ? 0 : STANDARD_TYPES[Math.floor(Math.random() * STANDARD_TYPES.length)];
    }
  }
}

function pushGarbageRow() {
  const removed = board.shift();
  const gaps = new Set();
  while (gaps.size < 1 + Math.floor(Math.random() * 3)) {
    gaps.add(Math.floor(Math.random() * COLS));
  }
  const row = new Array(COLS).fill(0).map((_, c) => (gaps.has(c) ? 0 : SINGLE_TYPE));
  board.push(row);
  if (removed.some(v => v) || collide(current.shape, current.x, current.y)) {
    endGame(false);
  }
}

function checkModeProgress(clearedNow) {
  if (!modeCfg) return;
  if (modeCfg.targetLines && lines >= modeCfg.targetLines) {
    endGame(true);
  }
}

// ---- Habilidades cargables ----

function openAbilityMenu() {
  if (energy < ENERGY_MAX || paused || gameOver || abilityMenuOpen) return;
  abilityMenuOpen = true;
  cancelAnimationFrame(animId);
  renderAbilityCards();
  abilityMenuEl.classList.remove('hidden');
}

function closeAbilityMenu() {
  abilityMenuOpen = false;
  abilityMenuEl.classList.add('hidden');
  lastTime = performance.now();
  animId = requestAnimationFrame(loop);
}

function renderAbilityCards() {
  abilityCardsEl.innerHTML = '';
  for (const ability of ABILITIES) {
    const disabled = ability.id === 'undo' && !lastSnapshot;
    const card = document.createElement('button');
    card.className = 'ability-card' + (disabled ? ' disabled' : '');
    card.innerHTML = `<span class="ability-icon">${ability.icon}</span><span class="ability-name">${ability.name}</span><span class="ability-desc">${ability.desc}</span>`;
    card.disabled = disabled;
    card.addEventListener('click', () => activateAbility(ability.id));
    abilityCardsEl.appendChild(card);
  }
}

function activateAbility(id) {
  switch (id) {
    case 'see5': see5Remaining = SEE5_TURNS; break;
    case 'swap': {
      const swapped = randomPiece();
      swapped.x = current.x;
      swapped.y = current.y;
      if (!collide(swapped.shape, swapped.x, swapped.y)) current = swapped;
      break;
    }
    case 'slow': slowRemaining = SLOW_MS; break;
    case 'undo': {
      if (!lastSnapshot) return;
      board = lastSnapshot.board.map(row => [...row]);
      score = lastSnapshot.score;
      lines = lastSnapshot.lines;
      level = lastSnapshot.level;
      combo = lastSnapshot.combo;
      b2bActive = lastSnapshot.b2bActive;
      dropInterval = lastSnapshot.dropInterval;
      holdType = lastSnapshot.holdType;
      holdUsed = lastSnapshot.holdUsed;
      current = { type: lastSnapshot.current.type, shape: lastSnapshot.current.shape.map(r => [...r]), x: lastSnapshot.current.x, y: lastSnapshot.current.y };
      lastSnapshot = null;
      drawHold();
      drawNext();
      updateComboHUD();
      break;
    }
    case 'clearBottom': {
      board.splice(ROWS - 1, 1);
      board.unshift(new Array(COLS).fill(0));
      spawnRowParticles([ROWS - 1]);
      break;
    }
    default: return;
  }
  energy = 0;
  updateEnergyHUD();
  updateHUD();
  drawNext();
  closeAbilityMenu();
}

// ---- Hold ----

function tryHold() {
  if (holdUsed || paused || gameOver || abilityMenuOpen) return;
  const t = current.type;
  if (holdType === null) {
    holdType = t;
    spawn();
  } else {
    const swapped = makePiece(holdType);
    if (collide(swapped.shape, swapped.x, swapped.y)) return;
    holdType = t;
    current = swapped;
  }
  holdUsed = true;
  drawHold();
}

function endGame(won) {
  gameOver = true;
  cancelAnimationFrame(animId);
  if (modeCfg) {
    overlayTitle.textContent = won ? '¡RETO SUPERADO!' : 'GAME OVER';
    if (won) markChallengeComplete(modeCfg.id);
  } else {
    overlayTitle.textContent = 'GAME OVER';
  }
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver || abilityMenuOpen) return;
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

  if (revealRemaining > 0) revealRemaining = Math.max(0, revealRemaining - dt);
  if (slowRemaining > 0) {
    slowRemaining = Math.max(0, slowRemaining - dt);
    updateEnergyHUD();
  }

  if (freezeRemaining > 0) {
    freezeRemaining = Math.max(0, freezeRemaining - dt);
    dropAccum = 0;
    updatePowerupHUD();
  } else {
    if (modeCfg) {
      if (modeCfg.timeLimitMs != null || modeCfg.surviveMs != null) {
        modeTimer = Math.max(0, modeTimer - dt);
        if (modeTimer <= 0) {
          endGame(modeCfg.surviveMs != null);
        }
      }
      if (modeCfg.garbageEveryMs) {
        garbageAccum += dt;
        if (garbageAccum >= modeCfg.garbageEveryMs) {
          garbageAccum = 0;
          pushGarbageRow();
        }
      }
    }
    const effectiveInterval = dropInterval * (slowRemaining > 0 ? SLOW_FACTOR : 1);
    dropAccum += dt;
    if (dropAccum >= effectiveInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }
  updateEffects(dt);
  draw();
  if (!gameOver) animId = requestAnimationFrame(loop);
}

function init(modeId) {
  mode = modeId ?? 'classic';
  modeCfg = CHALLENGES.find(c => c.id === mode) ?? null;
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
  combo = -1;
  b2bActive = false;
  lastMoveWasRotation = false;
  effects = [];
  energy = 0;
  see5Remaining = 0;
  slowRemaining = 0;
  lastSnapshot = null;
  holdType = null;
  holdUsed = false;
  abilityMenuOpen = false;
  garbageAccum = 0;
  revealRemaining = 0;
  modeTimer = modeCfg?.timeLimitMs ?? modeCfg?.surviveMs ?? null;
  lastTime = performance.now();
  if (modeCfg?.prefillRows) prefillBoard(modeCfg.prefillRows);
  nextQueue = [];
  refillQueue();
  spawn();
  updateHUD();
  updatePowerupHUD();
  updateComboHUD();
  updateEnergyHUD();
  drawHold();
  overlay.classList.add('hidden');
  menuEl.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

// ---- Menú ----

function renderChallengeList() {
  const done = loadCompletedChallenges();
  challengeListEl.innerHTML = '';
  for (const c of CHALLENGES) {
    const card = document.createElement('button');
    card.className = 'challenge-card';
    card.innerHTML = `<span class="challenge-name">${c.name}${done.includes(c.id) ? ' ✓' : ''}</span><span class="challenge-desc">${c.desc}</span>`;
    card.addEventListener('click', () => init(c.id));
    challengeListEl.appendChild(card);
  }
}

function showMenu() {
  cancelAnimationFrame(animId);
  overlay.classList.add('hidden');
  challengeListEl.classList.add('hidden');
  menuEl.classList.remove('hidden');
}

menuClassicBtn.addEventListener('click', () => init('classic'));
menuChallengeBtn.addEventListener('click', () => {
  renderChallengeList();
  challengeListEl.classList.toggle('hidden');
});
menuBtn.addEventListener('click', showMenu);

document.addEventListener('keydown', e => {
  if (abilityMenuOpen) {
    if (e.code === 'Escape') closeAbilityMenu();
    return;
  }
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      lastMoveWasRotation = false;
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      lastMoveWasRotation = false;
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
      lastMoveWasRotation = false;
      hardDrop();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      tryHold();
      break;
    case 'KeyE':
      openAbilityMenu();
      break;
    case 'Digit1':
    case 'Digit2':
    case 'Digit3':
      usePowerup(Number(e.code.slice(5)) - 1);
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', () => init(mode));

function refreshThemeColors() {
  const style = getComputedStyle(document.documentElement);
  themeColors.gridLine = style.getPropertyValue('--grid-line').trim();
  themeColors.blockHighlight = style.getPropertyValue('--block-highlight').trim();
  themeColors.hiddenBlock = style.getPropertyValue('--hidden-block').trim();
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
  drawHold();
});

initTheme();
showMenu();
