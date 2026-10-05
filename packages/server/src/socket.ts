import type { Server, Socket } from 'socket.io';
import type { AttackInfo, TargetMode } from '@pill/protocol';
import { TARGET_MODES } from '@pill/protocol';
import {
  Room,
  Player,
  createRoom,
  getRoom,
  listRooms,
  toPublic,
  newPlayer,
  deleteRoom,
  assignWatchlists,
  pickAttackTargets,
  aliveCount,
  playerPublic,
  allRooms,
  getSession,
  sanitizeConfig,
  firstHumanId,
} from './rooms';
import { upsertUser, saveMatch } from './db';
import { createBotPlayer, startBotsInRoom, stopBotsInRoom } from './bot';

interface SocketData {
  player?: Player;
  room?: Room;
}

const summaryTimers = new Map<string, NodeJS.Timeout>();

export function attachSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;

    socket.on('hello', async (msg: { name: string; token?: string }) => {
      // yeniden bağlanma: geçerli bir token verildiyse aynı oyuncu kimliğine dön
      const existing = msg?.token ? getSession(msg.token) : undefined;
      if (existing) {
        existing.socketId = socket.id;
        existing.connected = true;
        if (existing.disconnectTimer) {
          clearTimeout(existing.disconnectTimer);
          existing.disconnectTimer = null;
        }
        data.player = existing;
        socket.emit('hello_ok', { playerId: existing.id, token: existing.token });

        const room = existing.roomCode ? getRoom(existing.roomCode) : undefined;
        if (room) {
          data.room = room;
          socket.join(room.code);
          if (room.state === 'playing' && existing.alive && existing.lastBoard) {
            // maçın ortasındaydı — son bilinen tahtasından devam ettir
            socket.emit('resume_state', {
              seed: room.seed,
              config: room.config,
              frame: existing.lastFrame,
              board: existing.lastBoard,
              viruses: existing.viruses,
              score: existing.score,
              players: [...room.players.values()].map(playerPublic),
              hostId: room.hostId,
            });
          } else {
            broadcastRoom(io, room);
          }
        } else {
          socket.emit('room_list', { rooms: listRooms() });
        }
        return;
      }

      const name = String(msg?.name ?? '').trim().slice(0, 16) || 'Oyuncu';
      const userId = await upsertUser(name);
      const p = newPlayer(socket.id, name, userId);
      data.player = p;
      socket.emit('hello_ok', { playerId: p.id, token: p.token });
      socket.emit('room_list', { rooms: listRooms() });
    });

    socket.on('room_list', () => {
      socket.emit('room_list', { rooms: listRooms() });
    });

    socket.on('room_create', (msg: { name: string; config: any }) => {
      const p = data.player;
      if (!p) return err(socket, 'Önce bağlan');
      leaveCurrentRoom(io, socket);
      const room = createRoom(String(msg?.name ?? ''), p, msg?.config ?? {});
      data.room = room;
      socket.join(room.code);
      broadcastRoom(io, room);
      io.emit('room_list', { rooms: listRooms() });
    });

    socket.on('room_join', (msg: { code: string }) => {
      const p = data.player;
      if (!p) return err(socket, 'Önce bağlan');
      const room = getRoom(String(msg?.code ?? ''));
      if (!room) return err(socket, 'Oda bulunamadı');
      if (room.state === 'playing') return err(socket, 'Maç başlamış, bitmesini bekle');
      if (room.players.size >= room.config.maxPlayers) return err(socket, 'Oda dolu');

      leaveCurrentRoom(io, socket);
      room.players.set(p.id, p);
      p.roomCode = room.code;
      data.room = room;
      socket.join(room.code);
      broadcastRoom(io, room);
    });

    socket.on('room_leave', () => {
      leaveCurrentRoom(io, socket);
      // ayrı event: client sadece bunu dinleyerek lobby'e döner
      socket.emit('left_room', {});
      socket.emit('room_list', { rooms: listRooms() });
    });

    socket.on('ready', (msg: { ready: boolean }) => {
      const { player: p, room } = data;
      if (!p || !room || room.state !== 'lobby') return;
      p.ready = !!msg?.ready;
      broadcastRoom(io, room);
    });

    socket.on('room_config_update', (msg: { config: any }) => {
      const { player: p, room } = data;
      if (!p || !room || room.state !== 'lobby') return;
      if (room.hostId !== p.id) return err(socket, 'Sadece oda sahibi ayarları değiştirebilir');
      const c = msg?.config ?? {};
      // Güvenli merge: sadece izin verilen alanlar, sınırlanmış değerlerle
      room.config = sanitizeConfig(room.config, c);
      broadcastRoom(io, room);
      io.emit('room_list', { rooms: listRooms() });
    });

    socket.on('start', () => {
      const { player: p, room } = data;
      if (!p || !room) return;
      if (room.hostId !== p.id) return err(socket, 'Maçı sadece oda sahibi başlatır');
      if (room.state !== 'lobby') return;
      startMatch(io, room);
    });

    socket.on('add_bot', (msg: { difficulty?: string }) => {
      const { player: p, room } = data;
      if (!p || !room) return;
      if (room.hostId !== p.id) return err(socket, 'Sadece oda sahibi bot ekleyebilir');
      if (room.state !== 'lobby') return err(socket, 'Maç başlamadan bot ekle');
      if (room.players.size >= room.config.maxPlayers) return err(socket, 'Oda dolu');
      const diff = (['easy', 'med', 'hard'].includes(msg?.difficulty ?? '')) ? msg.difficulty as any : 'med';
      const botCount = [...room.players.values()].filter(p2 => (p2 as any).isBot).length;
      const bot = createBotPlayer(diff, botCount);
      bot.roomCode = room.code;
      room.players.set(bot.id, bot);
      broadcastRoom(io, room);
      io.emit('room_list', { rooms: listRooms() });
    });

    socket.on('remove_bot', () => {
      const { player: p, room } = data;
      if (!p || !room) return;
      if (room.hostId !== p.id) return err(socket, 'Sadece oda sahibi bot silebilir');
      if (room.state !== 'lobby') return;
      // Son eklenen botu sil
      const bots = [...room.players.values()].filter(p2 => (p2 as any).isBot);
      if (bots.length === 0) return;
      room.players.delete(bots[bots.length - 1].id);
      broadcastRoom(io, room);
      io.emit('room_list', { rooms: listRooms() });
    });

    // ---- maç içi ----

    socket.on('board_sync', (msg: { frame: number; board: string; viruses: number; score: number }) => {
      const { player: p, room } = data;
      if (!p || !room || room.state !== 'playing') return;
      if (typeof msg?.board !== 'string' || msg.board.length > 512) return;
      p.lastBoard = msg.board;
      p.lastFrame = msg.frame | 0;
      p.viruses = Math.max(0, msg.viruses | 0);
      p.score = Math.max(0, msg.score | 0);
      p.frames = msg.frame | 0;

      // sadece bu oyuncuyu izleyenlere gönder
      for (const watcherId of p.watchers) {
        const w = room.players.get(watcherId);
        if (!w) continue;
        io.to(w.socketId).emit('peer_board', {
          id: p.id,
          frame: p.lastFrame,
          board: p.lastBoard,
          viruses: p.viruses,
        });
      }
    });

    socket.on('attack', (msg: { frame: number; attack: AttackInfo }) => {
      const { player: p, room } = data;
      if (!p || !room || room.state !== 'playing' || !p.alive) return;
      const atk = msg?.attack;
      if (!atk) return;
      const normal = Math.max(0, Math.min(20, atk.normal | 0));
      const stone = Math.max(0, Math.min(20, atk.stone | 0));
      const lock = Math.max(0, Math.min(20, atk.lock | 0));
      const amount = normal + stone + lock;
      if (amount === 0) return;

      // kaba hız sınırı: saniyede en fazla 12 çöp
      p.attackBudget += amount;
      if (p.attackBudget > 120) return;

      const targets = pickAttackTargets(room, p.id, 1, p.targetMode, p.lastAttackerId);
      for (const t of targets) {
        t.lastAttackerId = p.id;
        io.to(t.socketId).emit('incoming_attack', {
          fromId: p.id,
          attack: { normal, stone, lock },
          seed: (Math.random() * 0xffffffff) >>> 0,
        });
      }
    });

    socket.on('set_target', (msg: { mode: TargetMode }) => {
      const { player: p } = data;
      if (!p) return;
      if (TARGET_MODES.includes(msg?.mode)) p.targetMode = msg.mode;
    });

    socket.on('finished', (msg: { frame: number; won: boolean; score: number; viruses: number; maxChain: number }) => {
      const { player: p, room } = data;
      if (!p || !room || room.state !== 'playing' || !p.alive) return;

      // Sunucu simülasyonu çalıştırmadığı için tam doğrulama yapamaz (bkz. README
      // "replay doğrulaması"); ama bariz sahte galibiyet iddialarını eler:
      //  - kazandım diyen oyuncunun virüs sayısı 0 olmalı
      //  - bildirilen kare sayısı, maçın başlangıcından beri geçen süreden fazla olamaz
      const claimedFrame = Math.max(0, msg?.frame | 0);
      const maxFrame = ((Date.now() - room.startAt) / 1000) * 60 + 120; // 2 sn tolerans
      const plausible = claimedFrame <= maxFrame;
      const won = !!msg?.won && plausible && (msg?.viruses | 0) === 0;

      eliminatePlayer(io, room, p, {
        won,
        score: Math.max(0, Math.min(10_000_000, msg?.score | 0)),
        maxChain: Math.max(0, Math.min(200, msg?.maxChain | 0)),
      });
    });

    socket.on('game_pause', () => {
      const { player: p, room } = data;
      if (!p || !room || room.state !== 'playing') return;
      if (room.hostId !== p.id) return err(socket, 'Sadece oda sahibi duraklatabilir');
      io.to(room.code).emit('game_paused', { byId: p.id });
    });

    socket.on('game_resume', () => {
      const { player: p, room } = data;
      if (!p || !room || room.state !== 'playing') return;
      if (room.hostId !== p.id) return err(socket, 'Sadece oda sahibi devam ettirebilir');
      io.to(room.code).emit('game_resumed', { byId: p.id });
    });

    socket.on('chat', (msg: { text: string }) => {
      const { player: p, room } = data;
      if (!p || !room) return;
      const text = String(msg?.text ?? '').slice(0, 200).trim();
      if (!text) return;
      io.to(room.code).emit('chat', { id: p.id, name: p.name, text, at: Date.now() });
    });

    socket.on('ping', (msg: { t0: number }) => {
      socket.emit('pong', { t0: msg?.t0 ?? 0, t1: Date.now() });
    });

    socket.on('disconnect', () => {
      const { player: p, room } = data;
      if (p && room && room.state === 'playing' && p.alive) {
        // maç ortasında kopan oyuncuya geri dönmesi için bir pencere tanı;
        // hemen elenmiş sayma — aksi halde tarayıcı yenilemesi bile kaybettirir
        p.connected = false;
        p.disconnectTimer = setTimeout(() => {
          p.disconnectTimer = null;
          if (!p.connected) {
            eliminatePlayer(io, room, p, { won: false, score: p.score, maxChain: p.maxChain });
          }
        }, DISCONNECT_GRACE_MS);
        return;
      }
      if (p && room && room.state !== 'playing') {
        // Lobby'de de kısa bir grace period: sayfa yenileme odadan çıkarmaıyor
        p.connected = false;
        p.disconnectTimer = setTimeout(() => {
          p.disconnectTimer = null;
          if (!p.connected) {
            leaveCurrentRoom(io, socket);
          }
        }, LOBBY_DISCONNECT_GRACE_MS);
        return;
      }
      leaveCurrentRoom(io, socket);
    });
  });
}

