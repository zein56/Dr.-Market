<<<<<<< HEAD
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
=======
import { useEffect, useRef, useState, useCallback } from 'react';
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
import {
  createGame,
  step,
  queueGarbage,
  isOver,
  Input,
<<<<<<< HEAD
=======
  Phase,
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  COLS,
  ROWS,
  FPS,
  type GameState,
} from '@pill/game-core';
<<<<<<< HEAD
import { Juice } from '../game/juice';
import { drawBoard, drawNext, drawIncomingMeter, advanceAnim, type VisualEffect } from '../game/render';
import { attachTouch } from '../game/controls';
import { pollGamepad, createGamepadState, isGamepadActive } from '../game/gamepad';
import { tickBot, createBotState } from '../game/bot';
import { sfx, startMusic, stopMusic, pauseMusic, resumeMusic, initAudio } from '../game/audio';
import type { LocalConfig } from './LocalSetup';
import MobileControls from './MobileControls';
import {
  buildPlayerSlots,
  attachLocalKeyboard,
  localAttackTargets,
  resolveVsMatch,
  KEY_HINT,
  type PlayerResult,
} from './localPlayers';

const STEP_MS = 1000 / FPS;

interface Hud {
  viruses: number;
  score: number;
  missCount: number;
  bombs: number;
}

=======
import { drawBoard, drawNext, advanceAnim, type VisualEffect } from '../game/render';
import { attachTouch, holdable } from '../game/controls';
import { pollGamepad, createGamepadState } from '../game/gamepad';
import { tickBot, createBotState, type BotDifficulty } from '../game/bot';
import { sfx, startMusic, stopMusic, pauseMusic, resumeMusic, initAudio } from '../game/audio';
import type { LocalConfig } from './LocalSetup';
import MobileControls from './MobileControls';

const STEP_MS = 1000 / FPS;

