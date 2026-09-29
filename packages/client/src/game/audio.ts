/**
 * Ses motoru. Hiçbir ses dosyası yok — hepsi WebAudio ile sentezleniyor.
 * Melodiler özgün; telifli parça kullanılmıyor.
 * iOS kuralı: AudioContext ilk kullanıcı dokunuşunda başlatılmalı.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicTimer: number | null = null;
let musicOn = true;
let sfxOn = true;
let musicPaused = false;

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);

  musicGain = ctx.createGain();
  musicGain.gain.value = 0.32;
  musicGain.connect(master);

  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.7;
  sfxGain.connect(master);
}

export function setMusicEnabled(on: boolean) {
  musicOn = on;
  if (musicGain && ctx) musicGain.gain.setTargetAtTime(on ? 0.32 : 0, ctx.currentTime, 0.05);
  if (!on) stopMusic();
}

export function setSfxEnabled(on: boolean) {
  sfxOn = on;
  if (sfxGain && ctx) sfxGain.gain.value = on ? 0.7 : 0;
}

export function isMusicEnabled() {
  return musicOn;
}
export function isSfxEnabled() {
  return sfxOn;
}

function note(freq: number, start: number, dur: number, type: OscillatorType, gain: number, dest: GainNode) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(dest);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noise(start: number, dur: number, gain: number, filterHz: number) {
  if (!ctx || !sfxGain) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filterHz;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f);
  f.connect(g);
  g.connect(sfxGain);
  src.start(start);
}

// --- Ses efektleri ---

const N = (n: number) => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz

export function sfx(name: string) {
  if (!ctx || !sfxGain || !sfxOn) return;
  const t = ctx.currentTime;
  switch (name) {
    case 'move':
      note(N(72), t, 0.045, 'square', 0.12, sfxGain);
      break;
    case 'rotate':
      note(N(76), t, 0.05, 'square', 0.14, sfxGain);
      note(N(83), t + 0.03, 0.05, 'square', 0.1, sfxGain);
      break;
    case 'lock':
      note(N(55), t, 0.09, 'triangle', 0.2, sfxGain);
      noise(t, 0.06, 0.08, 800);
      break;
    case 'clear':
      [79, 84, 88].forEach((n, i) => note(N(n), t + i * 0.045, 0.14, 'square', 0.16, sfxGain!));
      break;
    case 'chain':
      [79, 84, 88, 91, 96].forEach((n, i) =>
        note(N(n), t + i * 0.05, 0.18, 'square', 0.18, sfxGain!)
      );
      break;
    case 'virus':
      note(N(64), t, 0.12, 'sawtooth', 0.14, sfxGain);
      note(N(52), t + 0.06, 0.16, 'sawtooth', 0.12, sfxGain);
      break;
    case 'garbage':
      noise(t, 0.18, 0.16, 400);
      note(N(43), t, 0.2, 'square', 0.14, sfxGain);
      break;
    case 'won':
      [72, 76, 79, 84, 88, 91].forEach((n, i) =>
        note(N(n), t + i * 0.1, 0.4, 'square', 0.2, sfxGain!)
      );
      break;
    case 'lost':
      [67, 64, 60, 55, 48].forEach((n, i) =>
        note(N(n), t + i * 0.13, 0.35, 'sawtooth', 0.18, sfxGain!)
      );
      break;
    case 'countdown':
      note(N(76), t, 0.1, 'square', 0.22, sfxGain);
      break;
    case 'go':
      note(N(88), t, 0.35, 'square', 0.25, sfxGain);
      break;
    case 'click':
      note(N(84), t, 0.04, 'square', 0.1, sfxGain);
      break;
    case 'penalty_spawn':
      // Düşük tonlu, uyarıcı bir ses
      note(N(45), t, 0.15, 'triangle', 0.2, sfxGain);
      note(N(40), t + 0.15, 0.2, 'sawtooth', 0.2, sfxGain);
      break;
    case 'explosion':
      // Büyük patlama, beyaz gürültü + derin bass
      noise(t, 0.3, 0.3, 200);
      note(N(35), t, 0.4, 'square', 0.25, sfxGain);
      note(N(30), t, 0.4, 'triangle', 0.3, sfxGain);
      break;
  }
}

// --- Müzik: özgün 16 ölçülük döngü, iki tema ---

interface Track {
  bpm: number;
  lead: Array<[number | null, number]>; // [midi, süre(beat)]
  bass: Array<[number | null, number]>;
}

const THEME_A: Track = {
  bpm: 148,
  lead: [
    [69, 0.5], [76, 0.5], [74, 0.5], [72, 0.5],
    [69, 0.5], [72, 0.5], [76, 1],
    [71, 0.5], [78, 0.5], [76, 0.5], [74, 0.5],
    [71, 0.5], [74, 0.5], [78, 1],
    [72, 0.5], [79, 0.5], [77, 0.5], [76, 0.5],
    [74, 0.5], [76, 0.5], [77, 1],
    [76, 0.5], [74, 0.5], [72, 0.5], [71, 0.5],
    [69, 1.5], [null, 0.5],
  ],
  bass: [
    [45, 1], [45, 0.5], [52, 0.5], [45, 1], [48, 1],
    [47, 1], [47, 0.5], [54, 0.5], [47, 1], [50, 1],
    [48, 1], [48, 0.5], [55, 0.5], [48, 1], [52, 1],
    [45, 1], [52, 1], [45, 1], [40, 1],
  ],
};

const THEME_B: Track = {
  bpm: 132,
  lead: [
    [64, 1], [67, 0.5], [71, 0.5], [72, 1], [71, 1],
    [67, 1], [64, 0.5], [62, 0.5], [64, 2],
    [65, 1], [69, 0.5], [72, 0.5], [74, 1], [72, 1],
    [69, 1], [65, 0.5], [64, 0.5], [62, 2],
  ],
  bass: [
    [40, 2], [45, 2], [43, 2], [38, 2],
    [41, 2], [45, 2], [43, 2], [36, 2],
  ],
};

let currentTheme: 'a' | 'b' = 'a';

export function setTheme(t: 'a' | 'b') {
  currentTheme = t;
}

export function startMusic() {
  if (!ctx || !musicGain || !musicOn) return;
  stopMusic();
  const track = currentTheme === 'a' ? THEME_A : THEME_B;
  const beat = 60 / track.bpm;

  const scheduleLoop = () => {
    if (!ctx || !musicGain) return;
    const start = ctx.currentTime + 0.05;

    let t = start;
    for (const [n, d] of track.lead) {
      if (n != null) note(N(n), t, beat * d * 0.85, 'square', 0.2, musicGain);
      t += beat * d;
    }
    const leadEnd = t;

    t = start;
    for (const [n, d] of track.bass) {
      if (n != null) note(N(n), t, beat * d * 0.9, 'triangle', 0.24, musicGain);
      t += beat * d;
    }

    // hi-hat
    const total = Math.max(leadEnd, t) - start;
    for (let k = 0; k * beat * 0.5 < total; k++) {
      noiseMusic(start + k * beat * 0.5, 0.03, k % 2 === 0 ? 0.05 : 0.03);
    }

    const loopMs = (leadEnd - ctx.currentTime) * 1000;
    musicTimer = window.setTimeout(scheduleLoop, Math.max(200, loopMs - 120));
  };

  scheduleLoop();
}

function noiseMusic(start: number, dur: number, gain: number) {
  if (!ctx || !musicGain) return;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 6000;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f);
  f.connect(g);
  g.connect(musicGain);
  src.start(start);
}

export function stopMusic() {
  if (musicTimer != null) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
  musicPaused = false;
}

export function pauseMusic() {
  if (musicPaused) return;
  musicPaused = true;
  if (musicTimer != null) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
  if (ctx && ctx.state === 'running') ctx.suspend();
}

export function resumeMusic() {
  if (!musicPaused) return;
  musicPaused = false;
  if (ctx && ctx.state === 'suspended') ctx.resume();
  // scheduleLoop'u yeniden başlatmak için startMusic'i çağır
  startMusic();
}

export function suspendAudio() {
  if (ctx && ctx.state === 'running') ctx.suspend();
}
export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}
