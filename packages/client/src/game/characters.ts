/**
 * Virüs karakterleri.
 *
 * Her renk ayrı bir siluet taşır (10 renk = 10 karakter). Bu hem oyuna kişilik
 * katar hem de renk körü oyuncular için renk dışında bir ayırt edici işaret olur.
 * Yüz ifadesi (mood) oyun durumuna göre değişir; gözler düşen kapsülü takip eder.
 *
 * Saf çizim kodudur: oyun mantığına dokunmaz.
 */
import type { Swatch, PieceStyle } from './themes';
import { withAlpha } from './themes';

export type Mood =
  | 'calm' // keyifli
  | 'cackle' // oyuncu tehlikede: kahkaha
  | 'worried' // az virüs kaldı: endişe
  | 'scared' // yanında bir şey patladı
  | 'dead'; // şu an temizleniyor

export interface FaceOpts {
  mood: Mood;
  /** Bakılan noktanın virüs merkezine göre farkı (px). null: ileri bak */
  look: { dx: number; dy: number } | null;
  tick: number;
  style: PieceStyle;
}

/** Karakter adları (renk numarasına göre) */
export const CHARACTER_NAMES = [
  'Şeytancık', 'Kıvılcım', 'Pisi', 'Uzaylı', 'Yarasa',
  'Balkabağı', 'Denizanası', 'Tavşan', 'Ayıcık', 'Robot',
];

