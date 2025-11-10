import type { SaveState, GeneratorKey } from "../domain/types";
import {
  computeProduction,
  revenuePerSecForKey,
  prodPerUnit,
} from "../domain/economy";

/** Mémo 1-argument : mémoïse la dernière valeur tant que l'objet state est === (réf) */
function memo1<A, R>(fn: (a: A) => R) {
  let lastA: A | undefined;
  let lastR: R | undefined;
  return (a: A): R => {
    if (a === lastA) return lastR as R;
    lastA = a;
    lastR = fn(a);
    return lastR as R;
  };
}

export const selectProduction = memo1((s: SaveState) => computeProduction(s));

export const selectCashPerSec = (s: SaveState) =>
  selectProduction(s).cashPerSec;
export const selectRespectPerSec = (s: SaveState) =>
  selectProduction(s).respectPerSec;
export const selectHeatPerSec = (s: SaveState) =>
  selectProduction(s).heatPerSec;

export const selectRevenuePerSecForKey = (s: SaveState, key: GeneratorKey) =>
  revenuePerSecForKey(s, key);

export const selectGenSorted = memo1((s: SaveState) => {
  const entries = (Object.keys(s.gens) as GeneratorKey[]).map((key) => {
    const g = s.gens[key];
    const unit = prodPerUnit(s, key);
    const revenue = unit * g.owned;
    return { key, g, unit, revenue };
  });
  entries.sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = Math.max(0.0001, ...entries.map((e) => e.revenue));
  return { entries, maxRevenue };
});
