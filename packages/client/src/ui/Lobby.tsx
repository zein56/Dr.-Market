import { useEffect, useState } from 'react';
import type { RoomPublic } from '@pill/protocol';
import { socket } from '../net/socket';
import { sfx } from '../game/audio';
import ThemePicker from './ThemePicker';

export default function Lobby({
  rooms,
  onFlash,
  onLocalGame,
  landscapeMode,
  onEditMobileControls,
}: {
  rooms: RoomPublic[];
  onFlash: (m: string) => void;
  onLocalGame: () => void;
  landscapeMode?: boolean;
  onEditMobileControls?: () => void;
}) {
  const [code, setCode] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  useEffect(() => {
    socket.emit('room_list', {});
    const t = setInterval(() => socket.emit('room_list', {}), 5000);
    return () => clearInterval(t);
  }, []);

  const join = (c: string) => {
    if (!c.trim()) return;
    sfx('click');
    socket.emit('room_join', { code: c.trim().toUpperCase() });
  };

  const create = () => {
    sfx('click');
    socket.emit('room_create', {
      name: roomName.trim(),
      config: {}, // defaults are on the server
    });
  };

  return (
    <div className="lobby">
      <ThemePicker />
      <div className="lobby-actions">
        <div className="join-box">
          <input
            className="text-input code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && join(code)}
            placeholder="Oda kodu"
            maxLength={5}
          />
          <button className="btn" onClick={() => join(code)} disabled={!code.trim()}>
            Odaya katıl
          </button>
        </div>
        <button className="btn primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Vazgeç' : 'Oda kur'}
        </button>
        {!isTouch && (
          <button className="btn local-2p-btn" onClick={onLocalGame}>
            🎮 Yerel 2P
          </button>
        )}

        {isTouch && onEditMobileControls && (
          <button className="btn outline" onClick={onEditMobileControls}>
            🕹️ Butonları Yerleştir
          </button>
        )}
      </div>

      {showCreate && (
        <div className="panel create-panel">
          <label className="field">
            <span>Oda adı</span>
            <input
              className="text-input"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Akşam turnuvası"
              maxLength={40}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
          </label>
          <button className="btn primary wide" onClick={create}>
            Odayı aç
          </button>
        </div>
      )}

      <h2 className="section-head">Açık odalar</h2>
      {rooms.length === 0 ? (
        <div className="empty">
          Şu an açık oda yok. Bir tane kur, kodu arkadaşlarına yolla.
        </div>
      ) : (
        <ul className="room-list">
          {rooms.map((r) => (
            <li key={r.code} className="room-row">
              <div className="room-meta">
                <span className="room-name">
                  {r.name}{' '}
                  {/* {(r.config.diagMatches || r.config.aoeEnabled || r.config.normalAttackEnabled || r.config.stoneAttackEnabled || r.config.lockAttackEnabled || r.config.missPenaltyEnabled || r.config.bombEnabled) && (
                    <span className="hard-badge">
                      {[
                        r.config.diagMatches && '🔀', 
                        r.config.aoeEnabled && '💥', 
                        (r.config.normalAttackEnabled || r.config.stoneAttackEnabled || r.config.lockAttackEnabled) && '⚔️', 
                        r.config.missPenaltyEnabled && '⚠️',
                        r.config.bombEnabled && '💣',
                      ].filter(Boolean).join(' ')}
                    </span>
                  )} */}
                </span>
                <span className="room-sub">
                  {r.code} · seviye {r.config.level} ·{' '}
                  {r.config.speed === 'low' ? 'yavaş' : r.config.speed === 'med' ? 'orta' : 'hızlı'}
                </span>
              </div>
              <div className="room-right">
                <span className="count">
                  {r.playerCount}/{r.config.maxPlayers}
                </span>
                <button
                  className="btn small"
                  onClick={() => join(r.code)}
                  disabled={r.state === 'playing' || r.playerCount >= r.config.maxPlayers}
                >
                  {r.state === 'playing' ? 'Maçta' : 'Katıl'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
