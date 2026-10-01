/**
 * Sunucu tarafı Dr. Mario botu.
 *
 * Bot, gerçek bir oyuncu gibi odaya eklenir ve her frame game-core ile simüle edilir.
 * setInterval ile FPS hızında adım atar, ağa board_sync / attack / finished gönderir.
 *
 * Mimari:
 *  - BotRunner: tek bir botun tüm döngüsünü yönetir
 *  - startBotInRoom: oda başlatılınca çağrılır, her bot için bir BotRunner oluşturur
 *  - stopBotsInRoom: maç bitince çağrılır
 */

import {
  createGame,
  step,
  isOver,
  queueGarbage,
  encodeBoard,
  capsuleCells,
  Phase,
  Input,
  COLS,
  ROWS,
  EMPTY,
  colorOf,
  kindOf,
  KIND_VIRUS,
  type GameState,
  type Board,
  type Capsule,
  type AttackInfo,
} from '@pill/game-core';
import type { Server } from 'socket.io';
import type { Room, Player } from './rooms';
import { playerPublic, pickAttackTargets } from './rooms';
import { randomBytes } from 'node:crypto';

export type BotDifficulty = 'easy' | 'med' | 'hard';

const FPS = 60;
const STEP_MS = 1000 / FPS;

// Oda kodu → BotRunner listesi
const roomBots = new Map<string, BotRunner[]>();

export function startBotsInRoom(io: Server, room: Room) {
  const bots: BotRunner[] = [];
  for (const p of room.players.values()) {
    if ((p as any).isBot) {
      const difficulty: BotDifficulty = (p as any).botDifficulty ?? 'med';
      const runner = new BotRunner(io, room, p, difficulty);
      runner.start();
      bots.push(runner);
    }
  }
  if (bots.length > 0) roomBots.set(room.code, bots);
}

export function stopBotsInRoom(roomCode: string) {
  const bots = roomBots.get(roomCode);
  if (bots) {
    for (const b of bots) b.stop();
    roomBots.delete(roomCode);
  }
}

// Bot player factory — Player nesnesini taklit eder
export function createBotPlayer(difficulty: BotDifficulty, index: number): Player {
  const id = randomBytes(8).toString('hex');
  const p: Player = {
    id,
    socketId: `bot:${id}`,
    name: `🤖 Bot ${index + 1} (${difficulty === 'easy' ? 'Kolay' : difficulty === 'med' ? 'Orta' : 'Zor'})`,
    userId: null,
    ready: true,
    alive: true,
    placement: null,
    score: 0,
    viruses: 0,
    maxChain: 0,
    frames: 0,
    lastBoard: null,
    lastFrame: 0,
    attackBudget: 0,
    targetMode: 'random',
    lastAttackerId: null,
    watchers: new Set(),
    watching: new Set(),
    token: randomBytes(16).toString('hex'),
    roomCode: null,
    connected: true,
    disconnectTimer: null,
  };
  (p as any).isBot = true;
  (p as any).botDifficulty = difficulty;
  return p;
}

// ─── BotRunner ────────────────────────────────────────────────────────────────

class BotRunner {
  private state: GameState | null = null;
  private timer: NodeJS.Timeout | null = null;
  private acc = 0;
  private lastTs = 0;
  private finished = false;
  private pendingAttack: AttackInfo = { normal: 0, stone: 0, lock: 0 };
  private lastSyncTs = 0;
  private botMoveState = createServerBotState();

  constructor(
    private io: Server,
    private room: Room,
    private player: Player,
    private difficulty: BotDifficulty
  ) {}

