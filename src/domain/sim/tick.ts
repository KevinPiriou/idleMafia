import type { SaveState } from "../types";
import {
  clamp,
  TIME_XP_RATE,
  XP_PER_CASH_PER_SEC,
  TENSION_DECAY_PER_SECOND,
} from "../balance";
import { computeTick, computeProduction, xpForLevel } from "../economy";

/**
 * Fonction pure : applique un pas de temps au state.
 * AUCUN effet de bord (pas de Date.now ici, pas d'audio/DOM).
 */
export function applyTick(state: SaveState, dt: number): SaveState {
  const clampedDt = Math.min(Math.max(dt, 0), 60);

  const { cashDelta, respectDelta, heatDelta } = computeTick(state, clampedDt);
  const next: SaveState = {
    ...state,
    cash: state.cash + cashDelta,
    respect: state.respect + respectDelta,
    heat: clamp(state.heat + heatDelta, 0, 100),
  };

  // Apply tension passive decay (15% per second)
  const currentTension = state.tension || 0;
  const decayAmount = currentTension * TENSION_DECAY_PER_SECOND * clampedDt;
  next.tension = clamp(currentTension - decayAmount, 0, 100);

  // XP depuis le temps + revenus
  const xpFromTime = TIME_XP_RATE * clampedDt;
  const cashPerSec = computeProduction(state).cashPerSec;
  const xpFromRevenue = cashPerSec * XP_PER_CASH_PER_SEC * clampedDt;

  next.xp = (state.xp ?? 0) + xpFromTime + xpFromRevenue;
  next.level = state.level ?? 1;

  while (next.xp >= xpForLevel(next.level)) {
    next.xp -= xpForLevel(next.level);
    next.level += 1;
  }

  // Déverrouillage si la chaleur a assez baissé
  if (
    next.actionLockedUntilHeat != null &&
    next.heat <= next.actionLockedUntilHeat
  ) {
    next.actionLockedUntilHeat = undefined;
  }

  return next;
}
