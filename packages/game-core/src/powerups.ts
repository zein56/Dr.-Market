/**
 * Güçlendirici kapsüller.
 *
 * Belirli aralıklarla düşen özel bir kapsül, yere oturduğunda etkisini uygular.
 * Tahtaya yeni hücre türü EKLENMEZ: güç, düşen kapsülün bir özelliğidir
 * (Capsule.power); bu yüzden ağ paketleri ve tahta kodlaması değişmez.
 *
 * Program (hangi kapsülün güçlü olacağı) tohumdan türetilen AYRI bir RNG ile
 * belirlenir: aynı tohumu kullanan herkes aynı sırayla aynı güçleri alır ve
 * normal kapsül renk dizisi bundan etkilenmez.
 */

export const POWER_NONE = 0;
/** ⚡ Yıldırım: rakiplere anında çöp kapsül gönderir */
export const POWER_STRIKE = 1;
/** 🛡️ Kalkan: bir sonraki gelen saldırı paketini tamamen emer */
export const POWER_SHIELD = 2;
/** 🌈 Joker: oturduğu yerde en çok temizleyecek renge dönüşür */
export const POWER_JOKER = 3;
/** 🧽 Temizlik: tahtandaki taşları ve kilitleri kaldırır, bekleyen çöpü siler */
export const POWER_CLEANSE = 4;

export const POWER_NAMES: Record<number, string> = {
  [POWER_STRIKE]: 'strike',
  [POWER_SHIELD]: 'shield',
  [POWER_JOKER]: 'joker',
  [POWER_CLEANSE]: 'cleanse',
};

/** Varsayılan sıklık seviyesi (1..10) */
export const DEFAULT_POWER_FREQ = 5;

// Sıklık seviyesi 1 (en seyrek) .. 10 (en sık). Her seviye iki sayı belirler:
//  - GAPS   : iki güçlü kapsül arasında EN AZ kaç normal kapsül düşer
//  - CHANCES: bu bekleme dolduktan sonra her yeni kapsülün güçlü olma olasılığı
// Yani seviye bir "kaçıncı hamlede bir" sayacı DEĞİL; sadece sıklığın ölçeğidir ve hâlâ rastgeledir.
// Ortalama aralık ≈ GAP + 1/CHANCE kapsül: seviye 1 ≈ 26, seviye 5 ≈ 12, seviye 10 ≈ 3.5.
const GAPS = [16, 14, 12, 10, 8, 6, 5, 4, 3, 2];
const CHANCES = [0.1, 0.14, 0.18, 0.22, 0.25, 0.3, 0.36, 0.43, 0.52, 0.65];

/** Seviyeyi (bozuk/eksik değer dahil) 1..10 aralığına oturtur. */
export function normalizePowerFreq(freq?: number): number {
  const n = Math.round(Number(freq));
  if (!Number.isFinite(n)) return DEFAULT_POWER_FREQ;
  return Math.min(10, Math.max(1, n));
}

export function powerFreqParams(freq?: number): { gap: number; chance: number } {
  const i = normalizePowerFreq(freq) - 1;
  return { gap: GAPS[i], chance: CHANCES[i] };
}

/** İki güçlü kapsül arasında en az bu kadar normal kapsül düşer (varsayılan seviye) */
export const POWER_MIN_GAP = GAPS[DEFAULT_POWER_FREQ - 1];
/** Bekleme dolduktan sonra her yeni kapsülün güçlü olma olasılığı (varsayılan seviye) */
export const POWER_CHANCE = CHANCES[DEFAULT_POWER_FREQ - 1];
/** Yıldırımın gönderdiği çöp sayısı */
export const STRIKE_AMOUNT = 4;
/** Aynı anda biriktirilebilecek en fazla kalkan */
export const SHIELD_MAX = 2;

/** Ağırlıklı seçim (toplam 100) */
const WEIGHTS: Array<[number, number]> = [
  [POWER_JOKER, 35],
  [POWER_STRIKE, 25],
  [POWER_SHIELD, 20],
  [POWER_CLEANSE, 20],
];

/** r: [0,1) aralığında bir sayı. */
export function pickPower(r: number): number {
  let acc = 0;
  const x = r * 100;
  for (const [p, w] of WEIGHTS) {
    acc += w;
    if (x < acc) return p;
  }
  return POWER_JOKER;
}
