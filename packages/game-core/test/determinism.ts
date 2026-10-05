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
<<<<<<< HEAD
  virusTopRow,
  cancelPendingGarbage,
  resumeGame,
  createCoopGame,
  stepCoop,
  POWER_STRIKE,
  POWER_SHIELD,
  POWER_JOKER,
  POWER_CLEANSE,
  POWER_MIN_GAP,
  SHIELD_MAX,
  STRIKE_AMOUNT,
  KIND_STONE,
  addLock,
  hasLock,
  isStone,
  kindOf,
  colorOf,
  getLockCount,
  isVirus,
  MAX_LOCK_LEVEL,
  applyClear,
  findMatches,
  normalizePowerFreq,
  powerFreqParams,
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
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
<<<<<<< HEAD
// Motor, tahtanın en fazla %70'ini doldurur (yüksek seviyelerde virusCount'tan az olabilir).
function expectedViruses(level: number): number {
  const top = Math.max(1, Math.min(ROWS - 2, Math.floor(ROWS * (virusTopRow(level) / 16))));
  return Math.min(virusCount(level), Math.floor((ROWS - top) * COLS * 0.7));
}
console.log('\nVirüs yerleştirme');
{
  for (const level of [0, 5, 10, 15, 20]) {
    const g = createGame({ seed: 4242, level, speed: 'med', colors: 3 });
    const n = countViruses(g.board);
    check(
      `seviye ${level}: ${virusCount(level)} virüs istendi, ${n} kondu`,
      n === expectedViruses(level)
    );
  }
  const g1 = createGame({ seed: 999, level: 10, speed: 'med', colors: 3 });
  const g2 = createGame({ seed: 999, level: 10, speed: 'med', colors: 3 });
  check('aynı seed aynı virüs dizilimi', encodeBoard(g1.board) === encodeBoard(g2.board));

  const g3 = createGame({ seed: 1000, level: 10, speed: 'med', colors: 3 });
=======
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
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
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
<<<<<<< HEAD
    const g = createGame({ seed: 8888, level: 8, speed: 'med', colors: 3 });
=======
    const g = createGame({ seed: 8888, level: 8, speed: 'med' });
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
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
<<<<<<< HEAD
  const g = createGame({ seed: 555, level: 0, speed: 'hi', colors: 3 });
=======
  const g = createGame({ seed: 555, level: 0, speed: 'hi' });
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  let f = 0;
  while (!isOver(g) && f < 60 * 60 * 6) {
    step(g, []);
    f++;
  }
  check('girdisiz oyun eninde sonunda biter', isOver(g), `${f} frame`);

  // Kurgulanmış senaryo: dikeyde 3 kırmızı virüs + üstüne 1 kırmızı yarım = 4lü
<<<<<<< HEAD
  const g2 = createGame({ seed: 77, level: 2, speed: 'low', colors: 3 });
=======
  const g2 = createGame({ seed: 77, level: 2, speed: 'low' });
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
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
<<<<<<< HEAD
  const g4 = createGame({ seed: 5, level: 1, speed: 'low', colors: 3 });
=======
  const g4 = createGame({ seed: 5, level: 1, speed: 'low' });
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  g4.board.fill(0);
  for (let x = 0; x < 4; x++) g4.board[15 * COLS + x] = cell(KIND_SINGLE, 0);
  for (let x = 0; x < 4; x++) g4.board[14 * COLS + x] = cell(KIND_SINGLE, 1);
  g4.virusesLeft = 5;
  g4.phase = Phase.Settling;
  g4.phaseTimer = 1;
  let atk = 0;
  for (let i = 0; i < 200; i++) {
    step(g4, []);
<<<<<<< HEAD
    if (g4.attackOut) atk += g4.attackOut.normal + g4.attackOut.stone + g4.attackOut.lock;
=======
    atk += g4.attackOut;
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
    if (g4.phase === Phase.Spawning || isOver(g4)) break;
  }
  check('eşzamanlı iki dizi saldırı üretir', atk > 0, `${atk} çöp`);

  // virüs sayısı asla artmaz
<<<<<<< HEAD
  const g3 = createGame({ seed: 246, level: 6, speed: 'med', colors: 3 });
=======
  const g3 = createGame({ seed: 246, level: 6, speed: 'med' });
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
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
<<<<<<< HEAD
  const g = createGame({ seed: 4, level: 3, speed: 'med', colors: 3 });
  queueGarbage(g, { normal: 4, stone: 0, lock: 0 }, 999);
=======
  const g = createGame({ seed: 4, level: 3, speed: 'med' });
  queueGarbage(g, 4, 999);
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  check('çöp kuyruğa girer', g.pendingGarbage.length === 1 && g.pendingGarbage[0].columns.length === 4);

  const before = g.board.reduce((n, c) => n + (c ? 1 : 0), 0);
  for (let i = 0; i < 600; i++) {
    step(g, i % 30 === 0 ? [Input.HardDrop] : []);
    if (g.pendingGarbage.length === 0) break;
  }
  const after = g.board.reduce((n, c) => n + (c ? 1 : 0), 0);
  check('çöp tahtaya iner', after > before, `${before} → ${after}`);

  // aynı seed aynı çöp kolonları
<<<<<<< HEAD
  const x = createGame({ seed: 1, level: 1, speed: 'med', colors: 3 });
  const y = createGame({ seed: 1, level: 1, speed: 'med', colors: 3 });
=======
  const x = createGame({ seed: 1, level: 1, speed: 'med' });
  const y = createGame({ seed: 1, level: 1, speed: 'med' });
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
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
<<<<<<< HEAD
  const g = createGame({ seed: 2026, level: 12, speed: 'med', colors: 3 });
=======
  const g = createGame({ seed: 2026, level: 12, speed: 'med' });
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  const enc = encodeBoard(g.board);
  const dec = decodeBoard(enc);
  let same = dec.length === g.board.length;
  for (let i = 0; i < g.board.length; i++) if (dec[i] !== g.board[i]) same = false;
  check('tahta kodla-çöz kayıpsız', same);
  check('paket boyutu makul', enc.length < 256, `${enc.length} bayt`);
}

