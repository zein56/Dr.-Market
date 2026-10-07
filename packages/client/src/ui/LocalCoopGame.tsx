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

export default function LocalCoopGame({
  config,
  onBack,
  landscapeMode,
}: {
  config: LocalConfig;
  onBack: () => void;
  landscapeMode?: boolean;
}) {
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

  const rafRef = useRef(0);
  const accRef = useRef(0);
  const lastTsRef = useRef(0);
  const frameCountRef = useRef(0);

  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [viruses, setViruses] = useState(state.current.virusesLeft);
  const [scores, setScores] = useState<number[]>(() => slots.map(() => 0));
  const [rise, setRise] = useState({ count: 0, ratio: 0 });
  const [end, setEnd] = useState<End | null>(null);
  const endedRef = useRef(false);

  const sinkFor = useCallback((i: number) => (inp: Input) => { queues.current[i].push(inp); }, []);

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

  // Kurulum + geri sayım
  useEffect(() => {
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
      }
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const resizeCanvas = useCallback((canvas: HTMLCanvasElement | null, stage: HTMLDivElement | null) => {
    if (!canvas || !stage) return;
    const rows = state.current!.rows;
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

  // dokunmatik kontrol: ilk iki insan oyuncu
  const humanIdx = slots.filter((s) => !s.isBot).map((s) => s.index).slice(0, 2);

  return (
    <div className="local-game" style={{ position: 'relative' }}>
      {isPaused && !end && (
        <div className="overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '3rem', color: '#fff' }}>OYUN DURDURULDU</h2>
          <button className="btn primary" onClick={togglePause} style={{ marginTop: 20 }}>Devam Et</button>
          <button className="btn" onClick={onBack} style={{ marginTop: 10, background: '#e74c3c', color: 'white' }}>Çıkış</button>
        </div>
      )}

      {/* Ortak HUD */}
      <div className="local-panel" style={{ flex: 'none' }}>
        {slots.map((sl, i) => (
          <div key={i} className="local-hud" >
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
          </div>
        )}

        <div className="local-hud" style={{ marginTop: 'auto', background: '#e8453c', borderColor: '#c0392b' }}>
          <span className="local-player-name" style={{ color: 'white' }}>{endless ? 'VİRÜSLER' : 'ORTAK VİRÜSLER'}</span>
          <div className="hud-row">
            <div className="hud-item" style={{ background: 'transparent' }}><span className="hud-value" style={{ color: 'white', fontSize: '2rem' }}>{viruses}</span></div>
          </div>
        </div>
      </div>

      <div className="local-stage" ref={stageRef} style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="board-canvas-wrapper" style={{ position: 'relative',display:'flex',alignItems:'center', width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%' }}>
          <canvas ref={canvasRef} className="board-canvas" />
          {countdown > 0 && (
            <div className="countdown" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', color: '#fff', textShadow: '2px 2px 0 #000' }}>
              {countdown}
            </div>
          )}
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
              <button className="btn outline" onClick={onBack} style={{ marginTop: 20 }}>Geri Dön</button>
            </div>
          )}
        </div>
      </div>

      {!landscapeMode  && (
        <div className="mobile-controls-wrapper local" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50, pointerEvents: 'none' }}>
          {humanIdx.map((i) => (
            <div key={i} style={{ pointerEvents: 'auto', flex: 1 }}>
              <MobileControls sink={sinkFor(i)} onPause={togglePause} showBomb={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
