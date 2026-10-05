import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  createGame,
  step,
  queueGarbage,
  isOver,
  Input,
  COLS,
  ROWS,
  FPS,
  type GameState,
} from '@pill/game-core';
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

  const rafRef = useRef(0);
  const accRef = useRef(0);
  const lastTsRef = useRef(0);
  const frameCountRef = useRef(0);

  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [huds, setHuds] = useState<Hud[]>(() => slots.map(() => ({ viruses: 0, score: 0, missCount: 0, bombs: 0 })));
  const [results, setResults] = useState<PlayerResult[]>(() => slots.map(() => null));
  const endedRef = useRef(false);
  const resultsRef = useRef<PlayerResult[]>(slots.map(() => null));
  const [matchDone, setMatchDone] = useState(false);

  const sinkFor = useCallback((i: number) => (inp: Input) => { L.queues[i].push(inp); }, [L]);

  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const lastPauseBtns = useRef<Record<number, boolean>>({});

  const togglePause = useCallback(() => {
    setIsPaused((p) => {
      const next = !p;
      isPausedRef.current = next;
      if (next) pauseMusic();
      else resumeMusic();
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

  // --- Kurulum ---
  useEffect(() => {
    initAudio();
    const seed = (Math.random() * 0xffffffff) >>> 0;
    const extractCfg = (sd: number) => ({
      seed: sd,
      level: config.level,
      speed: config.speed,
      diagMatches: config.diagMatches,
      counterEnabled: config.counterEnabled,
      powerupsEnabled: config.powerupsEnabled,
      powerupFreq: config.powerupFreq,
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
      lockStacking: config.lockStacking,
      lockMaxStack: config.lockMaxStack,
      bombEnabled: config.bombEnabled,
      bombThreshold: config.bombThreshold,
      colors: config.colors,
    });

    // aynı tohum: herkes aynı virüs dizilimi ve aynı kapsül sırasıyla başlar (adil)
    for (let i = 0; i < N; i++) L.states[i] = createGame(extractCfg(seed));
    setHuds(L.states.map((s) => ({ viruses: s!.virusesLeft, score: 0, missCount: 0, bombs: 0 })));

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

  // --- Oyun Döngüsü ---
  useEffect(() => {
    if (!running) return;
    lastTsRef.current = performance.now();

    const frame = (ts: number) => {
      rafRef.current = requestAnimationFrame(frame);
      const states = L.states;
      if (states.some((s) => !s)) return;
      const S = states as GameState[];

      let dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      if (dt > 500) dt = 500;
      accRef.current += dt;
      frameCountRef.current++;

      // Gamepad polling: RAF başına 1 kez (yalnızca insan oyuncular)
      slots.forEach((sl, i) => { if (!sl.isBot) pollGamepad(i, sinkFor(i), L.gps[i]); });

      // Pause kontrolü (gamepad Start)
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (!gp) continue;
        const pressed = !!gp.buttons[9]?.pressed; // 9 = Start/Options
        if (pressed && !lastPauseBtns.current[gp.index]) togglePause();
        lastPauseBtns.current[gp.index] = pressed;
      }

      if (isPausedRef.current) {
        lastTsRef.current = ts;
        accRef.current = 0;
        return;
      }

      while (accRef.current >= STEP_MS) {
        accRef.current -= STEP_MS;

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
        }
      }

      // Çizim
      advanceAnim();
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
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // --- Canvas boyutlandırma: her zaman mevcut alana COLS×ROWS oranında sığar ---
  const resizeCanvas = useCallback((canvas: HTMLCanvasElement | null, stage: HTMLDivElement | null) => {
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
            {config.bombEnabled && (
              <div className="hud-item" style={{ minWidth: 60 }}>
                <span className="hud-label">Bomba</span>
                <span className="hud-value" style={{ fontSize: '1.2rem', display: 'flex', gap: 2 }}>
                  {Array.from({ length: 3 }).map((_, k) => (
                    <span key={k} style={{ opacity: k < hud.bombs ? 1 : 0.2 }}>💣</span>
                  ))}
                </span>
              </div>
            )}
            <div className="hud-item">
              <span className="hud-label">Sonraki</span>
              <canvas ref={(el) => { L.nexts[i] = el; }} width={80} height={40} className="next-canvas" />
            </div>
            {config.missPenaltyEnabled && (
              <div className="hud-item strike-bar-container">
                <span className="hud-label">Ceza</span>
                <div className="strike-bar">
                  <div className={`strike-pip ${hud.missCount > 0 ? 'on' : ''}`}></div>
                  <div className={`strike-pip ${hud.missCount > 1 ? 'on' : ''}`}></div>
                  <div className={`strike-pip ${hud.missCount > 2 ? 'on' : ''}`}></div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="local-stage" ref={(el) => { L.stages[i] = el; }}>
          <canvas ref={(el) => { L.canvases[i] = el; }} className="board-canvas" />
          {countdown > 0 && <div className="countdown"><span>{countdown}</span></div>}
          {res && (
            <div className="overlay">
              <p className="overlay-title">{res === 'won' ? '🏆 Kazandı!' : matchDone ? '💀 Kaybetti' : '💀 Elendi'}</p>
            </div>
          )}
        </div>
        <div className="local-controls-hint">
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
    </div>
  );
}