>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
export default function LocalGame({
  config,
  onBack,
  landscapeMode,
}: {
  config: LocalConfig;
  onBack: () => void;
  landscapeMode?: boolean;
}) {
  // Config'den gelen board boyutları (varsayılan: 8x16)
  const boardCols = config.boardCols ?? COLS;
  const boardRows = config.boardRows ?? ROWS;

<<<<<<< HEAD
  // Oyuncu yuvaları (en fazla 6)
  const slots = useMemo(() => buildPlayerSlots(config, 'vs'), [config]);
  const N = slots.length;
  const many = N > 3;

  // --- Oyuncu başına durumlar (dizi indeksi = oyuncu numarası) ---
  const lazy = useRef<{
    states: (GameState | null)[];
    queues: Input[][];
    canvases: (HTMLCanvasElement | null)[];
    nexts: (HTMLCanvasElement | null)[];
    stages: (HTMLDivElement | null)[];
    gps: ReturnType<typeof createGamepadState>[];
    bots: ReturnType<typeof createBotState>[];
    fx: VisualEffect[][];
    juice: Juice[];
  } | null>(null);
  if (!lazy.current) {
    lazy.current = {
      states: slots.map(() => null),
      queues: slots.map(() => []),
      canvases: slots.map(() => null),
      nexts: slots.map(() => null),
      stages: slots.map(() => null),
      gps: slots.map(() => createGamepadState()),
      // her bot kendi planını tutar (eskiden P2 ve P3 aynı bot durumunu paylaşıyordu)
      bots: slots.map((_, i) => createBotState(((Date.now() ^ 0x9e3779b9) + i * 7919) >>> 0)),
      fx: slots.map(() => []),
      juice: slots.map(() => new Juice()),
    };
  }
  const L = lazy.current;
=======
  // --- Oyun State'leri ---
  const state1 = useRef<GameState | null>(null);
  const state2 = useRef<GameState | null>(null);
  const state3 = useRef<GameState | null>(null);
  const q1 = useRef<Input[]>([]);
  const q2 = useRef<Input[]>([]);
  const q3 = useRef<Input[]>([]);

  // --- Canvas Ref'leri ---
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const canvas3Ref = useRef<HTMLCanvasElement>(null);
  const next1Ref = useRef<HTMLCanvasElement>(null);
  const next2Ref = useRef<HTMLCanvasElement>(null);
  const next3Ref = useRef<HTMLCanvasElement>(null);
  const stage1Ref = useRef<HTMLDivElement>(null);
  const stage2Ref = useRef<HTMLDivElement>(null);
  const stage3Ref = useRef<HTMLDivElement>(null);
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

  const rafRef = useRef(0);
  const accRef = useRef(0);
  const lastTsRef = useRef(0);
  const frameCountRef = useRef(0);
<<<<<<< HEAD

  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [huds, setHuds] = useState<Hud[]>(() => slots.map(() => ({ viruses: 0, score: 0, missCount: 0, bombs: 0 })));
  const [results, setResults] = useState<PlayerResult[]>(() => slots.map(() => null));
  const endedRef = useRef(false);
  const resultsRef = useRef<PlayerResult[]>(slots.map(() => null));
  const [matchDone, setMatchDone] = useState(false);

  const sinkFor = useCallback((i: number) => (inp: Input) => { L.queues[i].push(inp); }, [L]);
=======
  const gpState1 = useRef(createGamepadState());
  const gpState2 = useRef(createGamepadState());
  const gpState3 = useRef(createGamepadState());
  const botStateRef = useRef(createBotState());

  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [hud1, setHud1] = useState({ viruses: 0, score: 0, missCount: 0, bombs: 0 });
  const [hud2, setHud2] = useState({ viruses: 0, score: 0, missCount: 0, bombs: 0 });
  const [hud3, setHud3] = useState({ viruses: 0, score: 0, missCount: 0, bombs: 0 });
  const [outcome, setOutcome] = useState<{ p1: 'won' | 'lost' | null; p2: 'won' | 'lost' | null; p3: 'won' | 'lost' | null }>({ p1: null, p2: null, p3: null });
  const endedRef = useRef(false);

  const sink1 = useCallback((i: Input) => { q1.current.push(i); }, []);
  const sink2 = useCallback((i: Input) => { q2.current.push(i); }, []);
  const sink3 = useCallback((i: Input) => { q3.current.push(i); }, []);

  const fx1Ref = useRef<VisualEffect[]>([]);
  const fx2Ref = useRef<VisualEffect[]>([]);
  const fx3Ref = useRef<VisualEffect[]>([]);
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const lastPauseBtns = useRef<Record<number, boolean>>({});

  const togglePause = useCallback(() => {
<<<<<<< HEAD
    setIsPaused((p) => {
      const next = !p;
      isPausedRef.current = next;
      if (next) pauseMusic();
      else resumeMusic();
=======
    setIsPaused(p => {
      const next = !p;
      isPausedRef.current = next;
      if (next) {
        pauseMusic();
      } else {
        resumeMusic();
      }
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause]);
<<<<<<< HEAD
=======
  window.addEventListener("gamepadconnected", (e) => {
    console.log("index:", e.gamepad.index, "id:", e.gamepad.id, "mapping:", e.gamepad.mapping);
  });
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

  // --- Kurulum ---
  useEffect(() => {
    initAudio();
<<<<<<< HEAD
    const seed = (Math.random() * 0xffffffff) >>> 0;
    const extractCfg = (sd: number) => ({
      seed: sd,
      level: config.level,
      speed: config.speed,
      diagMatches: config.diagMatches,
      counterEnabled: config.counterEnabled,
      powerupsEnabled: config.powerupsEnabled,
      powerupFreq: config.powerupFreq,
=======
    const seed = (Math.random() * 0xFFFFFFFF) >>> 0;
    const extractCfg = (seed: number) => ({
      seed,
      level: config.level,
      speed: config.speed,
      diagMatches: config.diagMatches,
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
      cols: boardCols,
      rows: boardRows,
      aoeEnabled: config.aoeEnabled,
      aoeThreshold: config.aoeThreshold,
      missPenaltyEnabled: config.missPenaltyEnabled,
      missPenaltyThreshold: config.missPenaltyThreshold,
      normalAttackEnabled: config.normalAttackEnabled,
      normalAttackLen: config.normalAttackLen,
      normalAttackRequireCombo: config.normalAttackRequireCombo,
      stoneAttackEnabled: config.stoneAttackEnabled,
      stoneAttackLen: config.stoneAttackLen,
      stoneAttackRequireCombo: config.stoneAttackRequireCombo,
      lockAttackEnabled: config.lockAttackEnabled,
      lockAttackLen: config.lockAttackLen,
      lockAttackRequireCombo: config.lockAttackRequireCombo,
<<<<<<< HEAD
      lockStacking: config.lockStacking,
      lockMaxStack: config.lockMaxStack,
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
      bombEnabled: config.bombEnabled,
      bombThreshold: config.bombThreshold,
      colors: config.colors,
    });

<<<<<<< HEAD
    // aynı tohum: herkes aynı virüs dizilimi ve aynı kapsül sırasıyla başlar (adil)
    for (let i = 0; i < N; i++) L.states[i] = createGame(extractCfg(seed));
    setHuds(L.states.map((s) => ({ viruses: s!.virusesLeft, score: 0, missCount: 0, bombs: 0 })));
=======
    const cfg1 = extractCfg(seed);
    const cfg2 = extractCfg(seed);
    const cfg3 = extractCfg(seed);
    state1.current = createGame(cfg1);
    state2.current = createGame(cfg2);
    if (config.p3Enabled) state3.current = createGame(cfg3);

    setHud1({ viruses: state1.current.virusesLeft, score: 0, missCount: 0, bombs: 0 });
    setHud2({ viruses: state2.current.virusesLeft, score: 0, missCount: 0, bombs: 0 });
    if (config.p3Enabled) setHud3({ viruses: state3.current!.virusesLeft, score: 0, missCount: 0, bombs: 0 });

>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

    // Geri sayım
    let cd = 3;
    setCountdown(cd);
    const tick = () => {
      cd--;
      if (cd <= 0) {
        setCountdown(0);
        setRunning(true);
        sfx('go');
        startMusic();
      } else {
        setCountdown(cd);
        sfx('countdown');
        setTimeout(tick, 1000);
      }
    };
    setTimeout(tick, 1000);

    return () => { stopMusic(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

<<<<<<< HEAD
  // --- Klavye (P1: WASD, P2: oklar, P3: numpad; 4. oyuncu ve sonrası gamepad/bot) ---
  useEffect(() => {
    let cheatBuffer = '';
    const onOtherKey = (e: KeyboardEvent) => {
      // --- Hile (gizli komut): [hedef 1-N] 777 [tür 1-3] [miktar] 0 ---
      if (!/^[0-9]$/.test(e.key)) return;
      cheatBuffer += e.key;
      if (cheatBuffer.length > 20) cheatBuffer = cheatBuffer.slice(-20);
      const match = cheatBuffer.match(/([1-9])777([123])([1-9]\d*)0$/);
      if (!match) return;
      cheatBuffer = '';
      const target = Number(match[1]) - 1;
      const type = Number(match[2]);
      const amount = Number(match[3]);
      const targetState = L.states[target];
      if (!targetState) return;
      const garbs = { normal: 0, stone: 0, lock: 0 };
      if (type === 1) garbs.stone = amount;
      else if (type === 2) garbs.normal = amount;
      else garbs.lock = amount;
      queueGarbage(targetState, garbs, (Math.random() * 0xffffffff) >>> 0);
    };
    return attachLocalKeyboard({
      slots,
      sink: (p, inp) => L.queues[p].push(inp),
      gamepadAssigned: isGamepadActive,
      onOtherKey,
    });
  }, [slots, L]);

  // --- Dokunmatik: her insan oyuncunun kendi ekranı ---
  useEffect(() => {
    const offs: Array<() => void> = [];
    slots.forEach((sl, i) => {
      const el = L.stages[i];
      if (el && !sl.isBot) offs.push(attachTouch(el, sinkFor(i)));
    });
    return () => offs.forEach((off) => off());
  }, [slots, L, sinkFor]);
=======
  // --- P1 Klavye: WASD + Z/X/Space, P2 Klavye: Ok tuşları + ./,/Enter ---
  useEffect(() => {
    const p1Keys: Record<string, Input> = {
      'KeyA': Input.Left,
      'KeyD': Input.Right,
      'KeyX': Input.RotateCW,
      'KeyZ': Input.RotateCCW,
      'KeyS': Input.SoftDropOn,
      'Space': Input.HardDrop,
      'ShiftLeft': Input.UseBomb,
    };
    const p1UpKeys: Record<string, Input> = {
      'KeyS': Input.SoftDropOff,
      'KeyA': Input.SoftDropOff,
      'KeyD': Input.SoftDropOff,
    };
    const p2Keys: Record<string, Input> = {
      'ArrowLeft': Input.Left,
      'ArrowRight': Input.Right,
      'Period': Input.RotateCW,
      'Comma': Input.RotateCCW,
      'ArrowDown': Input.SoftDropOn,
      'Enter': Input.HardDrop,
      'ShiftRight': Input.UseBomb,
    };
    const p2UpKeys: Record<string, Input> = {
      'ArrowDown': Input.SoftDropOff,
      'ArrowLeft': Input.SoftDropOff,
      'ArrowRight': Input.SoftDropOff,
    };

    const p3Keys: Record<string, Input> = {
      'Numpad4': Input.Left,
      'Numpad6': Input.Right,
      'Numpad9': Input.RotateCW,
      'Numpad7': Input.RotateCCW,
      'Numpad5': Input.SoftDropOn,
      'Numpad2': Input.SoftDropOn,
      'Numpad0': Input.HardDrop,
      'NumpadEnter': Input.HardDrop,
      'Numpad3': Input.UseBomb,
    };
    const p3UpKeys: Record<string, Input> = {
      'Numpad5': Input.SoftDropOff,
      'Numpad2': Input.SoftDropOff,
      'Numpad4': Input.SoftDropOff,
      'Numpad6': Input.SoftDropOff,
    };

    const down1 = new Set<string>();
    const down2 = new Set<string>();
    const down3 = new Set<string>();

    let cheatBuffer = '';

    const onDown = (e: KeyboardEvent) => {
      // --- Hile (Gizli Komut) Sistemi ---
      if (/^[0-9]$/.test(e.key)) {
        cheatBuffer += e.key;
        if (cheatBuffer.length > 20) cheatBuffer = cheatBuffer.slice(-20);

        // Regex: (Hedef: 1|2|3) + 777 + (Tür: 1|2|3) + (Miktar: >0) + 0 (Gönder)
        const match = cheatBuffer.match(/([123])777([123])([1-9]\d*)0$/);
        if (match) {
          cheatBuffer = '';
          const target = Number(match[1]);
          const type = Number(match[2]);
          const amount = Number(match[3]);

          let targetState = target === 1 ? state1.current : target === 2 ? state2.current : state3.current;
          if (target === 3 && !config.p3Enabled) targetState = undefined;

          if (targetState) {
            const garbs = { normal: 0, stone: 0, lock: 0 };
            if (type === 1) garbs.stone = amount;
            else if (type === 2) garbs.normal = amount;
            else if (type === 3) garbs.lock = amount;
            queueGarbage(targetState, garbs, Math.random() * 0xffffffff);
          }
        }
      }

      if (p1Keys[e.code] !== undefined && !down1.has(e.code)) {
        down1.add(e.code);
        sink1(p1Keys[e.code]);
        e.preventDefault();
      } else if (!config.p2IsBot && p2Keys[e.code] !== undefined && !down2.has(e.code)) {
        down2.add(e.code);
        sink2(p2Keys[e.code]);
        e.preventDefault();
      } else if (config.p3Enabled && !config.p3IsBot && p3Keys[e.code] !== undefined && !down3.has(e.code)) {
        down3.add(e.code);
        sink3(p3Keys[e.code]);
        e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      down1.delete(e.code);
      down2.delete(e.code);
      down3.delete(e.code);
      if (p1UpKeys[e.code] !== undefined) sink1(p1UpKeys[e.code]);
      if (!config.p2IsBot && p2UpKeys[e.code] !== undefined) sink2(p2UpKeys[e.code]);
      if (config.p3Enabled && !config.p3IsBot && p3UpKeys[e.code] !== undefined) sink3(p3UpKeys[e.code]);
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [sink1, sink2]);

  // --- Dokunmatik: sol ekrana = P1, sağ ekrana = P2 (sadece insan için) ---
  useEffect(() => {
    const el1 = stage1Ref.current;
    if (!el1) return;
    const off1 = attachTouch(el1, sink1);
    if (config.p2IsBot) return off1;
    const el2 = stage2Ref.current;
    if (!el2) return () => { off1(); };
    const off2 = config.p2IsBot ? () => { } : attachTouch(el2, sink2);
    const el3 = stage3Ref.current;
    if (!config.p3Enabled || !el3) return () => { off1(); off2(); };
    const off3 = config.p3IsBot ? () => { } : attachTouch(el3, sink3);
    return () => { off1(); off2(); off3(); };
  }, [sink1, sink2, sink3, config.p2IsBot, config.p3IsBot, config.p3Enabled]);
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

  // --- Oyun Döngüsü ---
  useEffect(() => {
    if (!running) return;
    lastTsRef.current = performance.now();

    const frame = (ts: number) => {
      rafRef.current = requestAnimationFrame(frame);
<<<<<<< HEAD
      const states = L.states;
      if (states.some((s) => !s)) return;
      const S = states as GameState[];
=======
      const s1 = state1.current;
      const s2 = state2.current;
      const s3 = state3.current;
      if (!s1 || !s2 || (config.p3Enabled && !s3)) return;
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

      let dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      if (dt > 500) dt = 500;
      accRef.current += dt;
      frameCountRef.current++;
<<<<<<< HEAD

      // Gamepad polling: RAF başına 1 kez (yalnızca insan oyuncular)
      slots.forEach((sl, i) => { if (!sl.isBot) pollGamepad(i, sinkFor(i), L.gps[i]); });

      // Pause kontrolü (gamepad Start)
=======
      const fc = frameCountRef.current;

      // Gamepad polling — while döngüsü dışında, RAF başına 1 kez
      pollGamepad(0, sink1, gpState1.current);
      if (!config.p2IsBot) pollGamepad(1, sink2, gpState2.current);
      if (config.p3Enabled && !config.p3IsBot) pollGamepad(2, sink3, gpState3.current);

      // Pause Kontrolü (Gamepad)
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (!gp) continue;
        const pressed = !!gp.buttons[9]?.pressed; // 9 = Start/Options
<<<<<<< HEAD
        if (pressed && !lastPauseBtns.current[gp.index]) togglePause();
=======
        if (pressed && !lastPauseBtns.current[gp.index]) {
          togglePause();
        }
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
        lastPauseBtns.current[gp.index] = pressed;
      }

      if (isPausedRef.current) {
        lastTsRef.current = ts;
        accRef.current = 0;
        return;
      }

      while (accRef.current >= STEP_MS) {
        accRef.current -= STEP_MS;

<<<<<<< HEAD
        for (let i = 0; i < N; i++) {
          const s = S[i];
          if (isOver(s)) continue;

          // bot girdileri
          if (slots[i].isBot) {
            for (const bi of tickBot(s, L.bots[i], slots[i].difficulty)) L.queues[i].push(bi);
          }

          const inputs = L.queues[i];
          L.queues[i] = [];
          step(s, inputs);
          L.juice[i].handle(s, s.cols || boardCols);

          // çok oyunculuda botların sesleri gürültü yapmasın
          const audible = N <= 3 || !slots[i].isBot;
          for (const ev of s.events) {
            if (['move', 'rotate', 'lock', 'clear', 'chain', 'virus', 'won', 'lost'].includes(ev)) {
              if (audible) sfx(ev, s.chain);
            } else if (ev.startsWith('power:')) {
              if (audible) sfx('power');
            } else if (ev === 'shield_block') {
              if (audible) sfx('shield');
            } else if (ev.startsWith('counter:')) {
              if (audible) sfx('counter');
            } else if (ev.startsWith('penalty_spawn:')) {
              if (audible) sfx('penalty_spawn');
              L.fx[i].push({ type: 'penalty', idx: parseInt(ev.split(':')[1], 10), timer: 30 });
            } else if (ev.startsWith('explosion:')) {
              if (audible) sfx('explosion');
              ev.split(':')[1].split(',').forEach((k) => L.fx[i].push({ type: 'explosion', idx: parseInt(k, 10), timer: 30 }));
            } else if (ev.startsWith('bomb_explosion:')) {
              if (audible) sfx('explosion');
              ev.split(':')[1].split(',').forEach((k) => L.fx[i].push({ type: 'bomb_explosion', idx: parseInt(k, 10), timer: 45 }));
            }
          }

          // saldırı: hayatta olan rakip(ler)e
          if (s.attackOut) {
            const targets = localAttackTargets(S.map((x) => !isOver(x)), i, config.attackMode === 'all' ? 'all' : 'random');
            for (const t of targets) queueGarbage(S[t], s.attackOut, (Math.random() * 0xffffffff) >>> 0);
            s.attackOut = null;
          }
        }

        // Maç sonucu: biri virüsleri bitirirse o kazanır; taşanlar elenir, son kalan kazanır
        const verdict = resolveVsMatch(S.map((s) => s.phase));
        const prev = resultsRef.current;
        if (verdict.results.some((r, i) => r !== prev[i])) {
          resultsRef.current = verdict.results;
          setResults(verdict.results);
        }
        if (!endedRef.current && verdict.done) {
          endedRef.current = true;
          setMatchDone(true);
          stopMusic();
          setTimeout(() => onBack(), 1500); // 1.5 saniye sonra otomatik olarak lobiye dön
=======
        // Saldırı hedeflerini döndür
        // 'random': hayatta olan rastgele bir rakip
        // 'all'   : hayatta olan tüm rakipler
        const getAttackTargets = (sourceId: number): GameState[] => {
          const all3 = config.p3Enabled && s3;
          const candidates: { id: number; state: GameState }[] = [
            { id: 1, state: s1 },
            { id: 2, state: s2 },
            ...(all3 ? [{ id: 3, state: s3! }] : []),
          ].filter(p => p.id !== sourceId && !isOver(p.state));

          if (candidates.length === 0) return [];
          if (config.attackMode === 'all') return candidates.map(c => c.state);
          // 'random' modu: hayatta olanlar arasından rastgele biri
          return [candidates[Math.floor(Math.random() * candidates.length)].state];
        };

        // Bot P2 inputları
        if (config.p2IsBot && !isOver(s2)) {
          const botInputs = tickBot(s2, botStateRef.current, config.botDifficulty);
          for (const bi of botInputs) q2.current.push(bi);
        }
        // Bot P3 inputları
        if (config.p3Enabled && config.p3IsBot && s3 && !isOver(s3)) {
          const botInputs = tickBot(s3, botStateRef.current, config.p3BotDifficulty);
          for (const bi of botInputs) q3.current.push(bi);
        }

        // P1 adımı
        if (!isOver(s1)) {
          const inp1 = q1.current;
          q1.current = [];
          step(s1, inp1);
          for (const ev of s1.events) {
            if (['move', 'rotate', 'lock', 'clear', 'chain', 'virus', 'won', 'lost'].includes(ev)) {
              sfx(ev);
            } else if (ev.startsWith('penalty_spawn:')) {
              sfx('penalty_spawn');
              fx1Ref.current.push({ type: 'penalty', idx: parseInt(ev.split(':')[1], 10), timer: 30 });
            } else if (ev.startsWith('explosion:')) {
              sfx('explosion');
              ev.split(':')[1].split(',').forEach(i => fx1Ref.current.push({ type: 'explosion', idx: parseInt(i, 10), timer: 30 }));
            } else if (ev.startsWith('bomb_explosion:')) {
              sfx('explosion'); // reuse same sound
              ev.split(':')[1].split(',').forEach(i => fx1Ref.current.push({ type: 'bomb_explosion', idx: parseInt(i, 10), timer: 45 }));
            }
          }
          // P1 saldırısı
          if (s1.attackOut) {
            const targets = getAttackTargets(1);
            for (const t of targets) {
              queueGarbage(t, s1.attackOut, (Math.random() * 0xFFFFFFFF) >>> 0);
            }
            s1.attackOut = null;
          }
        }

        // P2 adımı
        if (!isOver(s2)) {
          const inp2 = q2.current;
          q2.current = [];
          // Bot için DAS ve SoftDrop sıfırla: bot kendi kararlarını veriyor,
          // klavye basılı kalmış gibi davranmasını önle
          if (config.p2IsBot) {
            s2.dasDir = 0;
            s2.dasTimer = 0;
            s2.softDrop = false;
          }
          step(s2, inp2);
          for (const ev of s2.events) {
            if (['move', 'rotate', 'lock', 'clear', 'chain', 'virus', 'won', 'lost'].includes(ev)) {
              sfx(ev);
            } else if (ev.startsWith('penalty_spawn:')) {
              sfx('penalty_spawn');
              fx2Ref.current.push({ type: 'penalty', idx: parseInt(ev.split(':')[1], 10), timer: 30 });
            } else if (ev.startsWith('explosion:')) {
              sfx('explosion');
              ev.split(':')[1].split(',').forEach(i => fx2Ref.current.push({ type: 'explosion', idx: parseInt(i, 10), timer: 30 }));
            } else if (ev.startsWith('bomb_explosion:')) {
              sfx('explosion');
              ev.split(':')[1].split(',').forEach(i => fx2Ref.current.push({ type: 'bomb_explosion', idx: parseInt(i, 10), timer: 45 }));
            }
          }
          // P2 saldırısı
          if (s2.attackOut) {
            const targets = getAttackTargets(2);
            for (const t of targets) {
              queueGarbage(t, s2.attackOut, (Math.random() * 0xFFFFFFFF) >>> 0);
            }
            s2.attackOut = null;
          }
        }

        // P3 adımı
        if (config.p3Enabled && s3 && !isOver(s3)) {
          const inp3 = q3.current;
          q3.current = [];
          if (config.p3IsBot) {
            s3.dasDir = 0;
            s3.dasTimer = 0;
            s3.softDrop = false;
          }
          step(s3, inp3);
          for (const ev of s3.events) {
            if (['move', 'rotate', 'lock', 'clear', 'chain', 'virus', 'won', 'lost'].includes(ev)) {
              sfx(ev);
            } else if (ev.startsWith('penalty_spawn:')) {
              sfx('penalty_spawn');
              fx3Ref.current.push({ type: 'penalty', idx: parseInt(ev.split(':')[1], 10), timer: 30 });
            } else if (ev.startsWith('explosion:')) {
              sfx('explosion');
              ev.split(':')[1].split(',').forEach(i => fx3Ref.current.push({ type: 'explosion', idx: parseInt(i, 10), timer: 30 }));
            } else if (ev.startsWith('bomb_explosion:')) {
              sfx('explosion');
              ev.split(':')[1].split(',').forEach(i => fx3Ref.current.push({ type: 'bomb_explosion', idx: parseInt(i, 10), timer: 45 }));
            }
          }
          // P3 saldırısı
          if (s3.attackOut) {
            const targets = getAttackTargets(3);
            for (const t of targets) {
              queueGarbage(t, s3.attackOut, (Math.random() * 0xFFFFFFFF) >>> 0);
            }
            s3.attackOut = null;
          }
        }

        // Bitiş kontrolü
        const p1Over = isOver(s1);
        const p2Over = isOver(s2);
        const p3Over = config.p3Enabled && s3 ? isOver(s3) : false;
        if (!endedRef.current && (p1Over || p2Over || p3Over)) {
          endedRef.current = true;
          setOutcome({
            p1: s1.phase === Phase.Won ? 'won' : s1.phase === Phase.Lost ? 'lost' : null,
            p2: s2.phase === Phase.Won ? 'won' : s2.phase === Phase.Lost ? 'lost' : null,
            p3: (config.p3Enabled && s3) ? (s3.phase === Phase.Won ? 'won' : s3.phase === Phase.Lost ? 'lost' : null) : null,
          });
          stopMusic();
          setTimeout(() => {
            onBack();
          }, 1500); // 1.5 saniye sonra otomatik olarak lobiye dön
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
        }
      }

      // Çizim
      advanceAnim();
<<<<<<< HEAD
      for (let i = 0; i < N; i++) {
        const fxs = L.fx[i];
        for (let k = fxs.length - 1; k >= 0; k--) {
          fxs[k].timer--;
          if (fxs[k].timer <= 0) fxs.splice(k, 1);
        }

        const s = S[i];
        const c = L.canvases[i];
        if (c) {
          const ctx = c.getContext('2d');
          if (ctx) {
            const cell = c.clientWidth / (s.cols || boardCols);
            L.juice[i].update();
            drawBoard(ctx, s.board, { cellSize: cell, showGhost: false, clearing: s.clearing, clearPulse: s.phaseTimer, effects: fxs }, s);
            L.juice[i].draw(ctx, cell, s.cols || boardCols);
            if (config.counterEnabled) drawIncomingMeter(ctx, cell, s.board.rows, s.pendingGarbage.reduce((t, x) => t + x.columns.length, 0));
            L.juice[i].applyShake(c);
          }
        }
        const nc = L.nexts[i]?.getContext('2d');
        if (nc) drawNext(nc, s.nextA, s.nextB, L.nexts[i]!.width / 2, s.nextPower);
      }

      setHuds((prev) => {
        let changed = false;
        const next = prev.map((h, i) => {
          const s = S[i];
          if (h.viruses === s.virusesLeft && h.score === s.score && h.missCount === s.missCount && h.bombs === s.bombs) return h;
          changed = true;
          return { viruses: s.virusesLeft, score: s.score, missCount: s.missCount, bombs: s.bombs };
        });
        return changed ? next : prev;
      });
=======

      const processFx = (fxs: VisualEffect[]) => {
        for (let i = fxs.length - 1; i >= 0; i--) {
          fxs[i].timer--;
          if (fxs[i].timer <= 0) fxs.splice(i, 1);
        }
      };
      processFx(fx1Ref.current);
      processFx(fx2Ref.current);
      processFx(fx3Ref.current);

      const c1 = canvas1Ref.current;
      const c2 = canvas2Ref.current;
      const c3 = canvas3Ref.current;
      if (c1) {
        const ctx = c1.getContext('2d');
        if (ctx) {
          const cell = c1.clientWidth / (s1.cols || boardCols);
          drawBoard(ctx, s1.board, { cellSize: cell, showGhost: false, clearing: s1.clearing, clearPulse: s1.phaseTimer, effects: fx1Ref.current }, s1);
        }
      }
      if (c2) {
        const ctx = c2.getContext('2d');
        if (ctx) {
          const cell = c2.clientWidth / (s2.cols || boardCols);
          drawBoard(ctx, s2.board, { cellSize: cell, showGhost: false, clearing: s2.clearing, clearPulse: s2.phaseTimer, effects: fx2Ref.current }, s2);
        }
      }
      if (config.p3Enabled && c3 && s3) {
        const ctx = c3.getContext('2d');
        if (ctx) {
          const cell = c3.clientWidth / (s3.cols || boardCols);
          drawBoard(ctx, s3.board, { cellSize: cell, showGhost: false, clearing: s3.clearing, clearPulse: s3.phaseTimer, effects: fx3Ref.current }, s3);
        }
      }

      const nc1 = next1Ref.current?.getContext('2d');
      if (nc1) drawNext(nc1, s1.nextA, s1.nextB, next1Ref.current!.width / 2);
      const nc2 = next2Ref.current?.getContext('2d');
      if (nc2) drawNext(nc2, s2.nextA, s2.nextB, next2Ref.current!.width / 2);
      if (config.p3Enabled && s3) {
        const nc3 = next3Ref.current?.getContext('2d');
        if (nc3) drawNext(nc3, s3.nextA, s3.nextB, next3Ref.current!.width / 2);
      }

      setHud1(h => h.viruses === s1.virusesLeft && h.score === s1.score && h.missCount === s1.missCount && h.bombs === s1.bombs ? h : { viruses: s1.virusesLeft, score: s1.score, missCount: s1.missCount, bombs: s1.bombs });
      setHud2(h => h.viruses === s2.virusesLeft && h.score === s2.score && h.missCount === s2.missCount && h.bombs === s2.bombs ? h : { viruses: s2.virusesLeft, score: s2.score, missCount: s2.missCount, bombs: s2.bombs });
      if (config.p3Enabled && s3) {
        setHud3(h => h.viruses === s3.virusesLeft && h.score === s3.score && h.missCount === s3.missCount && h.bombs === s3.bombs ? h : { viruses: s3.virusesLeft, score: s3.score, missCount: s3.missCount, bombs: s3.bombs });
      }
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
<<<<<<< HEAD
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // --- Canvas boyutlandırma: her zaman mevcut alana COLS×ROWS oranında sığar ---
  const resizeCanvas = useCallback((canvas: HTMLCanvasElement | null, stage: HTMLDivElement | null) => {
=======
  }, [running, sink1, sink2, sink3, config.p3Enabled]);

  // --- Canvas Boyutlandırma: Her zaman mevcut alana COLS×ROWS oranında sığar ---
  const resizeCanvas = useCallback((
    canvas: HTMLCanvasElement | null,
    stage: HTMLDivElement | null
  ) => {
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
    if (!canvas || !stage) return;
    const prev = canvas.style.display;
    canvas.style.display = 'none';
    const availW = stage.clientWidth - 4;
    const availH = stage.clientHeight - 4;
    canvas.style.display = prev;
    let cell = Math.floor(Math.min(availW / boardCols, availH / boardRows));
    cell = Math.max(4, cell);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = boardCols * cell * dpr;
    canvas.height = boardRows * cell * dpr;
    canvas.style.width = `${boardCols * cell}px`;
    canvas.style.height = `${boardRows * cell}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [boardCols, boardRows]);

  useEffect(() => {
<<<<<<< HEAD
    const observers: ResizeObserver[] = [];
    slots.forEach((_, i) => {
      const stage = L.stages[i];
      if (!stage) return;
      const obs = new ResizeObserver(() => resizeCanvas(L.canvases[i], L.stages[i]));
      obs.observe(stage);
      resizeCanvas(L.canvases[i], stage);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [resizeCanvas, slots, L]);

  const anyOver = results.some((r) => r !== null);

  const badges = (
    <>
      {config.diagMatches && <span className="hard-badge">🔀</span>}
      {config.aoeEnabled && <span className="hard-badge">💥</span>}
      {(config.normalAttackEnabled || config.stoneAttackEnabled || config.lockAttackEnabled) && <span className="hard-badge">⚔️</span>}
      {config.missPenaltyEnabled && <span className="hard-badge">⚠️</span>}
      {config.powerupsEnabled && <span className="hard-badge">⚡</span>}
    </>
  );

  const panel = (i: number) => {
    const sl = slots[i];
    const hud = huds[i];
    const res = results[i];
    return (
      <div className={`local-panel ${res === 'lost' && !matchDone ? 'eliminated' : ''}`} key={`panel-${i}`}>
        <div className="local-hud">
          <span className={`local-player-name p${i + 1}-name`}>
            {sl.isBot ? '🤖 ' : ''}{sl.name}{' '}
            {badges}
          </span>
          <div className="hud-row">
            <div className="hud-item"><span className="hud-label">Virüs</span><span className="hud-value">{hud.viruses}</span></div>
            <div className="hud-item"><span className="hud-label">Puan</span><span className="hud-value">{hud.score}</span></div>
=======
    const obs1 = new ResizeObserver(() => resizeCanvas(canvas1Ref.current, stage1Ref.current));
    const obs2 = new ResizeObserver(() => resizeCanvas(canvas2Ref.current, stage2Ref.current));
    const obs3 = new ResizeObserver(() => resizeCanvas(canvas3Ref.current, stage3Ref.current));
    if (stage1Ref.current) { obs1.observe(stage1Ref.current); resizeCanvas(canvas1Ref.current, stage1Ref.current); }
    if (stage2Ref.current) { obs2.observe(stage2Ref.current); resizeCanvas(canvas2Ref.current, stage2Ref.current); }
    if (config.p3Enabled && stage3Ref.current) { obs3.observe(stage3Ref.current); resizeCanvas(canvas3Ref.current, stage3Ref.current); }
    return () => { obs1.disconnect(); obs2.disconnect(); obs3.disconnect(); };
  }, [resizeCanvas, config.p3Enabled]);

  const anyOver = outcome.p1 !== null || outcome.p2 !== null || outcome.p3 !== null;

  return (
    <div className={`local-game ${config.sharedBoard ? 'shared-board' : ''}`} style={{ position: 'relative' }}>
      {isPaused && !anyOver && (
        <div className="overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '3rem', color: '#fff', textShadow: '2px 2px 4px #000' }}>OYUN DURDURULDU</h2>
          <button className="btn primary" onClick={togglePause} style={{ marginTop: 20, fontSize: '1.2rem', padding: '10px 20px', cursor: 'pointer' }}>Devam Et</button>
          <button className="btn" onClick={onBack} style={{ marginTop: 10, background: '#e74c3c', color: 'white', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>Çıkış</button>
        </div>
      )}
      {/* P1 Panel */}
      <div className="local-panel">
        <div className="local-hud">
          <span className="local-player-name p1-name">
            {config.p1Name}{' '}
            {config.diagMatches && <span className="hard-badge">🔀</span>}
            {config.aoeExplosion && <span className="hard-badge">💥</span>}
            {config.hardAttack && <span className="hard-badge">⚔️</span>}
            {config.missPenalty && <span className="hard-badge">⚠️</span>}
          </span>
          <div className="hud-row">
            <div className="hud-item"><span className="hud-label">Virüs</span><span className="hud-value">{hud1.viruses}</span></div>
            <div className="hud-item"><span className="hud-label">Puan</span><span className="hud-value">{hud1.score}</span></div>
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
            {config.bombEnabled && (
              <div className="hud-item" style={{ minWidth: 60 }}>
                <span className="hud-label">Bomba</span>
                <span className="hud-value" style={{ fontSize: '1.2rem', display: 'flex', gap: 2 }}>
<<<<<<< HEAD
                  {Array.from({ length: 3 }).map((_, k) => (
                    <span key={k} style={{ opacity: k < hud.bombs ? 1 : 0.2 }}>💣</span>
=======
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} style={{ opacity: i < hud1.bombs ? 1 : 0.2 }}>💣</span>
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
                  ))}
                </span>
              </div>
            )}
            <div className="hud-item">
              <span className="hud-label">Sonraki</span>
<<<<<<< HEAD
              <canvas ref={(el) => { L.nexts[i] = el; }} width={80} height={40} className="next-canvas" />
            </div>
            {config.missPenaltyEnabled && (
              <div className="hud-item strike-bar-container">
                <span className="hud-label">Ceza</span>
                <div className="strike-bar">
                  <div className={`strike-pip ${hud.missCount > 0 ? 'on' : ''}`}></div>
                  <div className={`strike-pip ${hud.missCount > 1 ? 'on' : ''}`}></div>
                  <div className={`strike-pip ${hud.missCount > 2 ? 'on' : ''}`}></div>
=======
              <canvas ref={next1Ref} width={80} height={40} className="next-canvas" />
            </div>
            {config.missPenalty && (
              <div className="hud-item strike-bar-container">
                <span className="hud-label">Ceza</span>
                <div className="strike-bar">
                  <div className={`strike-pip ${hud1.missCount > 0 ? 'on' : ''}`}></div>
                  <div className={`strike-pip ${hud1.missCount > 1 ? 'on' : ''}`}></div>
                  <div className={`strike-pip ${hud1.missCount > 2 ? 'on' : ''}`}></div>
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
                </div>
              </div>
            )}
          </div>
        </div>
<<<<<<< HEAD
        <div className="local-stage" ref={(el) => { L.stages[i] = el; }}>
          <canvas ref={(el) => { L.canvases[i] = el; }} className="board-canvas" />
          {countdown > 0 && <div className="countdown"><span>{countdown}</span></div>}
          {res && (
            <div className="overlay">
              <p className="overlay-title">{res === 'won' ? '🏆 Kazandı!' : matchDone ? '💀 Kaybetti' : '💀 Elendi'}</p>
=======
        <div className="local-stage" ref={stage1Ref}>
          <canvas ref={canvas1Ref} className="board-canvas" />
          {countdown > 0 && <div className="countdown"><span>{countdown}</span></div>}
          {outcome.p1 && (
            <div className="overlay">
              <p className="overlay-title">{outcome.p1 === 'won' ? '🏆 Kazandı!' : '💀 Kaybetti'}</p>
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
            </div>
          )}
        </div>
        <div className="local-controls-hint">
<<<<<<< HEAD
          {sl.isBot ? (
            <span>🤖 Bot ({sl.difficulty === 'easy' ? 'kolay' : sl.difficulty === 'hard' ? 'zor' : 'orta'})</span>
          ) : sl.keyScheme ? (
            <>
              <span>{KEY_HINT[sl.keyScheme]}</span>
              <span className="local-gp-hint">veya Gamepad {i + 1}</span>
            </>
          ) : (
            <span className="local-gp-hint">Gamepad {i + 1}</span>
          )}
        </div>
        {landscapeMode && i === 0 && (
          <MobileControls sink={sinkFor(0)} onPause={togglePause} showBomb={config.bombEnabled} />
        )}
      </div>
    );
  };

  const pauseOverlay = isPaused && !anyOver && (
    <div className="overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h2 style={{ fontSize: '3rem', color: '#fff', textShadow: '2px 2px 4px #000' }}>OYUN DURDURULDU</h2>
      <button className="btn primary" onClick={togglePause} style={{ marginTop: 20, fontSize: '1.2rem', padding: '10px 20px', cursor: 'pointer' }}>Devam Et</button>
      <button className="btn" onClick={onBack} style={{ marginTop: 10, background: '#e74c3c', color: 'white', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>Çıkış</button>
    </div>
  );

  // 4 ve daha çok oyuncu: ızgara düzeni, üstte ortak kontrol çubuğu
  if (many) {
    return (
      <div className={`local-game many players-${N}`} style={{ position: 'relative' }}>
        {pauseOverlay}
        <div className="local-many-bar">
          {matchDone ? (
            <span className="local-vs" style={{ fontSize: '1rem' }}>Lobiye dönülüyor...</span>
          ) : (
            <button onClick={togglePause} className="local-pause-btn">⏸️ Durdur</button>
          )}
        </div>
        <div className="local-many-grid">
          {slots.map((_, i) => panel(i))}
        </div>
      </div>
    );
  }

  return (
    <div className="local-game" style={{ position: 'relative' }}>
      {pauseOverlay}
      {slots.map((_, i) => (
        <div key={`wrap-${i}`} style={{ display: 'contents' }}>
          {panel(i)}
          {i < N - 1 && (
            <div className="local-divider">
              {anyOver && matchDone ? (
                <span className="local-vs" style={{ fontSize: '1.2rem', textAlign: 'center' }}>Lobiye<br />dönülüyor...</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <span className="local-vs">VS</span>
                  {i === 0 && (
                    <button onClick={togglePause} className="local-pause-btn">⏸️ Durdur</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
=======
          <span>WASD · Z/X · Boşluk</span>
          <span className="local-gp-hint">veya Gamepad 1</span>
        </div>
        
        {landscapeMode && (
          <MobileControls sink={sink1} onPause={togglePause} showBomb={config.bombEnabled} />
        )}
      </div>

      {/* Orta ayraç */}
      <div className="local-divider">
        {anyOver ? (
          <span className="local-vs" style={{ fontSize: '1.2rem', textAlign: 'center' }}>Lobiye<br/>dönülüyor...</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <span className="local-vs">VS</span>
            <button onClick={togglePause} style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #fff', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}>
              ⏸️ Durdur
            </button>
          </div>
        )}
      </div>

      {/* P2 Panel */}
      <div className="local-panel">
        <div className="local-hud">
          <span className="local-player-name p2-name">
            {config.p2Name}{' '}
            {config.diagMatches && <span className="hard-badge">🔀</span>}
            {config.aoeExplosion && <span className="hard-badge">💥</span>}
            {config.hardAttack && <span className="hard-badge">⚔️</span>}
            {config.missPenalty && <span className="hard-badge">⚠️</span>}
          </span>
          <div className="hud-row">
            <div className="hud-item"><span className="hud-label">Virüs</span><span className="hud-value">{hud2.viruses}</span></div>
            <div className="hud-item"><span className="hud-label">Puan</span><span className="hud-value">{hud2.score}</span></div>
            {config.bombEnabled && (
              <div className="hud-item" style={{ minWidth: 60 }}>
                <span className="hud-label">Bomba</span>
                <span className="hud-value" style={{ fontSize: '1.2rem', display: 'flex', gap: 2 }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} style={{ opacity: i < hud2.bombs ? 1 : 0.2 }}>💣</span>
                  ))}
                </span>
              </div>
            )}
            <div className="hud-item">
              <span className="hud-label">Sonraki</span>
              <canvas ref={next2Ref} width={80} height={40} className="next-canvas" />
            </div>
            {config.missPenalty && (
              <div className="hud-item strike-bar-container">
                <span className="hud-label">Ceza</span>
                <div className="strike-bar">
                  <div className={`strike-pip ${hud2.missCount > 0 ? 'on' : ''}`}></div>
                  <div className={`strike-pip ${hud2.missCount > 1 ? 'on' : ''}`}></div>
                  <div className={`strike-pip ${hud2.missCount > 2 ? 'on' : ''}`}></div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="local-stage" ref={stage2Ref}>
          <canvas ref={canvas2Ref} className="board-canvas" />
          {countdown > 0 && <div className="countdown"><span>{countdown}</span></div>}
          {outcome.p2 && (
            <div className="overlay">
              <p className="overlay-title">{outcome.p2 === 'won' ? '🏆 Kazandı!' : '💀 Kaybetti'}</p>
            </div>
          )}
        </div>
        <div className="local-controls-hint">
          {config.p2IsBot ? (
            <span className="local-gp-hint">🤖 {config.p2Name}</span>
          ) : (
            <>
              <span>← → ↓ · , / . · Enter</span>
              <span className="local-gp-hint">veya Gamepad 2</span>
            </>
          )}
        </div>
      </div>

      {config.p3Enabled && (
        <>
          {/* Orta ayraç 2 */}
          <div className="local-divider">
            <span className="local-vs">VS</span>
          </div>

          {/* P3 Panel */}
          <div className="local-panel">
            <div className="local-hud">
              <span className="local-player-name p3-name">
                {config.p3Name}{' '}
                {config.diagMatches && <span className="hard-badge">🔀</span>}
                {config.aoeExplosion && <span className="hard-badge">💥</span>}
                {config.hardAttack && <span className="hard-badge">⚔️</span>}
                {config.missPenalty && <span className="hard-badge">⚠️</span>}
              </span>
              <div className="hud-row">
                <div className="hud-item"><span className="hud-label">Virüs</span><span className="hud-value">{hud3.viruses}</span></div>
                <div className="hud-item"><span className="hud-label">Puan</span><span className="hud-value">{hud3.score}</span></div>
                {config.bombEnabled && (
                  <div className="hud-item" style={{ minWidth: 60 }}>
                    <span className="hud-label">Bomba</span>
                    <span className="hud-value" style={{ fontSize: '1.2rem', display: 'flex', gap: 2 }}>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <span key={i} style={{ opacity: i < hud3.bombs ? 1 : 0.2 }}>💣</span>
                      ))}
                    </span>
                  </div>
                )}
                <div className="hud-item">
                  <span className="hud-label">Sonraki</span>
                  <canvas ref={next3Ref} width={80} height={40} className="next-canvas" />
                </div>
                {config.missPenalty && (
                  <div className="hud-item strike-bar-container">
                    <span className="hud-label">Ceza</span>
                    <div className="strike-bar">
                      <div className={`strike-pip ${hud3.missCount > 0 ? 'on' : ''}`}></div>
                      <div className={`strike-pip ${hud3.missCount > 1 ? 'on' : ''}`}></div>
                      <div className={`strike-pip ${hud3.missCount > 2 ? 'on' : ''}`}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="local-stage" ref={stage3Ref}>
              <canvas ref={canvas3Ref} className="board-canvas" />
              {countdown > 0 && <div className="countdown"><span>{countdown}</span></div>}
              {outcome.p3 && (
                <div className="overlay">
                  <p className="overlay-title">{outcome.p3 === 'won' ? '🏆 Kazandı!' : '💀 Kaybetti'}</p>
                </div>
              )}
            </div>
            <div className="local-controls-hint">
              {config.p3IsBot ? (
                <span className="local-gp-hint">🤖 {config.p3Name}</span>
              ) : (
                <>
                  <span>Numpad Yönleri · 7/9 · 0/Enter</span>
                  <span className="local-gp-hint">veya Gamepad 3</span>
                </>
              )}
            </div>
          </div>
        </>
      )}
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
    </div>
  );
}
