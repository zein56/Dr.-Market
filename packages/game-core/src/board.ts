import {
  COLS,
  ROWS,
  EMPTY,
  MATCH_LEN,
  cell,
  colorOf,
  kindOf,
  isVirus,
  isCapsule,
  isStone,
  isBomb,
  partnerDelta,
  toSingle,
  KIND_VIRUS,
  KIND_SINGLE,
  KIND_STONE,
  MAX_COLORS,
  virusCount,
  virusTopRow,
  hasLock,
  removeLock,
} from './constants';
import { Rng } from './rng';

export interface Board extends Uint8Array { cols: number; rows: number; }

export function createBoard(boardCols?: number, boardRows?: number): Board {
  const c = Math.max(4, boardCols ?? COLS);
  const r = Math.max(8, boardRows ?? ROWS);
  const board = new Uint8Array(r * c) as Board;
  board.cols = c;
  board.rows = r;
  return board;
}

export function idx(b: Board, x: number, y: number): number {
  return y * b.cols + x;
}

export function get(b: Board, x: number, y: number): number {
  if (x < 0 || x >= b.cols || y < 0 || y >= b.rows) return -1; // duvar
  return b[idx(b, x, y)];
}

export function set(b: Board, x: number, y: number, v: number) {
  b[idx(b, x, y)] = v;
}

export function countViruses(b: Board): number {
  let n = 0;
  for (let i = 0; i < b.length; i++) if (isVirus(b[i])) n++;
  return n;
}

/**
 * Virüs yerleştirme. Klasik kurala yakın:
 * aynı renkten 3'ü aynı satır/sütunda ardışık olmayacak şekilde yerleştirilir.
 */
export function placeViruses(b: Board, level: number, rng: Rng, colors: number) {
  const rawTop = virusTopRow(level);
  const topRatio = rawTop / 16;
  const top = Math.max(1, Math.min(b.rows - 2, Math.floor(b.rows * topRatio)));
  const availableSlots = (b.rows - top) * b.cols;
  const maxViruses = Math.floor(availableSlots * 0.7);
  const total = Math.min(virusCount(level), maxViruses);
  let placed = 0;
  let guard = 0;

  while (placed < total && guard < 20000) {
    guard++;
    const y = top + rng.int(b.rows - top);
    const x = rng.int(b.cols);
    if (get(b, x, y) !== EMPTY) continue;

    // renk sırayla denenir, uygun olan ilkini koy
    const start = rng.int(colors);
    let ok = false;
    for (let i = 0; i < colors; i++) {
      const color = (start + i) % colors;
      if (!wouldMakeTriple(b, x, y, color)) {
        set(b, x, y, cell(KIND_VIRUS, color));
        ok = true;
        break;
      }
    }
    if (ok) placed++;
  }
}

function wouldMakeTriple(b: Board, x: number, y: number, color: number): boolean {
  // Yatay ve dikeyde: bu hücreyi koyunca aynı renkten 3 veya daha fazla
  // yan yana oluşuyor mu diye kontrol et.
  // Her yön için: bir taraftan ve diğer taraftan devamını say, toplam >= 3 ise yasakla.
  const axes: [number, number][] = [[1, 0], [0, 1]];
  for (const [dx, dy] of axes) {
    let run = 1;
    // Pozitif yön
    for (let s = 1; s <= 3; s++) {
      const c = get(b, x + dx * s, y + dy * s);
      if (c > 0 && colorOf(c) === color) run++;
      else break;
    }
    // Negatif yön
    for (let s = 1; s <= 3; s++) {
      const c = get(b, x - dx * s, y - dy * s);
      if (c > 0 && colorOf(c) === color) run++;
      else break;
    }
    if (run >= 3) return true;
  }
  return false;
}

/** findMatches'a geçilen ayar nesnesi */
export interface MatchOptions {
  diagMatches?: boolean;
  aoeEnabled?: boolean;
  aoeThreshold?: number;      // 5..8 — bu uzunluk ve üstü merkez etrafında AoE patlama yapar (taşları kırar)
  bombEnabled?: boolean;
  bombThreshold?: number;
}

export interface ClearResult {
  cleared: number[]; // temizlenecek hücre indeksleri
  stonesCleared: number; // yok edilen taş sayısı (stoneBreak ile)
  virusesCleared: number;
  groups: number; // eşzamanlı kaç ayrı dizi patladı (saldırı hesabı için)
  colors: number[]; // patlayan dizilerin renkleri
  explosions: number[];
  bombExplosions: number[]; // bomba patlamaları (ayrı efekt için)
  matchesLengths: { len: number; color: number; center: number }[];
  bombsEarned: number;
}

