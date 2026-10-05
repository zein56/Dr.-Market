import { randomBytes } from 'node:crypto';
<<<<<<< HEAD
import type { RoomConfig, RoomPublic, PlayerPublic, TargetMode } from '@pill/protocol';
=======
import type { RoomConfig, RoomPublic, PlayerPublic } from '@pill/protocol';
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
import { DEFAULT_ROOM_CONFIG } from '@pill/protocol';

export interface Player {
  id: string;
  socketId: string;
  name: string;
  userId: number | null;
  ready: boolean;
  alive: boolean;
  placement: number | null;
  // maç istatistikleri
  score: number;
  viruses: number;
  maxChain: number;
  frames: number;
  lastBoard: string | null;
  lastFrame: number;
  /** anti-flood */
  attackBudget: number;
<<<<<<< HEAD
  /** saldırılarını kime yönelteceği (oyuncu seçer) */
  targetMode: TargetMode;
  /** bu oyuncuyu en son vuran kişi ('revenge' modu için) */
  lastAttackerId: string | null;
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  /** bu oyuncunun tahtasını detaylı izleyenler */
  watchers: Set<string>;
  /** bu oyuncunun izlediği rakipler */
  watching: Set<string>;
  /** yeniden bağlanma oturumu: sayfa yenilense/bağlantı kopsa da aynı oyuncu kimliğine dönmeyi sağlar */
  token: string;
  roomCode: string | null;
  connected: boolean;
  disconnectTimer: NodeJS.Timeout | null;
}

export interface Room {
  code: string;
  name: string;
  hostId: string;
  config: RoomConfig;
  players: Map<string, Player>;
  state: 'lobby' | 'playing' | 'finished';
  seed: number;
  startAt: number;
  nextPlacement: number;
  createdAt: number;
}

const rooms = new Map<string, Room>();

export function makeCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = randomBytes(5);
  for (let i = 0; i < 5; i++) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

