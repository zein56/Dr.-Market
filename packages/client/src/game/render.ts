import {
  COLS,
  ROWS,
  EMPTY,
  colorOf,
  kindOf,
  KIND_VIRUS,
  KIND_SINGLE,
  KIND_LEFT,
  KIND_RIGHT,
  KIND_UP,
  KIND_DOWN,
  KIND_STONE,
  KIND_BOMB,
  hasLock,
  getLockCount,
  capsuleCells,
  type Board,
  type GameState,
<<<<<<< HEAD
  POWER_JOKER,
  POWER_SHIELD,
  RISE_ANIM_FRAMES,
  RISE_WARN_FRAMES,
} from '@pill/game-core';
import { currentTheme, withAlpha, type Swatch } from './themes';
import { drawVirusCharacter, type Mood } from './characters';
import { drawPowerBadge, drawPowerAura, drawPowerIcon, rainbowSwatch } from './powerviz';

export function getPaletteColor(color: number): Swatch {
  const pal = currentTheme().palette;
  if (color === undefined || color === null || isNaN(color)) return pal[0];
  const safeColor = Math.abs(Math.floor(color)) % pal.length;
  return pal[safeColor] || pal[0];
=======
} from '@pill/game-core';

/** Taş rengi */
const STONE_COLOR: [string, string, string] = ['#777777', '#999999', '#444444'];

/** Kapsül renk paleti: [ana, açık, koyu] */
const PALETTE: Array<[string, string, string]> = [
  ['#E8453C', '#FF8A80', '#8E1F1A'], // 0 kırmızı
  ['#F2C53D', '#FFE9A3', '#8C6A0E'], // 1 sarı
  ['#3FA9F5', '#9FD8FF', '#16537E'], // 2 mavi
  ['#4CAF50', '#81C784', '#1B5E20'], // 3 yeşil
  ['#9C27B0', '#BA68C8', '#4A148C'], // 4 mor
  ['#FF9800', '#FFB74D', '#E65100'], // 5 turuncu
  ['#00BCD4', '#4DD0E1', '#006064'], // 6 turkuaz
  ['#E91E63', '#F06292', '#880E4F'], // 7 pembe
  ['#795548', '#A1887F', '#3E2723'], // 8 kahverengi
  ['#8D6E63', '#BCAAA4', '#4E342E'], // 9 açık kahve / gri
];

const GRID_BG = '#0D1A22';
const GRID_LINE = '#1B2E3A';

export function getPaletteColor(color: number): [string, string, string] {
  if (color === undefined || color === null || isNaN(color)) return PALETTE[0];
  const safeColor = Math.abs(Math.floor(color)) % PALETTE.length;
  return PALETTE[safeColor] || PALETTE[0];
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
}

/** Virüsler hafifçe kıpırdasın diye global animasyon sayacı */
let tick = 0;
export function advanceAnim() {
  tick++;
}

export interface VisualEffect {
  type: 'penalty' | 'explosion' | 'bomb_explosion';
  idx: number;
  timer: number;
}

export interface DrawOpts {
  cellSize: number;
  showGhost?: boolean;
  clearing?: number[];
  clearPulse?: number;
  effects?: VisualEffect[];
  cols?: number; // Dinamik genişlik (coop)
  rows?: number; // Dinamik yükseklik (coop)
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: Board | Uint8Array,
  opts: DrawOpts,
  state?: any
) {
  const s = opts.cellSize;
  const cols = opts.cols ?? (board as any).cols ?? (state?.cols) ?? COLS;
  const rows = opts.rows ?? (board as any).rows ?? (state?.rows) ?? ROWS;
  const w = cols * s;
  const h = rows * s;

<<<<<<< HEAD
  const theme = currentTheme();
  ctx.fillStyle = theme.gridBg;
  ctx.fillRect(0, 0, w, h);

  // ızgara
  ctx.strokeStyle = theme.gridLine;
=======
  ctx.fillStyle = GRID_BG;
  ctx.fillRect(0, 0, w, h);

  // ızgara
  ctx.strokeStyle = GRID_LINE;
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < cols; x++) {
    ctx.moveTo(x * s + 0.5, 0);
    ctx.lineTo(x * s + 0.5, h);
  }
  for (let y = 1; y < rows; y++) {
    ctx.moveTo(0, y * s + 0.5);
    ctx.lineTo(w, y * s + 0.5);
  }
  ctx.stroke();

  const clearingSet = opts.clearing && opts.clearing.length ? new Set(opts.clearing) : null;
  const blink = clearingSet ? Math.floor((opts.clearPulse ?? 0) / 3) % 2 === 0 : false;
