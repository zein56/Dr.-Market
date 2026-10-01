/**
 * Güçlendirici kapsüllerin görselleri: vektör ikonlar (emoji yazı tipi gerekmez,
 * her cihazda aynı görünür), parlama halkası ve joker için gökkuşağı rengi.
 * Saf çizim kodudur.
 */
import {
  POWER_STRIKE,
  POWER_SHIELD,
  POWER_JOKER,
  POWER_CLEANSE,
} from '@pill/game-core';
import type { Swatch } from './themes';

export const POWER_LABEL: Record<number, string> = {
  [POWER_STRIKE]: 'YILDIRIM',
  [POWER_SHIELD]: 'KALKAN',
  [POWER_JOKER]: 'JOKER',
  [POWER_CLEANSE]: 'TEMİZLİK',
};

export const POWER_HELP: Record<number, string> = {
  [POWER_STRIKE]: 'Rakiplere anında 4 çöp kapsül gönderir (ortak tahtada 3 virüsü yok eder)',
  [POWER_SHIELD]: 'Bir sonraki gelen saldırıyı tamamen emer',
  [POWER_JOKER]: 'Yerleştiği anda en çok temizleyecek renge dönüşür',
  [POWER_CLEANSE]: 'Taşları ve kilitleri kaldırır, bekleyen çöpü siler',
};

export function powerColor(power: number, tick = 0): string {
  switch (power) {
    case POWER_STRIKE: return '#FFE600';
    case POWER_SHIELD: return '#4FC3F7';
    case POWER_JOKER: return `hsl(${(tick * 5) % 360}, 90%, 62%)`;
    case POWER_CLEANSE: return '#5CFFE0';
    default: return '#FFFFFF';
  }
}

/** Joker yarımları için akıp giden gökkuşağı rengi. offset: iki yarım farklı tonda olsun. */
export function rainbowSwatch(tick: number, offset = 0): Swatch {
  const h = (tick * 4 + offset) % 360;
  return [`hsl(${h}, 85%, 56%)`, `hsl(${h}, 95%, 80%)`, `hsl(${h}, 75%, 30%)`];
}

/** Yüzeyin merkezine (cx,cy) r yarıçaplı ikon çizer. */
export function drawPowerIcon(
  ctx: CanvasRenderingContext2D,
  power: number,
  cx: number,
  cy: number,
  r: number,
  tick = 0
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, r * 0.16);

  switch (power) {
    case POWER_STRIKE: {
      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r);
      ctx.lineTo(-r * 0.6, r * 0.12);
      ctx.lineTo(-r * 0.05, r * 0.12);
      ctx.lineTo(-r * 0.25, r);
      ctx.lineTo(r * 0.62, -r * 0.22);
      ctx.lineTo(r * 0.06, -r * 0.22);
      ctx.closePath();
      ctx.fillStyle = '#FFE600';
      ctx.strokeStyle = '#7A5D00';
      ctx.fill();
      ctx.stroke();
      break;
    }
    case POWER_SHIELD: {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.82, -r * 0.62);
      ctx.lineTo(r * 0.72, r * 0.2);
      ctx.quadraticCurveTo(r * 0.6, r * 0.72, 0, r);
      ctx.quadraticCurveTo(-r * 0.6, r * 0.72, -r * 0.72, r * 0.2);
      ctx.lineTo(-r * 0.82, -r * 0.62);
      ctx.closePath();
      ctx.fillStyle = '#4FC3F7';
      ctx.strokeStyle = '#0B4F73';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.lineTo(0, r * 0.75);
      ctx.strokeStyle = '#E1F5FE';
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.stroke();
      break;
    }
    case POWER_JOKER: {
      // gökkuşağı kemeri
      const cols = ['#FF4D4D', '#FFD84D', '#4DD2FF'];
      ctx.lineCap = 'butt';
      cols.forEach((c, i) => {
        ctx.beginPath();
        ctx.arc(0, r * 0.45, r * (0.95 - i * 0.28), Math.PI, 0);
        ctx.strokeStyle = c;
        ctx.lineWidth = r * 0.26;
        ctx.stroke();
      });
      break;
    }
    case POWER_CLEANSE: {
      // pırıltı + iki kabarcık
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.14, -r * 0.14, r, 0);
      ctx.quadraticCurveTo(r * 0.14, r * 0.14, 0, r);
      ctx.quadraticCurveTo(-r * 0.14, r * 0.14, -r, 0);
      ctx.quadraticCurveTo(-r * 0.14, -r * 0.14, 0, -r);
      ctx.closePath();
      ctx.fillStyle = '#B8FFF3';
      ctx.strokeStyle = '#00796B';
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#E0FFFA';
      ctx.lineWidth = Math.max(1, r * 0.1);
      for (const [bx, by, br] of [[0.62, -0.62, 0.17], [-0.65, 0.58, 0.12]] as const) {
        ctx.beginPath();
        ctx.arc(bx * r, by * r, br * r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

/**
 * Güçlü kapsülün yarımının arkasında nabız gibi atan parlama.
 * (cx,cy): hücre merkezi, s: hücre boyu.
 */
export function drawPowerAura(
  ctx: CanvasRenderingContext2D,
  power: number,
  cx: number,
  cy: number,
  s: number,
  tick: number
) {
  const pulse = 0.5 + 0.5 * Math.sin(tick * 0.18);
  ctx.save();
  ctx.globalAlpha = 0.16 + 0.16 * pulse;
  ctx.fillStyle = powerColor(power, tick);
  ctx.beginPath();
  ctx.arc(cx, cy, s * (0.62 + 0.1 * pulse), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Ikon + koyu zemin rozeti (kapsülün ortasına konur). */
export function drawPowerBadge(
  ctx: CanvasRenderingContext2D,
  power: number,
  cx: number,
  cy: number,
  r: number,
  tick = 0
) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 14, 20, 0.72)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = powerColor(power, tick);
  ctx.lineWidth = Math.max(1.5, r * 0.18);
  ctx.stroke();
  ctx.restore();
  drawPowerIcon(ctx, power, cx, cy, r * 0.8, tick);
}
