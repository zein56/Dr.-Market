import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { initDb, leaderboard, dbEnabled } from './db';
import { attachSockets } from './socket';
import { listRooms } from './rooms';

const PORT = Number(process.env.PORT || 3001);
const ORIGIN = process.env.CLIENT_ORIGIN || '*';

async function main() {
  await initDb();

  const app = express();
  app.use(cors({ origin: ORIGIN }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, db: dbEnabled(), rooms: listRooms().length, uptime: process.uptime() });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: listRooms() });
  });

  app.get('/api/leaderboard', async (_req, res) => {
    res.json({ players: await leaderboard(20) });
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: ORIGIN, methods: ['GET', 'POST'] },
    pingInterval: 10000,
    pingTimeout: 20000,
    // mobil ağlarda websocket bazen engelli — polling fallback açık kalsın
    transports: ['websocket', 'polling'],
  });

  attachSockets(io);

  server.listen(PORT, () => {
    console.log(`\n  Pill Arena sunucusu → http://localhost:${PORT}`);
    console.log(`  Sağlık kontrolü     → http://localhost:${PORT}/api/health\n`);
  });
}

main().catch((e) => {
  console.error('Sunucu başlatılamadı:', e);
  process.exit(1);
});
