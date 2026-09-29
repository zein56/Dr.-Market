/**
 * Dr. Mario AI v2 — planlama (nereye koyayım?) + uygulama (oraya nasıl giderim?)
 *
 * Neler değişti (v1'e göre):
 *  - Simülasyon artık GERÇEK temizleme yapıyor: 4'lü diziler silinir, yerçekimi uygulanır,
 *    zincirler takip edilir. Ödül "virüs silindi" üzerinden hesaplanır.
 *  - Hücre kodlamasına bağımlılık yok: tahta önce kendi iç gösterimine (renk/virüs/bağ) çevrilir.
 *  - Erişilebilirlik: hedefler BFS ile bulunur, yani bot sadece gerçekten gidebileceği yerleri
 *    değerlendirir. Yol her adımda gerçek kapsül konumundan yeniden hesaplanır.
 *  - Takılma tespiti: bir tuş işe yaramıyorsa yasaklanır ve yeniden planlanır.
 *  - Soft drop ile tuş hızı ayrıldı (soft drop sadece doğru kolon+rotasyondayken açılır).
 *  - Lookahead çift sayım yapmıyor: skor = ödül1 + γ·ödül2 + son tahta değerlendirmesi.
 *  - Zorluk: hız + düşünme süresi + hata modeli + arama derinliği.
 *  - Seedlenebilir RNG (testler tekrarlanabilir).
 *
 * Zorluk seviyeleri:
 *  easy  → yavaş, en iyi 4 hamleden ağırlıklı seçim, %25 tamamen rastgele hamle, lookahead yok
 *  med   → orta hız, en iyi 2 hamleden seçim, dar lookahead (beam 3)
 *  hard  → hızlı, hep en iyi hamle, lookahead (beam 8)
 *
 * VARSAYIMLAR (game-core'a göre kontrol et):
 *  1. capsuleCells(cap) → [xA, yA, xB, yB] döndürür (A yarısı önce).
 *  2. cap.a / cap.b, colorOf(hücre) ile aynı renk uzayındadır.
 *  3. Dikey kapsül y=0'da tahta dışına taşıyorsa döndürme yapılamaz (v1'deki startY=1 hilesiyle aynı
 *     varsayım); bot önce bir satır düşmeyi bekler.
 *  4. Duvar/engel kaydırması (kick) motorda farklıysa sorun değil: yol her tick gerçek durumdan
 *     yeniden hesaplanır.
 *  5. Tahtadaki mevcut kapsüllerin eş yarısı bilinmiyorsa (hooks.linkOf yoksa) yerçekimi
 *     her yarıyı bağımsız düşürür. Motorda eş bilgisi varsa hooks.linkOf'u doldur.
 */

import {
  COLS,
  ROWS,
  EMPTY,
  Input,
  Phase,
  colorOf,
  kindOf,
  KIND_VIRUS,
  capsuleCells,
  type GameState,
  type Capsule,
  type Board,
} from '@pill/game-core';

export type BotDifficulty = 'easy' | 'med' | 'hard';

// Soft drop'ta kapsülün 1 satır inmesi için gereken frame sayısı (motora göre ayarla)
const SOFT_FRAMES_PER_ROW = 2;

// ─────────────────────────────────────────────────────────────────────────────
// Ayarlar
// ─────────────────────────────────────────────────────────────────────────────

export interface Weights {
  virusCleared: number; // silinen her virüs
  pillCleared: number; // silinen her kapsül yarısı
  chain: number; // ilk turdan sonraki her zincir turu
  multiColor: number; // ilk turda 2+ renk aynı anda silindi (versus için iyi)
  virusNeighbor: number; // virüsün yanında aynı renk kapsül
  setup3: number; // 4'lük pencerede 3 aynı renk + 1 boş (bir hamle kaldı)
  setup2: number; // 4'lük pencerede 2 aynı renk + 2 boş
  coverVirus: number; // virüsün hemen üstünde yığılmış her kapsül yarısı
  height: number; // sütun yüksekliği (doğrusal)
  heightSq: number; // sütun yüksekliği (karesel)
  hole: number; // üstü kapalı boşluk
  danger: number; // şişe boynuna yakın dolu hücre (üst 3 satır)
  topOut: number; // şişe boynu tıkandı = oyun bitti
  effort: number; // hedefe gitmek için gereken her yatay/dönme adımı
}

