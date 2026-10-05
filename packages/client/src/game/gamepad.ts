import { Input } from '@pill/game-core';
import type { InputSink } from './controls';

/**
 * Standard Gamepad API layout (Xbox/PS/8BitDo vb.)
 * https://w3c.github.io/gamepad/#remapping
 *
 * 0  = A / Cross       → RotateCW
 * 1  = B / Circle      → RotateCCW
 * 2  = X / Square      → HardDrop
 * 3  = Y / Triangle    → HardDrop
 * 4  = LB / L1         → RotateCCW
 * 5  = RB / R1         → RotateCW
 * 7  = RT / R2         → HardDrop
 * 12 = D-Pad Up
 * 13 = D-Pad Down      → SoftDrop
 * 14 = D-Pad Left      → Left
 * 15 = D-Pad Right     → Right
 * Axis 0 = Sol Analog X
 * Axis 1 = Sol Analog Y
 */

const BTN_A = 0;
const BTN_B = 1;
const BTN_X = 2;
const BTN_Y = 3;
const BTN_LB = 4;
const BTN_RB = 5;
const BTN_LT = 6;
const BTN_RT = 7;
const BTN_DPAD_DOWN = 13;
const BTN_DPAD_LEFT = 14;
const BTN_DPAD_RIGHT = 15;

const AXIS_LX = 0;
const AXIS_LY = 1;
const AXIS_THRESHOLD = 0.5;

const DAS_DELAY = 12;
const DAS_REPEAT = 3;

export interface GamepadState {
  prevButtons: boolean[];
  dasDir: number;   // -1 | 0 | 1
  dasTimer: number;
  softOn: boolean;
  prevAxisX: number;
  prevAxisY: number;
}

export function createGamepadState(): GamepadState {
  return {
    prevButtons: [],
    dasDir: 0,
    dasTimer: 0,
    softOn: false,
    prevAxisX: 0,
    prevAxisY: 0,
  };
}

const assignedGamepads: Record<number, number> = {};

export function getAssignedGamepadName(playerIndex: number): string | null {
  const index = assignedGamepads[playerIndex];
  if (index === undefined || index === -1) return null;
  const gp = navigator.getGamepads()[index];
  return gp ? gp.id : null;
}

export function getAssignedGamepadIndex(playerIndex: number): number | null {
  const index = assignedGamepads[playerIndex];
  return (index === undefined || index === -1) ? null : index;
}

<<<<<<< HEAD
/**
 * Bu oyuncuya atanmış VE şu an bağlı bir gamepad var mı? (çıkarılmış bir gamepad atanmış
 * kalabilir; o durumda oyuncunun klavyesi kilitlenmemeli)
 */
export function isGamepadActive(playerIndex: number): boolean {
  const idx = getAssignedGamepadIndex(playerIndex);
  if (idx === null) return false;
  try {
    return !!navigator.getGamepads?.()[idx]?.connected;
  } catch {
    return false;
  }
}

=======
>>>>>>> 8a03358edc3fb59fdd6e1ef7159309797daefb51
export function clearGamepadAssignment(playerIndex: number): void {
  delete assignedGamepads[playerIndex];
}

export function manuallyAssignGamepad(playerIndex: number, gamepadIndex: number | null): void {
  if (gamepadIndex === null) {
    assignedGamepads[playerIndex] = -1; // -1 means explicitly set to None (Keyboard), so no auto-assign
  } else {
    assignedGamepads[playerIndex] = gamepadIndex;
  }
}

export function getAllConnectedGamepads(): Gamepad[] {
  return Array.from(navigator.getGamepads()).filter(g => g?.connected) as Gamepad[];
}

/**
 * Her RAF frame'inde **bir kez** çağrılmalı (game step while döngüsü dışında).
 * Okunan inputları doğrudan sink'e gönderir.
 * 
 * playerIndex: 0 = İlk bağlı gamepad, 1 = İkinci bağlı gamepad vb.
 */