function tri(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Gövdenin ARKASINDA kalan aksesuarlar (kulak, boynuz, kanat...) */
function drawBack(
  ctx: CanvasRenderingContext2D,
  v: number,
  cx: number,
  cy: number,
  rad: number,
  s: number,
  sw: Swatch,
  tick: number
) {
  const [main, light, dark] = sw;
  ctx.fillStyle = dark;
  ctx.strokeStyle = dark;
  switch (v) {
    case 0: // şeytancık: boynuz + kuyruk
      for (const k of [-1, 1]) {
        tri(ctx, cx + k * rad * 0.85, cy - rad * 0.45, cx + k * rad * 0.2, cy - rad * 0.85, cx + k * rad * 0.7, cy - rad * 1.45);
      }
      tri(ctx, cx + rad * 0.8, cy + rad * 0.55, cx + rad * 1.5, cy + rad * 0.9, cx + rad * 0.95, cy + rad * 0.95);
      break;
    case 1: { // kıvılcım: sivri ışınlar
      const n = 8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + tick * 0.015;
        const da = 0.2;
        tri(
          ctx,
          cx + Math.cos(a - da) * rad * 0.9, cy + Math.sin(a - da) * rad * 0.9,
          cx + Math.cos(a + da) * rad * 0.9, cy + Math.sin(a + da) * rad * 0.9,
          cx + Math.cos(a) * rad * 1.5, cy + Math.sin(a) * rad * 1.5
        );
      }
      break;
    }
    case 2: // pisi: üçgen kulaklar
      for (const k of [-1, 1]) {
        ctx.fillStyle = dark;
        tri(ctx, cx + k * rad * 0.95, cy - rad * 0.2, cx + k * rad * 0.2, cy - rad * 0.9, cx + k * rad * 0.85, cy - rad * 1.45);
        ctx.fillStyle = light;
        tri(ctx, cx + k * rad * 0.8, cy - rad * 0.4, cx + k * rad * 0.35, cy - rad * 0.85, cx + k * rad * 0.78, cy - rad * 1.12);
      }
      break;
    case 3: // uzaylı: iki anten
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.lineCap = 'round';
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + k * rad * 0.35, cy - rad * 0.85);
        ctx.lineTo(cx + k * rad * 0.75, cy - rad * 1.38 + Math.sin(tick * 0.08 + k) * rad * 0.06);
        ctx.stroke();
      }
      ctx.fillStyle = light;
      for (const k of [-1, 1]) dot(ctx, cx + k * rad * 0.75, cy - rad * 1.38 + Math.sin(tick * 0.08 + k) * rad * 0.06, s * 0.06);
      break;
    case 4: // yarasa: kanatlar
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + k * rad * 0.8, cy - rad * 0.2);
        ctx.lineTo(cx + k * rad * 1.55, cy - rad * 0.85);
        ctx.lineTo(cx + k * rad * 1.35, cy - rad * 0.1);
        ctx.lineTo(cx + k * rad * 1.5, cy + rad * 0.35);
        ctx.lineTo(cx + k * rad * 1.0, cy + rad * 0.2);
        ctx.closePath();
        ctx.fill();
      }
      break;
    case 5: // balkabağı: sap
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(cx - s * 0.04, cy - rad - s * 0.1, s * 0.08, s * 0.13);
      tri(ctx, cx + s * 0.04, cy - rad - s * 0.07, cx + s * 0.13, cy - rad - s * 0.12, cx + s * 0.04, cy - rad - s * 0.02);
      break;
    case 6: // denizanası: dalgalı dokunaçlar
      ctx.lineWidth = Math.max(1.5, s * 0.075);
      ctx.lineCap = 'round';
      for (const k of [-1, 0, 1]) {
        ctx.beginPath();
        const x0 = cx + k * rad * 0.55;
        ctx.moveTo(x0, cy + rad * 0.7);
        ctx.quadraticCurveTo(x0 + Math.sin(tick * 0.1 + k) * rad * 0.3, cy + rad * 1.05, x0 - Math.sin(tick * 0.1 + k) * rad * 0.2, cy + rad * 1.45);
        ctx.stroke();
      }
      break;
    case 7: // tavşan: uzun kulaklar
      for (const k of [-1, 1]) {
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(cx + k * rad * 0.42, cy - rad * 1.05, rad * 0.22, rad * 0.45, k * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.ellipse(cx + k * rad * 0.42, cy - rad * 1.05, rad * 0.11, rad * 0.32, k * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 8: // ayıcık: yuvarlak kulaklar
      for (const k of [-1, 1]) {
        ctx.fillStyle = dark;
        dot(ctx, cx + k * rad * 0.75, cy - rad * 0.78, rad * 0.34);
        ctx.fillStyle = light;
        dot(ctx, cx + k * rad * 0.75, cy - rad * 0.78, rad * 0.17);
      }
      break;
    case 9: // robot: anten
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(cx, cy - rad * 0.9);
      ctx.lineTo(cx, cy - rad * 1.38);
      ctx.stroke();
      ctx.fillStyle = tick % 40 < 20 ? '#FF5252' : light;
      dot(ctx, cx, cy - rad * 1.42, s * 0.06);
      break;
  }
}

/** Gövdenin ÖNÜNDE kalan süsler (bıyık, sırt çizgileri, perçinler) */
function drawFront(
  ctx: CanvasRenderingContext2D,
  v: number,
  cx: number,
  cy: number,
  rad: number,
  s: number,
  sw: Swatch
) {
  const [, light, dark] = sw;
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.lineCap = 'round';
  switch (v) {
    case 2: // pisi bıyıkları
      for (const k of [-1, 1]) {
        for (const dy of [-0.05, 0.1]) {
          ctx.beginPath();
          ctx.moveTo(cx + k * rad * 0.55, cy + rad * (0.3 + dy));
          ctx.lineTo(cx + k * rad * 1.15, cy + rad * (0.25 + dy * 3));
          ctx.stroke();
        }
      }
      break;
    case 5: // balkabağı dilimleri
      ctx.beginPath();
      ctx.ellipse(cx, cy, rad * 0.45, rad * 0.98, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 9: // robot perçinleri
      ctx.fillStyle = light;
      for (const k of [-1, 1]) dot(ctx, cx + k * rad * 0.78, cy + rad * 0.62, s * 0.028);
      break;
  }
}

/**
 * Bir virüsü çizer.
 * px,py: hücrenin sol üstü, s: hücre boyu, color: renk numarası (karakteri belirler).
 */
export function drawVirusCharacter(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  s: number,
  color: number,
  sw: Swatch,
  o: FaceOpts
) {
  const [main, light, dark] = sw;
  const v = ((color % 10) + 10) % 10;
  const dead = o.mood === 'dead';
  const wobble = dead ? 0 : Math.sin(o.tick * 0.08 + px * 0.3 + py * 0.2) * s * 0.03;
  const cx = px + s / 2;
  const cy = py + s / 2 + wobble;
  const rad = s * 0.33 * (dead ? 1.1 : 1);
  const neon = o.style === 'neon';
  const pixel = o.style === 'pixel';

  ctx.save();
  ctx.lineJoin = 'round';

  // arka aksesuarlar
  drawBack(ctx, v, cx, cy, rad, s, sw, o.tick);

  // gövde
  ctx.beginPath();
  if (v === 9 || pixel) {
    const r = pixel ? 0 : rad * 0.28;
    const x = cx - rad, y = cy - rad, w = rad * 2, h = rad * 2;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  } else {
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  }
  if (neon) {
    ctx.fillStyle = withAlpha(main, 0.32);
    ctx.fill();
    ctx.shadowColor = main;
    ctx.shadowBlur = s * 0.35;
    ctx.lineWidth = Math.max(1.5, s * 0.06);
    ctx.strokeStyle = main;
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = main;
    ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.strokeStyle = dark;
    ctx.stroke();
    if (o.style !== 'flat' && !pixel) {
      ctx.beginPath();
      ctx.arc(cx - rad * 0.38, cy - rad * 0.45, rad * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = light;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawFront(ctx, v, cx, cy, rad, s, sw);

  // --- yüz ---
  const eyeR = Math.max(1.2, s * 0.075) * (o.mood === 'scared' ? 1.3 : 1);
  const ex = rad * 0.38;
  const ey = cy - rad * 0.12;
  const blink = !dead && o.mood !== 'scared' && Math.sin(o.tick * 0.04 + color + px * 0.1) > 0.975;
  const ink = '#0B1116';

  if (dead) {
    // X gözler
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1.2, s * 0.045);
    ctx.lineCap = 'round';
    for (const k of [-1, 1]) {
      const x = cx + k * ex;
      ctx.beginPath();
      ctx.moveTo(x - eyeR, ey - eyeR); ctx.lineTo(x + eyeR, ey + eyeR);
      ctx.moveTo(x + eyeR, ey - eyeR); ctx.lineTo(x - eyeR, ey + eyeR);
      ctx.stroke();
    }
  } else if (blink) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1.2, s * 0.04);
    ctx.lineCap = 'round';
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + k * ex - eyeR, ey);
      ctx.lineTo(cx + k * ex + eyeR, ey);
      ctx.stroke();
    }
  } else {
    // göz akı + bakan gözbebeği
    let lx = 0, ly = 0;
    if (o.look) {
      const len = Math.hypot(o.look.dx, o.look.dy) || 1;
      lx = (o.look.dx / len) * eyeR * 0.5;
      ly = (o.look.dy / len) * eyeR * 0.5;
    }
    for (const k of [-1, 1]) {
      const x = cx + k * ex;
      ctx.fillStyle = '#FFFFFF';
      dot(ctx, x, ey, eyeR * 1.35);
      ctx.fillStyle = ink;
      dot(ctx, x + lx, ey + ly, o.mood === 'scared' ? eyeR * 0.55 : eyeR * 0.8);
    }
  }

  // kaşlar
  if (o.mood === 'cackle' || o.mood === 'worried') {
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1.2, s * 0.04);
    ctx.lineCap = 'round';
    for (const k of [-1, 1]) {
      const outerY = ey - eyeR * 2.1;
      const innerY = ey - eyeR * (o.mood === 'cackle' ? 1.4 : 3.1);
      ctx.beginPath();
      ctx.moveTo(cx + k * (ex + eyeR * 1.2), outerY);
      ctx.lineTo(cx + k * (ex - eyeR * 1.2), innerY);
      ctx.stroke();
    }
  }

  // ağız
  const my = cy + rad * 0.32;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.2, s * 0.04);
  ctx.lineCap = 'round';
  switch (o.mood) {
    case 'cackle': {
      // kocaman açık gülümseme: koyu ağız + dişler + dil
      const w = rad * 0.55;
      ctx.beginPath();
      ctx.moveTo(cx - w, my);
      ctx.quadraticCurveTo(cx, my + rad * 0.95, cx + w, my);
      ctx.closePath();
      ctx.fillStyle = '#2A0A14';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - w, my - 1, w * 2, rad * 0.2);
      ctx.fillStyle = '#FF7A9A';
      ctx.beginPath();
      ctx.ellipse(cx, my + rad * 0.52, rad * 0.22, rad * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'worried': {
      ctx.beginPath();
      ctx.arc(cx, my + rad * 0.42, rad * 0.26, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      // ter damlası
      ctx.fillStyle = '#8FD8FF';
      dot(ctx, cx + rad * 0.95, cy - rad * 0.35, s * 0.045);
      tri(ctx, cx + rad * 0.95 - s * 0.04, cy - rad * 0.35, cx + rad * 0.95 + s * 0.04, cy - rad * 0.35, cx + rad * 0.95, cy - rad * 0.35 - s * 0.1);
      break;
    }
    case 'scared': {
      ctx.fillStyle = '#2A0A14';
      ctx.beginPath();
      ctx.ellipse(cx, my + rad * 0.2, rad * 0.2, rad * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'dead': {
      ctx.beginPath();
      ctx.moveTo(cx - rad * 0.3, my + rad * 0.1);
      ctx.lineTo(cx + rad * 0.3, my + rad * 0.1);
      ctx.stroke();
      ctx.fillStyle = '#FF7A9A';
      ctx.beginPath();
      ctx.ellipse(cx + rad * 0.1, my + rad * 0.3, rad * 0.14, rad * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      // keyifli küçük gülümseme (+ yarasa/şeytancık için küçük diş)
      ctx.beginPath();
      ctx.arc(cx, my - rad * 0.05, rad * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      if (v === 0 || v === 4) {
        ctx.fillStyle = '#FFFFFF';
        tri(ctx, cx - rad * 0.2, my + rad * 0.24, cx - rad * 0.08, my + rad * 0.24, cx - rad * 0.14, my + rad * 0.38);
      }
    }
  }

  ctx.restore();
}
