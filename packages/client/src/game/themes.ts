/**
 * Görsel temalar. Yalnızca istemcide, oyuncuya özel: online odada herkes kendi
 * temasıyla oynar, oyun kuralları ve ağ trafiği değişmez.
 *
 * Bir tema iki şeyi değiştirir:
 *  - canvas: tahta zemini, ızgara, kenarlık, 10 renklik palet, taş rengi ve çizim stili
 *  - sayfa: CSS değişkenleri (arka plan, paneller, çizgiler, yazı renkleri)
 */

export type Swatch = [main: string, light: string, dark: string];

/** glossy: parlak jöle | flat: düz | neon: parlayan çizgi | pixel: köşeli piksel */
export type PieceStyle = 'glossy' | 'flat' | 'neon' | 'pixel';

export type ThemeId = 'classic' | 'neon' | 'candy' | 'space' | 'retro';

export interface Theme {
  id: ThemeId;
  label: string;
  emoji: string;
  gridBg: string;
  gridLine: string;
  border: string;
  palette: Swatch[]; // 10 renk
  stone: Swatch;
  style: PieceStyle;
  css: Record<string, string>;
}

const sw = (main: string, light: string, dark: string): Swatch => [main, light, dark];

export const THEMES: Record<ThemeId, Theme> = {
  classic: {
    id: 'classic',
    label: 'Klasik',
    emoji: '💊',
    gridBg: '#0D1A22',
    gridLine: '#1B2E3A',
    border: '#3B6076',
    palette: [
      sw('#E8453C', '#FF8A80', '#8E1F1A'), // kırmızı
      sw('#F2C53D', '#FFE9A3', '#8C6A0E'), // sarı
      sw('#3FA9F5', '#9FD8FF', '#16537E'), // mavi
      sw('#4CAF50', '#81C784', '#1B5E20'), // yeşil
      sw('#9C27B0', '#BA68C8', '#4A148C'), // mor
      sw('#FF9800', '#FFB74D', '#E65100'), // turuncu
      sw('#00BCD4', '#4DD0E1', '#006064'), // turkuaz
      sw('#E91E63', '#F06292', '#880E4F'), // pembe
      sw('#795548', '#A1887F', '#3E2723'), // kahverengi
      sw('#8D6E63', '#BCAAA4', '#4E342E'), // açık kahve
    ],
    stone: sw('#777777', '#999999', '#444444'),
    style: 'glossy',
    css: {
      '--bg': '#0B1820',
      '--bg-2': '#12242F',
      '--panel': '#16303D',
      '--panel-2': '#1C3B4B',
      '--line': '#27505F',
      '--ink': '#DFEDF2',
      '--ink-dim': '#8FAEBB',
      '--bg-glow': '#143040',
    },
  },

  neon: {
    id: 'neon',
    label: 'Neon Siber',
    emoji: '🌃',
    gridBg: '#07030F',
    gridLine: '#1C1038',
    border: '#B14CFF',
    palette: [
      sw('#FF2E63', '#FF9AB3', '#8A0F33'),
      sw('#FFE600', '#FFF59A', '#8A7A00'),
      sw('#00B8FF', '#8DE1FF', '#005A82'),
      sw('#2BFF88', '#9BFFC6', '#0F7A41'),
      sw('#B14CFF', '#D9A6FF', '#58208A'),
      sw('#FF8A00', '#FFC37A', '#8A4A00'),
      sw('#00F5D4', '#9AFFF0', '#007A69'),
      sw('#FF4FD8', '#FFA6EC', '#8A1F74'),
      sw('#C6FF00', '#E5FF8A', '#667F00'),
      sw('#E8E8FF', '#FFFFFF', '#7A7A99'),
    ],
    stone: sw('#5A5470', '#8A83A8', '#2A2640'),
    style: 'neon',
    css: {
      '--bg': '#0A0614',
      '--bg-2': '#120A24',
      '--panel': '#1A1033',
      '--panel-2': '#24164A',
      '--line': '#4B2A8A',
      '--ink': '#F0E8FF',
      '--ink-dim': '#A992D6',
      '--bg-glow': '#2A0F4F',
    },
  },

  candy: {
    id: 'candy',
    label: 'Şeker Dükkânı',
    emoji: '🍬',
    gridBg: '#2A1233',
    gridLine: '#43204F',
    border: '#FF8AD8',
    palette: [
      sw('#FF5C8A', '#FFB3CB', '#9E1F46'),
      sw('#FFD84D', '#FFF0A8', '#9A7A00'),
      sw('#4DB8FF', '#A8DDFF', '#14609A'),
      sw('#5CE08A', '#B0F5C8', '#1C7A40'),
      sw('#B07CFF', '#D8C0FF', '#5A2FA0'),
      sw('#FF9F43', '#FFCF9A', '#A04E00'),
      sw('#4DE3E3', '#A8F5F5', '#117A7A'),
      sw('#FF8AD8', '#FFC4EC', '#A02F86'),
      sw('#C98B5A', '#E8C3A0', '#6A3F1C'),
      sw('#A8E6CF', '#DDF7EC', '#4F8F78'),
    ],
    stone: sw('#8A6B9A', '#B896C8', '#4A3558'),
    style: 'glossy',
    css: {
      '--bg': '#2A1030',
      '--bg-2': '#3A1642',
      '--panel': '#4A1D55',
      '--panel-2': '#5C2468',
      '--line': '#8B3FA0',
      '--ink': '#FFF0F8',
      '--ink-dim': '#E0A8D0',
      '--bg-glow': '#6A2A7A',
    },
  },

  space: {
    id: 'space',
    label: 'Uzay Laboratuvarı',
    emoji: '🚀',
    gridBg: '#050B1A',
    gridLine: '#0F2142',
    border: '#4DA3FF',
    palette: [
      sw('#FF5A5F', '#FFA3A6', '#8F1F24'),
      sw('#FFD166', '#FFEBB0', '#8F6A10'),
      sw('#4D96FF', '#A3C8FF', '#1A4F9F'),
      sw('#06D6A0', '#8FF0D4', '#047A5C'),
      sw('#9B5DE5', '#C9A6F5', '#4F2A8A'),
      sw('#FF9F1C', '#FFD08A', '#9A5A00'),
      sw('#00D9FF', '#8AEEFF', '#007A94'),
      sw('#F15BB5', '#F8A6D8', '#8F2A66'),
      sw('#B08968', '#D9BFA5', '#5E4630'),
      sw('#CED4DA', '#F1F3F5', '#6C757D'),
    ],
    stone: sw('#5B6575', '#8794A8', '#2A313D'),
    style: 'flat',
    css: {
      '--bg': '#050A18',
      '--bg-2': '#0A1430',
      '--panel': '#0F1D40',
      '--panel-2': '#16295A',
      '--line': '#264A8C',
      '--ink': '#E6F0FF',
      '--ink-dim': '#8FA8D6',
      '--bg-glow': '#0F2A5C',
    },
  },

  retro: {
    id: 'retro',
    label: 'Retro Piksel',
    emoji: '👾',
    gridBg: '#0F1F0F',
    gridLine: '#1E3A1E',
    border: '#9BBC0F',
    palette: [
      sw('#E04F4F', '#F2A0A0', '#7A1F1F'),
      sw('#E8D44D', '#F5EBA0', '#7A6A10'),
      sw('#4F7FE0', '#A0BDF2', '#1F3F7A'),
      sw('#58C25A', '#A8E6AA', '#1F6A21'),
      sw('#9A5FD1', '#CBA6EA', '#4A2A7A'),
      sw('#E88A3A', '#F5C494', '#7A4010'),
      sw('#4FC9C9', '#A0E8E8', '#1F6A6A'),
      sw('#E06FA8', '#F2B0D2', '#7A2A56'),
      sw('#8E6B45', '#C4A98A', '#4A3320'),
      sw('#C8D0B8', '#EEF2E4', '#6A705E'),
    ],
    stone: sw('#6B7A5A', '#9AAB88', '#33402A'),
    style: 'pixel',
    css: {
      '--bg': '#0B140B',
      '--bg-2': '#122012',
      '--panel': '#193019',
      '--panel-2': '#214221',
      '--line': '#3D6B2E',
      '--ink': '#E6F2D0',
      '--ink-dim': '#9DB88A',
      '--bg-glow': '#1E3A1E',
    },
  },
};

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
const STORAGE_KEY = 'pill.visualTheme';