<<<<<<< HEAD
// --- Karşı saldırı ---
console.log('\nKarşı saldırı');
{
  const sum = (g: any) => g.pendingGarbage.reduce((n: number, x: any) => n + x.columns.length, 0);
  const mk = (cols: number, stones = false): any => ({
    pendingGarbage: [{ columns: Array.from({ length: cols }, (_, i) => i), colors: Array(cols).fill(0), stones }],
  });

  {
    const s = mk(3);
    const atk = { normal: 5, stone: 0, lock: 0, colors: [1] };
    const c = cancelPendingGarbage(s, atk);
    check('saldırı, gelen çöpten büyükse hepsini iptal eder', c === 3 && sum(s) === 0 && atk.normal === 2, `iptal=${c} kalan=${sum(s)} giden=${atk.normal}`);
  }
  {
    const s = mk(3);
    const atk = { normal: 2, stone: 0, lock: 0, colors: [1] };
    const c = cancelPendingGarbage(s, atk);
    check('saldırı, gelen çöpten küçükse kısmen iptal eder', c === 2 && sum(s) === 1 && atk.normal === 0 && atk.colors.length === 0, `iptal=${c} kalan=${sum(s)}`);
  }
  {
    const s = mk(1);
    const atk = { normal: 1, stone: 1, lock: 2, colors: [] as number[] };
    const c = cancelPendingGarbage(s, atk);
    check('önce normal düşer, taş ve kilit korunur', c === 1 && atk.normal === 0 && atk.stone === 1 && atk.lock === 2);
  }
  {
    const s = { pendingGarbage: [] } as any;
    const atk = { normal: 2, stone: 0, lock: 0, colors: [] as number[] };
    check('bekleyen çöp yoksa saldırı aynen gider', cancelPendingGarbage(s, atk) === 0 && atk.normal === 2);
  }

  // motor içinde uçtan uca: aynı anda iki dizi = 1 saldırı (klasik kural)
  const run = (counterEnabled: boolean) => {
    const g = createGame({ seed: 5, level: 1, speed: 'low', colors: 3, counterEnabled });
    g.board.fill(0);
    for (let x = 0; x < 4; x++) g.board[15 * COLS + x] = cell(KIND_SINGLE, 0);
    for (let x = 0; x < 4; x++) g.board[14 * COLS + x] = cell(KIND_SINGLE, 1);
    g.virusesLeft = 5;
    queueGarbage(g, { normal: 3, stone: 0, lock: 0 }, 77);
    g.phase = Phase.Settling;
    g.phaseTimer = 1;
    for (let i = 0; i < 60; i++) {
      step(g, []);
      if (g.phase === Phase.Clearing) break;
    }
    return {
      out: g.attackOut ? g.attackOut.normal + g.attackOut.stone + g.attackOut.lock : 0,
      pending: sum(g),
      ev: g.events.find((e) => e.startsWith('counter:')),
    };
  };
  const on = run(true);
  check('açıkken: saldırı gelen çöpü azaltır, rakibe gitmez', on.out === 0 && on.pending === 2 && on.ev === 'counter:1', JSON.stringify(on));
  const off = run(false);
  check('kapalıyken: eski davranış (rakibe gider, çöp kalır)', off.out === 1 && off.pending === 3 && !off.ev, JSON.stringify(off));
}

