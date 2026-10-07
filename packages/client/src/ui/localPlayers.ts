/**
 * Yerel oyunların (VS ve ortak tahta) paylaştığı saf yardımcılar.
 * DOM / React içermez, bu yüzden testlerde doğrudan kullanılabilir.
 */
import { Input, Phase } from '@pill/game-core';
import type { BotDifficulty } from '../game/bot';
import type { LocalConfig } from './LocalSetup';

/** VS modunda en fazla oyuncu sayısı */
export const MAX_VS_PLAYERS = 6;
/** Ortak tahtada en fazla oyuncu sayısı (tahta oyuncu sayısı kadar genişler) */
export const MAX_COOP_PLAYERS = 4;
/** Klavyede aynı anda oynayabilen kişi sayısı (WASD, oklar, numpad). Fazlası gamepad ya da bot. */
export const KEYBOARD_SLOTS = 3;

export type KeyScheme = 'wasd' | 'arrows' | 'numpad';
export type LocalMode = 'vs' | 'coop';

export interface ExtraPlayer {
  name: string;
  isBot: boolean;
  difficulty: BotDifficulty;
}

export interface PlayerSlot {
  /** 0 tabanlı sıra (gamepad ve durum dizilerinin indeksi) */
  index: number;
  name: string;
  isBot: boolean;
  difficulty: BotDifficulty;
  /** Klavye düzeni; yoksa (4. oyuncu ve sonrası) yalnızca gamepad */
  keyScheme: KeyScheme | null;
}

export function maxPlayersFor(mode: LocalMode): number {
  return mode === 'coop' ? MAX_COOP_PLAYERS : MAX_VS_PLAYERS;
}

/** Ek oyuncu adı boşsa "Oyuncu N" */
export function defaultPlayerName(index: number): string {
  return `Oyuncu ${index + 1}`;
}

/**
 * Yapılandırmadan oyuncu yuvalarını üretir. P1 her zaman insan; P3 ve ek oyuncular
 * yalnızca 3. oyuncu açıkken vardır. Sayı moda göre sınırlanır.
 */
export function buildPlayerSlots(config: LocalConfig, mode: LocalMode): PlayerSlot[] {
  const slots: PlayerSlot[] = [
    { index: 0, name: config.p1Name, isBot: false, difficulty: 'med', keyScheme: 'wasd' },
    { index: 1, name: config.p2Name, isBot: !!config.p2IsBot, difficulty: config.botDifficulty ?? 'med', keyScheme: 'arrows' },
  ];
  if (config.p3Enabled) {
    slots.push({ index: 2, name: config.p3Name, isBot: !!config.p3IsBot, difficulty: config.p3BotDifficulty ?? 'med', keyScheme: 'numpad' });
    for (const ex of config.extraPlayers ?? []) {
      const index = slots.length;
      slots.push({ index, name: ex.name || defaultPlayerName(index), isBot: !!ex.isBot, difficulty: ex.difficulty ?? 'med', keyScheme: null });
    }
  }
  return slots.slice(0, maxPlayersFor(mode));
}

// ---------------------------------------------------------------------------
// Klavye
// ---------------------------------------------------------------------------

export const KEY_PRESS: Record<KeyScheme, Record<string, Input>> = {
  wasd: {
    KeyA: Input.Left,
    KeyD: Input.Right,
    KeyX: Input.RotateCW,
    KeyW: Input.RotateCW,
    KeyE: Input.RotateCW,
    KeyZ: Input.RotateCCW,
    KeyQ: Input.RotateCCW,
    KeyS: Input.SoftDropOn,
    Space: Input.HardDrop,
    ShiftLeft: Input.UseBomb,
  },
  arrows: {
    ArrowLeft: Input.Left,
    ArrowRight: Input.Right,
    ArrowUp: Input.RotateCW,
    Period: Input.RotateCW,
    Slash: Input.RotateCW,
    Comma: Input.RotateCCW,
    ArrowDown: Input.SoftDropOn,
    Enter: Input.HardDrop,
    ShiftRight: Input.UseBomb,
  },
  numpad: {
    Numpad4: Input.Left,
    Numpad6: Input.Right,
    Numpad8: Input.RotateCW,
    Numpad9: Input.RotateCW,
    Numpad7: Input.RotateCCW,
    Numpad5: Input.SoftDropOn,
    Numpad2: Input.SoftDropOn,
    Numpad0: Input.HardDrop,
    NumpadEnter: Input.HardDrop,
    Numpad3: Input.UseBomb,
  },
};

/** Bırakıldığında basılı tutma durumunu (yön/yumuşak düşüş) sıfırlayan tuşlar */
export const KEY_RELEASE: Record<KeyScheme, string[]> = {
  wasd: ['KeyS', 'KeyA', 'KeyD'],
  arrows: ['ArrowDown', 'ArrowLeft', 'ArrowRight'],
  numpad: ['Numpad5', 'Numpad2', 'Numpad4', 'Numpad6'],
};

