// === Fonctions familles extraites mot pour mot ===
import type { SaveState, Family } from "./types";

export function defaultFamilies(): Family[] {
  return [
    {
      id: "f1",
      name: "Famiglia d'Oro",
      state: "peace",
      partnershipSectors: [],
      econ: {
        cash: 2500,
        respect: 200,
        members: 24,
        weapons: 2,
        vehicles: 1,
        tier: "normal",
      },
      econFactor: 1.0,
    },
    {
      id: "f2",
      name: "Famiglia del Vino",
      state: "peace",
      partnershipSectors: [],
      econ: {
        cash: 1800,
        respect: 160,
        members: 20,
        weapons: 1,
        vehicles: 1,
        tier: "normal",
      },
      econFactor: 0.9,
    },
    {
      id: "f3",
      name: "Famiglia Smeraldo",
      state: "peace",
      partnershipSectors: [],
      econ: {
        cash: 3000,
        respect: 220,
        members: 26,
        weapons: 2,
        vehicles: 2,
        tier: "normal",
      },
      econFactor: 1.1,
    },
  ];
}

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

export function simulateFamiliesEconomy(
  state: SaveState,
  dt: number,
  playerCashPerSec: number
): Family[] {
  const fams = state.families.map((f) => ({ ...f }));
  const avgWeaponPrice = 4000;
  const avgVehiclePrice = 9000;

  fams.forEach((f, idx) => {
    const econ = f.econ || {
      cash: 0,
      respect: 0,
      members: 10,
      weapons: 0,
      vehicles: 0,
      tier: "normal",
    };

    const factor = Math.max(
      0.6,
      Math.min(1.4, f.econFactor ?? 0.9 + 0.1 * idx)
    );
    let mult = 1;
    if (f.state === "war") mult *= 1.15;
    if (f.state === "partnership") mult *= 1.08;
    const noise = (Math.random() - 0.5) * 0.1; // +/-5%
    const inflow = Math.max(0, playerCashPerSec * factor * mult * (1 + noise));

    econ.cash += inflow * dt;
    if (Math.random() < 0.003 * dt) {
      const good = Math.random() < 0.55;
      if (good) {
        econ.cash += 2000 + Math.random() * 4000;
        econ.respect += 10 + Math.random() * 15;
      } else {
        econ.cash = Math.max(0, econ.cash - (1000 + Math.random() * 5000));
        econ.respect = Math.max(0, econ.respect - (10 + Math.random() * 20));
      }
    }

    if (econ.cash > avgWeaponPrice * 1.2 && Math.random() < 0.004 * dt) {
      econ.cash -= avgWeaponPrice;
      econ.weapons += 1;
    }
    if (econ.cash > avgVehiclePrice * 1.2 && Math.random() < 0.0025 * dt) {
      econ.cash -= avgVehiclePrice;
      econ.vehicles += 1;
    }
    const memberDrift = (0.02 + econ.respect / 10000) * dt;
    if (Math.random() < memberDrift) econ.members += 1;
    if (Math.random() < 0.005 * dt && econ.members > 5) econ.members -= 1;

    econ.respect = Math.max(
      0,
      econ.respect +
        (Math.log10(1 + playerCashPerSec) * 0.05 - state.heat * 0.001) * dt
    );

    if (
      econ.cash <= 0 &&
      econ.respect < 50 &&
      econ.members < 8 &&
      Math.random() < 0.001 * dt
    ) {
      econ.tier = "bankrupt";
      econ.cash = 0;
      econ.weapons = Math.max(0, Math.floor(econ.weapons * 0.5));
      econ.vehicles = Math.max(0, Math.floor(econ.vehicles * 0.5));
    } else if (econ.tier === "bankrupt" && Math.random() < 0.002 * dt) {
      econ.tier = "normal";
      econ.respect += 20;
    }

    f.econ = econ;
  });

  const playerScore = computeCompositePower(state);
  let maxScore = playerScore;
  const scores: number[] = fams.map((ff) => computeFamilyScore(ff));
  scores.forEach((s) => {
    if (s > maxScore) maxScore = s;
  });

  let bossSet = false;
  fams.forEach((ff, i) => {
    if (!ff.econ) return;
    if (!bossSet && scores[i] > playerScore * 1.35) {
      ff.econ.tier = "boss";
      bossSet = true;
    } else if (ff.econ.tier !== "bankrupt") {
      ff.econ.tier = "normal";
    }
  });
  return fams;
}
