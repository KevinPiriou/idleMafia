import type { SaveState, Rarity } from "./types";

export type RandomEventChoice = {
  label: string;
  apply: (state: SaveState) => SaveState;
  meta?: {
    successChance?: number; // 0..1 if applicable
    info?: string; // textual amplitude estimate
  };
};

export type RandomEventDef = {
  id: string;
  title: string;
  desc: string;
  choices: RandomEventChoice[];
};

export const rarityWeights: Array<{ r: Rarity; w: number }> = [
  { r: "legendary", w: 1 },
  { r: "epic", w: 3 },
  { r: "rare", w: 10 },
  { r: "uncommon", w: 24 },
  { r: "common", w: 62 },
];

export const pickRarity = (): Rarity => {
  const total = rarityWeights.reduce((a, b) => a + b.w, 0);
  let t = Math.random() * total;
  for (const e of rarityWeights) {
    if ((t -= e.w) <= 0) return e.r;
  }
  return "common";
};

export const EVENTS: RandomEventDef[] = [
  {
    id: "invest",
    title: "Investissement risqué",
    desc: "Une opportunité d'investir dans une filière prometteuse. Pariez gros ou passez votre tour.",
    choices: [
      {
        label: "All-in (gros risque)",
        apply: (s) => {
          const win = Math.random() < 0.45;
          const stake = Math.min(s.cash, 10000 + s.cash * 0.1);
          return {
            ...s,
            cash: Math.max(0, s.cash + (win ? stake : -stake)),
            respect: s.respect + (win ? 50 : -25),
          };
        },
        meta: {
          successChance: 0.45,
          info: "Gain: stake; Échec: -stake, -25👑",
        },
      },
      {
        label: "Petit ticket (risque modéré)",
        apply: (s) => {
          const win = Math.random() < 0.6;
          const stake = Math.min(s.cash, 2000 + s.cash * 0.02);
          return {
            ...s,
            cash: Math.max(0, s.cash + (win ? stake * 0.8 : -stake * 0.5)),
          };
        },
        meta: {
          successChance: 0.6,
          info: "Gain: ~0.8×stake; Échec: ~0.5×stake",
        },
      },
      { label: "Ignorer", apply: (s) => s },
    ],
  },
  {
    id: "betray",
    title: "Trahison d'un partenaire",
    desc: "Un allié propose un coup fourré. Ça peut payer... ou tout casser.",
    choices: [
      {
        label: "Accepter la trahison",
        apply: (s) => {
          const win = Math.random() < 0.5;
          const res = { ...s } as SaveState;
          if (win) {
            res.tempGlobalBuffUntil = Date.now() + 60 * 60 * 1000; // +50% 1h
          } else {
            res.families = s.families.map((f, i) =>
              i === 0 ? { ...f, state: "war" } : f
            );
            res.tension = Math.max(0, Math.min(100, (s.tension || 0) + 25));
          }
          return res;
        },
        meta: { successChance: 0.5, info: "+50% 1h ou Guerre +25⚡" },
      },
      { label: "Refuser", apply: (s) => s },
    ],
  },
  {
    id: "inspection",
    title: "Inspection surprise",
    desc: "Les autorités contrôlent vos filières légales.",
    choices: [
      {
        label: "Préparer la paperasse (-$2k)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 2000),
          heat: Math.max(0, Math.min(100, s.heat - 10)),
        }),
        meta: { info: "Coût $2000; -10🔥" },
      },
      {
        label: "Improviser",
        apply: (s) => ({ ...s, heat: Math.max(0, Math.min(100, s.heat + 12)) }),
        meta: { info: "+12🔥" },
      },
    ],
  },
  {
    id: "illegalDeal",
    title: "Affaire illégale lucrative",
    desc: "Un coup rapide peut rapporter gros... si vous ne vous faites pas prendre.",
    choices: [
      {
        label: "Tenter le coup",
        apply: (s) => {
          const win = Math.random() < 0.55;
          return {
            ...s,
            cash: s.cash + (win ? 15000 : -5000),
            respect: s.respect + (win ? 100 : -50),
            heat: Math.max(0, Math.min(100, s.heat + (win ? 5 : 20))),
          };
        },
        meta: {
          successChance: 0.55,
          info: "+15k/$-5k, +100/👑-50, +5🔥/ +20🔥",
        },
      },
      { label: "Trop risqué", apply: (s) => s },
    ],
  },
  {
    id: "rumor",
    title: "Rumeur publique",
    desc: "Des rumeurs circulent sur votre famille.",
    choices: [
      {
        label: "Laisser courir",
        apply: (s) => {
          const up = Math.random() < 0.5;
          return {
            ...s,
            respect: Math.max(0, s.respect + (up ? 50 : -50)),
            heat: Math.max(0, Math.min(100, s.heat + (up ? -5 : 10))),
          };
        },
        meta: { successChance: 0.5, info: "+50/👑-50, -5🔥/+10🔥" },
      },
      {
        label: "Contre-attaque médiatique (-$3k)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 3000),
          respect: s.respect + 30,
        }),
        meta: { info: "Coût $3000; +30👑" },
      },
    ],
  },
  {
    id: "insider",
    title: "Indice interne",
    desc: "On vous souffle une opportunité ciblée sur une filière.",
    choices: [
      {
        label: "Booster les casinos (1h)",
        apply: (s) => {
          const res = { ...s } as SaveState;
          res.families = s.families.map((f, i) =>
            i === 0
              ? {
                  ...f,
                  state: f.state === "partnership" ? f.state : "partnership",
                  partnershipSectors: Array.from(
                    new Set([...f.partnershipSectors, "casino"])
                  ),
                }
              : f
          );
          return res;
        },
        meta: { info: "+10% secteur casino (partenariat) ~1h" },
      },
      { label: "Ignorer", apply: (s) => s },
    ],
  },
];
