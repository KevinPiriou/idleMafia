import type { SaveState, GeneratorKey } from "./types";

export type MissionStatus = "locked" | "active" | "completed";

export type MissionReward = {
  cash?: number;
  respect?: number;
  xp?: number;
};

export type Mission = {
  id: string;
  level: number; // Niveau minimum requis
  title: string;
  description: string;
  shortDesc: string;
  rewards: MissionReward;
  tasks: MissionTask[];
};

export type MissionTask = {
  id: string;
  title: string;
  description: string;
  goal: number; // Objectif à atteindre
  current: number; // Valeur actuelle
  type:
    | "cash"
    | "respect"
    | "heat"
    | "generators"
    | "staff"
    | "families"
    | "events";
  targetType?: string; // Spécifie le type exact pour "generators" ou "families"
};

export type MissionProgress = {
  missionId: string;
  status: MissionStatus;
  tasksProgress: Record<string, number>; // missionId -> task index -> progress
  completedAt?: number; // Timestamp
};

const MISSIONS_DATABASE: Mission[] = [
  {
    id: "first_pickpocket",
    level: 1,
    title: "Les débuts du picpocket",
    description:
      "Commence ta carrière en volant la poche des innocents. Il n'y a rien de mal à ça...",
    shortDesc: "Achète 5 pickpockets",
    rewards: {
      cash: 500,
      respect: 10,
      xp: 100,
    },
    tasks: [
      {
        id: "buy_pickpockets",
        title: "Achète des pickpockets",
        description: "Acquiers 5 générateurs de type pickpocket",
        goal: 5,
        current: 0,
        type: "generators",
        targetType: "pickpocket",
      },
    ],
  },
  {
    id: "racket_master",
    level: 3,
    title: "Maître du racket",
    description:
      "Déploie tes rackets à travers la ville. Dominer le quartier commence ici.",
    shortDesc: "Possède 10 rackets",
    rewards: {
      cash: 2000,
      respect: 50,
      xp: 300,
    },
    tasks: [
      {
        id: "buy_rackets",
        title: "Amasse les rackets",
        description: "Achète 10 générateurs de type racket",
        goal: 10,
        current: 0,
        type: "generators",
        targetType: "racket",
      },
    ],
  },
  {
    id: "first_club",
    level: 5,
    title: "Ton premier établissement",
    description:
      "Lance ton propre club. C'est un bon endroit pour blanchir l'argent...",
    shortDesc: "Possède 3 clubs",
    rewards: {
      cash: 5000,
      respect: 75,
      xp: 500,
    },
    tasks: [
      {
        id: "buy_clubs",
        title: "Ouvre des clubs",
        description: "Achète 3 générateurs de type club",
        goal: 3,
        current: 0,
        type: "generators",
        targetType: "club",
      },
    ],
  },
  {
    id: "casino_tycoon",
    level: 8,
    title: "Magnat du casino",
    description:
      "Les casinos rapportent énormément. C'est l'époque où tu deviens vraiment riche.",
    shortDesc: "Possède 5 casinos",
    rewards: {
      cash: 15000,
      respect: 150,
      xp: 1000,
    },
    tasks: [
      {
        id: "buy_casinos",
        title: "Contrôle les casinos",
        description: "Achète 5 générateurs de type casino",
        goal: 5,
        current: 0,
        type: "generators",
        targetType: "casino",
      },
    ],
  },
  {
    id: "first_staff",
    level: 3,
    title: "Recrute tes premiers hommes",
    description:
      "Tu n'es rien sans tes gars. Recrute-les pour faire ton sale boulot.",
    shortDesc: "Recrute 3 employés",
    rewards: {
      cash: 1000,
      respect: 100,
      xp: 400,
    },
    tasks: [
      {
        id: "hire_staff",
        title: "Embauche des employés",
        description: "Recrute 3 membres du personnel",
        goal: 3,
        current: 0,
        type: "staff",
      },
    ],
  },
  {
    id: "respect_builder",
    level: 6,
    title: "Le respect, c'est tout",
    description:
      "Accumule 500 points de respect. La peur et le respect sont tes meilleures armes.",
    shortDesc: "Gagne 500 de respect",
    rewards: {
      cash: 3000,
      respect: 200,
      xp: 600,
    },
    tasks: [
      {
        id: "gain_respect",
        title: "Deviens respecté",
        description: "Accumule 500 points de respect total",
        goal: 500,
        current: 0,
        type: "respect",
      },
    ],
  },
  {
    id: "heat_survivor",
    level: 7,
    title: "Fugitif des autorités",
    description:
      "Accumule 30% de chaleur et survive. Tu dois être prudent mais efficace.",
    shortDesc: "Survie avec 30% de chaleur",
    rewards: {
      cash: 5000,
      respect: 100,
      xp: 800,
    },
    tasks: [
      {
        id: "survive_heat",
        title: "Échappe à la chaleur",
        description: "Atteins 30% de chaleur sans te faire arrêter",
        goal: 30,
        current: 0,
        type: "heat",
      },
    ],
  },
  {
    id: "family_diplomacy",
    level: 10,
    title: "Diplomate mafieux",
    description:
      "Établis des partenariats avec d'autres familles. Les alliances font la force.",
    shortDesc: "Crée 2 partenariats",
    rewards: {
      cash: 10000,
      respect: 300,
      xp: 1500,
    },
    tasks: [
      {
        id: "make_partnerships",
        title: "Forge les alliances",
        description: "Établis des partenariats avec 2 familles rivales",
        goal: 2,
        current: 0,
        type: "families",
        targetType: "partnership",
      },
    ],
  },
  {
    id: "war_veteran",
    level: 12,
    title: "Vétéran des guerres",
    description:
      "Remporte une guerre contre une autre famille. La violence a ses conséquences.",
    shortDesc: "Gagne une guerre",
    rewards: {
      cash: 20000,
      respect: 500,
      xp: 2000,
    },
    tasks: [
      {
        id: "win_war",
        title: "Remporte une victoire",
        description: "Gagne une guerre contre une autre famille",
        goal: 1,
        current: 0,
        type: "families",
        targetType: "war",
      },
    ],
  },
  {
    id: "events_master",
    level: 15,
    title: "Maître des événements",
    description:
      "Participe et remporte 10 événements aléatoires. La chance te sourit.",
    shortDesc: "Complète 10 événements",
    rewards: {
      cash: 15000,
      respect: 250,
      xp: 1200,
    },
    tasks: [
      {
        id: "complete_events",
        title: "Profite des opportunités",
        description: "Participe à 10 événements aléatoires",
        goal: 10,
        current: 0,
        type: "events",
      },
    ],
  },
  {
    id: "cash_milestone_50k",
    level: 5,
    title: "Les premiers 50k$",
    description: "Gagne 50 000 $ au total. Le crime paie finalement.",
    shortDesc: "Gagne 50 000 $",
    rewards: {
      cash: 5000,
      respect: 75,
      xp: 600,
    },
    tasks: [
      {
        id: "earn_50k",
        title: "Accumule 50k$",
        description: "Génère 50 000 $ en revenus cumulés",
        goal: 50000,
        current: 0,
        type: "cash",
      },
    ],
  },
  {
    id: "cash_milestone_500k",
    level: 12,
    title: "Demi-million dans les poches",
    description: "500 000 $ de revenus. Tu es maintenant un criminel sérieux.",
    shortDesc: "Gagne 500 000 $",
    rewards: {
      cash: 50000,
      respect: 500,
      xp: 3000,
    },
    tasks: [
      {
        id: "earn_500k",
        title: "Accumule 500k$",
        description: "Génère 500 000 $ en revenus cumulés",
        goal: 500000,
        current: 0,
        type: "cash",
      },
    ],
  },
  {
    id: "cash_milestone_5m",
    level: 20,
    title: "L'empire du crime",
    description:
      "5 millions $ de revenus. Tu as construit un véritable empire.",
    shortDesc: "Gagne 5 000 000 $",
    rewards: {
      cash: 500000,
      respect: 1000,
      xp: 5000,
    },
    tasks: [
      {
        id: "earn_5m",
        title: "Accumule 5M$",
        description: "Génère 5 000 000 $ en revenus cumulés",
        goal: 5000000,
        current: 0,
        type: "cash",
      },
    ],
  },
];