export const DEFAULT_WEIGHTS: Weights = {
  virusCleared: 3000,
  pillCleared: 30,
  chain: 900,
  multiColor: 500,
  virusNeighbor: 60,
  setup3: 120,
  setup2: 10,
  coverVirus: 25,
  height: 2,
  heightSq: 0.25,
  hole: 6,
  danger: 200,
  topOut: 100000,
  effort: 0.4,
};

interface Profile {
  thinkFrames: number; // yeni kapsülde bekleme (frame)
  thinkJitter: number; // + 0..jitter rastgele
  actEvery: number; // iki tuş aksiyonu arası frame
  actJitter: number;
  topK: number; // en iyi K hamleden ağırlıklı seçim
  mistakeRate: number; // tamamen rastgele hamle olasılığı
  beam: number; // lookahead için değerlendirilecek aday sayısı (0 = kapalı)
  discount: number; // ikinci kapsülün ödül çarpanı (γ)
  weights: Weights;
}

export const PROFILES: Record<BotDifficulty, Profile> = {
  easy: {
    thinkFrames: 30, thinkJitter: 10,
    actEvery: 8, actJitter: 3,
    topK: 4, mistakeRate: 0.25,
    beam: 0, discount: 0,
    weights: { ...DEFAULT_WEIGHTS },
  },
  med: {
    thinkFrames: 12, thinkJitter: 4,
    actEvery: 5, actJitter: 1,
    topK: 2, mistakeRate: 0.03,
    beam: 3, discount: 0.6,
    weights: { ...DEFAULT_WEIGHTS },
  },
  hard: {
    thinkFrames: 4, thinkJitter: 2,
    actEvery: 2, actJitter: 0,
    topK: 1, mistakeRate: 0,
    beam: 8, discount: 0.7,
    weights: { ...DEFAULT_WEIGHTS },
  },
};

/** Motor ile entegrasyon noktaları. */
export const hooks: {
  /**
   * Mevcut tahtadaki bir kapsül yarısının eşinin yönü:
   * 0 = yok/bilinmiyor, 1 = sağda, 2 = solda, 3 = üstte, 4 = altta.
   */
  linkOf: ((board: Board, x: number, y: number) => 0 | 1 | 2 | 3 | 4) | null;
} = { linkOf: null };

// ─────────────────────────────────────────────────────────────────────────────
// Bot durumu
// ─────────────────────────────────────────────────────────────────────────────

interface Plan {
  key: number; // hedef durum anahtarı (x, y, rot) — kilitlenme konumu
  pose: Pose;
  score: number;
}

export interface BotState {
  plan: Plan | null;
  lastCapsuleId: number;
  thinkDelayLeft: number;
  actTimer: number;
  nextActIn: number;
  softDropOn: boolean;
  lastKey: number; // önceki aksiyon anındaki durum
  lastAction: number; // önceki aksiyon (-1 = yok)
  stuck: number;
  banned: Set<number>; // işe yaramayan (durum, aksiyon) çiftleri
  rng: () => number;
}

export function createBotState(seed: number = (Date.now() ^ 0x9e3779b9) >>> 0): BotState {
  return {
    plan: null,
    lastCapsuleId: -1,
    thinkDelayLeft: 0,
    actTimer: 0,
    nextActIn: 1,
    softDropOn: false,
    lastKey: -1,
    lastAction: -1,
    stuck: 0,
    banned: new Set<number>(),
    rng: mulberry32(seed),
  };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, maxInclusive: number): number {
  return maxInclusive <= 0 ? 0 : Math.floor(rng() * (maxInclusive + 1));
}

// ─────────────────────────────────────────────────────────────────────────────
// Ana giriş: her frame çağrılır
// ─────────────────────────────────────────────────────────────────────────────

const ACT = { Left: 0, Right: 1, CW: 2, CCW: 3, Down: 4 } as const;
const ACTION_INPUT: Input[] = [Input.Left, Input.Right, Input.RotateCW, Input.RotateCCW];

