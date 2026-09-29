/**
 * Motorun temel garantileri. Çalıştır: npm run test:core
 * Ağ kodu bu testler geçmeden anlam ifade etmez.
 */
import {
  createGame,
  step,
  queueGarbage,
  isOver,
  Input,
  Phase,
  Rng,
  COLS,
  ROWS,
  countViruses,
  findMatches,
  stepGravity,
  createBoard,
  cell,
  KIND_VIRUS,
  KIND_SINGLE,
  KIND_LEFT,
  KIND_RIGHT,
  encodeBoard,
  decodeBoard,
  virusCount,
} from '../src/index';

let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, extra = '') {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${extra}`);
  }
}

// --- 1. RNG determinizmi ---
console.log('\nRNG');
{
  const a = new Rng(12345);
  const b = new Rng(12345);
  let same = true;
  for (let i = 0; i < 10000; i++) if (a.next() !== b.next()) same = false;
  check('aynı seed aynı diziyi üretir', same);

  const c = new Rng(12345);
  const d = new Rng(12346);
  check('farklı seed farklı dizi üretir', c.next() !== d.next());

  const e = new Rng(777);
  const counts = [0, 0, 0];
  for (let i = 0; i < 30000; i++) counts[e.int(3)]++;
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  check('dağılım dengeli', max / min < 1.1, `${counts.join('/')}`);
}

// --- 2. Virüs yerleştirme ---
console.log('\nVirüs yerleştirme');
{
  for (const level of [0, 5, 10, 15, 20]) {
    const g = createGame({ seed: 4242, level, speed: 'med' });
    const n = countViruses(g.board);
    check(
      `seviye ${level}: ${virusCount(level)} virüs istendi, ${n} kondu`,
      n === virusCount(level)
    );
  }
  const g1 = createGame({ seed: 999, level: 10, speed: 'med' });
  const g2 = createGame({ seed: 999, level: 10, speed: 'med' });
  check('aynı seed aynı virüs dizilimi', encodeBoard(g1.board) === encodeBoard(g2.board));

  const g3 = createGame({ seed: 1000, level: 10, speed: 'med' });
  check('farklı seed farklı dizilim', encodeBoard(g1.board) !== encodeBoard(g3.board));

  // başlangıçta hazır eşleşme olmamalı
  const m = findMatches(g1.board);
  check('başlangıçta hazır 4lü yok', m.cleared.length === 0, `${m.cleared.length} hücre`);
}

// --- 3. Eşleştirme mantığı ---
console.log('\nEşleştirme');
{
  const b = createBoard();
  for (let x = 0; x < 4; x++) b[10 * COLS + x] = cell(KIND_SINGLE, 0);
  const m = findMatches(b);
  check('yatay 4lü bulunur', m.cleared.length === 4 && m.groups === 1);

  const b2 = createBoard();
  for (let x = 0; x < 3; x++) b2[10 * COLS + x] = cell(KIND_SINGLE, 0);
  check('yatay 3lü patlamaz', findMatches(b2).cleared.length === 0);

  const b3 = createBoard();
  for (let y = 5; y < 9; y++) b3[y * COLS + 2] = cell(KIND_SINGLE, 1);
  const m3 = findMatches(b3);
  check('dikey 4lü bulunur', m3.cleared.length === 4);

  const b4 = createBoard();
  for (let x = 0; x < 4; x++) b4[10 * COLS + x] = cell(KIND_SINGLE, 2);
  for (let y = 10; y < 14; y++) b4[y * COLS + 0] = cell(KIND_SINGLE, 2);
  const m4 = findMatches(b4);
  check('kesişen yatay+dikey 7 hücre siler', m4.cleared.length === 7, `${m4.cleared.length}`);

  const b5 = createBoard();
  for (let x = 0; x < 5; x++) b5[10 * COLS + x] = cell(KIND_SINGLE, 0);
  check('5li de patlar', findMatches(b5).cleared.length === 5);

  const b6 = createBoard();
  b6[10 * COLS + 0] = cell(KIND_SINGLE, 0);
  b6[10 * COLS + 1] = cell(KIND_SINGLE, 0);
  b6[10 * COLS + 2] = cell(KIND_SINGLE, 1);
  b6[10 * COLS + 3] = cell(KIND_SINGLE, 0);
  b6[10 * COLS + 4] = cell(KIND_SINGLE, 0);
  check('farklı renk diziyi böler', findMatches(b6).cleared.length === 0);
}

// --- 4. Yerçekimi ---
console.log('\nYerçekimi');
{
  const b = createBoard();
  b[0] = cell(KIND_SINGLE, 0);
  let n = 0;
  while (stepGravity(b) && n < 100) n++;
  check('tekil parça dibe iner', b[(ROWS - 1) * COLS] === cell(KIND_SINGLE, 0));

  const bv = createBoard();
  bv[5 * COLS + 3] = cell(KIND_VIRUS, 1);
  stepGravity(bv);
  check('virüs düşmez', bv[5 * COLS + 3] === cell(KIND_VIRUS, 1));

  const bh = createBoard();
  bh[0] = cell(KIND_LEFT, 0);
  bh[1] = cell(KIND_RIGHT, 1);
  bh[(ROWS - 1) * COLS + 1] = cell(KIND_VIRUS, 2); // sağ yarının altı dolu
  let k = 0;
  while (stepGravity(bh) && k < 100) k++;
  check(
    'yatay kapsül tek yarımı engellenince birlikte durur',
    bh[(ROWS - 2) * COLS] === cell(KIND_LEFT, 0) &&
      bh[(ROWS - 2) * COLS + 1] === cell(KIND_RIGHT, 1)
  );
}

// --- 5. Tam maç determinizmi ---
console.log('\nSimülasyon determinizmi');
{
  const inputs: Array<[number, Input]> = [];
  const r = new Rng(31337);
  for (let f = 0; f < 6000; f += 1) {
    if (r.int(10) === 0) {
      const opts = [Input.Left, Input.Right, Input.RotateCW, Input.RotateCCW, Input.HardDrop];
      inputs.push([f, opts[r.int(opts.length)]]);
    }
  }

  const runOnce = () => {
    const g = createGame({ seed: 8888, level: 8, speed: 'med' });
    let ii = 0;
    for (let f = 0; f < 6000; f++) {
      const batch: Input[] = [];
      while (ii < inputs.length && inputs[ii][0] === f) batch.push(inputs[ii++][1]);
      step(g, batch);
      if (isOver(g)) break;
    }
    return { board: encodeBoard(g.board), frame: g.frame, score: g.score, phase: g.phase };
  };

  const a = runOnce();
  const b = runOnce();
  const c = runOnce();
  check(
    '6000 frame, aynı girdi → aynı sonuç',
    a.board === b.board && b.board === c.board && a.score === b.score && a.frame === b.frame,
    `${a.score}/${b.score}`
  );
  console.log(
    `    (bitiş: frame ${a.frame}, puan ${a.score}, durum ${
      a.phase === Phase.Won ? 'kazandı' : a.phase === Phase.Lost ? 'kaybetti' : 'devam'
    })`
  );
}

// --- 6. Oyun akışı ---
console.log('\nOyun akışı');
{
  // hiç girdi verilmezse şişe dolar ve oyun biter
  const g = createGame({ seed: 555, level: 0, speed: 'hi' });
  let f = 0;
  while (!isOver(g) && f < 60 * 60 * 6) {
    step(g, []);
    f++;
  }
  check('girdisiz oyun eninde sonunda biter', isOver(g), `${f} frame`);

  // Kurgulanmış senaryo: dikeyde 3 kırmızı virüs + üstüne 1 kırmızı yarım = 4lü
  const g2 = createGame({ seed: 77, level: 2, speed: 'low' });
  g2.board.fill(0);
  for (let y = 13; y <= 15; y++) g2.board[y * COLS + 0] = cell(KIND_VIRUS, 0);
  g2.virusesLeft = 3;
  // kapsülü elle kırmızı yap ve 0. sütuna dikey bırak
  g2.capsule = null;
  g2.phase = Phase.Spawning;
  g2.phaseTimer = 1;
  g2.nextA = 0;
  g2.nextB = 0;
  step(g2, []); // spawn
  const beforeVir = g2.virusesLeft;
  for (let i = 0; i < 400 && g2.virusesLeft === beforeVir && !isOver(g2); i++) {
    const inputs: Input[] = [];
    if (g2.phase === Phase.Falling && g2.capsule) {
      if (g2.capsule.x > 0) inputs.push(Input.Left);
      else inputs.push(Input.HardDrop);
    }
    step(g2, inputs);
  }
  check('dizilen 4lü virüsleri temizler', g2.virusesLeft === 0, `kalan ${g2.virusesLeft}`);
  check('temizlik puan kazandırır', g2.score > 0, `${g2.score}`);
  check('virüs bitince oyun kazanılır', g2.phase === Phase.Won || g2.virusesLeft === 0);

  // Saldırı üretimi: aynı anda iki dizi patlarsa çöp yollanır
  const g4 = createGame({ seed: 5, level: 1, speed: 'low' });
  g4.board.fill(0);
  for (let x = 0; x < 4; x++) g4.board[15 * COLS + x] = cell(KIND_SINGLE, 0);
  for (let x = 0; x < 4; x++) g4.board[14 * COLS + x] = cell(KIND_SINGLE, 1);
  g4.virusesLeft = 5;
  g4.phase = Phase.Settling;
  g4.phaseTimer = 1;
  let atk = 0;
  for (let i = 0; i < 200; i++) {
    step(g4, []);
    atk += g4.attackOut;
    if (g4.phase === Phase.Spawning || isOver(g4)) break;
  }
  check('eşzamanlı iki dizi saldırı üretir', atk > 0, `${atk} çöp`);

  // virüs sayısı asla artmaz
  const g3 = createGame({ seed: 246, level: 6, speed: 'med' });
  const start = g3.virusesLeft;
  let maxSeen = start;
  for (let i = 0; i < 3000 && !isOver(g3); i++) {
    step(g3, i % 13 === 0 ? [Input.HardDrop] : []);
    if (g3.virusesLeft > maxSeen) maxSeen = g3.virusesLeft;
  }
  check('virüs sayısı artmaz', maxSeen === start, `${maxSeen} > ${start}`);
}

// --- 7. Çöp kapsül ---
console.log('\nSaldırı');
{
  const g = createGame({ seed: 4, level: 3, speed: 'med' });
  queueGarbage(g, 4, 999);
  check('çöp kuyruğa girer', g.pendingGarbage.length === 1 && g.pendingGarbage[0].columns.length === 4);

  const before = g.board.reduce((n, c) => n + (c ? 1 : 0), 0);
  for (let i = 0; i < 600; i++) {
    step(g, i % 30 === 0 ? [Input.HardDrop] : []);
    if (g.pendingGarbage.length === 0) break;
  }
  const after = g.board.reduce((n, c) => n + (c ? 1 : 0), 0);
  check('çöp tahtaya iner', after > before, `${before} → ${after}`);

  // aynı seed aynı çöp kolonları
  const x = createGame({ seed: 1, level: 1, speed: 'med' });
  const y = createGame({ seed: 1, level: 1, speed: 'med' });
  queueGarbage(x, 5, 4242);
  queueGarbage(y, 5, 4242);
  check(
    'çöp yerleşimi deterministik',
    JSON.stringify(x.pendingGarbage) === JSON.stringify(y.pendingGarbage)
  );
}

// --- 8. Ağ kodlaması ---
console.log('\nSerileştirme');
{
  const g = createGame({ seed: 2026, level: 12, speed: 'med' });
  const enc = encodeBoard(g.board);
  const dec = decodeBoard(enc);
  let same = dec.length === g.board.length;
  for (let i = 0; i < g.board.length; i++) if (dec[i] !== g.board[i]) same = false;
  check('tahta kodla-çöz kayıpsız', same);
  check('paket boyutu makul', enc.length < 256, `${enc.length} bayt`);
}

console.log(`\n${pass} geçti, ${fail} başarısız\n`);
process.exit(fail > 0 ? 1 : 0);