// --- Güçlendirici kapsüller ---
console.log('\nGüçlendiriciler');
{
  const cfgBase = { seed: 777, level: 1, speed: 'low' as const, colors: 3 };

  // N kapsül doğur; her doğuşta tahtayı boşaltıp (oyun kaybedilmesin) gücü ve renkleri kaydet
  const collect = (powerupsEnabled: boolean, n: number) => {
    const g = createGame({ ...cfgBase, powerupsEnabled });
    g.virusesLeft = 999;
    const out: { a: number; b: number; power: number }[] = [];
    for (let i = 0; i < 200000 && out.length < n; i++) {
      step(g, g.phase === Phase.Falling && g.capsule ? [Input.HardDrop] : []);
      if (g.events.includes('spawn') && g.capsule) {
        out.push({ a: g.capsule.a, b: g.capsule.b, power: g.capsule.power ?? 0 });
        g.board.fill(0);
      }
    }
    return out;
  };

  const on1 = collect(true, 120);
  const on2 = collect(true, 120);
  const off = collect(false, 120);
  check('120 kapsül doğdu', on1.length === 120 && off.length === 120);
  check('aynı tohum → aynı güç programı (herkes aynı güçleri alır)', JSON.stringify(on1) === JSON.stringify(on2));
  check('kapalıyken hiç güçlü kapsül çıkmaz', off.every((x) => x.power === 0));
  const idx = on1.map((x, i) => (x.power ? i : -1)).filter((i) => i >= 0);
  check('açıkken güçlü kapsüller çıkar', idx.length >= 4, `adet=${idx.length}`);
  let gapOk = true;
  for (let i = 1; i < idx.length; i++) if (idx[i] - idx[i - 1] < POWER_MIN_GAP) gapOk = false;
  check('iki güçlü kapsül arasında en az ' + POWER_MIN_GAP + ' kapsül var', gapOk, JSON.stringify(idx));
  check('güçler 1..4 aralığında', on1.every((x) => x.power >= 0 && x.power <= 4));
  check('güç programı normal renk dizisini değiştirmez', on1.every((x, i) => x.a === off[i].a && x.b === off[i].b));

  // Belirli bir kapsülü yerine koyup indir: { yatay kapsül, x=3, y=15 (en alt) }
  const drop = (g: any, power: number | undefined, a = 0, b = 1, x = 3, y = 15) => {
    g.capsule = { x, y, rot: 0, a, b, ...(power ? { power } : {}) };
    g.phase = Phase.Falling;
    step(g, [Input.HardDrop]);
    return g;
  };
  const fresh = (extra: any = {}) => {
    const g = createGame({ ...cfgBase, powerupsEnabled: true, ...extra });
    g.board.fill(0);
    g.virusesLeft = 999;
    return g;
  };

  { // Joker
    const mkRow = () => {
      const g = fresh();
      for (let x = 0; x < 3; x++) g.board[15 * COLS + x] = cell(KIND_SINGLE, 2);
      return g;
    };
    const plain = drop(mkRow(), undefined);
    check('joker olmadan (0,1 renkli kapsül) mavi sıraya eşleşmez', plain.phase !== Phase.Clearing);
    const j = drop(mkRow(), POWER_JOKER);
    check('joker: komşuya uyan renge dönüşüp 5\'li temizler', j.phase === Phase.Clearing && j.clearing.length === 5, `faz=${j.phase} temizlenen=${j.clearing.length}`);
    check('joker: "power:joker" olayı', j.events.includes('power:joker'));
    const lone = drop(fresh(), POWER_JOKER);
    check('joker: hiçbir renk eşleşmiyorsa özgün renkler korunur', colorOf(lone.board[15 * COLS + 3]) === 0 && colorOf(lone.board[15 * COLS + 4]) === 1);
  }
  { // Yıldırım
    const g = drop(fresh({ counterEnabled: false }), POWER_STRIKE);
    check('yıldırım: ' + STRIKE_AMOUNT + ' çöp gönderir', g.attackOut?.normal === STRIKE_AMOUNT && g.events.includes('power:strike'));
    const c = fresh({ counterEnabled: true });
    queueGarbage(c, { normal: 3, stone: 0, lock: 0 }, 5);
    drop(c, POWER_STRIKE);
    const left = c.pendingGarbage.reduce((n: number, x: any) => n + x.columns.length, 0);
    check('yıldırım + karşı saldırı: önce bekleyen çöpü siler, fazlası gider', left === 0 && c.attackOut?.normal === STRIKE_AMOUNT - 3 && c.events.includes('counter:3'), JSON.stringify({ left, out: c.attackOut }));
  }
  { // Kalkan
    const g = drop(fresh(), POWER_SHIELD);
    check('kalkan: oturunca +1', g.shield === 1 && g.events.includes('power:shield'));
    queueGarbage(g, { normal: 5, stone: 2, lock: 1 }, 9);
    check('kalkan: gelen saldırı paketini tamamen emer', g.pendingGarbage.length === 0 && g.shield === 0);
    step(g, []);
    check('kalkan: "shield_block" olayı bir sonraki adımda görünür', g.events.includes('shield_block'));
    queueGarbage(g, { normal: 2, stone: 0, lock: 0 }, 9);
    check('kalkan: ikinci saldırı normal işlenir', g.pendingGarbage.length === 1);
    const two = fresh();
    for (let i = 0; i < 5; i++) drop(two, POWER_SHIELD, 0, 1, 3, 15 - 2 * i);
    check('kalkan en fazla ' + SHIELD_MAX + ' birikir', two.shield === SHIELD_MAX, `shield=${two.shield}`);
  }
  { // Temizlik
    const g = fresh();
    g.board[15 * COLS + 0] = cell(KIND_STONE, 0);
    g.board[14 * COLS + 0] = cell(KIND_SINGLE, 1);          // taşın üstündeki parça
    g.board[15 * COLS + 6] = addLock(cell(KIND_VIRUS, 2));  // kilitli virüs
    queueGarbage(g, { normal: 4, stone: 0, lock: 0 }, 3);
    drop(g, POWER_CLEANSE, 0, 1, 2, 15);
    let stones = 0;
    for (let i = 0; i < g.board.length; i++) if (isStone(g.board[i])) stones++;
    check('temizlik: taşlar kalkar', stones === 0);
    check('temizlik: kilit kalkar, virüs yerinde kalır', !hasLock(g.board[15 * COLS + 6]) && kindOf(g.board[15 * COLS + 6]) === KIND_VIRUS);
    check('temizlik: taşın üstündeki parça düşer', g.board[15 * COLS + 0] !== 0 && g.board[14 * COLS + 0] === 0);
    check('temizlik: bekleyen çöp silinir', g.pendingGarbage.length === 0);
  }
  { // Yeniden bağlanma (resumeGame) — eskiden NaN renk/konum üretiyordu
    const src = createGame({ ...cfgBase });
    const r = resumeGame({ ...cfgBase } as any, src.board, 600, 120, src.virusesLeft);
    check('resumeGame: cols/rows doğru', r.cols === src.board.cols && r.rows === src.board.rows);
    check('resumeGame: sıradaki renkler geçerli sayı', Number.isInteger(r.nextA) && Number.isInteger(r.nextB) && r.nextA < 3 && r.nextB < 3, `${r.nextA},${r.nextB}`);
    let spawned = false;
    for (let i = 0; i < 100 && !spawned; i++) { step(r, []); spawned = !!r.capsule; }
    check('resumeGame: kapsül geçerli konumda doğar', spawned && Number.isFinite(r.capsule!.x) && r.capsule!.x >= 0 && Number.isInteger(r.capsule!.a));
  }
}