let current: Theme = THEMES.classic;

/** Çizim kodunun kullandığı aktif tema. */
export function currentTheme(): Theme {
  return current;
}

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(THEMES, v);
}

/** Kayıtlı temayı oku (yoksa/bozuksa klasik). */
export function loadSavedTheme(): ThemeId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isThemeId(v) ? v : 'classic';
  } catch {
    return 'classic';
  }
}

type Listener = (id: ThemeId) => void;
const listeners = new Set<Listener>();

/** Tema değişince haber ver (seçici düğmelerin güncellenmesi için). Dönüş: aboneliği iptal eder. */
export function onThemeChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Temayı uygular: canvas çizimi + sayfa CSS değişkenleri. Geçersiz kimlik klasiğe düşer.
 * `persist` açıksa seçimi hatırlar.
 */
export function applyTheme(id: ThemeId | string, persist = true): ThemeId {
  const theme = isThemeId(id) ? THEMES[id] : THEMES.classic;
  current = theme;
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(theme.css)) root.style.setProperty(k, v);
    root.dataset.theme = theme.id;
  }
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, theme.id); } catch { /* yok say */ }
  }
  listeners.forEach((fn) => fn(theme.id));
  return theme.id;
}

/** "#RRGGBB" rengini yarı saydam rgba() yapar (neon dolgu için). */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