const DISCONNECT_GRACE_MS = Number(process.env.DISCONNECT_GRACE_MS || 20000);
const LOBBY_DISCONNECT_GRACE_MS = Number(process.env.LOBBY_DISCONNECT_GRACE_MS || 8000);

/** Maç sırasında bir oyuncuyu elenmiş/bitirmiş olarak işaretle (gönüllü bitiş ya da bağlantı zaman aşımı) */
function eliminatePlayer(
  io: Server,
  room: Room,
  p: Player,
  info: { won: boolean; score: number; maxChain: number }
) {
  p.alive = false;
  p.score = Math.max(p.score, info.score);
  p.maxChain = Math.max(p.maxChain, info.maxChain);

  if (info.won) {
    p.placement = room.nextPlacement++;
  } else {
    p.placement = Math.max(1, aliveCount(room) + 1);
  }
  io.to(room.code).emit('player_out', { id: p.id, placement: p.placement });
  assignWatchlists(room);

  if (aliveCount(room) <= (room.players.size > 1 ? 1 : 0)) {
    endMatch(io, room);
  }
}

function err(socket: Socket, message: string) {
  socket.emit('error_msg', { message });
}

function broadcastRoom(io: Server, room: Room) {
  for (const p of room.players.values()) {
    io.to(p.socketId).emit('room_state', { room: toPublic(room), you: p.id });
  }
}