// --- Ortak tahta (co-op) güçlendiricileri ---
console.log('\nOrtak tahta güçlendiricileri');
{
  const cfg = { seed: 99, level: 1, speed: 'low' as const, colors: 3, powerupsEnabled: true };
  const mk = () => {
    const g = createCoopGame({ ...cfg }, 2);
    g.board.fill(0);
    g.virusesLeft = 999;
    return g;
  };
  const dropCoop = (g: any, power: number | undefined, x: number, a = 0, b = 1) => {
    g.capsules[0] = { x, y: g.rows - 1, rot: 0, a, b, ...(power ? { power } : {}) };
    stepCoop(g, [[Input.HardDrop], []]);
    return g;
  };

  { // Joker
    const g = mk();
    for (let x = 0; x < 3; x++) g.board[(g.rows - 1) * g.cols + x] = cell(KIND_SINGLE, 2);
    dropCoop(g, POWER_JOKER, 3);
    check('co-op joker: komşu renge uyup temizler', g.phase === Phase.Clearing && g.clearing.length === 5 && g.events.includes('power:joker'), `faz=${g.phase} temizlenen=${g.clearing.length}`);
  }
  { // Yıldırım (virüs avcısı)
    const g = mk();
    const base = (g.rows - 1) * g.cols;
    for (const x of [0, 5, 9, 12, 15]) g.board[base + x] = cell(KIND_VIRUS, x % 3);
    g.virusesLeft = 5;
    dropCoop(g, POWER_STRIKE, 1);
    let left = 0;
    for (let i = 0; i < g.board.length; i++) if (kindOf(g.board[i]) === KIND_VIRUS && g.board[i] !== 0) left++;
    check('co-op yıldırım: 3 virüsü yok eder', left === 2 && g.virusesLeft === 2 && g.events.some((e: string) => e.startsWith('zap:')), `kalan=${left} sayaç=${g.virusesLeft}`);
  }
  { // Son virüsleri yok edince oyun kazanılır
    const g = mk();
    const base = (g.rows - 1) * g.cols;
    for (const x of [0, 6, 12]) g.board[base + x] = cell(KIND_VIRUS, 1);
    g.virusesLeft = 3;
    dropCoop(g, POWER_STRIKE, 2);
    check('co-op yıldırım: son virüsler gidince oyun kazanılır', g.phase === Phase.Won && g.virusesLeft === 0, `faz=${g.phase} sayaç=${g.virusesLeft}`);
  }
  { // Program: kapalıyken hiç, açıkken zaman zaman
    const run = (enabled: boolean) => {
      const g = createCoopGame({ ...cfg, powerupsEnabled: enabled }, 2);
      g.virusesLeft = 999;
      const powers: number[] = [];
      for (let i = 0; i < 300000 && powers.length < 150; i++) {
        stepCoop(g, [[Input.HardDrop], [Input.HardDrop]]);
        for (let p = 0; p < 2; p++) {
          const c = g.capsules[p];
          if (c && g.events.includes(`spawn:p${p}`)) powers.push(c.power ?? 0);
        }
        g.board.fill(0);
      }
      return powers;
    };
    const off = run(false), on = run(true);
    check('co-op: kapalıyken güçlü kapsül yok', off.length >= 100 && off.every((x) => x === 0));
    check('co-op: açıkken yalnızca joker/yıldırım çıkar', on.some((x) => x > 0) && on.every((x) => x === 0 || x === POWER_JOKER || x === POWER_STRIKE), JSON.stringify(on.filter(Boolean)));
  }
}

