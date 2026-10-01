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

/** İki güçlü kapsül arasında en az bu kadar normal kapsül düşer */
export const POWER_MIN_GAP = 8;
/** Bekleme süresi dolduktan sonra her yeni kapsülün güçlü olma olasılığı */
export const POWER_CHANCE = 0.25;
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