<<<<<<< HEAD
  const fc = buildFaceContext(board, cols, rows, s, clearingSet, state);

  const rising = !!state?.cfg?.risingEnabled && typeof state.riseTimer === 'number';
  if (rising) drawRiseMonster(ctx, w, h, s, state, fc.look);
  // tahta bir satır yükseldiğinde hücreler aşağıdan yukarı kayarak yerine oturur (yalnızca görsel)
  const riseShift = rising && state.riseAnim > 0 ? (state.riseAnim / RISE_ANIM_FRAMES) * s : 0;
  ctx.save();
  if (riseShift > 0) ctx.translate(0, riseShift);
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const c = board[i];
      if (c === EMPTY) continue;
      if (clearingSet?.has(i)) {
<<<<<<< HEAD
        if (blink) {
          if (kindOf(c) === KIND_VIRUS) drawCell(ctx, c, x * s, y * s, s, fc, 'dead');
          else drawPop(ctx, x * s, y * s, s, colorOf(c));
        }
        continue;
      }
      drawCell(ctx, c, x * s, y * s, s, fc, fc.scared?.has(i) ? 'scared' : undefined);
    }
  }
  ctx.restore();
  if (rising) drawRiseWarning(ctx, w, h, s, state.riseTimer);

  // düşmekte olan kapsül (tek oyunculu) ve ortak tahta kapsülleri
  if (state?.capsule) drawFallingCapsule(ctx, board, state.capsule, s, cols, !!opts.showGhost);
  if (state?.capsules) {
    for (let p = 0; p < state.playerCount; p++) {
      const cap = state.capsules[p];
      if (cap) drawFallingCapsule(ctx, board, cap, s, cols, !!opts.showGhost);
    }
  }

  // hazır kalkan göstergesi (sağ üst köşe)
  if (state?.shield > 0) {
    const r = s * 0.34;
    drawPowerBadge(ctx, POWER_SHIELD, w - s * 0.6, s * 0.6, r, tick);
    if (state.shield > 1) {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${Math.max(10, s * 0.4)}px system-ui, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 3;
      ctx.fillText(`x${state.shield}`, w - s * 1.05, s * 0.6);
      ctx.restore();
=======
        if (blink) drawPop(ctx, x * s, y * s, s, colorOf(c));
        continue;
      }
      drawCell(ctx, c, x * s, y * s, s);
    }
  }

  // düşmekte olan kapsül (Tek oyunculu için)
  if (state?.capsule) {
    const cap = state.capsule;
    const [x1, y1, x2, y2] = capsuleCells(cap);
    const horizontal = y1 === y2;

    if (cap.isBomb) {
      if (opts.showGhost) {
        const gy = ghostDrop(board, cap, cols);
        ctx.globalAlpha = 0.22;
        drawBomb(ctx, x1 * s, (y1 + gy) * s, s);
        ctx.globalAlpha = 1;
      }
      drawBomb(ctx, x1 * s, y1 * s, s);
    } else {
      if (opts.showGhost) {
        const gy = ghostDrop(board, cap, cols);
        ctx.globalAlpha = 0.18;
        drawHalf(ctx, cap.a, x1 * s, (y1 + gy) * s, s, horizontal ? (x1 < x2 ? 'l' : 'r') : (y1 < y2 ? 'u' : 'd'));
        drawHalf(ctx, cap.b, x2 * s, (y2 + gy) * s, s, horizontal ? (x1 < x2 ? 'r' : 'l') : (y1 < y2 ? 'd' : 'u'));
        ctx.globalAlpha = 1;
      }
      drawHalf(ctx, cap.a, x1 * s, y1 * s, s, horizontal ? (x1 < x2 ? 'l' : 'r') : (y1 < y2 ? 'u' : 'd'));
      drawHalf(ctx, cap.b, x2 * s, y2 * s, s, horizontal ? (x1 < x2 ? 'r' : 'l') : (y1 < y2 ? 'd' : 'u'));
    }
  }

  // Co-op kapsülleri
  if (state?.capsules) {
    for (let p = 0; p < state.playerCount; p++) {
      const cap = state.capsules[p];
      if (!cap) continue;
      const [x1, y1, x2, y2] = capsuleCells(cap);
      const horizontal = y1 === y2;

      if (cap.isBomb) {
        if (opts.showGhost) {
          const gy = ghostDrop(board, cap, cols);
          ctx.globalAlpha = 0.22;
          drawBomb(ctx, x1 * s, (y1 + gy) * s, s);
          ctx.globalAlpha = 1;
        }
        drawBomb(ctx, x1 * s, y1 * s, s);
      } else {
        if (opts.showGhost) {
          const gy = ghostDrop(board, cap, cols);
          ctx.globalAlpha = 0.18;
          drawHalf(ctx, cap.a, x1 * s, (y1 + gy) * s, s, horizontal ? (x1 < x2 ? 'l' : 'r') : (y1 < y2 ? 'u' : 'd'));
          drawHalf(ctx, cap.b, x2 * s, (y2 + gy) * s, s, horizontal ? (x1 < x2 ? 'r' : 'l') : (y1 < y2 ? 'd' : 'u'));
          ctx.globalAlpha = 1;
        }
        drawHalf(ctx, cap.a, x1 * s, y1 * s, s, horizontal ? (x1 < x2 ? 'l' : 'r') : (y1 < y2 ? 'u' : 'd'));
        drawHalf(ctx, cap.b, x2 * s, y2 * s, s, horizontal ? (x1 < x2 ? 'r' : 'l') : (y1 < y2 ? 'd' : 'u'));
      }
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
    }
  }

  // kenarlık
