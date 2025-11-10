import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createDefaultSave,
  loadSave,
  saveGame,
  SAVE_KEY,
  SAVE_VERSION,
  blankSave,
} from "../save";
import type { SaveState } from "../types";

// --- Mock localStorage (en environnement Node) ---
class LocalStorageMock {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  get length() {
    return this.store.size;
  }
}

beforeEach(() => {
  // Installe un localStorage propre avant chaque test
  const ls = new LocalStorageMock() as unknown as Storage;
  (globalThis as unknown as { localStorage: Storage }).localStorage = ls;
});

afterEach(() => {
  vi.useRealTimers();
});

// Petit helper pour lire brut le JSON persistant
function readRawSave(): Partial<SaveState> | null {
  const raw = globalThis.localStorage.getItem(SAVE_KEY);
  return raw ? (JSON.parse(raw) as Partial<SaveState>) : null;
}
function mustReadRawSave(): SaveState {
  const p = readRawSave();
  expect(p).not.toBeNull(); // safety pour TS et pour le test
  return p as SaveState;
}
describe("save/load - persistence de la partie", () => {
  it("loadSave() crée une save par défaut si aucune donnée et la persiste", () => {
    expect(globalThis.localStorage.getItem(SAVE_KEY)).toBeNull();

    const s = loadSave();
    expect(s).toBeTruthy();
    expect(s.version).toBe(SAVE_VERSION);

    const persisted = mustReadRawSave();
    expect(persisted).toBeTruthy();
    expect(persisted.version).toBe(SAVE_VERSION);
  });

  it("saveGame() écrit version + met à jour lastSave à chaque appel", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    const s0 = createDefaultSave();
    saveGame(s0);

    let persisted = mustReadRawSave();
    expect(persisted.version).toBe(SAVE_VERSION);
    const firstLastSave = persisted.lastSave!; // garanti par saveGame()
    expect(typeof firstLastSave).toBe("number");

    vi.setSystemTime(new Date("2025-01-01T00:00:02Z"));
    saveGame({ ...s0, cash: 123 });

    persisted = mustReadRawSave();
    expect(persisted.cash).toBe(123);
    expect(persisted.lastSave!).toBeGreaterThan(firstLastSave);
  });

  it("loadSave() migre une ancienne version (v1) et write-back en v2", () => {
    // Simule une save très ancienne/incomplète
    const legacy = {
      version: 1,
      cash: 10,
      // heat manquant / xp manquant / inventory manquant, etc.
    };
    globalThis.localStorage.setItem(SAVE_KEY, JSON.stringify(legacy));

    const migrated = loadSave();
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(typeof migrated.level).toBe("number");
    expect(typeof migrated.xp).toBe("number");
    expect(migrated.inventory).toBeTruthy();
    expect(migrated.heat).toBeGreaterThanOrEqual(0);
    expect(migrated.heat).toBeLessThanOrEqual(100);

    // write-back : la save stockée doit être en version courante
    const persisted = mustReadRawSave();
    expect(persisted.version).toBe(SAVE_VERSION);
  });

  it("blankSave est un alias valide de createDefaultSave", () => {
    const a = createDefaultSave();
    const b = blankSave();
    // On ne compare pas lastSave (timestamp), mais on vérifie des champs clés
    expect(typeof b.cash).toBe("number");
    expect(typeof b.level).toBe("number");
    expect(b.version).toBe(SAVE_VERSION);
    // Les deux sont des SaveState cohérents
    expect(typeof a.prestigePoints).toBe("number");
    expect(typeof b.prestigePoints).toBe("number");
  });

  it("Round-trip save -> load conserve les champs utilisateur", () => {
    const s = createDefaultSave();
    s.cash = 9999;
    s.respect = 321;
    s.heat = 12.34;

    saveGame(s);
    const loaded = loadSave();

    expect(loaded.cash).toBe(9999);
    expect(loaded.respect).toBe(321);
    // clamp éventuel sur heat est géré, donc on vérifie l'égalité tolérante
    expect(Number(loaded.heat.toFixed(2))).toBe(12.34);
  });
});
