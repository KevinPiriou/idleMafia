import type { SaveState } from "./types";

export type TutorialStep = {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector pour highlight
  position: "top" | "bottom" | "left" | "right";
  action?: {
    type: "click" | "buy" | "assign";
    target: string;
    validation: (state: SaveState) => boolean;
  };
  optional?: boolean;
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "👋 Bienvenue dans La Famiglia",
    description: "Vous êtes le nouveau parrain. Bâtissez votre empire mafieux.",
    target: "#game-header",
    position: "bottom",
    optional: true,
  },
  {
    id: "explain_cash",
    title: "💰 Le Cash",
    description:
      "Le nerf de la guerre. Utilisez-le pour acheter des opérations et étendre votre influence.",
    target: '[data-stat="cash"]',
    position: "bottom",
  },
  {
    id: "buy_first_gen",
    title: "Première Opération",
    description:
      "Achetez votre premier <b>Pickpocket</b> pour commencer à générer du cash.",
    target: '[data-generator="pickpocket"]',
    position: "right",
    action: {
      type: "buy",
      target: "pickpocket",
      validation: (s) => s.gens.pickpocket.owned >= 1,
    },
  },
  {
    id: "explain_heat",
    title: "🔥 Attention à la Chaleur",
    description:
      "Les opérations illégales augmentent la chaleur. Si elle atteint 100, vos opérations s'arrêtent !",
    target: '[data-stat="heat"]',
    position: "bottom",
  },
  {
    id: "explain_respect",
    title: "� Le Respect",
    description:
      "Le respect augmente avec vos revenus et vous permet d'asseoir votre autorité.",
    target: '[data-stat="respect"]',
    position: "bottom",
  },
  {
    id: "explain_omerta",
    title: "🤝 L'Omertà",
    description:
      "Réinitialisez votre progression pour gagner des points d'Omertà et débloquer de puissants bonus permanents.",
    target: '[data-stat="omerta"]',
    position: "left",
  },
  {
    id: "explain_level",
    title: "⭐ Votre Niveau",
    description:
      "Gagnez de l'expérience en générant du cash et en dépensant de l'argent pour monter en niveau.",
    target: '[data-stat="level"]',
    position: "left",
  },
  {
    id: "assign_staff",
    title: "👥 Assignez du Personnel",
    description:
      "Glissez-déposez un membre de votre personnel sur une opération pour booster sa production.",
    target: '[data-section="staff"]',
    position: "right",
  },
  {
    id: "family_tab",
    title: "👪 Gestion de la Famille",
    description:
      "Cliquez ici pour accéder au marché noir, à votre entrepôt et gérer vos relations avec les autres familles.",
    target: '[data-tab="family"]',
    position: "bottom",
  },
  {
    id: "black_market",
    title: "🕵️ Le Marché Noir",
    description:
      "Achetez des armes, des véhicules et des contrats pour renforcer votre famille.",
    target: '[data-action="black-market"]',
    position: "top",
  },
  {
    id: "family_relations",
    title: "⚔️ Relations",
    description:
      "Déclarez la guerre, forgez des alliances ou établissez des partenariats commerciaux avec les autres familles.",
    target: '[data-action="family-relations"]',
    position: "top",
  },
];
