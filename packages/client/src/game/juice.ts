/**
 * "Juice": oyun hissini güçlendiren görsel geri bildirimler.
 *  - temizlenen hücrelerden renkli parçacıklar
 *  - combo (zincir) yazısı
 *  - combo büyüdükçe artan ekran sarsıntısı
 *
 * Sadece istemci tarafında çalışır, oyun mantığına (game-core) dokunmaz;
 * yani determinizmi ve ağ trafiğini etkilemez. Rastgelelik burada serbest.
 *
 * Kullanım (her oyuncu tahtası için bir örnek):
 *   step(s, inputs);
 *   juice.handle(s, cols);          // step sonrası, olayları işler
 *   ...
 *   juice.update();                 // çizim karesi başına bir kez
 *   drawBoard(...);
 *   juice.draw(ctx, cellSize, cols);
 *   juice.applyShake(canvas);
 */
import { colorOf, isStone } from '@pill/game-core';
import { getPaletteColor } from './render';

interface Particle {
  x: number; // hücre birimi
  y: number;
  vx: number; // hücre / kare
  vy: number;
  life: number;
  max: number;
  size: number; // hücre birimi
  color: string;
}

interface Popup {
  text: string;
  x: number; // hücre birimi
  y: number;
  life: number;
  max: number;
  color: string;
  size: number; // hücre birimi
}

/** handle() için gereken asgari oyun durumu (tek ve co-op oyun durumlarıyla uyumlu) */
export interface JuiceState {
  events: string[];
  clearing: number[];
  board: ArrayLike<number>;
  chain: number;
}

const MAX_PARTICLES = 260;
const GRAVITY = 0.014;

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Zincir büyüdükçe sarı -> turuncu -> kırmızı -> pembe */
function chainColor(chain: number): string {
  if (chain >= 6) return '#FF4FD8';
  if (chain >= 4) return '#FF5A3C';
  if (chain >= 3) return '#FF9A2E';
  return '#FFE14D';
}

export class Juice {
  private parts: Particle[] = [];
  private pops: Popup[] = [];
  private shakeLeft = 0;
  private shakeTotal = 1;
  private shakeMag = 0;
  private shaking = false;
  private reduced = prefersReducedMotion();

  /** step() sonrası çağır: o adımda oluşan olayları efektlere çevirir. */
  handle(s: JuiceState, cols: number) {
    for (const ev of s.events) {
      if (ev === 'clear' || ev === 'chain') {
        this.onClear(s, cols);
      } else if (ev.startsWith('bomb_explosion:')) {
        this.shake(11, 22);
      } else if (ev.startsWith('explosion:')) {
        this.shake(5, 12);
      } else if (ev.startsWith('power:')) {
        this.onPower(ev.slice(6), cols, s.board.length / cols);
      } else if (ev === 'shield_block') {
        this.announce('🛡️ ENGELLENDİ', cols, s.board.length / cols, '#4FC3F7', 0.95);
        this.shake(3, 8);
      } else if (ev.startsWith('zap:')) {
        this.onZap(ev.slice(4).split(',').map(Number), cols);
      } else if (ev.startsWith('counter:')) {
        this.onCounter(parseInt(ev.split(':')[1], 10) || 1, cols, s.board.length / cols);
      } else if (ev === 'garbage') {
        this.shake(4, 10);
      } else if (ev === 'lost') {
        this.shake(13, 26);
      } else if (ev === 'won') {
        this.confetti(cols);
      }
    }
  }