<<<<<<< HEAD
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 2;
  if (theme.style === 'neon') {
    ctx.save();
    ctx.shadowColor = theme.border;
    ctx.shadowBlur = 10;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.restore();
  } else {
    ctx.strokeRect(1, 1, w - 2, h - 2);
  }
=======
  ctx.strokeStyle = '#3B6076';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

  // efektleri çiz (en üstte görünsün)
  if (opts.effects) {
    for (const fx of opts.effects) {
      const cx = (fx.idx % cols) * s;
      const cy = Math.floor(fx.idx / cols) * s;
      
      if (fx.type === 'penalty') {
        const progress = fx.timer / 30; // 1.0 to 0.0 (timer starts at 30)
        const scale = 1 + progress * 2; // scales from 3x down to 1x
        ctx.save();
        ctx.translate(cx + s/2, cy + s/2);
        ctx.scale(scale, scale);
        ctx.globalAlpha = 1 - progress;
        drawVirus(ctx, -s/2, -s/2, s, 0); // Kırmızı virüs efekti
        ctx.restore();
      } else if (fx.type === 'explosion') {
        const progress = 1 - (fx.timer / 30);
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - progress})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx + s/2, cy + s/2, (progress * s * 2.5), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 200, 50, ${(1 - progress) * 0.5})`;
        ctx.beginPath();
        ctx.arc(cx + s/2, cy + s/2, (progress * s * 2.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (fx.type === 'bomb_explosion') {
        const progress = 1 - (fx.timer / 45); // 45 frame
        const alpha = Math.max(0, 1 - progress * 1.1);
        ctx.save();
        // Dış halka - turuncu
        ctx.strokeStyle = `rgba(255, 120, 0, ${alpha})`;
        ctx.lineWidth = Math.max(2, s * 0.12);
        ctx.beginPath();
        ctx.arc(cx + s/2, cy + s/2, progress * s * 4, 0, Math.PI * 2);
        ctx.stroke();
        // İç halka - sarı
        ctx.strokeStyle = `rgba(255, 230, 0, ${alpha * 0.8})`;
        ctx.lineWidth = Math.max(1, s * 0.07);
        ctx.beginPath();
        ctx.arc(cx + s/2, cy + s/2, progress * s * 2.5, 0, Math.PI * 2);
        ctx.stroke();
        // Merkez parıltı
        if (progress < 0.4) {
          const flashAlpha = (1 - progress / 0.4);
          ctx.fillStyle = `rgba(255, 255, 200, ${flashAlpha * 0.8})`;
          ctx.beginPath();
          ctx.arc(cx + s/2, cy + s/2, s * 1.2 * (1 - progress/0.4), 0, Math.PI * 2);
          ctx.fill();
        }
        // Kıvılcım çizgileri
        const sparkCount = 8;
        for (let si = 0; si < sparkCount; si++) {
          const angle = (si / sparkCount) * Math.PI * 2;
          const dist = progress * s * 3.5;
          ctx.strokeStyle = `rgba(255, ${180 + Math.random() * 75 | 0}, 0, ${alpha * 0.9})`;
          ctx.lineWidth = Math.max(1, s * 0.05);
          ctx.beginPath();
          ctx.moveTo(cx + s/2 + Math.cos(angle) * dist * 0.4, cy + s/2 + Math.sin(angle) * dist * 0.4);
          ctx.lineTo(cx + s/2 + Math.cos(angle) * dist, cy + s/2 + Math.sin(angle) * dist);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
}

<<<<<<< HEAD
/**
 * Yükselen taban (sonsuz mod): tahtanın dibinde, hücrelerin ARKASINDA duran dev canavar.
 * Normalde sönük ve sakindir; yükselmeye 2 saniye kala belirginleşip kahkaha atar,
 * tahta yükselirken kükrer. Gözleri düşen kapsülü takip eder.
 */
function drawRiseMonster(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: number,
  state: any,
  look: { x: number; y: number } | null
) {
  const timer: number = state.riseTimer;
  const warn = timer <= RISE_WARN_FRAMES ? 1 - timer / RISE_WARN_FRAMES : 0;
  const roar = state.riseAnim > 0 ? state.riseAnim / RISE_ANIM_FRAMES : 0;
  const size = Math.min(w * 0.42, h * 0.5) * (1 + 0.12 * roar + 0.04 * Math.sin(tick * 0.06));
  const color = Math.abs(state.riseCount || 0) % 10;
  const px = (w - size) / 2;
  const py = h - size * 0.72; // başı tahtadan yukarı çıkar, gövdesi dipte kalır

  ctx.save();
  ctx.globalAlpha = Math.min(0.5, 0.15 + warn * 0.25 + roar * 0.2);
  drawVirusCharacter(ctx, px, py, size, color, getPaletteColor(color), {
    mood: warn > 0 || roar > 0 ? 'cackle' : 'calm',
    look: look ? { dx: look.x - (px + size / 2), dy: look.y - (py + size / 2) } : null,
    tick,
    style: currentTheme().style,
  });
  ctx.restore();
}

/** Yükselmeye kala alt kenarda nabız gibi atan kırmızı uyarı. */
function drawRiseWarning(ctx: CanvasRenderingContext2D, w: number, h: number, s: number, timer: number) {
  if (timer > RISE_WARN_FRAMES) return;
  const k = 1 - timer / RISE_WARN_FRAMES; // 0 → 1
  const pulse = 0.5 + 0.5 * Math.sin(tick * (0.25 + k * 0.4));
  const g = ctx.createLinearGradient(0, h - s * 1.4, 0, h);
  g.addColorStop(0, 'rgba(255, 70, 50, 0)');
  g.addColorStop(1, `rgba(255, 70, 50, ${(0.18 + 0.4 * pulse) * (0.4 + 0.6 * k)})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, h - s * 1.4, w, s * 1.4);
  ctx.restore();
}

