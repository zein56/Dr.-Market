/**
 * Juice modülü testi (tarayıcı gerektirmez). Çalıştır: npm run test:juice
 */
import { Juice } from '../src/game/juice';
import { cell, KIND_SINGLE } from '@pill/game-core';

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}

const COLS = 8;
const board = new Uint8Array(COLS * 16);
const cleared = [0, 1, 2, 3].map((x) => 15 * COLS + x);
for (const i of cleared) board[i] = cell(KIND_SINGLE, 1);

// sahte canvas / ctx
const fakeCanvas: any = { style: { transform: '' } };
let draws = 0;
const fakeCtx: any = new Proxy({}, {
  get: (_t, k) => (k === 'save' || k === 'restore' ? () => {} : () => { draws++; }),
  set: () => true,
});

console.log('\nJuice');
{
  const j = new Juice();
  j.handle({ events: ['clear'], clearing: cleared, board, chain: 1 }, COLS);
  j.update();
  j.draw(fakeCtx, 30, COLS);
  check('temizlemede parçacık çizilir', draws > 0, `draws=${draws}`);

  const j2 = new Juice();
  draws = 0;
  j2.handle({ events: ['chain'], clearing: cleared, board, chain: 4 }, COLS);
  j2.update();
  j2.draw(fakeCtx, 30, COLS);
  const withPopup = draws;
  check('zincirde combo yazısı da çizilir', withPopup > 0);

  j2.applyShake(fakeCanvas);
  check('zincirde ekran sarsıntısı uygulanır', fakeCanvas.style.transform.startsWith('translate('));

  for (let i = 0; i < 80; i++) { j2.update(); j2.applyShake(fakeCanvas); }
  check('efektler bitince sarsıntı sıfırlanır', fakeCanvas.style.transform === '');

  draws = 0;
  j2.draw(fakeCtx, 30, COLS);
  check('efektler bitince çizim yapılmaz', draws === 0, `draws=${draws}`);
}
{
  // parçacık sayısı sınırlı kalmalı (mobil performans)
  const j = new Juice();
  const big = Array.from({ length: 100 }, (_, i) => i);
  for (const i of big) board[i] = cell(KIND_SINGLE, 2);
  for (let k = 0; k < 20; k++) j.handle({ events: ['chain'], clearing: big, board, chain: 6 }, COLS);
  draws = 0;
  j.draw(fakeCtx, 30, COLS);
  check('parçacık sayısı sınırlı', draws < 400, `draws=${draws}`);
}
{
  // bitiş: 'won' konfeti, 'lost' güçlü sarsıntı
  const j = new Juice();
  draws = 0;
  j.handle({ events: ['won'], clearing: [], board, chain: 0 }, COLS);
  j.update(); j.draw(fakeCtx, 30, COLS);
  check('kazanınca konfeti', draws > 0);
  const j3 = new Juice();
  const c: any = { style: { transform: '' } };
  j3.handle({ events: ['lost'], clearing: [], board, chain: 0 }, COLS);
  j3.applyShake(c);
  check('kaybedince sarsıntı', c.style.transform.startsWith('translate('));
}

{
  // karşı saldırı: "BLOK" yazısı + hafif sarsıntı
  const j = new Juice();
  const c: any = { style: { transform: '' } };
  draws = 0;
  j.handle({ events: ['counter:2'], clearing: [], board, chain: 1 }, COLS);
  j.update(); j.draw(fakeCtx, 30, COLS); j.applyShake(c);
  check('karşı saldırıda BLOK efekti çizilir', draws > 0);
  check('karşı saldırıda hafif sarsıntı', c.style.transform.startsWith('translate('));
  const j2 = new Juice();
  draws = 0;
  j2.announce('🎯 Lider', COLS, 16);
  j2.draw(fakeCtx, 30, COLS);
  check('announce ile bilgi yazısı gösterilir', draws > 0);
}

{
  // güçlendirici olayları
  for (const name of ['strike', 'shield', 'joker', 'cleanse', 'bilinmeyen']) {
    const j = new Juice();
    draws = 0;
    j.handle({ events: ['power:' + name], clearing: [], board, chain: 0 }, COLS);
    j.update(); j.draw(fakeCtx, 30, COLS);
    check(`power:${name} yazısı çizilir`, draws > 0);
  }
  const j = new Juice();
  const c: any = { style: { transform: '' } };
  draws = 0;
  j.handle({ events: ['shield_block'], clearing: [], board, chain: 0 }, COLS);
  j.update(); j.draw(fakeCtx, 30, COLS); j.applyShake(c);
  check('kalkan engelleyince yazı + sarsıntı', draws > 0 && c.style.transform.startsWith('translate('));
  const z = new Juice();
  draws = 0;
  z.handle({ events: ['zap:3,20,NaN'], clearing: [], board, chain: 0 }, COLS);
  z.update(); z.draw(fakeCtx, 30, COLS);
  check('zap: kıvılcımlar çizilir, bozuk indeks çökertmez', draws > 0);
}

console.log(`\n${pass} geçti, ${fail} başarısız\n`);
if (fail > 0) process.exit(1);
