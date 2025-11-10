import type { SaveState } from "./types";
import { clamp } from "./balance";

export type Investment = {
  id: string;
  label: string;
  desc: string;
  points: number;
};

export const INVESTMENTS: Investment[] = [
  {
    id: "inv_income_1",
    label: "+5% revenus globaux",
    desc: "Augmente vos revenus de toutes filières.",
    points: 1,
  },
  {
    id: "inv_income_2",
    label: "+10% revenus globaux",
    desc: "Cumulable avec le précédent.",
    points: 3,
  },
  {
    id: "inv_heat_1",
    label: "-0.03 chaleur/s",
    desc: "Mitigation passive permanente.",
    points: 1,
  },
  {
    id: "inv_heat_2",
    label: "-0.05 chaleur/s",
    desc: "Mitigation additionnelle.",
    points: 2,
  },
  {
    id: "inv_cost_1",
    label: "-3% coûts",
    desc: "Réduction du coût d'achat des générateurs.",
    points: 1,
  },
  {
    id: "inv_cost_2",
    label: "-5% coûts",
    desc: "Réduction additionnelle des coûts.",
    points: 2,
  },
];

export function applyInvestment(prev: SaveState, id: string): SaveState {
  if ((prev.investmentsPurchased || {})[id]) return prev;
  const inv = INVESTMENTS.find((i) => i.id === id);
  if (!inv) return prev;
  if ((prev.prestigePoints || 0) < inv.points) return prev;
  const next: SaveState = { ...prev };
  next.prestigePoints = (next.prestigePoints || 0) - inv.points;
  next.investmentsPurchased = {
    ...(next.investmentsPurchased || {}),
    [id]: true,
  };
  switch (id) {
    case "inv_income_1":
      next.permaGlobalMult = (next.permaGlobalMult || 1) * 1.05;
      break;
    case "inv_income_2":
      next.permaGlobalMult = (next.permaGlobalMult || 1) * 1.1;
      break;
    case "inv_heat_1":
      next.heatMitigationPerSec = (next.heatMitigationPerSec || 0) + 0.03;
      break;
    case "inv_heat_2":
      next.heatMitigationPerSec = (next.heatMitigationPerSec || 0) + 0.05;
      break;
    case "inv_cost_1":
      next.costDiscount = clamp((next.costDiscount || 0) + 0.03, 0, 0.5);
      break;
    case "inv_cost_2":
      next.costDiscount = clamp((next.costDiscount || 0) + 0.05, 0, 0.5);
      break;
  }
  return next;
}
