import { Rng } from './rng';
import {
  ROWS as DEFAULT_ROWS, EMPTY, MATCH_LEN, cell, colorOf, kindOf, isVirus, isCapsule, isStone, isBomb, partnerDelta, toSingle, KIND_VIRUS, KIND_SINGLE, KIND_STONE, KIND_BOMB, KIND_LEFT, KIND_RIGHT, KIND_UP, KIND_DOWN, MAX_COLORS, hasLock, removeLock, addLock,
  gravityFrames, LOCK_DELAY, CLEAR_ANIM_FRAMES, FALL_STEP_FRAMES, SPAWN_DELAY, DAS_DELAY, DAS_REPEAT, SOFT_DROP_FRAMES,
  virusCount, virusTopRow
} from './constants';
import { Phase, Input, MatchConfig, Capsule, AttackInfo } from './sim';
import { POWER_STRIKE, POWER_JOKER, powerFreqParams } from './powerups';

export interface CoopGameState {
  cfg: MatchConfig;
  playerCount: number;
  cols: number;
  rows: number; // dynamic board height
  boardColsPerPlayer: number; // cols per player zone
  board: Uint8Array;
  frame: number;
  phase: Phase;
  rng: Rng;
  
  // Per-player states
  capsules: (Capsule | null)[];
  nextA: number[];
  nextB: number[];
  capsulesDropped: number[];
  gravityTimers: number[];
  lockTimers: number[];
  softDrops: boolean[];
  dasDirs: number[];
  dasTimers: number[];
  scores: number[];
  missCounts: number[];
  bombs: number[];
  bombActives: boolean[];
  spawningTimers: number[]; // Each player can spawn independently if the game isn't clearing

  /** Güçlendiriciler (ortak tahtada: joker ve yıldırım = virüs avcısı) */
  powerRng: Rng;
  nextPowers: number[];
  powerGaps: number[];
  
  /**
   * Oyuncu başına isteğe bağlı yatay sınır [alt, üst): kapsül bu sütun aralığının dışına çıkamaz.
   * Botlar kendi şeridini oynadığı için kullanılır (DAS tekrarı ya da dönüş şerit dışına taşırmasın).
   */
  laneLimits: Array<[number, number] | null>;

  /** Yükselen taban (sonsuz mod) */
  riseRng: Rng;
  /** Bir sonraki yükselmeye kalan kare (yalnızca Falling fazında azalır) */
  riseTimer: number;
  /** İki yükselme arası kare sayısı */
  riseInterval: number;
  /** Şimdiye kadarki yükselme sayısı */
  riseCount: number;
  /** Yükselme animasyonunda kalan kare (görsel kayma için) */
  riseAnim: number;

  phaseTimer: number; // Only used when phase = Clearing or Settling
  clearing: number[];
  chain: number;
  maxChain: number;
  virusesLeft: number;
  totalVirusesCleared: number;
  events: string[]; // shared events
}

// ---------------------------------------------------------
// COOP BOARD UTILS
// ---------------------------------------------------------

export function idxCoop(x: number, y: number, cols: number): number {
  return y * cols + x;
}

export function getCoop(b: Uint8Array, x: number, y: number, cols: number, rows: number): number {
  if (x < 0 || x >= cols || y < 0 || y >= rows) return -1;
  return b[idxCoop(x, y, cols)];
}

export function setCoop(b: Uint8Array, x: number, y: number, cols: number, v: number) {
  b[idxCoop(x, y, cols)] = v;
}

export function countVirusesCoop(b: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < b.length; i++) if (isVirus(b[i])) n++;
  return n;
}

export function placeVirusesCoop(b: Uint8Array, level: number, rng: Rng, colors: number, cols: number, rows: number, playerCount: number) {
  const rawTop = virusTopRow(level);
  const topRatio = rawTop / 16;
  const top = Math.max(1, Math.min(rows - 2, Math.floor(rows * topRatio)));
  const availableSlots = (rows - top) * cols;
  const maxViruses = Math.floor(availableSlots * 0.7);
  const total = Math.min(virusCount(level) * playerCount, maxViruses);
  let placed = 0;
  let guard = 0;

  while (placed < total && guard < 50000) {
    guard++;
    const y = top + rng.int(rows - top);
    const x = rng.int(cols);
    if (getCoop(b, x, y, cols, rows) !== EMPTY) continue;

    const start = rng.int(colors);
    let ok = false;
    for (let i = 0; i < colors; i++) {
      const color = (start + i) % colors;
      if (!wouldMakeTripleCoop(b, x, y, color, cols, rows)) {
        setCoop(b, x, y, cols, cell(KIND_VIRUS, color));
        ok = true;
        break;
      }
    }
    if (ok) placed++;
  }
}

