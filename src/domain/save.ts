import type { SaveState, GeneratorKey, Generator } from "./types";
import { defaultGenerators, defaultUpgrades } from "./defaults";
import { defaultStaff } from "./staff";
// Si tu as déjà un seed des familles, garde cet import (sinon commente la ligne suivante)
import { defaultFamilies } from "./familyData";

export const SAVE_KEY = "mafia-idle-redesign-v1";
export const SAVE_VERSION = 2;

// Mémo en mémoire de la version source lors d'une migration (non persisté)
let LAST_MIGRATED_FROM: number | null = null;
export function getLastMigratedFrom(): number | null {
  return LAST_MIGRATED_FROM;
}

/** Construit un SaveState par défaut, cohérent avec le contenu actuel */
export function createDefaultSave(): SaveState {
  // defaultGenerators peut renvoyer un array ou un record selon tes versions — on gère les deux
  const gensRaw = defaultGenerators() as
    | Record<GeneratorKey, Generator>
    | Generator[];
  const gens: Record<GeneratorKey, Generator> = Array.isArray(gensRaw)
    ? (gensRaw as Generator[]).reduce<Record<GeneratorKey, Generator>>(
        (acc, g) => {
          acc[g.key as GeneratorKey] = g as Generator;
          return acc;
        },
        {} as Record<GeneratorKey, Generator>
      )
    : (gensRaw as Record<GeneratorKey, Generator>);

  return {
    version: SAVE_VERSION,
    cash: 10,
    respect: 0,
    heat: 0,
    level: 1,
    xp: 0,
    tension: 0,
    heatMitigationPerSec: 0,
    prestigePoints: 0,
    prestigeMult: 1,
    gens,
    upgrades: defaultUpgrades(),
    staff: defaultStaff(),
    assignments: {},
    inventory: { weapons: [], vehicles: [], contracts: 0 },
    equipped: {},
    eventLog: [],
    lastJournalSeenTs: Date.now(),
    tutorialEventJournalOpened: false,
    families: typeof defaultFamilies === "function" ? defaultFamilies() : [],
    missionsProgress: {},
    lastSave: Date.now(),
    tempGlobalBuffUntil: undefined,
    // ajoute ici d'éventuels nouveaux champs avec leurs défauts
  };
}

/** Applique des defaults aux champs manquants (non destructive) */
function withDefaults(raw: Partial<SaveState> | undefined): SaveState {
  const base = createDefaultSave();

  const from = raw ?? {};

  // gens
  let gens = base.gens;
  if (from.gens && Object.keys(from.gens).length > 0) {
    gens = { ...base.gens, ...from.gens };
  }

  return {
    ...base,
    ...from,
    version: from.version ?? base.version,
    cash: from.cash ?? base.cash,
    respect: from.respect ?? base.respect,
    heat: Math.min(100, Math.max(0, from.heat ?? base.heat)),
    level: from.level ?? base.level,
    xp: from.xp ?? base.xp,
    tension: Math.min(100, Math.max(0, from.tension ?? base.tension)),
    heatMitigationPerSec:
      from.heatMitigationPerSec ?? base.heatMitigationPerSec,
    prestigePoints: from.prestigePoints ?? base.prestigePoints,
    prestigeMult: from.prestigeMult ?? base.prestigeMult,
    gens,
    upgrades: from.upgrades ?? base.upgrades,
    staff: from.staff ?? base.staff,
    assignments: from.assignments ?? base.assignments,
    inventory: from.inventory ?? base.inventory,
    equipped: from.equipped ?? base.equipped,
    families: from.families ?? base.families,
    missionsProgress: from.missionsProgress ?? base.missionsProgress,
    lastSave: from.lastSave ?? base.lastSave,
    tempGlobalBuffUntil: from.tempGlobalBuffUntil ?? base.tempGlobalBuffUntil,
    eventLog: from.eventLog ?? base.eventLog,
    lastJournalSeenTs: from.lastJournalSeenTs ?? base.lastJournalSeenTs,
    tutorialEventJournalOpened:
      from.tutorialEventJournalOpened ?? base.tutorialEventJournalOpened,
  };
}

/** Migration incrémentale selon la version source */
function migrateSaveState(input: Partial<SaveState> | undefined): SaveState {
  if (!input) return createDefaultSave();

  const fromVersion = Number(input.version ?? 1);

  // clone superficiel pour mutations contrôlées
  const s: Partial<SaveState> = { ...(input ?? {}) };

  // ===== v1 -> v2 =====
  if (fromVersion < 2) {
    // Exemple : s.xp/s.level pouvaient être undefined
    if (typeof s.level !== "number") s.level = 1;
    if (typeof s.xp !== "number") s.xp = 0;
    if (typeof s.tension !== "number") s.tension = 0;
    if (!s.inventory) s.inventory = { weapons: [], vehicles: [], contracts: 0 };
    if (!s.equipped) s.equipped = {};
    if (!s.assignments) s.assignments = {};
    if (!s.eventLog) s.eventLog = [];
    if (typeof s.lastJournalSeenTs !== "number") {
      // on initialise à lastSave si dispo pour éviter de marquer tout l'historique en "non-lu"
      s.lastJournalSeenTs = (s.lastSave as number) ?? Date.now();
    }
    if (typeof s.tutorialEventJournalOpened !== "boolean") {
      s.tutorialEventJournalOpened = false;
    }
    if (!s.missionsProgress) s.missionsProgress = {};
    // clamp chaleur
    if (typeof s.heat === "number") {
      s.heat = Math.min(100, Math.max(0, s.heat));
    } else {
      s.heat = 0;
    }
  }

  // future migrations ici (v2 -> v3, etc.)

  const merged = withDefaults(s);
  merged.version = SAVE_VERSION;
  return merged;
}

/** Lecture depuis localStorage + migration + normalisation */
export function loadSave(): SaveState {
  try {
    const rawStr = localStorage.getItem(SAVE_KEY);
    if (!rawStr) {
      const fresh = createDefaultSave();
      localStorage.setItem(SAVE_KEY, JSON.stringify(fresh));
      LAST_MIGRATED_FROM = null;
      return fresh;
    }

    const parsed = JSON.parse(rawStr) as Partial<SaveState>;
    const prevVersion = Number(parsed.version ?? 1);
    const migrated = migrateSaveState(parsed);

    // Write-back si la version a changé + mémoriser l’info de migration
    if (prevVersion !== SAVE_VERSION) {
      LAST_MIGRATED_FROM = prevVersion;
      localStorage.setItem(SAVE_KEY, JSON.stringify(migrated));
    } else {
      LAST_MIGRATED_FROM = null;
    }

    return migrated;
  } catch (e) {
    console.warn("loadSave failed, creating fresh save:", e);
    const fresh = createDefaultSave();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(fresh));
    } catch {
      /* ignore write errors */
    }
    LAST_MIGRATED_FROM = null;
    return fresh;
  }
}

/** Écriture atomique dans localStorage (force la version et le timestamp) */
export function saveGame(state: SaveState): void {
  try {
    const toPersist: SaveState = {
      ...state,
      version: SAVE_VERSION,
      lastSave: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(toPersist));
  } catch (e) {
    console.warn("saveGame failed:", e);
  }
}

// Compat rétro
export { createDefaultSave as blankSave };
