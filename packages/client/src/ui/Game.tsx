import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createGame,
  resumeGame,
  step,
  queueGarbage,
  isOver,
  Input,
  Phase,
  encodeBoard,
  decodeBoard,
  createBoard,
  COLS,
  ROWS,
  FPS,
  type GameState,
  type Board,
  type AttackInfo,
} from '@pill/game-core';
import type { PlayerPublic, TargetMode } from '@pill/protocol';
import { TARGET_MODES } from '@pill/protocol';
import { socket, serverNow } from '../net/socket';
import { Juice } from '../game/juice';
import { drawBoard, drawMini, drawNext, drawIncomingMeter, advanceAnim, type VisualEffect } from '../game/render';
import { attachKeyboard, attachTouch, holdable } from '../game/controls';
import { pollGamepad, createGamepadState } from '../game/gamepad';
import { sfx, startMusic, stopMusic, pauseMusic, resumeMusic, setTheme, initAudio } from '../game/audio';
import type { MatchStart, ResumeState } from '../App';
import MobileControls from './MobileControls';

const STEP_MS = 1000 / FPS;

interface PeerView {
  id: string;
  name: string;
  board: Board;
  viruses: number;
  alive: boolean;
  score: number;
}

export default function Game({
  match,
  resume,
  you,
  onLeave,
  onQuit,
  landscapeMode,
}: {
  match: MatchStart;
  resume: ResumeState | null;
  you: string;
  onLeave: () => void;
  onQuit: () => void;
  landscapeMode?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef<GameState | null>(null);
  const inputQueue = useRef<Input[]>([]);
  const rafRef = useRef(0);
  const accRef = useRef(0);
  const lastTsRef = useRef(0);
  const lastSyncRef = useRef(0);
  const finishedRef = useRef(false);
  const pendingAttackRef = useRef<AttackInfo>({ normal: 0, stone: 0, lock: 0 });
  const gpStateRef = useRef(createGamepadState());
  const fxRef = useRef<VisualEffect[]>([]);
  const juiceRef = useRef(new Juice());
  const [targetMode, setTargetMode] = useState<TargetMode>(() => {
    try {
      const v = localStorage.getItem('pill.targetMode');
      return TARGET_MODES.includes(v as TargetMode) ? (v as TargetMode) : 'random';
    } catch {
      return 'random';
    }
  });
  const isPausedRef = useRef(false);
  const lastPauseBtnsRef = useRef<Record<number, boolean>>({});

  const [isPaused, setIsPaused] = useState(false);

  const [countdown, setCountdown] = useState(3);
  const [running, setRunning] = useState(false);
  const [hud, setHud] = useState({ viruses: 0, score: 0, chain: 0, phase: Phase.Spawning, missCount: 0, bombs: 0 });
  const [peers, setPeers] = useState<Record<string, PeerView>>({});
  const [padMode, setPadMode] = useState(() => localStorage.getItem('pill.pad') === '1');
  const [outcome, setOutcome] = useState<'won' | 'lost' | null>(null);

  const sink = useCallback((i: Input) => {
    inputQueue.current.push(i);
  }, []);

  const isHost = you === match.hostId;

  const togglePause = useCallback(() => {
    if (!isHost) return; // sadece oda sahibi duraklatabilir
    setIsPaused(p => {
      const next = !p;
      isPausedRef.current = next;
      if (next) {
        pauseMusic();
        socket.emit('game_pause', {});
      } else {
        resumeMusic();
        socket.emit('game_resume', {});
      }
      return next;
    });
  }, [isHost]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && isHost) togglePause(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause, isHost]);

  // --- kurulum ---
  useEffect(() => {
    initAudio();
    setTheme(Math.random() > 0.5 ? 'a' : 'b');

    const cfg = {
      seed: match.seed,
      level: match.config.level,
      speed: match.config.speed,
      diagMatches: match.config.diagMatches,
      counterEnabled: match.config.counterEnabled,
      powerupsEnabled: match.config.powerupsEnabled,
      powerupFreq: match.config.powerupFreq,
      lockStacking: match.config.lockStacking,
      lockMaxStack: match.config.lockMaxStack,
      aoeEnabled: match.config.aoeEnabled,
      aoeThreshold: match.config.aoeThreshold,
      missPenaltyEnabled: match.config.missPenaltyEnabled,
      missPenaltyThreshold: match.config.missPenaltyThreshold,
      normalAttackEnabled: match.config.normalAttackEnabled,
      normalAttackLen: match.config.normalAttackLen,
      normalAttackRequireCombo: match.config.normalAttackRequireCombo,
      stoneAttackEnabled: match.config.stoneAttackEnabled,
      stoneAttackLen: match.config.stoneAttackLen,
      stoneAttackRequireCombo: match.config.stoneAttackRequireCombo,
      lockAttackEnabled: match.config.lockAttackEnabled,
      lockAttackLen: match.config.lockAttackLen,
      lockAttackRequireCombo: match.config.lockAttackRequireCombo,
      bombEnabled: match.config.bombEnabled,
      bombThreshold: match.config.bombThreshold,
      colors: match.config.colors,
    };
    if (resume) {
      // maçın ortasına döndük: son bilinen tahtadan devam, geri sayım yok
      stateRef.current = resumeGame(cfg, decodeBoard(resume.board), resume.frame, resume.score, resume.viruses);
      setCountdown(0);
      setRunning(true);
      startMusic();
    } else {
      stateRef.current = createGame(cfg);
    }
    setHud((h) => ({ ...h, viruses: stateRef.current!.virusesLeft }));

    const init: Record<string, PeerView> = {};
    for (const p of match.players) {
      if (p.id === you) continue;
      init[p.id] = {
        id: p.id,
        name: p.name,
        board: createBoard(),
        viruses: 0,
        alive: true,
        score: 0,
      };
    }
    setPeers(init);

    if (!resume) {
      // geri sayım, sunucu saatine göre
      const tickCountdown = () => {
        const left = Math.ceil((match.startAt - serverNow()) / 1000);
        if (left <= 0) {
          setCountdown(0);
          setRunning(true);
          sfx('go');
          startMusic();
          return;
        }
        setCountdown(left);
        sfx('countdown');
        setTimeout(tickCountdown, 1000);
      };
      tickCountdown();
    }

    return () => {
      stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- ağ dinleyicileri ---
  useEffect(() => {
    const onPeerBoard = ({
      id,
      board,
      viruses,
    }: {
      id: string;
      board: string;
      viruses: number;
    }) => {
      setPeers((prev) => {
        const p = prev[id];
        if (!p) return prev;
        return { ...prev, [id]: { ...p, board: decodeBoard(board), viruses } };
      });
    };

    const onSummary = ({
      players,
    }: {
      players: Array<{ id: string; alive: boolean; viruses: number; score: number }>;
    }) => {
      setPeers((prev) => {
        const next = { ...prev };
        for (const s of players) {
          if (!next[s.id]) continue;
          next[s.id] = { ...next[s.id], alive: s.alive, viruses: s.viruses, score: s.score };
        }
        return next;
      });
    };

    const onAttack = ({ attack, seed }: { attack: AttackInfo; seed: number }) => {
      const s = stateRef.current;
      if (!s || isOver(s)) return;
      queueGarbage(s, attack, seed);
      sfx('garbage');
    };

    const onOut = ({ id }: { id: string }) => {
      setPeers((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], alive: false } } : prev));
    };

    socket.on('peer_board', onPeerBoard);
    socket.on('peer_summary', onSummary);
    socket.on('incoming_attack', onAttack);
    socket.on('player_out', onOut);

    // duraklatma/devam: oda sahibi emit eder, herkes dinler
    const onGamePaused = () => {
      isPausedRef.current = true;
      setIsPaused(true);
      pauseMusic();
    };
    const onGameResumed = () => {
      isPausedRef.current = false;
      setIsPaused(false);
      resumeMusic();
    };
    socket.on('game_paused', onGamePaused);
    socket.on('game_resumed', onGameResumed);

    return () => {
      socket.off('peer_board', onPeerBoard);
      socket.off('peer_summary', onSummary);
      socket.off('incoming_attack', onAttack);
      socket.off('player_out', onOut);
      socket.off('game_paused', onGamePaused);
      socket.off('game_resumed', onGameResumed);
    };
  }, []);

  // --- saldırı hedefleme ---
  const chooseTarget = useCallback((m: TargetMode, announce = true) => {
    setTargetMode(m);
    try { localStorage.setItem('pill.targetMode', m); } catch { /* yok say */ }
    socket.emit('set_target', { mode: m });
    const s = stateRef.current;
    if (announce && s) juiceRef.current.announce(`🎯 ${TARGET_LABEL[m]}`, s.cols || COLS, s.board.rows, '#FFFFFF', 0.8);
  }, []);

  // sunucu tercihi maçlar arasında hatırlar; istemci açılışta mevcut seçimi bildirir
  useEffect(() => {
    socket.emit('set_target', { mode: targetMode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- kontroller ---
  useEffect(() => {
    const onCheat = (e: KeyboardEvent) => {
      // 1/2/3: hedefleme modu
      const idx = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
      if (idx >= 0 && !e.repeat) {
        chooseTarget(TARGET_MODES[idx]);
        e.preventDefault();
        return;
      }
      // Hata ayıklama kısayolu: yalnızca geliştirme modunda (üretimde herkes taş saldırısı gönderebiliyordu)
      if (import.meta.env.DEV && e.code === 'Digit9' && stateRef.current) {
        socket.emit('attack', { frame: stateRef.current.frame, attack: { normal: 0, stone: 1, lock: 0 } });
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onCheat);

    const offKb = attachKeyboard(sink);
    const el = stageRef.current;
    const offTouch = el && !padMode ? attachTouch(el, sink) : () => { };
    return () => {
      window.removeEventListener('keydown', onCheat);
      offKb();
      offTouch();
    };
  }, [sink, padMode, chooseTarget]);

  // --- sabit adımlı oyun döngüsü ---
  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    lastTsRef.current = performance.now();

    const frame = (ts: number) => {
      rafRef.current = requestAnimationFrame(frame);
      const s = stateRef.current;
      if (!s) return;

      let dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      // sekme arkadan dönerse sonsuz yakalama yapma
      if (dt > 500) dt = 500;
      accRef.current += dt;

      pollGamepad(0, sink, gpStateRef.current);

      // Gamepad pause (Start button = 9) — sadece oda sahibi
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (!gp) continue;
        const pressed = !!gp.buttons[9]?.pressed;
        if (pressed && !lastPauseBtnsRef.current[gp.index] && isHost) togglePause();
        lastPauseBtnsRef.current[gp.index] = pressed;
      }

      if (isPausedRef.current) {
        lastTsRef.current = ts;
        accRef.current = 0;
        return;
      }
      let steps = 0;
      while (accRef.current >= STEP_MS && steps < 8) {
        accRef.current -= STEP_MS;
        steps++;

        const inputs = inputQueue.current;
        inputQueue.current = [];
        step(s, inputs);
        juiceRef.current.handle(s, s.cols || COLS);

        for (const ev of s.events) {
          if (ev === 'move' || ev === 'rotate' || ev === 'lock' || ev === 'clear' ||
            ev === 'chain' || ev === 'virus' || ev === 'won' || ev === 'lost') {
            sfx(ev, s.chain);
          } else if (ev.startsWith('power:')) {
            sfx('power');
          } else if (ev === 'shield_block') {
            sfx('shield');
          } else if (ev.startsWith('counter:')) {
            sfx('counter');
          } else if (ev.startsWith('penalty_spawn:')) {
            sfx('penalty_spawn');
            fxRef.current.push({ type: 'penalty', idx: parseInt(ev.split(':')[1], 10), timer: 30 });
          } else if (ev.startsWith('explosion:')) {
            sfx('explosion');
            ev.split(':')[1].split(',').forEach(i => fxRef.current.push({ type: 'explosion', idx: parseInt(i, 10), timer: 30 }));
          } else if (ev.startsWith('bomb_explosion:')) {
            sfx('explosion');
            ev.split(':')[1].split(',').forEach(i => fxRef.current.push({ type: 'bomb_explosion', idx: parseInt(i, 10), timer: 45 }));
          }
        }
        if (s.attackOut) {
          pendingAttackRef.current.normal += s.attackOut.normal;
          pendingAttackRef.current.stone += s.attackOut.stone;
          pendingAttackRef.current.lock += s.attackOut.lock;
          s.attackOut = null;
        }

        if (isOver(s) && !finishedRef.current) {
          finishedRef.current = true;
          const won = s.phase === Phase.Won;
          setOutcome(won ? 'won' : 'lost');
          stopMusic();
          socket.emit('finished', {
            frame: s.frame,
            won,
            score: s.score,
            viruses: s.virusesLeft,
            maxChain: s.maxChain,
          });
        }
      }

      // saldırıları topluca yolla
      const pAttack = pendingAttackRef.current;
      if ((pAttack.normal > 0 || pAttack.stone > 0 || pAttack.lock > 0) && !finishedRef.current) {
        socket.emit('attack', { frame: s.frame, attack: pAttack });
        pendingAttackRef.current = { normal: 0, stone: 0, lock: 0 };
      }

      // saniyede 1 tahta senkronu
      if (ts - lastSyncRef.current > 1000 && !finishedRef.current) {
        lastSyncRef.current = ts;
        socket.emit('board_sync', {
          frame: s.frame,
          board: encodeBoard(s.board),
          viruses: s.virusesLeft,
          score: s.score,
        });
      }

      // çizim
      advanceAnim();

      for (let i = fxRef.current.length - 1; i >= 0; i--) {
        fxRef.current[i].timer--;
        if (fxRef.current[i].timer <= 0) fxRef.current.splice(i, 1);
      }

      const cols = s.cols || COLS;
      const cell = canvas.clientWidth / cols;
      juiceRef.current.update();
      drawBoard(
        ctx,
        s.board,
        {
          cellSize: cell,
          showGhost: false,
          clearing: s.clearing,
          clearPulse: s.phaseTimer,
          effects: fxRef.current,
        },
        s
      );
      juiceRef.current.draw(ctx, cell, cols);
      if (match.config.counterEnabled) {
        const incoming = s.pendingGarbage.reduce((n, g) => n + g.columns.length, 0);
        drawIncomingMeter(ctx, cell, s.board.rows, incoming);
      }
      juiceRef.current.applyShake(canvas);

      const nc = nextRef.current?.getContext('2d');
      if (nc) drawNext(nc, s.nextA, s.nextB, nextRef.current!.width / 2, s.nextPower);

      setHud((h) =>
        h.viruses === s.virusesLeft && h.score === s.score && h.chain === s.chain && h.missCount === s.missCount && h.bombs === s.bombs
          ? h
          : { viruses: s.virusesLeft, score: s.score, chain: s.chain, phase: s.phase, missCount: s.missCount, bombs: s.bombs }
      );
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);

  // --- canvas boyutlandırma (integer ölçek, piksel netliği için) ---
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const stage = stageRef.current;
      if (!canvas || !stage) return;

      // Canvas'ın kendi boyutu stage'i şişirmesin diye ölçümden önce gizliyoruz
      const prevDisplay = canvas.style.display;
      canvas.style.display = 'none';

      const availH = stage.clientHeight - 8;
      const availW = stage.clientWidth - 8;

      canvas.style.display = prevDisplay;

      const cols = stateRef.current?.cols || COLS;
      const rows = stateRef.current?.rows || ROWS;
      let cell = Math.floor(Math.min(availW / cols, availH / rows));
      cell = Math.max(12, cell);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = cols * cell * dpr;
      canvas.height = rows * cell * dpr;
      canvas.style.width = `${cols * cell}px`;
      canvas.style.height = `${rows * cell}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const stageEl = stageRef.current;
    if (!stageEl) return;
    const observer = new ResizeObserver(() => {
      resize();
    });
    observer.observe(stageEl);

    // Initial call just in case
    resize();

    return () => {
      observer.disconnect();
    };
  }, []);

  const peerList = Object.values(peers);
  const aliveCount = peerList.filter((p) => p.alive).length + (outcome ? 0 : 1);

  return (
    <div className="game" style={{ position: 'relative' }}>
      {isPaused && !outcome && (
        <div className="overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.82)', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <h2 style={{ fontSize: '3rem', color: '#fff', textShadow: '2px 2px 4px #000', margin: 0 }}>OYUN DURDURULDU</h2>

          {isHost ? (
            <>
              <button className="btn primary" onClick={togglePause} style={{ fontSize: '1.2rem', padding: '10px 32px' }}>▶ Devam Et</button>
              <button
                className="btn ghost"
                style={{ fontSize: '1rem', padding: '8px 24px', color: '#ff6b6b', borderColor: '#ff6b6b' }}
                onClick={onQuit}
              >
                ✕ Oyunu Bitir ve Çık
              </button>
            </>
          ) : (
            <p style={{ color: '#aaa', fontSize: '1rem', marginTop: 8 }}>Oda sahibi devam etmesini bekleyin…</p>
          )}
        </div>
      )}
      {!landscapeMode && (
        <div className="game-hud">
          <div className="hud-item">
            <span className="hud-label">Virüs</span>
            <span className="hud-value">{hud.viruses}</span>
          </div>
          <div className="hud-item">
            <span className="hud-label">Puan</span>
            <span className="hud-value">{hud.score}</span>
          </div>
          <div className="hud-item">
            <span className="hud-label">Sıradaki</span>
            <canvas ref={nextRef} width={80} height={40} className="next-canvas" />
          </div>
          <div className="hud-item">
            <span className="hud-label">Kalan</span>
            <span className="hud-value">{aliveCount}</span>
          </div>
          {match.config.bombEnabled && (
            <div className="hud-item" style={{ minWidth: 60 }}>
              <span className="hud-label">Bomba</span>
              <span className="hud-value" style={{ fontSize: '1.2rem', display: 'flex', gap: 2 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <span key={i} style={{ opacity: i < hud.bombs ? 1 : 0.2 }}>💣</span>
                ))}
              </span>
            </div>
          )}
          {match.config.missPenaltyEnabled && (
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
      )}


      < div className="game-body">
        <div className="stage" ref={stageRef}>
          {landscapeMode && (
            <div className="game-hud">
              <div className="hud-item">
                <span className="hud-label">Virüs</span>
                <span className="hud-value">{hud.viruses}</span>
              </div>
              <div className="hud-item">
                <span className="hud-label">Puan</span>
                <span className="hud-value">{hud.score}</span>
              </div>
              <div className="hud-item">
                <span className="hud-label">Sıradaki</span>
                <canvas ref={nextRef} width={80} height={40} className="next-canvas" />
              </div>
              <div className="hud-item">
                <span className="hud-label">Kalan</span>
                <span className="hud-value">{aliveCount}</span>
              </div>
              {match.config.bombEnabled && (
                <div className="hud-item" style={{ minWidth: 60 }}>
                  <span className="hud-label">Bomba</span>
                  <span className="hud-value" style={{ fontSize: '1.2rem', display: 'flex', gap: 2 }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span key={i} style={{ opacity: i < hud.bombs ? 1 : 0.2 }}>💣</span>
                    ))}
                  </span>
                </div>
              )}
              {match.config.missPenaltyEnabled && (
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
          )}
          <canvas ref={canvasRef} className="board-canvas" />
          {countdown > 0 && (
            <div className="countdown">
              <span>{countdown}</span>
            </div>
          )}
          {outcome && (
            <div className="overlay">
              <p className="overlay-title">{outcome === 'won' ? 'Şişe temiz' : 'Şişe doldu'}</p>
              <p className="overlay-sub">
                {outcome === 'won'
                  ? 'Bütün virüsleri temizledin.'
                  : 'Diğerleri bitirene kadar izleyebilirsin.'}
              </p>
            </div>
          )}
        </div>

        {peerList.length > 0 && (
          <aside className="peers">
            {peerList.map((p) => (
              <PeerBoard key={p.id} peer={p} />
            ))}
          </aside>
        )}
      </div>

      {
        landscapeMode && (
          <MobileControls
            sink={sink}
            onPause={togglePause}
            showBomb={match.config.bombEnabled || false}
          />
        )
      }


      {
        padMode && (
          <div className="pad">
            <div className="pad-dpad">
              <button className="pad-btn left" {...holdable(sink, Input.Left, Input.SoftDropOff)}>◀</button>
              <button className="pad-btn right" {...holdable(sink, Input.Right, Input.SoftDropOff)}>▶</button>
              <button className="pad-btn down" {...holdable(sink, Input.SoftDropOn, Input.SoftDropOff)}>▼</button>
            </div>
            <div className="pad-actions">
              <button className="pad-btn action ccw" {...holdable(sink, Input.RotateCCW)}>↺</button>
              <button className="pad-btn action cw" {...holdable(sink, Input.RotateCW)}>↻</button>
              <button className="pad-btn action drop" {...holdable(sink, Input.HardDrop)}>Bırak</button>
            </div>
          </div>
        )
      }

      {peerList.length > 1 && (
        <div className="target-row">
          <span className="target-label">🎯 Hedef</span>
          {TARGET_MODES.map((m, i) => (
            <button
              key={m}
              className={`target-pill ${targetMode === m ? 'on' : ''}`}
              onClick={() => chooseTarget(m)}
              title={`${TARGET_HINT[m]} (tuş: ${i + 1})`}
            >
              {TARGET_LABEL[m]}
            </button>
          ))}
        </div>
      )}

      <div className="game-foot">
        <button
          className="btn small ghost"
          onClick={() => {
            const v = !padMode;
            setPadMode(v);
            localStorage.setItem('pill.pad', v ? '1' : '0');
          }}
        >
          {padMode ? 'Kaydırma kontrolü' : 'Buton kontrolü'}
        </button>
        <span className="hint">
          {padMode
            ? 'Butonlarla oyna.'
            : 'Kaydır: yana taşı · Dokun: çevir · Aşağı fırlat: bırak'}
        </span>
        {isHost && !outcome && (
          <button className="btn small outline" onClick={togglePause} style={{ marginRight: 8 }}>
            ⏸️ Durdur
          </button>
        )}
        <button
          className="btn small ghost"
          onClick={() => {
            if (!finishedRef.current && stateRef.current) {
              finishedRef.current = true;
              socket.emit('finished', {
                frame: stateRef.current.frame,
                won: false,
                score: stateRef.current.score,
                viruses: stateRef.current.virusesLeft,
                maxChain: stateRef.current.maxChain,
              });
            }
            onLeave();
          }}
        >
          {outcome ? 'Odaya dön' : 'Ayrıl (Pes et)'}
        </button>
      </div>
    </div >
  );
}

const TARGET_LABEL: Record<TargetMode, string> = {
  random: 'Rastgele',
  leader: 'Lider',
  revenge: 'Rövanş',
};
const TARGET_HINT: Record<TargetMode, string> = {
  random: 'Hayatta olan rastgele bir rakip',
  leader: 'Galibiyete en yakın rakip (en az virüsü kalan)',
  revenge: 'Seni en son vuran rakip',
};

function PeerBoard({ peer }: { peer: PeerView }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const cols = (peer.board as any).cols || COLS;
    const rows = (peer.board as any).rows || ROWS;
    const cell = 5;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = cols * cell * dpr;
    c.height = rows * cell * dpr;
    c.style.width = `${cols * cell}px`;
    c.style.height = `${rows * cell}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawMini(ctx, peer.board, cell);
  }, [peer.board]);

  return (
    <div className={`peer ${peer.alive ? '' : 'out'}`}>
      <canvas ref={ref} />
      <div className="peer-meta">
        <span className="peer-name">{peer.name}</span>
        <span className="peer-virus">{peer.alive ? `${peer.viruses} virüs` : 'elendi'}</span>
      </div>
    </div>
  );
}