/** Tek kare için tüm virüslerin ortak yüz bilgisi */
interface FaceCtx {
  mood: Mood;
  /** bakılan nokta (px), yoksa null */
  look: { x: number; y: number } | null;
  /** yanında temizlik olan, korkan hücreler */
  scared: Set<number> | null;
}

function buildFaceContext(
  board: Board | Uint8Array,
  cols: number,
  rows: number,
  s: number,
  clearingSet: Set<number> | null,
  state?: any
): FaceCtx {
  // ruh hali: oyuncu tehlikedeyse virüsler kahkaha atar; kazanmaya yakınsa endişelenir
  let mood: Mood = 'calm';
  let virusesLeft = state?.virusesLeft;
  let dangerTop = false;
  let counted = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = board[y * cols + x];
      if (c === EMPTY) continue;
      if (kindOf(c) === KIND_VIRUS) {
        counted++;
      } else if (y <= 3) {
        dangerTop = true; // virüs olmayan (kapsül/çöp) parçalar en üst 4 satıra çıktı
      }
    }
  }
  if (virusesLeft === undefined) virusesLeft = counted;
  if (dangerTop) mood = 'cackle';
  else if (virusesLeft > 0 && virusesLeft <= 3) mood = 'worried';

  // gözler düşen kapsülü takip eder
  let look: FaceCtx['look'] = null;
  const cap = state?.capsule ?? (state?.capsules ? state.capsules.find((c: any) => c) : null);
  if (cap) {
    const [x1, y1, x2, y2] = capsuleCells(cap);
    look = { x: ((x1 + x2) / 2 + 0.5) * s, y: ((y1 + y2) / 2 + 0.5) * s };
  }

  // temizlenen hücrelerin 2 hücre çevresindeki virüsler korkar
  let scared: Set<number> | null = null;
  if (clearingSet) {
    scared = new Set();
    for (const i of clearingSet) {
      const cx = i % cols;
      const cy = Math.floor(i / cols);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          const ni = ny * cols + nx;
          if (!clearingSet.has(ni)) scared.add(ni);
        }
      }
    }
  }
  return { mood, look, scared };
}

