import { Rng } from '@pill/game-core/dist/rng.js';
import { COLS, ROWS, EMPTY, cell, isVirus, isStone, isBomb, isCapsule, hasLock, removeLock, addLock, colorOf, kindOf, toSingle, partnerDelta, KIND_VIRUS, KIND_STONE, KIND_BOMB, KIND_SINGLE, KIND_LEFT, KIND_RIGHT, KIND_UP, KIND_DOWN, MAX_COLORS, MATCH_LEN, gravityFrames, LOCK_DELAY, CLEAR_ANIM_FRAMES, FALL_STEP_FRAMES, SPAWN_DELAY, DAS_DELAY, DAS_REPEAT, SOFT_DROP_FRAMES } from '@pill/game-core/dist/constants.js';
import { Phase, Input } from '@pill/game-core/dist/sim.js';
import type { MatchConfig, Capsule, AttackInfo, PendingGarbage } from '@pill/game-core/dist/sim.js';

// Dummy Coop implementation to begin with
export function createCoopGame() {}