function wouldMakeTripleCoop(b: Uint8Array, x: number, y: number, color: number, cols: number, rows: number): boolean {
  const axes: [number, number][] = [[1, 0], [0, 1]];
  for (const [dx, dy] of axes) {
    let run = 1;
    for (let s = 1; s <= 3; s++) {
      const c = getCoop(b, x + dx * s, y + dy * s, cols, rows);
      if (c > 0 && colorOf(c) === color) run++;
      else break;
    }
    for (let s = 1; s <= 3; s++) {
      const c = getCoop(b, x - dx * s, y - dy * s, cols, rows);
      if (c > 0 && colorOf(c) === color) run++;
      else break;
    }
    if (run >= 3) return true;
  }
  return false;
}

// ---------------------------------------------------------
// COOP ENGINE LOGIC
// ---------------------------------------------------------

/** Yükselme animasyonunun uzunluğu (kare) */
export const RISE_ANIM_FRAMES = 16;
/** Yükselmeden bu kadar kare önce uyarı verilir */
export const RISE_WARN_FRAMES = 120;

/** Yükselme hızı 1 (25 sn) .. 10 (4 sn) → iki yükselme arası kare sayısı (60 kare/sn) */
export function riseIntervalFrames(speed?: number): number {
  const n = Math.round(Number(speed));
  const v = Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 5;
  return Math.round(1500 - ((v - 1) * (1500 - 240)) / 9);
}

/** Her yükselmede alta eklenecek virüs sayısı: oyun seviyesiyle orantılı (seviye 0 ≈ %10, 20 ≈ %34, en çok yarısı). */
export function riseRowViruses(level: number, cols: number): number {
  const lv = Math.max(0, Math.min(20, Number.isFinite(level) ? level : 0));
  return Math.max(1, Math.min(Math.floor(cols / 2), Math.round(cols * (0.1 + lv * 0.012))));
}

export function createCoopGame(cfg: MatchConfig, playerCount: number, boardCols?: number, boardRows?: number): CoopGameState {
  const boardColsPerPlayer = Math.max(4, boardCols ?? 8);
  const rows = Math.max(8, boardRows ?? DEFAULT_ROWS);
  const cols = boardColsPerPlayer * playerCount;
  const board = new Uint8Array(rows * cols);
  const virusRng = new Rng(cfg.seed ^ 0x5bf03635);
  placeVirusesCoop(board, cfg.level, virusRng, cfg.colors, cols, rows, playerCount);

  const rng = new Rng(cfg.seed);
  
  const s: CoopGameState = {
    cfg,
    playerCount,
    cols,
    rows,
    boardColsPerPlayer,
    board,
    frame: 0,
    phase: Phase.Falling,
    rng,
    
    capsules: Array(playerCount).fill(null),
    nextA: Array(playerCount).fill(0).map(() => rng.int(cfg.colors)),
    nextB: Array(playerCount).fill(0).map(() => rng.int(cfg.colors)),
    capsulesDropped: Array(playerCount).fill(0),
    gravityTimers: Array(playerCount).fill(0),
    lockTimers: Array(playerCount).fill(0),
    softDrops: Array(playerCount).fill(false),
    dasDirs: Array(playerCount).fill(0),
    dasTimers: Array(playerCount).fill(0),
    scores: Array(playerCount).fill(0),
    missCounts: Array(playerCount).fill(0),
    bombs: Array(playerCount).fill(0),
    bombActives: Array(playerCount).fill(false),
    spawningTimers: Array(playerCount).fill(SPAWN_DELAY),

    powerRng: new Rng((cfg.seed ^ 0x7f4a7c15) >>> 0),
    nextPowers: Array(playerCount).fill(0),
    powerGaps: Array(playerCount).fill(0),

    laneLimits: Array(playerCount).fill(null),

    riseRng: new Rng((cfg.seed ^ 0x2545f491) >>> 0),
    riseInterval: riseIntervalFrames(cfg.riseSpeed),
    riseTimer: riseIntervalFrames(cfg.riseSpeed),
    riseCount: 0,
    riseAnim: 0,

    phaseTimer: 0,
    clearing: [],
    chain: 0,
    maxChain: 0,
    virusesLeft: countVirusesCoop(board),
    totalVirusesCleared: 0,
    events: [],
  };
  
  return s;
}

function capsuleCells(c: Capsule): [number, number, number, number] {
  if (c.isBomb) return [c.x, c.y, c.x, c.y];
  switch (c.rot & 3) {
    case 0: return [c.x, c.y, c.x + 1, c.y];
    case 1: return [c.x, c.y, c.x, c.y - 1];
    case 2: return [c.x + 1, c.y, c.x, c.y];
    default: return [c.x, c.y - 1, c.x, c.y];
  }
}

/** Kapsül tahta sınırları içinde ve dolu hücreye değmiyor mu? (diğer kapsüllere bakmaz) */
function fitsBoardCoop(s: CoopGameState, c: Capsule): boolean {
  const [x1, y1, x2, y2] = capsuleCells(c);
  if (x1 < 0 || x1 >= s.cols || y1 < 0 || y1 >= s.rows || getCoop(s.board, x1, y1, s.cols, s.rows) !== EMPTY) return false;
  if (!c.isBomb && (x2 < 0 || x2 >= s.cols || y2 < 0 || y2 >= s.rows || getCoop(s.board, x2, y2, s.cols, s.rows) !== EMPTY)) return false;
  return true;
}

