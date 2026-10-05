import { useState, useEffect } from 'react';
import { sfx } from '../game/audio';
<<<<<<< HEAD
import ThemePicker from './ThemePicker';
import { MAX_VS_PLAYERS, MAX_COOP_PLAYERS, defaultPlayerName, type ExtraPlayer } from './localPlayers';
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
import { getAllConnectedGamepads, manuallyAssignGamepad, getAssignedGamepadIndex } from '../game/gamepad';
import type { BotDifficulty } from '../game/bot';

type Speed = 'low' | 'med' | 'hi';

export interface LocalConfig {
  level: number;
  speed: Speed;
  p1Name: string;
  p2Name: string;
  p2IsBot: boolean;
  botDifficulty: BotDifficulty;
  p3Enabled: boolean;
  p3Name: string;
  p3IsBot: boolean;
  p3BotDifficulty: BotDifficulty;
  diagMatches: boolean;

  aoeEnabled: boolean;
  aoeThreshold: number;

<<<<<<< HEAD
  counterEnabled: boolean;
  powerupsEnabled: boolean;
  powerupFreq: number;

=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  missPenaltyEnabled: boolean;
  missPenaltyThreshold: number;

  normalAttackEnabled: boolean;
  normalAttackLen: number;
  normalAttackRequireCombo: boolean;

  stoneAttackEnabled: boolean;
  stoneAttackLen: number;
  stoneAttackRequireCombo: boolean;

  lockAttackEnabled: boolean;
  lockAttackLen: number;
  lockAttackRequireCombo: boolean;
<<<<<<< HEAD
  lockStacking: boolean;
  lockMaxStack: number;
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

  bombEnabled: boolean;
  bombThreshold: number;

  colors: number;
  attackMode: 'random' | 'all';
  sharedBoard: boolean;
<<<<<<< HEAD
  /** 4. oyuncu ve sonrası (3. oyuncu açıkken): bot ya da gamepadli insan */
  extraPlayers: ExtraPlayer[];
  /** Ortak tahta: kapsüller havada birbirinden geçebilsin */
  coopPassThrough: boolean;
  /** Ortak tahta: yükselen taban (sonsuz mod) */
  risingEnabled: boolean;
  /** Yükselme hızı 1 (yavaş) .. 10 (hızlı) */
  riseSpeed: number;
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  boardCols?: number;
  boardRows?: number;
}

const LOCAL_STORAGE_KEY = 'pill-arena-local-config';

function loadSavedConfig() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { }
  return {};
}

