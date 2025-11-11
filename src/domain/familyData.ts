import type { Family } from "./types";

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
      intel: 0,
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
      intel: 0,
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
      intel: 0,
    },
  ];
}
