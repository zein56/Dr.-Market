import { Input } from '@pill/game-core';

export type InputSink = (input: Input) => void;

/**
 * Klavye: ok tuşları + Z/X döndürme, boşluk hard drop.
 * Tekrarları oyun motoru (DAS) yönetir, tarayıcı auto-repeat'i yok sayılır.
 */
export function attachKeyboard(sink: InputSink): () => void {
  const down = new Set<string>();

  const onDown = (e: KeyboardEvent) => {
    if (down.has(e.code)) return;
    let handled = true;
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        sink(Input.Left);
        break;
      case 'ArrowRight':
      case 'KeyD':
        sink(Input.Right);
        break;
      case 'ArrowUp':
      case 'KeyX':
        sink(Input.RotateCW);
        break;
      case 'KeyZ':
      case 'ControlLeft':
        sink(Input.RotateCCW);
        break;
      case 'ArrowDown':
      case 'KeyS':
        sink(Input.SoftDropOn);
        break;
      case 'Space':
        sink(Input.HardDrop);
        break;
      default:
        handled = false;
    }
    if (handled) {
      down.add(e.code);
      e.preventDefault();
    }
  };

  const onUp = (e: KeyboardEvent) => {
    down.delete(e.code);
    if (e.code === 'ArrowDown' || e.code === 'KeyS') sink(Input.SoftDropOff);
    if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) sink(Input.SoftDropOff);
  };

  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  return () => {
    window.removeEventListener('keydown', onDown);
    window.removeEventListener('keyup', onUp);
  };
}

/**
 * Dokunmatik: yatay sürükle = adım adım hareket, tek dokunuş = döndür,
 * aşağı sürükle = hızlı düşür, hızlı aşağı fırlat = anında bırak.
 */
export function attachTouch(el: HTMLElement, sink: InputSink): () => void {
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let startT = 0;
  let moved = false;
  let softOn = false;
  
  const getStep = () => {
    const canvas = el.querySelector('canvas.board-canvas');
    if (canvas) return Math.max(12, canvas.clientWidth / 8);
    return 26;
  };

  const onStart = (e: TouchEvent) => {
    const t = e.touches[0];
    startX = lastX = t.clientX;
    startY = t.clientY;
    startT = performance.now();
    moved = false;
    softOn = false;
  };

  const onMove = (e: TouchEvent) => {
    const t = e.touches[0];
    const dx = t.clientX - lastX;
    const dyTotal = t.clientY - startY;

    const step = getStep();
    while (Math.abs(dx) >= step || Math.abs(t.clientX - lastX) >= step) {
      const dir = t.clientX - lastX;
      if (Math.abs(dir) < step) break;
      sink(dir > 0 ? Input.Right : Input.Left);
      lastX += dir > 0 ? step : -step;
      moved = true;
    }

    if (dyTotal > 30 && Math.abs(t.clientX - startX) < 40) {
      if (!softOn) {
        sink(Input.SoftDropOn);
        softOn = true;
        moved = true;
      }
    }
    e.preventDefault();
  };

  const onEnd = (e: TouchEvent) => {
    const dt = performance.now() - startT;
    const touch = e.changedTouches[0];
    const dy = touch.clientY - startY;
    const dx = Math.abs(touch.clientX - startX);

    // Her türlü kaydırma bitişinde (yatay veya dikey) DAS'ı (otomatik kaymayı) durdur
    if (softOn || moved) sink(Input.SoftDropOff);

    // hızlı aşağı fırlatma = hard drop (daha belirgin eşik)
    if (!softOn && dy > 80 && dt < 250 && dx < 40) {
      sink(Input.HardDrop);
      return;
    }
    // kısa dokunuş = döndür (sol/sağ ekrana göre)
    if (!moved && dt < 250 && dx < 14 && Math.abs(dy) < 14) {
      const isLeft = touch.clientX < window.innerWidth / 2;
      sink(isLeft ? Input.RotateCCW : Input.RotateCW);
    }
  };

  el.addEventListener('touchstart', onStart, { passive: false });
  el.addEventListener('touchmove', onMove, { passive: false });
  el.addEventListener('touchend', onEnd, { passive: false });
  el.addEventListener('touchcancel', onEnd, { passive: false });

  return () => {
    el.removeEventListener('touchstart', onStart);
    el.removeEventListener('touchmove', onMove);
    el.removeEventListener('touchend', onEnd);
    el.removeEventListener('touchcancel', onEnd);
  };
}

/** Ekran altındaki sanal butonlar için basılı tutma yardımcısı */
export function holdable(sink: InputSink, onInput: Input, offInput?: Input) {
  return {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      sink(onInput);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      if (offInput != null) sink(offInput);
    },
    onPointerCancel: () => {
      if (offInput != null) sink(offInput);
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}
