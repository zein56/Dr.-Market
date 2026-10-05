import {
  COLS,
  ROWS,
  EMPTY,
  MAX_COLORS,
  KIND_LEFT,
  KIND_RIGHT,
  KIND_UP,
  KIND_DOWN,
  KIND_VIRUS,
  KIND_BOMB,
  cell,
  gravityFrames,
  LOCK_DELAY,
  CLEAR_ANIM_FRAMES,
  FALL_STEP_FRAMES,
  SPAWN_DELAY,
  SOFT_DROP_FRAMES,
  DAS_DELAY,
  DAS_REPEAT,
  SPAWN_X,
  SPAWN_Y,
  SpeedSetting,
  isVirus,
  isStone,
  hasLock,
  removeLock,
  addLock,
  getLockCount,
  MAX_LOCK_LEVEL,
} from './constants';
import {
  Board,
  createBoard,
  get,
  set,
  placeViruses,
  findMatches,
  applyClear,
  stepGravity,
  countViruses,
  injectGarbage,
  cloneBoard,
} from './board';
import { Rng } from './rng';
import {
  POWER_STRIKE,
  POWER_SHIELD,
  POWER_JOKER,
  POWER_CLEANSE,
  POWER_NAMES,
  powerFreqParams,
  STRIKE_AMOUNT,
  SHIELD_MAX,
  pickPower,
} from './powerups';

export const enum Phase {
  Spawning = 0,
  Falling = 1,
  Clearing = 2,
  Settling = 3,
  Won = 4,
  Lost = 5,
}

export const enum Input {
  Left = 1,
  Right = 2,
  RotateCW = 3,
  RotateCCW = 4,
  SoftDropOn = 5,
  SoftDropOff = 6,
  HardDrop = 7,
  UseBomb = 8,
}

export interface MatchConfig {
  seed: number;
  level: number;
  speed: SpeedSetting;
  diagMatches?: boolean;
  cols?: number;
  rows?: number;

  /** Karşı saldırı: kendi ürettiğin saldırı, sırada bekleyen gelen çöpü önce iptal eder. */
  counterEnabled?: boolean;

  aoeEnabled?: boolean;
  aoeThreshold?: number;

  missPenaltyEnabled?: boolean;
  missPenaltyThreshold?: number;

  normalAttackEnabled?: boolean;
  normalAttackLen?: number;
  normalAttackRequireCombo?: boolean;

  stoneAttackEnabled?: boolean;
  stoneAttackLen?: number;
  stoneAttackRequireCombo?: boolean;

  lockAttackEnabled?: boolean;
  lockAttackLen?: number;
  lockAttackRequireCombo?: boolean;

  bombEnabled?: boolean;
  bombThreshold?: number;

  colors: number; // 3..10 (kaç farklı renk kullanılacak)

  /** Güçlendirici kapsüller (bkz. powerups.ts). Verilmezse kapalı. */
  powerupsEnabled?: boolean;
  /** Güçlendirici sıklığı 1 (seyrek) .. 10 (sık). Varsayılan 5. */
  powerupFreq?: number;

  /** Kilit saldırısı aynı virüse üst üste eklenebilsin mi? Kapalıysa zaten kilitli virüse gelen kilit onu açar. */
  lockStacking?: boolean;
  /** Üst üste en fazla kaç kilit katmanı (2..10). Varsayılan 3. */
  lockMaxStack?: number;

  /** Ortak tahta: oyuncuların kapsülleri havada birbirinden geçebilir (yere konarken üstte kalan itilir). */
  coopPassThrough?: boolean;
  /** Ortak tahta: yükselen taban (sonsuz mod). Belirli aralıkla tahta bir satır yükselir, altta yeni virüs satırı çıkar. */
  risingEnabled?: boolean;
  /** Yükselme hızı 1 (yavaş) .. 10 (hızlı). Varsayılan 5. */
  riseSpeed?: number;
}