// Tahtaya sığıyor mu VE (geçirgen mod kapalıysa) diğer düşen kapsüllere çarpmıyor mu?
function fitsCoop(s: CoopGameState, c: Capsule, skipPlayerIndex: number = -1): boolean {
  if (!fitsBoardCoop(s, c)) return false;

  const [x1, y1, x2, y2] = capsuleCells(c);
  const lane = skipPlayerIndex >= 0 ? s.laneLimits[skipPlayerIndex] : null;
  if (lane) {
    if (x1 < lane[0] || x1 >= lane[1]) return false;
    if (!c.isBomb && (x2 < lane[0] || x2 >= lane[1])) return false;
  }

  if (s.cfg.coopPassThrough) return true; // oyuncular havada birbirine engel olmaz
  for (let p = 0; p < s.playerCount; p++) {
    if (p === skipPlayerIndex) continue;
    const oc = s.capsules[p];
    if (oc) {
      const [ox1, oy1, ox2, oy2] = capsuleCells(oc);
      if (x1 === ox1 && y1 === oy1) return false;
      if (!c.isBomb && x2 === ox1 && y2 === oy1) return false;
      if (!oc.isBomb) {
        if (x1 === ox2 && y1 === oy2) return false;
        if (!c.isBomb && x2 === ox2 && y2 === oy2) return false;
      }
    }
  }
  return true;
}

/** Düşen kapsüllerin kapladığı hücreler: yerçekimi bunlara parça düşürmez. */
function capsuleCellSet(s: CoopGameState): Set<number> {
  const set = new Set<number>();
  for (let p = 0; p < s.playerCount; p++) {
    const cap = s.capsules[p];
    if (!cap) continue;
    const [x1, y1, x2, y2] = capsuleCells(cap);
    set.add(y1 * s.cols + x1);
    if (!cap.isBomb) set.add(y2 * s.cols + x2);
  }
  return set;
}

/**
 * Bir kapsül tahtaya yerleşince, havada hâlâ onun hücrelerinde duran (geçirgen mod) kapsülleri
 * yukarı iter: üstteki, yerleşenin tepesine oturur. Sığacak yer yoksa tahta dolmuştur → kayıp.
 */
function resolveOverlapsCoop(s: CoopGameState) {
  for (let q = 0; q < s.playerCount; q++) {
    const cq = s.capsules[q];
    if (!cq || fitsBoardCoop(s, cq)) continue;
    let moved = false;
    for (let k = 1; k <= s.rows; k++) {
      const t = { ...cq, y: cq.y - k };
      if (fitsBoardCoop(s, t)) {
        s.capsules[q] = t;
        s.lockTimers[q] = 0;
        s.gravityTimers[q] = 0;
        s.events.push(`bump:p${q}`);
        moved = true;
        break;
      }
    }
    if (!moved) {
      s.phase = Phase.Lost;
      s.events.push('lost');
      return;
    }
  }
}

function writeHalvesCoop(board: Uint8Array, cols: number, c: Capsule, a: number, b: number) {
  const [x1, y1, x2, y2] = capsuleCells(c);
  if (y1 === y2) {
    const leftFirst = x1 < x2;
    setCoop(board, x1, y1, cols, cell(leftFirst ? KIND_LEFT : KIND_RIGHT, a));
    setCoop(board, x2, y2, cols, cell(leftFirst ? KIND_RIGHT : KIND_LEFT, b));
  } else {
    const firstOnTop = y1 < y2;
    setCoop(board, x1, y1, cols, cell(firstOnTop ? KIND_UP : KIND_DOWN, a));
    setCoop(board, x2, y2, cols, cell(firstOnTop ? KIND_DOWN : KIND_UP, b));
  }
}

/** Joker: yerleştiği anda en çok hücre / virüs temizleyecek rengi seçer (eşitlikte küçük renk). */
function jokerColorsCoop(s: CoopGameState, c: Capsule): [number, number] {
  let bestK = -1;
  let bestScore = 0;
  for (let k = 0; k < s.cfg.colors; k++) {
    const trial = new Uint8Array(s.board);
    writeHalvesCoop(trial, s.cols, c, k, k);
    const m = findMatchesCoop(trial, s);
    const score = m.cleared.length + m.virusesCleared * 10;
    if (score > bestScore) {
      bestScore = score;
      bestK = k;
    }
  }
  return bestK >= 0 ? [bestK, bestK] : [c.a, c.b];
}

