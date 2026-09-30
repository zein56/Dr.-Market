/**
 * Saldırı hedefleme ve oda ayarı doğrulama testleri. Çalıştır: npm run test:server
 */
import { createRoom, newPlayer, pickAttackTargets, sanitizeConfig } from '../src/rooms';
import { DEFAULT_ROOM_CONFIG } from '@pill/protocol';

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}

function setup(n: number) {
  const host = newPlayer('s0', 'p0', null);
  const room = createRoom('t', host, {});
  const players = [host];
  for (let i = 1; i < n; i++) {
    const p = newPlayer(`s${i}`, `p${i}`, null);
    room.players.set(p.id, p);
    players.push(p);
  }
  for (const p of players) { p.alive = true; p.lastBoard = 'x'; }
  return { room, players };
}

console.log('\nHedefleme');
{
  const { room, players } = setup(4);
  const [me, a, b, c] = players;
  a.viruses = 5; b.viruses = 2; c.viruses = 8;

  let allLeader = true;
  for (let i = 0; i < 60; i++) {
    const t = pickAttackTargets(room, me.id, 1, 'leader');
    if (t.length !== 1 || t[0].id !== b.id) allLeader = false;
  }
  check('leader: en az virüsü kalan rakibi seçer', allLeader);

  b.lastBoard = null; // henüz tahta bildirmedi, virüs=2 olsa da lider sayılmamalı
  let skipsUnsynced = true;
  for (let i = 0; i < 60; i++) {
    if (pickAttackTargets(room, me.id, 1, 'leader')[0].id === b.id) skipsUnsynced = false;
  }
  check('leader: tahta bildirmemiş oyuncuyu atlar', skipsUnsynced);

  a.lastBoard = null; c.lastBoard = null;
  const fallback = pickAttackTargets(room, me.id, 1, 'leader');
  check('leader: kimse bildirmediyse yine de bir hedef döner', fallback.length === 1 && fallback[0].id !== me.id);
  a.lastBoard = 'x'; b.lastBoard = 'x'; c.lastBoard = 'x';

  const r1 = pickAttackTargets(room, me.id, 1, 'revenge', c.id);
  check('revenge: seni en son vuranı seçer', r1.length === 1 && r1[0].id === c.id);

  c.alive = false;
  let neverDead = true;
  for (let i = 0; i < 40; i++) {
    const t = pickAttackTargets(room, me.id, 1, 'revenge', c.id);
    if (t.length !== 1 || t[0].id === c.id || t[0].id === me.id) neverDead = false;
  }
  check('revenge: saldırgan elendiyse hayatta olanlardan seçer', neverDead);

  let neverSelf = true;
  for (let i = 0; i < 60; i++) {
    const t = pickAttackTargets(room, me.id, 1, 'random');
    if (t.some((x) => x.id === me.id || !x.alive)) neverSelf = false;
  }
  check('random: kendini ya da elenmişi seçmez', neverSelf);
}
{
  const { room, players } = setup(2);
  const t = pickAttackTargets(room, players[0].id, 1, 'leader');
  check('1v1: tek rakip her modda seçilir', t.length === 1 && t[0].id === players[1].id);
  players[1].alive = false;
  check('rakip kalmadıysa boş döner', pickAttackTargets(room, players[0].id, 1, 'random').length === 0);
}

console.log('\nOda ayarları');
{
  check('varsayılan: karşı saldırı açık', DEFAULT_ROOM_CONFIG.counterEnabled === true);
  check('sanitizeConfig: counterEnabled kapatılabilir', sanitizeConfig(DEFAULT_ROOM_CONFIG, { counterEnabled: false }).counterEnabled === false);
  check('sanitizeConfig: değer gelmezse mevcut korunur', sanitizeConfig({ ...DEFAULT_ROOM_CONFIG, counterEnabled: false }, {}).counterEnabled === false);
  const bad = sanitizeConfig(DEFAULT_ROOM_CONFIG, { colors: 0, level: 'x', speed: 'turbo', bombThreshold: 9999 });
  check('sanitizeConfig: bozuk değerler sınırlanır', bad.colors === 3 && bad.level === DEFAULT_ROOM_CONFIG.level && bad.speed === DEFAULT_ROOM_CONFIG.speed && bad.bombThreshold === 8);
}

console.log(`\n${pass} geçti, ${fail} başarısız\n`);
process.exit(fail > 0 ? 1 : 0);