export interface Capsule {
  x: number;
  y: number;
  /** 0 = yatay (ikinci yarım sağda), 1 = dikey (ikinci yarım altta),
   *  2 = yatay ters, 3 = dikey ters */
  rot: number;
  a: number; // birinci yarımın rengi
  b: number; // ikinci yarımın rengi
  isBomb?: boolean;
  /** Güçlendirici türü (POWER_*). Yoksa normal kapsül. */
  power?: number;
}

export interface AttackInfo {
  normal: number;
  stone: number;
  lock: number;
  /** çöp parçalarının renkleri (protokoldeki AttackInfo ile aynı) */
  colors?: number[];
}

export interface PendingGarbage {
  columns: number[];
  colors: number[];
  stones: boolean;
}

export interface GameState {
  cfg: MatchConfig;
  board: Board;
  cols: number;  // gerçek board genişliği
  rows: number;  // gerçek board yüksekliği
  frame: number;
  phase: Phase;
  rng: Rng; // sadece kapsül üretimi için
  capsule: Capsule | null;
  nextA: number;
  nextB: number;
  capsulesDropped: number;
  gravityTimer: number;
  lockTimer: number;
  phaseTimer: number;
  softDrop: boolean;
  dasDir: number; // -1, 0, 1
  dasTimer: number;
  clearing: number[]; // animasyon için işaretli hücreler
  chain: number; // zincir adımı
  virusesLeft: number;
  score: number;
  missCount: number; // Hata sayacı (Hard Mode)
  /** bu frame'de üretilen saldırı miktarı — dışarıya aktarılır */
  attackOut: AttackInfo | null;
  pendingGarbage: PendingGarbage[];
  /** UI/ses için bu frame'de olan olaylar */
  events: string[];
  totalVirusesCleared: number;
  maxChain: number;
  bombs: number; // 0..3
  bombActive: boolean; // if true, next spawned capsule is a bomb

  /** Güçlendirici programı için ayrı RNG (renk dizisini etkilemez) */
  powerRng: Rng;
  /** Bir sonraki kapsülün gücü (0 = yok) */
  nextPower: number;
  /** Son güçlü kapsülden beri düşen kapsül sayısı */
  powerGap: number;
  /** Emmeye hazır kalkan sayısı */
  shield: number;
  /** step() dışında (ör. queueGarbage) oluşan olaylar; bir sonraki adımda events'e taşınır */
  queuedEvents: string[];
}

function nextColor(rng: Rng, colors: number): number {
  return rng.int(colors);
}

export function createGame(cfg: MatchConfig): GameState {
  const board = createBoard(cfg.cols, cfg.rows);
  const virusRng = new Rng(cfg.seed ^ 0x5bf03635);
  placeViruses(board, cfg.level, virusRng, cfg.colors);

  const rng = new Rng(cfg.seed);
  const s: GameState = {
    cfg,
    board,
    cols: board.cols,
    rows: board.rows,
    frame: 0,
    phase: Phase.Spawning,
    rng,
    capsule: null,
    nextA: nextColor(rng, cfg.colors),
    nextB: nextColor(rng, cfg.colors),
    capsulesDropped: 0,
    gravityTimer: 0,
    lockTimer: 0,
    phaseTimer: SPAWN_DELAY,
    softDrop: false,
    dasDir: 0,
    dasTimer: 0,
    clearing: [],
    chain: 0,
    virusesLeft: countViruses(board),
    score: 0,
    missCount: 0,
    attackOut: null,
    pendingGarbage: [],
    events: [],
    totalVirusesCleared: 0,
    maxChain: 0,
    bombs: 0,
    bombActive: false,
    powerRng: new Rng((cfg.seed ^ 0x7f4a7c15) >>> 0),
    nextPower: 0,
    powerGap: 0,
    shield: 0,
    queuedEvents: [],
  };
  return s;
}

