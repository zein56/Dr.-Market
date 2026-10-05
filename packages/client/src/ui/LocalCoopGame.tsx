<<<<<<< HEAD
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { LocalConfig } from './LocalSetup';
import { createCoopGame, stepCoop, type CoopGameState, Input, Phase, FPS } from '@pill/game-core';
import { drawBoard, drawNext, advanceAnim, type VisualEffect } from '../game/render';
import { Juice } from '../game/juice';
import { createGamepadState, pollGamepad, isGamepadActive } from '../game/gamepad';
import { createBotState, tickBot } from '../game/bot';
import { coopLaneView } from '../game/coopBot';
import { startMusic, stopMusic, pauseMusic, resumeMusic, sfx } from '../game/audio';
import MobileControls from './MobileControls';
import { buildPlayerSlots, attachLocalKeyboard } from './localPlayers';

const FRAME_MS = 1000 / FPS;

interface End {
  outcome: 'won' | 'lost';
  rises: number;
  cleared: number;
  score: number;
}
=======
import { useEffect, useRef, useState, useCallback } from 'react';
import type { LocalConfig } from './LocalSetup';
import { createCoopGame, stepCoop, type CoopGameState } from '@pill/game-core';
import { Input, Phase } from '@pill/game-core';
import { drawBoard, drawNext, type VisualEffect } from '../game/render';
import { createGamepadState, pollGamepad, manuallyAssignGamepad, getAssignedGamepadIndex, getAllConnectedGamepads } from '../game/gamepad';
import { createBotState, stepBot, type BotDifficulty } from '../game/bot';
import { startMusic, stopMusic, pauseMusic, resumeMusic, sfx } from '../game/audio';
import MobileControls from './MobileControls';
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

