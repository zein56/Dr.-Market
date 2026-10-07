/**
 * Yerel çok oyunculu yardımcıların testleri (tarayıcı gerektirmez). Çalıştır: npm run test:local
 */
import { Input, Phase, createCoopGame, stepCoop } from '@pill/game-core';
import {
  buildPlayerSlots, KEY_PRESS, KEY_RELEASE, attachLocalKeyboard, localAttackTargets, resolveVsMatch,
  MAX_VS_PLAYERS, MAX_COOP_PLAYERS, type KeyScheme,
} from '../src/ui/localPlayers';
import { coopLaneView } from '../src/game/coopBot';
import { createBotState, tickBot } from '../src/game/bot';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = '') => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${name} ${ok ? '' : detail}`); };

const baseCfg: any = {
  p1Name: 'A', p2Name: 'B', p3Name: 'C', p2IsBot: false, p3Enabled: false, p3IsBot: true,
  botDifficulty: 'med', p3BotDifficulty: 'hard', extraPlayers: [],
};

console.log('\nOyuncu yuvaları');
{
  const two = buildPlayerSlots(baseCfg, 'vs');
  check('varsayılan 2 oyuncu', two.length === 2 && two[0].keyScheme === 'wasd' && two[1].keyScheme === 'arrows');
  const three = buildPlayerSlots({ ...baseCfg, p3Enabled: true }, 'vs');
  check('3. oyuncu açılınca 3 yuva, numpad düzeni', three.length === 3 && three[2].keyScheme === 'numpad' && three[2].isBot && three[2].difficulty === 'hard');
  const extras = [1, 2, 3, 4, 5].map((i) => ({ name: i % 2 ? `E${i}` : '', isBot: true, difficulty: 'easy' as const }));
  const six = buildPlayerSlots({ ...baseCfg, p3Enabled: true, extraPlayers: extras }, 'vs');
  check(`VS en fazla ${MAX_VS_PLAYERS} oyuncu (fazlası kesilir)`, six.length === MAX_VS_PLAYERS);
  check('ek oyuncular klavyesiz (gamepad/bot), numaralar sıralı', six.slice(3).every((s, i) => s.keyScheme === null && s.index === 3 + i));
  check('boş ek oyuncu adı "Oyuncu N" olur', six[4].name === 'Oyuncu 5' && six[3].name === 'E1');
  const coop = buildPlayerSlots({ ...baseCfg, p3Enabled: true, extraPlayers: extras }, 'coop');
  check(`ortak tahtada en fazla ${MAX_COOP_PLAYERS} oyuncu`, coop.length === MAX_COOP_PLAYERS);
  const noP3 = buildPlayerSlots({ ...baseCfg, p3Enabled: false, extraPlayers: extras }, 'vs');
  check('3. oyuncu kapalıyken ek oyuncular yok sayılır', noP3.length === 2);
}

console.log('\nKlavye');
{
  const schemes = Object.keys(KEY_PRESS) as KeyScheme[];
  const seen = new Map<string, KeyScheme>();
  let overlap = '';
  for (const sc of schemes) for (const code of Object.keys(KEY_PRESS[sc])) { if (seen.has(code)) overlap = `${code} (${seen.get(code)}/${sc})`; seen.set(code, sc); }
  check('hiçbir tuş iki oyuncuda ortak değil', !overlap, overlap);
  check('bırakma tuşları, kendi düzeninin basma tuşlarındandır', schemes.every((sc) => KEY_RELEASE[sc].every((c) => c in KEY_PRESS[sc])));

  const target = new EventTarget() as any;
  const log: Array<[number, number]> = [];
  const others: string[] = [];
  let prevented = 0;
  const gp = new Set<number>();
  const slots = buildPlayerSlots({ ...baseCfg, p3Enabled: true, p3IsBot: false }, 'vs');
  slots[2].isBot = true; // 3. oyuncu bot: klavye dinlenmez
  const detach = attachLocalKeyboard({ slots, sink: (p, i) => log.push([p, i]), gamepadAssigned: (p) => gp.has(p), onOtherKey: (e) => others.push(e.code), target });
  const fire = (type: string, code: string) => { const e: any = new Event(type, { cancelable: true }); e.code = code; const o = e.preventDefault.bind(e); e.preventDefault = () => { prevented++; o(); }; target.dispatchEvent(e); };

  fire('keydown', 'KeyA');
  check('P1 sola basar', log.length === 1 && log[0][0] === 0 && log[0][1] === Input.Left);
  fire('keydown', 'KeyA'); fire('keydown', 'KeyA');
  check('tuş tekrarı yeni girdi üretmez', log.length === 1);
  fire('keyup', 'KeyA');
  check('bırakınca SoftDropOff (basılı tutma durumu sıfırlanır)', log.length === 2 && log[1][1] === Input.SoftDropOff);
  fire('keydown', 'KeyA');
  check('bırakıldıktan sonra tekrar basılabilir', log.length === 3 && log[2][1] === Input.Left);
  fire('keydown', 'ArrowDown');
  check('P2 oklarla oynar', log[log.length - 1][0] === 1 && log[log.length - 1][1] === Input.SoftDropOn);
  const before = log.length;
  fire('keydown', 'Numpad4');
  check('bot olan oyuncunun klavyesi dinlenmez', log.length === before && others.includes('Numpad4'));
  check('eşlenen tuşlar sayfayı kaydırmaz (preventDefault)', prevented >= 4);
  gp.add(0);
  const b2 = log.length;
  fire('keydown', 'KeyD');
  check('gamepad atanan oyuncunun klavyesi kapanır', log.length === b2);
  gp.delete(0);
  fire('keydown', 'KeyS'); fire('keydown', 'ArrowLeft');
  const n = log.length;
  target.dispatchEvent(new Event('blur'));
  const offs = log.slice(n);
  check('pencere odağı kaybolunca bütün insan oyuncular için bırakma gönderilir', offs.length === 2 && offs.every(([, i]) => i === Input.SoftDropOff) && new Set(offs.map(([p]) => p)).size === 2);
  fire('keydown', 'KeyS');
  check('odak kaybından sonra tuş yeniden basılabilir', log[log.length - 1][1] === Input.SoftDropOn);
  detach();
  const c = log.length;
  fire('keydown', 'KeyA'); target.dispatchEvent(new Event('blur'));
  check('detach sonrası olay işlenmez', log.length === c);
}

console.log('\nSaldırı hedefi ve maç sonucu');
{
  const alive = [true, true, false, true, true, false];
  let ok = true;
  for (let i = 0; i < 200; i++) { const t = localAttackTargets(alive, 0, 'random'); if (t.length !== 1 || t[0] === 0 || !alive[t[0]]) ok = false; }
  check('random: kendini ve elenmişi seçmez', ok);
  check('all: hayatta olan bütün rakipler', JSON.stringify(localAttackTargets(alive, 0, 'all')) === '[1,3,4]');
  check('rakip kalmadıysa boş', localAttackTargets([true, false, false], 0, 'all').length === 0);
  check('deterministik rnd ile seçim', localAttackTargets([true, true, true, true], 0, 'random', () => 0.999)[0] === 3 && localAttackTargets([true, true, true, true], 0, 'random', () => 0)[0] === 1);

  const F = Phase.Falling, L = Phase.Lost, W = Phase.Won;
  let r = resolveVsMatch([F, L]);
  check('2 oyuncu: biri kaybedince diğeri kazanır, maç biter', r.done && r.results[0] === 'won' && r.results[1] === 'lost');
  r = resolveVsMatch([W, F]);
  check('biri virüsleri bitirince kazanır, diğeri kaybeder', r.done && r.results[0] === 'won' && r.results[1] === 'lost');
  r = resolveVsMatch([L, F, F]);
  check('3 oyuncu: biri elenince maç SÜRER', !r.done && r.results[0] === 'lost' && r.results[1] === null);
  r = resolveVsMatch([L, L, F]);
  check('3 oyuncu: tek kişi kalınca o kazanır', r.done && r.results[2] === 'won');
  r = resolveVsMatch([L, F, F, F, F, F]);
  check('6 oyuncu: 5 kişi ayakta maç sürer', !r.done);
  r = resolveVsMatch([L, L, F, L, L, L]);
  check('6 oyuncu: son kalan kazanır', r.done && r.results[2] === 'won' && r.results.filter((x) => x === 'won').length === 1);
  r = resolveVsMatch([L, L, L]);
  check('herkes aynı anda elenirse kazanan yok', r.done && !r.results.includes('won'));
  r = resolveVsMatch([F, F, W, F]);
  check('4 oyuncu: 3. oyuncu virüsleri bitirirse kazanır, herkes biter', r.done && r.results[2] === 'won' && r.results.filter((x) => x === 'lost').length === 3);
  check('tek oyuncuda maç bitmez (karşılaştıracak kimse yok)', !resolveVsMatch([F]).done);
}

console.log('\nOrtak tahta botu');
{
  const cfg: any = { seed: 12, level: 2, speed: 'med', colors: 3 };
  const g: any = createCoopGame(cfg, 3, 8, 16);
  g.capsules[1] = { x: 8 + 3, y: 4, rot: 0, a: 1, b: 2 };
  g.board[10 * g.cols + 9] = 17;
  const v = coopLaneView(g, 1, 8) as any;
  check('şerit görünümü boyutu ve hücreleri doğru', v.board.cols === 8 && v.board.rows === 16 && v.board[10 * 8 + 1] === 17);
  check('kapsül şerit koordinatına çevrilir', v.capsule.x === 3 && v.capsule.y === 4);
  g.capsules[1] = { x: 8 + 7, y: 4, rot: 0, a: 1, b: 2 }; // 2 hücre genişliğinde, şeride sığmaz
  check('şeride sığmayan kapsül bota verilmez', (coopLaneView(g, 1, 8) as any).capsule === null);
  g.phase = Phase.Clearing;
  check('Falling dışındaki fazlar bota "bekle" olarak görünür', (coopLaneView(g, 0, 8) as any).phase !== Phase.Falling);
}
{
  // 3 bot, tek ortak tahtada: çökmeden oynar, kapsül yerleştirir, virüs temizler, kendi şeridinde kalır
  const play = (extra: any) => {
    const g: any = createCoopGame({ seed: 77, level: 3, speed: 'med', colors: 3, ...extra }, 3, 8, 16);
    const bots = [0, 1, 2].map((i) => createBotState(1000 + i));
    for (let p = 0; p < 3; p++) g.laneLimits[p] = [p * 8, (p + 1) * 8]; // botlar kendi şeridinde
    const start = g.virusesLeft;
    let outOfLane = 0, err = '';
    for (let f = 0; f < 3600 && g.phase !== Phase.Won && g.phase !== Phase.Lost; f++) {
      const inputs = [0, 1, 2].map((p) => {
        try { return tickBot(coopLaneView(g, p, 8), bots[p], 'hard'); } catch (e: any) { err = e.message; return []; }
      });
      stepCoop(g, inputs);
      for (let p = 0; p < 3; p++) { const c = g.capsules[p]; if (!c) continue; const w = c.isBomb || c.rot % 2 === 1 ? 1 : 2; if (c.x < p * 8 || c.x + w > (p + 1) * 8) outOfLane++; }
    }
    return { g, start, outOfLane, err };
  };
  const r = play({});
  check('3 bot çökmeden oynar', r.err === '', r.err);
  check('botlar kapsül yerleştirir', r.g.capsulesDropped.every((n: number) => n >= 10), JSON.stringify(r.g.capsulesDropped));
  check('botlar virüs temizler', r.g.totalVirusesCleared > 0 && r.g.virusesLeft < r.start, `temizlenen=${r.g.totalVirusesCleared} kalan=${r.g.virusesLeft}/${r.start}`);
  check('botlar kendi şeridinde kalır', r.outOfLane === 0, `sapma=${r.outOfLane}`);
  const r2 = play({ risingEnabled: true, riseSpeed: 6, coopPassThrough: true, powerupsEnabled: true });
  check('yükselen taban + hayalet + güç açıkken botlar çökmez', r2.err === '' && r2.g.riseCount >= 1, `hata=${r2.err} yükselme=${r2.g.riseCount}`);
}

console.log(`\n${pass} geçti, ${fail} başarısız\n`);
process.exit(fail > 0 ? 1 : 0);