function releaseSoftDrop(bot: BotState): Input[] {
  if (!bot.softDropOn) return [];
  bot.softDropOn = false;
  return [Input.SoftDropOff];
}

export function tickBot(s: GameState, bot: BotState, difficulty: BotDifficulty): Input[] {
  if (s.phase !== Phase.Falling || !s.capsule) return releaseSoftDrop(bot);

  const cap = s.capsule;
  const profile = PROFILES[difficulty];
  const out: Input[] = [];

  // Yeni kapsül → her şeyi sıfırla
  if (s.capsulesDropped !== bot.lastCapsuleId) {
    bot.lastCapsuleId = s.capsulesDropped;
    bot.plan = null;
    bot.banned.clear();
    bot.stuck = 0;
    bot.lastAction = -1;
    bot.lastKey = -1;
    bot.actTimer = 0;
    bot.nextActIn = profile.actEvery;
    bot.thinkDelayLeft = profile.thinkFrames + randInt(bot.rng, profile.thinkJitter);
    out.push(...releaseSoftDrop(bot));
  }

  // Yapay düşünme süresi
  if (bot.thinkDelayLeft > 0) {
    bot.thinkDelayLeft--;
    return out;
  }

  // Tuş hızı: sadece aksiyon frame'lerinde bir şey yap (soft drop durumu korunur)
  bot.actTimer++;
  if (bot.actTimer < bot.nextActIn) return out;
  bot.actTimer = 0;
  bot.nextActIn = profile.actEvery + randInt(bot.rng, profile.actJitter);

  const pose: Pose = { x: cap.x, y: cap.y, rot: cap.rot & 3 };
  const key = keyOf(pose.x, pose.y, pose.rot);

  // Takılma tespiti: aksiyon verdik ama konum değişmediyse say, 2 kez olursa yasakla
  if (bot.lastAction >= 0 && key === bot.lastKey) {
    if (++bot.stuck >= 2) {
      bot.banned.add(key * 8 + bot.lastAction);
      bot.stuck = 0;
    }
  } else {
    bot.stuck = 0;
  }

  const sim = boardToSim(s.board);
  const res = bfs(sim, cap, pose, bot.banned);

  // Plan yoksa ya da hedef artık ulaşılamıyorsa (yeniden) planla
  if (!bot.plan || res.dist[bot.plan.key] < 0) {
    bot.plan = planFrom(sim, cap, pose, res, s, profile, bot.rng);
  }
  if (!bot.plan) return [...out, ...releaseSoftDrop(bot)]; // gidilecek yer yok → yerçekimine bırak

  const target = bot.plan;
  const act = key === target.key ? ACT.Down : res.first[target.key];
  const aligned = pose.x === target.pose.x && pose.rot === target.pose.rot;

  let wantSoft = false;
  bot.lastAction = -1;
  bot.lastKey = key;

  // Hedefe kaç satır kaldı, kaç yatay/dönme adımı gerekiyor?
  const rowsLeft = target.pose.y - pose.y;
  const effortLeft = res.dist[target.key] - rowsLeft;
  // Adımları bitirmeye yetecek kadar yükseklik varsa hareket ederken de hızlı düş
  const canRush =
    effortLeft === 0 ||
    rowsLeft >= (effortLeft * profile.actEvery) / SOFT_FRAMES_PER_ROW;

  if (act === ACT.Down) {
    wantSoft = canRush;
  } else if (act >= 0) {
    wantSoft = canRush; // soft drop'u kapatma, hareket ederken de düşsün
    out.push(ACTION_INPUT[act]);
    bot.lastAction = act;
  }

  if (wantSoft && !bot.softDropOn) {
    bot.softDropOn = true;
    out.push(Input.SoftDropOn);
  } else if (!wantSoft) {
    out.push(...releaseSoftDrop(bot));
  }
  return out;

}

// ─────────────────────────────────────────────────────────────────────────────
// Planlama
// ─────────────────────────────────────────────────────────────────────────────

interface Scored {
  key: number;
  pose: Pose;
  score: number;
  base: number; // 1. hamlenin ödülü
  effort: number;
  board: Sim; // hamle + temizleme sonrası tahta
}

