// === Types extraits de MafiaIdleGame.tsx ===

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

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  family: string;
  stats: [number, number, number, number]; // [Charisme, Force, Esprit, Réseau]
  hiredAt?: number; // Timestamp optionnel
  lastMissionTimestamp?: number;
  woundedUntil?: number;
  woundedReason?: string;
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

export type SaveState = {
  cash: number;
  respect: number;
  heat: number;
  level: number;
  xp: number;

  // Generators et upgrades
  gens: Record<GeneratorKey, Generator>;
  upgrades: Record<string, Upgrade>;

  // Prestige
  prestigeMult: number;
  prestigePoints: number;

  // Heat management
  heatMitigationPerSec: number;

  // Staff
  staff: StaffMember[];
  assignments: Record<string, GeneratorKey | null>;

  // Families
  families: Family[];
  tempGlobalBuffUntil?: number;
  tension: number;

  // Sanctions
  disabledUntil?: number;
  actionLockedUntilHeat?: number;

  // Inventory
  inventory?: {
    weapons: WeaponItem[];
    vehicles: VehicleItem[];
    contracts: number;
  };
  equipped?: Record<string, string | null>;

  // Investments
  permaGlobalMult?: number;
  costDiscount?: number;
  investmentsPurchased?: Record<string, boolean>;

  // Tutorial
  tutorialCompleted?: boolean;
  tutorialStep?: number;

  // Meta
  lastSave: number;
  version?: number;
};