// --- Rastgele oyun (fuzz): bozuk durum ve çökme taraması ---
console.log('\nRastgele oyunlar (fuzz)');
{
  // küçük, tohumlu rastgele sayı üreteci (testin kendi girdileri için)
  const mulberry = (a: number) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ALL = [Input.Left, Input.Right, Input.RotateCW, Input.RotateCCW, Input.SoftDropOn, Input.SoftDropOff, Input.HardDrop];

  const play = (seed: number, frames: number) => {
    const rnd = mulberry(seed);
    const g = createGame({
      seed, level: (seed % 12) + 1, speed: (['low', 'med', 'hi'] as const)[seed % 3], colors: 3 + (seed % 8),
      powerupsEnabled: true, counterEnabled: seed % 2 === 0, bombEnabled: true, aoeEnabled: seed % 3 === 0,
      missPenaltyEnabled: seed % 4 === 0, normalAttackEnabled: true, stoneAttackEnabled: true, lockAttackEnabled: true,
    } as any);
    let bad = '';
    let powersUsed = 0, shieldBlocks = 0, counters = 0, attacks = 0;
    const kinds: Record<string, number> = {};
    for (let f = 0; f < frames && !isOver(g) && !bad; f++) {
      const inputs: Input[] = [];
      if (rnd() < 0.35) inputs.push(ALL[(rnd() * ALL.length) | 0]);
      if (f % 97 === 0) {
        // dışarıdan gelen saldırı paketi (bazen kalkana çarpar)
        queueGarbage(g, { normal: 1 + ((rnd() * 4) | 0), stone: rnd() < 0.2 ? 1 : 0, lock: rnd() < 0.1 ? 1 : 0 }, (rnd() * 1e9) | 0);
      }
      step(g, inputs);
      for (const e of g.events) {
        if (e.startsWith('power:')) { powersUsed++; kinds[e] = (kinds[e] || 0) + 1; }
        if (e === 'shield_block') shieldBlocks++;
        if (e.startsWith('counter:')) counters++;
      }
      if (g.attackOut) attacks += g.attackOut.normal + g.attackOut.stone + g.attackOut.lock;

      // değişmezler
      const c = g.capsule;
      if (c && !(Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isInteger(c.a) && Number.isInteger(c.b) && c.a >= 0 && c.b >= 0 && c.a < g.cfg.colors && c.b < g.cfg.colors)) bad = `kapsül bozuk f=${f} ${JSON.stringify(c)}`;
      if (g.shield < 0 || g.shield > SHIELD_MAX || !Number.isInteger(g.shield)) bad = `kalkan=${g.shield} f=${f}`;
      if (!Number.isInteger(g.nextA) || !Number.isInteger(g.nextB)) bad = `next NaN f=${f}`;
      if (g.virusesLeft < 0) bad = `virusesLeft<0 f=${f}`;
      for (let i = 0; i < g.board.length; i++) { const v = g.board[i]; if (!Number.isInteger(v) || v < 0 || v > 255) { bad = `tahta bozuk i=${i} v=${v}`; break; } }
      for (const pg of g.pendingGarbage) if (pg.columns.length !== pg.colors.length) { bad = `bekleyen çöp uyumsuz f=${f}`; break; }
    }
    return { g, bad, powersUsed, shieldBlocks, counters, attacks, kinds };
  };

  let bad = '', totalPowers = 0, totalBlocks = 0, totalCounters = 0, games = 0;
  const kindTotals: Record<string, number> = {};
  for (let seed = 1; seed <= 150 && !bad; seed++) {
    const r = play(seed, 6000);
    bad = r.bad ? `tohum ${seed}: ${r.bad}` : '';
    totalPowers += r.powersUsed; totalBlocks += r.shieldBlocks; totalCounters += r.counters; games++;
    for (const [k, v] of Object.entries(r.kinds)) kindTotals[k] = (kindTotals[k] || 0) + v;
  }
  check('150 rastgele oyun (6000 kare): hiç bozuk durum yok', !bad, bad);
  check('fuzz dört güçlendiricinin her birini de tetikledi', ['strike', 'shield', 'joker', 'cleanse'].every((k) => (kindTotals['power:' + k] || 0) > 0), JSON.stringify(kindTotals));
  check('fuzz kalkan engellemesini ve karşı saldırıyı da tetikledi', totalBlocks > 0 && totalCounters > 0, `engel=${totalBlocks} karşı=${totalCounters}`);

  // determinizm: aynı tohum + aynı girdi → birebir aynı son durum (güçlendiriciler açıkken)
  const sig = (g: any) => JSON.stringify([g.frame, g.phase, g.score, g.virusesLeft, g.shield, g.nextPower, Array.from(g.board)]);
  let same = true;
  for (const seed of [7, 21, 88]) if (sig(play(seed, 3000).g) !== sig(play(seed, 3000).g)) same = false;
  check('güçlendiricili oyun aynı girdiyle birebir aynı sonuçlanır', same);
}

