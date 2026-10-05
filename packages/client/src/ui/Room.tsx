import { useEffect, useRef, useState } from 'react';
import type { RoomPublic, SpeedSetting } from '@pill/protocol';
import { socket } from '../net/socket';
import { sfx } from '../game/audio';

interface ChatMsg {
  id: string;
  name: string;
  text: string;
  at: number;
}

export default function RoomView({
  room,
  you,
  onLeave,
}: {
  room: RoomPublic;
  you: string;
  onLeave: () => void;
}) {
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const [botDiff, setBotDiff] = useState<'easy' | 'med' | 'hard'>('med');
  const listRef = useRef<HTMLDivElement>(null);

  const me = room.players.find((p) => p.id === you);
  const isHost = room.hostId === you;
  const readyCount = room.players.filter((p) => p.ready).length;
  const cfg = room.config;

  useEffect(() => {
    const onChat = (m: ChatMsg) => setChat((c) => [...c.slice(-49), m]);
    socket.on('chat', onChat);
    return () => { socket.off('chat', onChat); };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [chat]);

  const toggleReady = () => { sfx('click'); socket.emit('ready', { ready: !me?.ready }); };
  const start = () => { sfx('click'); socket.emit('start', {}); };
  const leave = () => { sfx('click'); socket.emit('room_leave', {}); onLeave(); };
  const send = () => {
    const t = draft.trim();
    if (!t) return;
    socket.emit('chat', { text: t });
    setDraft('');
  };
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(room.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  // Config güncelleme helper — sadece host
  const updateCfg = (patch: Record<string, unknown>) => {
    if (!isHost) return;
    socket.emit('room_config_update', { config: patch });
  };

  return (
    <div className="room">
      {/* Başlık */}
      <div className="room-head">
        <div>
          <h2 className="room-title">{room.name}</h2>
          <button className="code-chip" onClick={copyCode}>
            {room.code}
            <span className="code-hint">{copied ? 'kopyalandı' : 'kopyala'}</span>
          </button>
        </div>
        <button className="btn ghost" onClick={leave}>Odadan çık</button>
      </div>

      <div className="room-body">
        {/* SOL: Oyuncular + Kontroller */}
        <div className="panel players-panel">
          <div className="panel-head">
            <span>Oyuncular</span>
            <span className="muted">{readyCount}/{room.players.length} hazır</span>
          </div>
          <ul className="player-list">
            {room.players.map((p) => (
              <li key={p.id} className={`player-row ${p.ready ? 'ready' : ''}`}>
                <span className="dot" />
                <span className="pname">
                  {p.name}
                  {p.id === room.hostId && <em className="tag">kurucu</em>}
                  {p.id === you && <em className="tag you">sen</em>}
                </span>
                <span className="pstate">{p.ready ? 'hazır' : 'bekliyor'}</span>
              </li>
            ))}
          </ul>

          <div className="room-controls">
            <button className={`btn ${me?.ready ? '' : 'primary'} wide`} onClick={toggleReady}>
              {me?.ready ? 'Hazırım iptal' : 'Hazırım'}
            </button>
            {isHost && (
              <>
                <button className="btn primary wide" onClick={start} disabled={room.players.length < 1}>
                  Maçı başlat
                </button>
                <div className="bot-add-row">
                  <span style={{ fontSize: 12, color: 'var(--ink-dim)', flexShrink: 0 }}>🤖 Bot:</span>
                  <div className="seg" style={{ flex: 1 }}>
                    {(['easy', 'med', 'hard'] as const).map(d => (
                      <button key={d} className={`seg-btn ${botDiff === d ? 'active' : ''}`}
                        onClick={() => setBotDiff(d)} style={{ fontSize: 11 }}>
                        {d === 'easy' ? 'Kolay' : d === 'med' ? 'Orta' : 'Zor'}
                      </button>
                    ))}
                  </div>
                  <button className="btn small" onClick={() => { sfx('click'); socket.emit('add_bot', { difficulty: botDiff }); }}>＋</button>
                  <button className="btn small ghost" onClick={() => { sfx('click'); socket.emit('remove_bot'); }}>－</button>
                </div>
              </>
            )}
            {!isHost && <p className="muted center">Kurucunun başlatmasını bekle.</p>}
          </div>
        </div>

        {/* ORTA: Ayarlar */}
        <div className="panel settings-panel">
          <div className="panel-head">
            Oda Ayarları
            {!isHost && <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>(sadece kurucu değiştirebilir)</span>}
          </div>

          <div className="settings-scroll">
            {/* Seviye */}
            <label className="field">
              <span>Seviye: {cfg.level} ({(cfg.level + 1) * 4} virüs)</span>
              <input type="range" min={0} max={20} value={cfg.level} disabled={!isHost}
                onChange={e => updateCfg({ level: Number(e.target.value) })} />
            </label>

            {/* Renk */}
            <label className="field">
              <span>Renk sayısı: {cfg.colors}</span>
              <input type="range" min={3} max={10} value={cfg.colors} disabled={!isHost}
                onChange={e => updateCfg({ colors: Number(e.target.value) })} />
            </label>

            {/* Hız */}
            <div className="field">
              <span>Hız</span>
              <div className="seg">
                {(['low', 'med', 'hi'] as SpeedSetting[]).map(s => (
                  <button key={s} className={`seg-btn ${cfg.speed === s ? 'active' : ''}`}
                    onClick={() => updateCfg({ speed: s })} disabled={!isHost}>
                    {s === 'low' ? 'Yavaş' : s === 'med' ? 'Orta' : 'Hızlı'}
                  </button>
                ))}
              </div>
            </div>

            {/* Çapraz */}
            <label className="field checkbox-field">
              <input type="checkbox" checked={!!cfg.diagMatches} disabled={!isHost}
                onChange={e => updateCfg({ diagMatches: e.target.checked })} />
              <div><strong>🔀 Çapraz Eşleşmeler</strong><p className="hint">Köşegen diziler de patlama tetikler</p></div>
            </label>

            {/* Bomba */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
              <label className="field checkbox-field" style={{ margin: 0 }}>
                <input type="checkbox" checked={!!cfg.bombEnabled} disabled={!isHost}
                  onChange={e => updateCfg({ bombEnabled: e.target.checked })} />
                <div><strong>💣 Bomba</strong><p className="hint">Eşleşmelerle bomba kazan, büyük patlama yap</p></div>
              </label>
              {cfg.bombEnabled && (
                <label className="field" style={{ marginLeft: 24, marginTop: 6 }}>
                  <span>Bomba eşiği: {cfg.bombThreshold}'li eşleşme</span>
                  <input type="range" min={4} max={8} value={cfg.bombThreshold ?? 5} disabled={!isHost}
                    onChange={e => updateCfg({ bombThreshold: Number(e.target.value) })} />
                </label>
              )}
            </div>

            {/* AoE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
              <label className="field checkbox-field" style={{ margin: 0 }}>
                <input type="checkbox" checked={!!cfg.aoeEnabled} disabled={!isHost}
                  onChange={e => updateCfg({ aoeEnabled: e.target.checked })} />
                <div><strong>💥 AoE Patlatma</strong><p className="hint">Uzun eşleşmeler çevredeki taşları da patlatır</p></div>
              </label>
              {cfg.aoeEnabled && (
                <label className="field" style={{ marginLeft: 24, marginTop: 6 }}>
                  <span>Patlama eşiği: {cfg.aoeThreshold}'li eşleşme</span>
                  <input type="range" min={5} max={8} value={cfg.aoeThreshold ?? 5} disabled={!isHost}
                    onChange={e => updateCfg({ aoeThreshold: Number(e.target.value) })} />
                </label>
              )}
            </div>

            {/* Karşı Saldırı */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
              <label className="field checkbox-field" style={{ margin: 0 }}>
                <input type="checkbox" checked={cfg.counterEnabled !== false} disabled={!isHost}
                  onChange={e => updateCfg({ counterEnabled: e.target.checked })} />
                <div><strong>🛡️ Karşı Saldırı</strong><p className="hint">Combo yaparak sırada bekleyen gelen çöpü iptal edebilirsin</p></div>
              </label>
            </div>

            {/* Güçlendiriciler */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
              <label className="field checkbox-field" style={{ margin: 0 }}>
                <input type="checkbox" checked={cfg.powerupsEnabled !== false} disabled={!isHost}
                  onChange={e => updateCfg({ powerupsEnabled: e.target.checked })} />
                <div>
                  <strong>⚡ Güçlendiriciler</strong>
                  <p className="hint">Ara sıra özel kapsüller düşer: ⚡ Yıldırım (rakibe 4 çöp), 🛡️ Kalkan (bir saldırıyı emer), 🌈 Joker (en iyi renge dönüşür), ✨ Temizlik (taşları ve kilitleri siler)</p>
                </div>
              </label>
              {cfg.powerupsEnabled !== false && (
                <div style={{ marginLeft: 20 }}>
                  <label className="field" style={{ margin: 0 }}>
                    <span>Sıklık: {cfg.powerupFreq ?? 5} / 10</span>
                    <input type="range" min={1} max={10} value={cfg.powerupFreq ?? 5} disabled={!isHost}
                      onChange={e => updateCfg({ powerupFreq: Number(e.target.value) })} />
                  </label>
                  <p className="hint" style={{ margin: '2px 0 0' }}>1 = en seyrek, 10 = en sık (yine rastgele düşer)</p>
                </div>
              )}
            </div>

            {/* Hata Cezası */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
              <label className="field checkbox-field" style={{ margin: 0 }}>
                <input type="checkbox" checked={!!cfg.missPenaltyEnabled} disabled={!isHost}
                  onChange={e => updateCfg({ missPenaltyEnabled: e.target.checked })} />
                <div><strong>⚠️ Hata Cezası</strong><p className="hint">Arka arkaya eşleşmesiz kapsülde yeni virüs doğar</p></div>
              </label>
              {cfg.missPenaltyEnabled && (
                <label className="field" style={{ marginLeft: 24, marginTop: 6 }}>
                  <span>Ceza eşiği: {cfg.missPenaltyThreshold} hata</span>
                  <input type="range" min={3} max={10} value={cfg.missPenaltyThreshold ?? 3} disabled={!isHost}
                    onChange={e => updateCfg({ missPenaltyThreshold: Number(e.target.value) })} />
                </label>
              )}
            </div>

            {/* Gelişmiş Saldırı */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
              <strong>⚔️ Gelişmiş Saldırı</strong>

              <label className="field checkbox-field" style={{ margin: 0 }}>
                <input type="checkbox" checked={!!cfg.normalAttackEnabled} disabled={!isHost}
                  onChange={e => updateCfg({ normalAttackEnabled: e.target.checked })} />
                <div>Normal Çöp</div>
              </label>
              {cfg.normalAttackEnabled && (
                <div style={{ marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="field" style={{ margin: 0 }}>
                    <span>Eşik: {cfg.normalAttackLen}'li eşleşme</span>
                    <input type="range" min={4} max={8} value={cfg.normalAttackLen ?? 4} disabled={!isHost}
                      onChange={e => updateCfg({ normalAttackLen: Number(e.target.value) })} />
                  </label>
                  <label className="field checkbox-field" style={{ margin: 0 }}>
                    <input type="checkbox" checked={!!cfg.normalAttackRequireCombo} disabled={!isHost}
                      onChange={e => updateCfg({ normalAttackRequireCombo: e.target.checked })} />
                    <span style={{ fontSize: 12 }}>Kombo zorunlu</span>
                  </label>
                </div>
              )}

              <label className="field checkbox-field" style={{ margin: 0 }}>
                <input type="checkbox" checked={!!cfg.stoneAttackEnabled} disabled={!isHost}
                  onChange={e => updateCfg({ stoneAttackEnabled: e.target.checked })} />
                <div>Taş Gönderimi</div>
              </label>
              {cfg.stoneAttackEnabled && (
                <div style={{ marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="field" style={{ margin: 0 }}>
                    <span>Eşik: {cfg.stoneAttackLen}'li eşleşme</span>
                    <input type="range" min={4} max={8} value={cfg.stoneAttackLen ?? 5} disabled={!isHost}
                      onChange={e => updateCfg({ stoneAttackLen: Number(e.target.value) })} />
                  </label>
                  <label className="field checkbox-field" style={{ margin: 0 }}>
                    <input type="checkbox" checked={!!cfg.stoneAttackRequireCombo} disabled={!isHost}
                      onChange={e => updateCfg({ stoneAttackRequireCombo: e.target.checked })} />
                    <span style={{ fontSize: 12 }}>Kombo zorunlu</span>
                  </label>
                </div>
              )}

              <label className="field checkbox-field" style={{ margin: 0 }}>
                <input type="checkbox" checked={!!cfg.lockAttackEnabled} disabled={!isHost}
                  onChange={e => updateCfg({ lockAttackEnabled: e.target.checked })} />
                <div>Kilit Gönderimi</div>
              </label>
              {cfg.lockAttackEnabled && (
                <div style={{ marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="field" style={{ margin: 0 }}>
                    <span>Eşik: {cfg.lockAttackLen}'li eşleşme</span>
                    <input type="range" min={4} max={8} value={cfg.lockAttackLen ?? 6} disabled={!isHost}
                      onChange={e => updateCfg({ lockAttackLen: Number(e.target.value) })} />
                  </label>
                  <label className="field checkbox-field" style={{ margin: 0 }}>
                    <input type="checkbox" checked={!!cfg.lockAttackRequireCombo} disabled={!isHost}
                      onChange={e => updateCfg({ lockAttackRequireCombo: e.target.checked })} />
                    <span style={{ fontSize: 12 }}>Kombo zorunlu</span>
                  </label>
                  <label className="field checkbox-field" style={{ margin: 0 }}>
                    <input type="checkbox" checked={!!cfg.lockStacking} disabled={!isHost}
                      onChange={e => updateCfg({ lockStacking: e.target.checked })} />
                    <span style={{ fontSize: 12 }}>Kilitler üst üste eklensin <span className="hint">(kapalıyken zaten kilitli virüse gelen kilit onu açar)</span></span>
                  </label>
                  {cfg.lockStacking && (
                    <label className="field" style={{ margin: 0 }}>
                      <span>Üst üste en fazla: {cfg.lockMaxStack ?? 3} kilit</span>
                      <input type="range" min={2} max={10} value={cfg.lockMaxStack ?? 3} disabled={!isHost}
                        onChange={e => updateCfg({ lockMaxStack: Number(e.target.value) })} />
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SAĞ: Sohbet */}
        <div className="panel chat-panel">
          <div className="panel-head">Sohbet</div>
          <div className="chat-list" ref={listRef}>
            {chat.length === 0 && <p className="muted">Henüz mesaj yok.</p>}
            {chat.map((m, i) => (
              <p key={i} className="chat-msg">
                <b className={m.id === you ? 'me' : ''}>{m.name}</b> {m.text}
              </p>
            ))}
          </div>
          <div className="chat-input">
            <input className="text-input" value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Mesaj yaz" maxLength={200} />
            <button className="btn small" onClick={send}>Gönder</button>
          </div>
        </div>
      </div>
    </div>
  );
}