function planFrom(
  sim: Sim,
  cap: Capsule,
  start: Pose,
  res: Bfs,
  s: GameState,
  profile: Profile,
  rng: () => number
): Plan | null {
  if (res.locks.length === 0) return null;
  const W = profile.weights;

  let cands: Scored[] = [];
  for (const k of res.locks) {
    const pose = poseOfKey(k);
    // Yol uzunluğu = yatay/dönme adımları + (hedef.y - başlangıç.y) kadar aşağı adım
    const effort = res.dist[k] - (pose.y - start.y);
    const board = placeCapsule(sim, withPose(cap, pose), cap.a, cap.b);
    const r = resolve(board);
    const base = reward(r, W);
    cands.push({
      key: k,
      pose,
      base,
      effort,
      board,
      score: base + posEval(board, W) - effort * W.effort,
    });
  }
  cands.sort((p, q) => q.score - p.score);

  // Lookahead: en iyi 'beam' adayı, bir sonraki kapsülle yeniden puanla
  if (profile.beam > 0 && s.nextA != null && s.nextB != null) {
    const top = cands.slice(0, profile.beam);
    for (const c of top) {
      const second = bestSecondPly(c.board, cap, s.nextA, s.nextB, W, profile.discount);
      c.score = c.base + second - c.effort * W.effort;
    }
    top.sort((p, q) => q.score - p.score);
    cands = top; // ölçekler farklı olduğu için sadece beam içinden seç
  }

  const pick = pickCandidate(cands, profile, rng);
  return { key: pick.key, pose: pick.pose, score: pick.score };
}

function pickCandidate<T>(sorted: T[], p: Profile, rng: () => number): T {
  if (p.mistakeRate > 0 && rng() < p.mistakeRate) {
    return sorted[Math.floor(rng() * sorted.length)];
  }
  const k = Math.min(p.topK, sorted.length);
  if (k <= 1) return sorted[0];
  let total = 0;
  for (let i = 0; i < k; i++) total += 1 / (i + 1);
  let r = rng() * total;
  for (let i = 0; i < k; i++) {
    r -= 1 / (i + 1);
    if (r <= 0) return sorted[i];
  }
  return sorted[0];
}

/**
 * İkinci kapsül için en iyi değer: γ·ödül2 + son tahta değerlendirmesi.
 * Bir sonraki kapsülün spawn durumunu bilmediğimiz için erişilebilirlik aranmaz,
 * doğrudan bırakma (hard drop) varsayılır.
 */
function bestSecondPly(
  board: Sim,
  proto: Capsule,
  a: number,
  b: number,
  W: Weights,
  discount: number
): number {
  const base = { ...proto, a, b } as Capsule;
  let best = -Infinity;
  for (let rot = 0; rot < 4; rot++) {
    const startY = rot === 1 || rot === 3 ? 1 : 0;
    for (let x = 0; x < COLS; x++) {
      if (!fitsAt(board, base, x, startY, rot)) continue;
      let y = startY;
      while (fitsAt(board, base, x, y + 1, rot)) y++;
      const placed = placeCapsule(board, withPose(base, { x, y, rot }), a, b);
      const r = resolve(placed);
      const v = discount * reward(r, W) + posEval(placed, W);
      if (v > best) best = v;
    }
  }
  return best === -Infinity ? -W.topOut : best;
}

// ─────────────────────────────────────────────────────────────────────────────
// Kapsül konumları + BFS (erişilebilirlik)
// ─────────────────────────────────────────────────────────────────────────────

interface Pose {
  x: number;
  y: number;
  rot: number;
}

const NSTATE = ROWS * COLS * 4;
const KICKS = [0, -1, 1];

const keyOf = (x: number, y: number, rot: number): number => ((y * COLS + x) << 2) | (rot & 3);

function poseOfKey(k: number): Pose {
  const cell = k >> 2;
  return { x: cell % COLS, y: (cell / COLS) | 0, rot: k & 3 };
}

function withPose(cap: Capsule, p: Pose): Capsule {
  return { ...cap, x: p.x, y: p.y, rot: p.rot } as Capsule;
}

