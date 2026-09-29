import { randomBytes } from 'node:crypto';
import type { RoomConfig, RoomPublic, PlayerPublic } from '@pill/protocol';
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

  const config: RoomConfig = {
    ...DEFAULT_ROOM_CONFIG,
    ...cfg,
    level: clamp(cfg.level ?? DEFAULT_ROOM_CONFIG.level, 0, 20),
    maxPlayers: clamp(cfg.maxPlayers ?? DEFAULT_ROOM_CONFIG.maxPlayers, 1, 200),
    detailFanout: clamp(cfg.detailFanout ?? DEFAULT_ROOM_CONFIG.detailFanout, 1, 16),
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

/** Saldırı hedefi: rastgele başka bir canlı oyuncu (1v1'de tek rakip) */
export function pickAttackTargets(room: Room, fromId: string, count: number): Player[] {
  const alive = [...room.players.values()].filter((p) => p.alive && p.id !== fromId);
  if (alive.length === 0) return [];
  if (alive.length === 1) return [alive[0]];
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

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export const allRooms = rooms;