/** Yıldırım (ortak tahtada): rastgele en fazla 3 virüsü yok eder. */
function zapViruses(s: CoopGameState, p: number) {
  const viruses: number[] = [];
  for (let i = 0; i < s.board.length; i++) if (isVirus(s.board[i])) viruses.push(i);
  const n = Math.min(3, viruses.length);
  const zapped: number[] = [];
  for (let k = 0; k < n; k++) {
    const j = k + s.powerRng.int(viruses.length - k); // kısmi Fisher-Yates
    [viruses[k], viruses[j]] = [viruses[j], viruses[k]];
    zapped.push(viruses[k]);
  }
  for (const i of zapped) s.board[i] = EMPTY;
  s.virusesLeft -= zapped.length;
  s.totalVirusesCleared += zapped.length;
  s.scores[p] += zapped.length * 100;
  // virüsün üstündeki parçalar hemen düşsün
  const blocked = capsuleCellSet(s);
  while (stepGravityCoop(s.board, s.cols, s.rows, blocked)) { /* yerçekimi oturana kadar */ }
  return zapped;
}

function lockCapsuleCoop(s: CoopGameState, p: number) {
  const c = s.capsules[p];
  if (!c) return;
  const [x1, y1] = capsuleCells(c);

  let a = c.a;
  let b = c.b;
  if (c.isBomb) {
    setCoop(s.board, x1, y1, s.cols, cell(KIND_BOMB, 0));
  } else {
    if (c.power === POWER_JOKER) [a, b] = jokerColorsCoop(s, c);
    writeHalvesCoop(s.board, s.cols, c, a, b);
  }

  s.capsules[p] = null;
  s.capsulesDropped[p]++;
  s.events.push(`lock:p${p}`);
  if (s.cfg.coopPassThrough) resolveOverlapsCoop(s);

  if (c.power === POWER_JOKER) {
    s.events.push('power:joker');
  } else if (c.power === POWER_STRIKE) {
    const zapped = zapViruses(s, p);
    s.events.push('power:strike');
    if (zapped.length > 0) s.events.push(`zap:${zapped.join(',')}`);
  }
}

/** Bir sonraki kapsülün gücü: ortak tahtada yalnızca joker ya da yıldırım. */
function rollNextPowerCoop(s: CoopGameState, p: number): number {
  if (!s.cfg.powerupsEnabled) return 0;
  const { gap, chance } = powerFreqParams(s.cfg.powerupFreq);
  s.powerGaps[p]++;
  if (s.powerGaps[p] < gap) return 0;
  if (s.powerRng.next() / 4294967296 >= chance) return 0;
  s.powerGaps[p] = 0;
  return s.powerRng.next() / 4294967296 < 0.6 ? POWER_JOKER : POWER_STRIKE;
}

function spawnCoop(s: CoopGameState, p: number) {
  let c: Capsule;
  const spawnX = p * s.boardColsPerPlayer + Math.floor(s.boardColsPerPlayer / 2) - 1;
  if (s.bombActives[p]) {
    c = { x: spawnX, y: 0, rot: 0, a: 0, b: 0, isBomb: true };
    s.bombActives[p] = false;
  } else {
    c = { x: spawnX, y: 0, rot: 0, a: s.nextA[p], b: s.nextB[p] };
    s.nextA[p] = s.rng.int(s.cfg.colors);
    s.nextB[p] = s.rng.int(s.cfg.colors);
    if (s.nextPowers[p]) c.power = s.nextPowers[p];
    s.nextPowers[p] = rollNextPowerCoop(s, p);
  }

  if (!fitsCoop(s, c, p)) {
    s.phase = Phase.Lost;
    s.events.push('lost');
    return;
  }
  s.capsules[p] = c;
  s.gravityTimers[p] = 0;
  s.lockTimers[p] = 0;
  s.events.push(`spawn:p${p}`);
}