function fitsAt(sim: Sim, cap: Capsule, x: number, y: number, rot: number): boolean {
  const cells = capsuleCells({ ...cap, x, y, rot } as Capsule);
  for (let i = 0; i < 4; i += 2) {
    const cx = cells[i];
    const cy = cells[i + 1];
    if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return false;
    if (sim.color[cy * COLS + cx] >= 0) return false;
  }
  return true;
}

function stepPose(sim: Sim, cap: Capsule, p: Pose, a: number): Pose | null {
  switch (a) {
    case ACT.Left:
      return fitsAt(sim, cap, p.x - 1, p.y, p.rot) ? { x: p.x - 1, y: p.y, rot: p.rot } : null;
    case ACT.Right:
      return fitsAt(sim, cap, p.x + 1, p.y, p.rot) ? { x: p.x + 1, y: p.y, rot: p.rot } : null;
    case ACT.Down:
      return fitsAt(sim, cap, p.x, p.y + 1, p.rot) ? { x: p.x, y: p.y + 1, rot: p.rot } : null;
    default: {
      const rot = (p.rot + (a === ACT.CW ? 1 : 3)) & 3;
      for (const dx of KICKS) {
        if (fitsAt(sim, cap, p.x + dx, p.y, rot)) return { x: p.x + dx, y: p.y, rot };
      }
      return null;
    }
  }
}

interface Bfs {
  dist: Int16Array; // -1 = ulaşılamaz
  first: Int8Array; // o duruma gitmek için ilk aksiyon
  locks: number[]; // aşağı gidemeyen (kilitlenecek) durumlar
}

function bfs(sim: Sim, cap: Capsule, start: Pose, banned: Set<number>): Bfs {
  const dist = new Int16Array(NSTATE).fill(-1);
  const first = new Int8Array(NSTATE).fill(-1);
  const locks: number[] = [];
  if (!fitsAt(sim, cap, start.x, start.y, start.rot)) return { dist, first, locks };

  const queue = new Int32Array(NSTATE);
  let head = 0;
  let tail = 0;
  const k0 = keyOf(start.x, start.y, start.rot);
  dist[k0] = 0;
  queue[tail++] = k0;

  while (head < tail) {
    const k = queue[head++];
    const p = poseOfKey(k);
    // Aksiyon sırası önemli: eşit uzunlukta yollarda yatay/dönme, "aşağı"dan önce seçilir
    for (let a = 0; a < 5; a++) {
      const np = stepPose(sim, cap, p, a);
      if (!np) {
        if (a === ACT.Down) locks.push(k);
        continue;
      }
      if (a !== ACT.Down && banned.size > 0 && banned.has(k * 8 + a)) continue;
      const nk = keyOf(np.x, np.y, np.rot);
      if (dist[nk] >= 0) continue;
      dist[nk] = dist[k] + 1;
      first[nk] = k === k0 ? a : first[k];
      queue[tail++] = nk;
    }
  }
  return { dist, first, locks };
}

// ─────────────────────────────────────────────────────────────────────────────
// İç tahta gösterimi + simülasyon (yerleştirme, temizleme, yerçekimi)
// ─────────────────────────────────────────────────────────────────────────────

interface Sim {
  color: Int8Array; // -1 = boş, aksi halde renk
  virus: Uint8Array; // 1 = virüs
  link: Uint8Array; // eş yarının yönü: 0 yok, 1 sağ, 2 sol, 3 üst, 4 alt
}

function boardToSim(board: Board): Sim {
  const n = COLS * ROWS;
  const color = new Int8Array(n).fill(-1);
  const virus = new Uint8Array(n);
  const link = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const c = board[i];
    if (c === EMPTY) continue;
    color[i] = colorOf(c);
    if (kindOf(c) === KIND_VIRUS) {
      virus[i] = 1;
    } else if (hooks.linkOf) {
      link[i] = hooks.linkOf(board, i % COLS, (i / COLS) | 0);
    }
  }
  return { color, virus, link };
}

function cloneSim(s: Sim): Sim {
  return { color: s.color.slice(), virus: s.virus.slice(), link: s.link.slice() };
}

function dirCode(dx: number, dy: number): number {
  if (dx === 1) return 1;
  if (dx === -1) return 2;
  if (dy === -1) return 3;
  if (dy === 1) return 4;
  return 0;
}