export default function LocalCoopGame({
  config,
  onBack,
  landscapeMode,
}: {
  config: LocalConfig;
  onBack: () => void;
  landscapeMode?: boolean;
}) {
<<<<<<< HEAD
  const slots = useMemo(() => buildPlayerSlots(config, 'coop'), [config]);
  const playerCount = slots.length;
  const boardColsPerPlayer = config.boardCols ?? 8;
  const boardRows = config.boardRows ?? 16;
  const cols = playerCount * boardColsPerPlayer;
  const endless = !!config.risingEnabled;

  // Oyun durumu bir kez oluşturulur. Tohum RASTGELE: eskiden tohum verilmediği için her oyun
  // birebir aynı virüs dizilimiyle ve aynı kapsül sırasıyla başlıyordu.
  const state = useRef<CoopGameState | null>(null);
  if (!state.current) {
    const seed = (Math.random() * 0xffffffff) >>> 0;
    const s = createCoopGame({ ...(config as any), seed }, playerCount, boardColsPerPlayer, boardRows);
    // botlar yalnızca kendi şeridini oynar (DAS tekrarı/dönüş komşu şeride taşırmasın)
    slots.forEach((sl, i) => {
      if (sl.isBot) s.laneLimits[i] = [i * boardColsPerPlayer, (i + 1) * boardColsPerPlayer];
    });
    state.current = s;
  }

  const queues = useRef<Input[][]>(slots.map(() => []));
  const nextRefs = useRef<(HTMLCanvasElement | null)[]>(slots.map(() => null));
  const gps = useRef(slots.map(() => createGamepadState()));
  const bots = useRef(slots.map((_, i) => createBotState(((Date.now() ^ 0x85ebca6b) + i * 7919) >>> 0)));

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const juiceRef = useRef(new Juice());
=======
  const playerCount = config.p3Enabled ? 3 : 2;
  const boardColsPerPlayer = config.boardCols ?? 8;
  const boardRows = config.boardRows ?? 16;
  const cols = playerCount * boardColsPerPlayer;

  const state = useRef<CoopGameState>(createCoopGame(config as any, playerCount, boardColsPerPlayer, boardRows));
  const q1 = useRef<Input[]>([]);
  const q2 = useRef<Input[]>([]);
  const q3 = useRef<Input[]>([]);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const next1Ref = useRef<HTMLCanvasElement>(null);
  const next2Ref = useRef<HTMLCanvasElement>(null);
  const next3Ref = useRef<HTMLCanvasElement>(null);
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

  const rafRef = useRef(0);
  const accRef = useRef(0);
  const lastTsRef = useRef(0);
  const frameCountRef = useRef(0);

<<<<<<< HEAD
  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [viruses, setViruses] = useState(state.current.virusesLeft);
  const [scores, setScores] = useState<number[]>(() => slots.map(() => 0));
  const [rise, setRise] = useState({ count: 0, ratio: 0 });
  const [end, setEnd] = useState<End | null>(null);
  const endedRef = useRef(false);

  const sinkFor = useCallback((i: number) => (inp: Input) => { queues.current[i].push(inp); }, []);
=======
  const gpState1 = useRef(createGamepadState());
  const gpState2 = useRef(createGamepadState());
  const gpState3 = useRef(createGamepadState());
  const botState2 = useRef(createBotState());
  const botState3 = useRef(createBotState());

  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  const [hud1, setHud1] = useState({ score: 0, bombs: 0 });
  const [hud2, setHud2] = useState({ score: 0, bombs: 0 });
  const [hud3, setHud3] = useState({ score: 0, bombs: 0 });
  const [viruses, setViruses] = useState(state.current.virusesLeft);
  
  const [outcome, setOutcome] = useState<'won' | 'lost' | null>(null);
  const endedRef = useRef(false);

  const sink1 = useCallback((i: Input) => { q1.current.push(i); }, []);
  const sink2 = useCallback((i: Input) => { q2.current.push(i); }, []);
  const sink3 = useCallback((i: Input) => { q3.current.push(i); }, []);
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const lastPauseBtns = useRef<Record<number, boolean>>({});

  const togglePause = useCallback(() => {
<<<<<<< HEAD
    setIsPaused((p) => {
=======
    setIsPaused(p => {
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
      const next = !p;
      isPausedRef.current = next;
      if (next) pauseMusic();
      else resumeMusic();
      return next;
    });
  }, []);

<<<<<<< HEAD
  // Kurulum + geri sayım
  useEffect(() => {
=======
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') togglePause(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause]);

  useEffect(() => {
    // Geri sayım
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
    let cd = 3;
    setCountdown(cd);
    const tick = () => {
      cd--;
      if (cd <= 0) {
        setCountdown(0);
        setRunning(true);
<<<<<<< HEAD
        sfx('go');
        startMusic();
      } else {
        setCountdown(cd);
        sfx('countdown');
        setTimeout(tick, 1000);
      }
    };
    const t = setTimeout(tick, 1000);
    return () => { clearTimeout(t); stopMusic(); };
  }, []);

  // Klavye: P1 WASD, P2 oklar, P3 numpad (4. oyuncu gamepad/bot). Odak kaybında basılı tuşlar bırakılır.
  useEffect(() => {
    const offKb = attachLocalKeyboard({
      slots,
      sink: (p, inp) => queues.current[p].push(inp),
      gamepadAssigned: isGamepadActive,
      onOtherKey: (e) => { if (e.key === 'Escape') togglePause(); },
    });
    return offKb;
  }, [slots, togglePause]);

  // Oyun döngüsü
  useEffect(() => {
    if (!running) return;
    lastTsRef.current = performance.now();

    const frame = (ts: number) => {
      rafRef.current = requestAnimationFrame(frame);
      const s = state.current!;

      let dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      if (dt > 500) dt = 500;
      accRef.current += dt;
      frameCountRef.current++;

      // Gamepad (yalnızca insan oyuncular)
      slots.forEach((sl, i) => { if (!sl.isBot) pollGamepad(i, sinkFor(i), gps.current[i]); });

      // Pause (gamepad Start)
      for (const gp of navigator.getGamepads()) {
        if (!gp) continue;
        const pressed = !!gp.buttons[9]?.pressed;
        if (pressed && !lastPauseBtns.current[gp.index]) togglePause();
        lastPauseBtns.current[gp.index] = pressed;
      }
      if (isPausedRef.current) {
        lastTsRef.current = ts;
        accRef.current = 0;
        return;
      }

      while (accRef.current >= FRAME_MS && s.phase !== Phase.Won && s.phase !== Phase.Lost) {
        accRef.current -= FRAME_MS;

        // bot girdileri: her bot yalnızca kendi şeridini görür
        slots.forEach((sl, i) => {
          if (!sl.isBot) return;
          for (const bi of tickBot(coopLaneView(s, i, boardColsPerPlayer), bots.current[i], sl.difficulty)) queues.current[i].push(bi);
        });

        const inputsArr = queues.current;
        queues.current = slots.map(() => []);
        stepCoop(s, inputsArr);

        // efektler + sesler (diğer modlarla aynı geri bildirim)
        juiceRef.current.handle(s, s.cols);
        for (const ev of s.events) {
          if (ev === 'clear' || ev === 'chain' || ev === 'virus') sfx(ev, s.chain);
          else if (ev.startsWith('power:')) sfx('power');
          else if (ev === 'rise_warn' || ev === 'rise_tick') sfx('warn');
          else if (ev.startsWith('rise:')) sfx('rise');
        }

        const phaseNow = s.phase as Phase; // stepCoop içinde değişti (TS daralması bunu görmez)
        if (!endedRef.current && (phaseNow === Phase.Won || phaseNow === Phase.Lost)) {
          endedRef.current = true;
          const outcome = phaseNow === Phase.Won ? 'won' : 'lost';
          sfx(outcome === 'won' ? 'win' : 'lose');
          setEnd({ outcome, rises: s.riseCount, cleared: s.totalVirusesCleared, score: s.scores.reduce((a, b) => a + b, 0) });
          stopMusic();
        }
      }

      // Çizim
      advanceAnim();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const cell = canvas.clientWidth / cols;
          juiceRef.current.update();
          drawBoard(ctx, s.board, { cols, rows: s.rows, cellSize: cell, clearing: s.clearing, clearPulse: s.phaseTimer }, s);
          juiceRef.current.draw(ctx, cell, cols);
          juiceRef.current.applyShake(canvas);
        }
      }
      slots.forEach((_, i) => {
        const nc = nextRefs.current[i]?.getContext('2d');
        if (nc) drawNext(nc, s.nextA[i], s.nextB[i], nextRefs.current[i]!.width / 2, s.nextPowers[i]);
      });

      setViruses((v) => (v === s.virusesLeft ? v : s.virusesLeft));
      setScores((prev) => (prev.every((sc, i) => sc === s.scores[i]) ? prev : s.scores.slice(0, slots.length)));
      if (endless) {
        const ratio = Math.min(1, Math.max(0, 1 - s.riseTimer / s.riseInterval));
        setRise((r) => (r.count === s.riseCount && Math.abs(r.ratio - ratio) < 0.01 ? r : { count: s.riseCount, ratio }));
=======
        lastTsRef.current = performance.now();
        startMusic();
      } else {
        setCountdown(cd);
        sfx('tick');
        setTimeout(tick, 1000);
      }
    };
    sfx('tick');
    setTimeout(tick, 1000);

    return () => stopMusic();
  }, []);

  useEffect(() => {
    if (!running) return;

    const onKey = (e: KeyboardEvent) => {
      const gp1 = getAssignedGamepadIndex(0);
      const gp2 = getAssignedGamepadIndex(1);
      const gp3 = getAssignedGamepadIndex(2);

      if (gp1 === null) {
        switch (e.code) {
          case 'KeyW': sink1(Input.RotateCW); break;
          case 'KeyS': sink1(Input.SoftDropOn); break;
          case 'KeyA': sink1(Input.Left); break;
          case 'KeyD': sink1(Input.Right); break;
          case 'KeyQ': sink1(Input.RotateCCW); break;
          case 'KeyE': sink1(Input.RotateCW); break;
        }
      }
      if (!config.p2IsBot && gp2 === null) {
        switch (e.code) {
          case 'ArrowUp': sink2(Input.RotateCW); break;
          case 'ArrowDown': sink2(Input.SoftDropOn); break;
          case 'ArrowLeft': sink2(Input.Left); break;
          case 'ArrowRight': sink2(Input.Right); break;
          case 'Period': sink2(Input.RotateCCW); break;
          case 'Slash': sink2(Input.RotateCW); break;
        }
      }
      if (config.p3Enabled && !config.p3IsBot && gp3 === null) {
        switch (e.code) {
          case 'Numpad8': sink3(Input.RotateCW); break;
          case 'Numpad5': sink3(Input.SoftDropOn); break;
          case 'Numpad4': sink3(Input.Left); break;
          case 'Numpad6': sink3(Input.Right); break;
          case 'Numpad7': sink3(Input.RotateCCW); break;
          case 'Numpad9': sink3(Input.RotateCW); break;
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const gp1 = getAssignedGamepadIndex(0);
      const gp2 = getAssignedGamepadIndex(1);
      const gp3 = getAssignedGamepadIndex(2);
      if (gp1 === null && ['KeyS', 'KeyA', 'KeyD'].includes(e.code)) sink1(Input.SoftDropOff);
      if (!config.p2IsBot && gp2 === null && ['ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) sink2(Input.SoftDropOff);
      if (config.p3Enabled && !config.p3IsBot && gp3 === null && ['Numpad5', 'Numpad4', 'Numpad6'].includes(e.code)) sink3(Input.SoftDropOff);
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [running, config, sink1, sink2, sink3]);

  useEffect(() => {
    if (!running) return;
    const FRAME_MS = 1000 / 60;

    const frame = (ts: number) => {
      rafRef.current = requestAnimationFrame(frame);
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;

      if (!isPausedRef.current) accRef.current += dt;

      // Handle pause for gamepads
      const gp1 = getAssignedGamepadIndex(0);
      const gp2 = getAssignedGamepadIndex(1);
      const gp3 = getAssignedGamepadIndex(2);
      
      const checkPause = (gpidx: number | null) => {
        if (gpidx !== null) {
          const g = navigator.getGamepads()[gpidx];
          if (g) {
            const startBtn = g.buttons[9]?.pressed;
            if (startBtn && !lastPauseBtns.current[gpidx]) togglePause();
            lastPauseBtns.current[gpidx] = startBtn;
          }
        }
      };
      checkPause(gp1);
      checkPause(gp2);
      checkPause(gp3);

      let processed = false;
      while (accRef.current >= FRAME_MS) {
        accRef.current -= FRAME_MS;
        if (!isPausedRef.current) {
          processed = true;
          const s = state.current;

          // Poll inputs
          pollGamepad(0, sink1, gpState1.current);
          if (config.p2IsBot) {
            // Coop Bot doesn't exist yet but we will just pass empty inputs
            // A true bot for coop would need to read the 24 width board
            // we will skip bots for now in coop or just pass empty
          } else {
            pollGamepad(1, sink2, gpState2.current);
          }
          if (config.p3Enabled) {
            if (!config.p3IsBot) pollGamepad(2, sink3, gpState3.current);
          }

          const i1 = q1.current.splice(0, q1.current.length);
          const i2 = q2.current.splice(0, q2.current.length);
          const i3 = q3.current.splice(0, q3.current.length);

          const inputsArr = [i1, i2];
          if (config.p3Enabled) inputsArr.push(i3);

          stepCoop(s, inputsArr);
          frameCountRef.current++;

          if (!endedRef.current) {
            if (s.phase === Phase.Won) {
              setOutcome('won');
              sfx('win');
              endedRef.current = true;
            } else if (s.phase === Phase.Lost) {
              setOutcome('lost');
              sfx('lose');
              endedRef.current = true;
            }
          }
        }
      }

      if (processed) {
        const s = state.current;
        const c = canvasRef.current;
        if (c) {
          const ctx = c.getContext('2d');
          if (ctx) {
            const cell = c.clientWidth / cols;
            drawBoard(ctx, s.board, { cols, rows: s.rows, cellSize: cell, clearing: s.clearing, clearPulse: s.phaseTimer }, s);
          }
        }

        const nc1 = next1Ref.current?.getContext('2d');
        if (nc1) drawNext(nc1, s.nextA[0], s.nextB[0], next1Ref.current!.width / 2);
        
        const nc2 = next2Ref.current?.getContext('2d');
        if (nc2) drawNext(nc2, s.nextA[1], s.nextB[1], next2Ref.current!.width / 2);
        
        if (config.p3Enabled) {
          const nc3 = next3Ref.current?.getContext('2d');
          if (nc3) drawNext(nc3, s.nextA[2], s.nextB[2], next3Ref.current!.width / 2);
        }

        setHud1(h => h.score === s.scores[0] && h.bombs === s.bombs[0] ? h : { score: s.scores[0], bombs: s.bombs[0] });
        setHud2(h => h.score === s.scores[1] && h.bombs === s.bombs[1] ? h : { score: s.scores[1], bombs: s.bombs[1] });
        if (config.p3Enabled) {
          setHud3(h => h.score === s.scores[2] && h.bombs === s.bombs[2] ? h : { score: s.scores[2], bombs: s.bombs[2] });
        }
        setViruses(v => v === s.virusesLeft ? v : s.virusesLeft);
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
      }
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
<<<<<<< HEAD
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const resizeCanvas = useCallback((canvas: HTMLCanvasElement | null, stage: HTMLDivElement | null) => {
    if (!canvas || !stage) return;
    const rows = state.current!.rows;
=======
  }, [running, sink1, sink2, sink3, config, cols, togglePause]);

  const resizeCanvas = useCallback((
    canvas: HTMLCanvasElement | null,
    stage: HTMLDivElement | null
  ) => {
    if (!canvas || !stage) return;
    const rows = state.current.rows;
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
    const prev = canvas.style.display;
    canvas.style.display = 'none';
    const availW = stage.clientWidth - 4;
    const availH = stage.clientHeight - 4;
    canvas.style.display = prev;
    let cell = Math.floor(Math.min(availW / cols, availH / rows));
    cell = Math.max(8, cell);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = cols * cell * dpr;
    canvas.height = rows * cell * dpr;
    canvas.style.width = `${cols * cell}px`;
    canvas.style.height = `${rows * cell}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [cols]);

  useEffect(() => {
    const obs = new ResizeObserver(() => resizeCanvas(canvasRef.current, stageRef.current));
    if (stageRef.current) {
      obs.observe(stageRef.current);
      resizeCanvas(canvasRef.current, stageRef.current);
    }
    return () => obs.disconnect();
  }, [resizeCanvas]);

<<<<<<< HEAD
  // dokunmatik kontrol: ilk iki insan oyuncu
  const humanIdx = slots.filter((s) => !s.isBot).map((s) => s.index).slice(0, 2);

  return (
    <div className="local-game" style={{ position: 'relative' }}>
      {isPaused && !end && (
=======
  return (
    <div className="local-game" style={{ position: 'relative' }}>
      {isPaused && !outcome && (
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
        <div className="overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '3rem', color: '#fff' }}>OYUN DURDURULDU</h2>
          <button className="btn primary" onClick={togglePause} style={{ marginTop: 20 }}>Devam Et</button>
          <button className="btn" onClick={onBack} style={{ marginTop: 10, background: '#e74c3c', color: 'white' }}>Çıkış</button>
        </div>
      )}

      {/* Ortak HUD */}
      <div className="local-panel" style={{ flex: 'none', width: '200px' }}>
<<<<<<< HEAD
        {slots.map((sl, i) => (
          <div key={i} className="local-hud" style={{ marginTop: i === 0 ? 0 : 14 }}>
            <span className={`local-player-name p${i + 1}-name`}>{sl.isBot ? '🤖 ' : ''}{sl.name}</span>
            <div className="hud-row">
              <div className="hud-item"><span className="hud-label">Puan</span><span className="hud-value">{scores[i] ?? 0}</span></div>
            </div>
            <div className="next-box" style={{ marginTop: 8 }}>
              <canvas ref={(el) => { nextRefs.current[i] = el; }} width={64} height={32} style={{ width: 64, height: 32 }} />
            </div>
          </div>
        ))}

        {endless && (
          <div className="local-hud rise-hud" style={{ marginTop: 14 }}>
            <span className="local-player-name">♾️ SONSUZ MOD</span>
            <div className="hud-row">
              <div className="hud-item"><span className="hud-label">Yükselme</span><span className="hud-value">{rise.count}</span></div>
            </div>
            <div className="rise-bar" title="Bir sonraki yükselmeye kalan süre">
              <div className={`rise-bar-fill ${rise.ratio > 0.8 ? 'danger' : ''}`} style={{ width: `${Math.round(rise.ratio * 100)}%` }} />
            </div>
=======
        <div className="local-hud">
          <span className="local-player-name p1-name">{config.p1Name}</span>
          <div className="hud-row">
            <div className="hud-item"><span className="hud-label">Puan</span><span className="hud-value">{hud1.score}</span></div>
          </div>
          <div className="next-box" style={{ marginTop: 10 }}><canvas ref={next1Ref} width={64} height={32} style={{ width: 64, height: 32 }} /></div>
        </div>
        
        <div className="local-hud" style={{ marginTop: 20 }}>
          <span className="local-player-name p2-name">{config.p2Name}</span>
          <div className="hud-row">
            <div className="hud-item"><span className="hud-label">Puan</span><span className="hud-value">{hud2.score}</span></div>
          </div>
          <div className="next-box" style={{ marginTop: 10 }}><canvas ref={next2Ref} width={64} height={32} style={{ width: 64, height: 32 }} /></div>
        </div>

        {config.p3Enabled && (
          <div className="local-hud" style={{ marginTop: 20 }}>
            <span className="local-player-name p3-name">{config.p3Name}</span>
            <div className="hud-row">
              <div className="hud-item"><span className="hud-label">Puan</span><span className="hud-value">{hud3.score}</span></div>
            </div>
            <div className="next-box" style={{ marginTop: 10 }}><canvas ref={next3Ref} width={64} height={32} style={{ width: 64, height: 32 }} /></div>
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
          </div>
        )}

        <div className="local-hud" style={{ marginTop: 'auto', background: '#e8453c', borderColor: '#c0392b' }}>
<<<<<<< HEAD
          <span className="local-player-name" style={{ color: 'white' }}>{endless ? 'VİRÜSLER' : 'ORTAK VİRÜSLER'}</span>
=======
          <span className="local-player-name" style={{ color: 'white' }}>ORTAK VİRÜSLER</span>
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
          <div className="hud-row">
            <div className="hud-item" style={{ background: 'transparent' }}><span className="hud-value" style={{ color: 'white', fontSize: '2rem' }}>{viruses}</span></div>
          </div>
        </div>
      </div>

      <div className="local-stage" ref={stageRef} style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="board-canvas-wrapper" style={{ position: 'relative' }}>
          <canvas ref={canvasRef} className="board-canvas" />
          {countdown > 0 && (
            <div className="countdown" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', color: '#fff', textShadow: '2px 2px 0 #000' }}>
              {countdown}
            </div>
          )}
<<<<<<< HEAD
          {end && (
            <div className="outcome" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', color: end.outcome === 'won' ? 'var(--ok)' : 'var(--red)', zIndex: 10, textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, textShadow: '2px 2px 0 #000' }}>
                {end.outcome === 'won' ? 'KAZANDINIZ!' : endless ? 'TABAN SİZİ EZDİ!' : 'KAYBETTİNİZ!'}
              </div>
              {endless && (
                <div style={{ marginTop: 12, color: '#fff', fontSize: '1.1rem', lineHeight: 1.6 }}>
                  Dayandığınız yükselme: <strong>{end.rises}</strong><br />
                  Temizlenen virüs: <strong>{end.cleared}</strong><br />
                  Toplam puan: <strong>{end.score}</strong>
                </div>
              )}
=======
          {outcome && (
            <div className="outcome" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', color: outcome === 'won' ? 'var(--ok)' : 'var(--red)', zIndex: 10 }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, textShadow: '2px 2px 0 #000' }}>
                {outcome === 'won' ? 'KAZANDINIZ!' : 'KAYBETTİNİZ!'}
              </div>
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
              <button className="btn outline" onClick={onBack} style={{ marginTop: 20 }}>Geri Dön</button>
            </div>
          )}
        </div>
      </div>

      {!landscapeMode && (
        <div className="mobile-controls-wrapper local" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50, pointerEvents: 'none' }}>
<<<<<<< HEAD
          {humanIdx.map((i) => (
            <div key={i} style={{ pointerEvents: 'auto', flex: 1 }}>
              <MobileControls sink={sinkFor(i)} onPause={togglePause} showBomb={false} />
            </div>
          ))}
=======
          <div style={{ pointerEvents: 'auto', flex: 1 }}><MobileControls sink={sink1} onPause={togglePause} showBomb={false} /></div>
          {!config.p2IsBot && <div style={{ pointerEvents: 'auto', flex: 1 }}><MobileControls sink={sink2} onPause={togglePause} showBomb={false} /></div>}
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
        </div>
      )}
    </div>
  );
}