export const KEY_HINT: Record<KeyScheme, string> = {
  wasd: 'A/D · S · Z/X · Boşluk',
  arrows: '← → ↓ · , . · Enter',
  numpad: 'Numpad 4/6 · 5 · 7/9 · 0',
};

export type KeyTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

/**
 * Yerel klavye girdisi. Basılı tutulan tuşun tekrar eden olayları yok sayılır; pencere odağı
 * kaybedilince bütün oyuncuların basılı tuş durumu sıfırlanır (tuş bırakma olayı hiç gelmeyebilir,
 * kapsül kendi kendine kayıp giderdi).
 * @returns dinleyicileri kaldıran fonksiyon
 */
export function attachLocalKeyboard(opts: {
  slots: PlayerSlot[];
  sink: (player: number, input: Input) => void;
  /** Bu oyuncuya gamepad atanmışsa klavyesi kapalıdır */
  gamepadAssigned?: (player: number) => boolean;
  /** Eşlenmemiş tuşlar için (ör. hile kodu) */
  onOtherKey?: (e: KeyboardEvent) => void;
  target?: KeyTarget;
}): () => void {
  const target: KeyTarget = opts.target ?? window;
  const humans = opts.slots.filter((s) => !s.isBot && s.keyScheme);
  const down = new Map<number, Set<string>>(humans.map((s) => [s.index, new Set<string>()]));
  const gp = opts.gamepadAssigned ?? (() => false);

  const onDown = (ev: Event) => {
    const e = ev as KeyboardEvent;
    let handled = false;
    for (const s of humans) {
      if (gp(s.index)) continue;
      const input = KEY_PRESS[s.keyScheme!][e.code];
      if (input === undefined) continue;
      handled = true;
      const set = down.get(s.index)!;
      if (set.has(e.code)) continue; // tuş tekrarı
      set.add(e.code);
      opts.sink(s.index, input);
    }
    if (handled) e.preventDefault?.();
    else opts.onOtherKey?.(e);
  };

  const onUp = (ev: Event) => {
    const e = ev as KeyboardEvent;
    for (const s of humans) {
      if (gp(s.index)) continue;
      down.get(s.index)!.delete(e.code);
      if (KEY_RELEASE[s.keyScheme!].includes(e.code)) opts.sink(s.index, Input.SoftDropOff);
    }
  };

  const onBlur = () => {
    for (const s of humans) {
      down.get(s.index)!.clear();
      opts.sink(s.index, Input.SoftDropOff);
    }
  };

  target.addEventListener('keydown', onDown);
  target.addEventListener('keyup', onUp);
  target.addEventListener('blur', onBlur);
  return () => {
    target.removeEventListener('keydown', onDown);
    target.removeEventListener('keyup', onUp);
    target.removeEventListener('blur', onBlur);
  };
}

// ---------------------------------------------------------------------------
// Saldırı hedefi ve maç sonucu (VS)
// ---------------------------------------------------------------------------

/** 'random': hayatta olan rastgele bir rakip, 'all': hayatta olan bütün rakipler */
export function localAttackTargets(
  alive: boolean[],
  from: number,
  mode: 'random' | 'all',
  rnd: () => number = Math.random
): number[] {
  const opponents: number[] = [];
  for (let i = 0; i < alive.length; i++) if (i !== from && alive[i]) opponents.push(i);
  if (opponents.length === 0) return [];
  if (mode === 'all') return opponents;
  return [opponents[Math.floor(rnd() * opponents.length) % opponents.length]];
}

export type PlayerResult = 'won' | 'lost' | null;

/**
 * VS kuralı:
 *  - Biri tüm virüsleri temizlerse (Won) maç biter, o oyuncu kazanır, kalanlar kaybeder.
 *  - Biri taşarsa (Lost) elenir; maç, tek bir oyuncu ayakta kalana kadar sürer ve o kazanır.
 *  - Hepsi aynı anda elenirse herkes kaybeder.
 * `phases[i]`: i. oyuncunun Phase değeri.
 */
export function resolveVsMatch(phases: number[]): { done: boolean; results: PlayerResult[] } {
  const n = phases.length;
  const results: PlayerResult[] = phases.map((p) => (p === Phase.Won ? 'won' : p === Phase.Lost ? 'lost' : null));
  if (n < 2) return { done: false, results };

  if (results.includes('won')) {
    return { done: true, results: results.map((r) => (r === 'won' ? 'won' : 'lost')) };
  }

  const alive: number[] = [];
  for (let i = 0; i < n; i++) if (results[i] !== 'lost') alive.push(i);
  if (alive.length === 0) return { done: true, results };
  if (alive.length === 1) {
    results[alive[0]] = 'won';
    return { done: true, results };
  }
  return { done: false, results };
}