/** Düşen kapsülü (güçlüyse aura, joker gökkuşağı ve ikon rozetiyle) çizer. */
function drawFallingCapsule(
  ctx: CanvasRenderingContext2D,
  board: Board | Uint8Array,
  cap: any,
  s: number,
  cols: number,
  showGhost: boolean
) {
  const [x1, y1, x2, y2] = capsuleCells(cap);

  if (cap.isBomb) {
    if (showGhost) {
      const gy = ghostDrop(board, cap, cols);
      ctx.globalAlpha = 0.22;
      drawBomb(ctx, x1 * s, (y1 + gy) * s, s);
      ctx.globalAlpha = 1;
    }
    drawBomb(ctx, x1 * s, y1 * s, s);
    return;
  }

  const horizontal = y1 === y2;
  const dirA = horizontal ? (x1 < x2 ? 'l' : 'r') : y1 < y2 ? 'u' : 'd';
  const dirB = horizontal ? (x1 < x2 ? 'r' : 'l') : y1 < y2 ? 'd' : 'u';
  const joker = cap.power === POWER_JOKER;
  const swA = joker ? rainbowSwatch(tick, 0) : undefined;
  const swB = joker ? rainbowSwatch(tick, 80) : undefined;

  if (showGhost) {
    const gy = ghostDrop(board, cap, cols);
    ctx.globalAlpha = 0.18;
    drawHalf(ctx, cap.a, x1 * s, (y1 + gy) * s, s, dirA, swA);
    drawHalf(ctx, cap.b, x2 * s, (y2 + gy) * s, s, dirB, swB);
    ctx.globalAlpha = 1;
  }

  if (cap.power) {
    drawPowerAura(ctx, cap.power, (x1 + 0.5) * s, (y1 + 0.5) * s, s, tick);
    drawPowerAura(ctx, cap.power, (x2 + 0.5) * s, (y2 + 0.5) * s, s, tick);
  }
  drawHalf(ctx, cap.a, x1 * s, y1 * s, s, dirA, swA);
  drawHalf(ctx, cap.b, x2 * s, y2 * s, s, dirB, swB);
  if (cap.power) {
    drawPowerBadge(ctx, cap.power, ((x1 + x2) / 2 + 0.5) * s, ((y1 + y2) / 2 + 0.5) * s, s * 0.3, tick);
  }
}

=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
function ghostDrop(board: any, cap: any, cols: number = board.cols || COLS): number {
  let d = 0;
  for (let k = 1; k < board.rows; k++) {
    const t = { ...cap, y: cap.y + k };
    const [x1, y1, x2, y2] = capsuleCells(t);
    if (
      y1 >= board.rows ||
      y2 >= board.rows ||
      y1 < 0 ||
      y2 < 0 ||
      board[y1 * cols + x1] !== EMPTY ||
      board[y2 * cols + x2] !== EMPTY
    )
      break;
    d = k;
  }
  return d;
}

function drawBomb(ctx: CanvasRenderingContext2D, px: number, py: number, s: number) {
  const cx = px + s / 2;
  const cy = py + s / 2;
  const r = s * 0.38;
  // Bomba gövdesi
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.05, r, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3 + s * 0.05, r * 0.05, cx, cy + s * 0.05, r);
  grad.addColorStop(0, '#555');
  grad.addColorStop(1, '#111');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.stroke();
  // Fit il (sapı)
  ctx.save();
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = Math.max(1.5, s * 0.07);
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.6, cy - r * 0.6 + s * 0.05);
  ctx.quadraticCurveTo(cx + r * 0.9, cy - r * 1.1 + s * 0.05, cx + r * 0.4, cy - r * 1.3 + s * 0.05);
  ctx.stroke();
  // Kıvılcım
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.4, cy - r * 1.3 + s * 0.05);
  ctx.lineTo(cx + r * 0.7, cy - r * 1.6 + s * 0.05);
  ctx.stroke();
  ctx.restore();
  // Parlama
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.3 + s * 0.05, r * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
}