/**
 * Récupère toutes les missions disponibles pour un niveau donné
 */
export function getMissionsForLevel(playerLevel: number): Mission[] {
  return MISSIONS_DATABASE.filter((m) => m.level <= playerLevel);
}

/**
 * Récupère la mission par ID
 */
export function getMissionById(id: string): Mission | undefined {
  return MISSIONS_DATABASE.find((m) => m.id === id);
}

/**
 * Calcule le statut d'une mission basée sur la progression
 * Utilise le statut sauvegardé si disponible, sinon calcule basé sur le level
 */
export function getMissionStatus(
  mission: Mission,
  state: SaveState,
  progress: MissionProgress | undefined
): MissionStatus {
  // Si la mission a un statut explicite sauvegardé, l'utiliser
  if (progress?.status) {
    return progress.status;
  }

  // Sinon, calculer le statut initial
  if (state.level >= mission.level) {
    return "active";
  }
  return "locked";
}

/**
 * Récupère toutes les missions avec leur statut actuel
 */
export function getAllMissionsWithStatus(state: SaveState): Array<{
  mission: Mission;
  progress: MissionProgress | undefined;
  status: MissionStatus;
}> {
  return MISSIONS_DATABASE.map((mission) => {
    const progress = state.missionsProgress?.[mission.id];
    return {
      mission,
      progress,
      status: getMissionStatus(mission, state, progress),
    };
  });
}

