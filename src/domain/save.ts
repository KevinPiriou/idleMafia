import type { SaveState } from "./types";
import { defaultGenerators, defaultUpgrades, defaultStaff } from "./defaults";
import { defaultFamilies } from "./familyData";

const STORAGE_KEY = "mafia-idle-redesign-v1";

export const blankSave = (): SaveState => ({
  cash: 10,
  respect: 0,
  heat: 0,
  gens: defaultGenerators(),
  upgrades: defaultUpgrades(),
  prestigeMult: 1,
  prestigePoints: 0,
  heatMitigationPerSec: 0,
  lastSave: Date.now(),
  version: 2,
  level: 1,
  xp: 0,
  staff: defaultStaff(),
  assignments: {},
  families: defaultFamilies(),
  tempGlobalBuffUntil: undefined,
  tension: 0,
  disabledUntil: undefined,
  actionLockedUntilHeat: undefined,
  inventory: { weapons: [], vehicles: [], contracts: 0 },
  equipped: {},
  permaGlobalMult: 1,
  costDiscount: 0,
  investmentsPurchased: {},
  tutorialCompleted: false,
  tutorialStep: 0,
});

export const loadSave = (): SaveState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankSave();
    const parsed = JSON.parse(raw) as SaveState;
    const gens = defaultGenerators();
    const upgs = defaultUpgrades();
    Object.values(parsed.gens || {}).forEach((g) => {
      if (gens[g.key]) gens[g.key] = { ...gens[g.key], ...g };
    });
    Object.values(parsed.upgrades || {}).forEach((u) => {
      if (upgs[u.id]) upgs[u.id] = { ...upgs[u.id], ...u };
    });
    // Migrate new fields safely
    const base = blankSave();
    return {
      ...base,
      ...parsed,
      gens,
      upgrades: upgs,
      // Ensure numeric fields are sane after migration
      prestigeMult:
        typeof (parsed as SaveState).prestigeMult === "number"
          ? (parsed as SaveState).prestigeMult
          : base.prestigeMult,
      heatMitigationPerSec:
        typeof (parsed as SaveState).heatMitigationPerSec === "number"
          ? (parsed as SaveState).heatMitigationPerSec
          : base.heatMitigationPerSec,
      staff: parsed.staff && parsed.staff.length ? parsed.staff : base.staff,
      assignments: parsed.assignments || base.assignments,
      families:
        parsed.families && parsed.families.length
          ? parsed.families
          : base.families,
      tempGlobalBuffUntil: parsed.tempGlobalBuffUntil,
      tension:
        typeof parsed.tension === "number" ? parsed.tension : base.tension,
      disabledUntil: parsed.disabledUntil,
      actionLockedUntilHeat: parsed.actionLockedUntilHeat,
      inventory: parsed.inventory || base.inventory,
      equipped: parsed.equipped || base.equipped,
      permaGlobalMult:
        typeof (parsed as SaveState).permaGlobalMult === "number"
          ? (parsed as SaveState).permaGlobalMult
          : base.permaGlobalMult,
      costDiscount:
        typeof (parsed as SaveState).costDiscount === "number"
          ? (parsed as SaveState).costDiscount
          : base.costDiscount,
      investmentsPurchased:
        (parsed as SaveState).investmentsPurchased || base.investmentsPurchased,
      tutorialCompleted:
        (parsed as SaveState).tutorialCompleted || base.tutorialCompleted,
      tutorialStep: (parsed as SaveState).tutorialStep || base.tutorialStep,
    };
  } catch (e) {
    console.warn("Failed to load save:", e);
    return blankSave();
  }
};

export const saveGame = (state: SaveState) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, lastSave: Date.now() })
    );
  } catch (e) {
    console.warn("Failed to save game:", e);
  }
};