function leaveCurrentRoom(io: Server, socket: Socket) {
  const data = socket.data as SocketData;
  const { player: p, room } = data;
  if (!p || !room) return;

  if (p.disconnectTimer) {
    clearTimeout(p.disconnectTimer);
    p.disconnectTimer = null;
  }
  p.roomCode = null;
  room.players.delete(p.id);
  socket.leave(room.code);
  data.room = undefined;

  if (room.players.size === 0 || [...room.players.values()].every(p2 => (p2 as any).isBot)) {
    const t = summaryTimers.get(room.code);
    if (t) clearInterval(t);
    summaryTimers.delete(room.code);
    stopBotsInRoom(room.code);
    deleteRoom(room.code);
    io.emit('room_list', { rooms: listRooms() });
    return;
  }

  if (room.hostId === p.id) {
    // ev sahibi her zaman gerçek bir oyuncu olmalı (bot maçı başlatamaz)
    room.hostId = firstHumanId(room) ?? [...room.players.keys()][0];
  }
  if (room.state === 'playing') {
    assignWatchlists(room);
    if (aliveCount(room) <= 1) endMatch(io, room);
  }
  broadcastRoom(io, room);
  io.emit('room_list', { rooms: listRooms() });
}

function startMatch(io: Server, room: Room) {
  room.state = 'playing';
  room.seed = (Math.random() * 0xffffffff) >>> 0;
  room.startAt = Date.now() + 3000; // 3 saniyelik geri sayım
  room.nextPlacement = 1;

  for (const p of room.players.values()) {
    p.alive = true;
    p.placement = null;
    p.score = 0;
    p.viruses = 0;
    p.maxChain = 0;
    p.frames = 0;
    p.attackBudget = 0;
    p.lastAttackerId = null;
    p.lastBoard = null;
  }
  assignWatchlists(room);

  io.to(room.code).emit('match_start', {
    seed: room.seed,
    config: room.config,
    startAt: room.startAt,
    players: [...room.players.values()].map(playerPublic),
    hostId: room.hostId,
  });

  // Botları başlat (startAt sonrasında, 3 saniye bekle)
  setTimeout(() => startBotsInRoom(io, room), 3000);

  // özet yayını + saldırı bütçesi sıfırlama
  const timer = setInterval(() => {
    const r = allRooms.get(room.code);
    if (!r || r.state !== 'playing') {
      clearInterval(timer);
      summaryTimers.delete(room.code);
      return;
    }
    for (const p of r.players.values()) p.attackBudget = Math.max(0, p.attackBudget - 6);
    io.to(r.code).emit('peer_summary', {
      players: [...r.players.values()].map((p) => ({
        id: p.id,
        alive: p.alive,
        viruses: p.viruses,
        score: p.score,
      })),
    });
  }, 500);
  summaryTimers.set(room.code, timer);

  io.emit('room_list', { rooms: listRooms() });
}

