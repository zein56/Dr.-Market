/**
 * Uçtan uca soket testi: gerçek sunucuyu başlatır, 3 sahte istemciyle dener.
 * Çalıştır: npm run test:e2e   (MySQL gerekmez)
 */
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';

const PORT = 3997;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  cond ? pass++ : fail++;
  console.log(`  ${cond ? '✓' : '✗'} ${name} ${cond ? '' : extra}`);
};

const server = spawn('npx', ['tsx', 'packages/server/src/index.ts'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
});
const ready = new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('sunucu 20 sn içinde açılmadı')), 20000);
  server.stdout.on('data', (d) => { if (String(d).includes('Sağlık')) { clearTimeout(t); resolve(); } });
  server.on('exit', (c) => { clearTimeout(t); reject(new Error('sunucu kapandı: ' + c)); });
});

function client(name) {
  const s = io(`http://localhost:${PORT}`, { transports: ['websocket'] });
  const c = { s, name, id: null, attacks: [], out: [], ended: false, room: null };
  s.on('hello_ok', (m) => (c.id = m.playerId));
  s.on('incoming_attack', (m) => c.attacks.push(m));
  s.on('player_out', (m) => c.out.push(m));
  s.on('match_end', () => (c.ended = true));
  s.on('room_state', (m) => (c.room = m.room));
  return c;
}
const atk = (n = 1) => ({ frame: 20, attack: { normal: n, stone: 0, lock: 0 } });

try {
  await ready;
  const [A, B, C] = ['A', 'B', 'C'].map(client);
  await sleep(500);
  for (const c of [A, B, C]) c.s.emit('hello', { name: c.name });
  await sleep(400);

  console.log('\nOda ayarları');
  A.s.emit('room_create', { name: 'e2e', config: { counterEnabled: true, colors: 0 } });
  await sleep(400);
  check('oda kuruldu', !!A.room?.code);
  check('create: bozuk renk sayısı sınırlandı', A.room?.config?.colors === 3);
  check('create: counterEnabled odaya işlendi', A.room?.config?.counterEnabled === true);
  B.s.emit('room_join', { code: A.room.code });
  C.s.emit('room_join', { code: A.room.code });
  await sleep(400);
  A.s.emit('room_config_update', { config: { counterEnabled: false } });
  await sleep(300);
  check('host karşı saldırıyı kapatabilir', A.room?.config?.counterEnabled === false);
  A.s.emit('room_config_update', { config: { counterEnabled: true } });
  await sleep(300);

  A.s.emit('start');
  await sleep(800);
  B.s.emit('board_sync', { frame: 10, board: 'abc', viruses: 2, score: 0 });
  C.s.emit('board_sync', { frame: 10, board: 'abc', viruses: 9, score: 0 });
  await sleep(200);

  console.log('\nHedefleme');
  A.s.emit('set_target', { mode: 'leader' });
  await sleep(100);
  for (let i = 0; i < 5; i++) A.s.emit('attack', atk());
  await sleep(400);
  check("leader: saldırılar en az virüslü B'ye gitti", B.attacks.length === 5 && C.attacks.length === 0, `B=${B.attacks.length} C=${C.attacks.length}`);

  B.s.emit('set_target', { mode: 'revenge' });
  await sleep(100);
  A.attacks.length = 0; C.attacks.length = 0;
  for (let i = 0; i < 4; i++) B.s.emit('attack', atk());
  await sleep(400);
  check("revenge: B, kendisini vuran A'ya saldırdı", A.attacks.length === 4 && C.attacks.length === 0, `A=${A.attacks.length} C=${C.attacks.length}`);

  C.s.emit('set_target', { mode: 'hack' });
  await sleep(100);
  A.attacks.length = 0; B.attacks.length = 0;
  for (let i = 0; i < 20; i++) C.s.emit('attack', atk());
  await sleep(500);
  check('geçersiz hedef modu yok sayılır, sunucu çalışmaya devam eder', A.attacks.length + B.attacks.length === 20, `A=${A.attacks.length} B=${B.attacks.length}`);

  console.log('\nKazanma doğrulaması');
  C.s.emit('finished', { frame: 99999, won: true, score: 1e12, viruses: 5, maxChain: 9999 });
  await sleep(500);
  const cOut = A.out.find((o) => o.id === C.id);
  check('sahte galibiyet (imkânsız kare sayısı + virüs kalmış) 1. sıra almaz', cOut && cOut.placement !== 1, JSON.stringify(cOut));
  check('sahte galibiyet maçı bitirmez', A.ended === false);

  B.s.emit('finished', { frame: 30, won: true, score: 500, viruses: 0, maxChain: 2 });
  await sleep(500);
  const bOut = A.out.find((o) => o.id === B.id);
  check('gerçekçi galibiyet iddiası (0 virüs, makul kare) 1. sırayı alır', bOut?.placement === 1, JSON.stringify(bOut));

  [A, B, C].forEach((c) => c.s.close());
} catch (e) {
  fail++;
  console.log('  ✗ test çalışamadı:', e.message);
} finally {
  server.kill();
}
console.log(`\n${pass} geçti, ${fail} başarısız\n`);
process.exit(fail > 0 ? 1 : 0);
