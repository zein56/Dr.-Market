/**
 * Bileşen render testi (sunucu tarafı render, tarayıcı gerekmez). Çalıştır: npm run test:components
 * Etkiler (useEffect) çalışmaz; amaç render yolunda çökme, eksik alan ve yanlış oyuncu sayısını yakalamaktır.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import LocalGame from '../src/ui/LocalGame';
import LocalCoopGame from '../src/ui/LocalCoopGame';
import LocalSetup from '../src/ui/LocalSetup';
import ThemePicker from '../src/ui/ThemePicker';
import type { LocalConfig } from '../src/ui/LocalSetup';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = '') => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${name} ${ok ? '' : detail}`); };

const cfg = (over: Partial<LocalConfig> = {}): LocalConfig => ({
  level: 5, speed: 'med', p1Name: 'Ali', p2Name: 'Veli', p3Name: 'Can', p2IsBot: true, p3Enabled: false, p3IsBot: true,
  botDifficulty: 'med', p3BotDifficulty: 'hard', diagMatches: false, counterEnabled: true, powerupsEnabled: true, powerupFreq: 5,
  bombEnabled: false, bombThreshold: 5, aoeEnabled: false, aoeThreshold: 5, missPenaltyEnabled: false, missPenaltyThreshold: 3,
  normalAttackEnabled: true, normalAttackLen: 4, normalAttackRequireCombo: false, stoneAttackEnabled: false, stoneAttackLen: 5,
  stoneAttackRequireCombo: false, lockAttackEnabled: false, lockAttackLen: 6, lockAttackRequireCombo: true, lockStacking: false,
  lockMaxStack: 3, colors: 3, attackMode: 'random', sharedBoard: false, extraPlayers: [], coopPassThrough: false,
  risingEnabled: false, riseSpeed: 5, boardCols: 8, boardRows: 16,
  ...over,
} as any as LocalConfig);

const extras = (n: number) => Array.from({ length: n }, (_, i) => ({ name: i % 2 ? `Ek${i}` : '', isBot: true, difficulty: 'easy' as const }));
const count = (html: string, re: RegExp) => (html.match(re) || []).length;
const noop = () => {};

console.log('\nLocalGame (VS)');
for (const [label, c] of [
  ['2 oyuncu', cfg()],
  ['3 oyuncu', cfg({ p3Enabled: true })],
  ['4 oyuncu', cfg({ p3Enabled: true, extraPlayers: extras(1) })],
  ['6 oyuncu', cfg({ p3Enabled: true, extraPlayers: extras(3) })],
  ['9 ek oyuncu girilse de en fazla 6', cfg({ p3Enabled: true, extraPlayers: extras(9) })],
] as const) {
  let html = '', err = '';
  try { html = renderToString(<LocalGame config={c} onBack={noop} />); } catch (e: any) { err = e.message; }
  const expected = Math.min(c.p3Enabled ? 3 + c.extraPlayers.length : 2, 6);
  check(`${label}: çökmeden render olur ve ${expected} panel çıkar`, !err && count(html, /local-panel/g) >= expected && count(html, /board-canvas/g) === expected, err || `panel=${count(html, /local-panel/g)} canvas=${count(html, /board-canvas/g)}`);
}
{
  const html = renderToString(<LocalGame config={cfg({ p3Enabled: true, extraPlayers: extras(3) })} onBack={noop} />);
  check('4+ oyuncuda ızgara düzeni kullanılır', html.includes('local-many') && html.includes('players-6'));
  check('oyuncu adları görünür (boş ek oyuncu adı "Oyuncu N" olur)', html.includes('Ali') && html.includes('Oyuncu 4') && html.includes('Ek1') && html.includes('Oyuncu 6'));
  check('botlar 🤖 ile işaretlenir', count(html, /🤖/g) >= 4);
  const human = renderToString(<LocalGame config={cfg({ p3Enabled: true, extraPlayers: [{ name: 'Gamer', isBot: false, difficulty: 'med' }] })} onBack={noop} />);
  const plain = human.replace(/<!-- -->/g, ''); // React SSR metin parçalarının arasına yorum koyar
  check('insan ek oyuncu için "Gamepad 4" ipucu', plain.includes('Gamer') && plain.includes('Gamepad 4'));
  const three = renderToString(<LocalGame config={cfg({ p3Enabled: true })} onBack={noop} />);
  check('3 oyuncuda klasik yan yana düzen (VS ayırıcıları)', !three.includes('local-many') && count(three, /local-divider/g) === 2);
  check('ölü ayarlara bakan rozetler yok; açık özellikler görünür (⚔️ ⚡)', three.includes('⚔️') && three.includes('⚡'));
  const land = renderToString(<LocalGame config={cfg()} onBack={noop} landscapeMode />);
  check('yatay modda mobil kontroller çökmeden render olur', land.length > 100);
}

console.log('\nLocalCoopGame (ortak tahta)');
for (const [label, c] of [
  ['2 oyuncu', cfg({ sharedBoard: true })],
  ['3 oyuncu, hayalet', cfg({ sharedBoard: true, p3Enabled: true, coopPassThrough: true })],
  ['4 oyuncu, sonsuz mod', cfg({ sharedBoard: true, p3Enabled: true, extraPlayers: extras(1), risingEnabled: true, riseSpeed: 9 })],
  ['6 oyuncu girilse de en fazla 4', cfg({ sharedBoard: true, p3Enabled: true, extraPlayers: extras(3) })],
] as const) {
  let html = '', err = '';
  try { html = renderToString(<LocalCoopGame config={c} onBack={noop} />); } catch (e: any) { err = e.message; }
  const expected = Math.min(c.p3Enabled ? 3 + c.extraPlayers.length : 2, 4);
  check(`${label}: çökmeden render olur, ${expected} oyuncu kutusu`, !err && count(html, /local-player-name p\d-name/g) === expected, err || `kutu=${count(html, /local-player-name p\d-name/g)}`);
  check(`${label}: sonsuz mod göstergesi ${c.risingEnabled ? 'var' : 'yok'}`, c.risingEnabled ? html.includes('SONSUZ MOD') && html.includes('rise-bar') : !html.includes('SONSUZ MOD'));
}

console.log('\nLocalSetup (kurulum)');
{
  const noop2 = () => {};
  let html = '', err = '';
  try { html = renderToString(<LocalSetup onStart={noop2 as any} />); } catch (e: any) { err = e.message; }
  check('kurulum ekranı çökmeden render olur', !err && html.includes('Yerel Çok Oyunculu'), err);
  void React; // JSX dönüşümü için
  check('tema seçici ve güç ayarı görünür', html.includes('theme-picker') && html.includes('Güçlendiriciler'));
  const th = renderToString(<ThemePicker />);
  check('tema seçici 5 tema düğmesi çizer', count(th, /theme-pill(?!-)/g) >= 5);
}

console.log(`\n${pass} geçti, ${fail} başarısız\n`);
process.exit(fail > 0 ? 1 : 0);
