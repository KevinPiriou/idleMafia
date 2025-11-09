import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  SaveState,
  Family,
  GeneratorKey,
  WeaponItem,
  VehicleItem,
  StaffMember,
} from "../domain/types";

// --- Slices types ---
export type PlayerSlice = {
  cash: number;
  respect: number;
  heat: number;
  level: number;
  xp: number;
  prestigeMult: number;
  prestigePoints: number;
  heatMitigationPerSec: number;
  tempGlobalBuffUntil?: number;
  tension: number;
  disabledUntil?: number;
  actionLockedUntilHeat?: number;
  permaGlobalMult?: number;
  costDiscount?: number;
  investmentsPurchased?: Record<string, boolean>;
  // actions
  addCash: (v: number) => void;
  addRespect: (v: number) => void;
  setHeat: (v: number) => void;
};

export type FamiliesSlice = {
  families: Family[];
  setFamilies: (f: Family[]) => void;
};

export type InventorySlice = {
  inventory: {
    weapons: WeaponItem[];
    vehicles: VehicleItem[];
    contracts: number;
  };
  equipped: Record<string, string | null>;
  setInventory: (inv: InventorySlice["inventory"]) => void;
  setEquipped: (eq: InventorySlice["equipped"]) => void;
};

export type RelationsSlice = {
  staff: StaffMember[];
  assignments: Record<string, GeneratorKey | null>;
  setStaff: (s: StaffMember[]) => void;
  setAssignments: (m: Record<string, GeneratorKey | null>) => void;
};

export type UiSlice = {
  showMenu: boolean;
  modals: Record<string, boolean>;
  setShowMenu: (b: boolean) => void;
  setModal: (key: string, open: boolean) => void;
};

export type RootState = PlayerSlice &
  FamiliesSlice &
  InventorySlice &
  RelationsSlice &
  UiSlice;

// --- Initializers ---
export const createInitialFromSave = (s: SaveState): RootState => ({
  // player
  cash: s.cash,
  respect: s.respect,
  heat: s.heat,
  level: s.level,
  xp: s.xp,
  prestigeMult: s.prestigeMult,
  prestigePoints: s.prestigePoints,
  heatMitigationPerSec: s.heatMitigationPerSec,
  tempGlobalBuffUntil: s.tempGlobalBuffUntil,
  tension: s.tension,
  disabledUntil: s.disabledUntil,
  actionLockedUntilHeat: s.actionLockedUntilHeat,
  permaGlobalMult: s.permaGlobalMult,
  costDiscount: s.costDiscount,
  investmentsPurchased: s.investmentsPurchased || {},
  addCash(v) {
    useGameStore.setState((st) => ({ cash: Math.max(0, st.cash + v) }));
  },
  addRespect(v) {
    useGameStore.setState((st) => ({ respect: Math.max(0, st.respect + v) }));
  },
  setHeat(v) {
    useGameStore.setState(() => ({ heat: Math.max(0, Math.min(100, v)) }));
  },
  // families
  families: s.families,
  setFamilies(f) {
    useGameStore.setState({ families: f });
  },
  // inventory
  inventory: s.inventory || { weapons: [], vehicles: [], contracts: 0 },
  equipped: s.equipped || {},
  setInventory(inv) {
    useGameStore.setState({ inventory: inv });
  },
  setEquipped(eq) {
    useGameStore.setState({ equipped: eq });
  },
  // relations
  staff: s.staff,
  assignments: s.assignments,
  setStaff(arr) {
    useGameStore.setState({ staff: arr });
  },
  setAssignments(m) {
    useGameStore.setState({ assignments: m });
  },
  // ui
  showMenu: true,
  modals: {},
  setShowMenu(b) {
    useGameStore.setState({ showMenu: b });
  },
  setModal(key, open) {
    useGameStore.setState((st) => ({ modals: { ...st.modals, [key]: open } }));
  },
});

// --- Store ---
export const useGameStore = create<RootState>()(
  subscribeWithSelector(() => {
    // Provide an empty default; consumer should rehydrate using createInitialFromSave
    return createInitialFromSave({
      cash: 0,
      respect: 0,
      heat: 0,
      gens: {} as SaveState["gens"],
      upgrades: {},
      prestigeMult: 1,
      prestigePoints: 0,
      heatMitigationPerSec: 0,
      lastSave: Date.now(),
      version: 2,
      level: 1,
      xp: 0,
      staff: [],
      assignments: {},
      families: [],
      tempGlobalBuffUntil: undefined,
      tension: 0,
      disabledUntil: undefined,
      actionLockedUntilHeat: undefined,
      inventory: { weapons: [], vehicles: [], contracts: 0 },
      equipped: {},
      permaGlobalMult: 1,
      costDiscount: 0,
      investmentsPurchased: {},
    } as SaveState);
  })
);

// --- Selectors helpers ---
export const selectCash = (s: RootState) => s.cash;
export const selectRespect = (s: RootState) => s.respect;
export const selectHeat = (s: RootState) => s.heat;
export const selectFamilies = (s: RootState) => s.families;
export const selectBuffActive = (s: RootState) =>
  !!(s.tempGlobalBuffUntil && Date.now() < s.tempGlobalBuffUntil);