// --- Kilit yığınlama ve güç sıklığı ---
console.log('\nKilit yığınlama');
{
  const mk = (extra: any = {}, viruses = 1) => {
    const g = createGame({ seed: 11, level: 1, speed: 'low' as const, colors: 3, ...extra });
    g.board.fill(0);
    for (let i = 0; i < viruses; i++) g.board[(15 - i) * COLS + 7] = cell(KIND_VIRUS, i % 3);
    return g;
  };
  const lockAt = (g: any) => g.board[15 * COLS + 7];

  { // varsayılan: eski davranış (zaten kilitli virüse gelen kilit onu açar)
    const g = mk();
    queueGarbage(g, { normal: 0, stone: 0, lock: 1 }, 1);
    check('varsayılan: ilk kilit eklenir', getLockCount(lockAt(g)) === 1);
    queueGarbage(g, { normal: 0, stone: 0, lock: 1 }, 2);
    check('varsayılan: kilitli virüse gelen kilit onu açar (eski davranış korunur)', getLockCount(lockAt(g)) === 0);
    queueGarbage(g, { normal: 0, stone: 0, lock: 1 }, 3);
    check('varsayılan: tekrar kilitlenir', getLockCount(lockAt(g)) === 1);
  }
  { // yığınlama açık
    const g = mk({ lockStacking: true, lockMaxStack: 3 });
    let events = 0;
    for (let i = 0; i < 5; i++) {
      queueGarbage(g, { normal: 0, stone: 0, lock: 1 }, 10 + i);
      events += g.events.filter((e: string) => e.startsWith('lock_applied:')).length;
      g.events.length = 0;
    }
    check('yığınlama: üst üste eklenir ve sınırda durur (max 3)', getLockCount(lockAt(g)) === 3, `seviye=${getLockCount(lockAt(g))}`);
    check('yığınlama: sınır dolunca olay üretmez (3 olay)', events === 3, `olay=${events}`);
    check('yığınlama: virüs rengi korunur', colorOf(lockAt(g)) === 0 && isVirus(lockAt(g)));
  }
  { // birden çok virüs: yük, sınırı dolmamış virüslere dağılır
    const g = mk({ lockStacking: true, lockMaxStack: 3 }, 2);
    queueGarbage(g, { normal: 0, stone: 0, lock: 10 }, 77);
    const levels = [g.board[15 * COLS + 7], g.board[14 * COLS + 7]].map(getLockCount);
    check('yığınlama: iki virüs, 10 kilit gelince ikisi de sınıra (3+3) ulaşır', levels[0] === 3 && levels[1] === 3, JSON.stringify(levels));
  }
  { // sınır 10
    const g = mk({ lockStacking: true, lockMaxStack: 99 });
    queueGarbage(g, { normal: 0, stone: 0, lock: 50 }, 5);
    check('yığınlama: en yüksek seviye ' + MAX_LOCK_LEVEL + ' ile sınırlıdır', getLockCount(lockAt(g)) === MAX_LOCK_LEVEL);
  }
  { // eşleşme bir katman kırar; virüs ancak kilitsizken temizlenir
    const g = createGame({ seed: 1, level: 1, speed: 'low' as const, colors: 3 });
    g.board.fill(0);
    const virus = addLock(addLock(cell(KIND_VIRUS, 0)));
    const base = 15 * COLS;
    g.board[base] = virus;
    for (let x = 1; x <= 3; x++) g.board[base + x] = cell(KIND_SINGLE, 0);
    let m = findMatches(g.board, g.cfg);
    check('kilitli virüs eşleşmeye katılır ama temizlenmiş sayılmaz', m.cleared.includes(base) && m.virusesCleared === 0);
    applyClear(g.board, m.cleared);
    check('1. eşleşme: 2 katmandan 1 katmana düşer, virüs yerinde', getLockCount(g.board[base]) === 1 && isVirus(g.board[base]));
    for (let x = 1; x <= 3; x++) g.board[base + x] = cell(KIND_SINGLE, 0);
    m = findMatches(g.board, g.cfg);
    applyClear(g.board, m.cleared);
    check('2. eşleşme: kilit tamamen kalkar, virüs hâlâ yerinde', getLockCount(g.board[base]) === 0 && isVirus(g.board[base]));
    for (let x = 1; x <= 3; x++) g.board[base + x] = cell(KIND_SINGLE, 0);
    m = findMatches(g.board, g.cfg);
    check('3. eşleşme: kilitsiz virüs artık temizlenir', m.virusesCleared === 1);
  }
}