const LINK_DELTA = [0, 1, -1, -COLS, COLS];

function placeCapsule(sim: Sim, cap: Capsule, colorA: number, colorB: number): Sim {
  const out = cloneSim(sim);
  const cells = capsuleCells(cap);
  const xa = cells[0], ya = cells[1], xb = cells[2], yb = cells[3];
  const ia = ya * COLS + xa;
  const ib = yb * COLS + xb;
  out.color[ia] = colorA;
  out.color[ib] = colorB;
  out.virus[ia] = 0;
  out.virus[ib] = 0;
  out.link[ia] = dirCode(xb - xa, yb - ya);
  out.link[ib] = dirCode(xa - xb, ya - yb);
  return out;
}

function moveCell(sim: Sim, from: number, to: number): void {
  sim.color[to] = sim.color[from];
  sim.virus[to] = sim.virus[from];
  sim.link[to] = sim.link[from];
  sim.color[from] = -1;
  sim.virus[from] = 0;
  sim.link[from] = 0;
}

/** Yerçekimi: virüsler sabit; tekil yarılar tek başına, eşli yarılar çift olarak düşer. */
function gravity(sim: Sim): void {
  let moved = true;
  while (moved) {
    moved = false;
    for (let y = ROWS - 2; y >= 0; y--) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        if (sim.color[i] < 0 || sim.virus[i]) continue;
        const l = sim.link[i];
        if (l === 0) {
          if (sim.color[i + COLS] < 0) {
            moveCell(sim, i, i + COLS);
            moved = true;
          }
        } else if (l === 1) {
          // sağda eşi var → ikisi birlikte düşer
          if (sim.color[i + COLS] < 0 && sim.color[i + 1 + COLS] < 0) {
            moveCell(sim, i + 1, i + 1 + COLS);
            moveCell(sim, i, i + COLS);
            moved = true;
          }
        } else if (l === 3) {
          // üstte eşi var → bu alt yarı; ikisi birlikte düşer
          if (sim.color[i + COLS] < 0) {
            moveCell(sim, i, i + COLS);
            moveCell(sim, i - COLS, i);
            moved = true;
          }
        }
        // l === 2 veya 4: eşi (sol / alt yarı) bu çifti yönetir
      }
    }
  }
}

interface ResolveResult {
  virusesCleared: number;
  pillsCleared: number;
  chain: number; // kaç temizleme turu oldu
  firstColors: number; // ilk turda aynı anda silinen renk sayısı
}