export function findMatches(b: Board, opts: MatchOptions = {}): ClearResult {
  const {
    diagMatches = false,
    aoeEnabled = false,
    aoeThreshold = 5,
    bombEnabled = false,
    bombThreshold = 5,
  } = opts;

  const marked = new Set<number>();
  let groups = 0;
  const colors: number[] = [];
  // her zaman topla — saldırı hesabı için de lazım
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

  // yatay
  for (let y = 0; y < b.rows; y++) {
    let run = 0;
    let color = -1;
    let cells: number[] = [];
    for (let x = 0; x < b.cols; x++) {
      const c = b[idx(b, x, y)];
      if (c !== EMPTY && !isStone(c)) {
        if (colorOf(c) === color) {
          run++;
          cells.push(idx(b, x, y));
        } else {
          checkRun(run, color, cells);
          color = colorOf(c);
          run = 1;
          cells = [idx(b, x, y)];
        }
      } else {
        checkRun(run, color, cells);
        color = -1;
        run = 0;
        cells = [];
      }
    }
    checkRun(run, color, cells);
  }

  // dikey
  for (let x = 0; x < b.cols; x++) {
    let run = 0;
    let color = -1;
    let cells: number[] = [];
    for (let y = 0; y < b.rows; y++) {
      const c = b[idx(b, x, y)];
      if (c !== EMPTY && !isStone(c)) {
        if (colorOf(c) === color) {
          run++;
          cells.push(idx(b, x, y));
        } else {
          checkRun(run, color, cells);
          color = colorOf(c);
          run = 1;
          cells = [idx(b, x, y)];
        }
      } else {
        checkRun(run, color, cells);
        color = -1;
        run = 0;
        cells = [];
      }
    }
    checkRun(run, color, cells);
  }

  // Çapraz (Diagonal) - Sadece diagMatches açıksa
  if (diagMatches) {
    const diagonals = [
      { dx: 1, dy: 1 },
      { dx: 1, dy: -1 }
    ];
    for (const { dx, dy } of diagonals) {
      for (let startY = 0; startY < b.rows; startY++) {
        for (let startX = 0; startX < b.cols; startX++) {
          const prevX = startX - dx;
          const prevY = startY - dy;
          if (prevX >= 0 && prevX < b.cols && prevY >= 0 && prevY < b.rows) continue;
          let run = 0;
          let color = -1;
          let cells: number[] = [];
          let x = startX;
          let y = startY;
          while (x >= 0 && x < b.cols && y >= 0 && y < b.rows) {
            const c = b[idx(b, x, y)];
            if (c !== EMPTY && !isStone(c)) {
              if (colorOf(c) === color) {
                run++;
                cells.push(idx(b, x, y));
              } else {
                checkRun(run, color, cells);
                color = colorOf(c);
                run = 1;
                cells = [idx(b, x, y)];
              }
            } else {
              checkRun(run, color, cells);
              color = -1;
              run = 0;
              cells = [];
            }
            x += dx;
            y += dy;
          }
          checkRun(run, color, cells);
        }
      }
    }
  }

  // AoE Patlama — aoeThreshold ve üstü eşleşmeler merkez etrafındaki 5x5 alandaki TAŞLARI kırar ve patlama efekti verir
  const explosions: number[] = [];
  const bombExplosions: number[] = [];
  if (aoeEnabled) {
    for (const match of matchesLengths) {
      if (match.len >= aoeThreshold) {
        explosions.push(match.center);
        const cx = match.center % b.cols;
        const cy = Math.floor(match.center / b.cols);
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const px = cx + dx;
            const py = cy + dy;
            if (px >= 0 && px < b.cols && py >= 0 && py < b.rows) {
              const i = idx(b, px, py);
              if (isStone(b[i])) marked.add(i);
            }
          }
        }
      }
    }
  }

  // Bomba patlamaları: Tahtada KIND_BOMB var mı?
  for (let i = 0; i < b.rows * b.cols; i++) {
    if (isBomb(b[i])) {
      bombExplosions.push(i); // ayrı efekt listesi
      const cx = i % b.cols;
      const cy = Math.floor(i / b.cols);
      const radius = Math.floor((bombThreshold ?? 5) / 2);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const px = cx + dx;
          const py = cy + dy;
          if (px >= 0 && px < b.cols && py >= 0 && py < b.rows) {
            marked.add(idx(b, px, py));
          }
        }
      }
    }
  }

  if (bombEnabled) {
    for (const match of matchesLengths) {
      if (match.len >= bombThreshold) {
        bombsEarned++;
      }
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

/** İşaretli hücreleri sil, kalan eşleri tekil yap */
export function applyClear(b: Board, cleared: number[]) {
  for (const i of cleared) {
    const c = b[i];
    if (c === EMPTY) continue;
    const d = partnerDelta(c);
    if (d) {
      const x = i % b.cols;
      const y = (i / b.cols) | 0;
      const px = x + d[0];
      const py = y + d[1];
      const pc = get(b, px, py);
      if (pc > 0 && isCapsule(pc)) set(b, px, py, toSingle(pc));
    }
  }
  for (const i of cleared) {
    const c = b[i];
    if (c === EMPTY) continue;
    if (hasLock(c)) {
      b[i] = removeLock(c);
    } else {
      b[i] = EMPTY;
    }
  }
}

/**
 * Havada kalan kapsülleri 1 satır düşür.
 * Virüsler asla düşmez. Çift kapsül ancak iki yarısı da düşebiliyorsa düşer.
 * @returns en az bir parça düştüyse true
 */
export function stepGravity(b: Board): boolean {
  const moved = new Uint8Array(b.rows * b.cols);
  let any = false;

  // aşağıdan yukarı tara
  for (let y = b.rows - 2; y >= 0; y--) {
    for (let x = 0; x < b.cols; x++) {
      const i = idx(b, x, y);
      const c = b[i];
      if (c === EMPTY || moved[i]) continue;
      if (kindOf(c) === KIND_VIRUS) continue;

      const d = partnerDelta(c);
      if (!d) {
        // tekil
        if (get(b, x, y + 1) === EMPTY) {
          set(b, x, y + 1, c);
          b[i] = EMPTY;
          moved[idx(b, x, y + 1)] = 1;
          any = true;
        }
      } else {
        const px = x + d[0];
        const py = y + d[1];
        const pc = get(b, px, py);
        if (pc <= 0) {
          // eş kayıp (tutarsızlık) — tekile çevir, sonraki turda düşer
          set(b, x, y, toSingle(c));
          any = true; // Fix: keep gravity running so this single block falls next tick
          continue;
        }
        if (d[1] === 0) {
          // yatay çift: iki altı da boş olmalı
          if (get(b, x, y + 1) === EMPTY && get(b, px, py + 1) === EMPTY) {
            set(b, x, y + 1, c);
            set(b, px, py + 1, pc);
            b[i] = EMPTY;
            b[idx(b, px, py)] = EMPTY;
            moved[idx(b, x, y + 1)] = 1;
            moved[idx(b, px, py + 1)] = 1;
            any = true;
          }
        } else {
          // dikey çift: sadece alttaki yarımdan bakılır
          const lowY = Math.max(y, py);
          const upY = Math.min(y, py);
          if (get(b, x, lowY + 1) === EMPTY) {
            const lowC = b[idx(b, x, lowY)];
            const upC = b[idx(b, x, upY)];
            b[idx(b, x, lowY)] = EMPTY;
            b[idx(b, x, upY)] = EMPTY;
            set(b, x, lowY + 1, lowC);
            set(b, x, upY + 1, upC);
            moved[idx(b, x, lowY + 1)] = 1;
            moved[idx(b, x, upY + 1)] = 1;
            any = true;
          }
        }
      }
    }
  }
  return any;
}

/** Rakipten gelen çöp hücreleri en üst satıra bırak */
export function injectGarbage(b: Board, columns: number[], colors: number[], stones: boolean = false) {
  for (let i = 0; i < columns.length; i++) {
    const x = columns[i] % b.cols;
    if (get(b, x, 0) === EMPTY) {
      if (stones) {
        set(b, x, 0, cell(KIND_STONE, 0)); // Taşın rengi olmaz
      } else {
        set(b, x, 0, cell(KIND_SINGLE, colors[i] % MAX_COLORS));
      }
    }
  }
}

export function cloneBoard(b: Board): Board {
  const copy = new Uint8Array(b) as Board;
  // Uint8Array kopyası boyut bilgisini taşımaz; eksik kalırsa findMatches/idx çalışmaz
  copy.cols = b.cols;
  copy.rows = b.rows;
  return copy;
}

/** Ağ için 8x16 tahtayı 64 byte'a paketle (hücre başına 1 byte zaten, base64'le) */
export function encodeBoard(b: Board): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return typeof btoa !== 'undefined'
    ? btoa(s)
    : Buffer.from(b).toString('base64');
}

export function decodeBoard(str: string): Board {
  if (typeof atob !== 'undefined') {
    const s = atob(str);
    const b = createBoard();
    for (let i = 0; i < b.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
  const out = createBoard();
  const buf = Buffer.from(str, 'base64');
  for (let i = 0; i < out.length && i < buf.length; i++) out[i] = buf[i];
  return out;
}
