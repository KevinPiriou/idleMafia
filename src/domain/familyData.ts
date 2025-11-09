export type GeneratorKey =
  | "pickpocket"
  | "racket"
  | "club"
  | "casino"
  | "olive"
  | "bar"
  | "grocery";
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
