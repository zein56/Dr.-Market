/**
 * Deterministik PRNG (xorshift128).
 * Math.random() bu paketin HİÇBİR yerinde kullanılmaz — determinizm bozulur,
 * sunucu tarafı replay doğrulaması çalışmaz.
 */
export class Rng {
  private x = 0;
  private y = 0;
  private z = 0;
  private w = 0;

  constructor(seed: number) {
    // seed'i 4 state word'e dağıt (splitmix benzeri)
    let s = seed >>> 0;
    const next = () => {
      s = (s + 0x9e3779b9) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 16), 0x21f0aaad) >>> 0;
      t = Math.imul(t ^ (t >>> 15), 0x735a2d97) >>> 0;
      return (t ^ (t >>> 15)) >>> 0;
    };
    this.x = next() || 1;
    this.y = next() || 2;
    this.z = next() || 3;
    this.w = next() || 4;
  }

  /** 32-bit işaretsiz sonraki değer */
  next(): number {
    const t = this.x ^ (this.x << 11);
    this.x = this.y;
    this.y = this.z;
    this.z = this.w;
    this.w = (this.w ^ (this.w >>> 19)) ^ (t ^ (t >>> 8));
    return this.w >>> 0;
  }

  /** [0, n) aralığında tamsayı */
  int(n: number): number {
    return this.next() % n;
  }

  clone(): Rng {
    const r = new Rng(1);
    r.x = this.x;
    r.y = this.y;
    r.z = this.z;
    r.w = this.w;
    return r;
  }

  state(): [number, number, number, number] {
    return [this.x, this.y, this.z, this.w];
  }

  restore(s: [number, number, number, number]) {
    [this.x, this.y, this.z, this.w] = s;
  }
}

/** String seed -> 32 bit sayı (oda kodundan seed türetmek için) */
export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
