import type { SaveState, Rarity, RandomEventDef } from "./types";

export const eventPreconditions: Record<string, (s: SaveState) => boolean> = {
  invest: (s) => s.cash > 1000,
  betray: (s) => s.families.some((f) => f.state === "partnership"),
  inspection: (s) => s.level > 3,
  illegalDeal: (s) => s.cash > 5000,
  rumor: (s) => s.respect > 100,
  insider: (s) => s.gens.casino.owned > 0,
  police_control: (s) => s.heat > 20,
  informer_deal: (s) => s.cash > 5000 && s.families.length > 1,
  good_harvest: (s) => Object.values(s.gens).some((g) => g.owned > 5),
  customs_seizure: (s) => s.cash > 10000,
  territory_war: (s) => s.respect > 200,
  family_tribute_demand: (s) => s.families.length > 1,
  family_peace_offer: (s) => s.families.some((f) => f.state === "war"),
  family_joint_operation: (s) => s.families.length > 1 && s.cash > 100000,
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
  {
    id: "police_control",
    title: "Contrôle de police",
    desc: "Une patrouille de police inattendue s'intéresse à vos activités.",
    choices: [
      {
        label: "Tenter de les corrompre (-$1.5k)",
        apply: (s) => {
          if (s.cash < 1500) {
            return {
              ...s,
              heat: Math.min(100, s.heat + 15),
              respect: Math.max(0, s.respect - 20),
            };
          }
          const win = Math.random() < 0.7;
          return {
            ...s,
            cash: s.cash - 1500,
            heat: win ? s.heat : Math.min(100, s.heat + 15),
            respect: s.respect + (win ? 10 : -20),
          };
        },
        meta: {
          successChance: 0.7,
          info: "Succès: +10👑; Échec: +15🔥, -20👑",
        },
      },
      {
        label: "Utiliser vos contacts politiques",
        apply: (s) => {
          const win = Math.random() < 0.5 + s.prestigePoints * 0.01;
          return {
            ...s,
            heat: win ? s.heat : Math.min(100, s.heat + 10),
            respect: s.respect + (win ? 20 : -10),
          };
        },
        meta: {
          successChance: 0.5,
          info: "Chance basée sur l'influence. Succès: +20👑; Échec: +10🔥, -10👑",
        },
      },
    ],
  },
  {
    id: "informer_deal",
    title: "Proposition d'un informateur",
    desc: "Un informateur prétend avoir des informations cruciales sur une famille rivale.",
    choices: [
      {
        label: "Acheter les informations (-$5k)",
        apply: (s) => {
          if (s.cash < 5000)
            return { ...s, respect: Math.max(0, s.respect - 10) };
          const rivalFamilyIndex =
            Math.floor(Math.random() * (s.families.length - 1)) + 1;
          const res = { ...s, cash: s.cash - 5000 } as SaveState;
          res.families[rivalFamilyIndex].intel += 25;
          return res;
        },
        meta: { info: "Augmente l'intel sur une famille rivale." },
      },
      {
        label: "Le faire taire",
        apply: (s) => ({ ...s, heat: Math.min(100, s.heat + 5) }),
      },
    ],
  },
  {
    id: "good_harvest",
    title: "Bonne récolte",
    desc: "Les affaires tournent bien dans l'un de vos secteurs.",
    choices: [
      {
        label: "Profiter du bonus",
        apply: (s) => {
          const legalGens = Object.keys(s.gens).filter(
            (key) => s.gens[key as keyof typeof s.gens].legal
          );
          if (legalGens.length === 0) return s;
          const genKey = legalGens[
            Math.floor(Math.random() * legalGens.length)
          ] as keyof typeof s.gens;
          const res = { ...s } as SaveState;
          res.gens[genKey].multiplier *= 1.5;
          setTimeout(() => {
            res.gens[genKey].multiplier /= 1.5;
          }, 60 * 1000 * 5); // 5 minutes
          return res;
        },
        meta: {
          info: "Augmente la production d'un générateur légal de 50% pendant 5 minutes.",
        },
      },
    ],
  },
  {
    id: "customs_seizure",
    title: "Saisie Douanière",
    desc: "Un de vos containers a été intercepté par les douanes.",
    choices: [
      {
        label: "Accepter la perte",
        apply: (s) => {
          const loss = s.cash * 0.1;
          return {
            ...s,
            cash: s.cash - loss,
            heat: Math.min(100, s.heat + 10),
          };
        },
        meta: {
          info: "Perte de 10% de votre argent et augmentation de la chaleur.",
        },
      },
    ],
  },
  {
    id: "territory_war",
    title: "Guerre de territoire",
    desc: "Un gang rival empiète sur votre territoire.",
    choices: [
      {
        label: "Les attaquer de front",
        apply: (s) => {
          const win = Math.random() < 0.6;
          return {
            ...s,
            respect: s.respect + (win ? 50 : -30),
            heat: Math.min(100, s.heat + 15),
          };
        },
        meta: {
          successChance: 0.6,
          info: "Gros gain ou perte de respect, augmentation de la chaleur.",
        },
      },
      {
        label: "Négocier un accord",
        apply: (s) => {
          const cost = s.cash * 0.05;
          if (s.cash < cost)
            return { ...s, respect: Math.max(0, s.respect - 20) };
          return { ...s, cash: s.cash - cost, respect: s.respect + 10 };
        },
        meta: {
          info: "Coûte 5% de votre argent mais augmente légèrement le respect.",
        },
      },
    ],
  },
  {
    id: "family_dispute",
    title: "Dispute familiale",
    desc: "Deux de vos capos se disputent le contrôle d'un territoire. Leur conflit menace de diviser vos rangs.",
    choices: [
      {
        label: "Soutenir le plus loyal (-$2k, +10👑)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 2000),
          respect: s.respect + 10,
        }),
        meta: { info: "Restaure l'ordre mais vous coûte un peu d'argent." },
      },
      {
        label: "Les laisser régler ça entre eux (-15👑, +5⚡)",
        apply: (s) => ({
          ...s,
          respect: Math.max(0, s.respect - 15),
          tension: Math.min(100, (s.tension || 0) + 5),
        }),
        meta: { info: "Montre votre faiblesse et augmente la tension." },
      },
    ],
  },
  {
    id: "smuggling_opportunity",
    title: "Opportunité de contrebande",
    desc: "Un contact vous propose une cargaison de biens de luxe à passer en douce. C'est risqué, mais le profit est tentant.",
    choices: [
      {
        label: "Accepter le deal (+$25k, +15🔥)",
        apply: (s) => {
          const win = Math.random() < 0.65;
          return {
            ...s,
            cash: s.cash + (win ? 25000 : -10000),
            heat: Math.min(100, s.heat + 15),
            respect: s.respect + (win ? 20 : -10),
          };
        },
        meta: { successChance: 0.65, info: "Gros gain ou perte sèche." },
      },
      {
        label: "Refuser, trop dangereux",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "political_favor",
    title: "Faveur politique",
    desc: "Un politicien que vous avez aidé vous doit une faveur. C'est le moment de lui demander un service.",
    choices: [
      {
        label: "Demander une subvention (+$50k)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 50000,
          respect: s.respect + 5,
        }),
        meta: { info: "Un coup de pouce financier non négligeable." },
      },
      {
        label: "Effacer la chaleur (-20🔥)",
        apply: (s) => ({
          ...s,
          heat: Math.max(0, s.heat - 20),
        }),
        meta: { info: "Nettoie votre réputation auprès des autorités." },
      },
    ],
  },
  {
    id: "warehouse_fire",
    title: "Incendie à l'entrepôt",
    desc: "Un de vos entrepôts a pris feu. Accident ou sabotage, le résultat est le même : vous avez perdu des marchandises.",
    choices: [
      {
        label: "Déclarer à l'assurance (-$5k)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 5000),
        }),
        meta: { info: "Vous perdez une partie de votre argent." },
      },
      {
        label: "Accuser une famille rivale (+10⚡)",
        apply: (s) => ({
          ...s,
          tension: Math.min(100, (s.tension || 0) + 10),
        }),
        meta: { info: "Augmente la tension avec les autres familles." },
      },
    ],
  },
  {
    id: "new_recruit",
    title: "Nouvelle recrue prometteuse",
    desc: "Un jeune loup aux dents longues veut rejoindre vos rangs. Il a du potentiel, mais il est encore vert.",
    choices: [
      {
        label: "Le prendre sous votre aile (+2% revenus permanent, +20👑)",
        apply: (s) => {
          // Augmente le multiplicateur permanent de 2% pour chaque recrue
          const newMult = (s.permaGlobalMult ?? 1) * 1.02;
          return {
            ...s,
            respect: s.respect + 20,
            permaGlobalMult: newMult,
          };
        },
        meta: { info: "Une nouvelle recrue augmente vos opérations." },
      },
      {
        label: "L'envoyer faire ses preuves",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "extortion_gone_wrong",
    title: "Extorsion qui tourne mal",
    desc: "Une de vos opérations d'extorsion a mal tourné. Le commerçant a prévenu la police.",
    choices: [
      {
        label: "Intimider les témoins (-$3k, +10🔥)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 3000),
          heat: Math.min(100, s.heat + 10),
        }),
        meta: { info: "Augmente la chaleur mais étouffe l'affaire." },
      },
      {
        label: "Abandonner l'opération (-10👑)",
        apply: (s) => ({
          ...s,
          respect: Math.max(0, s.respect - 10),
        }),
        meta: { info: "Votre réputation en prend un coup." },
      },
    ],
  },
  {
    id: "charity_gala",
    title: "Gala de charité",
    desc: "La haute société organise un gala de charité. C'est l'occasion de vous montrer sous un meilleur jour.",
    choices: [
      {
        label: "Faire un don généreux (-$10k, -5🔥, +15👑)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 10000),
          heat: Math.max(0, s.heat - 5),
          respect: s.respect + 15,
        }),
        meta: { info: "Améliore votre image publique." },
      },
      {
        label: "Envoyer vos hommes voler les dons (+$30k, +20🔥)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 30000,
          heat: Math.min(100, s.heat + 20),
        }),
        meta: { info: "Rentable, mais très risqué." },
      },
    ],
  },
  {
    id: "racehorse_bet",
    title: "Pari sur un cheval de course",
    desc: "Un tuyau sûr pour la course de demain. C'est le moment de miser gros.",
    choices: [
      {
        label: "Miser 20% de votre cash",
        apply: (s) => {
          const win = Math.random() < 0.4;
          const stake = s.cash * 0.2;
          return {
            ...s,
            cash: s.cash + (win ? stake * 2 : -stake),
          };
        },
        meta: { successChance: 0.4, info: "Gagnez le double ou perdez tout." },
      },
      {
        label: "Ne pas jouer",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "art_heist",
    title: "Casse d'une galerie d'art",
    desc: "Une occasion en or de voler une œuvre d'art de grande valeur. L'opération est complexe.",
    choices: [
      {
        label: "Organiser le casse (+$100k, +25🔥)",
        apply: (s) => {
          const win = Math.random() < 0.5;
          return {
            ...s,
            cash: s.cash + (win ? 100000 : -20000),
            heat: Math.min(100, s.heat + 25),
            respect: s.respect + (win ? 50 : -20),
          };
        },
        meta: {
          successChance: 0.5,
          info: "Un gain énorme ou une perte cuisante.",
        },
      },
      {
        label: "Trop risqué",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "old_friend",
    title: "Un vieil ami en difficulté",
    desc: "Un ami de longue date a des ennuis avec un gang rival. Il vous demande de l'aide.",
    choices: [
      {
        label: "L'aider (-$5k, +20👑)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 5000),
          respect: s.respect + 20,
        }),
        meta: { info: "La loyauté est récompensée." },
      },
      {
        label: "L'ignorer (-15👑)",
        apply: (s) => ({
          ...s,
          respect: Math.max(0, s.respect - 15),
        }),
        meta: { info: "Vous perdez le respect de vos pairs." },
      },
    ],
  },
  {
    id: "blackmail_material",
    title: "Dossier compromettant",
    desc: "Vous avez mis la main sur des informations qui pourraient ruiner un juge influent.",
    choices: [
      {
        label: "Le faire chanter (-15🔥)",
        apply: (s) => ({
          ...s,
          heat: Math.max(0, s.heat - 15),
        }),
        meta: { info: "Le juge vous laissera tranquille pendant un moment." },
      },
      {
        label: "Vendre le dossier (+$40k)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 40000,
        }),
        meta: { info: "L'argent est toujours bon à prendre." },
      },
    ],
  },
  {
    id: "movie_deal",
    title: "Proposition d'un film",
    desc: "Un réalisateur d'Hollywood veut faire un film sur votre vie. Il vous propose une somme pour les droits.",
    choices: [
      {
        label: "Accepter (+$75k, +10👑)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 75000,
          respect: s.respect + 10,
        }),
        meta: { info: "Votre légende est en marche." },
      },
      {
        label: "Refuser",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "undercover_cop",
    title: "Un flic infiltré",
    desc: "Vous suspectez qu'un de vos hommes est un flic infiltré. Vous devez agir vite.",
    choices: [
      {
        label: "Le 'faire disparaître' (+15🔥, +5👑)",
        apply: (s) => ({
          ...s,
          heat: Math.min(100, s.heat + 15),
          respect: s.respect + 5,
        }),
        meta: { info: "Radical, mais efficace." },
      },
      {
        label: "Lui donner de fausses informations",
        apply: (s) => ({
          ...s,
          heat: Math.max(0, s.heat - 10),
        }),
        meta: { info: "Vous semez la confusion chez les flics." },
      },
    ],
  },
  {
    id: "rival_wedding",
    title: "Mariage chez les rivaux",
    desc: "Le fils d'un Don rival se marie. C'est une trêve non officielle, mais aussi une occasion.",
    choices: [
      {
        label: "Envoyer un cadeau somptueux (-$5k, +10👑)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 5000),
          respect: s.respect + 10,
        }),
        meta: { info: "Un geste de respect apprécié." },
      },
      {
        label: "Planifier une 'surprise' (+25⚡)",
        apply: (s) => ({
          ...s,
          tension: Math.min(100, (s.tension || 0) + 25),
        }),
        meta: { info: "Déclencher une guerre n'a jamais été aussi simple." },
      },
    ],
  },
  {
    id: "protection_racket",
    title: "Racket de protection",
    desc: "Un groupe de commerçants refuse de payer pour votre 'protection'.",
    choices: [
      {
        label: "Faire un exemple (-$1k, +15👑)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 1000),
          respect: s.respect + 15,
        }),
        meta: { info: "La peur est un excellent motivateur." },
      },
      {
        label: "Négocier un meilleur tarif (+$5k/h pendant 1h)",
        apply: (s) => {
          // Logique de buff temporaire (simplifié)
          return { ...s, cash: s.cash + 5000 };
        },
        meta: { info: "Un compromis qui peut rapporter." },
      },
    ],
  },
  {
    id: "sick_consigliere",
    title: "Consigliere malade",
    desc: "Votre plus fidèle conseiller est gravement malade. Ses soins sont coûteux.",
    choices: [
      {
        label: "Payer les meilleurs médecins (-$20k, +25👑)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 20000),
          respect: s.respect + 25,
        }),
        meta: { info: "La famille avant tout." },
      },
      {
        label: "Le laisser se débrouiller (-20👑)",
        apply: (s) => ({
          ...s,
          respect: Math.max(0, s.respect - 20),
        }),
        meta: { info: "Un Don doit être impitoyable." },
      },
    ],
  },
  {
    id: "bank_loan",
    title: "Prêt bancaire 'amical'",
    desc: "Un banquier vous propose un prêt à un taux très avantageux, en échange de quelques 'services'.",
    choices: [
      {
        label: "Accepter le prêt (+$100k)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 100000,
        }),
        meta: { info: "De l'argent frais pour vos opérations." },
      },
      {
        label: "Refuser",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "journalist_investigation",
    title: "Enquête journalistique",
    desc: "Un journaliste fouineur est sur le point de publier un article sur vos activités illégales.",
    choices: [
      {
        label: "Le menacer (+10🔥, -5👑)",
        apply: (s) => ({
          ...s,
          heat: Math.min(100, s.heat + 10),
          respect: Math.max(0, s.respect - 5),
        }),
        meta: { info: "Il reculera, mais la police sera alertée." },
      },
      {
        label: "Acheter son silence (-$15k)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 15000),
        }),
        meta: { info: "L'argent résout bien des problèmes." },
      },
    ],
  },
  {
    id: "illegal_casino",
    title: "Casino clandestin",
    desc: "Une opportunité de monter un casino clandestin dans l'arrière-salle d'un de vos bars.",
    choices: [
      {
        label: "Lancer l'opération (+$50k, +20🔥)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 50000,
          heat: Math.min(100, s.heat + 20),
        }),
        meta: { info: "Très rentable, mais attire l'attention." },
      },
      {
        label: "Rester dans la légalité",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "family_heirloom",
    title: "Héritage familial",
    desc: "Vous héritez d'un objet de grande valeur d'un parent éloigné. Que voulez-vous en faire ?",
    choices: [
      {
        label: "Le vendre (+$60k)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 60000,
        }),
        meta: { info: "L'argent n'a pas d'odeur." },
      },
      {
        label: "Le garder (+15👑)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 15,
        }),
        meta: { info: "Certaines choses n'ont pas de prix." },
      },
    ],
  },
  {
    id: "counterfeiting_ring",
    title: "Réseau de contrefaçon",
    desc: "Une occasion de produire de la fausse monnaie. Le profit est énorme, mais si vous vous faites prendre, la chute sera dure.",
    choices: [
      {
        label: "Lancer l'impression (+$200k, +30🔥)",
        apply: (s) => {
          const win = Math.random() < 0.4;
          return {
            ...s,
            cash: s.cash + (win ? 200000 : -50000),
            heat: Math.min(100, s.heat + 30),
          };
        },
        meta: {
          successChance: 0.4,
          info: "Un risque qui peut changer la donne.",
        },
      },
      {
        label: "Détruire les plaques",
        apply: (s) => ({ ...s, heat: Math.max(0, s.heat - 5) }),
        meta: { info: "Un geste de prudence apprécié des autorités." },
      },
    ],
  },
  {
    id: "troublesome_witness",
    title: "Témoin gênant",
    desc: "Un témoin clé doit témoigner contre vous dans une affaire importante. Il faut s'en occuper.",
    choices: [
      {
        label: "Le persuader de se taire (-$25k)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 25000),
          heat: Math.max(0, s.heat - 10),
        }),
        meta: { info: "L'affaire est classée, pour l'instant." },
      },
      {
        label: "Le discréditer publiquement (-$10k, +5👑)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 10000),
          respect: s.respect + 5,
        }),
        meta: { info: "Son témoignage n'a plus aucune valeur." },
      },
    ],
  },
  {
    id: "arms_deal",
    title: "Trafic d'armes",
    desc: "Un contact militaire vous propose un lot d'armes de guerre à un prix dérisoire.",
    choices: [
      {
        label: "Acheter tout le stock (-$50k, +20🔥)",
        apply: (s) => {
          // Logique pour ajouter des armes à l'inventaire (simplifié)
          return {
            ...s,
            cash: Math.max(0, s.cash - 50000),
            heat: Math.min(100, s.heat + 20),
          };
        },
        meta: { info: "Votre arsenal est maintenant bien fourni." },
      },
      {
        label: "Signaler votre contact aux autorités (-15🔥)",
        apply: (s) => ({
          ...s,
          heat: Math.max(0, s.heat - 15),
        }),
        meta: { info: "Vous gagnez la confiance de la police." },
      },
    ],
  },
  {
    id: "price_war",
    title: "Guerre des prix",
    desc: "Une famille rivale baisse les prix de ses commerces légaux pour vous faire couler.",
    choices: [
      {
        label: "Baisser vos prix aussi (-10% revenus pendant 1h)",
        apply: (s) => {
          // Logique de malus temporaire (simplifié)
          return { ...s, respect: s.respect + 10 };
        },
        meta: { info: "Vous montrez que vous ne vous laisserez pas faire." },
      },
      {
        label: "Saboter leurs commerces (+15⚡, +10🔥)",
        apply: (s) => ({
          ...s,
          tension: Math.min(100, (s.tension || 0) + 15),
          heat: Math.min(100, s.heat + 10),
        }),
        meta: { info: "Une réponse directe et violente." },
      },
    ],
  },
  {
    id: "neighborhood_party",
    title: "Fête de quartier",
    desc: "Organiser une grande fête pour les habitants de votre quartier pourrait améliorer votre image.",
    choices: [
      {
        label: "Organiser la fête (-$8k, +15👑, -5🔥)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 8000),
          respect: s.respect + 15,
          heat: Math.max(0, s.heat - 5),
        }),
        meta: { info: "Le peuple vous aime." },
      },
      {
        label: "Pas le temps pour ces futilités",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "designer_drug",
    title: "Drogue de synthèse",
    desc: "Une nouvelle drogue de synthèse inonde le marché. C'est une opportunité de se faire de l'argent rapidement.",
    choices: [
      {
        label: "Prendre le contrôle du marché (+$150k, +35🔥)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 150000,
          heat: Math.min(100, s.heat + 35),
        }),
        meta: { info: "Un profit énorme, mais la DEA est sur vos talons." },
      },
      {
        label: "Ce poison ne touchera pas nos rues",
        apply: (s) => ({ ...s, respect: s.respect + 10 }),
        meta: { info: "Vous avez des principes." },
      },
    ],
  },
  {
    id: "kidnapping_ransom",
    title: "Kidnapping et rançon",
    desc: "Le fils d'un riche industriel est une cible facile. Le kidnapper pourrait rapporter gros.",
    choices: [
      {
        label: "Organiser l'enlèvement (+$250k, +40🔥)",
        apply: (s) => {
          const win = Math.random() < 0.6;
          return {
            ...s,
            cash: s.cash + (win ? 250000 : -75000),
            heat: Math.min(100, s.heat + 40),
          };
        },
        meta: {
          successChance: 0.6,
          info: "Le crime paie... la plupart du temps.",
        },
      },
      {
        label: "On ne touche pas aux enfants",
        apply: (s) => ({ ...s, respect: s.respect + 5 }),
      },
    ],
  },
  {
    id: "tax_audit",
    title: "Contrôle fiscal",
    desc: "Le fisc a décidé de jeter un œil à la comptabilité de vos entreprises légales.",
    choices: [
      {
        label: "Graisser la patte du contrôleur (-$30k)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 30000),
          heat: Math.max(0, s.heat - 5),
        }),
        meta: { info: "L'argent achète le silence." },
      },
      {
        label: "Laisser vos avocats s'en charger (-$15k, +5🔥)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 15000),
          heat: Math.min(100, s.heat + 5),
        }),
        meta: { info: "Vos avocats sont bons, mais ça attire l'attention." },
      },
    ],
  },
  {
    id: "new_supplier",
    title: "Nouveau fournisseur",
    desc: "Un nouveau fournisseur vous propose des produits de meilleure qualité pour vos bars et restaurants.",
    choices: [
      {
        label: "Signer le contrat (+10% revenus légaux pendant 1h)",
        apply: (s) => {
          // Logique de buff temporaire (simplifié)
          return { ...s, respect: s.respect + 5 };
        },
        meta: { info: "La qualité paie toujours." },
      },
      {
        label: "Rester fidèle à l'ancien",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "sabotage_rival",
    title: "Sabotage",
    desc: "Une occasion de saboter une des opérations d'une famille rivale se présente.",
    choices: [
      {
        label: "Faire sauter leur entrepôt (+15⚡, +10🔥)",
        apply: (s) => ({
          ...s,
          tension: Math.min(100, (s.tension || 0) + 15),
          heat: Math.min(100, s.heat + 10),
        }),
        meta: { info: "Un message clair et explosif." },
      },
      {
        label: "Laisser tomber",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "internal_betrayal",
    title: "Trahison interne",
    desc: "Vous apprenez qu'un de vos hommes vend des informations à une famille rivale.",
    choices: [
      {
        label: "L'exécuter en public (+20👑, +5🔥)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 20,
          heat: Math.min(100, s.heat + 5),
        }),
        meta: { info: "La trahison se paie par le sang." },
      },
      {
        label: "L'utiliser pour intoxiquer le rival (-10🔥)",
        apply: (s) => ({
          ...s,
          heat: Math.max(0, s.heat - 10),
        }),
        meta: { info: "Un agent double à votre service." },
      },
    ],
  },
  {
    id: "request_for_help",
    title: "Demande d'aide",
    desc: "Un petit gang local est harcelé par une famille rivale et vous demande votre protection.",
    choices: [
      {
        label: "Les protéger (-$10k, +20👑)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 10000),
          respect: s.respect + 20,
        }),
        meta: { info: "Votre réputation de protecteur grandit." },
      },
      {
        label: "Les laisser se débrouiller",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "money_laundering",
    title: "Blanchiment d'argent",
    desc: "Une banque offshore vous propose de blanchir une grosse somme d'argent sale.",
    choices: [
      {
        label: "Blanchir 25% de votre cash (-5🔥)",
        apply: (s) => ({
          ...s,
          heat: Math.max(0, s.heat - 5),
        }),
        meta: { info: "Votre argent est maintenant propre." },
      },
      {
        label: "Trop suspect",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "illegal_street_race",
    title: "Course de rue illégale",
    desc: "Une course de rue est organisée ce soir. C'est l'occasion de montrer la puissance de vos bolides.",
    choices: [
      {
        label: "Parier sur votre meilleur pilote (+$50k ou -$20k)",
        apply: (s) => {
          const win = Math.random() < 0.5;
          return {
            ...s,
            cash: s.cash + (win ? 50000 : -20000),
          };
        },
        meta: { successChance: 0.5, info: "La vitesse et le risque." },
      },
      {
        label: "Ne pas participer",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "old_score_to_settle",
    title: "Vieux compte à régler",
    desc: "Un vieil ennemi, que vous pensiez disparu, est de retour en ville et cherche à se venger.",
    choices: [
      {
        label: "L'éliminer une bonne fois pour toutes (+15👑, +10🔥)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 15,
          heat: Math.min(100, s.heat + 10),
        }),
        meta: { info: "Le passé est le passé." },
      },
      {
        label: "Tenter une réconciliation (-10👑)",
        apply: (s) => ({
          ...s,
          respect: Math.max(0, s.respect - 10),
        }),
        meta: { info: "Certains diront que c'est une faiblesse." },
      },
    ],
  },
  {
    id: "poisoned_inheritance",
    title: "Héritage empoisonné",
    desc: "Vous héritez d'un restaurant d'un Don récemment décédé. L'affaire est rentable, mais elle est criblée de dettes.",
    choices: [
      {
        label: "Accepter l'héritage (+15% revenus 3h, -$100k)",
        apply: (s) => {
          // Génère un petit buff permanent de 15% sous forme de multiplicateur
          const newMult = (s.permaGlobalMult ?? 1) * 1.05; // Ajoute un petit bonus permanent
          return {
            ...s,
            cash: Math.max(0, s.cash - 100000),
            permaGlobalMult: newMult,
            respect: s.respect + 15,
            tempGlobalBuffUntil: Math.max(
              s.tempGlobalBuffUntil ?? 0,
              Date.now() + 3 * 60 * 60 * 1000
            ),
          };
        },
        meta: { info: "Un investissement lucratif. Restaurant opérationnel!" },
      },
      {
        label: "Refuser l'héritage",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "dockworker_strike",
    title: "Grève au port",
    desc: "Les dockers sont en grève, bloquant toutes vos importations et exportations.",
    choices: [
      {
        label: "Briser la grève (-$15k, +10👑)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 15000),
          respect: s.respect + 10,
        }),
        meta: { info: "Les affaires reprennent." },
      },
      {
        label: "Soutenir les grévistes (+5👑, +relations)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 5,
          tension: Math.max(0, (s.tension || 0) - 5), // Réduit la tension avec les groupes
        }),
        meta: {
          info: "Vous gagnez le soutien du syndicat et réduisez la tension.",
        },
      },
    ],
  },
  {
    id: "new_da",
    title: "Nouveau procureur",
    desc: "Un nouveau procureur zélé a été élu. Il a juré de faire tomber le crime organisé.",
    choices: [
      {
        label: "Lui envoyer un message de 'bienvenue' (+20🔥)",
        apply: (s) => ({
          ...s,
          heat: Math.min(100, s.heat + 20),
        }),
        meta: { info: "Il sait maintenant à qui il a affaire." },
      },
      {
        label: "Rester discret pour le moment (-10🔥)",
        apply: (s) => ({
          ...s,
          heat: Math.max(0, s.heat - 10),
        }),
        meta: { info: "La prudence est mère de sûreté." },
      },
    ],
  },
  {
    id: "film_festival",
    title: "Festival de cinéma",
    desc: "Le festival de cinéma local attire des célébrités et des touristes fortunés. Une aubaine pour vos casinos.",
    choices: [
      {
        label:
          "Organiser des soirées privées (+25% revenus casinos pendant 2h)",
        apply: (s) => {
          // Applique un buff temporaire de 2 heures (7200000 ms)
          return {
            ...s,
            tempGlobalBuffUntil: Math.max(
              s.tempGlobalBuffUntil ?? 0,
              Date.now() + 2 * 60 * 60 * 1000
            ),
            cash: s.cash + 50000, // Mise de fonds initiale
            respect: s.respect + 10,
          };
        },
        meta: {
          info: "Les stars se pressent à vos tables de jeu. +50% revenus!",
        },
      },
      {
        label: "Ignorer l'événement",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "natural_disaster",
    title: "Catastrophe naturelle",
    desc: "Un tremblement de terre a frappé la ville, semant le chaos. La police est débordée.",
    choices: [
      {
        label: "Profiter de la confusion pour piller (+$120k, +15🔥)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 120000,
          heat: Math.min(100, s.heat + 15),
        }),
        meta: { info: "Le malheur des uns fait le bonheur des autres." },
      },
      {
        label: "Aider les victimes (-$20k, +20👑, -10🔥)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 20000),
          respect: s.respect + 20,
          heat: Math.max(0, s.heat - 10),
        }),
        meta: { info: "Un geste qui ne sera pas oublié." },
      },
    ],
  },
  {
    id: "family_tribute_demand",
    title: "Tribut exigé par {familyName}",
    desc: "La famille {familyName} estime que vous opérez sur son territoire et exige un tribut pour 'protection'.",
    choices: [
      {
        label: "Payer le tribut (-10% cash)",
        apply: (s) => ({
          ...s,
          cash: s.cash * 0.9,
        }),
        meta: { info: "Une humiliation coûteuse, mais qui évite la guerre." },
      },
      {
        label: "Refuser et déclarer la guerre",
        apply: (s) => {
          // La logique de déclaration de guerre sera gérée côté MafiaIdleGame.tsx
          return s;
        },
        meta: { info: "Préparez-vous au combat." },
      },
    ],
  },
  {
    id: "family_peace_offer",
    title: "Offre de paix de {familyName}",
    desc: "La famille {familyName}, actuellement en guerre avec vous, propose une trêve. Ils semblent fatigués du conflit.",
    choices: [
      {
        label: "Accepter la paix",
        apply: (s) => {
          // Logique de paix gérée côté MafiaIdleGame.tsx
          return s;
        },
        meta: { info: "La paix est toujours une option." },
      },
      {
        label: "Refuser et continuer le combat",
        apply: (s) => ({ ...s, respect: s.respect + 20 }),
        meta: { info: "Votre détermination vous fait gagner en respect." },
      },
    ],
  },
  {
    id: "family_joint_operation",
    title: "Opération conjointe avec {familyName}",
    desc: "La famille {familyName} vous propose de vous associer pour un gros coup : le braquage d'un convoi de la banque fédérale.",
    choices: [
      {
        label: "Accepter (+$500k, +50🔥)",
        apply: (s) => {
          const win = Math.random() < 0.7;
          return {
            ...s,
            cash: s.cash + (win ? 500000 : -100000),
            heat: Math.min(100, s.heat + 50),
          };
        },
        meta: {
          successChance: 0.7,
          info: "Un butin colossal ou une catastrophe.",
        },
      },
      {
        label: "Refuser, trop risqué",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "loan_shark",
    title: "Usurier local",
    desc: "Un usurier propose de vous prêter de l'argent à des taux avantageux... pour le crime organisé.",
    choices: [
      {
        label: "Emprunter +$50k",
        apply: (s) => ({
          ...s,
          cash: s.cash + 50000,
        }),
        meta: { info: "Argent frais avec des conséquences futures." },
      },
      {
        label: "Refuser",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "spy_network",
    title: "Réseau d'espions",
    desc: "Un agent propose de mettre en place un réseau d'espions pour surveiller les familles rivales.",
    choices: [
      {
        label: "Créer le réseau (-$30k, +20👑)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 30000),
          respect: s.respect + 20,
        }),
        meta: { info: "Information = pouvoir." },
      },
      {
        label: "Pas le temps",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "bribe_official",
    title: "Fonctionnaire corruptible",
    desc: "Un officiel gouvernemental offre ses services contre une corruption régulière.",
    choices: [
      {
        label: "Créer un lien (-$40k/mois, -15🔥 permanent)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 40000),
          heat: Math.max(0, s.heat - 15),
          respect: s.respect + 5,
        }),
        meta: { info: "Accès protégé aux informations gouvernementales." },
      },
      {
        label: "Déclin",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "rival_defection",
    title: "Défection d'un rival",
    desc: "Un cadre d'une famille rivale veut changer de camp. Il prétend avoir des secrets précieux.",
    choices: [
      {
        label: "Le recruter (-$35k, +30👑, +20🔥)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 35000),
          respect: s.respect + 30,
          heat: Math.min(100, s.heat + 20),
        }),
        meta: { info: "Un atout précieux, mais dangereux." },
      },
      {
        label: "Le refuser",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "smuggling_route",
    title: "Nouvelle route de contrebande",
    desc: "Un contact offre une route sûre pour importer des marchandises illégales.",
    choices: [
      {
        label: "Établir la route (+$25k, +8🔥)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 25000,
          heat: Math.min(100, s.heat + 8),
        }),
        meta: { info: "Revenus via contrebande accélérée." },
      },
      {
        label: "Trop dangereux",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "bodyguard_contract",
    title: "Contrat de sécurité",
    desc: "Une célébrité ou un politicien veut embaucher vos meilleurs hommes comme gardes du corps.",
    choices: [
      {
        label: "Accepter (+$20k/h, +10👑)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 20000,
          respect: s.respect + 10,
        }),
        meta: { info: "Service respectueux et lucratif." },
      },
      {
        label: "Nos hommes ne sont pas des baby-sitters",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "underground_casino_expansion",
    title: "Expansion du casino clandestin",
    desc: "Une opportunité d'étendre votre casino clandestin avec des jeux de plus haut niveau.",
    choices: [
      {
        label: "Expansion (+$40k, +25% revenus casino/h)",
        apply: (s) => {
          const newMult = (s.permaGlobalMult ?? 1) * 1.08;
          return {
            ...s,
            cash: Math.max(0, s.cash - 40000),
            permaGlobalMult: newMult,
            heat: Math.min(100, s.heat + 5),
          };
        },
        meta: { info: "Les hauts-fonds attirent les gros joueurs." },
      },
      {
        label: "Rester discret",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "political_alliance",
    title: "Alliance politique",
    desc: "Un politicien en montée vous propose une alliance contre d'autres puissances.",
    choices: [
      {
        label: "Former l'alliance (-$25k, -20🔥, +20👑)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 25000),
          heat: Math.max(0, s.heat - 20),
          respect: s.respect + 20,
        }),
        meta: { info: "Protection politique en échange de faveurs." },
      },
      {
        label: "Rester neutre",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "street_legend",
    title: "Légende de rue",
    desc: "Vos exploits créent une légende urbaine qui vous précède. Utiliser votre réputation.",
    choices: [
      {
        label: "Exploiter la légende (+25% respect/h pendant 1h)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 100,
          tempGlobalBuffUntil: Math.max(
            s.tempGlobalBuffUntil ?? 0,
            Date.now() + 60 * 60 * 1000
          ),
        }),
        meta: { info: "La peur est aussi utile que l'argent." },
      },
      {
        label: "Ignorer",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "legitimate_business",
    title: "Façade légitime",
    desc: "Une opportunité d'acquérir une chaîne de magasins pour blanchir votre argent.",
    choices: [
      {
        label: "Acheter la chaîne (-$100k, +5% revenus/h)",
        apply: (s) => {
          const newMult = (s.permaGlobalMult ?? 1) * 1.05;
          return {
            ...s,
            cash: Math.max(0, s.cash - 100000),
            permaGlobalMult: newMult,
            heat: Math.max(0, s.heat - 10),
          };
        },
        meta: { info: "Blanchiment massif d'argent sale." },
      },
      {
        label: "Pas intéressé",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "hacker_collective",
    title: "Collectif de hackers",
    desc: "Des hackers proposent de dérober des données bancaires et gouvernementales.",
    choices: [
      {
        label: "Engager les hackers (-$50k, +$75k)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 25000,
          heat: Math.min(100, s.heat + 12),
        }),
        meta: { info: "Cybercriminalité sophistiquée." },
      },
      {
        label: "Rester hors du numérique",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "turf_claim",
    title: "Revendication de territoire",
    desc: "Un gang local conteste votre contrôle d'une zone stratégique.",
    choices: [
      {
        label: "Massacrer (+20👑, +30⚡, +15🔥)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 20,
          tension: Math.min(100, (s.tension ?? 0) + 30),
          heat: Math.min(100, s.heat + 15),
        }),
        meta: { info: "Violente affirmation de domination." },
      },
      {
        label: "Négocier (-$10k, +10👑)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 10000),
          respect: s.respect + 10,
        }),
        meta: { info: "Maintenir la paix par le commerce." },
      },
    ],
  },
  {
    id: "witness_protection",
    title: "Protection de témoins",
    desc: "Vous devez envoyer un témoin se cacher dans une autre ville.",
    choices: [
      {
        label: "Organiser la fuite (-$15k, +5👑)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 15000),
          respect: s.respect + 5,
        }),
        meta: { info: "Loyauté envers les troupes." },
      },
      {
        label: "Le laisser se débrouiller (-10👑)",
        apply: (s) => ({
          ...s,
          respect: Math.max(0, s.respect - 10),
        }),
        meta: { info: "L'armada apprendra la trahison." },
      },
    ],
  },
  {
    id: "cultural_event",
    title: "Événement culturel",
    desc: "Un festival ou une exposition d'art attire une clientèle riche et influente.",
    choices: [
      {
        label: "Sponsoriser (-$20k, +15👑, +2% revenus/h)",
        apply: (s) => {
          const newMult = (s.permaGlobalMult ?? 1) * 1.02;
          return {
            ...s,
            cash: Math.max(0, s.cash - 20000),
            respect: s.respect + 15,
            permaGlobalMult: newMult,
          };
        },
        meta: { info: "Les arts financent vos opérations." },
      },
      {
        label: "Ignorer",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "debt_collection",
    title: "Recouvrement de dette",
    desc: "D'autres criminels vous doivent de l'argent. Il est temps de collecter.",
    choices: [
      {
        label: "Collecter les dettes (+$80k, +10👑)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 80000,
          respect: s.respect + 10,
          heat: Math.min(100, s.heat + 5),
        }),
        meta: { info: "Quand les dettes se transforment en argent." },
      },
      {
        label: "Donner un délai supplémentaire",
        apply: (s) => ({
          ...s,
          respect: Math.max(0, s.respect - 5),
        }),
        meta: { info: "La faiblesse se propage." },
      },
    ],
  },
  {
    id: "hostage_exchange",
    title: "Échange d'otages",
    desc: "Récupérer un de vos hommes emprisonné en échangeant contre un otage.",
    choices: [
      {
        label: "Négocier l'échange (-$25k, +20👑)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 25000),
          respect: s.respect + 20,
        }),
        meta: { info: "Récupère un homme en échange d'argent/biens." },
      },
      {
        label: "L'abandonner (l'oublier)",
        apply: (s) => ({
          ...s,
          respect: Math.max(0, s.respect - 25),
        }),
        meta: { info: "Terrible pour le moral des troupes." },
      },
    ],
  },
  {
    id: "rare_resource_deal",
    title: "Accord sur ressource rare",
    desc: "Un contact offre un accès exclusif à une ressource précieuse et revendicable.",
    choices: [
      {
        label: "Sécuriser l'accès (-$60k, +10% revenus permanent)",
        apply: (s) => {
          const newMult = (s.permaGlobalMult ?? 1) * 1.1;
          return {
            ...s,
            cash: Math.max(0, s.cash - 60000),
            permaGlobalMult: newMult,
          };
        },
        meta: { info: "Avantage compétitif majeur." },
      },
      {
        label: "Trop cher",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "reputation_crisis",
    title: "Crise de réputation",
    desc: "Un scandale menace de détruire votre réputation publique.",
    choices: [
      {
        label: "Gérer la crise (-$50k, -20👑)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 50000),
          respect: Math.max(0, s.respect - 20),
        }),
        meta: { info: "Limiter les dégâts est parfois un succès." },
      },
      {
        label: "Nier et contre-attaquer (+15🔥, -30👑)",
        apply: (s) => ({
          ...s,
          heat: Math.min(100, s.heat + 15),
          respect: Math.max(0, s.respect - 30),
        }),
        meta: { info: "La violence ne règle pas tout." },
      },
    ],
  },
  {
    id: "expansion_opportunity",
    title: "Opportunité d'expansion",
    desc: "Une région voisine est prête à être conquise. Une excellente occasion de croissance.",
    choices: [
      {
        label: "Conquérir la région (-$150k, +5% revenus/h)",
        apply: (s) => {
          const newMult = (s.permaGlobalMult ?? 1) * 1.05;
          return {
            ...s,
            cash: Math.max(0, s.cash - 150000),
            permaGlobalMult: newMult,
            heat: Math.min(100, s.heat + 20),
            tension: Math.min(100, (s.tension ?? 0) + 15),
          };
        },
        meta: { info: "Expansion = Risque mais croissance garantie." },
      },
      {
        label: "Rester à la maison",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "informant_bust",
    title: "Taupe identifiée",
    desc: "Vous découvrez qu'un de vos informateurs travaille pour la police.",
    choices: [
      {
        label: "L'éliminer (+15👑, +10🔥)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 15,
          heat: Math.min(100, s.heat + 10),
        }),
        meta: { info: "Message clair : la trahison se paie." },
      },
      {
        label: "L'utiliser comme agent double (-10🔥, +8👑)",
        apply: (s) => ({
          ...s,
          heat: Math.max(0, s.heat - 10),
          respect: s.respect + 8,
        }),
        meta: { info: "Retourner la situation en votre faveur." },
      },
    ],
  },
  {
    id: "legal_diversification",
    title: "Diversification légale",
    desc: "Investir dans des entreprises légales offre un couvert parfait pour vos opérations.",
    choices: [
      {
        label: "Investir dans les ressources (-$120k, +8% revenus/h)",
        apply: (s) => {
          const newMult = (s.permaGlobalMult ?? 1) * 1.08;
          return {
            ...s,
            cash: Math.max(0, s.cash - 120000),
            permaGlobalMult: newMult,
            heat: Math.max(0, s.heat - 8),
          };
        },
        meta: { info: "Blanchiment + légitimité = parfait." },
      },
      {
        label: "Rester 100% criminel",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "ghost_town_control",
    title: "Contrôle d'une ville fantôme",
    desc: "Une petite ville isolée propose de vous reconnaître comme leader officieux.",
    choices: [
      {
        label: "Prendre le contrôle (-$80k, +3% revenus/h permanent)",
        apply: (s) => {
          const newMult = (s.permaGlobalMult ?? 1) * 1.03;
          return {
            ...s,
            cash: Math.max(0, s.cash - 80000),
            permaGlobalMult: newMult,
            respect: s.respect + 25,
          };
        },
        meta: { info: "Un fief personnel en arrière-pays." },
      },
      {
        label: "Trop compliqué",
        apply: (s) => s,
      },
    ],
  },
  // ===== JUSTICE & LÉGALITÉ =====
  {
    id: "trial_outcome",
    title: "Verdict du procès",
    desc: "Vous êtes jugé pour des accusations graves. Les dés sont jetés.",
    choices: [
      {
        label: "Acquittal (+30👑, -20🔥, +$50k)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 30,
          heat: Math.max(0, s.heat - 20),
          cash: s.cash + 50000,
        }),
        meta: { info: "Justice corrompue à votre faveur." },
      },
      {
        label: "Condamnation réduite (-10👑, +10🔥)",
        apply: (s) => ({
          ...s,
          respect: Math.max(0, s.respect - 10),
          heat: Math.min(100, s.heat + 10),
        }),
        meta: { info: "Pas idéal, mais ça aurait pu être pire." },
      },
    ],
  },
  {
    id: "prison_break",
    title: "Évasion de prison",
    desc: "Un de vos hommes importants est emprisonné. Vous pouvez organiser son évasion.",
    choices: [
      {
        label: "Organiser l'évasion (-$80k, +20👑, +20🔥)",
        apply: (s) => {
          const win = Math.random() < 0.6;
          return {
            ...s,
            cash: Math.max(0, s.cash - 80000),
            respect: s.respect + (win ? 20 : -15),
            heat: Math.min(100, s.heat + (win ? 20 : 35)),
          };
        },
        meta: { successChance: 0.6, info: "Succès: +20👑, Échec: -15👑 +35🔥" },
      },
      {
        label: "Attendre sa libération (-15👑)",
        apply: (s) => ({
          ...s,
          respect: Math.max(0, s.respect - 15),
        }),
        meta: { info: "L'abandon affaiblit la famille." },
      },
    ],
  },
  {
    id: "witness_flip",
    title: "Témoin qui se retourne",
    desc: "Un témoin clé change son témoignage contre vous pour le fédéral.",
    choices: [
      {
        label: "Le retrouver (-$40k, +15👑, +15🔥)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 40000),
          respect: s.respect + 15,
          heat: Math.min(100, s.heat + 15),
        }),
        meta: { info: "Justice criminelle rapide." },
      },
      {
        label: "Plaider coupable (-30👑, -15🔥)",
        apply: (s) => ({
          ...s,
          respect: Math.max(0, s.respect - 30),
          heat: Math.max(0, s.heat - 15),
        }),
        meta: { info: "Sacrifice et rédemption." },
      },
    ],
  },
  {
    id: "corrupt_judge",
    title: "Judge corrompu",
    desc: "Un juge offre de modifier les sentences... pour un prix.",
    choices: [
      {
        label: "Payer pour les faveurs (-$60k, -15🔥 permanent)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 60000),
          heat: Math.max(0, s.heat - 15),
          respect: s.respect + 10,
        }),
        meta: { info: "Justice pliée à votre volonté." },
      },
      {
        label: "Refuser",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "legal_appeal",
    title: "Appel en cour suprême",
    desc: "Une dernière chance: un appel auprès de la cour suprême pour casser une condamnation.",
    choices: [
      {
        label: "Déposer l'appel (-$100k, +25👑)",
        apply: (s) => {
          const win = Math.random() < 0.45;
          return {
            ...s,
            cash: Math.max(0, s.cash - 100000),
            respect: s.respect + (win ? 25 : -10),
            heat: Math.max(0, s.heat - (win ? 25 : 0)),
          };
        },
        meta: { successChance: 0.45, info: "L'ultime recours judiciaire." },
      },
      {
        label: "Accepter la sentence",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "pardon_opportunity",
    title: "Opportunité de grâce présidentielle",
    desc: "Un contact au gouvernement offre une grâce présidentielle... à un prix très élevé.",
    choices: [
      {
        label: "Acheter la grâce (-$200k, +40👑, -40🔥)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 200000),
          respect: s.respect + 40,
          heat: Math.max(0, s.heat - 40),
        }),
        meta: { info: "La justice suprême s'achète au plus haut prix." },
      },
      {
        label: "Trop cher",
        apply: (s) => s,
      },
    ],
  },
  // ===== SANTÉ & ACCIDENTS =====
  {
    id: "assassination_attempt",
    title: "Tentative d'assassinat",
    desc: "Un ennemi a commandité un tueur à gages pour vous éliminer.",
    choices: [
      {
        label: "Survivre et contre-attaquer (+25👑, +20🔥)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 25,
          heat: Math.min(100, s.heat + 20),
        }),
        meta: { info: "L'adversité forge les vrais chefs." },
      },
      {
        label: "Se cacher temporairement (-10👑, -10🔥)",
        apply: (s) => ({
          ...s,
          respect: Math.max(0, s.respect - 10),
          heat: Math.max(0, s.heat - 10),
        }),
        meta: { info: "Prudence avant tout." },
      },
    ],
  },
  {
    id: "food_poisoning",
    title: "Empoisonnement alimentaire",
    desc: "Un rival tente d'empoisonner votre nourriture lors d'un événement public.",
    choices: [
      {
        label: "Inverser le poison (+20👑, +15🔥, -$30k)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 20,
          heat: Math.min(100, s.heat + 15),
          cash: Math.max(0, s.cash - 30000),
        }),
        meta: { info: "Le comploteur devient la victime." },
      },
      {
        label: "Ignorer le danger",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "hospital_bribe",
    title: "Corruption à l'hôpital",
    desc: "Un cadre médical veut vous vendre des registres de patients VIP pour du chantage.",
    choices: [
      {
        label: "Acheter les dossiers (-$50k, +15👑, +10🔥)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 50000),
          respect: s.respect + 15,
          heat: Math.min(100, s.heat + 10),
        }),
        meta: { info: "Chantage médical lucratif." },
      },
      {
        label: "Passer",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "doctor_disappearance",
    title: "Disparition d'un médecin",
    desc: "Le seul docteur capable de tracer vos crimes disparaît mystérieusement.",
    choices: [
      {
        label: "Organiser la disparition (+20👑, +5🔥)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 20,
          heat: Math.min(100, s.heat + 5),
        }),
        meta: { info: "Pas de preuves = pas de crime." },
      },
      {
        label: "Le laisser en paix (-5👑)",
        apply: (s) => ({
          ...s,
          respect: Math.max(0, s.respect - 5),
        }),
        meta: { info: "Montrer de la compassion." },
      },
    ],
  },
  {
    id: "epidemic_opportunity",
    title: "Opportunité épidémique",
    desc: "Une épidémie paralyse la ville. Les opportunités criminelles explosent.",
    choices: [
      {
        label: "Profiter du chaos (+$120k, +12🔥, +3% revenus)",
        apply: (s) => {
          const newMult = (s.permaGlobalMult ?? 1) * 1.03;
          return {
            ...s,
            cash: s.cash + 120000,
            heat: Math.min(100, s.heat + 12),
            permaGlobalMult: newMult,
          };
        },
        meta: { info: "Le malheur est un bonheur pour certains." },
      },
      {
        label: "Aider les victimes (-$40k, +10👑, -5🔥)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 40000),
          respect: s.respect + 10,
          heat: Math.max(0, s.heat - 5),
        }),
        meta: { info: "Humanité en temps de crise." },
      },
    ],
  },
  {
    id: "organ_trafficking",
    title: "Trafic d'organes",
    desc: "Un réseau de trafiquants d'organes propose de vous faire entrer dans le business.",
    choices: [
      {
        label: "Rejoindre le réseau (+$150k, +25👑, +25🔥)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 150000,
          respect: s.respect + 25,
          heat: Math.min(100, s.heat + 25),
        }),
        meta: { info: "L'ultime déprédation humaine." },
      },
      {
        label: "Dénoncer le réseau (-$20k, -10👑, -20🔥)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 20000),
          respect: Math.max(0, s.respect - 10),
          heat: Math.max(0, s.heat - 20),
        }),
        meta: { info: "Même les criminels ont des limites." },
      },
    ],
  },
  // ===== FINANCE AVANCÉE =====
  {
    id: "stock_manipulation",
    title: "Manipulation d'actions",
    desc: "Des brokers véreux vous proposent de manipuler le marché boursier.",
    choices: [
      {
        label: "Manipuler les stocks (+$200k, +8% revenus, +10🔥)",
        apply: (s) => {
          const newMult = (s.permaGlobalMult ?? 1) * 1.08;
          return {
            ...s,
            cash: s.cash + 200000,
            permaGlobalMult: newMult,
            heat: Math.min(100, s.heat + 10),
          };
        },
        meta: { info: "Fraude financière à grande échelle." },
      },
      {
        label: "Rester légal",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "cryptocurrency_heist",
    title: "Vol de crypto-monnaies",
    desc: "Des hackers proposent de voler des portefeuilles crypto d'oligarques.",
    choices: [
      {
        label: "Financer le vol (-$100k, +$300k, +8🔥)",
        apply: (s) => ({
          ...s,
          cash: s.cash - 100000 + 300000,
          heat: Math.min(100, s.heat + 8),
        }),
        meta: { info: "Richesses numériques, traces numériques." },
      },
      {
        label: "Trop technologique",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "money_transfer_block",
    title: "Blocage de transfert",
    desc: "Vos transferts bancaires sont bloqués par les autorités. Il faut payer pour débloquer.",
    choices: [
      {
        label: "Payer pour débloquer (-$50k)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 50000),
          heat: Math.max(0, s.heat - 10),
        }),
        meta: { info: "L'argent résout les blocages." },
      },
      {
        label: "Contourner le système (-$30k, +15🔥)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 30000),
          heat: Math.min(100, s.heat + 15),
        }),
        meta: { info: "Routes illégales plus efficaces." },
      },
    ],
  },
  {
    id: "bank_collapse",
    title: "Effondrement bancaire",
    desc: "Une banque où vous aviez des fonds s'effondre. Vous pouvez profiter du chaos.",
    choices: [
      {
        label: "Piller les restes (+$250k, +15🔥)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 250000,
          heat: Math.min(100, s.heat + 15),
        }),
        meta: { info: "La fin justifie les moyens." },
      },
      {
        label: "Réclamer votre dû (+$100k)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 100000,
        }),
        meta: { info: "Voie légale mais moins lucrative." },
      },
    ],
  },
  {
    id: "investment_dividend",
    title: "Dividende d'investissement",
    desc: "Vos investissements légaux génèrent un dividende substantiel.",
    choices: [
      {
        label: "Réinvestir (+$150k, +6% revenus)",
        apply: (s) => {
          const newMult = (s.permaGlobalMult ?? 1) * 1.06;
          return {
            ...s,
            cash: s.cash + 150000,
            permaGlobalMult: newMult,
          };
        },
        meta: { info: "L'argent engendre l'argent." },
      },
      {
        label: "Prendre les profits (+$150k)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 150000,
        }),
        meta: { info: "Jouir des fruits du travail." },
      },
    ],
  },
  {
    id: "pension_fund_theft",
    title: "Vol de fonds de pension",
    desc: "Des comptables véreux proposent de détourner les fonds de pension d'une grande entreprise.",
    choices: [
      {
        label: "Planifier le vol (-$75k, +$300k, +20🔥)",
        apply: (s) => {
          const win = Math.random() < 0.5;
          return {
            ...s,
            cash: s.cash - 75000 + (win ? 300000 : -100000),
            heat: Math.min(100, s.heat + (win ? 20 : 40)),
          };
        },
        meta: { successChance: 0.5, info: "Gros coup ou grosse faillite." },
      },
      {
        label: "Refuser",
        apply: (s) => s,
      },
    ],
  },
  // ===== MÉDIAS & RÉPUTATION =====
  {
    id: "viral_moment",
    title: "Moment viral",
    desc: "Une vidéo de vos exploits devient virale sur les réseaux. Bonne ou mauvaise pub?",
    choices: [
      {
        label: "Exploiter le buzz (+$80k, +20👑, +10🔥)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 80000,
          respect: s.respect + 20,
          heat: Math.min(100, s.heat + 10),
        }),
        meta: { info: "La notoriété a un prix." },
      },
      {
        label: "Faire taire la vidéo (-$40k, -5🔥)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 40000),
          heat: Math.max(0, s.heat - 5),
        }),
        meta: { info: "Contrôle des dégâts." },
      },
    ],
  },
  {
    id: "influencer_collab",
    title: "Collaboration avec influenceur",
    desc: "Un influenceur propose de promouvoir vos 'entreprises' contre rémunération.",
    choices: [
      {
        label: "Sponsoriser (-$30k, +$60k, +10👑)",
        apply: (s) => ({
          ...s,
          cash: s.cash - 30000 + 60000,
          respect: s.respect + 10,
        }),
        meta: { info: "Marketing criminel du 21e siècle." },
      },
      {
        label: "Passer",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "documentary_pressure",
    title: "Pression documentaire",
    desc: "Un réalisateur documentaire veut vous filmer pour son enquête sur la mafia.",
    choices: [
      {
        label: "Le laisser filmer (+15👑, +20🔥)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 15,
          heat: Math.min(100, s.heat + 20),
        }),
        meta: { info: "Contrôle du narratif criminel." },
      },
      {
        label: "Intercepter le documentaire (-$50k, -10🔥)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 50000),
          heat: Math.max(0, s.heat - 10),
        }),
        meta: { info: "Silence payant." },
      },
    ],
  },
  {
    id: "fake_news_spread",
    title: "Propagation de fausses nouvelles",
    desc: "Vous pouvez utiliser les médias sociaux pour répandre des rumeurs contre vos rivaux.",
    choices: [
      {
        label: "Lancer la campagne (+$40k, +15👑, +5🔥)",
        apply: (s) => ({
          ...s,
          cash: s.cash + 40000,
          respect: s.respect + 15,
          heat: Math.min(100, s.heat + 5),
        }),
        meta: { info: "Information warfare criminel." },
      },
      {
        label: "Rester honnête",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "paparazzi_blackmail",
    title: "Chantage aux paparazzi",
    desc: "Des photographes clandestins ont capturé des moments compromettants de politiciens.",
    choices: [
      {
        label: "Acheter les photos (-$40k, +$100k)",
        apply: (s) => ({
          ...s,
          cash: s.cash - 40000 + 100000,
        }),
        meta: { info: "Secrets valent de l'or." },
      },
      {
        label: "Laisser les photos libres",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "award_ceremony",
    title: "Cérémonie de remise de prix",
    desc: "Une cérémonie de prix récompense les 'entrepreneurs les plus influents'. Vous êtes nominé.",
    choices: [
      {
        label: "Remporter le prix (-$30k, +25👑, -5🔥)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 30000),
          respect: s.respect + 25,
          heat: Math.max(0, s.heat - 5),
        }),
        meta: { info: "La légitimité façade." },
      },
      {
        label: "Ignorer la nomination",
        apply: (s) => s,
      },
    ],
  },
  // ===== RELATIONS FAMILIALES =====
  {
    id: "family_summit",
    title: "Sommet familial",
    desc: "Les chefs de famille se réunissent pour discuter de la paix et des territoires.",
    choices: [
      {
        label: "Négocier une alliance (-$50k, +20👑, -10⚡)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 50000),
          respect: s.respect + 20,
          tension: Math.max(0, (s.tension ?? 0) - 10),
        }),
        meta: { info: "Diplomatie mafiosa." },
      },
      {
        label: "Montrer la force (+15👑, +20⚡)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 15,
          tension: Math.min(100, (s.tension ?? 0) + 20),
        }),
        meta: { info: "Domination par la menace." },
      },
    ],
  },
  {
    id: "succession_crisis",
    title: "Crise de succession",
    desc: "Le parrain vieillit. Qui le remplacera? La question divise la famille.",
    choices: [
      {
        label: "Offrir votre candidature (+30👑, +25⚡)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 30,
          tension: Math.min(100, (s.tension ?? 0) + 25),
        }),
        meta: { info: "Ambition = conflits." },
      },
      {
        label: "Rester loyal au parrain (-10👑, -15⚡)",
        apply: (s) => ({
          ...s,
          respect: Math.max(0, s.respect - 10),
          tension: Math.max(0, (s.tension ?? 0) - 15),
        }),
        meta: { info: "La loyauté apaise les esprits." },
      },
    ],
  },
  {
    id: "godson_recruitment",
    title: "Recrutement du filleul",
    desc: "Le filleul d'un allié puissant veut rejoindre votre famille.",
    choices: [
      {
        label: "Le recruter (-$20k, +20👑, +10👑 futur)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 20000),
          respect: s.respect + 20,
        }),
        meta: { info: "Un lien précieux avec une autre famille." },
      },
      {
        label: "Le refuser (+5👑 imédiat)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 5,
        }),
        meta: { info: "Indépendance de pensée." },
      },
    ],
  },
  {
    id: "elder_wisdom",
    title: "Sagesse des anciens",
    desc: "Un ancêtre vénéré offre des conseils stratégiques précieux basés sur son expérience.",
    choices: [
      {
        label: "Écouter (-$10k pour cadeau, +4% revenus)",
        apply: (s) => {
          const newMult = (s.permaGlobalMult ?? 1) * 1.04;
          return {
            ...s,
            cash: Math.max(0, s.cash - 10000),
            permaGlobalMult: newMult,
            respect: s.respect + 10,
          };
        },
        meta: { info: "Sagesse vaut de l'or." },
      },
      {
        label: "Ignorer ses conseils",
        apply: (s) => s,
      },
    ],
  },
  {
    id: "family_business_split",
    title: "Scission du business familial",
    desc: "Des divergences idéologiques menacent de diviser les opérations familiales.",
    choices: [
      {
        label: "Chercher la réconciliation (-$30k, -15⚡)",
        apply: (s) => ({
          ...s,
          cash: Math.max(0, s.cash - 30000),
          tension: Math.max(0, (s.tension ?? 0) - 15),
        }),
        meta: { info: "L'unité est la force." },
      },
      {
        label: "Accepter la scission (+15👑, +20⚡)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 15,
          tension: Math.min(100, (s.tension ?? 0) + 20),
        }),
        meta: { info: "Parfois la séparation est inévitable." },
      },
    ],
  },
  {
    id: "legacy_inheritance",
    title: "Héritage dynastique",
    desc: "Un ancien boss décédé vous lègue une part importante de sa fortune et son influence.",
    choices: [
      {
        label: "Accepter l'héritage (+$300k, +50👑, +7% revenus)",
        apply: (s) => {
          const newMult = (s.permaGlobalMult ?? 1) * 1.07;
          return {
            ...s,
            cash: s.cash + 300000,
            respect: s.respect + 50,
            permaGlobalMult: newMult,
          };
        },
        meta: { info: "Un héritage qui change la destinée." },
      },
      {
        label: "Refuser par principe (+10👑, -$50k)",
        apply: (s) => ({
          ...s,
          respect: s.respect + 10,
          cash: Math.max(0, s.cash - 50000),
        }),
        meta: { info: "L'intégrité a un prix." },
      },
    ],
  },
];