/**
 * Complète une mission
 */
export function completeMission(
  state: SaveState,
  missionId: string
): SaveState {
  const mission = getMissionById(missionId);
  if (!mission) return state;

  const missionsProgress = state.missionsProgress || {};
  const progress = missionsProgress[missionId];

  if (!progress || progress.status === "completed") return state;

  const updatedProgress = {
    ...progress,
    status: "completed" as const,
    completedAt: Date.now(),
  };

  const rewards = mission.rewards;

  return {
    ...state,
    missionsProgress: {
      ...missionsProgress,
      [missionId]: updatedProgress,
    },
    cash: state.cash + (rewards.cash || 0),
    respect: state.respect + (rewards.respect || 0),
    xp: state.xp + (rewards.xp || 0),
  };
}

/**
 * Initialise les missions pour le premier démarrage
 */
export function initializeMissions(state: SaveState): SaveState {
  // Vérifier si les missions sont déjà initialisées (au moins une mission présente)
  if (
    state.missionsProgress &&
    Object.keys(state.missionsProgress).length > 0
  ) {
    return state;
  }

  const missionsProgress: Record<string, MissionProgress> = {};
  MISSIONS_DATABASE.forEach((mission) => {
    missionsProgress[mission.id] = {
      missionId: mission.id,
      status: "locked" as const,
      tasksProgress: {},
    };
  });

  return {
    ...state,
    missionsProgress,
  };
}

/**
 * Calcule automatiquement la progression de toutes les tâches basée sur l'état du jeu
 */
export function calculateTaskProgress(
  state: SaveState,
  task: MissionTask
): number {
  switch (task.type) {
    case "generators": {
      // Utilise targetType pour identifier le générateur exact
      const generatorKey = task.targetType;
      if (generatorKey && state.gens) {
        return state.gens[generatorKey as GeneratorKey]?.owned || 0;
      }
      return 0;
    }

    case "staff": {
      // Compte le nombre total de staff
      return state.staff?.length || 0;
    }

    case "respect": {
      // Retourne le respect actuel
      return state.respect || 0;
    }

    case "cash": {
      // Pour tracker les revenus, on utilise une variable à tracker dans le jeu
      // Pour maintenant, retourne le cash actuel
      return Math.min(state.cash || 0, task.goal);
    }

    case "heat": {
      // Retourne la chaleur actuelle
      return state.heat || 0;
    }

    case "families": {
      // Compte les partenariats ou guerres selon le targetType
      if (task.targetType === "partnership") {
        return (
          state.families?.filter((f) => f.state === "partnership").length || 0
        );
      }
      if (task.targetType === "war") {
        return state.families?.filter((f) => f.state === "war").length || 0;
      }
      return 0;
    }

    case "events": {
      // Compte les événements dans le journal
      return state.eventLog?.length || 0;
    }

    default:
      return 0;
  }
}

