import type { SaveState, EventLogEntry } from "./types";

export const MAX_LOG_ENTRIES = 200;

function makeId(prefix = "evt"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Ajoute une entrée au début du journal, avec cap, en horodatant si besoin */
export function appendEvent(
  state: SaveState,
  entry: Omit<EventLogEntry, "id" | "ts"> &
    Partial<Pick<EventLogEntry, "id" | "ts">>
): SaveState {
  const id = entry.id ?? makeId();
  const ts = entry.ts ?? Date.now();
  const e: EventLogEntry = { ...entry, id, ts } as EventLogEntry;
  const prev = state.eventLog ?? [];
  const next = [e, ...prev].slice(0, MAX_LOG_ENTRIES);
  return { ...state, eventLog: next };
}

/** Efface entièrement le journal */
export function clearEventLog(state: SaveState): SaveState {
  return { ...state, eventLog: [] };
}
