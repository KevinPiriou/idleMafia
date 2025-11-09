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
  label: string;
  desc: string;
  baseCost: number;
  baseIncome: number;
  unlocked: boolean;
};

export type Upgrade = {
  key: string;
  label: string;
  desc: string;
  cost: number;
  generatorKey: GeneratorKey;
  multiplier: number;
};

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  hiredAt: number;
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
  staff: StaffMember[];
  families: Family[];
  inventory?: {
    weapons: WeaponItem[];
    vehicles: VehicleItem[];
    contracts: number;
  };
  equipped?: Record<string, string | null>;
};