export function pollGamepad(
  playerIndex: number,
  sink: InputSink,
  state: GamepadState,
): void {
  const gamepads = navigator.getGamepads();
  if (!gamepads) return;
  
  // Bu oyuncuya atanmış bir gamepad varsa ve bağlıysa onu kullan
  let assignedIndex = assignedGamepads[playerIndex];
  
  if (assignedIndex === -1) {
    return; // Kullanıcı bilerek klavyeyi seçti (gamepad yok)
  }

  const assignedGp = Array.from(gamepads).find(g => g?.index === assignedIndex);

  if (assignedIndex !== undefined && assignedGp?.connected) {
    // atanmış olanı kullan
  } else {
    // Atanmamış bir gamepad bul ve bu oyuncuya ata
    // Başka bir oyuncuya atanmamış ve ÜZERİNDE BİR TUŞA BASILMIŞ olmalı (Bluetooth dummy cihazlarını atlamak için)
    const usedIndices = Object.values(assignedGamepads);
    const availableGamepad = Array.from(gamepads).find(g => 
      g?.connected && 
      !usedIndices.includes(g.index) &&
      g?.buttons?.some(b => b?.pressed)
    );
    
    if (availableGamepad) {
      assignedGamepads[playerIndex] = availableGamepad.index;
      assignedIndex = availableGamepad.index;
      console.log(`🎮 [Oyuncu ${playerIndex + 1}] için Gamepad ${assignedIndex} (${availableGamepad.id}) atandı.`);
    } else {
      return; // Kullanılabilir gamepad yok
    }
  }

  const gp = Array.from(gamepads).find(g => g?.index === assignedIndex);
  if (!gp) return;

  const btns = gp.buttons || [];
  const axes = gp.axes || [];

  // --- Hangi tuşa basıldığını konsola yazdır (Debug için) ---
  for (let i = 0; i < btns.length; i++) {
    const pressedNow = !!btns[i]?.pressed;
    const pressedBefore = !!state.prevButtons[i];
    if (pressedNow && !pressedBefore) {
      console.log(`🎮 [Oyuncu ${playerIndex + 1} - ${gp.id}] Tuşa basıldı: ${i}`);
    }
  }

  const isPressed = (i: number) => !!btns[i]?.pressed;
  const justPressed = (i: number) => isPressed(i) && !(state.prevButtons[i] ?? false);

  // --- Döndürme (tek seferlik) ---
  if (justPressed(BTN_A) || justPressed(BTN_RB)) sink(Input.RotateCW);
  if (justPressed(BTN_B) || justPressed(BTN_LB)) sink(Input.RotateCCW);

  // --- Hard Drop (tek seferlik) ---
  if (justPressed(BTN_X) || justPressed(BTN_Y) || justPressed(BTN_RT)) {
    sink(Input.HardDrop);
  }

  // --- Bomba Kullan (tek seferlik) --- LT (6)
  if (justPressed(BTN_LT)) {
    sink(Input.UseBomb);
  }

  // --- Yatay hareket: D-Pad + Sol Analog ---
  const axisX = axes[AXIS_LX] ?? 0;
  const wantLeft  = isPressed(BTN_DPAD_LEFT)  || axisX < -AXIS_THRESHOLD;
  const wantRight = isPressed(BTN_DPAD_RIGHT) || axisX > AXIS_THRESHOLD;
  const newDir    = wantLeft ? -1 : wantRight ? 1 : 0;

  if (newDir !== 0) {
    if (newDir !== state.dasDir) {
      state.dasDir = newDir;
      state.dasTimer = DAS_DELAY;
      sink(newDir < 0 ? Input.Left : Input.Right);
    } else {
      state.dasTimer--;
      if (state.dasTimer <= 0) {
        state.dasTimer = DAS_REPEAT;
        sink(newDir < 0 ? Input.Left : Input.Right);
      }
    }
  } else if (state.dasDir !== 0) {
    state.dasDir = 0;
    state.dasTimer = 0;
    sink(Input.SoftDropOff);
  }

  // --- Soft Drop: D-Pad Down + Sol Analog Aşağı ---
  const axisY = axes[AXIS_LY] ?? 0;
  const wantDown = isPressed(BTN_DPAD_DOWN) || axisY > AXIS_THRESHOLD;

  if (wantDown && !state.softOn) {
    state.softOn = true;
    sink(Input.SoftDropOn);
  } else if (!wantDown && state.softOn) {
    state.softOn = false;
    sink(Input.SoftDropOff);
  }

  // --- State kaydet ---
  state.prevButtons = Array.from(btns, b => b.pressed);
  state.prevAxisX = axisX;
  state.prevAxisY = axisY;
}

/** Bağlı gamepad sayısı */
export function getConnectedGamepadCount(): number {
  return Array.from(navigator.getGamepads()).filter(g => g?.connected).length;
}

// --- Bağlantı / Kopma Durumlarını Konsola Yazdır ---
if (typeof window !== 'undefined') {
  window.addEventListener("gamepadconnected", (e) => {
    console.log("🟢 OYUN KOLU BAĞLANDI:", e.gamepad.id, "- Yuva (Index):", e.gamepad.index);
  });

  window.addEventListener("gamepaddisconnected", (e) => {
    console.log("🔴 OYUN KOLU ÇIKARILDI:", e.gamepad.id, "- Yuva (Index):", e.gamepad.index);
  });
}
