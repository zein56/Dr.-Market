export const COLS = 8;
export const ROWS = 16;

/** Renkler */
export const RED = 0;
export const YELLOW = 1;
export const BLUE = 2;
export const MAX_COLORS = 10; // Yeni maksimum renk sayısı
// Oyun içinde aslında kaç renk kullanılacağı MatchConfig'den gelecek.

/** Hücre türleri */
export const KIND_VIRUS = 0;
export const KIND_SINGLE = 1; // eşi patlamış yarım kapsül
export const KIND_LEFT = 2; // eşi sağımda
export const KIND_RIGHT = 3; // eşi solumda
export const KIND_UP = 4; // eşi altımda
export const KIND_DOWN = 5; // eşi üstümde
export const KIND_STONE = 6; // kalıcı taş
export const KIND_BOMB = 7; // bomba hücresi

<<<<<<< HEAD
/**
 * Hücre kodlaması (Uint8):
 *  - 0 = boş
 *  - 1..80          : 1 + kind*10 + color (normal hücreler)
 *  - 81..(81+10*N)  : KİLİTLİ VİRÜS. Değer = LOCK_BASE + (seviye-1)*10 + color
 *                     seviye 1..MAX_LOCK_LEVEL (her eşleşme bir seviye kırar)
 *
 * Eski kodlama kilidi 7. bitte (+128) tutuyordu; bu tek kilit taşıyabiliyordu ve ikinci kilit
 * Uint8Array'e sığmadan taşıp kilidi siliyordu. Yeni kodlama seviyeleri doğrudan taşır.
 */
export const EMPTY = 0;
export const LOCK_BASE = 81;
/** Bir virüsün taşıyabileceği en fazla kilit katmanı (81 + 9*10 + 9 = 180 < 256) */
export const MAX_LOCK_LEVEL = 10;

export function hasLock(c: number): boolean {
  return c >= LOCK_BASE;
}
export function getLockCount(c: number): number {
  return c >= LOCK_BASE ? Math.floor((c - LOCK_BASE) / MAX_COLORS) + 1 : 0;
}
/** Kilidi sök: kilitli virüs → kilitsiz aynı renk virüs; diğer hücreler aynen kalır. */
export function stripLocks(c: number): number {
  return c >= LOCK_BASE ? 1 + KIND_VIRUS * MAX_COLORS + ((c - LOCK_BASE) % MAX_COLORS) : c;
}
/** Bir kilit katmanı ekler (yalnızca virüsler kilitlenir). max: ulaşılabilecek en yüksek seviye. */
export function addLock(c: number, max: number = MAX_LOCK_LEVEL): number {
  if (c === EMPTY) return c;
  const base = stripLocks(c);
  if ((((base - 1) / MAX_COLORS) | 0) !== KIND_VIRUS) return c;
  const lvl = getLockCount(c);
  if (lvl >= Math.min(max, MAX_LOCK_LEVEL)) return c;
  return LOCK_BASE + lvl * MAX_COLORS + ((base - 1) % MAX_COLORS);
}
/** Bir kilit katmanını kaldırır. */
export function removeLock(c: number): number {
  const lvl = getLockCount(c);
  if (lvl <= 0) return c;
  if (lvl === 1) return stripLocks(c);
  return LOCK_BASE + (lvl - 2) * MAX_COLORS + ((stripLocks(c) - 1) % MAX_COLORS);
=======
/** Hücre kodlaması: 0 = boş, aksi halde 1 + kind*10 + color (1..70). Bit 7+ (128+) = kilit sayısı */
export const EMPTY = 0;

export function stripLocks(c: number): number {
  return c & 127;
}
export function getLockCount(c: number): number {
  return c >> 7;
}
export function addLock(c: number): number {
  if (getLockCount(c) >= 7) return c;
  return c + 128;
}
export function removeLock(c: number): number {
  if (getLockCount(c) <= 0) return c;
  return c - 128;
}
export function hasLock(c: number): boolean {
  return c >= 128;
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
}

export function cell(kind: number, color: number): number {
  return 1 + kind * MAX_COLORS + color;
}
export function colorOf(c: number): number {
  return (stripLocks(c) - 1) % MAX_COLORS;
}
export function kindOf(c: number): number {
  return (((stripLocks(c) - 1) / MAX_COLORS) | 0);
}
export function isVirus(c: number): boolean {
  const stripped = stripLocks(c);
  return stripped !== EMPTY && kindOf(stripped) === KIND_VIRUS;
}
export function isCapsule(c: number): boolean {
  const stripped = stripLocks(c);
  const k = kindOf(stripped);
  return stripped !== EMPTY && k !== KIND_VIRUS && k !== KIND_STONE && k !== KIND_BOMB;
}
export function isStone(c: number): boolean {
  const stripped = stripLocks(c);
  return stripped !== EMPTY && kindOf(stripped) === KIND_STONE;
}
export function isBomb(c: number): boolean {
  const stripped = stripLocks(c);
  return stripped !== EMPTY && kindOf(stripped) === KIND_BOMB;
}

/** Eşin yönü: [dx, dy] ya da null */
export function partnerDelta(c: number): [number, number] | null {
  switch (kindOf(c)) {
    case KIND_LEFT:
      return [1, 0];
    case KIND_RIGHT:
      return [-1, 0];
    case KIND_UP:
      return [0, 1];
    case KIND_DOWN:
      return [0, -1];
    default:
      return null;
  }
}

/** Eşi yok olunca kalan yarım tekil olur */
export function toSingle(c: number): number {
  return cell(KIND_SINGLE, colorOf(c));
}

/** Eşleşme için gereken minimum uzunluk */
export const MATCH_LEN = 4;

/** Hız kademeleri: kapsülün 1 satır düşmesi için gereken frame sayısı */
export type SpeedSetting = 'low' | 'med' | 'hi';

const SPEED_BASE: Record<SpeedSetting, number> = {
  low: 40,
  med: 28,
  hi: 18,
};

/**
 * Klasik oyundaki gibi düşen her kapsülden sonra hafifçe hızlanır.
 * Her 10 kapsülde 1 frame düşer, tabanı 8 frame.
 */
export function gravityFrames(speed: SpeedSetting, capsulesDropped: number): number {
  const v = SPEED_BASE[speed] - Math.floor(capsulesDropped / 10);
  return Math.max(8, v);
}

/** Zamanlama sabitleri (frame) */
export const FPS = 60;
export const LOCK_DELAY = 12; // yere değdikten sonra kilitlenmeden önceki süre
export const CLEAR_ANIM_FRAMES = 18; // patlama animasyonu
export const FALL_STEP_FRAMES = 3; // temizlik sonrası parçaların düşme hızı
export const SPAWN_DELAY = 10; // yeni kapsül gelmeden önce
export const DAS_DELAY = 12; // yana basılı tutunca ilk tekrar gecikmesi
export const DAS_REPEAT = 3; // sonraki tekrar aralığı
export const SOFT_DROP_FRAMES = 2; // aşağı basılıyken düşme hızı

/** Spawn pozisyonu: sol yarım hücrenin koordinatı */
export const SPAWN_X = 3;
export const SPAWN_Y = 0;

/** Level başına virüs sayısı (klasik formül: (level+1)*4, üst sınır 84) */
export function virusCount(level: number): number {
  return Math.min(84, (level + 1) * 4);
}

/** Virüslerin yerleşebileceği en üst satır — level arttıkça yukarı çıkar */
export function virusTopRow(level: number): number {
  if (level <= 14) return 6;
  if (level <= 17) return 5;
  if (level <= 19) return 4;
  return 3;
}
