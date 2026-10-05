/**
 * Çizim kodu testi (tarayıcı/canvas gerektirmez). Çalıştır: npm run test:render
 * Her tema x sahne için çizimin hata vermediğini ve save/restore çiftlerinin dengeli
 * olduğunu doğrular (dengesiz save/restore tuval durumunu sızdırır).
 */
import {
  createGame, createCoopGame, Phase, cell, addLock,
  KIND_STONE, KIND_SINGLE, KIND_VIRUS, COLS,
  POWER_STRIKE, POWER_SHIELD, POWER_JOKER, POWER_CLEANSE,
} from '@pill/game-core';
import { drawBoard, drawMini, drawNext, drawIncomingMeter, advanceAnim } from '../src/game/render';
import { drawVirusCharacter, type Mood } from '../src/game/characters';
import { THEMES, THEME_IDS, applyTheme, currentTheme, isThemeId } from '../src/game/themes';
import { drawPowerIcon, rainbowSwatch } from '../src/game/powerviz';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${name} ${ok ? '' : detail}`);
};

/** Her çağrıyı kabul eden sahte 2D bağlam; save/restore dengesini izler. */
function fakeCtx() {
  const st = { depth: 0, minDepth: 0, calls: 0 };
  const target: any = {};
  const ctx: any = new Proxy(target, {
    get(_t, k: string) {
      if (k === '__st') return st;
      if (k === 'save') return () => { st.depth++; st.calls++; };
      if (k === 'restore') return () => { st.depth--; st.minDepth = Math.min(st.minDepth, st.depth); st.calls++; };
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (k in target) return target[k];
      return () => { st.calls++; };
    },
    set(t, k: string, v) { t[k] = v; return true; },
  });
  return ctx;
}
const stat = (ctx: any) => ctx.__st as { depth: number; minDepth: number; calls: number };

for (let i = 0; i < 50; i++) advanceAnim();

console.log('\nTemalar');
{
  check('5 tema tanımlı', THEME_IDS.length === 5);
  check('her temada 10 renkli palet', THEME_IDS.every((id) => THEMES[id].palette.length === 10));
  const isColor = (c: string) => /^#[0-9a-fA-F]{6}$/.test(c);
  check('tüm palet/zemin renkleri geçerli #RRGGBB', THEME_IDS.every((id) => {
    const t = THEMES[id];
    return [t.gridBg, t.gridLine, t.border, ...t.stone, ...t.palette.flat()].every(isColor);
  }));
  const keys = (id: any) => Object.keys(THEMES[id as keyof typeof THEMES].css).sort().join();
  check('her tema aynı CSS değişkenlerini tanımlar', THEME_IDS.every((id) => keys(id) === keys('classic')));
  check('bir temada palet renkleri birbirinden farklı', THEME_IDS.every((id) => new Set(THEMES[id].palette.map((p) => p[0])).size === 10));
  check('geçersiz tema kimliği klasiğe düşer', applyTheme('yok', false) === 'classic' && currentTheme().id === 'classic' && !isThemeId('yok'));
}

console.log('\nKarakterler');
{
  const moods: Mood[] = ['calm', 'cackle', 'worried', 'scared', 'dead'];
  let ok = true, msg = '';
  for (const style of ['glossy', 'flat', 'neon', 'pixel'] as const) {
    for (let color = 0; color < 10; color++) {
      for (const mood of moods) {
        const ctx = fakeCtx();
        try {
          drawVirusCharacter(ctx, 10, 20, 48, color, THEMES.classic.palette[color], { mood, look: { dx: 5, dy: -9 }, tick: 77, style });
          const s = stat(ctx);
          if (s.depth !== 0 || s.minDepth < 0 || s.calls === 0) { ok = false; msg = `${style}/${color}/${mood} save-restore=${s.depth}`; }
        } catch (e: any) { ok = false; msg = `${style}/${color}/${mood}: ${e.message}`; }
      }
    }
  }
  check('4 stil x 10 karakter x 5 ruh hali hatasız, save/restore dengeli', ok, msg);
  const ctx = fakeCtx();
  let nanOk = true;
  try {
    drawVirusCharacter(ctx, 0, 0, 40, NaN as any, THEMES.classic.palette[0], { mood: 'calm', look: null, tick: 0, style: 'glossy' });
    drawVirusCharacter(ctx, 0, 0, 40, -3, THEMES.classic.palette[0], { mood: 'calm', look: null, tick: 0, style: 'glossy' });
  } catch { nanOk = false; }
  check('bozuk renk numarası (NaN, negatif) çökertmez', nanOk);
}

console.log('\nTahta çizimi');
{
  const powers = [0, POWER_STRIKE, POWER_SHIELD, POWER_JOKER, POWER_CLEANSE];
  let ok = true, msg = '';
  for (const id of THEME_IDS) {
    applyTheme(id, false);
    for (const power of powers) {
      for (const scene of ['calm', 'danger'] as const) {
        const g = createGame({ seed: 3, level: scene === 'calm' ? 20 : 4, speed: 'med', colors: 10, powerupsEnabled: true });
        if (scene === 'danger') {
          for (let x = 0; x < COLS; x++) g.board[COLS + x] = x % 2 ? cell(KIND_STONE, 0) : cell(KIND_SINGLE, x);
          g.board[10 * COLS + 2] = addLock(cell(KIND_VIRUS, 3));
        }
        g.shield = power === POWER_SHIELD ? 2 : 0;
        g.capsule = { x: 3, y: 5, rot: power % 4, a: 0, b: 7, ...(power ? { power } : {}) };
        g.phase = Phase.Falling;
        const ctx = fakeCtx();
        try {
          const clearing = scene === 'danger' ? [10 * COLS + 1, 10 * COLS + 2, 12 * COLS + 5] : [];
          drawBoard(ctx, g.board, { cellSize: 40, showGhost: true, clearing, clearPulse: 0, effects: [{ type: 'penalty', idx: 5, timer: 10 }] }, g);
          drawIncomingMeter(ctx, 40, 16, 5);
          drawMini(ctx, g.board, 6);
          drawNext(ctx, 1, 4, 40, power);
          const s = stat(ctx);
          if (s.depth !== 0 || s.minDepth < 0) { ok = false; msg = `${id}/güç${power}/${scene} save-restore=${s.depth}`; }
        } catch (e: any) { ok = false; msg = `${id}/güç${power}/${scene}: ${e.message}`; }
      }
    }
  }
  check('5 tema x 5 güç x 2 sahne (tek oyunculu) hatasız, dengeli', ok, msg);
}
{
  let ok = true, msg = '';
  for (const id of THEME_IDS) {
    applyTheme(id, false);
    const g = createCoopGame({ seed: 4, level: 5, speed: 'med', colors: 6, powerupsEnabled: true }, 3);
    g.capsules[0] = { x: 2, y: 4, rot: 0, a: 0, b: 1, power: POWER_JOKER };
    g.capsules[1] = { x: 10, y: 4, rot: 1, a: 2, b: 3, power: POWER_STRIKE };
    g.capsules[2] = { x: 18, y: 4, rot: 0, a: 1, b: 1 };
    const ctx = fakeCtx();
    try {
      drawBoard(ctx, g.board, { cols: g.cols, rows: g.rows, cellSize: 30, showGhost: true, clearing: [], clearPulse: 0 }, g);
      drawNext(ctx, 0, 1, 30, g.nextPowers[0]);
      const s = stat(ctx);
      if (s.depth !== 0 || s.minDepth < 0) { ok = false; msg = `${id} save-restore=${s.depth}`; }
    } catch (e: any) { ok = false; msg = `${id}: ${e.message}`; }
  }
  check('ortak tahta çizimi (3 oyuncu, güçlü kapsüller) her temada hatasız', ok, msg);
}
{
  // yükselen taban: canavar, uyarı parıltısı ve kayma animasyonu her temada, 2-4 oyuncuyla
  let ok = true, msg = '';
  for (const id of THEME_IDS) {
    applyTheme(id, false);
    for (const players of [2, 3, 4]) {
      for (const [timer, anim, count] of [[900, 0, 0], [60, 0, 3], [10, 0, 9], [900, 14, 12]] as const) {
        const g: any = createCoopGame({ seed: 8, level: 6, speed: 'med', colors: 10, risingEnabled: true, riseSpeed: 7 }, players);
        g.riseTimer = timer; g.riseAnim = anim; g.riseCount = count;
        g.capsules[0] = { x: 2, y: 4, rot: 0, a: 0, b: 1 };
        const ctx = fakeCtx();
        try {
          drawBoard(ctx, g.board, { cols: g.cols, rows: g.rows, cellSize: 24, showGhost: true, clearing: [], clearPulse: 0 }, g);
          const s = stat(ctx);
          if (s.depth !== 0 || s.minDepth < 0) { ok = false; msg = `${id}/${players}oy/timer${timer} save-restore=${s.depth}`; }
        } catch (e: any) { ok = false; msg = `${id}/${players}oy/timer${timer}: ${e.message}`; }
      }
    }
  }
  check('yükselen taban (canavar + uyarı + kayma) 5 tema x 2-4 oyuncu hatasız, dengeli', ok, msg);
}
{
  const ctx = fakeCtx();
  let ok = true;
  try {
    for (const p of [POWER_STRIKE, POWER_SHIELD, POWER_JOKER, POWER_CLEANSE, 0, 99]) drawPowerIcon(ctx, p, 20, 20, 12, 5);
    const sw = rainbowSwatch(123, 80);
    ok = sw.length === 3 && sw.every((c) => c.startsWith('hsl('));
  } catch { ok = false; }
  check('güç ikonları ve gökkuşağı renkleri (bilinmeyen güç dahil) hatasız', ok && stat(ctx).depth === 0);
}

console.log(`\n${pass} geçti, ${fail} başarısız\n`);
process.exit(fail > 0 ? 1 : 0);