/** Kapsülün kapladığı iki hücrenin koordinatı */
export function capsuleCells(c: Capsule): [number, number, number, number] {
  if (c.isBomb) {
    return [c.x, c.y, c.x, c.y];
  }
  switch (c.rot & 3) {
    case 0:
      return [c.x, c.y, c.x + 1, c.y];
    case 1:
      return [c.x, c.y, c.x, c.y - 1];
    case 2:
      return [c.x + 1, c.y, c.x, c.y];
    default:
      return [c.x, c.y - 1, c.x, c.y];
  }
}

function fits(board: Board, c: Capsule): boolean {
  const [x1, y1, x2, y2] = capsuleCells(c);
  if (c.isBomb) {
    // Bomba tek hücre — sadece birinci pozisyonu kontrol et
    return x1 >= 0 && x1 < board.cols && y1 >= 0 && y1 < board.rows && get(board, x1, y1) === EMPTY;
  }
  return (
    x1 >= 0 &&
    x1 < board.cols &&
    y1 >= 0 &&
    y1 < board.rows &&
    x2 >= 0 &&
    x2 < board.cols &&
    y2 >= 0 &&
    y2 < board.rows &&
    get(board, x1, y1) === EMPTY &&
    get(board, x2, y2) === EMPTY
  );
}

/** Kapsülün iki yarımını yönüne göre tahtaya yazar. */
function writeHalves(board: Board, c: Capsule, a: number, b: number) {
  const [x1, y1, x2, y2] = capsuleCells(c);
  const horizontal = y1 === y2;
  if (horizontal) {
    const leftFirst = x1 < x2;
    const kindA = leftFirst ? KIND_LEFT : KIND_RIGHT;
    const kindB = leftFirst ? KIND_RIGHT : KIND_LEFT;
    set(board, x1, y1, cell(kindA, a));
    set(board, x2, y2, cell(kindB, b));
  } else {
    const firstOnTop = y1 < y2;
    const kindA = firstOnTop ? KIND_UP : KIND_DOWN;
    const kindB = firstOnTop ? KIND_DOWN : KIND_UP;
    set(board, x1, y1, cell(kindA, a));
    set(board, x2, y2, cell(kindB, b));
  }
}

/**
 * Joker: her iki yarımı da aynı renge çevirerek, yerleştiği anda en çok hücre / virüs
 * temizleyecek rengi seçer. Hiçbir renk eşleşme üretmiyorsa kapsül özgün renkleriyle kalır.
 * Eşitlikte en küçük renk numarası seçilir (deterministik).
 */
export function jokerColors(s: GameState, c: Capsule): [number, number] {
  let bestK = -1;
  let bestScore = 0;
  for (let k = 0; k < s.cfg.colors; k++) {
    const trial = cloneBoard(s.board);
    writeHalves(trial, c, k, k);
    const m = findMatches(trial, s.cfg);
    const score = m.cleared.length + m.virusesCleared * 10;
    if (score > bestScore) {
      bestScore = score;
      bestK = k;
    }
  }
  return bestK >= 0 ? [bestK, bestK] : [c.a, c.b];
}

/** Üretilen saldırıyı bu karenin dışa giden saldırısına ekler. */
function mergeAttack(s: GameState, atk: AttackInfo) {
  if (!s.attackOut) s.attackOut = { normal: 0, stone: 0, lock: 0, colors: [] };
  s.attackOut.normal += atk.normal;
  s.attackOut.stone += atk.stone;
  s.attackOut.lock += atk.lock;
  if (atk.colors) s.attackOut.colors = (s.attackOut.colors || []).concat(atk.colors);
}