<<<<<<< HEAD
function drawCell(
  ctx: CanvasRenderingContext2D,
  c: number,
  px: number,
  py: number,
  s: number,
  fc?: FaceCtx,
  moodOverride?: Mood
) {
  const color = colorOf(c);
  const kind = kindOf(c);

=======
function drawCell(ctx: CanvasRenderingContext2D, c: number, px: number, py: number, s: number) {
  const color = colorOf(c);
  const kind = kindOf(c);
  
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  if (kind === KIND_STONE) {
    drawStone(ctx, px, py, s);
    return;
  }

  if (kind === KIND_BOMB) {
    drawBomb(ctx, px, py, s);
    return;
  }
<<<<<<< HEAD

  if (kind === KIND_VIRUS) {
    const look = fc?.look ? { dx: fc.look.x - (px + s / 2), dy: fc.look.y - (py + s / 2) } : null;
    drawVirusCharacter(ctx, px, py, s, color, getPaletteColor(color), {
      mood: moodOverride ?? fc?.mood ?? 'calm',
      look,
      tick,
      style: currentTheme().style,
    });
=======
  
  if (kind === KIND_VIRUS) {
    drawVirus(ctx, px, py, s, color);
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
    if (hasLock(c)) drawLock(ctx, px, py, s, getLockCount(c));
    return;
  }
  const dirMap: Record<number, 'n' | 'l' | 'r' | 'u' | 'd'> = {
    [KIND_SINGLE]: 'n',
    [KIND_LEFT]: 'l',
    [KIND_RIGHT]: 'r',
    [KIND_UP]: 'u',
    [KIND_DOWN]: 'd',
  };
  drawHalf(ctx, color, px, py, s, dirMap[kind]);
}

/**
 * Kapsül yarımı. dir:
 *  'n' tekil (her yanı yuvarlak), 'l' eşi sağda, 'r' eşi solda,
 *  'u' eşi altta, 'd' eşi üstte
 */
function drawHalf(
  ctx: CanvasRenderingContext2D,
  color: number,
  px: number,
  py: number,
  s: number,
<<<<<<< HEAD
  dir: 'n' | 'l' | 'r' | 'u' | 'd',
  swatch?: Swatch
) {
  const [main, light, dark] = swatch ?? getPaletteColor(color);
  const style = currentTheme().style;
=======
  dir: 'n' | 'l' | 'r' | 'u' | 'd'
) {
  const [main, light, dark] = getPaletteColor(color);
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  const pad = Math.max(1, Math.round(s * 0.06));
  const x = px + pad;
  const y = py + pad;
  const w = s - pad * 2;
  const h = s - pad * 2;
<<<<<<< HEAD
  const r = style === 'pixel' ? 0 : Math.round(w * 0.45);
=======
  const r = Math.round(w * 0.45);
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

  const radii = {
    tl: r,
    tr: r,
    br: r,
    bl: r,
  };
  if (dir === 'l') {
    radii.tr = 0;
    radii.br = 0;
  } else if (dir === 'r') {
    radii.tl = 0;
    radii.bl = 0;
  } else if (dir === 'u') {
    radii.bl = 0;
    radii.br = 0;
  } else if (dir === 'd') {
    radii.tl = 0;
    radii.tr = 0;
  }

<<<<<<< HEAD
  if (style === 'neon') {
    // koyu dolgu + parlayan çizgi
    ctx.beginPath();
    roundRectPath(ctx, x, y, w, h, radii);
    ctx.fillStyle = withAlpha(swatch ? '#FFFFFF' : main, 0.28);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = main;
    ctx.shadowBlur = s * 0.3;
    ctx.lineWidth = Math.max(1.5, s * 0.07);
    ctx.strokeStyle = main;
    ctx.beginPath();
    roundRectPath(ctx, x, y, w, h, radii);
    ctx.stroke();
    ctx.restore();
    return;
  }

=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, radii);
  ctx.fillStyle = main;
  ctx.fill();

<<<<<<< HEAD
  if (style === 'glossy') {
    // gölge + parlama
    ctx.save();
    ctx.clip();
    ctx.fillStyle = dark;
    ctx.fillRect(x, y + h * 0.68, w, h * 0.32);
    ctx.fillStyle = light;
    ctx.fillRect(x + w * 0.16, y + h * 0.14, w * 0.2, h * 0.34);
    ctx.restore();
  } else if (style === 'pixel') {
    // iki parça piksel ışığı + alt gölge şeridi
    ctx.fillStyle = light;
    ctx.fillRect(x + w * 0.14, y + h * 0.14, w * 0.22, w * 0.12);
    ctx.fillRect(x + w * 0.14, y + h * 0.14, w * 0.12, h * 0.26);
    ctx.fillStyle = dark;
    ctx.fillRect(x, y + h * 0.8, w, h * 0.2);
  }

  ctx.lineWidth = Math.max(1, s * (style === 'pixel' ? 0.09 : 0.05));
=======
  // gölge
  ctx.save();
  ctx.clip();
  ctx.fillStyle = dark;
  ctx.fillRect(x, y + h * 0.68, w, h * 0.32);
  // parlama
  ctx.fillStyle = light;
  ctx.fillRect(x + w * 0.16, y + h * 0.14, w * 0.2, h * 0.34);
  ctx.restore();

  ctx.lineWidth = Math.max(1, s * 0.05);
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  ctx.strokeStyle = dark;
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, radii);
  ctx.stroke();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: { tl: number; tr: number; br: number; bl: number }
) {
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  if (r.tr) ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  if (r.br) ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  if (r.bl) ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  if (r.tl) ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

<<<<<<< HEAD
/** Tek bir virüs (efektlerde kullanılır): karakter çizimine yönlendirir. */
function drawVirus(ctx: CanvasRenderingContext2D, px: number, py: number, s: number, color: number) {
  drawVirusCharacter(ctx, px, py, s, color, getPaletteColor(color), {
    mood: 'calm',
    look: null,
    tick,
    style: currentTheme().style,
  });
=======
/** Virüs: yuvarlak gövde, dört çıkıntı, iki göz — hafif nefes animasyonu */
function drawVirus(ctx: CanvasRenderingContext2D, px: number, py: number, s: number, color: number) {
  const [main, light, dark] = getPaletteColor(color);
  const wobble = Math.sin(tick * 0.08 + px * 0.3 + py * 0.2) * s * 0.03;
  const cx = px + s / 2;
  const cy = py + s / 2 + wobble;
  const rad = s * 0.34;

  // çıkıntılar
  ctx.fillStyle = dark;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + tick * 0.02;
    const bx = cx + Math.cos(a) * rad * 1.05;
    const by = cy + Math.sin(a) * rad * 1.05;
    ctx.beginPath();
    ctx.arc(bx, by, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // gövde
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fillStyle = main;
  ctx.fill();
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.strokeStyle = dark;
  ctx.stroke();

  // parlama
  ctx.beginPath();
  ctx.arc(cx - rad * 0.35, cy - rad * 0.4, rad * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = light;
  ctx.globalAlpha = 0.6;
  ctx.fill();
  ctx.globalAlpha = 1;

  // gözler
  const eyeR = Math.max(1, s * 0.07);
  const blink = Math.sin(tick * 0.04 + color) > 0.97;
  ctx.fillStyle = '#0B1116';
  if (blink) {
    ctx.fillRect(cx - rad * 0.5, cy - eyeR * 0.3, rad * 0.35, eyeR * 0.6);
    ctx.fillRect(cx + rad * 0.15, cy - eyeR * 0.3, rad * 0.35, eyeR * 0.6);
  } else {
    ctx.beginPath();
    ctx.arc(cx - rad * 0.32, cy - rad * 0.05, eyeR, 0, Math.PI * 2);
    ctx.arc(cx + rad * 0.32, cy - rad * 0.05, eyeR, 0, Math.PI * 2);
    ctx.fill();
  }

  // ağız
  ctx.strokeStyle = '#0B1116';
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.beginPath();
  ctx.arc(cx, cy + rad * 0.28, rad * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
}

function drawPop(ctx: CanvasRenderingContext2D, px: number, py: number, s: number, color: number) {
  const [main, light] = getPaletteColor(color);
  ctx.fillStyle = light;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(px + s / 2, py + s / 2, s * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = main;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawStone(ctx: CanvasRenderingContext2D, px: number, py: number, s: number) {
<<<<<<< HEAD
  const [main, light, dark] = currentTheme().stone;
=======
  const [main, light, dark] = STONE_COLOR;
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  const pad = Math.max(1, Math.round(s * 0.06));
  const x = px + pad;
  const y = py + pad;
  const w = s - pad * 2;
  const h = s - pad * 2;
  const r = Math.round(w * 0.15); // Taşın köşeleri hafif yuvarlak

  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, { tl: r, tr: r, br: r, bl: r });
  ctx.fillStyle = main;
  ctx.fill();

  // Taş dokusu: kırışıklıklar veya pürüzler
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.2, y + h * 0.3);
  ctx.lineTo(x + w * 0.4, y + h * 0.2);
  ctx.moveTo(x + w * 0.6, y + h * 0.8);
  ctx.lineTo(x + w * 0.8, y + h * 0.6);
  ctx.stroke();

  // gölge ve parlama
  ctx.fillStyle = dark;
  ctx.fillRect(x, y + h * 0.7, w, h * 0.3);
  ctx.fillStyle = light;
  ctx.fillRect(x + w * 0.1, y + h * 0.1, w * 0.3, h * 0.2);
}

function drawLock(ctx: CanvasRenderingContext2D, px: number, py: number, s: number, count: number) {
  const cx = px + s / 2;
  const cy = py + s / 2;
  const w = s * 0.6;
  const h = s * 0.4;
  
  ctx.save();
  // Zincir gövdesi
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = s * 0.15;
  ctx.beginPath();
  ctx.arc(cx - w * 0.2, cy, h * 0.5, Math.PI * 0.5, Math.PI * 1.5);
  ctx.lineTo(cx + w * 0.2, cy - h * 0.5);
  ctx.arc(cx + w * 0.2, cy, h * 0.5, Math.PI * 1.5, Math.PI * 0.5);
  ctx.closePath();
  ctx.stroke();
  
  // İç gölge/detay
  ctx.strokeStyle = '#444444';
  ctx.lineWidth = s * 0.05;
  ctx.stroke();

  if (count > 1) {
    // Sayı yazısı (kaç kilit var)
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(s * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.fillText(count.toString(), cx, cy);
  }
  ctx.restore();
}

/** Rakip tahtalarının küçük önizlemesi */
export function drawMini(ctx: CanvasRenderingContext2D, board: Board, size: number) {
  const cols = (board as any).cols ?? COLS;
  const rows = (board as any).rows ?? ROWS;
  const s = size;
<<<<<<< HEAD
  ctx.fillStyle = currentTheme().gridBg;
=======
  ctx.fillStyle = GRID_BG;
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  ctx.fillRect(0, 0, cols * s, rows * s);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = board[y * cols + x];
      if (c === EMPTY) continue;
      const color = colorOf(c);
      const palette = getPaletteColor(color);
      ctx.fillStyle = palette[0];
      if (kindOf(c) === KIND_VIRUS) {
        ctx.fillRect(x * s, y * s, s, s);
        ctx.fillStyle = '#0B1116';
        ctx.fillRect(x * s + s * 0.25, y * s + s * 0.35, s * 0.2, s * 0.2);
        ctx.fillRect(x * s + s * 0.6, y * s + s * 0.35, s * 0.2, s * 0.2);
      } else {
        ctx.fillRect(x * s + 0.5, y * s + 0.5, s - 1, s - 1);
      }
    }
  }
}

<<<<<<< HEAD
/** Sıradaki kapsülü çiz (güçlüyse joker gökkuşağı + ikon rozeti) */
export function drawNext(ctx: CanvasRenderingContext2D, a: number, b: number, s: number, power = 0) {
  ctx.clearRect(0, 0, s * 2, s);
  const joker = power === POWER_JOKER;
  if (power) {
    drawPowerAura(ctx, power, s * 0.5, s * 0.5, s, tick);
    drawPowerAura(ctx, power, s * 1.5, s * 0.5, s, tick);
  }
  drawHalf(ctx, a, 0, 0, s, 'l', joker ? rainbowSwatch(tick, 0) : undefined);
  drawHalf(ctx, b, s, 0, s, 'r', joker ? rainbowSwatch(tick, 80) : undefined);
  if (power) drawPowerBadge(ctx, power, s, s * 0.5, s * 0.3, tick);
}

/**
 * Bekleyen (henüz tahtaya inmemiş) gelen çöpü tahtanın sol kenarında kırmızı bir
 * çubuk olarak gösterir. Çubuk yükseldikçe tehlike artar; combo yaparak (karşı saldırı)
 * bu çubuğu küçültebilirsin.
 */
export function drawIncomingMeter(
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  rows: number,
  count: number
) {
  if (count <= 0) return;
  const h = Math.min(count, rows) * cellSize * 0.6;
  const w = Math.max(4, cellSize * 0.22);
  const y = rows * cellSize - h;
  ctx.save();
  ctx.globalAlpha = 0.6 + 0.3 * Math.sin(performance.now() / 140);
  ctx.fillStyle = '#E8453C';
  ctx.fillRect(0, y, w, h);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.font = `800 ${Math.max(10, cellSize * 0.45)}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 3;
  ctx.fillText(String(count), w + 2, y + cellSize * 0.5);
  ctx.restore();
=======
/** Sıradaki kapsülü çiz */
export function drawNext(ctx: CanvasRenderingContext2D, a: number, b: number, s: number) {
  ctx.clearRect(0, 0, s * 2, s);
  drawHalf(ctx, a, 0, 0, s, 'l');
  drawHalf(ctx, b, s, 0, s, 'r');
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
}