export default function LocalSetup({ onStart }: { onStart: (cfg: LocalConfig) => void }) {
  const saved = loadSavedConfig();

  const [p1Name, setP1Name] = useState(saved.p1Name ?? 'Oyuncu 1');
  const [p2Name, setP2Name] = useState(saved.p2Name ?? 'Oyuncu 2');
  const [p3Name, setP3Name] = useState(saved.p3Name ?? 'Oyuncu 3');
  const [level, setLevel] = useState(saved.level ?? 5);
  const [speed, setSpeed] = useState<Speed>(saved.speed ?? 'med');
  const [p2IsBot, setP2IsBot] = useState(saved.p2IsBot ?? false);
  const [p3Enabled, setP3Enabled] = useState(saved.p3Enabled ?? false);
  const [p3IsBot, setP3IsBot] = useState(saved.p3IsBot ?? true);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>(saved.botDifficulty ?? 'med');
  const [p3BotDifficulty, setP3BotDifficulty] = useState<BotDifficulty>(saved.p3BotDifficulty ?? 'med');
  const [diagMatches, setDiagMatches] = useState(saved.diagMatches ?? false);

  const [bombEnabled, setBombEnabled] = useState(saved.bombEnabled ?? false);
  const [bombThreshold, setBombThreshold] = useState(saved.bombThreshold ?? 5);

  const [aoeEnabled, setAoeEnabled] = useState(saved.aoeEnabled ?? false);
  const [aoeThreshold, setAoeThreshold] = useState(saved.aoeThreshold ?? 5);

  const [sharedBoard, setSharedBoard] = useState(saved.sharedBoard ?? false);
<<<<<<< HEAD
  const [extraPlayers, setExtraPlayers] = useState<ExtraPlayer[]>(Array.isArray(saved.extraPlayers) ? saved.extraPlayers : []);
  const [coopPassThrough, setCoopPassThrough] = useState(saved.coopPassThrough ?? false);
  const [risingEnabled, setRisingEnabled] = useState(saved.risingEnabled ?? false);
  const [riseSpeed, setRiseSpeed] = useState(saved.riseSpeed ?? 5);

  const [missPenaltyEnabled, setMissPenaltyEnabled] = useState(saved.missPenaltyEnabled ?? false);
  const [counterEnabled, setCounterEnabled] = useState(saved.counterEnabled ?? true);
  const [powerupsEnabled, setPowerupsEnabled] = useState(saved.powerupsEnabled ?? true);
  const [powerupFreq, setPowerupFreq] = useState(saved.powerupFreq ?? 5);
=======

  const [missPenaltyEnabled, setMissPenaltyEnabled] = useState(saved.missPenaltyEnabled ?? false);
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  const [missPenaltyThreshold, setMissPenaltyThreshold] = useState(saved.missPenaltyThreshold ?? 3);

  const [normalAttackEnabled, setNormalAttackEnabled] = useState(saved.normalAttackEnabled ?? false);
  const [normalAttackLen, setNormalAttackLen] = useState(saved.normalAttackLen ?? 4);
  const [normalAttackRequireCombo, setNormalAttackRequireCombo] = useState(saved.normalAttackRequireCombo ?? true);

  const [stoneAttackEnabled, setStoneAttackEnabled] = useState(saved.stoneAttackEnabled ?? false);
  const [stoneAttackLen, setStoneAttackLen] = useState(saved.stoneAttackLen ?? 5);
  const [stoneAttackRequireCombo, setStoneAttackRequireCombo] = useState(saved.stoneAttackRequireCombo ?? true);

  const [lockAttackEnabled, setLockAttackEnabled] = useState(saved.lockAttackEnabled ?? false);
  const [lockAttackLen, setLockAttackLen] = useState(saved.lockAttackLen ?? 6);
  const [lockAttackRequireCombo, setLockAttackRequireCombo] = useState(saved.lockAttackRequireCombo ?? true);
<<<<<<< HEAD
  const [lockStacking, setLockStacking] = useState(saved.lockStacking ?? false);
  const [lockMaxStack, setLockMaxStack] = useState(saved.lockMaxStack ?? 3);
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

  const [colors, setColors] = useState(saved.colors ?? 3);
  const [attackMode, setAttackMode] = useState<'random' | 'all'>(saved.attackMode ?? 'random');

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
      p1Name, p2Name, p3Name, level, speed, p2IsBot, p3Enabled, p3IsBot, botDifficulty, p3BotDifficulty,
<<<<<<< HEAD
      counterEnabled, powerupsEnabled, powerupFreq, diagMatches, bombEnabled, bombThreshold, aoeEnabled, aoeThreshold, missPenaltyEnabled, missPenaltyThreshold,
      normalAttackEnabled, normalAttackLen, normalAttackRequireCombo,
      stoneAttackEnabled, stoneAttackLen, stoneAttackRequireCombo,
      lockAttackEnabled, lockAttackLen, lockAttackRequireCombo, lockStacking, lockMaxStack,
      colors, attackMode, extraPlayers, coopPassThrough, risingEnabled, riseSpeed
    }));
  }, [
    p1Name, p2Name, p3Name, level, speed, p2IsBot, p3Enabled, p3IsBot, botDifficulty, p3BotDifficulty,
    counterEnabled, powerupsEnabled, powerupFreq, diagMatches, bombEnabled, bombThreshold, aoeEnabled, aoeThreshold, missPenaltyEnabled, missPenaltyThreshold,
    normalAttackEnabled, normalAttackLen, normalAttackRequireCombo,
    stoneAttackEnabled, stoneAttackLen, stoneAttackRequireCombo,
    lockAttackEnabled, lockAttackLen, lockAttackRequireCombo, lockStacking, lockMaxStack,
    colors, attackMode, extraPlayers, coopPassThrough, risingEnabled, riseSpeed
=======
      diagMatches, bombEnabled, bombThreshold, aoeEnabled, aoeThreshold, missPenaltyEnabled, missPenaltyThreshold,
      normalAttackEnabled, normalAttackLen, normalAttackRequireCombo,
      stoneAttackEnabled, stoneAttackLen, stoneAttackRequireCombo,
      lockAttackEnabled, lockAttackLen, lockAttackRequireCombo,
      colors, attackMode
    }));
  }, [
    p1Name, p2Name, p3Name, level, speed, p2IsBot, p3Enabled, p3IsBot, botDifficulty, p3BotDifficulty,
    diagMatches, bombEnabled, bombThreshold, aoeEnabled, aoeThreshold, missPenaltyEnabled, missPenaltyThreshold,
    normalAttackEnabled, normalAttackLen, normalAttackRequireCombo,
    stoneAttackEnabled, stoneAttackLen, stoneAttackRequireCombo,
    lockAttackEnabled, lockAttackLen, lockAttackRequireCombo,
    colors, attackMode
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  ]);
  const [showModal, setShowModal] = useState(false);
  const [allGamepads, setAllGamepads] = useState<Gamepad[]>([]);
  const [p1GpIdx, setP1GpIdx] = useState<number | null>(null);
  const [p2GpIdx, setP2GpIdx] = useState<number | null>(null);
  const [p3GpIdx, setP3GpIdx] = useState<number | null>(null);

  const [boardCols, setBoardCols] = useState(8);
  const [boardRows, setBoardRows] = useState(16);

  useEffect(() => {
    if (!showModal) return;
    let raf = 0;
    const loop = () => {
      setAllGamepads(getAllConnectedGamepads());
      setP1GpIdx(getAssignedGamepadIndex(0));
      setP2GpIdx(getAssignedGamepadIndex(1));
      setP3GpIdx(getAssignedGamepadIndex(2));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [showModal]);

  const handleAssign = (playerIndex: number, val: string) => {
    manuallyAssignGamepad(playerIndex, val === 'keyboard' ? null : Number(val));
  };

  const start = () => {
    sfx('click');
    onStart({
      level,
      speed,
      p1Name: p1Name.trim() || 'Oyuncu 1',
      p2Name: p2IsBot ? `🤖 Bot (${botDifficulty === 'easy' ? 'Kolay' : botDifficulty === 'med' ? 'Orta' : 'Zor'})` : (p2Name.trim() || 'Oyuncu 2'),
      p2IsBot,
      botDifficulty,
      p3Enabled,
      p3Name: p3IsBot ? `🤖 Bot (${p3BotDifficulty === 'easy' ? 'Kolay' : p3BotDifficulty === 'med' ? 'Orta' : 'Zor'})` : (p3Name.trim() || 'Oyuncu 3'),
      p3IsBot,
      p3BotDifficulty,
<<<<<<< HEAD
      counterEnabled,
      powerupsEnabled,
      powerupFreq,
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
      diagMatches,
      bombEnabled, bombThreshold,
      aoeEnabled, aoeThreshold,
      missPenaltyEnabled, missPenaltyThreshold,
      normalAttackEnabled, normalAttackLen, normalAttackRequireCombo,
      stoneAttackEnabled, stoneAttackLen, stoneAttackRequireCombo,
<<<<<<< HEAD
      lockAttackEnabled, lockAttackLen, lockAttackRequireCombo, lockStacking, lockMaxStack,
      colors,
      attackMode,
      sharedBoard,
      extraPlayers,
      coopPassThrough,
      risingEnabled,
      riseSpeed,
=======
      lockAttackEnabled, lockAttackLen, lockAttackRequireCombo,
      colors,
      attackMode,
      sharedBoard,
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
      boardCols,
      boardRows,
    });
  };

<<<<<<< HEAD
  const maxPlayers = sharedBoard ? MAX_COOP_PLAYERS : MAX_VS_PLAYERS;
  const rawTotal = p3Enabled ? 3 + extraPlayers.length : 2;
  const playerTotal = Math.min(rawTotal, maxPlayers);
  const updateExtra = (i: number, patch: Partial<ExtraPlayer>) =>
    setExtraPlayers(list => list.map((e, k) => (k === i ? { ...e, ...patch } : e)));

  return (
    <div className="local-setup">
      <h1 className="local-setup-title">Yerel Çok Oyunculu</h1>
      <ThemePicker />
      <p className="local-setup-sub">
        Tek cihazda {MAX_VS_PLAYERS} oyuncuya kadar (insan ve bot) oynayın.<br />
=======
  return (
    <div className="local-setup">
      <h1 className="local-setup-title">Yerel 2 Oyuncu</h1>
      <p className="local-setup-sub">
        Tek cihazda iki kişi veya bir bot ile oynayın.<br />
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
        4'lü zincir yaptığınızda rakibinize çöp kapsülü gönderirsiniz.
      </p>

      <div className="local-players">
        {/* P1 */}
        <div className="panel local-player-card p1-card">
          <div className="local-player-icon">🎮</div>
          <label className="field">
            <span>1. Oyuncu adı</span>
            <input
              className="text-input"
              value={p1Name}
              onChange={e => setP1Name(e.target.value)}
              maxLength={12}
              placeholder="Oyuncu 1"
            />
          </label>
          <div className="local-keys">
            <span className="key-badge">A / D</span> hareket&nbsp;
            <span className="key-badge">S</span> hızlı&nbsp;
            <span className="key-badge">Z</span> ↺&nbsp;
            <span className="key-badge">X</span> ↻&nbsp;
            <span className="key-badge">Boşluk</span> bırak
          </div>
          <p className="local-gp-note">veya <strong>Gamepad 1</strong></p>
        </div>

        <div className="local-vs-big">VS</div>

        {/* P2 / Bot */}
        <div className="panel local-player-card p2-card">
          {/* Bot toggle */}
          <div className="bot-toggle">
            <button
              className={`seg-btn ${!p2IsBot ? 'active' : ''}`}
              onClick={() => setP2IsBot(false)}
            >
              👤 Oyuncu
            </button>
            <button
              className={`seg-btn ${p2IsBot ? 'active' : ''}`}
              onClick={() => setP2IsBot(true)}
            >
              🤖 Bot
            </button>
          </div>

          {p2IsBot ? (
            <>
              <div className="local-player-icon">🤖</div>
              <div className="field">
                <span>Bot zorluk seviyesi</span>
                <div className="seg">
                  {(['easy', 'med', 'hard'] as BotDifficulty[]).map(d => (
                    <button
                      key={d}
                      className={`seg-btn ${botDifficulty === d ? 'active' : ''}`}
                      onClick={() => setBotDifficulty(d)}
                    >
                      {d === 'easy' ? 'Kolay' : d === 'med' ? 'Orta' : 'Zor'}
                    </button>
                  ))}
                </div>
              </div>
              <p className="local-gp-note bot-desc">
                {botDifficulty === 'easy' && 'Hatalar yapar, yavaş düşünür.'}
                {botDifficulty === 'med' && 'Akıllıca oynar, dengeli.'}
                {botDifficulty === 'hard' && 'İleriye bakar, neredeyse mükemmel.'}
              </p>
            </>
          ) : (
            <>
              <div className="local-player-icon">🕹️</div>
              <label className="field">
                <span>2. Oyuncu adı</span>
                <input
                  className="text-input"
                  value={p2Name}
                  onChange={e => setP2Name(e.target.value)}
                  maxLength={12}
                  placeholder="Oyuncu 2"
                />
              </label>
              <div className="local-keys">
                <span className="key-badge">← →</span> hareket&nbsp;
                <span className="key-badge">↓</span> hızlı&nbsp;
                <span className="key-badge">,</span> ↺&nbsp;
                <span className="key-badge">.</span> ↻&nbsp;
                <span className="key-badge">Enter</span> bırak
              </div>
              <p className="local-gp-note">veya <strong>Gamepad 2</strong></p>
            </>
          )}
        </div>

        {p3Enabled ? (
          <>
            <div className="local-vs-big">VS</div>
            {/* P3 / Bot */}
            <div className="panel local-player-card p3-card">
              <div className="bot-toggle" style={{ marginBottom: '8px' }}>
                <button
                  className={`seg-btn ${!p3IsBot ? 'active' : ''}`}
                  onClick={() => setP3IsBot(false)}
                >
                  👤 Oyuncu
                </button>
                <button
                  className={`seg-btn ${p3IsBot ? 'active' : ''}`}
                  onClick={() => setP3IsBot(true)}
                >
                  🤖 Bot
                </button>
              </div>

              {p3IsBot ? (
                <>
                  <div className="local-player-icon">🤖</div>
                  <div className="field">
                    <span>Bot zorluk seviyesi</span>
                    <div className="seg">
                      {(['easy', 'med', 'hard'] as BotDifficulty[]).map(d => (
                        <button
                          key={d}
                          className={`seg-btn ${p3BotDifficulty === d ? 'active' : ''}`}
                          onClick={() => setP3BotDifficulty(d)}
                        >
                          {d === 'easy' ? 'Kolay' : d === 'med' ? 'Orta' : 'Zor'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="local-gp-note bot-desc">
                    {p3BotDifficulty === 'easy' && 'Hatalar yapar, yavaş düşünür.'}
                    {p3BotDifficulty === 'med' && 'Akıllıca oynar, dengeli.'}
                    {p3BotDifficulty === 'hard' && 'İleriye bakar, neredeyse mükemmel.'}
                  </p>
                </>
              ) : (
                <>
                  <div className="local-player-icon">🕹️</div>
                  <label className="field">
                    <span>3. Oyuncu adı</span>
                    <input
                      className="text-input"
                      value={p3Name}
                      onChange={e => setP3Name(e.target.value)}
                      maxLength={12}
                      placeholder="Oyuncu 3"
                    />
                  </label>
                  <div className="local-keys">
                    <span className="key-badge">Numpad 4 / 6</span> hareket&nbsp;
                    <span className="key-badge">5 / 2</span> hızlı&nbsp;
                    <span className="key-badge">7</span> ↺&nbsp;
                    <span className="key-badge">9</span> ↻&nbsp;
                    <span className="key-badge">0 / Enter</span> bırak
                  </div>
                  <p className="local-gp-note">veya <strong>Gamepad 3</strong></p>
                </>
              )}

              <button
                className="btn small outline"
                style={{ marginTop: 'auto' }}
                onClick={() => setP3Enabled(false)}
              >
                Kaldır
              </button>
            </div>
          </>
        ) : (
          <div className="panel local-player-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' }}>
            <button className="btn outline" onClick={() => setP3Enabled(true)}>
              + 3. Oyuncuyu Ekle
            </button>
          </div>
        )}
      </div>

<<<<<<< HEAD
      {p3Enabled && (
        <div className="local-extra-players">
          {extraPlayers.map((ex, i) => {
            const idx = 3 + i;
            const excluded = idx >= maxPlayers;
            return (
              <div key={i} className={`panel local-extra-card ${excluded ? 'excluded' : ''}`}>
                <div className="local-extra-head">
                  <strong>Oyuncu {idx + 1}</strong>
                  <button className="btn small outline" onClick={() => setExtraPlayers(l => l.filter((_, k) => k !== i))}>Kaldır</button>
                </div>
                <div className="bot-toggle">
                  <button className={`seg-btn ${!ex.isBot ? 'active' : ''}`} onClick={() => updateExtra(i, { isBot: false })}>🎮 Gamepad</button>
                  <button className={`seg-btn ${ex.isBot ? 'active' : ''}`} onClick={() => updateExtra(i, { isBot: true })}>🤖 Bot</button>
                </div>
                {ex.isBot ? (
                  <div className="seg">
                    {(['easy', 'med', 'hard'] as BotDifficulty[]).map(d => (
                      <button key={d} className={`seg-btn ${ex.difficulty === d ? 'active' : ''}`} onClick={() => updateExtra(i, { difficulty: d })}>
                        {d === 'easy' ? 'Kolay' : d === 'med' ? 'Orta' : 'Zor'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <input
                      className="text-input"
                      value={ex.name}
                      onChange={e => updateExtra(i, { name: e.target.value })}
                      maxLength={12}
                      placeholder={defaultPlayerName(idx)}
                    />
                    <p className="local-gp-note">Klavyesi yok: <strong>Gamepad {idx + 1}</strong> gerekir</p>
                  </>
                )}
                {excluded && <p className="local-gp-note" style={{ color: 'var(--red)' }}>Ortak tahtada en fazla {MAX_COOP_PLAYERS} oyuncu: bu oyuncu dahil edilmez</p>}
              </div>
            );
          })}
          {3 + extraPlayers.length < MAX_VS_PLAYERS && (
            <button
              className="btn outline local-extra-add"
              onClick={() => setExtraPlayers(l => [...l, { name: '', isBot: true, difficulty: 'med' }])}
            >
              + {4 + extraPlayers.length}. Oyuncuyu Ekle
            </button>
          )}
        </div>
      )}

=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
      <div className="panel local-settings">
        <label className="field">
          <span>Başlangıç seviyesi: {level} ({(level + 1) * 4} virüs)</span>
          <input
            type="range"
            min={0}
            max={20}
            value={level}
            onChange={e => setLevel(Number(e.target.value))}
          />
        </label>
        <label className="field">
          <span>Renk Sayısı: {colors}</span>
          <input
            type="range"
            min={3}
            max={10}
            value={colors}
            onChange={e => setColors(Number(e.target.value))}
          />
        </label>
        <div className="field">
          <span>Düşme hızı</span>
          <div className="seg">
            {(['low', 'med', 'hi'] as Speed[]).map(s => (
              <button
                key={s}
                className={`seg-btn ${speed === s ? 'active' : ''}`}
                onClick={() => setSpeed(s)}
              >
                {s === 'low' ? 'Yavaş' : s === 'med' ? 'Orta' : 'Hızlı'}
              </button>
            ))}
          </div>
        </div>

        <label className="field checkbox-field" style={{ background: 'rgba(0,150,255,0.1)', padding: 10, borderRadius: 8 }}>
          <input type="checkbox" checked={sharedBoard} onChange={e => setSharedBoard(e.target.checked)} />
<<<<<<< HEAD
          <div><strong>🤝 Ortak Dev Tahta (Co-op)</strong><p className="hint">Oyuncuların tahtaları birleşir, devasa tek bir alanda yan yana oynanır (en fazla {MAX_COOP_PLAYERS} oyuncu)</p></div>
        </label>

        {sharedBoard && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, background: 'rgba(0,150,255,0.07)', borderRadius: 8 }}>
            <label className="field checkbox-field" style={{ margin: 0 }}>
              <input type="checkbox" checked={coopPassThrough} onChange={e => setCoopPassThrough(e.target.checked)} />
              <div>
                <strong>👻 Kapsüller birbirinden geçebilsin</strong>
                <p className="hint">Havadayken oyuncular birbirine engel olmaz. İkisi aynı yere konarsa üstte kalan kapsül yukarı itilir</p>
              </div>
            </label>
            <label className="field checkbox-field" style={{ margin: 0 }}>
              <input type="checkbox" checked={risingEnabled} onChange={e => setRisingEnabled(e.target.checked)} />
              <div>
                <strong>♾️ Sonsuz Mod (yükselen taban)</strong>
                <p className="hint">Belirli aralıkla tahta bir satır yükselir, altta seviyeyle orantılı yeni virüsler çıkar. Tahta taşarsa oyun biter, virüsleri bitirmekle kazanılmaz</p>
              </div>
            </label>
            {risingEnabled && (
              <div style={{ marginLeft: 24 }}>
                <label className="field" style={{ margin: 0 }}>
                  <span>Yükselme hızı: {riseSpeed} / 10</span>
                  <input type="range" min={1} max={10} value={riseSpeed} onChange={e => setRiseSpeed(Number(e.target.value))} />
                </label>
                <p className="hint" style={{ margin: '2px 0 0' }}>1 = yaklaşık 25 sn'de bir, 10 = yaklaşık 4 sn'de bir</p>
              </div>
            )}
          </div>
        )}

=======
          <div><strong>🤝 Ortak Dev Tahta (Co-op)</strong><p className="hint">Oyuncuların tahtaları birleşir, devasa tek bir alanda yan yana oynanır</p></div>
        </label>

>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
        {/* --- TAHTA ÖNİZLEMESİ VE BOYUT AYARLARI --- */}
        <div className="board-preview-container" style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center', margin: '15px 0', padding: '20px 15px', background: 'rgba(0,0,0,0.3)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--blue)' }}>TAHTA BOYUTLARI VE ÖNİZLEME</div>

          {/* Boyut Inputları */}
          {/* Boyut Inputları */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 5 }}>
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, opacity: 0.9, fontWeight: 'bold' }}>GENİŞLİK (Sütun)</span>
              <input
                type="number" min={4} max={30}
                value={boardCols}
                onChange={e => setBoardCols(Math.max(4, Math.min(30, Number(e.target.value) || 8)))}
                style={{ width: 60, background: '#0D1A22', border: '1px solid #3B6076', color: '#fff', padding: '6px', textAlign: 'center', borderRadius: 4, outline: 'none', cursor: 'text' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, opacity: 0.9, fontWeight: 'bold' }}>UZUNLUK (Satır)</span>
              <input
                type="number" min={8} max={40}
                value={boardRows}
                onChange={e => setBoardRows(Math.max(8, Math.min(40, Number(e.target.value) || 16)))}
                style={{ width: 60, background: '#0D1A22', border: '1px solid #3B6076', color: '#fff', padding: '6px', textAlign: 'center', borderRadius: 4, outline: 'none', cursor: 'text' }}
              />
            </label>
          </div>

          {/* {!sharedBoard && (
            <div style={{ fontSize: 11, color: '#f59e0b', opacity: 0.8, textAlign: 'center', padding: '4px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 6, border: '1px solid rgba(245,158,11,0.2)' }}>
              ⚠️ Boyut ayarı yalnizca <strong>Co-op modunda</strong> geçerlidir. Ayrı board modunda standart 8×16 kullanılır.
            </div>
          )} */}

          {/* Önizleme Kutuları */}
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
<<<<<<< HEAD
            {Array.from({ length: sharedBoard ? 1 : playerTotal }).map((_, i) => {
              const effCols = boardCols;
              const effRows = boardRows;
              const scale = 4;
              const previewWidth = sharedBoard ? effCols * playerTotal * scale : effCols * scale;
=======
            {Array.from({ length: sharedBoard ? 1 : (p3Enabled ? 3 : 2) }).map((_, i) => {
              const effCols = boardCols;
              const effRows = boardRows;
              const scale = 4;
              const previewWidth = sharedBoard ? effCols * (p3Enabled ? 3 : 2) * scale : effCols * scale;
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
              const previewHeight = effRows * scale;

              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 'bold', opacity: 0.8 }}>{sharedBoard ? 'DEV ORTAK TAHTA' : `OYUNCU ${i + 1}`}</div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 10, opacity: 0.5, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{effRows}</span>

                    <div style={{
                      width: previewWidth,
                      height: previewHeight,
                      border: '2px solid #3B6076',
                      background: '#0D1A22',
                      display: 'flex',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                      transition: 'all 0.3s ease'
                    }}>
<<<<<<< HEAD
                      {sharedBoard && Array.from({ length: playerTotal }).map((_, j) => (
                        <div key={j} style={{ flex: 1, borderRight: j < playerTotal - 1 ? '1px dashed rgba(255,255,255,0.2)' : 'none' }} />
=======
                      {sharedBoard && Array.from({ length: p3Enabled ? 3 : 2 }).map((_, j) => (
                        <div key={j} style={{ flex: 1, borderRight: j < (p3Enabled ? 2 : 1) ? '1px dashed rgba(255,255,255,0.2)' : 'none' }} />
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
                      ))}
                    </div>
                  </div>

<<<<<<< HEAD
                  <span style={{ fontSize: 10, opacity: 0.5 }}>{sharedBoard ? effCols * playerTotal : effCols}</span>
=======
                  <span style={{ fontSize: 10, opacity: 0.5 }}>{sharedBoard ? effCols * (p3Enabled ? 3 : 2) : effCols}</span>
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
                </div>
              );
            })}
          </div>
        </div>
        {/* --- TAHTA ÖNİZLEMESİ SONU --- */}

        <div className="field">
          <span>Saldırı Modu</span>
          <div className="seg">
            <button
              className={`seg-btn ${attackMode === 'random' ? 'active' : ''}`}
              onClick={() => setAttackMode('random')}
            >
              🎯 Rastgele Kişi
            </button>
            <button
              className={`seg-btn ${attackMode === 'all' ? 'active' : ''}`}
              onClick={() => setAttackMode('all')}
            >
              💥 Herkese Gönder
            </button>
          </div>
          <p className="hint" style={{ marginTop: 4, opacity: 0.65, fontSize: 12 }}>
            {attackMode === 'all' ? 'Yaptığın saldırılar tüm rakiplere aynı anda gider.' : 'Saldırılar hayatta olan rastgele bir rakibe gider.'}
          </p>
        </div>

        <label className="field checkbox-field">
          <input
            type="checkbox"
            checked={diagMatches}
            onChange={e => setDiagMatches(e.target.checked)}
          />
          <div>
            <strong>🔀 Çapraz Eşleşmeler</strong>
            <p className="hint">Koşegen diziler de patlama tetikler</p>
          </div>
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
          <label className="field checkbox-field" style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={bombEnabled}
              onChange={e => setBombEnabled(e.target.checked)}
            />
            <div>
              <strong>💣 Bomba Özelliği</strong>
              <p className="hint">Eşleşmelerle bomba kazanıp anında büyük patlama yapabilirsin</p>
            </div>
          </label>
          {bombEnabled && (
            <label className="field" style={{ marginLeft: 24, marginTop: 10 }}>
              <span>Bomba Eşiği: {bombThreshold}'li Eşleşme</span>
              <input type="range" min={4} max={8} value={bombThreshold} onChange={e => setBombThreshold(Number(e.target.value))} />
            </label>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
          <label className="field checkbox-field" style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={aoeEnabled}
              onChange={e => setAoeEnabled(e.target.checked)}
            />
            <div>
              <strong>💥 AoE Taş Patlatma</strong>
              <p className="hint">Uzun eşleşmeler merkez etrafındaki taşları patlatarak yok eder</p>
            </div>
          </label>
          {aoeEnabled && (
            <label className="field" style={{ marginLeft: 24, marginTop: 10 }}>
              <span>Patlama Eşiği: {aoeThreshold}'li Eşleşme</span>
              <input type="range" min={5} max={8} value={aoeThreshold} onChange={e => setAoeThreshold(Number(e.target.value))} />
            </label>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
          <label className="field checkbox-field" style={{ margin: 0 }}>
<<<<<<< HEAD
            <input type="checkbox" checked={powerupsEnabled} onChange={e => setPowerupsEnabled(e.target.checked)} />
            <div>
              <strong>⚡ Güçlendiriciler</strong>
              <p className="hint">Ara sıra özel kapsüller düşer: ⚡ Yıldırım, 🛡️ Kalkan, 🌈 Joker, ✨ Temizlik (ortak tahtada: Yıldırım 3 virüsü yok eder, Joker aynı)</p>
            </div>
          </label>
          {powerupsEnabled && (
            <div style={{ marginLeft: 24 }}>
              <label className="field" style={{ margin: 0 }}>
                <span>Sıklık: {powerupFreq} / 10</span>
                <input type="range" min={1} max={10} value={powerupFreq} onChange={e => setPowerupFreq(Number(e.target.value))} />
              </label>
              <p className="hint" style={{ margin: '2px 0 0' }}>1 = en seyrek, 10 = en sık (yine rastgele düşer)</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
          <label className="field checkbox-field" style={{ margin: 0 }}>
            <input type="checkbox" checked={counterEnabled} onChange={e => setCounterEnabled(e.target.checked)} />
            <div>
              <strong>🛡️ Karşı Saldırı</strong>
              <p className="hint">Combo yaparak sırada bekleyen gelen çöpü iptal edebilirsin</p>
            </div>
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
          <label className="field checkbox-field" style={{ margin: 0 }}>
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
            <input
              type="checkbox"
              checked={missPenaltyEnabled}
              onChange={e => setMissPenaltyEnabled(e.target.checked)}
            />
            <div>
              <strong>⚠️ Hata Cezası</strong>
              <p className="hint">Arka arkaya eşleşmesiz kapsulde yeni virüs doğar</p>
            </div>
          </label>
          {missPenaltyEnabled && (
            <label className="field" style={{ marginLeft: 24, marginTop: 10 }}>
              <span>Ceza Eşiği: {missPenaltyThreshold} Hata</span>
              <input type="range" min={3} max={10} value={missPenaltyThreshold} onChange={e => setMissPenaltyThreshold(Number(e.target.value))} />
            </label>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
          <div>
            <strong>⚔️ Gelişmiş Saldırı (Çöp Gönderme)</strong>
            <p className="hint" style={{ marginTop: 4 }}>Belirli uzunluktaki eşleşmelerde rakibe ekstra çöp gönder.</p>
          </div>

          <label className="field checkbox-field" style={{ margin: 0 }}>
            <input type="checkbox" checked={normalAttackEnabled} onChange={e => setNormalAttackEnabled(e.target.checked)} />
            <div>Normal Çöp Gönderimi</div>
          </label>
          {normalAttackEnabled && (
            <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="field" style={{ margin: 0 }}>
                <span>Gönderim Eşiği: {normalAttackLen}'li Eşleşme</span>
                <input type="range" min={4} max={8} value={normalAttackLen} onChange={e => setNormalAttackLen(Number(e.target.value))} />
              </label>
              <label className="field checkbox-field" style={{ margin: 0 }}>
                <input type="checkbox" checked={normalAttackRequireCombo} onChange={e => setNormalAttackRequireCombo(e.target.checked)} />
                <span style={{ fontSize: 13, opacity: 0.9 }}>Zincir/Kombo Zorunlu Mu? (Tekli eşleşmede pasif kalır)</span>
              </label>
            </div>
          )}

          <hr style={{ opacity: 0.1, margin: '5px 0' }} />

          <label className="field checkbox-field" style={{ margin: 0 }}>
            <input type="checkbox" checked={stoneAttackEnabled} onChange={e => setStoneAttackEnabled(e.target.checked)} />
            <div>Taş Gönderimi</div>
          </label>
          {stoneAttackEnabled && (
            <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="field" style={{ margin: 0 }}>
                <span>Gönderim Eşiği: {stoneAttackLen}'li Eşleşme</span>
                <input type="range" min={4} max={8} value={stoneAttackLen} onChange={e => setStoneAttackLen(Number(e.target.value))} />
              </label>
              <label className="field checkbox-field" style={{ margin: 0 }}>
                <input type="checkbox" checked={stoneAttackRequireCombo} onChange={e => setStoneAttackRequireCombo(e.target.checked)} />
                <span style={{ fontSize: 13, opacity: 0.9 }}>Zincir/Kombo Zorunlu Mu?</span>
              </label>
            </div>
          )}

          <hr style={{ opacity: 0.1, margin: '5px 0' }} />

          <label className="field checkbox-field" style={{ margin: 0 }}>
            <input type="checkbox" checked={lockAttackEnabled} onChange={e => setLockAttackEnabled(e.target.checked)} />
            <div>Kilit Gönderimi (Virüsleri kilitler)</div>
          </label>
          {lockAttackEnabled && (
            <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="field" style={{ margin: 0 }}>
                <span>Gönderim Eşiği: {lockAttackLen}'li Eşleşme</span>
                <input type="range" min={4} max={8} value={lockAttackLen} onChange={e => setLockAttackLen(Number(e.target.value))} />
              </label>
              <label className="field checkbox-field" style={{ margin: 0 }}>
                <input type="checkbox" checked={lockAttackRequireCombo} onChange={e => setLockAttackRequireCombo(e.target.checked)} />
                <span style={{ fontSize: 13, opacity: 0.9 }}>Zincir/Kombo Zorunlu Mu?</span>
              </label>
<<<<<<< HEAD
              <label className="field checkbox-field" style={{ margin: 0 }}>
                <input type="checkbox" checked={lockStacking} onChange={e => setLockStacking(e.target.checked)} />
                <div>
                  <span style={{ fontSize: 13, opacity: 0.9 }}>Kilitler üst üste eklensin</span>
                  <p className="hint" style={{ margin: 0 }}>Kapalıyken zaten kilitli virüse gelen kilit onu açar (eski davranış)</p>
                </div>
              </label>
              {lockStacking && (
                <label className="field" style={{ margin: 0 }}>
                  <span>Üst üste en fazla: {lockMaxStack} kilit</span>
                  <input type="range" min={2} max={10} value={lockMaxStack} onChange={e => setLockMaxStack(Number(e.target.value))} />
                </label>
              )}
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
            </div>
          )}
        </div>
      </div>

      <button className="btn outline wide" style={{ marginBottom: 15 }} onClick={() => { sfx('click'); setShowModal(true); }}>
        🎮 Oyun Kollarını Ayarla
      </button>

      <button className="btn primary wide local-start-btn" onClick={start}>
        Oyunu Başlat
      </button>

      {showModal && (
        <div className="overlay">
          <div className="panel modal">
            <h2>Oyun Kolu Ayarları</h2>
            <p style={{ marginBottom: 15, opacity: 0.8 }}>
              Kullanmak istediğiniz oyun kolunu açılır menüden seçin.<br />
              Kablosuz kolların görünmesi için herhangi bir tuşuna basmanız gerekebilir.
            </p>

            <div className="gamepad-assign-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="gamepad-assign-item field">
                <span>1. Oyuncu</span>
                <select
                  className="text-input"
                  value={p1GpIdx !== null ? String(p1GpIdx) : 'keyboard'}
                  onChange={e => handleAssign(0, e.target.value)}
                >
                  <option value="keyboard">Klavye</option>
                  {allGamepads.map(gp => (
                    <option key={gp.index} value={String(gp.index)}>
                      [{gp.index}] {gp.id}
                    </option>
                  ))}
                </select>
              </div>

              {!p2IsBot && (
                <div className="gamepad-assign-item field">
                  <span>2. Oyuncu</span>
                  <select
                    className="text-input"
                    value={p2GpIdx !== null ? String(p2GpIdx) : 'keyboard'}
                    onChange={e => handleAssign(1, e.target.value)}
                  >
                    <option value="keyboard">Klavye</option>
                    {allGamepads.map(gp => (
                      <option key={gp.index} value={String(gp.index)}>
                        [{gp.index}] {gp.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {p3Enabled && !p3IsBot && (
                <div className="gamepad-assign-item field">
                  <span>3. Oyuncu</span>
                  <select
                    className="text-input"
                    value={p3GpIdx !== null ? String(p3GpIdx) : 'keyboard'}
                    onChange={e => handleAssign(2, e.target.value)}
                  >
                    <option value="keyboard">Klavye</option>
                    {allGamepads.map(gp => (
                      <option key={gp.index} value={String(gp.index)}>
                        [{gp.index}] {gp.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn primary wide" onClick={() => { sfx('click'); setShowModal(false); }}>Tamam</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