// ---------------------------------------------------------
// MATCHING LOGIC
// ---------------------------------------------------------
function findMatchesCoop(b: Uint8Array, s: CoopGameState) {
  const marked = new Set<number>();
  let groups = 0;
  const cols = s.cols;
  const colors: number[] = [];
  const matchesLengths: { len: number; color: number; center: number }[] = [];
  let bombsEarned = 0;

  const checkRun = (run: number, color: number, cells: number[]) => {
    if (run >= MATCH_LEN) {
      groups++;
      colors.push(color);
      for (const i of cells) marked.add(i);
      matchesLengths.push({ len: run, color, center: cells[Math.floor(run / 2)] });
    }
  };

  for (let y = 0; y < s.rows; y++) {
    let run = 0; let color = -1; let cells: number[] = [];
    for (let x = 0; x < cols; x++) {
      const c = b[idxCoop(x, y, cols)];
      if (c !== EMPTY && !isStone(c)) {
        if (colorOf(c) === color) { run++; cells.push(idxCoop(x, y, cols)); }
        else { checkRun(run, color, cells); color = colorOf(c); run = 1; cells = [idxCoop(x, y, cols)]; }
      } else { checkRun(run, color, cells); color = -1; run = 0; cells = []; }
    }
    checkRun(run, color, cells);
  }

  for (let x = 0; x < cols; x++) {
    let run = 0; let color = -1; let cells: number[] = [];
    for (let y = 0; y < s.rows; y++) {
      const c = b[idxCoop(x, y, cols)];
      if (c !== EMPTY && !isStone(c)) {
        if (colorOf(c) === color) { run++; cells.push(idxCoop(x, y, cols)); }
        else { checkRun(run, color, cells); color = colorOf(c); run = 1; cells = [idxCoop(x, y, cols)]; }
      } else { checkRun(run, color, cells); color = -1; run = 0; cells = []; }
    }
    checkRun(run, color, cells);
  }

  if (s.cfg.diagMatches) {
    const diagonals = [{ dx: 1, dy: 1 }, { dx: 1, dy: -1 }];
    for (const { dx, dy } of diagonals) {
      for (let startY = 0; startY < s.rows; startY++) {
        for (let startX = 0; startX < cols; startX++) {
          const prevX = startX - dx; const prevY = startY - dy;
          if (prevX >= 0 && prevX < cols && prevY >= 0 && prevY < s.rows) continue;
          let run = 0; let color = -1; let cells: number[] = [];
          let x = startX; let y = startY;
          while (x >= 0 && x < cols && y >= 0 && y < s.rows) {
            const c = b[idxCoop(x, y, cols)];
            if (c !== EMPTY && !isStone(c)) {
              if (colorOf(c) === color) { run++; cells.push(idxCoop(x, y, cols)); }
              else { checkRun(run, color, cells); color = colorOf(c); run = 1; cells = [idxCoop(x, y, cols)]; }
            } else { checkRun(run, color, cells); color = -1; run = 0; cells = []; }
            x += dx; y += dy;
          }
          checkRun(run, color, cells);
        }
      }
    }
  }

  const explosions: number[] = [];
  const bombExplosions: number[] = [];
  if (s.cfg.aoeEnabled) {
    for (const match of matchesLengths) {
      if (match.len >= (s.cfg.aoeThreshold ?? 5)) {
        explosions.push(match.center);
        const cx = match.center % cols; const cy = Math.floor(match.center / cols);
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const px = cx + dx; const py = cy + dy;
            if (px >= 0 && px < cols && py >= 0 && py < s.rows) {
              const i = idxCoop(px, py, cols);
              if (isStone(b[i])) marked.add(i);
            }
          }
        }
      }
    }
  }

  for (let i = 0; i < s.rows * cols; i++) {
    if (isBomb(b[i])) {
      bombExplosions.push(i);
      const cx = i % cols; const cy = Math.floor(i / cols);
      const radius = Math.floor((s.cfg.bombThreshold ?? 5) / 2);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const px = cx + dx; const py = cy + dy;
          if (px >= 0 && px < cols && py >= 0 && py < s.rows) {
            marked.add(idxCoop(px, py, cols));
          }
        }
      }
    }
  }

  if (s.cfg.bombEnabled) {
    for (const match of matchesLengths) {
      if (match.len >= (s.cfg.bombThreshold ?? 5)) bombsEarned++;
    }
  }

  let virusesCleared = 0;
  let stonesCleared = 0;
  for (const i of marked) {
    if (isVirus(b[i]) && !hasLock(b[i])) virusesCleared++;
    if (isStone(b[i])) stonesCleared++;
  }

  return { cleared: [...marked].sort((a, b2) => a - b2), stonesCleared, virusesCleared, groups, colors, explosions, bombExplosions, matchesLengths, bombsEarned };
}

function applyClearCoop(b: Uint8Array, cleared: number[], cols: number, rows: number) {
  for (const i of cleared) {
    const c = b[i];
    if (c === EMPTY) continue;
    const d = partnerDelta(c);
    if (d) {
      const x = i % cols; const y = (i / cols) | 0;
      const px = x + d[0]; const py = y + d[1];
      const pc = getCoop(b, px, py, cols, rows);
      if (pc > 0 && isCapsule(pc)) setCoop(b, px, py, cols, toSingle(pc));
    }
  }
  for (const i of cleared) {
    const c = b[i];
    if (c === EMPTY) continue;
    if (hasLock(c)) b[i] = removeLock(c);
    else b[i] = EMPTY;
  }
}

