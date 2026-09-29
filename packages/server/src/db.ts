import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let enabled = false;

export async function initDb() {
  if (process.env.DB_ENABLED === 'false') {
    console.log('[db] devre dışı (DB_ENABLED=false) — skorlar kaydedilmeyecek');
    return;
  }
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'pill_arena',
      connectionLimit: 10,
      waitForConnections: true,
      charset: 'utf8mb4_unicode_ci',
    });
    await pool.query('SELECT 1');
    enabled = true;
    console.log('[db] MySQL bağlantısı hazır');
  } catch (err: any) {
    pool = null;
    enabled = false;
    console.warn(
      `[db] MySQL'e bağlanılamadı (${err.code || err.message}). ` +
        `Oyun çalışır, sadece kayıt/sıralama devre dışı.`
    );
  }
}

export function dbEnabled() {
  return enabled;
}

/** Misafir ya da kayıtlı kullanıcıyı bul/oluştur, id döndür */
export async function upsertUser(username: string): Promise<number | null> {
  if (!pool) return null;
  try {
    const [rows] = await pool.query<any[]>('SELECT id FROM users WHERE username = ?', [username]);
    if (rows.length) {
      await pool.query('UPDATE users SET last_seen_at = NOW() WHERE id = ?', [rows[0].id]);
      return rows[0].id;
    }
    const [res] = await pool.query<any>('INSERT INTO users (username) VALUES (?)', [username]);
    return res.insertId;
  } catch {
    return null;
  }
}

export interface MatchResultRow {
  userId: number | null;
  placement: number;
  score: number;
  virusesCleared: number;
  maxChain: number;
  survivedFrames: number;
}

export async function saveMatch(
  roomCode: string,
  seed: number,
  config: unknown,
  results: MatchResultRow[]
): Promise<void> {
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.query<any>(
      'INSERT INTO matches (room_code, seed, config_json, player_count, ended_at) VALUES (?,?,?,?,NOW())',
      [roomCode, seed >>> 0, JSON.stringify(config), results.length]
    );
    const matchId = res.insertId;

    for (const r of results) {
      if (r.userId == null) continue;
      await conn.query(
        `INSERT INTO match_players
           (match_id, user_id, placement, score, viruses_cleared, max_chain, survived_frames)
         VALUES (?,?,?,?,?,?,?)`,
        [matchId, r.userId, r.placement, r.score, r.virusesCleared, r.maxChain, r.survivedFrames]
      );
      await conn.query(
        'UPDATE users SET games_played = games_played + 1, games_won = games_won + ? WHERE id = ?',
        [r.placement === 1 ? 1 : 0, r.userId]
      );
      // basit elo: 1. sıra +20, son sıra -10, arası oransal
      const delta = eloDelta(r.placement, results.length);
      const [before] = await conn.query<any[]>('SELECT elo FROM users WHERE id = ?', [r.userId]);
      const eloBefore = before[0]?.elo ?? 1000;
      const eloAfter = Math.max(100, eloBefore + delta);
      await conn.query('UPDATE users SET elo = ? WHERE id = ?', [eloAfter, r.userId]);
      await conn.query(
        'INSERT INTO elo_history (user_id, match_id, elo_before, elo_after) VALUES (?,?,?,?)',
        [r.userId, matchId, eloBefore, eloAfter]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.warn('[db] maç kaydedilemedi:', err);
  } finally {
    conn.release();
  }
}

function eloDelta(placement: number, total: number): number {
  if (total < 2) return 0;
  const norm = (total - placement) / (total - 1); // 1 = birinci, 0 = sonuncu
  return Math.round(-12 + norm * 32);
}

export async function leaderboard(limit = 20) {
  if (!pool) return [];
  try {
    const [rows] = await pool.query<any[]>(
      'SELECT username, elo, games_played, games_won, win_rate FROM leaderboard LIMIT ?',
      [limit]
    );
    return rows;
  } catch {
    return [];
  }
}