/** Güçlü kapsül yere oturduktan sonra etkisini uygular. a/b: tahtaya yazılan son renkler. */
function applyPower(s: GameState, power: number, a: number, b: number) {
  switch (power) {
    case POWER_STRIKE: {
      const atk: AttackInfo = { normal: STRIKE_AMOUNT, stone: 0, lock: 0, colors: [a, b, a, b] };
      if (s.cfg.counterEnabled) {
        const cancelled = cancelPendingGarbage(s, atk);
        if (cancelled > 0) s.events.push(`counter:${cancelled}`);
      }
      mergeAttack(s, atk);
      break;
    }
    case POWER_SHIELD:
      s.shield = Math.min(SHIELD_MAX, s.shield + 1);
      break;
    case POWER_CLEANSE: {
      for (let i = 0; i < s.board.length; i++) {
        const v = s.board[i];
        if (isStone(v)) {
          s.board[i] = EMPTY;
        } else if (hasLock(v)) {
          let w = v;
          while (hasLock(w)) w = removeLock(w);
          s.board[i] = w;
        }
      }
      s.pendingGarbage = [];
      // taşların altından boşalan parçalar hemen düşsün
      while (stepGravity(s.board)) { /* yerçekimi oturana kadar */ }
      break;
    }
    case POWER_JOKER:
      break; // etkisi renk seçimiydi (lockCapsule içinde uygulandı)
    default:
      return;
  }
  s.events.push(`power:${POWER_NAMES[power]}`);
}

function lockCapsule(s: GameState) {
  const c = s.capsule;
  if (!c) return;
  const [x1, y1] = capsuleCells(c);

  if (c.isBomb) {
    // Bomba tek hücre — sadece birinci pozisyona yaz
    set(s.board, x1, y1, cell(KIND_BOMB, 0));
    s.capsule = null;
    s.capsulesDropped++;
    s.events.push('lock');
    return;
  }

  let a = c.a;
  let b = c.b;
  if (c.power === POWER_JOKER) [a, b] = jokerColors(s, c);
  writeHalves(s.board, c, a, b);

  s.capsule = null;
  s.capsulesDropped++;
  s.events.push('lock');
  if (c.power) applyPower(s, c.power, a, b);
}

/** Bir sonraki kapsülün gücünü belirler (kapalıysa RNG'ye dokunmaz). */
function rollNextPower(s: GameState): number {
  if (!s.cfg.powerupsEnabled) return 0;
  const { gap, chance } = powerFreqParams(s.cfg.powerupFreq);
  s.powerGap++;
  if (s.powerGap < gap) return 0;
  if (s.powerRng.next() / 4294967296 >= chance) return 0;
  s.powerGap = 0;
  return pickPower(s.powerRng.next() / 4294967296);
}

function spawn(s: GameState) {
  const spawnX = Math.floor((s.cols - 2) / 2);
  const spawnY = 0;
  let c: Capsule;
  if (s.bombActive) {
    c = {
      x: spawnX,
      y: spawnY,
      rot: 0,
      a: 0, // Bomba rengi önemli değil (KIND_BOMB kullanılıyor)
      b: 0,
      isBomb: true,
    };
    s.bombActive = false;
  } else {
    c = {
      x: spawnX,
      y: spawnY,
      rot: 0,
      a: s.nextA,
      b: s.nextB,
    };
    s.nextA = nextColor(s.rng, s.cfg.colors);
    s.nextB = nextColor(s.rng, s.cfg.colors);
    // güç bu kapsüle geçer; bomba kapsülü sırayı tüketmediği için güç bir sonrakine kalır
    if (s.nextPower) c.power = s.nextPower;
    s.nextPower = rollNextPower(s);
  }

  if (!fits(s.board, c)) {
    s.phase = Phase.Lost;
    s.events.push('lost');
    return;
  }
  s.capsule = c;
  s.phase = Phase.Falling;
  s.gravityTimer = 0;
  s.lockTimer = 0;
  s.chain = 0;
  s.events.push('spawn');
}

/** Zincir adımına göre rakibe gidecek çöp miktarı */
/**
 * Karşı saldırı: üretilen saldırıyı (normal + taş) sırada bekleyen gelen çöple
 * karşılaştırır. Her birim, bekleyen bir çöp parçasını iptal eder (eskiden yeniye).
 * `attack` yerinde azaltılır. Kilit saldırıları anında uygulandığı için iptal edilemez.
 * Döndürdüğü değer: iptal edilen parça sayısı.
 */
