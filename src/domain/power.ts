import type { SaveState, Family } from "./types";
export function computeWarPower(state: SaveState): number {
  const inv = state.inventory || { weapons: [], vehicles: [], contracts: 0 };
  const eq = state.equipped || {};
  let power = 0;
  Object.values(eq).forEach((wid) => {
    if (!wid) return;
    const item = inv.weapons.find((w) => w.id === wid);
    if (item) power += item.bonusPower;
  });
  return power;
}

export function computeFamilyScore(f: Family): number {
  const e = f.econ || {
    cash: 0,
    respect: 0,
    members: 0,
    weapons: 0,
    vehicles: 0,
  };
  return (
    e.cash / 10000 +
    e.respect / 500 +
    e.members / 50 +
    e.weapons * 2 +
    e.vehicles * 1.5
  );
}

export function computeCompositePower(state: SaveState): number {
  const inv = state.inventory || { weapons: [], vehicles: [], contracts: 0 };
  const staffCount = state.staff.length;
  return (
    state.cash / 10000 +
    state.respect / 500 +
    staffCount / 50 +
    inv.weapons.length * 2 +
    inv.vehicles.length * 1.5
  );
}
