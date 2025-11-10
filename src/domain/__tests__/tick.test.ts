import { describe, it, expect } from "vitest";
import { applyTick } from "../sim/tick";
import { defaultGenerators, defaultUpgrades } from "../defaults";
import { defaultStaff } from "../staff";
import type { SaveState, GeneratorKey, Generator } from "../types";

function makeFreshState(): SaveState {
  const gensRaw = defaultGenerators();
  const gens: Record<GeneratorKey, Generator> = Array.isArray(gensRaw)
    ? (gensRaw as Generator[]).reduce<Record<GeneratorKey, Generator>>(
        (acc: Record<GeneratorKey, Generator>, g: Generator) => {
          acc[g.key as GeneratorKey] = g;
          return acc;
        },
        {} as Record<GeneratorKey, Generator>
      )
    : (gensRaw as Record<GeneratorKey, Generator>);

  return {
    cash: 0,
    respect: 0,
    heat: 0,
    level: 1,
    xp: 0,
    tension: 0,
    heatMitigationPerSec: 0,
    prestigePoints: 0,
    prestigeMult: 1,
    gens,
    upgrades: defaultUpgrades(),
    staff: defaultStaff(),
    assignments: {},
    inventory: { weapons: [], vehicles: [], contracts: 0 },
    equipped: {},
    families: [],
    lastSave: Date.now(),
    tempGlobalBuffUntil: undefined,
  };
}

describe("applyTick", () => {
  it("ne produit pas de NaN / Infinity et garde les bornes de chaleur", () => {
    const s0 = makeFreshState();
    const s1 = applyTick(s0, 1);
    expect(Number.isFinite(s1.cash)).toBe(true);
    expect(Number.isFinite(s1.respect)).toBe(true);
    expect(Number.isFinite(s1.xp ?? 0)).toBe(true);
    expect(s1.heat).toBeGreaterThanOrEqual(0);
    expect(s1.heat).toBeLessThanOrEqual(100);
  });

  it("accumule l'XP dans le temps", () => {
    let s = makeFreshState();
    s = applyTick(s, 5);
    expect(s.xp ?? 0).toBeGreaterThan(0);
  });
});
