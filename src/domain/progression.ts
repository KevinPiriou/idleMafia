//import type { SaveState } from "./types";
import {
  TIME_XP_RATE,
  XP_PER_CASH_PER_SEC,
  XP_PER_DOLLAR_SPENT,
  XP_PER_UPGRADE_DOLLAR,
  XP_PER_INFLUENCE_DOLLAR,
} from "./balance";
import { xpForLevel } from "./economy";

/**
 * Calcule l'XP gagnée pendant dt (s), en recopiant fidèlement la logique de MafiaIdleGame.tsx :
 * - XP passive par le temps
 * - XP sur la production ($/s)
 * - XP sur les dépenses (générateurs, upgrades, influence)
 * NOTE: Les montants "spent" doivent être fournis par l'appelant (le fichier principal pour l'instant).
 */
export function computeXpDelta(params: {
  dt: number;
  cashPerSec: number;
  dollarsSpentGenerators?: number;
  dollarsSpentUpgrades?: number;
  dollarsSpentInfluence?: number;
}): number {
  const {
    dt,
    cashPerSec,
    dollarsSpentGenerators = 0,
    dollarsSpentUpgrades = 0,
    dollarsSpentInfluence = 0,
  } = params;

  const timeXp = TIME_XP_RATE * dt;
  const prodXp = XP_PER_CASH_PER_SEC * cashPerSec * dt;
  const spentXp =
    XP_PER_DOLLAR_SPENT * dollarsSpentGenerators +
    XP_PER_UPGRADE_DOLLAR * dollarsSpentUpgrades +
    XP_PER_INFLUENCE_DOLLAR * dollarsSpentInfluence;

  return timeXp + prodXp + spentXp;
}

/**
 * Applique les passages de niveau successifs tant que l'XP est suffisante.
 * Renvoie le nouveau niveau, l'XP restante, et combien de niveaux ont été gagnés.
 */
export function applyLevelUps(
  xp: number,
  level: number
): {
  xp: number;
  level: number;
  levelsGained: number;
} {
  let lv = level;
  let currXp = xp;
  let gained = 0;
  while (currXp >= xpForLevel(lv)) {
    currXp -= xpForLevel(lv);
    lv += 1;
    gained += 1;
  }
  return { xp: currXp, level: lv, levelsGained: gained };
}
