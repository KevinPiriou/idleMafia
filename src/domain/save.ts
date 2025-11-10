export type GeneratorKey =
  | "pickpocket"
  | "racket"
  | "club"
  | "casino"
  | "olive"
  | "bar"
  | "grocery";

export type Generator = {
  key: GeneratorKey;
  name: string;
  icon: string;
  baseCost: number;
  costGrowth: number;
  baseProd: number;
  baseHeat: number;
  legal: boolean;
  owned: number;
};

export type Upgrade = {
  id: string;
  label: string;
  desc: string;
  target: GeneratorKey | "global";
  cost: number;
  owned: boolean;
  mult: number;
};

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type WeaponItem = {
  id: string;
  name: string;
  rarity: Rarity;
  bonusPower: number;
  bonusDesc: string;
  price: number;
};

export type VehicleItem = {
  id: string;
  name: string;
  rarity: Rarity;
  speed: number;
  armor: number;
  price: number;
};
export type StaffMember = {
  id: string;
  name: string;
  role: string;
  family: string;
  stats: [number, number, number, number];
};

export type FamilyState = "peace" | "war" | "partnership";
export type Family = {
  id: string;
  name: string;
  state: FamilyState;
  partnershipSectors: GeneratorKey[];
  lastWarTs?: number;
  econ?: {
    cash: number;
    respect: number;
    members: number;
    weapons: number;
    vehicles: number;
    tier?: "normal" | "bankrupt" | "boss";
  };
  econFactor?: number;
};

export type SaveState = {
  cash: number;
  respect: number;
  heat: number;
  gens: Record<GeneratorKey, Generator>;
  upgrades: Record<string, Upgrade>;
  prestigeMult: number;
  prestigePoints: number;
  heatMitigationPerSec: number;
  lastSave: number;
  version?: number;
  level: number;
  xp: number;
  staff: StaffMember[];
  assignments: Record<string, GeneratorKey | null>;
  families: Family[];
  tempGlobalBuffUntil?: number;
  tension: number;
  disabledUntil?: number;
  actionLockedUntilHeat?: number;
  inventory?: {
    weapons: WeaponItem[];
    vehicles: VehicleItem[];
    contracts: number;
  };
  equipped?: Record<string, string | null>;
  permaGlobalMult?: number;
  costDiscount?: number;
  investmentsPurchased?: Record<string, boolean>;
};
// Fonctions copiées mot pour mot
const STORAGE_KEY = "mafia-idle-redesign-v1";

export const defaultGenerators = (): Record<GeneratorKey, Generator> => ({
  pickpocket: {
    key: "pickpocket",
    name: "Pickpockets",
    icon: "🎯",
    baseCost: 10,
    costGrowth: 1.12,
    baseProd: 0.6,
    baseHeat: 0.02,
    legal: false,
    owned: 0,
  },
  racket: {
    key: "racket",
    name: "Rackets",
    icon: "💰",
    baseCost: 120,
    costGrowth: 1.13,
    baseProd: 6,
    baseHeat: 0.06,
    legal: false,
    owned: 0,
  },
  club: {
    key: "club",
    name: "Boîtes de nuit",
    icon: "🍸",
    baseCost: 1600,
    costGrowth: 1.14,
    baseProd: 40,
    baseHeat: 0.12,
    legal: false,
    owned: 0,
  },
  casino: {
    key: "casino",
    name: "Casinos",
    icon: "🎰",
    baseCost: 24000,
    costGrowth: 1.16,
    baseProd: 220,
    baseHeat: 0.22,
    legal: false,
    owned: 0,
  },
  olive: {
    key: "olive",
    name: "Huile d'olive",
    icon: "🫒",
    baseCost: 300,
    costGrowth: 1.12,
    baseProd: 4,
    baseHeat: 0.0,
    legal: true,
    owned: 0,
  },
  bar: {
    key: "bar",
    name: "Bars",
    icon: "🍷",
    baseCost: 900,
    costGrowth: 1.13,
    baseProd: 12,
    baseHeat: 0.01,
    legal: true,
    owned: 0,
  },
  grocery: {
    key: "grocery",
    name: "Épiceries",
    icon: "🛒",
    baseCost: 2200,
    costGrowth: 1.14,
    baseProd: 25,
    baseHeat: 0.005,
    legal: true,
    owned: 0,
  },
});

export const defaultUpgrades = (): Record<string, Upgrade> => ({
  u_pp_1: {
    id: "u_pp_1",
    label: "Doigts agiles",
    desc: "+100% pickpockets",
    target: "pickpocket",
    cost: 250,
    owned: false,
    mult: 2,
  },
  u_rk_1: {
    id: "u_rk_1",
    label: "Bâtons",
    desc: "+100% rackets",
    target: "racket",
    cost: 1800,
    owned: false,
    mult: 2,
  },
  u_cb_1: {
    id: "u_cb_1",
    label: "DJ maison",
    desc: "+100% boîtes",
    target: "club",
    cost: 12000,
    owned: false,
    mult: 2,
  },
  u_cs_1: {
    id: "u_cs_1",
    label: "Croupiers",
    desc: "+100% casinos",
    target: "casino",
    cost: 80000,
    owned: false,
    mult: 2,
  },
});

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

export const prestigeGain = (respect: number) =>
  Math.floor(Math.sqrt(respect) / 50);

// Dépendances locales copiées mot pour mot :
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

export function defaultStaff(): StaffMember[] {
  return [
    {
      id: "1",
      name: 'Marco "Le Rat" Rossi',
      role: "Soldat",
      family: "Famiglia d'Oro",
      stats: [80, 60, 40, 70],
    },
    {
      id: "2",
      name: 'Luca "La Main" Ferrari',
      role: "Capieri",
      family: "Famiglia del Vino",
      stats: [90, 85, 75, 95],
    },
    {
      id: "3",
      name: 'Giovanni "Blade" Conti',
      role: "Associé",
      family: "Famiglia Smeraldo",
      stats: [50, 95, 30, 45],
    },
    {
      id: "4",
      name: 'Antoine "Le Chat" Dubois',
      role: "Petite frappe",
      family: "Famiglia della Notte",
      stats: [65, 40, 55, 50],
    },
  ];
}