function stepGravityCoop(b: Uint8Array, cols: number, rows: number, blocked?: Set<number> | null): boolean {
  const moved = new Uint8Array(rows * cols);
  let any = false;
  // düşen bir kapsülün bulunduğu hücreye parça düşmez (kapsül tahtada değil, ayrı tutuluyor)
  const free = (x: number, y: number) => getCoop(b, x, y, cols, rows) === EMPTY && !(blocked && blocked.has(y * cols + x));

  for (let y = rows - 2; y >= 0; y--) {
    for (let x = 0; x < cols; x++) {
      const i = idxCoop(x, y, cols);
      const c = b[i];
      if (c === EMPTY || moved[i]) continue;
      if (kindOf(c) === KIND_VIRUS) continue;

      const d = partnerDelta(c);
      if (!d) {
        if (free(x, y + 1)) {
          setCoop(b, x, y + 1, cols, c);
          b[i] = EMPTY;
          moved[idxCoop(x, y + 1, cols)] = 1;
          any = true;
        }
      } else {
        const px = x + d[0]; const py = y + d[1];
        const pc = getCoop(b, px, py, cols, rows);
        if (pc <= 0) {
          setCoop(b, x, y, cols, toSingle(c));
          any = true;
          continue;
        }
        if (d[1] === 0) {
          if (free(x, y + 1) && free(px, py + 1)) {
            setCoop(b, x, y + 1, cols, c);
            setCoop(b, px, py + 1, cols, pc);
            b[i] = EMPTY; b[idxCoop(px, py, cols)] = EMPTY;
            moved[idxCoop(x, y + 1, cols)] = 1; moved[idxCoop(px, py + 1, cols)] = 1;
            any = true;
          }
        } else {
          const lowY = Math.max(y, py);
          const upY = Math.min(y, py);
          if (free(x, lowY + 1)) {
            const lowC = b[idxCoop(x, lowY, cols)];
            const upC = b[idxCoop(x, upY, cols)];
            b[idxCoop(x, lowY, cols)] = EMPTY; b[idxCoop(x, upY, cols)] = EMPTY;
            setCoop(b, x, lowY + 1, cols, lowC); setCoop(b, x, upY + 1, cols, upC);
            moved[idxCoop(x, lowY + 1, cols)] = 1; moved[idxCoop(x, upY + 1, cols)] = 1;
            any = true;
          }
        }
      }
    }
  }
  return any;
}

// ---------------------------------------------------------
// YÜKSELEN TABAN (sonsuz mod)
// ---------------------------------------------------------

/**
 * Tüm tahtayı bir satır yukarı iter, altta yeni bir virüs satırı açar.
 * - En üst satırda bir şey varsa taşma: oyun biter.
 * - Yeni satır, üç'lü oluşturmayacak biçimde rastgele virüslerle doldurulur (sayı seviyeyle orantılı).
 * - Tahta yükselirken bir kapsülün üstüne çıkarsa, kapsül de yukarı itilir.
 */