/** Tahtayı yerinde günceller: dizileri sil → yerçekimi → tekrar. */
function resolve(sim: Sim): ResolveResult {
  const N = COLS * ROWS;
  const mark = new Uint8Array(N);
  let virusesCleared = 0;
  let pillsCleared = 0;
  let chain = 0;
  let firstColors = 0;

  for (; ;) {
    mark.fill(0);
    let any = false;

    for (let y = 0; y < ROWS; y++) {
      let x = 0;
      while (x < COLS) {
        const c = sim.color[y * COLS + x];
        if (c < 0) { x++; continue; }
        let e = x + 1;
        while (e < COLS && sim.color[y * COLS + e] === c) e++;
        if (e - x >= 4) {
          for (let k = x; k < e; k++) mark[y * COLS + k] = 1;
          any = true;
        }
        x = e;
      }
    }
    for (let x = 0; x < COLS; x++) {
      let y = 0;
      while (y < ROWS) {
        const c = sim.color[y * COLS + x];
        if (c < 0) { y++; continue; }
        let e = y + 1;
        while (e < ROWS && sim.color[e * COLS + x] === c) e++;
        if (e - y >= 4) {
          for (let k = y; k < e; k++) mark[k * COLS + x] = 1;
          any = true;
        }
        y = e;
      }
    }
    if (!any) break;
    chain++;

    let mask = 0;
    for (let i = 0; i < N; i++) {
      if (!mark[i]) continue;
      if (chain === 1) mask |= 1 << sim.color[i];
      if (sim.virus[i]) virusesCleared++;
      else pillsCleared++;
    }
    if (chain === 1) {
      let m = mask;
      while (m) { firstColors += m & 1; m >>= 1; }
    }

    // Silinmeyen eşlerin bağını kopar, sonra sil
    for (let i = 0; i < N; i++) {
      if (!mark[i]) continue;
      const l = sim.link[i];
      if (l) {
        const p = i + LINK_DELTA[l];
        if (!mark[p]) sim.link[p] = 0;
      }
    }
    for (let i = 0; i < N; i++) {
      if (!mark[i]) continue;
      sim.color[i] = -1;
      sim.virus[i] = 0;
      sim.link[i] = 0;
    }
    gravity(sim);
  }
  return { virusesCleared, pillsCleared, chain, firstColors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Değerlendirme
// ─────────────────────────────────────────────────────────────────────────────

function reward(r: ResolveResult, W: Weights): number {
  return (
    r.virusesCleared * W.virusCleared +
    r.pillsCleared * W.pillCleared +
    Math.max(0, r.chain - 1) * W.chain +
    (r.firstColors >= 2 ? W.multiColor : 0)
  );
}

function windowScore(sim: Sim, idx0: number, step: number, W: Weights): number {
  let c = -1;
  let n = 0;
  let empty = 0;
  for (let k = 0; k < 4; k++) {
    const v = sim.color[idx0 + k * step];
    if (v < 0) empty++;
    else if (c < 0) { c = v; n = 1; }
    else if (v === c) n++;
    else return 0; // karışık renk
  }
  if (n === 3 && empty === 1) return W.setup3;
  if (n === 2 && empty === 2) return W.setup2;
  return 0;
}

/** Temizleme sonrası (durağan) tahtanın konumsal değeri. */
function posEval(sim: Sim, W: Weights): number {
  const { color, virus } = sim;
  const n = COLS * ROWS;
  let score = 0;

  // 1. Şişe boynu: tıkanırsa oyun biter, yaklaşmak da kötüdür
  const c0 = (COLS >> 1) - 1;
  const c1 = COLS >> 1;
  if (color[c0] >= 0 || color[c1] >= 0) score -= W.topOut;
  for (let y = 1; y < 3; y++) {
    if (color[y * COLS + c0] >= 0) score -= W.danger * (3 - y);
    if (color[y * COLS + c1] >= 0) score -= W.danger * (3 - y);
  }

  // 2. Virüs başına: aynı renk komşu kapsül (+), üstüne yığılan kapsül (−)
  for (let i = 0; i < n; i++) {
    if (!virus[i]) continue;
    const x = i % COLS;
    const y = (i / COLS) | 0;
    const c = color[i];
    if (x > 0 && color[i - 1] === c && !virus[i - 1]) score += W.virusNeighbor;
    if (x < COLS - 1 && color[i + 1] === c && !virus[i + 1]) score += W.virusNeighbor;
    if (y > 0 && color[i - COLS] === c && !virus[i - COLS]) score += W.virusNeighbor;
    if (y < ROWS - 1 && color[i + COLS] === c && !virus[i + COLS]) score += W.virusNeighbor;

    let j = i - COLS;
    let cnt = 0;
    while (j >= 0 && color[j] >= 0 && !virus[j]) { cnt++; j -= COLS; }
    score -= cnt * W.coverVirus;
  }

  // 3. Kurulumlar: 4'lük pencerelerde 3+1 boş / 2+2 boş aynı renk
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x <= COLS - 4; x++) score += windowScore(sim, y * COLS + x, 1, W);
  }
  for (let y = 0; y <= ROWS - 4; y++) {
    for (let x = 0; x < COLS; x++) score += windowScore(sim, y * COLS + x, COLS, W);
  }

  // 4. Yükseklik ve delikler
  for (let x = 0; x < COLS; x++) {
    let top = -1;
    let holes = 0;
    for (let y = 0; y < ROWS; y++) {
      if (color[y * COLS + x] >= 0) {
        if (top < 0) top = y;
      } else if (top >= 0) {
        holes++;
      }
    }
    if (top >= 0) {
      const h = ROWS - top;
      score -= h * W.height + h * h * W.heightSq;
    }
    score -= holes * W.hole;
  }

  return score;
}