  start() {
    const cfg = {
      seed: this.room.seed ^ parseInt(this.player.id.slice(0, 8), 16),
      level: this.room.config.level,
      speed: this.room.config.speed,
      diagMatches: this.room.config.diagMatches,
      counterEnabled: this.room.config.counterEnabled,
      powerupsEnabled: this.room.config.powerupsEnabled,
      aoeEnabled: this.room.config.aoeEnabled,
      aoeThreshold: this.room.config.aoeThreshold,
      missPenaltyEnabled: this.room.config.missPenaltyEnabled,
      missPenaltyThreshold: this.room.config.missPenaltyThreshold,
      normalAttackEnabled: this.room.config.normalAttackEnabled,
      normalAttackLen: this.room.config.normalAttackLen,
      normalAttackRequireCombo: this.room.config.normalAttackRequireCombo,
      stoneAttackEnabled: this.room.config.stoneAttackEnabled,
      stoneAttackLen: this.room.config.stoneAttackLen,
      stoneAttackRequireCombo: this.room.config.stoneAttackRequireCombo,
      lockAttackEnabled: this.room.config.lockAttackEnabled,
      lockAttackLen: this.room.config.lockAttackLen,
      lockAttackRequireCombo: this.room.config.lockAttackRequireCombo,
      colors: this.room.config.colors,
    };
    this.state = createGame(cfg);
    this.player.viruses = this.state.virusesLeft;
    this.lastTs = Date.now();
    this.lastSyncTs = Date.now();

    // ~60fps interval (setInterval 16ms)
    this.timer = setInterval(() => this.tick(), 16);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private tick() {
    if (!this.state || this.finished) return;

    const now = Date.now();
    let dt = now - this.lastTs;
    this.lastTs = now;
    if (dt > 200) dt = 200;
    this.acc += dt;

    let steps = 0;
    while (this.acc >= STEP_MS && steps < 8) {
      this.acc -= STEP_MS;
      steps++;

      // AI kararı
      const inputs = tickServerBot(this.state, this.botMoveState, this.difficulty);
      step(this.state, inputs);

      if (this.state.attackOut) {
        this.pendingAttack.normal += this.state.attackOut.normal;
        this.pendingAttack.stone += this.state.attackOut.stone;
        this.pendingAttack.lock += this.state.attackOut.lock;
        this.state.attackOut = null;
      }

      if (isOver(this.state) && !this.finished) {
        this.finished = true;
        this.finalize();
        return;
      }
    }

    // Saldırı gönder
    if (this.pendingAttack.normal > 0 || this.pendingAttack.stone > 0 || this.pendingAttack.lock > 0) {
      this.emitAttack(this.pendingAttack);
      this.pendingAttack = { normal: 0, stone: 0, lock: 0 };
    }

    // Saniyede 1 board sync
    if (now - this.lastSyncTs > 1000 && !this.finished) {
      this.lastSyncTs = now;
      const s = this.state;
      this.player.lastBoard = encodeBoard(s.board);
      this.player.lastFrame = s.frame;
      this.player.viruses = s.virusesLeft;
      this.player.score = s.score;

      for (const watcherId of this.player.watchers) {
        const w = this.room.players.get(watcherId);
        if (!w) continue;
        this.io.to(w.socketId).emit('peer_board', {
          id: this.player.id,
          frame: s.frame,
          board: this.player.lastBoard,
          viruses: s.virusesLeft,
        });
      }
    }
  }

  /** Dışarıdan çöp kapsülü ekle (rakip saldırısı) */
  receiveGarbage(attack: AttackInfo, seed: number) {
    if (this.state && !isOver(this.state)) {
      queueGarbage(this.state, attack, seed);
    }
  }

  private emitAttack(attack: AttackInfo) {
    const s = this.state!;
    // Hedef: oyuncularla aynı kurallarla seçilir (eskiden hep listedeki ilk canlı oyuncuydu,
    // bu da botların aynı kişiye yüklenmesine yol açıyordu).
    const target = pickAttackTargets(this.room, this.player.id, 1, this.player.targetMode, this.player.lastAttackerId)[0];
    if (!target) return;
    target.lastAttackerId = this.player.id;
    const seed = (Math.random() * 0xffffffff) >>> 0;

    // Eğer hedef de bir bot ise, direkt queueGarbage
    if ((target as any).isBot) {
      const runners = roomBots.get(this.room.code) ?? [];
      const tr = runners.find(r => r.player.id === target.id);
      tr?.receiveGarbage(attack, seed);
    } else {
      this.io.to(target.socketId).emit('incoming_attack', {
        fromId: this.player.id,
        attack,
        seed,
      });
    }
  }

  private finalize() {
    this.stop();
    const s = this.state!;
    const won = s.phase === Phase.Won;

    this.player.alive = false;
    this.player.score = s.score;
    this.player.maxChain = s.maxChain;
    this.player.frames = s.frame;

    if (won) {
      this.player.placement = this.room.nextPlacement++;
    } else {
      const alive = [...this.room.players.values()].filter(p => p.alive).length;
      this.player.placement = Math.max(1, alive + 1);
    }

    this.io.to(this.room.code).emit('player_out', { id: this.player.id, placement: this.player.placement });

    // Maç bitti mi?
    const aliveLeft = [...this.room.players.values()].filter(p => p.alive).length;
    if (aliveLeft <= (this.room.players.size > 1 ? 1 : 0)) {
      // socket.ts'deki endMatch'i çağırmak için event fırlat (circular dep yok)
      (this.room as any).__botEndRequested = true;
    }
  }
}

// ─── Sunucu bot AI (game-core import'u @pill/game-core üzerinden) ─────────────

interface ServerBotState {
  lastCapsuleId: number;
  planned: { targetX: number; targetRot: number } | null;
  thinkDelayLeft: number;
  stepCount: number;
}

function createServerBotState(): ServerBotState {
  return { lastCapsuleId: -1, planned: null, thinkDelayLeft: 0, stepCount: 0 };
}

function tickServerBot(s: GameState, bs: ServerBotState, diff: BotDifficulty): Input[] {
  if (s.phase !== Phase.Falling || !s.capsule) return [];

  const capsuleId = s.capsulesDropped;
  if (capsuleId !== bs.lastCapsuleId) {
    bs.lastCapsuleId = capsuleId;
    bs.stepCount = 0;
    bs.thinkDelayLeft = diff === 'easy' ? 30 : diff === 'med' ? 12 : 4;
    bs.planned = null;
  }

  if (bs.thinkDelayLeft > 0) { bs.thinkDelayLeft--; return []; }

  if (!bs.planned) {
    const cap = s.capsule;
    if (diff === 'easy' && Math.random() < 0.4) {
      bs.planned = serverRandomMove(s.board, cap.a, cap.b);
    } else if (diff === 'hard') {
      bs.planned = serverBestMoveWithLookahead(s);
    } else {
      bs.planned = serverBestMove(s.board, cap.a, cap.b);
    }
  }

  const plan = bs.planned!;
  const cap = s.capsule;
  const inputs: Input[] = [];

  bs.stepCount++;
  const moveSpeed = diff === 'hard' ? 2 : diff === 'med' ? 5 : 8;
  const canAct = (bs.stepCount % moveSpeed === 0);

  if (!canAct) {
    return [Input.SoftDropOff];
  }

  const curRot = cap.rot & 3;
  const tgtRot = plan.targetRot & 3;
  const rotDiff = (tgtRot - curRot + 4) % 4;
  
  if (rotDiff === 1) inputs.push(Input.RotateCW);
  else if (rotDiff === 3) inputs.push(Input.RotateCCW);
  else if (rotDiff === 2) inputs.push(Input.RotateCW);

  const [cx] = capsuleCells(cap);
  const tx = plan.targetX;
  
  if (cx < tx) {
    inputs.push(Input.Right);
    inputs.push(Input.SoftDropOff);
  } else if (cx > tx) {
    inputs.push(Input.Left);
    inputs.push(Input.SoftDropOff);
  } else {
    // Doğru kolondayız.
    if (rotDiff === 0) {
      // Hem doğru kolon hem doğru rotasyon -> Yavaşça düşür
      inputs.push(Input.SoftDropOn);
    } else {
      inputs.push(Input.SoftDropOff);
    }
  }

  return inputs;
}

// --- Board değerlendirme ---

function serverBestMove(board: Board, colorA: number, colorB: number): { targetX: number; targetRot: number } {
  let best = { targetX: COLS / 2 | 0, targetRot: 0, score: -Infinity };
  for (let rot = 0; rot < 4; rot++) {
    const startY = (rot === 1 || rot === 3) ? 1 : 0;
    for (let x = 0; x < COLS; x++) {
      const fakeCap: Capsule = { x, y: startY, rot, a: colorA, b: colorB };
      if (!serverCanFit(board, fakeCap)) continue;
      const b2 = serverSimulate(board, fakeCap, colorA, colorB);
      const score = serverEval(b2);
      if (score > best.score) best = { targetX: x, targetRot: rot, score };
    }
  }
  return best;
}

function serverBestMoveWithLookahead(s: GameState): { targetX: number; targetRot: number } {
  let best = { targetX: COLS / 2 | 0, targetRot: 0, score: -Infinity };
  const cap = s.capsule!;
  for (let rot = 0; rot < 4; rot++) {
    const startY = (rot === 1 || rot === 3) ? 1 : 0;
    for (let x = 0; x < COLS; x++) {
      const fakeCap: Capsule = { x, y: startY, rot, a: cap.a, b: cap.b };
      if (!serverCanFit(s.board, fakeCap)) continue;
      const b2 = serverSimulate(s.board, fakeCap, cap.a, cap.b);
      const next = serverBestMove(b2, s.nextA, s.nextB);
      const nextStartY = (next.targetRot === 1 || next.targetRot === 3) ? 1 : 0;
      const b3 = serverSimulate(b2, { x: next.targetX, y: nextStartY, rot: next.targetRot, a: s.nextA, b: s.nextB }, s.nextA, s.nextB);
      const score = serverEval(b2) + serverEval(b3) * 0.4;
      if (score > best.score) best = { targetX: x, targetRot: rot, score };
    }
  }
  return best;
}

function serverRandomMove(board: Board, colorA: number, colorB: number): { targetX: number; targetRot: number } {
  const candidates: { targetX: number; targetRot: number }[] = [];
  for (let rot = 0; rot < 4; rot++) {
    const startY = (rot === 1 || rot === 3) ? 1 : 0;
    for (let x = 0; x < COLS; x++) {
      const c: Capsule = { x, y: startY, rot, a: colorA, b: colorB };
      if (serverCanFit(board, c)) candidates.push({ targetX: x, targetRot: rot });
    }
  }
  return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : { targetX: COLS / 2 | 0, targetRot: 0 };
}

function serverCanFit(board: Board, cap: Capsule): boolean {
  const cells = capsuleCells(cap);
  for (let i = 0; i < 4; i += 2) {
    const cx = cells[i], cy = cells[i + 1];
    if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return false;
    if (board[cy * COLS + cx] !== EMPTY) return false;
  }
  return true;
}

function serverSimulate(board: Board, cap: Capsule, colorA: number, colorB: number): Board {
  const b = new Uint8Array(board);
  let c = { ...cap };
  for (let dy = 1; dy < ROWS; dy++) {
    const next = { ...c, y: cap.y + dy };
    const cells = capsuleCells(next);
    let ok = true;
    for (let i = 0; i < 4; i += 2) {
      const cx = cells[i], cy = cells[i + 1];
      if (cy >= ROWS || (cy >= 0 && b[cy * COLS + cx] !== EMPTY)) { ok = false; break; }
    }
    if (ok) c = next; else break;
  }
  const placed = capsuleCells(c);
  for (let i = 0; i < 4; i += 2) {
    const cx = placed[i], cy = placed[i + 1];
    if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS) b[cy * COLS + cx] = 1 + (i === 0 ? colorA : colorB);
  }
  return b;
}