export function cancelPendingGarbage(s: GameState, attack: AttackInfo): number {
  let budget = attack.normal + attack.stone;
  if (budget <= 0 || s.pendingGarbage.length === 0) return 0;

  let cancelled = 0;
  for (const g of s.pendingGarbage) {
    while (budget > 0 && g.columns.length > 0) {
      g.columns.pop();
      g.colors.pop();
      budget--;
      cancelled++;
    }
    if (budget <= 0) break;
  }
  s.pendingGarbage = s.pendingGarbage.filter((g) => g.columns.length > 0);

  // iptal edilen birimler saldırıdan düşer: önce normal, sonra taş
  let toRemove = cancelled;
  const fromNormal = Math.min(attack.normal, toRemove);
  attack.normal -= fromNormal;
  toRemove -= fromNormal;
  attack.stone -= Math.min(attack.stone, toRemove);
  if (attack.normal + attack.stone + attack.lock === 0) attack.colors = [];
  return cancelled;
}

function attackFor(groups: number, chain: number, viruses: number, cfg: MatchConfig, matchesLengths: { len: number, color: number }[]): AttackInfo {
  const atk: AttackInfo = { normal: 0, stone: 0, lock: 0, colors: [] };

  // Custom Attack Rules enabled?
  if (cfg.normalAttackEnabled || cfg.stoneAttackEnabled || cfg.lockAttackEnabled) {
    const isCombo = groups >= 2 || chain >= 2;
    for (const m of matchesLengths) {
      if (cfg.normalAttackEnabled && m.len >= (cfg.normalAttackLen || 4)) {
        if (!cfg.normalAttackRequireCombo || isCombo) { atk.normal += 1; atk.colors!.push(m.color); }
      }
      if (cfg.stoneAttackEnabled && m.len >= (cfg.stoneAttackLen || 5)) {
        if (!cfg.stoneAttackRequireCombo || isCombo) { atk.stone += 1; atk.colors!.push(m.color); }
      }
      if (cfg.lockAttackEnabled && m.len >= (cfg.lockAttackLen || 6)) {
        if (!cfg.lockAttackRequireCombo || isCombo) { atk.lock += 1; atk.colors!.push(m.color); }
      }
    }
    return atk;
  }

  // Classic default rules
  let normal = Math.max(0, groups - 1);
  if (chain >= 2) normal += chain - 1;
  if (viruses >= 3) normal += 1;
  atk.normal = Math.min(4, normal);

  if (atk.normal > 0) {
    for (const m of matchesLengths) atk.colors!.push(m.color);
  }

  return atk;
}

function spawnPenaltyVirus(s: GameState) {
  const emptyCells: number[] = [];
  for (let i = 0; i < s.board.rows * s.board.cols; i++) {
    if (s.board[i] === EMPTY && Math.floor(i / s.board.cols) >= 4) emptyCells.push(i);
  }
  if (emptyCells.length > 0) {
    const target = emptyCells[s.rng.int(emptyCells.length)];
    const color = s.rng.int(s.cfg.colors);
    s.board[target] = cell(KIND_VIRUS, color);
    s.virusesLeft++;
    s.events.push(`penalty_spawn:${target}`);
  }
}

