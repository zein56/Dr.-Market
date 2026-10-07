/**
 * Ortak tahta botu.
 *
 * Mevcut bot (bot.ts) tek oyunculu bir GameState üzerinde çalışır. Ortak tahtada her bot
 * yalnızca KENDİ ŞERİDİNİ oynar: bu modül, ortak tahtadan o şeridi dilimleyip bota tek
 * oyunculu bir tahta gibi gösterir. Şerit kenarları bota duvar görünür, bu yüzden bot komşu
 * şeride taşmaz.
 */
import { createBoard, Phase, type CoopGameState, type GameState } from '@pill/game-core';

/** Botun okuduğu alanları taşıyan, tek oyunculu durum görünümü. */
export function coopLaneView(s: CoopGameState, player: number, laneCols: number): GameState {
  const x0 = player * laneCols;
  const board = createBoard(laneCols, s.rows);
  for (let y = 0; y < s.rows; y++) {
    for (let x = 0; x < laneCols; x++) {
      board[y * laneCols + x] = s.board[y * s.cols + x0 + x];
    }
  }

  let capsule = s.capsules[player];
  if (capsule) {
    const x1 = capsule.x - x0;
    const width = capsule.isBomb || capsule.rot % 2 === 1 ? 1 : 2;
    // kapsül şeridin dışındaysa (ör. insan oyuncu kaydırmıştı) bot onu yönetmez
    capsule = x1 >= 0 && x1 + width <= laneCols ? { ...capsule, x: x1 } : null;
  }

  return {
    cfg: s.cfg,
    board,
    cols: laneCols,
    rows: s.rows,
    // bot yalnızca Falling fazında karar verir
    phase: s.phase === Phase.Falling ? Phase.Falling : Phase.Spawning,
    capsule,
    capsulesDropped: s.capsulesDropped[player],
    nextA: s.nextA[player],
    nextB: s.nextB[player],
    virusesLeft: s.virusesLeft,
  } as unknown as GameState;
}