async function endMatch(io: Server, room: Room) {
  if (room.state !== 'playing') return;
  room.state = 'finished';
  stopBotsInRoom(room.code);

  const t = summaryTimers.get(room.code);
  if (t) clearInterval(t);
  summaryTimers.delete(room.code);

  // hâlâ ayakta olan varsa onlar üstte
  const survivors = [...room.players.values()].filter((p) => p.alive);
  survivors.sort((a, b) => b.score - a.score);
  for (const s of survivors) {
    s.alive = false;
    if (s.placement == null) s.placement = room.nextPlacement++;
  }

  const all = [...room.players.values()].sort(
    (a, b) => (a.placement ?? 999) - (b.placement ?? 999)
  );
  // sıralamayı 1..n olarak normalize et
  all.forEach((p, i) => (p.placement = i + 1));

  io.to(room.code).emit('match_end', {
    results: all.map((p) => ({
      id: p.id,
      name: p.name,
      placement: p.placement!,
      score: p.score,
      maxChain: p.maxChain,
    })),
  });

  await saveMatch(
    room.code,
    room.seed,
    room.config,
    all.map((p) => ({
      userId: p.userId,
      placement: p.placement!,
      score: p.score,
      virusesCleared: 0,
      maxChain: p.maxChain,
      survivedFrames: p.frames,
    }))
  );

  // lobiye dön
  setTimeout(() => {
    const r = allRooms.get(room.code);
    if (!r) return;
    r.state = 'lobby';
    for (const p of r.players.values()) {
      p.ready = false;
      p.alive = true;
      p.placement = null;
    }
    broadcastRoom(io, r);
    io.emit('room_list', { rooms: listRooms() });
  }, 500);
}