function enterClearOrSettle(s: GameState) {
  const m = findMatches(s.board, s.cfg);
  if (m.cleared.length > 0) {
    s.missCount = 0; // eşleşme olunca sayaç sıfırlanır
    s.chain++;
    if (s.chain > s.maxChain) s.maxChain = s.chain;
    if (m.bombsEarned > 0) {
      s.bombs = Math.min(3, s.bombs + m.bombsEarned);
    }
    s.clearing = m.cleared;
    s.virusesLeft -= m.virusesCleared;
    s.totalVirusesCleared += m.virusesCleared;
    s.score += m.cleared.length * 10 * s.chain + m.virusesCleared * 100 + m.stonesCleared * 50;
    const newAttack = attackFor(m.groups, s.chain, m.virusesCleared, s.cfg, m.matchesLengths);
    if (s.cfg.counterEnabled) {
      const cancelled = cancelPendingGarbage(s, newAttack);
      if (cancelled > 0) s.events.push(`counter:${cancelled}`);
    }
    mergeAttack(s, newAttack);
    s.phase = Phase.Clearing;
    s.phaseTimer = CLEAR_ANIM_FRAMES;
    s.events.push(s.chain > 1 ? 'chain' : 'clear');
    if (m.virusesCleared > 0) s.events.push('virus');
    if (m.explosions.length > 0) s.events.push(`explosion:${m.explosions.join(',')}`);
    if (m.bombExplosions && m.bombExplosions.length > 0) s.events.push(`bomb_explosion:${m.bombExplosions.join(',')}`);
  } else {
    // eşleşme yok
    if (s.cfg.missPenaltyEnabled && s.chain === 0) {
      s.missCount++;
      if (s.missCount >= (s.cfg.missPenaltyThreshold || 3)) {
        s.missCount = 0;
        spawnPenaltyVirus(s);
      }
    }
    s.chain = 0;
    // bekleyen çöpü uygula, sonra yeni kapsül
    if (s.virusesLeft <= 0) {
      s.phase = Phase.Won;
      s.events.push('won');
      return;
    }
    if (s.pendingGarbage.length > 0) {
      const g = s.pendingGarbage.shift()!;
      injectGarbage(s.board, g.columns, g.colors, g.stones);
      s.events.push('garbage');
      s.phase = Phase.Settling;
      s.phaseTimer = FALL_STEP_FRAMES;
      return;
    }
    s.phase = Phase.Spawning;
    s.phaseTimer = SPAWN_DELAY;
  }
}

function tryMove(s: GameState, dx: number) {
  const c = s.capsule;
  if (!c) return;
  const t = { ...c, x: c.x + dx };
  if (fits(s.board, t)) {
    s.capsule = t;
    s.events.push('move');
  }
}

function tryRotate(s: GameState, dir: number) {
  const c = s.capsule;
  if (!c) return;
  const nrot = (c.rot + (dir > 0 ? 1 : 3)) & 3;
  const candidates: Capsule[] = [
    { ...c, rot: nrot },
    { ...c, rot: nrot, x: c.x - 1 }, // duvar itmesi
    { ...c, rot: nrot, x: c.x + 1 },
    { ...c, rot: nrot, y: c.y + 1 }, // tavan itmesi (dikeye dönerken)
  ];
  for (const t of candidates) {
    if (fits(s.board, t)) {
      s.capsule = t;
      s.events.push('rotate');
      return;
    }
  }
}

function moveDown(s: GameState): boolean {
  const c = s.capsule;
  if (!c) return false;
  const t = { ...c, y: c.y + 1 };
  if (fits(s.board, t)) {
    s.capsule = t;
    return true;
  }
  return false;
}