export function createRoom(name: string, host: Player, cfg: Partial<RoomConfig>): Room {
  let code = makeCode();
  while (rooms.has(code)) code = makeCode();

<<<<<<< HEAD
  // Oda kurulurken gelen ayarlar da güncellemeyle aynı kurallardan geçer
  const config: RoomConfig = {
    ...sanitizeConfig(DEFAULT_ROOM_CONFIG, cfg),
    maxPlayers: clamp(Number(cfg.maxPlayers ?? DEFAULT_ROOM_CONFIG.maxPlayers) | 0, 1, 200),
    detailFanout: clamp(Number(cfg.detailFanout ?? DEFAULT_ROOM_CONFIG.detailFanout) | 0, 1, 16),
=======
  const config: RoomConfig = {
    ...DEFAULT_ROOM_CONFIG,
    ...cfg,
    level: clamp(cfg.level ?? DEFAULT_ROOM_CONFIG.level, 0, 20),
    maxPlayers: clamp(cfg.maxPlayers ?? DEFAULT_ROOM_CONFIG.maxPlayers, 1, 200),
    detailFanout: clamp(cfg.detailFanout ?? DEFAULT_ROOM_CONFIG.detailFanout, 1, 16),
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  };

  const room: Room = {
    code,
    name: name.slice(0, 40) || `${host.name} odası`,
    hostId: host.id,
    config,
    players: new Map([[host.id, host]]),
    state: 'lobby',
    seed: 0,
    startAt: 0,
    nextPlacement: 1,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  host.roomCode = code;
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function deleteRoom(code: string) {
  rooms.delete(code);
}

export function listRooms(): RoomPublic[] {
  return [...rooms.values()]
    .filter((r) => r.state !== 'finished' && r.players.size > 0)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 40)
    .map(toPublic);
}

export function toPublic(r: Room): RoomPublic {
  return {
    code: r.code,
    name: r.name,
    hostId: r.hostId,
    config: r.config,
    state: r.state,
    playerCount: r.players.size,
    players: [...r.players.values()].slice(0, 60).map(playerPublic),
  };
}

export function playerPublic(p: Player): PlayerPublic {
  return { id: p.id, name: p.name, ready: p.ready, alive: p.alive, placement: p.placement };
}

export function newPlayer(socketId: string, name: string, userId: number | null): Player {
  const p: Player = {
    id: randomBytes(8).toString('hex'),
    socketId,
    name: name.slice(0, 16) || 'Oyuncu',
    userId,
    ready: false,
    alive: true,
    placement: null,
    score: 0,
    viruses: 0,
    maxChain: 0,
    frames: 0,
    lastBoard: null,
    lastFrame: 0,
    attackBudget: 0,
<<<<<<< HEAD
    targetMode: 'random',
    lastAttackerId: null,
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
    watchers: new Set(),
    watching: new Set(),
    token: randomBytes(16).toString('hex'),
    roomCode: null,
    connected: true,
    disconnectTimer: null,
  };
  sessions.set(p.token, p);
  return p;
}

/**
 * Oturum tablosu: token -> Player. Sayfa yenilense ya da bağlantı kısa süreliğine
 * kopsa da aynı oyuncu kimliğine (isim, skor, oda) dönmeyi sağlar.
 * Not: v1'de girişler asla silinmiyor — üretimde uzun süre boşta kalan
 * oturumlar için bir TTL/temizlik eklenmeli.
 */
const sessions = new Map<string, Player>();

export function getSession(token: string): Player | undefined {
  return sessions.get(token);
}

/**
 * İlgi yönetimi: her oyuncuya en fazla detailFanout kadar rakip ata.
 * Halka şeklinde dağıtım — büyük odalarda O(n) trafik sağlar, O(n²) değil.
 */
export function assignWatchlists(room: Room) {
  const alive = [...room.players.values()].filter((p) => p.alive);
  for (const p of room.players.values()) {
    p.watching.clear();
    p.watchers.clear();
  }
  if (alive.length < 2) return;

  const fanout = Math.min(room.config.detailFanout, alive.length - 1);
  for (let i = 0; i < alive.length; i++) {
    const me = alive[i];
    for (let k = 1; k <= fanout; k++) {
      const target = alive[(i + k) % alive.length];
      if (target.id === me.id) continue;
      me.watching.add(target.id);
      target.watchers.add(me.id);
    }
  }
}

<<<<<<< HEAD
/**
 * Saldırı hedefi seçimi.
 *  - random : hayatta olan rastgele rakip(ler) (1v1'de tek rakip)
 *  - leader : galibiyete en yakın (en az virüsü kalan) rakip; henüz tahta bildirmemiş
 *             oyuncular "lider" sayılmaz. Eşitlikte rastgele.
 *  - revenge: seni en son vuran rakip; hayatta değilse rastgele.
 */
export function pickAttackTargets(
  room: Room,
  fromId: string,
  count: number,
  mode: TargetMode = 'random',
  lastAttackerId: string | null = null
): Player[] {
  const alive = [...room.players.values()].filter((p) => p.alive && p.id !== fromId);
  if (alive.length === 0) return [];
  if (alive.length === 1) return [alive[0]];

  if (mode === 'revenge' && lastAttackerId) {
    const avenge = alive.find((p) => p.id === lastAttackerId);
    if (avenge) return [avenge];
  }

  if (mode === 'leader') {
    const score = (p: Player) => (p.lastBoard == null ? Infinity : p.viruses);
    const best = Math.min(...alive.map(score));
    if (best !== Infinity) {
      const leaders = alive.filter((p) => score(p) === best);
      return [leaders[(Math.random() * leaders.length) | 0]];
    }
  }

=======
/** Saldırı hedefi: rastgele başka bir canlı oyuncu (1v1'de tek rakip) */
export function pickAttackTargets(room: Room, fromId: string, count: number): Player[] {
  const alive = [...room.players.values()].filter((p) => p.alive && p.id !== fromId);
  if (alive.length === 0) return [];
  if (alive.length === 1) return [alive[0]];
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  const picked: Player[] = [];
  for (let i = 0; i < Math.min(count, alive.length); i++) {
    picked.push(alive[(Math.random() * alive.length) | 0]);
  }
  return [...new Set(picked)];
}

export function aliveCount(room: Room): number {
  let n = 0;
  for (const p of room.players.values()) if (p.alive) n++;
  return n;
}

<<<<<<< HEAD
/**
 * Dışarıdan gelen oda ayarlarını güvenli biçimde `base` üzerine işler.
 * Sadece bilinen alanlar alınır, sayılar sınırlanır, bozuk değerler yok sayılır.
 * (maxPlayers ve detailFanout oda kurulurken createRoom içinde ayrıca sınırlanır.)
 */
export function sanitizeConfig(base: RoomConfig, c: any): RoomConfig {
  c = c && typeof c === 'object' ? c : {};
  const num = (v: any, lo: number, hi: number, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? clamp(n | 0, lo, hi) : fallback;
  };
  const bool = (v: any, fallback: boolean | undefined) => (v != null ? !!v : fallback);

  return {
    ...base,
    level: num(c.level, 0, 20, base.level),
    speed: ['low', 'med', 'hi'].includes(c.speed) ? c.speed : base.speed,
    colors: num(c.colors, 3, 10, base.colors),
    diagMatches: bool(c.diagMatches, base.diagMatches),
    counterEnabled: bool(c.counterEnabled, base.counterEnabled),
    powerupsEnabled: bool(c.powerupsEnabled, base.powerupsEnabled),
    powerupFreq: num(c.powerupFreq, 1, 10, base.powerupFreq ?? 5),
    lockStacking: bool(c.lockStacking, base.lockStacking),
    lockMaxStack: num(c.lockMaxStack, 2, 10, base.lockMaxStack ?? 3),
    bombEnabled: bool(c.bombEnabled, base.bombEnabled),
    bombThreshold: num(c.bombThreshold, 4, 8, base.bombThreshold ?? 5),
    aoeEnabled: bool(c.aoeEnabled, base.aoeEnabled),
    aoeThreshold: num(c.aoeThreshold, 5, 8, base.aoeThreshold ?? 5),
    missPenaltyEnabled: bool(c.missPenaltyEnabled, base.missPenaltyEnabled),
    missPenaltyThreshold: num(c.missPenaltyThreshold, 3, 10, base.missPenaltyThreshold ?? 3),
    normalAttackEnabled: bool(c.normalAttackEnabled, base.normalAttackEnabled),
    normalAttackLen: num(c.normalAttackLen, 4, 8, base.normalAttackLen ?? 4),
    normalAttackRequireCombo: bool(c.normalAttackRequireCombo, base.normalAttackRequireCombo),
    stoneAttackEnabled: bool(c.stoneAttackEnabled, base.stoneAttackEnabled),
    stoneAttackLen: num(c.stoneAttackLen, 4, 8, base.stoneAttackLen ?? 5),
    stoneAttackRequireCombo: bool(c.stoneAttackRequireCombo, base.stoneAttackRequireCombo),
    lockAttackEnabled: bool(c.lockAttackEnabled, base.lockAttackEnabled),
    lockAttackLen: num(c.lockAttackLen, 4, 8, base.lockAttackLen ?? 6),
    lockAttackRequireCombo: bool(c.lockAttackRequireCombo, base.lockAttackRequireCombo),
  };
}

/** Bot olmayan ilk oyuncu (ev sahibi devri için). Yoksa undefined. */
export function firstHumanId(room: Room): string | undefined {
  for (const p of room.players.values()) if (!(p as any).isBot) return p.id;
  return undefined;
}

=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export const allRooms = rooms;