function riseBoardCoop(s: CoopGameState) {
  const { cols, rows, board } = s;
  for (let x = 0; x < cols; x++) {
    if (board[x] !== EMPTY) {
      s.phase = Phase.Lost;
      s.events.push('lost', 'rise_overflow');
      return;
    }
  }

  board.copyWithin(0, cols); // her satır bir yukarı
  board.fill(EMPTY, (rows - 1) * cols);

  // yeni satır: rastgele sütunlar, eşleşme üretmeyen renkler
  const want = riseRowViruses(s.cfg.level, cols);
  const order = Array.from({ length: cols }, (_, i) => i);
  for (let i = cols - 1; i > 0; i--) {
    const j = s.riseRng.int(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  let placed = 0;
  for (let k = 0; k < cols && placed < want; k++) {
    const x = order[k];
    const start = s.riseRng.int(s.cfg.colors);
    for (let i = 0; i < s.cfg.colors; i++) {
      const color = (start + i) % s.cfg.colors;
      if (!wouldMakeTripleCoop(board, x, rows - 1, color, cols, rows)) {
        setCoop(board, x, rows - 1, cols, cell(KIND_VIRUS, color));
        placed++;
        break;
      }
    }
  }
  s.virusesLeft += placed;
  s.riseCount++;
  s.riseAnim = RISE_ANIM_FRAMES;
  s.events.push(`rise:${placed}`);

  // yükselen tahtanın içine giren kapsülleri yukarı it
  for (let p = 0; p < s.playerCount; p++) {
    const cap = s.capsules[p];
    if (!cap || fitsBoardCoop(s, cap)) continue;
    let moved = false;
    for (let k = 1; k <= rows; k++) {
      const t = { ...cap, y: cap.y - k };
      if (fitsBoardCoop(s, t)) {
        s.capsules[p] = t;
        s.lockTimers[p] = 0;
        moved = true;
        break;
      }
    }
    if (!moved) {
      s.phase = Phase.Lost;
      s.events.push('lost', 'rise_overflow');
      return;
    }
  }
}

/** Yükselme sayacı: yalnızca Falling fazında işler (eşleşme/yerleşme sürerken durur). */
function tickRiseCoop(s: CoopGameState) {
  if (!s.cfg.risingEnabled || s.phase !== Phase.Falling) return;
  s.riseTimer--;
  if (s.riseTimer === RISE_WARN_FRAMES) s.events.push('rise_warn');
  else if (s.riseTimer === 90 || s.riseTimer === 60 || s.riseTimer === 30) s.events.push('rise_tick');
  if (s.riseTimer <= 0) {
    s.riseTimer = s.riseInterval;
    riseBoardCoop(s);
  }
}

// ---------------------------------------------------------
// OYUNCU GÜNCELLEMESİ (HER karede, faz ne olursa olsun)
// ---------------------------------------------------------

/**
 * Her oyuncunun girdisini, DAS/yumuşak düşüşünü ve kapsülünü günceller.
 *
 * Eskiden bu işlem yalnızca Falling fazında yapılıyordu: biri eşleşme yaparken (Clearing/Settling)
 * diğer oyuncular donuyor ve bu sürede bırakılan tuşlar kayboluyordu; eşleşme bitince son basılan
 * yön "takılı" kalıp kapsülü kendi kendine kaydırıyordu. Artık:
 *  - tuş basma/bırakma durumu her zaman işlenir (takılı tuş olmaz),
 *  - kapsüller eşleşme sırasında da serbestçe hareket eder ve düşer,
 *  - yere kilitlenme yalnızca Falling fazında olur; bekleyen kapsül faz dönünce kilitlenir.
 * @returns bu karede yere kilitlenen oyuncular
 */
function updatePlayersCoop(s: CoopGameState, inputsArr: Input[][], canLock: boolean): number[] {
  const lockers: number[] = [];

  for (let p = 0; p < s.playerCount; p++) {
    if (s.phase === Phase.Lost || s.phase === Phase.Won) break;
    const inputs = inputsArr[p] || [];

    // 1) Basılı tuş durumu: kapsül olmasa da, faz ne olursa olsun
    for (const inp of inputs) {
      switch (inp) {
        case Input.Left: s.dasDirs[p] = -1; s.dasTimers[p] = DAS_DELAY; break;
        case Input.Right: s.dasDirs[p] = 1; s.dasTimers[p] = DAS_DELAY; break;
        case Input.SoftDropOn: s.softDrops[p] = true; break;
        case Input.SoftDropOff: s.softDrops[p] = false; s.dasDirs[p] = 0; break;
      }
    }

    // 2) Kapsülü yoksa doğma sayacı (doğuş yalnızca Falling fazında)
    if (!s.capsules[p]) {
      s.spawningTimers[p] = Math.max(0, s.spawningTimers[p] - 1);
      if (s.spawningTimers[p] <= 0 && s.phase === Phase.Falling) spawnCoop(s, p);
      continue;
    }

    const baseNeed = gravityFrames(s.cfg.speed, s.capsulesDropped[p]);

    // 3) Hareket / dönüş / hızlı bırakma / bomba
    for (const inp of inputs) {
      if (!s.capsules[p]) break;
      let dx = 0, dRot = 0;
      switch (inp) {
        case Input.Left: dx = -1; break;
        case Input.Right: dx = 1; break;
        case Input.RotateCW: dRot = 1; break;
        case Input.RotateCCW: dRot = -1; break;
        case Input.UseBomb:
          if (s.cfg.bombEnabled && s.bombs[p] > 0 && !s.bombActives[p]) {
            s.bombs[p]--;
            s.bombActives[p] = true;
            s.events.push(`bomb_activated:p${p}`);
          }
          break;
        case Input.HardDrop:
          while (true) {
            const cur = s.capsules[p]!;
            const t = { ...cur, y: cur.y + 1 };
            if (fitsCoop(s, t, p)) {
              s.capsules[p] = t;
              s.scores[p] += 1;
            } else break;
          }
          if (canLock) {
            lockCapsuleCoop(s, p);
            lockers.push(p);
          } else {
            s.lockTimers[p] = baseNeed; // eşleşme bitince hemen kilitlenir
          }
          break;
      }

      if (dx !== 0 && s.capsules[p]) {
        const cur = s.capsules[p]!;
        const t = { ...cur, x: cur.x + dx };
        if (fitsCoop(s, t, p)) { s.capsules[p] = t; s.events.push(`move:p${p}`); }
      }

      if (dRot !== 0 && s.capsules[p]) {
        const cur = s.capsules[p]!;
        const nrot = (cur.rot + (dRot > 0 ? 1 : 3)) & 3;
        const candidates = [{ ...cur, rot: nrot }, { ...cur, rot: nrot, x: cur.x - 1 }, { ...cur, rot: nrot, x: cur.x + 1 }, { ...cur, rot: nrot, y: cur.y + 1 }];
        for (const t of candidates) {
          if (fitsCoop(s, t, p)) { s.capsules[p] = t; s.events.push(`rotate:p${p}`); break; }
        }
      }
    }
    if (!s.capsules[p]) continue;

    // 4) DAS (basılı tutma ile yana kayma)
    if (s.dasDirs[p] !== 0) {
      s.dasTimers[p]--;
      if (s.dasTimers[p] <= 0) {
        const cur = s.capsules[p]!;
        const t = { ...cur, x: cur.x + s.dasDirs[p] };
        if (fitsCoop(s, t, p)) s.capsules[p] = t;
        s.dasTimers[p] = DAS_REPEAT;
      }
    }

    // 5) Yerçekimi ve kilitlenme
    s.gravityTimers[p]++;
    const need = s.softDrops[p] ? SOFT_DROP_FRAMES : baseNeed;
    const cur = s.capsules[p]!;
    const below = { ...cur, y: cur.y + 1 };
    const canFall = fitsCoop(s, below, p);

    if (s.gravityTimers[p] >= need) {
      s.gravityTimers[p] = 0;
      if (canFall) {
        s.capsules[p] = below;
        s.lockTimers[p] = 0;
        if (s.softDrops[p]) s.scores[p] += 1;
        continue;
      }
    } else if (canFall) {
      s.lockTimers[p] = 0;
      continue;
    }

    // kapsül yerde: kilit sayacı işler
    s.lockTimers[p]++;
    if (s.lockTimers[p] >= baseNeed) {
      if (canLock) {
        lockCapsuleCoop(s, p);
        lockers.push(p);
      } else {
        s.lockTimers[p] = baseNeed; // faz dönünce kilitlenir; sayaç taşmasın
      }
    }
  }
  return lockers;
}

// ---------------------------------------------------------
// STEP
// ---------------------------------------------------------
export function stepCoop(s: CoopGameState, inputsArr: Input[][]): void {
  s.events.length = 0;
  if (s.phase === Phase.Won || s.phase === Phase.Lost) {
    s.frame++;
    return;
  }
  if (s.riseAnim > 0) s.riseAnim--;

  // Yükselen taban (yalnızca Falling fazında geri sayar)
  tickRiseCoop(s);
  if ((s.phase as Phase) === Phase.Lost) { s.frame++; return; } // yükselme taşmayla oyunu bitirmiş olabilir

  // Oyuncular HER karede güncellenir; yere kilitlenme yalnızca Falling fazında
  const lockingPlayers = updatePlayersCoop(s, inputsArr, s.phase === Phase.Falling);
  const endless = !!s.cfg.risingEnabled; // sonsuz modda virüsler biterse oyun bitmez

  if (s.phase === Phase.Falling) {
    if (lockingPlayers.length > 0) {
      const m = findMatchesCoop(s.board, s);
      if (m.cleared.length > 0) {
        s.chain++;
        if (s.chain > s.maxChain) s.maxChain = s.chain;
        if (m.bombsEarned > 0) {
          // Give bomb to random locking player
          const rp = lockingPlayers[s.rng.int(lockingPlayers.length)];
          s.bombs[rp] = Math.min(3, s.bombs[rp] + m.bombsEarned);
        }
        s.clearing = m.cleared;
        s.virusesLeft -= m.virusesCleared;
        s.totalVirusesCleared += m.virusesCleared;

        // Give score to the primary locking player
        const mainP = lockingPlayers[0];
        s.scores[mainP] += m.cleared.length * 10 * s.chain + m.virusesCleared * 100 + m.stonesCleared * 50;

        s.phase = Phase.Clearing;
        s.phaseTimer = CLEAR_ANIM_FRAMES;
        s.events.push(s.chain > 1 ? 'chain' : 'clear');
        if (m.virusesCleared > 0) s.events.push('virus');
      } else {
        s.chain = 0;
        if (s.virusesLeft <= 0 && !endless) {
          s.phase = Phase.Won;
          s.events.push('won');
        } else {
          // set spawning delays for those who locked
          for (const p of lockingPlayers) s.spawningTimers[p] = SPAWN_DELAY;
        }
      }
    }
  } else if (s.phase === Phase.Clearing) {
    s.phaseTimer--;
    if (s.phaseTimer <= 0) {
      applyClearCoop(s.board, s.clearing, s.cols, s.rows);
      s.clearing = [];
      s.phase = Phase.Settling;
      s.phaseTimer = FALL_STEP_FRAMES;
    }
  } else if (s.phase === Phase.Settling) {
    s.phaseTimer--;
    if (s.phaseTimer <= 0) {
      // düşen kapsüllerin bulunduğu hücrelere parça düşmez
      const moved = stepGravityCoop(s.board, s.cols, s.rows, capsuleCellSet(s));
      if (moved) {
        s.phaseTimer = FALL_STEP_FRAMES;
      } else {
        const m = findMatchesCoop(s.board, s);
        if (m.cleared.length > 0) {
          s.chain++;
          if (s.chain > s.maxChain) s.maxChain = s.chain;
          s.clearing = m.cleared;
          s.virusesLeft -= m.virusesCleared;
          s.totalVirusesCleared += m.virusesCleared;
          s.scores[0] += m.cleared.length * 10 * s.chain + m.virusesCleared * 100 + m.stonesCleared * 50; // just give score to p1
          s.phase = Phase.Clearing;
          s.phaseTimer = CLEAR_ANIM_FRAMES;
          s.events.push(s.chain > 1 ? 'chain' : 'clear');
          if (m.virusesCleared > 0) s.events.push('virus');
        } else {
          s.chain = 0;
          if (s.virusesLeft <= 0 && !endless) {
            s.phase = Phase.Won;
            s.events.push('won');
          } else {
            s.phase = Phase.Falling; // Back to normal gameplay
          }
        }
      }
    }
  }

  s.frame++;
}