/** Tek bir frame ilerlet. inputs: bu frame'de gelen girdiler. */
export function step(s: GameState, inputs: Input[]): void {
  s.events.length = 0;
  if (s.queuedEvents.length > 0) {
    for (const ev of s.queuedEvents) s.events.push(ev);
    s.queuedEvents.length = 0;
  }
  s.attackOut = null;

  if (s.phase === Phase.Won || s.phase === Phase.Lost) {
    s.frame++;
    return;
  }

  // --- girdi işleme (sadece Falling fazında etkili) ---
  for (const inp of inputs) {
    switch (inp) {
      case Input.Left:
        s.dasDir = -1;
        s.dasTimer = DAS_DELAY;
        if (s.phase === Phase.Falling) tryMove(s, -1);
        break;
      case Input.Right:
        s.dasDir = 1;
        s.dasTimer = DAS_DELAY;
        if (s.phase === Phase.Falling) tryMove(s, 1);
        break;
      case Input.RotateCW:
        if (s.phase === Phase.Falling) tryRotate(s, 1);
        break;
      case Input.RotateCCW:
        if (s.phase === Phase.Falling) tryRotate(s, -1);
        break;
      case Input.SoftDropOn:
        s.softDrop = true;
        break;
      case Input.SoftDropOff:
        s.softDrop = false;
        s.dasDir = 0;
        break;
      case Input.HardDrop:
        if (s.phase === Phase.Falling) {
          while (moveDown(s)) s.score += 1;
          lockCapsule(s);
          enterClearOrSettle(s);
        }
        break;
      case Input.UseBomb:
        if (s.cfg.bombEnabled && s.bombs > 0 && !s.bombActive) {
          s.bombs--;
          s.bombActive = true;
          s.events.push('bomb_activated');
        }
        break;
    }
  }

  // DAS otomatik tekrarı
  if (s.dasDir !== 0 && s.phase === Phase.Falling) {
    s.dasTimer--;
    if (s.dasTimer <= 0) {
      tryMove(s, s.dasDir);
      s.dasTimer = DAS_REPEAT;
    }
  }

  switch (s.phase) {
    case Phase.Spawning: {
      s.phaseTimer--;
      if (s.phaseTimer <= 0) spawn(s);
      break;
    }

    case Phase.Falling: {
      if (!s.capsule) {
        s.phase = Phase.Spawning;
        s.phaseTimer = SPAWN_DELAY;
        break;
      }
      s.gravityTimer++;
      const baseNeed = gravityFrames(s.cfg.speed, s.capsulesDropped);
      const need = s.softDrop ? SOFT_DROP_FRAMES : baseNeed;
      if (s.gravityTimer >= need) {
        s.gravityTimer = 0;
        if (moveDown(s)) {
          s.lockTimer = 0;
          if (s.softDrop) s.score += 1;
        } else {
          s.lockTimer++;
          if (s.lockTimer >= baseNeed) {
            lockCapsule(s);
            enterClearOrSettle(s);
          }
        }
      } else if (s.capsule) {
        // yere değdiyse kilit sayacı yine işlesin
        const t = { ...s.capsule, y: s.capsule.y + 1 };
        if (!fits(s.board, t)) {
          s.lockTimer++;
          if (s.lockTimer >= baseNeed) {
            lockCapsule(s);
            enterClearOrSettle(s);
          }
        } else {
          s.lockTimer = 0;
        }
      }
      break;
    }

    case Phase.Clearing: {
      s.phaseTimer--;
      if (s.phaseTimer <= 0) {
        applyClear(s.board, s.clearing);
        s.clearing = [];
        s.phase = Phase.Settling;
        s.phaseTimer = FALL_STEP_FRAMES;
      }
      break;
    }

    case Phase.Settling: {
      s.phaseTimer--;
      if (s.phaseTimer <= 0) {
        const moved = stepGravity(s.board);
        if (moved) {
          s.phaseTimer = FALL_STEP_FRAMES;
        } else {
          enterClearOrSettle(s);
        }
      }
      break;
    }
  }

  s.frame++;
}

/**
 * Bağlantısı kopup geri dönen oyuncu için: sunucudan gelen son bilinen tahta
 * durumundan devam eden bir oyun kur. Virüs yerleşimi tekrar üretilmez —
 * verilen tahta olduğu gibi kullanılır.
 *
 * Not: rng burada YENİ bir seed'le başlar. Bu, sadece bu istemcinin kendi
 * gelecekteki kapsül renklerini üretir; başka hiçbir istemci ya da sunucu
 * bu diziye bağımlı değil (çöp/saldırı seed'i her seferinde ayrıca sunucudan
 * gelir), o yüzden global determinizmi bozmaz.
 */
