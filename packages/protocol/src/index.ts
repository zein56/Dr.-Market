/** Client ve server'ın ortak konuştuğu mesaj tipleri. */

export type SpeedSetting = 'low' | 'med' | 'hi';

<<<<<<< HEAD
/**
 * Saldırı hedefleme modu (oyuncu başına, maç içinde değiştirilebilir):
 *  - random : hayatta olan rastgele bir rakip
 *  - leader : galibiyete en yakın rakip (en az virüsü kalan)
 *  - revenge: seni en son vuran rakip (hayatta değilse rastgele)
 */
export type TargetMode = 'random' | 'leader' | 'revenge';
export const TARGET_MODES: TargetMode[] = ['random', 'leader', 'revenge'];

=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
export interface AttackInfo {
  normal: number;
  stone: number;
  lock: number;
  colors?: number[];
}

export interface RoomConfig {
  level: number;
  speed: SpeedSetting;
  maxPlayers: number;
  /** her oyuncu aynı anda kaç rakip tahtasını detaylı görsün */
  detailFanout: number;
  diagMatches?: boolean;

<<<<<<< HEAD
  /** Karşı saldırı: ürettiğin saldırı, bekleyen gelen çöpü önce iptal eder. */
  counterEnabled?: boolean;

  /** Güçlendirici kapsüller: ⚡ yıldırım, 🛡️ kalkan, 🌈 joker, 🧽 temizlik. */
  powerupsEnabled?: boolean;
  /** Güçlendirici sıklığı: 1 (seyrek) .. 10 (sık). Varsayılan 5. */
  powerupFreq?: number;

=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  aoeEnabled?: boolean;
  aoeThreshold?: number;

  missPenaltyEnabled?: boolean;
  missPenaltyThreshold?: number;

  normalAttackEnabled?: boolean;
  normalAttackLen?: number;
  normalAttackRequireCombo?: boolean;

  stoneAttackEnabled?: boolean;
  stoneAttackLen?: number;
  stoneAttackRequireCombo?: boolean;

  lockAttackEnabled?: boolean;
  lockAttackLen?: number;
  lockAttackRequireCombo?: boolean;
<<<<<<< HEAD
  /** Kilitler aynı virüse üst üste eklenebilsin (kapalıysa zaten kilitli virüse gelen kilit onu açar). */
  lockStacking?: boolean;
  /** Üst üste en fazla kilit katmanı (2..10). */
  lockMaxStack?: number;
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51

  bombEnabled?: boolean;
  bombThreshold?: number;

  colors: number;
}

export interface PlayerPublic {
  id: string;
  name: string;
  ready: boolean;
  alive: boolean;
  placement: number | null;
}

export interface RoomPublic {
  code: string;
  name: string;
  hostId: string;
  config: RoomConfig;
  players: PlayerPublic[];
  state: 'lobby' | 'playing' | 'finished';
  playerCount: number;
}

/** İstemci -> Sunucu */
export interface C2S {
  /** token verilirse ve sunucuda hâlâ geçerliyse, aynı oyuncu kimliğiyle devam edilir */
  hello: { name: string; token?: string };
  room_create: { name: string; config: Partial<RoomConfig> };
  room_join: { code: string };
  room_leave: Record<string, never>;
  room_list: Record<string, never>;
  ready: { ready: boolean };
  start: Record<string, never>;
  /** sadece oda sahibi gönderebilir */
  game_pause: Record<string, never>;
  game_resume: Record<string, never>;
  /** oyun sırasında toplu girdi (20Hz) */
  input_batch: { frame: number; events: Array<[number, number]> };
  /** periyodik tahta durumu (1Hz) — izleyiciler ve doğrulama için */
  board_sync: { frame: number; board: string; viruses: number; score: number };
  /** oyuncu saldırı üretti */
  attack: { frame: number; attack: AttackInfo };
  /** oyuncu elendi ya da kazandı */
  finished: { frame: number; won: boolean; score: number; viruses: number; maxChain: number };
  ping: { t0: number };
  chat: { text: string };
<<<<<<< HEAD
  /** saldırı hedefleme modunu seç */
  set_target: { mode: TargetMode };
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
}

/** Sunucu -> İstemci */
export interface S2C {
  hello_ok: { playerId: string; token: string };
  error: { message: string };
  room_list: { rooms: RoomPublic[] };
  room_state: { room: RoomPublic; you: string };
  match_start: {
    seed: number;
    config: RoomConfig;
    startAt: number; // sunucu saatinde ms
    players: PlayerPublic[];
    hostId: string;
  };
  /** devam eden bir maça yeniden bağlanan oyuncuya son bilinen durumu verir */
  resume_state: {
    seed: number;
    config: RoomConfig;
    frame: number;
    board: string;
    viruses: number;
    score: number;
    players: PlayerPublic[];
  };
  /** detaylı abone olunan rakip tahtaları */
  peer_board: { id: string; frame: number; board: string; viruses: number };
  /** herkesin özeti, düşük frekans */
  peer_summary: { players: Array<{ id: string; alive: boolean; viruses: number; score: number }> };
  incoming_attack: { fromId: string; attack: AttackInfo; seed: number };
  player_out: { id: string; placement: number };
  match_end: {
    results: Array<{ id: string; name: string; placement: number; score: number; maxChain: number }>;
  };
  pong: { t0: number; t1: number };
  chat: { id: string; name: string; text: string; at: number };
  game_paused: { byId: string };
  game_resumed: { byId: string };
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  level: 5,
  speed: 'med',
  maxPlayers: 32,
  detailFanout: 8,
  diagMatches: false,
<<<<<<< HEAD
  counterEnabled: true,
  powerupsEnabled: true,
  powerupFreq: 5,
  lockStacking: false,
  lockMaxStack: 3,
=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
  aoeEnabled: false,
  aoeThreshold: 5,
  missPenaltyEnabled: false,
  missPenaltyThreshold: 3,
  normalAttackEnabled: false,
  normalAttackLen: 4,
  normalAttackRequireCombo: true,
  stoneAttackEnabled: false,
  stoneAttackLen: 5,
  stoneAttackRequireCombo: true,
  lockAttackEnabled: false,
  lockAttackLen: 6,
  lockAttackRequireCombo: true,
  bombEnabled: false,
  bombThreshold: 5,
  colors: 3,
};

export const INPUT_BATCH_HZ = 20;
export const BOARD_SYNC_HZ = 1;
export const SUMMARY_HZ = 2;