function serverEval(board: Board): number {
  let score = 0;
  // Eşleşmeler çok yüksek ödül
  score += countServerMatches(board) * 1000;

  // Virüs-aynı renk komşuluğu
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]] as const;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = board[y * COLS + x];
      if (!c || kindOf(c) !== KIND_VIRUS) continue;
      const vc = colorOf(c);
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        const n = board[ny * COLS + nx];
        if (n && kindOf(n) !== KIND_VIRUS && colorOf(n) === vc) score += 120;
      }
    }
  }

  // Virüsün üstüne blok koymaktan kaçın
  for (let x = 0; x < COLS; x++) {
    let virusRow = -1;
    for (let y = ROWS - 1; y >= 0; y--) {
      const c = board[y * COLS + x];
      if (c && kindOf(c) === KIND_VIRUS) { virusRow = y; break; }
    }
    if (virusRow < 0) continue;
    for (let y = 0; y < virusRow; y++) {
      const c = board[y * COLS + x];
      if (c && kindOf(c) !== KIND_VIRUS) score -= 50;
    }
  }

  // Yükseklik
  let h = 0;
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (board[y * COLS + x] !== EMPTY) { h += ROWS - y; break; }
    }
  }
  score -= h * 2;

  // Renk uyumu
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS - 1; x++) {
      const a = board[y * COLS + x], b = board[y * COLS + x + 1];
      if (a && b && colorOf(a) === colorOf(b) && kindOf(a) !== KIND_VIRUS && kindOf(b) !== KIND_VIRUS) score += 10;
    }
  }
  return score;
}

function countServerMatches(board: Board): number {
  let g = 0;
  for (let y = 0; y < ROWS; y++) {
    let run = 1;
    for (let x = 1; x <= COLS; x++) {
      const cur = x < COLS ? board[y * COLS + x] : EMPTY;
      const prev = board[y * COLS + (x - 1)];
      if (cur && prev && colorOf(cur) === colorOf(prev)) run++;
      else { if (run >= 4) g++; run = 1; }
    }
  }
  for (let x = 0; x < COLS; x++) {
    let run = 1;
    for (let y = 1; y <= ROWS; y++) {
      const cur = y < ROWS ? board[y * COLS + x] : EMPTY;
      const prev = board[(y - 1) * COLS + x];
      if (cur && prev && colorOf(cur) === colorOf(prev)) run++;
      else { if (run >= 4) g++; run = 1; }
    }
  }
  return g;
}
