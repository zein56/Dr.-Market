/**
 * Ortak tahta: donma / takılı tuş / hayalet kapsül / yükselen taban testleri.
 * Çalıştır: npm run test:coop
 * İsteğe bağlı: COOP_MODULE=../src/coop_old.ts ile eski uygulamaya karşı çalıştırılabilir
 * (hata gerçekten yakalanıyor mu diye).
 */
const modPath = process.env.COOP_MODULE || '../src/coop';
const coop: any = await import(modPath);
const sim: any = await import('../src/sim');
const C: any = await import('../src/constants');
const { createCoopGame, stepCoop, countVirusesCoop, riseRowViruses, riseIntervalFrames } = coop;
const { Phase, Input } = sim;
const { cell, KIND_SINGLE, KIND_VIRUS, colorOf } = C;

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = '') => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${name} ${ok ? '' : detail}`); };

const base = { seed: 4242, level: 1, speed: 'low', colors: 3 };
const mk = (extra: any = {}, players = 2) => {
  const g = createCoopGame({ ...base, ...extra }, players);
  g.board.fill(0);
  g.virusesLeft = 999;
  for (let p = 0; p < players; p++) g.spawningTimers[p] = 1e9; // kendiliğinden kapsül doğmasın
  return g;
};
const idx = (g: any, x: number, y: number) => y * g.cols + x;
const run = (g: any, n: number, inputs: any[][] = []) => { for (let i = 0; i < n; i++) stepCoop(g, inputs.length ? inputs : [[], []]); };
const untilPhase = (g: any, phase: number, max = 400) => { for (let i = 0; i < max && g.phase !== phase; i++) stepCoop(g, [[], []]); return g.phase === phase; };

/** p0 bir eşleşme tetikler (alt satırda 3 tekil + kapsül = 4'lü) */
function startMatch(g: any) {
  const y = g.rows - 1;
  for (let x = 0; x < 3; x++) g.board[idx(g, x, y)] = cell(KIND_SINGLE, 0);
  g.capsules[0] = { x: 3, y, rot: 0, a: 0, b: 1 };
  stepCoop(g, [[Input.HardDrop], []]);
}

console.log('\nOrtak tahta: donma ve takılı tuş');
{
  const g = mk();
  startMatch(g);
  check('eşleşme başladı (Clearing)', g.phase === Phase.Clearing);
  g.capsules[1] = { x: 10, y: 3, rot: 0, a: 2, b: 2 };
  g.lockTimers[1] = 0;
  const x0 = g.capsules[1].x;
  stepCoop(g, [[], [Input.Left]]);
  check('eşleşme sürerken diğer oyuncu hareket edebilir', g.capsules[1] && g.capsules[1].x === x0 - 1, `x ${x0} → ${g.capsules[1]?.x}`);
}
{
  // Gerçek hata senaryosu: yöne eşleşmeden ÖNCE basılır, eşleşme sürerken BIRAKILIR.
  const g = mk();
  g.capsules[1] = { x: 10, y: 3, rot: 0, a: 2, b: 2 };
  stepCoop(g, [[], [Input.Left]]);          // sola bas ve basılı tut
  check('sola basıldı (DAS aktif)', g.dasDirs[1] === -1);
  startMatch(g);                            // başkası eşleşme yapıyor
  check('eşleşme sürüyor', g.phase === Phase.Clearing);
  stepCoop(g, [[], [Input.SoftDropOff]]);   // tuşu eşleşme sırasında bırak
  check('tuş bırakma eşleşme sırasında da işlenir (DAS sıfırlanır)', g.dasDirs[1] === 0);
  untilPhase(g, Phase.Falling);
  const xr = g.capsules[1]?.x;
  run(g, 60);
  check('eşleşme bitince kapsül kendiliğinden kaymaz (takılı tuş yok)', g.capsules[1] && g.capsules[1].x === xr, `x ${xr} → ${g.capsules[1]?.x}`);
}
{
  const g = mk();
  g.capsules[1] = { x: 10, y: 1, rot: 0, a: 2, b: 2 };
  stepCoop(g, [[], [Input.SoftDropOn]]);
  check('yumuşak düşüş açıldı', g.softDrops[1] === true);
  startMatch(g);
  stepCoop(g, [[], [Input.SoftDropOff]]);
  check('yumuşak düşüşü eşleşme sırasında bırakmak da işlenir', g.softDrops[1] === false);
}
{
  const g = mk();
  startMatch(g);
  g.capsules[1] = { x: 10, y: g.rows - 1, rot: 0, a: 2, b: 0 };
  g.lockTimers[1] = 0; g.gravityTimers[1] = 0;
  for (let i = 0; i < 20 && g.phase !== Phase.Falling; i++) stepCoop(g, [[], []]);
  check('eşleşme sürerken yerdeki kapsül kilitlenmez (bekler)', g.phase !== Phase.Falling ? g.capsules[1] !== null : true);
  untilPhase(g, Phase.Falling);
  run(g, 40);
  // kilitlendikten sonra aynı oyuncunun YENİ kapsülü doğabilir; eski kapsül yerde kalmamalı
  const respawned = g.capsules[1] === null || g.capsules[1].y < g.rows - 3;
  check('faz dönünce bekleyen kapsül kilitlenir ve tahtaya yazılır', respawned && g.board[idx(g, 10, g.rows - 1)] !== 0 && g.board[idx(g, 11, g.rows - 1)] !== 0);
}
{
  // hızlı bırakma eşleşme sırasında: kapsül yere iner ama faz dönene kadar kilitlenmez
  const g = mk();
  startMatch(g);
  g.capsules[1] = { x: 10, y: 2, rot: 0, a: 2, b: 0 };
  stepCoop(g, [[], [Input.HardDrop]]);
  check('eşleşme sırasında hızlı bırakma: kapsül iner ama henüz kilitlenmez', g.phase !== Phase.Falling && g.capsules[1] && g.capsules[1].y === g.rows - 1);
  untilPhase(g, Phase.Falling);
  run(g, 5);
  check('…faz dönünce hemen kilitlenir', (g.capsules[1] === null || g.capsules[1].y < g.rows - 3) && g.board[idx(g, 10, g.rows - 1)] !== 0);
}
{
  // yerçekimi, düşen kapsülün bulunduğu hücreye parça düşürmez
  const g = mk();
  startMatch(g);
  g.board[idx(g, 5, g.rows - 6)] = cell(KIND_SINGLE, 2);                 // havada tekil parça
  g.capsules[1] = { x: 5, y: g.rows - 5, rot: 0, a: 1, b: 1 };          // hemen altında kapsül
  let overlap = false;
  for (let i = 0; i < 300 && g.phase !== Phase.Falling; i++) {
    stepCoop(g, [[], []]);
    const c = g.capsules[1];
    if (c) {
      const cells = c.rot % 2 === 0 ? [[c.x, c.y], [c.x + 1, c.y]] : [[c.x, c.y], [c.x, c.y - 1]];
      for (const [cx, cy] of cells) if (g.board[idx(g, cx, cy)] !== 0) overlap = true;
    }
  }
  check('yerleşme sırasında düşen parça kapsülün içine girmez', !overlap);
}

console.log('\nOrtak tahta: hayalet kapsül (birbirine engel olmama)');
{
  const off = mk({ coopPassThrough: false });
  off.capsules[0] = { x: 4, y: 5, rot: 0, a: 0, b: 1 };
  off.capsules[1] = { x: 6, y: 5, rot: 0, a: 2, b: 2 };
  stepCoop(off, [[], [Input.Left]]);
  check('kapalıyken: oyuncu diğer kapsüle çarpar, yer değiştirmez', off.capsules[1].x === 6);
  const on = mk({ coopPassThrough: true });
  on.capsules[0] = { x: 4, y: 5, rot: 0, a: 0, b: 1 };
  on.capsules[1] = { x: 6, y: 5, rot: 0, a: 2, b: 2 };
  stepCoop(on, [[], [Input.Left]]);
  check('açıkken: diğer kapsülün hücresine geçebilir', on.capsules[1].x === 5);
}
{
  const g = mk({ coopPassThrough: true });
  const y = g.rows - 1;
  g.capsules[0] = { x: 3, y, rot: 0, a: 0, b: 1 };
  g.capsules[1] = { x: 3, y, rot: 0, a: 2, b: 0 };  // birebir aynı yer
  stepCoop(g, [[Input.HardDrop], []]);
  const c1 = g.capsules[1];
  check('üst üste yere konunca: ikinci kapsül yukarı itilir', c1 && c1.y === y - 1 && g.events.includes('bump:p1'), JSON.stringify(c1));
  check('itilen kapsül tahtadaki hücrelere girmez', c1 && g.board[idx(g, c1.x, c1.y)] === 0 && g.board[idx(g, c1.x + 1, c1.y)] === 0);
  stepCoop(g, [[], [Input.HardDrop]]);
  check('ikinci kapsül birincinin üstüne oturur', g.capsules[1] === null && g.board[idx(g, 3, y - 1)] !== 0 && g.board[idx(g, 4, y - 1)] !== 0 && g.board[idx(g, 3, y)] !== 0);
}
{
  // sığacak yer yoksa (tahta dolu) kayıp
  const g = mk({ coopPassThrough: true });
  const y = 1;
  for (let yy = 0; yy < g.rows; yy++) for (const x of [3, 4]) if (yy !== y + 1) g.board[idx(g, x, yy)] = cell(KIND_SINGLE, 1); // yalnızca kapsülün durduğu satır boş
  g.capsules[0] = { x: 3, y: y + 1, rot: 0, a: 0, b: 1 };
  g.capsules[1] = { x: 3, y: y + 1, rot: 0, a: 2, b: 0 };
  stepCoop(g, [[Input.HardDrop], []]);
  check('itilecek yer yoksa oyun kaybedilir (çökmez)', g.phase === Phase.Lost);
}

console.log('\nOrtak tahta: şerit sınırı (botlar için)');
{
  const g = mk({}, 3);
  g.laneLimits[1] = [8, 16];
  g.capsules[1] = { x: 14, y: 3, rot: 0, a: 1, b: 1 };       // hücreler 14 ve 15: şeridin sağ ucu
  stepCoop(g, [[], [Input.Right], []]);
  check('şerit sınırı: sağ uçta sağa gidilemez (komşu şerit boş olsa bile)', g.capsules[1].x === 14);
  for (let i = 0; i < 40; i++) stepCoop(g, [[], [], []]);
  check('şerit sınırı: basılı tutma (DAS) kapsülü şerit dışına taşıyamaz', g.capsules[1].x === 14, `x=${g.capsules[1]?.x}`);
  g.capsules[1] = { x: 15, y: 3, rot: 1, a: 1, b: 1 };       // dikey, şeridin son sütununda
  stepCoop(g, [[], [Input.RotateCW], []]);
  const c = g.capsules[1];
  check('şerit sınırı: kenarda dönerken komşu şeride geçmez', c.x + (c.rot % 2 === 0 ? 2 : 1) <= 16 && c.x >= 8, JSON.stringify(c));
  const free = mk({}, 3);
  free.capsules[1] = { x: 14, y: 3, rot: 0, a: 1, b: 1 };
  stepCoop(free, [[], [Input.Right], []]);
  check('sınırsız oyuncu (varsayılan) komşu şeride geçebilir', free.capsules[1].x === 15);
  const sp = mk({}, 3);
  sp.laneLimits[2] = [16, 24];
  sp.spawningTimers[2] = 0;
  stepCoop(sp, [[], [], []]);
  check('şerit sınırlı oyuncu kendi şeridinde doğar', sp.capsules[2] && sp.capsules[2].x >= 16 && sp.capsules[2].x + 1 < 24, JSON.stringify(sp.capsules[2]));
}

console.log('\nYükselen taban (sonsuz mod)');
{
  check('seviyeyle orantılı virüs sayısı artar', riseRowViruses(20, 16) > riseRowViruses(0, 16) && riseRowViruses(10, 16) >= riseRowViruses(5, 16));
  check('satır başına en az 1, en çok yarısı kadar virüs', [0, 5, 10, 20].every((l) => riseRowViruses(l, 16) >= 1 && riseRowViruses(l, 16) <= 8) && riseRowViruses(20, 6) <= 3);
  check('hız 10 > hız 1 (aralık kısalır); sınırlar 240/1500 kare', riseIntervalFrames(10) < riseIntervalFrames(1) && riseIntervalFrames(10) === 240 && riseIntervalFrames(1) === 1500);
  check('bozuk hız değeri varsayılana (5) düşer', riseIntervalFrames(NaN) === riseIntervalFrames(5) && riseIntervalFrames(99) === 240 && riseIntervalFrames(-3) === 1500);
}
{
  const g = createCoopGame({ ...base, level: 6, risingEnabled: true, riseSpeed: 10 }, 2);
  for (let p = 0; p < 2; p++) g.spawningTimers[p] = 1e9;
  const before = Array.from(g.board);
  let guard = 0;
  while (g.riseCount < 1 && guard++ < 400) stepCoop(g, [[], []]);
  check('belirlenen aralıkta tahta yükseldi', g.riseCount === 1 && guard <= 241, `riseCount=${g.riseCount} kare=${guard}`);
  let shifted = true;
  for (let y = 0; y < g.rows - 1 && shifted; y++) for (let x = 0; x < g.cols; x++) if (g.board[idx(g, x, y)] !== before[idx(g, x, y + 1)]) { shifted = false; break; }
  check('mevcut her şey tam bir satır yukarı çıktı', shifted);
  let bottom = 0;
  for (let x = 0; x < g.cols; x++) if (g.board[idx(g, x, g.rows - 1)] !== 0) bottom++;
  check('alt satıra seviyeyle orantılı virüsler eklendi', bottom === riseRowViruses(6, g.cols), `eklenen=${bottom} beklenen=${riseRowViruses(6, g.cols)}`);
  check('virüs sayacı tahtayla tutarlı', g.virusesLeft === countVirusesCoop(g.board), `${g.virusesLeft} / ${countVirusesCoop(g.board)}`);
  check('"rise" olayı ve animasyon sayacı', g.riseAnim > 0);
}
{
  // üçlü eşleşme oluşturmaz (yeni satır + üstündeki hücreler)
  const g = createCoopGame({ ...base, level: 20, colors: 3, risingEnabled: true, riseSpeed: 10 }, 3);
  for (let p = 0; p < 3; p++) g.spawningTimers[p] = 1e9;
  let bad = false;
  for (let r = 0; r < 12 && g.phase !== Phase.Lost; r++) {
    const target = g.riseCount + 1;
    for (let i = 0; i < 400 && g.riseCount < target && g.phase !== Phase.Lost; i++) stepCoop(g, [[], [], []]);
    const y = g.rows - 1;
    for (let x = 0; x < g.cols; x++) {
      const c = g.board[idx(g, x, y)]; if (!c) continue;
      let run = 1;
      for (let k = x + 1; k < g.cols && g.board[idx(g, k, y)] && colorOf(g.board[idx(g, k, y)]) === colorOf(c); k++) run++;
      let vr = 1;
      for (let k = y - 1; k >= 0 && g.board[idx(g, x, k)] && colorOf(g.board[idx(g, x, k)]) === colorOf(c); k--) vr++;
      if (run >= 3 || vr >= 3) bad = true;
    }
  }
  check('yeni virüs satırları üçlü dizi oluşturmaz', !bad);
}
{
  // sayaç eşleşme/yerleşme sırasında durur
  const g = mk({ risingEnabled: true, riseSpeed: 5 });
  g.riseTimer = 500;
  startMatch(g);
  const t0 = g.riseTimer;
  for (let i = 0; i < 10 && g.phase !== Phase.Falling; i++) stepCoop(g, [[], []]);
  check('eşleşme sürerken yükselme sayacı durur', g.phase !== Phase.Falling && g.riseTimer === t0, `${t0} → ${g.riseTimer}`);
}
{
  // sonsuz modda virüsler bitince oyun kazanılmaz; normal modda kazanılır
  const endless = mk({ risingEnabled: true });
  endless.virusesLeft = 0; endless.phase = Phase.Settling; endless.phaseTimer = 1;
  untilPhase(endless, Phase.Falling, 10);
  const normal = mk({});
  normal.virusesLeft = 0; normal.phase = Phase.Settling; normal.phaseTimer = 1;
  for (let i = 0; i < 10 && normal.phase === Phase.Settling; i++) stepCoop(normal, [[], []]);
  check('sonsuz mod: virüs bitince oyun devam eder (kazanma yok)', endless.phase === Phase.Falling);
  check('normal mod: virüs bitince oyun kazanılır (davranış korunur)', normal.phase === Phase.Won);
}
{
  // taşma
  const g = mk({ risingEnabled: true });
  g.board[idx(g, 4, 0)] = cell(KIND_SINGLE, 1);
  g.riseTimer = 1;
  stepCoop(g, [[], []]);
  check('en üst satır doluyken yükselme oyunu bitirir', g.phase === Phase.Lost && g.events.includes('rise_overflow'));
}
{
  // yükselen tahta kapsülün içine girerse kapsül yukarı itilir
  const g = mk({ risingEnabled: true, level: 20 });
  g.capsules[0] = { x: 2, y: g.rows - 1, rot: 0, a: 0, b: 1 };
  g.riseTimer = 1;
  let ok = true;
  for (let t = 0; t < 8; t++) {
    g.riseTimer = 1;
    stepCoop(g, [[], []]);
    const c = g.capsules[0];
    if (g.phase === Phase.Lost) break;
    if (!c) { ok = false; break; }
    for (const [cx, cy] of [[c.x, c.y], [c.x + 1, c.y]]) if (g.board[idx(g, cx, cy)] !== 0) ok = false;
  }
  check('yükselirken kapsül hiçbir zaman dolu hücrenin içinde kalmaz', ok);
}
{
  // belirleyicilik
  const play = () => {
    const g = createCoopGame({ ...base, level: 8, risingEnabled: true, riseSpeed: 9, coopPassThrough: true, powerupsEnabled: true }, 2);
    for (let i = 0; i < 1500 && g.phase !== Phase.Lost; i++) stepCoop(g, [[i % 90 === 0 ? Input.Left : i % 70 === 0 ? Input.Right : Input.SoftDropOff], [i % 111 === 0 ? Input.HardDrop : Input.RotateCW]]);
    return JSON.stringify([g.frame, g.phase, g.riseCount, g.virusesLeft, Array.from(g.board)]);
  };
  check('aynı tohum + girdi → aynı sonuç (yükselme + hayalet + güç)', play() === play());
}

console.log('\nOrtak tahta: rastgele oyunlar (fuzz)');
{
  const mulberry = (a: number) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ALL = [Input.Left, Input.Right, Input.RotateCW, Input.RotateCCW, Input.SoftDropOn, Input.SoftDropOff, Input.HardDrop];
  const cellsOf = (c: any) => (c.isBomb ? [[c.x, c.y]] : c.rot % 2 === 0 ? [[c.x, c.y], [c.x + 1, c.y]] : [[c.x, c.y], [c.x, c.y - 1]]);

  let bad = '', rises = 0, bumps = 0, locksDuringClear = 0, games = 0;
  for (let seed = 1; seed <= 120 && !bad; seed++) {
    const rnd = mulberry(seed);
    const players = 2 + (seed % 3);
    const ghost = seed % 2 === 0;
    const rising = seed % 3 !== 0;
    const g = createCoopGame({
      seed, level: seed % 15, speed: (['low', 'med', 'hi'] as const)[seed % 3], colors: 3 + (seed % 5),
      powerupsEnabled: seed % 4 !== 0, powerupFreq: 1 + (seed % 10),
      coopPassThrough: ghost, risingEnabled: rising, riseSpeed: 6 + (seed % 5), bombEnabled: true,
    } as any, players);
    games++;
    for (let f = 0; f < 3000 && g.phase !== Phase.Lost && g.phase !== Phase.Won && !bad; f++) {
      const inputs: any[][] = [];
      for (let p = 0; p < players; p++) inputs.push(rnd() < 0.4 ? [ALL[(rnd() * ALL.length) | 0]] : []);
      stepCoop(g, inputs);
      for (const e of g.events) { if (e.startsWith('rise:')) rises++; if (e.startsWith('bump:')) bumps++; }
      // Rastgele oyuncular çabuk dolduğu için, tahta yükselince üst satırları boşaltıp oyunu uzatıyoruz
      // (böylece yükselme ve hayalet itme uzun süre sınanır). Sayaç yeniden senkronlanır.
      if (f % 90 === 89 && g.phase === Phase.Falling) {
        for (let y = 0; y < Math.floor(g.rows * 0.6); y++) for (let x = 0; x < g.cols; x++) g.board[y * g.cols + x] = 0;
        g.virusesLeft = countVirusesCoop(g.board);
      }
      if (g.phase === Phase.Lost || g.phase === Phase.Won) break;

      // değişmezler
      const occupied = new Map<number, number>();
      for (let p = 0; p < players; p++) {
        const c = g.capsules[p];
        if (!c) continue;
        if (![c.x, c.y, c.rot, c.a, c.b].every(Number.isFinite)) { bad = `tohum ${seed} f=${f}: kapsül NaN ${JSON.stringify(c)}`; break; }
        for (const [cx, cy] of cellsOf(c)) {
          if (cx < 0 || cx >= g.cols || cy < 0 || cy >= g.rows) { bad = `tohum ${seed} f=${f}: kapsül sınır dışı ${JSON.stringify(c)}`; break; }
          if (g.board[cy * g.cols + cx] !== 0) { bad = `tohum ${seed} f=${f} (${ghost ? 'hayalet' : 'normal'}${rising ? '+yükselen' : ''}): kapsül dolu hücrenin içinde ${JSON.stringify(c)} faz=${g.phase}`; break; }
          const key = cy * g.cols + cx;
          if (!ghost && occupied.has(key)) { bad = `tohum ${seed} f=${f}: normal modda iki kapsül üst üste`; break; }
          occupied.set(key, p);
        }
        if (bad) break;
      }
      if (bad) break;
      for (let i = 0; i < g.board.length; i++) { const v = g.board[i]; if (!Number.isInteger(v) || v < 0 || v > 255) { bad = `tohum ${seed}: bozuk hücre ${v}`; break; } }
      if (!bad && g.phase === Phase.Falling && g.virusesLeft !== countVirusesCoop(g.board)) bad = `tohum ${seed} f=${f}: virusesLeft=${g.virusesLeft} tahta=${countVirusesCoop(g.board)}`;
    }
  }
  check('120 rastgele ortak tahta oyunu (2–4 oyuncu): hiç bozuk durum yok', !bad, bad);
  check('fuzz yükselmeyi ve hayalet itmeyi gerçekten tetikledi', rises > 20 && bumps > 0, `yükselme=${rises} itme=${bumps}`);
}

console.log(`\n${pass} geçti, ${fail} başarısız\n`);
process.exit(fail > 0 ? 1 : 0);
