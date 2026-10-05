import { useEffect, useRef, useState } from 'react';
import type { RoomPublic, PlayerPublic, RoomConfig } from '@pill/protocol';
import { socket, connect, startClockSync, attachAutoRehello } from './net/socket';
import { initAudio, sfx, setMusicEnabled, setSfxEnabled, isMusicEnabled, isSfxEnabled } from './game/audio';
import Lobby from './ui/Lobby';
import RoomView from './ui/Room';
import Game from './ui/Game';
import Results from './ui/Results';
import LocalSetup from './ui/LocalSetup';
import LocalGame from './ui/LocalGame';
import LocalCoopGame from './ui/LocalCoopGame';
import MobileControlsEditor from './ui/MobileControlsEditor';
import type { LocalConfig } from './ui/LocalSetup';

export interface MatchStart {
  seed: number;
  config: RoomConfig;
  startAt: number;
  players: PlayerPublic[];
  hostId: string;
}

export interface ResumeState {
  frame: number;
  board: string;
  viruses: number;
  score: number;
}

export interface MatchResult {
  id: string;
  name: string;
  placement: number;
  score: number;
  maxChain: number;
}

type Screen = 'name' | 'lobby' | 'room' | 'game' | 'results' | 'localsetup' | 'localgame' | 'mcedit';