/**
 * Met à jour la progression des missions basée sur l'état actuel du jeu
 */
export function updateMissionsProgress(state: SaveState): SaveState {
  if (!state.missionsProgress) return state;

  const updatedProgress: Record<string, MissionProgress> = {};

  Object.entries(state.missionsProgress).forEach(([missionId, progress]) => {
    if (progress.status === "completed") {
      updatedProgress[missionId] = progress;
      return;
    }

    const mission = getMissionById(missionId);
    if (!mission) return;

    const tasksProgress: Record<string, number> = {};
    let allTasksComplete = true;

    mission.tasks.forEach((task, idx) => {
      const taskProgress = calculateTaskProgress(state, task);
      tasksProgress[idx] = Math.min(taskProgress, task.goal);

      if (taskProgress < task.goal) {
        allTasksComplete = false;
      }
    });

    updatedProgress[missionId] = {
      ...progress,
      status:
        allTasksComplete && state.level >= mission.level
          ? ("active" as const)
          : progress.status,
      tasksProgress,
    };
  });

  return {
    ...state,
    missionsProgress: updatedProgress,
  };
}

/**
 * Applique automatiquement les récompenses des missions complétées
 * Détecte les missions qui viennent d'être marquées comme "active"
 */
export function applyMissionRewards(state: SaveState): SaveState {
  if (!state.missionsProgress) return state;

  let next = { ...state };

  Object.entries(state.missionsProgress).forEach(([missionId, progress]) => {
    // Si la mission a déjà été complétée et récompensée, skip
    if (progress.status === "completed" && progress.completedAt) {
      return;
    }

    const mission = getMissionById(missionId);
    if (!mission) return;

    // Vérifie si toutes les tâches sont complétées
    const allTasksComplete = mission.tasks.every((task, idx) => {
      const currentProgress = progress.tasksProgress[idx] || 0;
      return currentProgress >= task.goal;
    });

    // Si toutes les tâches sont complètes ET la mission n'a pas été complétée
    if (allTasksComplete && progress.status !== "completed") {
      // Applique les récompenses
      const rewards = mission.rewards;

      next = {
        ...next,
        missionsProgress: {
          ...next.missionsProgress,
          [missionId]: {
            ...progress,
            status: "completed" as const,
            completedAt: Date.now(),
          },
        },
        cash: next.cash + (rewards.cash || 0),
        respect: next.respect + (rewards.respect || 0),
        xp: next.xp + (rewards.xp || 0),
      };
    }
  });

  return next;
}

/**
 * Retourne les missions qui ont été complétées depuis le state précédent
 * Utile pour les notifications et animations
 */
export function getNewlyCompletedMissions(
  prevState: SaveState,
  nextState: SaveState
): Mission[] {
  const completed: Mission[] = [];

  if (!nextState.missionsProgress || !prevState.missionsProgress)
    return completed;

  Object.entries(nextState.missionsProgress).forEach(
    ([missionId, progress]) => {
      const prevProgress = prevState.missionsProgress?.[missionId];

      // Si la mission est complétée maintenant mais ne l'était pas avant
      if (
        progress.status === "completed" &&
        prevProgress?.status !== "completed"
      ) {
        const mission = getMissionById(missionId);
        if (mission) {
          completed.push(mission);
        }
      }
    }
  );

  return completed;
}

/**
 * Génère un message de notification pour une mission complétée
 */
export function getMissionCompletionMessage(mission: Mission): {
  title: string;
  description: string;
  rewards: string[];
} {
  const rewards: string[] = [];

  if (mission.rewards.cash) {
    rewards.push(`💰 +$${mission.rewards.cash.toLocaleString()}`);
  }
  if (mission.rewards.respect) {
    rewards.push(`👑 +${mission.rewards.respect} respect`);
  }
  if (mission.rewards.xp) {
    rewards.push(`⭐ +${mission.rewards.xp} XP`);
  }

  return {
    title: `✅ Mission complétée: ${mission.title}`,
    description: mission.shortDesc,
    rewards,
  };
}