export function resumeGame(
  cfg: MatchConfig,
  board: Board,
  frame: number,
  score: number,
  virusesLeft: number
): GameState {
  const rng = new Rng(((Date.now() ^ frame ^ (Math.random() * 0xffffffff)) >>> 0) || 1);
  const restored = cloneBoard(board);
  const s: GameState = {
    cfg,
    board: restored,
    // cols/rows eksikti: kapsül doğuş konumu NaN oluyordu
    cols: restored.cols,
    rows: restored.rows,
    frame,
    phase: Phase.Spawning,
    rng,
    capsule: null,
    // renk sayısı verilmediği için nextA/nextB NaN çıkıyordu
    nextA: nextColor(rng, cfg.colors),
    nextB: nextColor(rng, cfg.colors),
    capsulesDropped: 0,
    gravityTimer: 0,
    lockTimer: 0,
    phaseTimer: SPAWN_DELAY,
    softDrop: false,
    dasDir: 0,
    dasTimer: 0,
    clearing: [],
    chain: 0,
    virusesLeft,
    score,
    missCount: 0,
    attackOut: null,
    pendingGarbage: [],
    events: [],
    totalVirusesCleared: 0,
    maxChain: 0,
    bombs: 0,
    bombActive: false,
    powerRng: new Rng(((Date.now() ^ frame ^ (Math.random() * 0xffffffff)) >>> 0) || 1),
    nextPower: 0,
    powerGap: 0,
    shield: 0,
    queuedEvents: [],
  };
  return s;
}

/** Rakipten gelen saldırıyı kuyruğa ekle. Kolonlar deterministik RNG ile seçilir. */
export function queueGarbage(s: GameState, attack: AttackInfo, seed: number) {
  if (attack.normal <= 0 && attack.stone <= 0 && attack.lock <= 0) return;

  // Kalkan: gelen saldırı paketinin tamamını emer
  if (s.shield > 0) {
    s.shield--;
    s.queuedEvents.push('shield_block'); // step() bir sonraki adımda events'e taşır
    return;
  }
  const rng = new Rng(seed);

  // Kilit saldırıları anında uygulanır!
  if (attack.lock > 0) {
    const viruses: number[] = [];
    for (let i = 0; i < s.board.length; i++) {
      if (isVirus(s.board[i])) viruses.push(i);
    }
    if (s.cfg.lockStacking) {
      // Üst üste ekleme: sınıra ulaşmamış virüslerden rastgele biri seçilir
      const maxLvl = Math.min(MAX_LOCK_LEVEL, Math.max(1, Math.round(s.cfg.lockMaxStack ?? 3)));
      for (let i = 0; i < attack.lock; i++) {
        const open = viruses.filter((v) => getLockCount(s.board[v]) < maxLvl);
        if (open.length === 0) break;
        const target = open[rng.int(open.length)];
        s.board[target] = addLock(s.board[target], maxLvl);
        s.events.push(`lock_applied:${target}`);
      }
    } else if (viruses.length > 0) {
      // Varsayılan (eski davranış): zaten kilitli virüse gelen kilit onu açar
      for (let i = 0; i < attack.lock; i++) {
        const target = viruses[rng.int(viruses.length)];
        s.board[target] = hasLock(s.board[target]) ? removeLock(s.board[target]) : addLock(s.board[target]);
        s.events.push(`lock_applied:${target}`);
      }
    }
  }

  // Taş ve normal saldırılar pendingGarbage kuyruğuna alınır
  const queueDrop = (amount: number, stones: boolean) => {
    if (amount <= 0) return;
    const n = Math.min(amount, s.board.cols);
    const cols: number[] = [];
    const colors: number[] = [];
    const used = new Set<number>();
    let guard = 0;
    while (cols.length < n && guard < 100) {
      guard++;
      const x = rng.int(s.board.cols);
      if (used.has(x)) continue;
      used.add(x);
      cols.push(x);
      if (attack.colors && attack.colors.length > 0) {
        colors.push(attack.colors[rng.int(attack.colors.length)]);
      } else {
        colors.push(rng.int(s.cfg.colors));
      }
    }
    s.pendingGarbage.push({ columns: cols, colors, stones });
  };

  queueDrop(attack.normal, false);
  queueDrop(attack.stone, true);
}

export function isOver(s: GameState): boolean {
  return s.phase === Phase.Won || s.phase === Phase.Lost;
}