export default function App() {
  const [screen, setScreen] = useState<Screen>('name');
  const [name, setName] = useState(() => localStorage.getItem('pill.name') || '');
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [rooms, setRooms] = useState<RoomPublic[]>([]);
  const [room, setRoom] = useState<RoomPublic | null>(null);
  const [match, setMatch] = useState<MatchStart | null>(null);
  const [resume, setResume] = useState<ResumeState | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [music, setMusic] = useState(true);
  const [sound, setSound] = useState(true);
  const [localConfig, setLocalConfig] = useState<LocalConfig | null>(null);
  const [landscapeMode, setLandscapeMode] = useState(() => localStorage.getItem('pill.landscapeMode') === 'true');
  const [topbarVisible, setTopbarVisible] = useState(true);
  // sayfa yenilenince: daha önce bir oturum varsa, isim yeniden yazdırmadan
  // sessizce bağlanmayı dene. Sunucu ulaşılamazsa birkaç saniye sonra pes edip
  // normal giriş formunu göster.
  const [autoConnecting, setAutoConnecting] = useState(() => !!localStorage.getItem('pill.name'));
  const toastTimer = useRef<number | null>(null);

  const flash = (m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => {
      setConnected(false);
      flash('Bağlantı koptu, yeniden deneniyor');
    };
    const onHello = ({ playerId, token }: { playerId: string; token: string }) => {
      setPlayerId(playerId);
      localStorage.setItem('pill.token', token);
      setAutoConnecting(false);
      setScreen((s) => (s === 'name' ? 'lobby' : s));
    };
    const onRoomList = ({ rooms }: { rooms: RoomPublic[] }) => setRooms(rooms);
    const onRoomState = ({ room }: { room: RoomPublic }) => {
      setRoom(room);
      setScreen((s) => (s === 'game' || s === 'results' ? s : 'room'));
    };
    const onMatchStart = (m: MatchStart) => {
      setResume(null);
      setMatch(m);
      setScreen('game');
    };
    const onResumeState = (r: MatchStart & ResumeState) => {
      // maçın ortasındaydık, koptuk, geri döndük — son bilinen durumdan devam
      setResume({ frame: r.frame, board: r.board, viruses: r.viruses, score: r.score });
      setMatch({ seed: r.seed, config: r.config, startAt: Date.now() - 1, players: r.players, hostId: r.hostId });
      setScreen('game');
      flash('Maça geri döndün');
    };
    const onMatchEnd = ({ results }: { results: MatchResult[] }) => {
      setResults(results);
      setScreen('results');
    };
    const onLeftRoom = () => setScreen('lobby');
    const onError = ({ message }: { message: string }) => flash(message);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('hello_ok', onHello);
    socket.on('room_list', onRoomList);
    socket.on('room_state', onRoomState);
    socket.on('match_start', onMatchStart);
    socket.on('resume_state', onResumeState);
    socket.on('match_end', onMatchEnd);
    socket.on('left_room', onLeftRoom);
    socket.on('error_msg', onError);

    startClockSync();
    attachAutoRehello();

    // sayfa yeni yüklendi: daha önce bir isim/oturum kaydedilmişse otomatik bağlan
    const savedName = localStorage.getItem('pill.name');
    if (savedName && !socket.connected) {
      socket.connect();
    }
    // sunucuya hiç ulaşılamazsa sonsuza kadar "bağlanıyor" ekranında kalma
    const giveUp = window.setTimeout(() => setAutoConnecting(false), 6000);

    return () => {
      clearTimeout(giveUp);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('hello_ok', onHello);
      socket.off('room_list', onRoomList);
      socket.off('room_state', onRoomState);
      socket.off('match_start', onMatchStart);
      socket.off('resume_state', onResumeState);
      socket.off('match_end', onMatchEnd);
      socket.off('left_room', onLeftRoom);
      socket.off('error_msg', onError);
    };
  }, []);

  // sekme arkaya atılınca sesi kes
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setMusicEnabled(false);
      else setMusicEnabled(music);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [music]);

  const handleEnter = () => {
    const n = name.trim().slice(0, 16);
    if (!n) return;
    localStorage.setItem('pill.name', n);
    initAudio();
    sfx('click');
    connect(n);
  };

  const toggleMusic = () => {
    initAudio();
    const v = !music;
    setMusic(v);
    setMusicEnabled(v);
  };
  const toggleSound = () => {
    initAudio();
    const v = !sound;
    setSound(v);
    setSfxEnabled(v);
  };
  const toggleLandscape = () => {
    sfx('click');
    const v = !landscapeMode;
    setLandscapeMode(v);
    localStorage.setItem('pill.landscapeMode', v ? 'true' : 'false');
    if (v) {
      // Tam ekran iste
      document.documentElement.requestFullscreen?.().catch(() => {});
      setTopbarVisible(false);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setTopbarVisible(true);
    }
  };

  const isInGame = screen === 'game' || screen === 'localgame';
  const hideTopbar = landscapeMode && isInGame && !topbarVisible;

  return (
    <div className={`app ${landscapeMode ? 'landscape-active' : ''} ${isInGame ? 'in-game' : ''}`}>
      {!hideTopbar && (
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Pill Arena</span>
        </div>
        <div className="topbar-right">
          {screen !== 'name' && (
            <span className={`conn ${connected ? 'on' : 'off'}`}>
              {connected ? 'bağlı' : 'bağlanıyor'}
            </span>
          )}
          <button className="icon-btn" onClick={toggleMusic} aria-pressed={music}>
            {music ? 'Müzik açık' : 'Müzik kapalı'}
          </button>
          <button className="icon-btn" onClick={toggleSound} aria-pressed={sound}>
            {sound ? 'Ses açık' : 'Ses kapalı'}
          </button>
        </div>
      </header>
      )}
      {landscapeMode && isInGame && (
        <button
          className="topbar-toggle-btn"
          onClick={() => setTopbarVisible(v => !v)}
          title={topbarVisible ? 'Üst çubuğu gizle' : 'Üst çubuğu göster'}
        >
          {topbarVisible ? '▲' : '▼'}
        </button>
      )}

      {toast && <div className="toast">{toast}</div>}

      <main className="main">
        {screen === 'name' && autoConnecting && (
          <section className="enter">
            <p className="reconnecting">
              <span className="spinner" aria-hidden="true" />
              Önceki oturuma bağlanılıyor…
            </p>
            <button
              className="btn ghost small"
              onClick={() => {
                localStorage.removeItem('pill.token');
                localStorage.removeItem('pill.name');
                setName('');
                setAutoConnecting(false);
              }}
            >
              Farklı bir isimle başla
            </button>
          </section>
        )}

        {screen === 'name' && !autoConnecting && (
          <section className="enter">
            <h1 className="enter-title">Şişeyi virüslerden temizle.</h1>
            <p className="enter-sub">
              Aynı renkten dört tanesini yan yana diz. Patlattığın her fazla dizi rakibinin
              şişesine çöp kapsül yollar. Son ayakta kalan kazanır.
            </p>
            <div className="enter-form">
              <input
                className="text-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
                placeholder="Takma adın"
                maxLength={16}
                autoFocus
              />
              <button className="btn primary" onClick={handleEnter} disabled={!name.trim()}>
                Oyuna gir
              </button>
            </div>
          </section>
        )}

        {screen === 'lobby' && (
          <Lobby 
            rooms={rooms} 
            onFlash={flash} 
            onLocalGame={() => setScreen('localsetup')} 
            landscapeMode={landscapeMode}
            onToggleLandscape={toggleLandscape}
            onEditMobileControls={() => setScreen('mcedit')}
          />
        )}

        {screen === 'localsetup' && (
          <LocalSetup
            onStart={(cfg) => {
              setLocalConfig(cfg);
              setScreen('localgame');
            }}
          />
        )}

        {screen === 'localgame' && localConfig && (
          localConfig.sharedBoard ? (
            <LocalCoopGame
              config={localConfig}
              onBack={() => setScreen('localsetup')}
              landscapeMode={landscapeMode}
            />
          ) : (
            <LocalGame
              config={localConfig}
              onBack={() => setScreen('localsetup')}
              landscapeMode={landscapeMode}
            />
          )
        )}

        {screen === 'room' && room && <RoomView room={room} you={playerId} onLeave={() => setScreen('lobby')} />}

        {screen === 'game' && match && (
          <Game
            key={`${match.seed}-${resume ? `r${resume.frame}` : 'fresh'}`}
            match={match}
            resume={resume}
            you={playerId}
            onLeave={() => setScreen('room')}
            onQuit={() => {
              socket.emit('room_leave', {});
              setScreen('lobby');
            }}
            landscapeMode={landscapeMode}
<<<<<<< HEAD
=======
            onToggleLandscape={toggleLandscape}
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
          />
        )}

        {screen === 'results' && (
          <Results
            results={results}
            you={playerId}
            onBack={() => setScreen(room ? 'room' : 'lobby')}
          />
        )}

        {screen === 'mcedit' && (
          <MobileControlsEditor onExit={() => setScreen('lobby')} />
        )}
      </main>
    </div>
  );
}