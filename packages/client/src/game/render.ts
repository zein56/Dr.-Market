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

  ctx.fillStyle = GRID_BG;
  ctx.fillRect(0, 0, w, h);

  // ızgara
  ctx.strokeStyle = GRID_LINE;
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

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const c = board[i];
      if (c === EMPTY) continue;
      if (clearingSet?.has(i)) {
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
    }
  }

  // kenarlık
  ctx.strokeStyle = '#3B6076';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);

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

function drawCell(ctx: CanvasRenderingContext2D, c: number, px: number, py: number, s: number) {
  const color = colorOf(c);
  const kind = kindOf(c);
  
  if (kind === KIND_STONE) {
    drawStone(ctx, px, py, s);
    return;
  }

  if (kind === KIND_BOMB) {
    drawBomb(ctx, px, py, s);
    return;
  }
  
  if (kind === KIND_VIRUS) {
    drawVirus(ctx, px, py, s, color);
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
  dir: 'n' | 'l' | 'r' | 'u' | 'd'
) {
  const [main, light, dark] = getPaletteColor(color);
  const pad = Math.max(1, Math.round(s * 0.06));
  const x = px + pad;
  const y = py + pad;
  const w = s - pad * 2;
  const h = s - pad * 2;
  const r = Math.round(w * 0.45);

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

  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, radii);
  ctx.fillStyle = main;
  ctx.fill();

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
  const [main, light, dark] = STONE_COLOR;
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
  ctx.fillStyle = GRID_BG;
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

/** Sıradaki kapsülü çiz */
export function drawNext(ctx: CanvasRenderingContext2D, a: number, b: number, s: number) {
  ctx.clearRect(0, 0, s * 2, s);
  drawHalf(ctx, a, 0, 0, s, 'l');
  drawHalf(ctx, b, s, 0, s, 'r');
}
