import { io, Socket } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL || `http://${location.hostname}:3001`;

export const socket: Socket = io(URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
});

/** Sunucu saatiyle aramızdaki fark (ms). startAt hesaplarken kullanılır. */
let clockOffset = 0;
let rtt = 0;
const samples: Array<{ offset: number; rtt: number }> = [];

export function getClockOffset() {
  return clockOffset;
}
export function getRtt() {
  return rtt;
}
export function serverNow() {
  return Date.now() + clockOffset;
}

export function startClockSync() {
  const send = () => {
    if (!socket.connected) return;
    socket.emit('ping', { t0: Date.now() });
  };
  socket.on('pong', ({ t0, t1 }: { t0: number; t1: number }) => {
    const t2 = Date.now();
    const r = t2 - t0;
    // sunucu saati t1 iken bizde (t0+t2)/2 idi
    const off = t1 - (t0 + t2) / 2;
    samples.push({ offset: off, rtt: r });
    if (samples.length > 9) samples.shift();
    // medyan al — tek seferlik ağ sıçramalarına dayanıklı
    const sorted = [...samples].sort((a, b) => a.offset - b.offset);
    clockOffset = sorted[Math.floor(sorted.length / 2)].offset;
    rtt = [...samples].sort((a, b) => a.rtt - b.rtt)[Math.floor(samples.length / 2)].rtt;
  });

  // ilk 5 ölçüm hızlı, sonra her 10 saniyede bir
  let count = 0;
  const fast = setInterval(() => {
    send();
    if (++count >= 5) {
      clearInterval(fast);
      setInterval(send, 10000);
    }
  }, 250);
}

export function connect(name: string) {
  if (!socket.connected) socket.connect();
  const token = localStorage.getItem('pill.token') || undefined;
  socket.emit('hello', { name, token });
}

/**
 * Ağ kopup Socket.IO kendiliğinden yeniden bağlandığında da aynı oturumla
 * (token) tekrar 'hello' gönder — yoksa sunucu bizi tanımaz, oyuncu maçtan
 * düşmüş sayılır. Uygulama açılışında bir kez çağrılır.
 */
export function attachAutoRehello() {
  socket.on('connect', () => {
    const name = localStorage.getItem('pill.name');
    const token = localStorage.getItem('pill.token');
    // sadece daha önce bir oturum kurulmuşsa (ilk giriş değilse) otomatik yenile;
    // ilk girişte connect() zaten kendi hello'sunu gönderiyor
    if (name && token) socket.emit('hello', { name, token });
  });
}
