import type { Generator, GeneratorKey, SaveState, StaffMember } from "./types";
import { clamp, LEVEL_BASE_XP, LEVEL_GROWTH } from "./balance";

// Cost helpers
export const genCost = (g: Generator, qty = 1) => {
  const start = g.owned;
  const r = g.costGrowth;
  const a = g.baseCost * Math.pow(r, start);
  return (a * (Math.pow(r, qty) - 1)) / (r - 1);
};

export const discountedGenCost = (state: SaveState, g: Generator, qty = 1) => {
  const disc = clamp(state.costDiscount || 0, 0, 0.9);
  return genCost(g, qty) * (1 - disc);
};

// Staff bonus on a specific generator
export function staffBonusFor(char: StaffMember, generator: Generator): number {
  const force = char.stats[1];
  const esprit = char.stats[2];
  const reseau = char.stats[3];
  let bonus = 0;
  if (generator.legal) {
    bonus += (esprit / 100) * 0.1; // up to +10%
    bonus += (reseau / 100) * 0.05; // up to +5%
  } else {
    bonus += (force / 100) * 0.15; // up to +15%
    bonus += (reseau / 100) * 0.05; // up to +5%
  }
  return 1 + bonus;
}

export function staffMultiplierForGenerator(
  state: SaveState,
  key: GeneratorKey
): number {
  const g = state.gens[key];
  const assignedIds = Object.keys(state.assignments).filter(
    (cid) => state.assignments[cid] === key
  );
  let mult = 1;
  assignedIds.forEach((cid) => {
    const s = state.staff.find((m) => m.id === cid);
    if (s) mult *= staffBonusFor(s, g);
  });
  return mult;
}

export function familyMultiplierForGenerator(
  state: SaveState,
  key: GeneratorKey
): number {
  const g = state.gens[key];
  let bonusAdd = 0; // additive percent as (1 + bonusAdd)
  const peaceCount = state.families.filter((f) => f.state === "peace").length;
  if (peaceCount > 0) {
    bonusAdd += g.legal ? 0.1 * peaceCount : 0.05 * peaceCount;
  }
  const warCount = state.families.filter((f) => f.state === "war").length;
  if (warCount > 0 && !g.legal) {
    bonusAdd += 0.25 * warCount;
  }
  state.families.forEach((f) => {
    if (f.state === "partnership" && f.partnershipSectors.includes(key)) {
      bonusAdd += 0.1;
    }
  });
  return 1 + Math.max(0, bonusAdd);
}

export function familyRespectMultiplier(): number {
  return 1; // specification: peace/partnership no direct respect; war handled on resolve
}

export function totalLocalMult(state: SaveState, key: GeneratorKey) {
  let m = 1;
  Object.values(state.upgrades).forEach((u) => {
    if (u.owned && u.target === key) m *= u.mult;
  });
  m *= staffMultiplierForGenerator(state, key);
  m *= familyMultiplierForGenerator(state, key);
  if (state.tempGlobalBuffUntil && Date.now() < state.tempGlobalBuffUntil) {
    m *= 1.5; // +50% temporary war win buff
  }
  return m;
}

export function totalGlobalMult(state: SaveState) {
  let m = 1;
  Object.values(state.upgrades).forEach((u) => {
    if (u.owned && u.target === "global") m *= u.mult;
  });
  if (state.permaGlobalMult && state.permaGlobalMult > 0)
    m *= state.permaGlobalMult;
  return m;
}

export function prodPerUnit(state: SaveState, key: GeneratorKey) {
  const g = state.gens[key];
  return (
    g.baseProd *
    totalGlobalMult(state) *
    totalLocalMult(state, key) *
    state.prestigeMult
  );
}

export function computeProduction(state: SaveState) {
  let cashPerSec = 0,
    heatPerSec = 0,
    respectPerSec = 0;
  (Object.keys(state.gens) as GeneratorKey[]).forEach((key) => {
    const g = state.gens[key];
    const unit = prodPerUnit(state, key);
    cashPerSec += unit * g.owned;
    heatPerSec += g.baseHeat * g.owned;
  });
  let respectBase =
    Math.log10(1 + cashPerSec) * 0.5 * (1 - clamp(state.heat / 200, 0, 0.5));
  respectBase *= familyRespectMultiplier();
  respectPerSec = respectBase;
  if (state.heat >= 100) {
    cashPerSec = Math.max(0, cashPerSec - cashPerSec * 0.8);
    respectPerSec = Math.max(0, respectPerSec - respectPerSec * 0.8);
  }
  return { cashPerSec, heatPerSec, respectPerSec };
}

export function computeTick(state: SaveState, dt: number) {
  const { cashPerSec, heatPerSec, respectPerSec } = computeProduction(state);
  return {
    cashDelta: cashPerSec * dt,
    respectDelta: respectPerSec * dt,
    heatDelta:
      heatPerSec * dt * 0.2 - 0.05 * dt - state.heatMitigationPerSec * dt,
  };
}

export function revenuePerSecForKey(state: SaveState, key: GeneratorKey) {
  const g = state.gens[key];
  return prodPerUnit(state, key) * g.owned;
}

// Level XP helper (kept pure here for reuse)
export function xpForLevel(level: number) {
  return Math.floor(
    LEVEL_BASE_XP * Math.pow(LEVEL_GROWTH, Math.max(0, level - 1))
  );
}