  private onClear(s: JuiceState, cols: number) {
    const chain = Math.max(1, s.chain);
    const perCell = Math.min(3 + chain, 8);
    const speed = 0.16 + Math.min(chain, 6) * 0.03;

    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const idx of s.clearing) {
      const x = idx % cols;
      const y = Math.floor(idx / cols);
      sx += x + 0.5;
      sy += y + 0.5;
      n++;
      if (this.reduced) continue;

      const c = s.board[idx];
      const color = isStone(c) ? '#9AA3A8' : getPaletteColor(colorOf(c))[0];
      for (let k = 0; k < perCell; k++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.4 + Math.random() * 0.9);
        this.addParticle({
          x: x + 0.5,
          y: y + 0.5,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 0.06,
          life: 0,
          max: 26 + Math.floor(Math.random() * 18),
          size: 0.09 + Math.random() * 0.1,
          color,
        });
      }
    }

    if (chain >= 2 && n > 0) {
      const cx = Math.min(Math.max(sx / n, 1.6), cols - 1.6);
      this.pops.push({
        text: `x${chain}`,
        x: cx,
        y: sy / n,
        life: 0,
        max: 50,
        color: chainColor(chain),
        size: Math.min(0.9 + chain * 0.12, 1.8),
      });
      this.shake(Math.min(2 + chain * 1.6, 10), 8 + Math.min(chain, 6) * 2);
    } else {
      this.shake(1.2, 5);
    }
  }

  /** Güçlendirici kullanıldı: adını göster. */
  private onPower(name: string, cols: number, rows: number) {
    const info: Record<string, [string, string]> = {
      strike: ['⚡ YILDIRIM!', '#FFE600'],
      shield: ['🛡️ KALKAN', '#4FC3F7'],
      joker: ['🌈 JOKER', '#FF8AD8'],
      cleanse: ['✨ TEMİZLİK', '#5CFFE0'],
    };
    const [text, color] = info[name] ?? [name.toUpperCase(), '#FFFFFF'];
    this.announce(text, cols, rows, color, 1.0);
    this.shake(name === 'strike' ? 6 : 2.5, name === 'strike' ? 14 : 8);
  }

  /** Ortak tahtada yıldırım: vurulan virüslerde elektrik kıvılcımları. */
  private onZap(cells: number[], cols: number) {
    if (this.reduced) return;
    for (const idx of cells) {
      if (!Number.isFinite(idx)) continue;
      const x = (idx % cols) + 0.5;
      const y = Math.floor(idx / cols) + 0.5;
      for (let k = 0; k < 12; k++) {
        const a = Math.random() * Math.PI * 2;
        this.addParticle({
          x, y,
          vx: Math.cos(a) * 0.22,
          vy: Math.sin(a) * 0.22,
          life: 0,
          max: 20 + Math.floor(Math.random() * 10),
          size: 0.1,
          color: k % 2 ? '#FFE600' : '#FFFFFF',
        });
      }
    }
  }

  /** Karşı saldırı: gelen çöp iptal edildi. */
  private onCounter(n: number, cols: number, rows: number) {
    this.announce(`BLOK -${n}`, cols, rows, '#4FC3F7', 1.1);
    this.shake(3, 8);
    if (this.reduced) return;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      this.addParticle({
        x: cols / 2,
        y: rows * 0.4,
        vx: Math.cos(a) * 0.2,
        vy: Math.sin(a) * 0.2,
        life: 0,
        max: 24,
        size: 0.12,
        color: '#4FC3F7',
      });
    }
  }

  /** Tahtanın ortasında kısa bir yazı göster (mod değişimi, bilgi vb.). */
  announce(text: string, cols: number, rows: number, color = '#FFFFFF', size = 0.9) {
    this.pops.push({ text, x: cols / 2, y: rows * 0.4, life: 0, max: 55, color, size });
  }

  private confetti(cols: number) {
    if (this.reduced) return;
    const colors = ['#E8453C', '#F2C53D', '#3FA9F5', '#4CAF50', '#9C27B0', '#FF9800'];
    for (let i = 0; i < 90; i++) {
      this.addParticle({
        x: Math.random() * cols,
        y: -0.5,
        vx: (Math.random() - 0.5) * 0.08,
        vy: 0.04 + Math.random() * 0.12,
        life: 0,
        max: 70 + Math.floor(Math.random() * 40),
        size: 0.1 + Math.random() * 0.12,
        color: colors[i % colors.length],
      });
    }
  }

  private addParticle(p: Particle) {
    if (this.parts.length >= MAX_PARTICLES) this.parts.shift();
    this.parts.push(p);
  }

  private shake(mag: number, frames: number) {
    if (this.reduced) return;
    // daha güçlü bir sarsıntı varsa onu ezme
    const currentMag = this.shakeLeft > 0 ? this.shakeMag * (this.shakeLeft / this.shakeTotal) : 0;
    if (mag < currentMag) return;
    this.shakeMag = mag;
    this.shakeLeft = frames;
    this.shakeTotal = frames;
  }

  /** Çizim karesi başına bir kez çağır. */
  update() {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life++;
      if (p.life >= p.max) {
        this.parts.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vy += GRAVITY;
      p.vx *= 0.985;
    }
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.life++;
      if (p.life >= p.max) {
        this.pops.splice(i, 1);
        continue;
      }
      p.y -= 0.018;
    }
    if (this.shakeLeft > 0) this.shakeLeft--;
  }

  /** drawBoard'dan SONRA çağır. ctx, CSS piksel koordinatlarında olmalı (drawBoard ile aynı). */
  draw(ctx: CanvasRenderingContext2D, cellSize: number, cols: number) {
    if (this.parts.length === 0 && this.pops.length === 0) return;
    ctx.save();

    for (const p of this.parts) {
      const t = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, Math.min(1, t * 1.4));
      ctx.fillStyle = p.color;
      const sz = p.size * cellSize * (0.6 + 0.4 * t);
      ctx.fillRect(p.x * cellSize - sz / 2, p.y * cellSize - sz / 2, sz, sz);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const p of this.pops) {
      const t = p.life / p.max;
      const pop = 1 + 0.35 * Math.max(0, 1 - t * 7); // başta büyüyüp yerine oturur
      const alpha = t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1;
      const px = Math.max(10, p.size * cellSize * pop);
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${px}px system-ui, sans-serif`;
      ctx.lineWidth = Math.max(3, px * 0.16);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.fillStyle = p.color;
      const x = Math.min(Math.max(p.x * cellSize, px), cols * cellSize - px);
      ctx.strokeText(p.text, x, p.y * cellSize);
      ctx.fillText(p.text, x, p.y * cellSize);
    }

    ctx.restore();
  }

  /** Sarsıntıyı canvas öğesine CSS transform olarak uygular (çizimi etkilemez). */
  applyShake(canvas: HTMLCanvasElement | null) {
    if (!canvas) return;
    if (this.shakeLeft > 0) {
      const k = this.shakeLeft / this.shakeTotal;
      const m = this.shakeMag * k;
      const dx = (Math.random() * 2 - 1) * m;
      const dy = (Math.random() * 2 - 1) * m;
      canvas.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
      this.shaking = true;
    } else if (this.shaking) {
      canvas.style.transform = '';
      this.shaking = false;
    }
  }
}