console.log('\nGüçlendirici sıklığı');
{
  check('bozuk seviye 1..10 aralığına oturur', normalizePowerFreq(NaN) === 5 && normalizePowerFreq(undefined) === 5 && normalizePowerFreq(0) === 1 && normalizePowerFreq(99) === 10 && normalizePowerFreq(3.4) === 3);
  let mono = true;
  for (let f = 2; f <= 10; f++) {
    const a = powerFreqParams(f - 1), b = powerFreqParams(f);
    if (!(b.gap <= a.gap && b.chance >= a.chance)) mono = false;
  }
  check('seviye arttıkça bekleme azalır, olasılık artar', mono);

  const count = (powerupFreq: number, n = 400) => {
    const g = createGame({ seed: 321, level: 1, speed: 'low' as const, colors: 3, powerupsEnabled: true, powerupFreq });
    g.virusesLeft = 999;
    const idx: number[] = [];
    let spawns = 0;
    for (let i = 0; i < 400000 && spawns < n; i++) {
      step(g, g.phase === Phase.Falling && g.capsule ? [Input.HardDrop] : []);
      if (g.events.includes('spawn') && g.capsule) {
        if (g.capsule.power) idx.push(spawns);
        spawns++;
        g.board.fill(0);
      }
    }
    let minGap = Infinity;
    for (let i = 1; i < idx.length; i++) minGap = Math.min(minGap, idx[i] - idx[i - 1]);
    return { n: idx.length, minGap };
  };
  const f1 = count(1), f5 = count(5), f10 = count(10);
  check('sıklık 1 < 5 < 10 (400 kapsülde güç sayısı)', f1.n < f5.n && f5.n < f10.n, `${f1.n} / ${f5.n} / ${f10.n}`);
  check('seviye 1 çok seyrek (≤ 25 güç / 400 kapsül), seviye 10 çok sık (≥ 60)', f1.n <= 25 && f10.n >= 60, `${f1.n} / ${f10.n}`);
  check('sıklık 1: iki güç arası en az 16 kapsül', f1.minGap >= 16, `minGap=${f1.minGap}`);
  check('sıklık 10: iki güç arası en az 2 kapsül', f10.minGap >= 2, `minGap=${f10.minGap}`);
  check('sıklık 10 hâlâ rastgele (aralıklar sabit değil)', (() => {
    const g = createGame({ seed: 5, level: 1, speed: 'low' as const, colors: 3, powerupsEnabled: true, powerupFreq: 10 });
    g.virusesLeft = 999;
    const gaps: number[] = []; let last = -1, spawns = 0;
    for (let i = 0; i < 400000 && spawns < 300; i++) {
      step(g, g.phase === Phase.Falling && g.capsule ? [Input.HardDrop] : []);
      if (g.events.includes('spawn') && g.capsule) { if (g.capsule.power) { if (last >= 0) gaps.push(spawns - last); last = spawns; } spawns++; g.board.fill(0); }
    }
    return new Set(gaps).size >= 3;
  })());
}

=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
console.log(`\n${pass} geçti, ${fail} başarısız\n`);
process.exit(fail > 0 ? 1 : 0);
