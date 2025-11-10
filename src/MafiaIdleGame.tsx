import React, { useEffect, useMemo, useRef, useState } from "react";

import type {
  GeneratorKey,
  Generator,
  SaveState,
  Rarity,
  WeaponItem,
  VehicleItem,
  FamilyState,
} from "./domain/types";
import {
  computeWarPower,
  simulateFamiliesEconomy,
  //computeFamilyScore,
  //computeCompositePower,
} from "./domain/family";
import { loadSave, saveGame } from "./domain/save";

import WarModal from "./WarModal";
import TopBar from "./components/TopBar";
import BlackMarket from "./components/BlackMarket";
import OptionsModal from "./components/OptionsModal";
import Warehouse from "./components/Warehouse";
import WarReportModal from "./components/WarReportModal";
import RelationsModal from "./components/RelationsModal";
import TensionModal from "./components/TensionModal";
import Modal from "./Modal";
import EventModal from "./components/EventModal";

import { Card } from "./components/ui/Card";
import { ActionCard } from "./components/ui/ActionCard";
import { ParticleCanvas } from "./components/ui/ParticleCanvas";
import { GeneratorCard } from "./components/ui/GeneratorCard";
import { StaffListWithPagination } from "./components/ui/StaffListWithPagination";
import { InvestmentsPanel } from "./components/InvestmentPanel";
import { CaseOpeningModal } from "./components/CaseOpeningModal";
import { StaffTooltip } from "./components/StaffTooltip";
import { MainMenu } from "./components/MainMenu";
import { UpgradesModal } from "./components/UpgradesModal";
import { InfluenceModal } from "./components/InfluenceModal";
import TutorialOverlay from "./components/TutorialOverlay";
import { TUTORIAL_STEPS } from "./domain/tutorial";
import { useAudioEngine } from "./hooks/useAudioEngine";
import { usePlayerActions } from "./hooks/usePlayerActions";

import {
  clamp,
  TOP_FILL_TIME,
  TIME_XP_RATE,
  XP_PER_CASH_PER_SEC,
} from "./domain/balance";
import {
  discountedGenCost,
  staffMultiplierForGenerator,
  prodPerUnit,
  computeProduction,
  computeTick,
  revenuePerSecForKey,
  xpForLevel,
} from "./domain/economy";
//import { computeXpDelta, applyLevelUps } from "./domain/progression";
import { pickRarity } from "./domain/events";
import { applyInvestment } from "./domain/investments";

// (RandomEventDef imported in domain/events types; not needed here)
import { useGameStore, createInitialFromSave } from "./store/root";
import { prestigeGain } from "./domain/prestige";
import { generateItemId } from "./domain/item";

// Lightweight type to receive WarModal results without importing internals
type WarResolve = {
  familyId: string;
  action: "assassination" | "kidnapping" | "intimidation";
  success: boolean;
  delta: {
    target: {
      cash?: number;
      respect?: number;
      members?: number;
      weapons?: number;
      vehicles?: number;
    };
    player: {
      cash?: number;
      respect?: number;
      heat?: number;
      tension?: number;
    };
  };
  narrative: string[];
};

// xpForLevel now imported from domain/economy

const formatNumber = (n: number) => {
  if (!isFinite(n)) return "∞";
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + " T";
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + " B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + " M";
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + " k";
  return n.toFixed(2);
};

// genCost and discountedGenCost imported from domain/economy

// totalLocalMult and totalGlobalMult imported from domain/economy

// prodPerUnit imported from domain/economy

// computeProduction imported from domain/economy

// computeTick imported from domain/economy

// revenuePerSecForKey imported from domain/economy

// ----------------------------
// Composant principal
// ----------------------------
export default function MafiaIdleRedesign() {
  const audio = useAudioEngine();
  // Store selectors (HUD wiring)

  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState<number>(100);
  const [showMenu, setShowMenu] = useState<boolean>(true);
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const scale = 1;
  const [showUpgradesModal, setShowUpgradesModal] = useState(false);
  const [showInfluenceModal, setShowInfluenceModal] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [relationsModal, setRelationsModal] = useState(false);
  const [tensionModal, setTensionModal] = useState<null | { cost: number }>(
    null
  );
  const [showMarket, setShowMarket] = useState(false);
  const [showWarehouse, setShowWarehouse] = useState(false);
  const [showIntel, setShowIntel] = useState(false);
  const [showInvestments, setShowInvestments] = useState(false);
  const [activeTab, setActiveTab] = useState<"ops" | "family">("ops");
  const [warFor, setWarFor] = useState<null | { id: string }>(null);
  const [warReport, setWarReport] = useState<null | {
    familyName: string;
    success: boolean;
    lines: string[];
    deltas: {
      cash?: number;
      respect?: number;
      heat?: number;
      tension?: number;
    };
  }>(null);
  const [caseModal, setCaseModal] = useState<null | {
    pool: Rarity[];
    target: number;
    result: Rarity;
  }>(null);
  const [staffTooltip, setStaffTooltip] = useState<null | {
    id: string;
    x: number;
    y: number;
  }>(null);

  const [tutorialActive, setTutorialActive] = useState(false);

  const [actionProgress, setActionProgress] = useState<
    Record<GeneratorKey, number>
  >({
    pickpocket: 0,
    racket: 0,
    club: 0,
    casino: 0,
    olive: 0,
    bar: 0,
    grocery: 0,
  });

  const [state, setState] = useState<SaveState>(() => {
    const s = loadSave();
    // Apply offline progression since last save to preserve progress when returning
    const now = Date.now();
    const elapsedSecRaw = (now - (s.lastSave || now)) / 1000;
    // Cap offline progression to avoid overflow on very long absences (tweakable)
    const OFFLINE_MAX_SEC = 7 * 24 * 60 * 60; // 7 days
    const elapsedSec = Math.max(0, Math.min(OFFLINE_MAX_SEC, elapsedSecRaw));
    if (elapsedSec > 0.5) {
      const { cashPerSec, heatPerSec, respectPerSec } = computeProduction(s);
      // Base resource deltas
      s.cash += cashPerSec * elapsedSec;
      s.respect += respectPerSec * elapsedSec;
      s.heat = clamp(
        s.heat +
          heatPerSec * elapsedSec * 0.2 -
          0.05 * elapsedSec -
          s.heatMitigationPerSec * elapsedSec,
        0,
        100
      );
      // XP from time and revenue during offline
      const xpFromTime = TIME_XP_RATE * elapsedSec;
      const xpFromRevenue = cashPerSec * XP_PER_CASH_PER_SEC * elapsedSec;
      s.xp = (s.xp ?? 0) + xpFromTime + xpFromRevenue;
      s.level = s.level ?? 1;
      while (s.xp >= xpForLevel(s.level)) {
        s.xp -= xpForLevel(s.level);
        s.level += 1;
      }
    }
    s.lastSave = now;
    return s;
  });

  // Hydrate global store on mount with initial save state
  useEffect(() => {
    try {
      useGameStore.setState(createInitialFromSave(state));
    } catch (e) {
      console.warn("Store hydrate failed", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror minimal fields to store to keep HUD selectors in sync
  useEffect(() => {
    useGameStore.setState({
      cash: state.cash,
      respect: state.respect,
      heat: state.heat,
      tempGlobalBuffUntil: state.tempGlobalBuffUntil,
      families: state.families,
    });
  }, [
    state.cash,
    state.respect,
    state.heat,
    state.tempGlobalBuffUntil,
    state.families,
  ]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const onFirst = () => {
      audio.enable();
      window.removeEventListener("pointerdown", onFirst);
    };
    window.addEventListener("pointerdown", onFirst);
    return () => window.removeEventListener("pointerdown", onFirst);
  }, [audio]);

  useEffect(() => {
    audio.setMuted(muted);
  }, [audio, muted]);
  useEffect(() => {
    audio.setVolume(volume / 100);
  }, [audio, volume]);

  // Tick
  useEffect(() => {
    if (showMenu) {
      return; // Pause game tick when menu is open
    }

    const lastTickRef = { current: performance.now() };
    const applyDt = (dt: number) => {
      const s = stateRef.current;
      const clampedDt = Math.min(Math.max(dt, 0), 60);
      const { cashDelta, respectDelta, heatDelta } = computeTick(s, clampedDt);
      const next: SaveState = {
        ...s,
        cash: s.cash + cashDelta,
        respect: s.respect + respectDelta,
        heat: clamp(s.heat + heatDelta, 0, 100),
      };

      const xpFromTime = TIME_XP_RATE * clampedDt;
      const cashPerSec = computeProduction(s).cashPerSec;
      const xpFromRevenue = cashPerSec * XP_PER_CASH_PER_SEC * clampedDt;
      next.xp = (s.xp ?? 0) + xpFromTime + xpFromRevenue;
      next.level = s.level ?? 1;

      while (next.xp >= xpForLevel(next.level)) {
        next.xp -= xpForLevel(next.level);
        next.level += 1;
      }
      // If heat-lock is satisfied, clear it immediately
      if (
        next.actionLockedUntilHeat != null &&
        next.heat <= next.actionLockedUntilHeat
      ) {
        next.actionLockedUntilHeat = undefined;
      }
      // Update other families economy to keep pacing
      next.families = simulateFamiliesEconomy(next, clampedDt, cashPerSec);
      setState(next);

      let maxRev = 0;
      (Object.keys(next.gens) as GeneratorKey[]).forEach((k) => {
        const r = revenuePerSecForKey(next, k);
        if (r > maxRev) maxRev = r;
      });
      setActionProgress((prev) => {
        const updated: Record<GeneratorKey, number> = { ...prev };
        (Object.keys(next.gens) as GeneratorKey[]).forEach((key) => {
          const rev = revenuePerSecForKey(next, key);
          if (maxRev <= 0 || rev <= 0) {
            updated[key] = 0;
            return;
          }
          const speed = (rev / maxRev) * (clampedDt / TOP_FILL_TIME);
          let val = (prev[key] ?? 0) + speed;
          val = val - Math.floor(val);
          updated[key] = clamp(val, 0, 0.999999);
        });
        return updated;
      });
    };

    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      applyDt(dt);
    }, 250);

    return () => clearInterval(id);
  }, [showMenu]);

  // Plus de scaling: on s'adapte nativement à la fenêtre

  // Autosave frequently and on page/tab lifecycle changes
  useEffect(() => {
    const id = window.setInterval(() => saveGame(stateRef.current), 1000);
    const handleImmediateSave = () => {
      try {
        saveGame(stateRef.current);
      } catch (e) {
        console.warn("Save on lifecycle failed:", e);
      }
    };
    const onVisibility = () => {
      if (document.hidden) handleImmediateSave();
    };
    window.addEventListener("pagehide", handleImmediateSave);
    window.addEventListener("beforeunload", handleImmediateSave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      window.removeEventListener("pagehide", handleImmediateSave);
      window.removeEventListener("beforeunload", handleImmediateSave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Random events scheduler
  useEffect(() => {
    let timer: number | null = null;
    const schedule = () => {
      const delay = 60000 + Math.random() * 60000; // 60-120s
      timer = window.setTimeout(() => {
        setShowEvent(true);
        schedule();
      }, delay) as unknown as number;
    };
    schedule();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const prodSummary = useMemo(() => computeProduction(state), [state]);
  const genSorted = useMemo(() => {
    const entries = (Object.keys(state.gens) as GeneratorKey[]).map((key) => {
      const g = state.gens[key];
      const unit = prodPerUnit(state, key);
      const revenue = unit * g.owned;
      return { key, g, unit, revenue };
    });
    entries.sort((a, b) => b.revenue - a.revenue);
    const maxRevenue = Math.max(0.0001, ...entries.map((e) => e.revenue));
    return { entries, maxRevenue };
  }, [state]);

  // Tooltips breakdowns
  const cashTooltipContent = useMemo(() => {
    const items = genSorted.entries.filter((e) => e.revenue > 0).slice(0, 8);
    const total = items.reduce((acc, e) => acc + e.revenue, 0);
    return (
      <div className="min-w-60">
        <div className="text-[11px] uppercase text-yellow-500 mb-1">
          Revenus /s
        </div>
        {items.length === 0 ? (
          <div className="text-xs text-zinc-300">Aucun revenu</div>
        ) : (
          <ul className="text-xs space-y-1">
            {items.map(({ g, revenue }) => (
              <li key={g.key} className="flex justify-between gap-3">
                <span className="truncate">
                  {g.icon} {g.name}
                </span>
                <span className="text-yellow-400">
                  $ {formatNumber(revenue)}
                </span>
              </li>
            ))}
            <li className="flex justify-between gap-3 pt-1 border-t border-yellow-600/30 mt-1">
              <span className="font-semibold">Total</span>
              <span className="text-yellow-400 font-semibold">
                $ {formatNumber(total)}
              </span>
            </li>
          </ul>
        )}
      </div>
    );
  }, [genSorted]);

  const respectTooltipContent = useMemo(() => {
    const cashPerSec = prodSummary.cashPerSec;
    const base = Math.log10(1 + cashPerSec) * 0.5;
    const heatPenalty = clamp(state.heat / 200, 0, 0.5);
    const factor = 1 - heatPenalty;
    const final = base * factor;
    return (
      <div className="min-w-64">
        <div className="text-[11px] uppercase text-yellow-500 mb-1">
          Respect /s
        </div>
        <div className="text-xs grid grid-cols-2 gap-x-3 gap-y-1">
          <span className="text-zinc-300">Revenue utilisé</span>
          <span className="text-right">$ {formatNumber(cashPerSec)}</span>
          <span className="text-zinc-300">Base</span>
          <span className="text-right">{formatNumber(base)}</span>
          <span className="text-zinc-300">Pénalité chaleur</span>
          <span className="text-right">-{(heatPenalty * 100).toFixed(0)}%</span>
          <span className="text-zinc-300">Facteur final</span>
          <span className="text-right">x{factor.toFixed(2)}</span>
          <span className="font-semibold">Respect/s</span>
          <span className="text-right text-yellow-400 font-semibold">
            {formatNumber(final)}
          </span>
        </div>
      </div>
    );
  }, [prodSummary, state.heat]);

  const heatTooltipContent = useMemo(() => {
    const heatContribs = (Object.keys(state.gens) as GeneratorKey[])
      .map((k) => {
        const g = state.gens[k];
        const raw = g.baseHeat * g.owned * 0.2; // production uses 20%
        return { key: k, g, val: raw };
      })
      .filter((e) => e.val > 0)
      .sort((a, b) => b.val - a.val)
      .slice(0, 8);
    const sumPos = heatContribs.reduce((a, e) => a + e.val, 0);
    const cooling = 0.05;
    const mitigation = state.heatMitigationPerSec;
    const net = sumPos - cooling - mitigation;
    return (
      <div className="min-w-64">
        <div className="text-[11px] uppercase text-yellow-500 mb-1">
          Chaleur /s
        </div>
        {heatContribs.length === 0 ? (
          <div className="text-xs text-zinc-300">Aucune source</div>
        ) : (
          <ul className="text-xs space-y-1">
            {heatContribs.map(({ g, val }) => (
              <li key={g.key} className="flex justify-between gap-3">
                <span className="truncate">
                  {g.icon} {g.name}
                </span>
                <span className="text-red-300">+{formatNumber(val)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3">
              <span className="text-zinc-300">Refroidissement de base</span>
              <span className="text-emerald-400">-{formatNumber(cooling)}</span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-zinc-300">Mitigation politique</span>
              <span className="text-emerald-400">
                -{formatNumber(mitigation)}
              </span>
            </li>
            <li className="flex justify-between gap-3 pt-1 border-t border-yellow-600/30 mt-1">
              <span className="font-semibold">Net</span>
              <span
                className={`font-semibold ${
                  net >= 0 ? "text-red-300" : "text-emerald-400"
                }`}
              >
                {net >= 0 ? "+" : ""}
                {formatNumber(net)}
              </span>
            </li>
          </ul>
        )}
      </div>
    );
  }, [state.gens, state.heatMitigationPerSec]);

  // Mock characters
  const mockCharacters = state.staff;

  // Helpers: tension and locks
  const incTension = (amount: number) => {
    setState((prev) => {
      const t = clamp((prev.tension || 0) + amount, 0, 100);
      const next = { ...prev, tension: t };
      if (t >= 100) {
        // Trigger sanction modal with high bail cost proportional to progress
        const bail = Math.max(5000, Math.floor(prev.cash * 0.35));
        setTensionModal({ cost: bail });
      }
      return next;
    });
  };
  const isActionLocked = () => {
    const cur = stateRef.current;
    if (cur.actionLockedUntilHeat != null) {
      // Heat-based sanction takes precedence: if satisfied, unlock immediately
      if (cur.heat > cur.actionLockedUntilHeat) return true;
      return false;
    }
    const until = cur.disabledUntil || 0;
    if (Date.now() < until) return true;
    return false;
  };

  const { buy, buyMax, buyUpgrade, bribe, buyPassiveInfluence, doPrestige } =
    usePlayerActions(stateRef, setState, incTension, isActionLocked);

  // Tutorial Logic
  useEffect(() => {
    const s = stateRef.current;
    if (
      !(s.tutorialCompleted ?? false) &&
      (s.tutorialStep ?? 0) < TUTORIAL_STEPS.length
    ) {
      setTutorialActive(true);
    }
  }, []);

  const advanceTutorial = () => {
    setState((prev) => {
      const nextStep = (prev.tutorialStep || 0) + 1;
      if (nextStep >= TUTORIAL_STEPS.length) {
        setTutorialActive(false);
        return { ...prev, tutorialCompleted: true };
      }
      return { ...prev, tutorialStep: nextStep };
    });
  };

  const skipTutorial = () => {
    setState((prev) => ({ ...prev, tutorialCompleted: true }));
    setTutorialActive(false);
  };

  // Auto-advance tutorial on action validation
  useEffect(() => {
    const s = stateRef.current;
    if (
      tutorialActive &&
      !(s.tutorialCompleted ?? false) &&
      (s.tutorialStep ?? 0) < TUTORIAL_STEPS.length
    ) {
      const currentStep = TUTORIAL_STEPS[s.tutorialStep ?? 0];
      if (currentStep.action && currentStep.action.validation(s)) {
        advanceTutorial();
      }
    }
  }, [state, tutorialActive]);

  // Auto-clear outdated lock flags
  useEffect(() => {
    setState((prev) => {
      let changed = false;
      let next: SaveState = prev;
      if (prev.disabledUntil && Date.now() >= prev.disabledUntil) {
        next = { ...next, disabledUntil: undefined };
        changed = true;
      }
      if (
        prev.actionLockedUntilHeat != null &&
        prev.heat <= prev.actionLockedUntilHeat
      ) {
        next = { ...next, actionLockedUntilHeat: undefined };
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [state.disabledUntil, state.actionLockedUntilHeat, state.heat]);

  // Relations actions
  const declareWar = (fid: string) => {
    if (isActionLocked()) return;
    setState((prev) => {
      const fam = prev.families.find((f) => f.id === fid);
      if (!fam) return prev;
      const now = Date.now();
      if (fam.lastWarTs && now - fam.lastWarTs < 24 * 60 * 60 * 1000)
        return prev; // cooldown
      const nfams = prev.families.map((f) =>
        f.id === fid ? { ...f, state: "war" as FamilyState, lastWarTs: now } : f
      );
      incTension(30);
      // Open the war operations modal right away
      setWarFor({ id: fid });
      return { ...prev, families: nfams };
    });
  };
  const setPeace = (fid: string) => {
    setState((prev) => ({
      ...prev,
      families: prev.families.map((f) =>
        f.id === fid ? { ...f, state: "peace" } : f
      ),
    }));
  };
  const setPartnership = (fid: string) => {
    if (isActionLocked()) return;
    setState((prev) => ({
      ...prev,
      families: prev.families.map((f) =>
        f.id === fid ? { ...f, state: "partnership" } : f
      ),
    }));
  };
  const togglePartnershipSector = (fid: string, key: GeneratorKey) => {
    setState((prev) => ({
      ...prev,
      families: prev.families.map((f) => {
        if (f.id !== fid) return f;
        const has = f.partnershipSectors.includes(key);
        return {
          ...f,
          partnershipSectors: has
            ? f.partnershipSectors.filter((k) => k !== key)
            : [...f.partnershipSectors, key],
        };
      }),
    }));
  };
  const resolveWar = (fid: string) => {
    // Simple resolution: chance influenced by respect
    setState((prev) => {
      const fam = prev.families.find((f) => f.id === fid);
      if (!fam || fam.state !== "war") return prev;
      const power = computeWarPower(prev);
      const extra = Math.min(0.2, power * 0.004); // +0.4% per power up to +20%
      const chance = Math.min(
        0.95,
        0.35 + Math.log10(1 + prev.respect) * 0.1 + extra
      );
      const win = Math.random() < chance;
      const next = { ...prev } as SaveState;
      next.families = prev.families.map((f) =>
        f.id === fid ? { ...f, state: "peace" } : f
      );
      if (win) {
        next.tempGlobalBuffUntil = Date.now() + 6 * 60 * 60 * 1000; // 6h buff
        next.respect = prev.respect * 1.1; // +10% respect
      } else {
        next.respect = prev.respect * 0.75; // -25%
      }
      return next;
    });
  };

  // Drag & Drop handlers
  const onStaffDragStart = (e: React.DragEvent, charId: string) => {
    if (isActionLocked()) return;
    e.dataTransfer.setData("text/plain", charId);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDropStaffToGen = (key: GeneratorKey, e: React.DragEvent) => {
    if (isActionLocked()) return;
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    setState((prev) => ({
      ...prev,
      assignments: { ...prev.assignments, [id]: key },
    }));
    // Assigning to illegal ops increases tension slightly
    if (!stateRef.current.gens[key].legal) incTension(5);
  };
  const onDragOverGen = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Staff hover tooltip helpers (position in wrapper coordinates to avoid clipping)
  const onStaffMouseEnter = (id: string) => (e: React.MouseEvent) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setStaffTooltip({ id, x, y });
  };
  const onStaffMouseMove = (id: string) => (e: React.MouseEvent) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setStaffTooltip({ id, x, y });
  };
  const onStaffMouseLeave = () => setStaffTooltip(null);

  // -------- Case opening (Contrats) --------
  // rarityWeights and pickRarity imported from domain/events
  const startContractOpening = () => {
    // decrement contract and open modal with reel
    setState((prev) => {
      const c = prev.inventory?.contracts || 0;
      if (c <= 0) return prev;
      return {
        ...prev,
        inventory: {
          ...(prev.inventory || { weapons: [], vehicles: [], contracts: 0 }),
          contracts: c - 1,
        },
      };
    });
    const poolSize = 40;
    const pool: Rarity[] = Array.from({ length: poolSize }, () => pickRarity());
    const target =
      Math.floor(poolSize * 0.7) +
      Math.floor(Math.random() * Math.floor(poolSize * 0.2));
    const result = pickRarity();
    // Put result at target index to guarantee landing
    pool[target] = result;
    setCaseModal({ pool, target, result });
  };

  const openMultipleContracts = (n: number) => {
    const interval = 5200; // spacing between openings (ms) slightly above animation time
    for (let i = 0; i < n; i++) {
      window.setTimeout(() => {
        // safety: ensure there is at least one contract before attempting
        if ((stateRef.current.inventory?.contracts || 0) <= 0) return;
        startContractOpening();
      }, i * interval);
    }
  };

  return (
    <div className="min-h-screen relative text-zinc-100 font-serif">
      {tutorialActive && !state.tutorialCompleted && !showMenu && (
        <TutorialOverlay
          step={TUTORIAL_STEPS[state.tutorialStep || 0]}
          onNext={advanceTutorial}
          onSkip={skipTutorial}
        />
      )}
      {/* Main Menu Overlay */}
      {showMenu && (
        <MainMenu
          setState={setState}
          setShowMenu={setShowMenu}
          setShowOptionsModal={setShowOptionsModal}
        />
      )}
      {/* Background image layer - replace URL to match your mockup */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{
          backgroundImage: "url('/assets/mafia-bg.jpg')",
          filter: "saturate(0.9)",
        }}
      />
      {/* Dark gradient overlay for readability */}
      <div className="absolute inset-0 -z-10 bg-linear-to-br from-[#0f0c29]/90 via-[#302b63]/75 to-[#24243e]/90" />
      <ParticleCanvas />

      {/* Random Event (centered, forced choice) */}
      {showEvent && (
        <EventModal
          onClose={() => setShowEvent(false)}
          onApply={(fn) => {
            let deltas = { cash: 0, respect: 0, heat: 0 };
            setState((prev) => {
              const next = fn(prev);
              deltas = {
                cash: Math.round(next.cash - prev.cash),
                respect: Math.round(next.respect - prev.respect),
                heat: Number((next.heat - prev.heat).toFixed(2)),
              };
              return next;
            });
            return deltas;
          }}
        />
      )}

      <div
        ref={wrapperRef}
        className="relative z-10 mx-auto px-5 py-5"
        style={{ width: "100%" }}
      >
        {/* Header cinématique */}
        <div
          id="game-header"
          className="relative bg-linear-to-r from-black/90 via-amber-900/30 to-black/90 border-2 border-yellow-600 rounded-2xl p-6 mb-5 shadow-[0_10px_40px_rgba(212,175,55,0.3)] overflow-visible"
        >
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent animate-[shine_3s_infinite]" />
          <TopBar
            state={state}
            muted={muted}
            setMuted={setMuted}
            setShowOptionsModal={setShowOptionsModal}
            setShowMenu={setShowMenu}
            cashTooltipContent={cashTooltipContent}
            respectTooltipContent={respectTooltipContent}
            heatTooltipContent={heatTooltipContent}
          />
        </div>

        {/* Onglets de navigation */}
        <div className="mb-5 flex items-center gap-2">
          <button
            onClick={() => setActiveTab("ops")}
            className={`px-4 py-2 rounded-xl border transition ${
              activeTab === "ops"
                ? "bg-yellow-600/20 border-yellow-600 text-yellow-400"
                : "bg-black/60 border-yellow-700/40 hover:bg-yellow-700/10"
            }`}
          >
            Opérations
          </button>
          <button
            data-tab="family"
            onClick={() => setActiveTab("family")}
            className={`px-4 py-2 rounded-xl border transition ${
              activeTab === "family"
                ? "bg-yellow-600/20 border-yellow-600 text-yellow-400"
                : "bg-black/60 border-yellow-700/40 hover:bg-yellow-700/10"
            }`}
          >
            Gestion de la famille
          </button>
        </div>

        {/* Contenu par onglet */}
        <div style={{ display: activeTab === "ops" ? "block" : "none" }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5 items-stretch">
            {/* Personnel - Col gauche */}
            <div data-section="staff" className="lg:col-span-3">
              <Card
                title="👥 Personnel"
                subtitle={`${mockCharacters.length}/200 membres`}
                fullHeight
              >
                {/* Pagination membres */}
                <StaffListWithPagination
                  staff={mockCharacters}
                  assignments={state.assignments}
                  equipped={state.equipped || {}}
                  gens={state.gens}
                  isLocked={isActionLocked()}
                  onStaffDragStart={onStaffDragStart}
                  onMouseEnter={onStaffMouseEnter}
                  onMouseMove={onStaffMouseMove}
                  onMouseLeave={onStaffMouseLeave}
                />
              </Card>
            </div>

            {/* Générateurs - Col centre */}
            <div className="lg:col-span-6">
              <Card
                title="💼 Opérations lucratives"
                subtitle={`+$ ${formatNumber(prodSummary.cashPerSec)} /s`}
                fullHeight
              >
                <div className="grid md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-yellow-600 scrollbar-track-black/30">
                  {genSorted.entries.map(({ g, unit, revenue }) => {
                    const assigned = state.staff.filter(
                      (s) => state.assignments[s.id] === g.key
                    );
                    const staffMult = staffMultiplierForGenerator(state, g.key);
                    const staffBonusPct = Math.round((staffMult - 1) * 100);
                    const c1 = discountedGenCost(state, g, 1);
                    const c10 = discountedGenCost(state, g, 10);
                    return (
                      <GeneratorCard
                        key={g.key}
                        g={g}
                        cash={state.cash}
                        cost1={c1}
                        cost10={c10}
                        onBuyOne={() => buy(g.key, 1)}
                        onBuyTen={() => buy(g.key, 10)}
                        onBuyMax={() => buyMax(g.key)}
                        prodPerUnit={unit}
                        revenuePerSec={revenue}
                        progress={actionProgress[g.key] ?? 0}
                        maxRevenue={genSorted.maxRevenue}
                        assigned={assigned}
                        staffBonusPct={staffBonusPct}
                        onDropStaff={(e) => onDropStaffToGen(g.key, e)}
                        onDragOver={onDragOverGen}
                      />
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Bureau - Col droite */}
            <div data-section="staff" className="lg:col-span-3">
              <Card title="🏢 Le Bureau" subtitle="Gestion">
                <div className="space-y-3">
                  <ActionCard
                    icon="🤝"
                    title="Activer l'Omertà"
                    desc="Reset pour gagner des points d'Omertà"
                    buttonText={`Activer (+${prestigeGain(state.respect)})`}
                    onClick={doPrestige}
                    disabled={prestigeGain(state.respect) <= 0}
                    danger
                  />

                  <ActionCard
                    icon="⚙️"
                    title="Upgrades"
                    desc="4 améliorations disponibles"
                    buttonText="Voir upgrades"
                    onClick={() => setShowUpgradesModal(true)}
                    data-action="upgrades"
                  />

                  <ActionCard
                    icon="🎩"
                    title="Influence politique"
                    desc="Corrompre pour réduire la chaleur"
                    buttonText="Graisser des pattes"
                    onClick={() => setShowInfluenceModal(true)}
                  />

                  <ActionCard
                    icon="💼"
                    title="Investissements Omertà"
                    desc="Dépensez des points pour des bonus permanents"
                    buttonText={`Investir (Pts: ${state.prestigePoints})`}
                    onClick={() => setShowInvestments(true)}
                  />
                </div>
              </Card>
            </div>
            {/* close grid */}
          </div>

          {/* Barre de mission */}
          <div className="bg-linear-to-r from-black/90 via-zinc-900/90 to-black/90 border-2 border-yellow-600 rounded-2xl p-4">
            <div className="flex items-center gap-8">
              <div className="flex-1">
                <div className="text-xs text-yellow-600 uppercase tracking-wider mb-1">
                  📋 Mission Active
                </div>
                <div className="text-base font-bold">
                  Établir l'empire : Posséder 50 de chaque générateur
                </div>
              </div>
              <div className="flex-1">
                <div className="h-5 bg-black/50 rounded-full overflow-hidden border border-yellow-600/30">
                  <div
                    className="h-full bg-linear-to-r from-emerald-600 to-emerald-400 transition-all duration-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                    style={{ width: "68%" }}
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-400 uppercase">
                  Récompense
                </div>
                <div className="text-lg font-bold text-yellow-600">
                  +5,000 💰 +2 🤝
                </div>
              </div>
            </div>
          </div>
          {/* close ops wrapper */}
        </div>

        <div style={{ display: activeTab === "family" ? "block" : "none" }}>
          <div className="mb-5">
            <Card
              title="👪 Gestion de la famille"
              subtitle="Logistique & Relations"
              fullHeight
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ActionCard
                  icon="🏭"
                  title="Entrepôt"
                  desc="Gérer votre arsenal et équipements"
                  buttonText="Ouvrir l'entrepôt"
                  onClick={() => setShowWarehouse(true)}
                />
                <ActionCard
                  icon="🕵️"
                  title="Marché Noir"
                  desc="Armes, véhicules et contrats clandestins"
                  buttonText="Ouvrir le marché"
                  onClick={() => setShowMarket(true)}
                  data-action="black-market"
                />
                <ActionCard
                  icon="⚔️"
                  title="Relations famille"
                  desc="Gérer alliances, guerres et partenariats"
                  buttonText="Gérer relations"
                  onClick={() => setRelationsModal(true)}
                  data-action="family-relations"
                />
                <ActionCard
                  icon="🏠"
                  title="Renseignement famille"
                  desc="Puissance des familles adverses"
                  buttonText="Ouvrir"
                  onClick={() => setShowIntel(true)}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Staff hover tooltip rendered at wrapper level to avoid clipping */}
      {staffTooltip &&
        (() => {
          const c = state.staff.find((s) => s.id === staffTooltip.id);
          if (!c) return null;
          const assignedKey = state.assignments[c.id] as
            | GeneratorKey
            | undefined;
          const assignedGen = assignedKey ? state.gens[assignedKey] : undefined;
          return (
            <StaffTooltip
              staffMember={c}
              assignedGen={assignedGen}
              x={staffTooltip.x}
              y={staffTooltip.y}
            />
          );
        })()}

      {/* Action lock overlay */}
      {isActionLocked() && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="px-4 py-2 rounded-xl bg-red-700/80 text-white border border-red-400 shadow-xl">
            Sanction active: actions indisponibles
            {state.actionLockedUntilHeat != null &&
              state.heat > (state.actionLockedUntilHeat ?? 0) && (
                <span className="ml-2 text-xs">
                  (descendre la chaleur ≤ {state.actionLockedUntilHeat})
                </span>
              )}
            {state.disabledUntil && Date.now() < (state.disabledUntil || 0) && (
              <span className="ml-2 text-xs">
                (
                {Math.max(
                  0,
                  Math.ceil(((state.disabledUntil || 0) - Date.now()) / 1000)
                )}
                s restantes)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Modal Upgrades */}
      {showUpgradesModal && (
        <UpgradesModal
          state={state}
          buyUpgrade={buyUpgrade}
          setShowUpgradesModal={setShowUpgradesModal}
        />
      )}

      {/* Modal Influence */}
      {showInfluenceModal && (
        <InfluenceModal
          state={state}
          bribe={bribe}
          buyPassiveInfluence={buyPassiveInfluence}
          setShowInfluenceModal={setShowInfluenceModal}
        />
      )}

      {/* Modal Investissements Omertà */}
      {showInvestments && (
        <Modal
          title="💼 Investissements Omertà"
          onClose={() => setShowInvestments(false)}
        >
          <InvestmentsPanel
            points={state.prestigePoints}
            purchased={state.investmentsPurchased || {}}
            onBuy={(id) => {
              setState((prev) => applyInvestment(prev, id));
            }}
          />
        </Modal>
      )}

      {/* Modal Marché Noir */}
      {showMarket && (
        <Modal title="🕵️ Marché Noir" onClose={() => setShowMarket(false)}>
          <BlackMarket
            cash={state.cash}
            onBuyWeapon={(base: Omit<WeaponItem, "id">) => {
              if (stateRef.current.cash < base.price) return;
              const item: WeaponItem = {
                ...base,
                id: generateItemId("wpn"),
              };
              audio.playCash();
              setState((prev) => ({
                ...prev,
                cash: prev.cash - base.price,
                inventory: {
                  ...(prev.inventory || {
                    weapons: [],
                    vehicles: [],
                    contracts: 0,
                  }),
                  weapons: [
                    ...((prev.inventory && prev.inventory.weapons) || []),
                    item,
                  ],
                },
              }));
            }}
            onBuyVehicle={(base: Omit<VehicleItem, "id">) => {
              if (stateRef.current.cash < base.price) return;
              const item: VehicleItem = {
                ...base,
                id: generateItemId("veh"),
              };
              audio.playCash();
              setState((prev) => ({
                ...prev,
                cash: prev.cash - base.price,
                inventory: {
                  ...(prev.inventory || {
                    weapons: [],
                    vehicles: [],
                    contracts: 0,
                  }),
                  vehicles: [
                    ...((prev.inventory && prev.inventory.vehicles) || []),
                    item,
                  ],
                },
              }));
            }}
            onBuyContract={(price: number) => {
              if (stateRef.current.cash < price) return;
              audio.playCash();
              setState((prev) => ({
                ...prev,
                cash: prev.cash - price,
                inventory: {
                  ...(prev.inventory || {
                    weapons: [],
                    vehicles: [],
                    contracts: 0,
                  }),
                  contracts: (prev.inventory?.contracts || 0) + 1,
                },
              }));
            }}
          />
        </Modal>
      )}

      {/* Modal Entrepôt */}
      {showWarehouse && (
        <Modal title="🏭 Entrepôt" onClose={() => setShowWarehouse(false)}>
          <Warehouse
            inventory={
              state.inventory || { weapons: [], vehicles: [], contracts: 0 }
            }
            staff={state.staff}
            equipped={state.equipped || {}}
            onEquip={(staffId, weaponId) =>
              setState((prev) => ({
                ...prev,
                equipped: { ...(prev.equipped || {}), [staffId]: weaponId },
              }))
            }
            onSellWeapon={(id, price) => {
              if (!confirm("Vendre cette arme ?")) return;
              audio.playCash();
              setState((prev) => ({
                ...prev,
                cash: prev.cash + price,
                inventory: {
                  ...(prev.inventory || {
                    weapons: [],
                    vehicles: [],
                    contracts: 0,
                  }),
                  weapons: (prev.inventory?.weapons || []).filter(
                    (w) => w.id !== id
                  ),
                },
                equipped: Object.fromEntries(
                  Object.entries(prev.equipped || {}).map(([sid, wid]) => [
                    sid,
                    wid === id ? null : wid,
                  ])
                ),
              }));
            }}
            onSellVehicle={(id, price) => {
              if (!confirm("Vendre ce véhicule ?")) return;
              audio.playCash();
              setState((prev) => ({
                ...prev,
                cash: prev.cash + price,
                inventory: {
                  ...(prev.inventory || {
                    weapons: [],
                    vehicles: [],
                    contracts: 0,
                  }),
                  vehicles: (prev.inventory?.vehicles || []).filter(
                    (v) => v.id !== id
                  ),
                },
              }));
            }}
            onOpenContract={() => startContractOpening()}
            onOpenMultiple={() => openMultipleContracts(10)}
          />
        </Modal>
      )}

      {/* Modal Renseignements Familles */}
      {showIntel && (
        <RelationsModal
          families={state.families}
          playerState={state}
          onClose={() => setShowIntel(false)}
        />
      )}

      {/* Modal Opérations de guerre */}
      {warFor &&
        (() => {
          const fam = state.families.find((f) => f.id === warFor.id);
          if (!fam) return null;
          const inv = state.inventory || {
            weapons: [],
            vehicles: [],
            contracts: 0,
          };
          return (
            <WarModal
              family={fam}
              staff={state.staff}
              equipped={state.equipped || {}}
              weapons={inv.weapons}
              vehicles={inv.vehicles}
              allFamilies={state.families}
              isLocked={isActionLocked()}
              onClose={() => setWarFor(null)}
              onResolve={(res: WarResolve) => {
                // Apply deltas
                setState((prev) => {
                  const nfams = prev.families.map((f) => {
                    if (f.id !== res.familyId) return f;
                    const e = f.econ || {
                      cash: 0,
                      respect: 0,
                      members: 0,
                      weapons: 0,
                      vehicles: 0,
                    };
                    const nd = res.delta.target || {};
                    const nextE = {
                      ...e,
                      cash: Math.max(0, Math.round(e.cash + (nd.cash || 0))),
                      respect: Math.max(
                        0,
                        Math.round(e.respect + (nd.respect || 0))
                      ),
                      members: Math.max(
                        0,
                        Math.round((e.members || 0) + (nd.members || 0))
                      ),
                      weapons: Math.max(
                        0,
                        Math.round((e.weapons || 0) + (nd.weapons || 0))
                      ),
                      vehicles: Math.max(
                        0,
                        Math.round((e.vehicles || 0) + (nd.vehicles || 0))
                      ),
                    };
                    return { ...f, econ: nextE };
                  });
                  const pd = res.delta.player || {};
                  const next: SaveState = {
                    ...prev,
                    families: nfams,
                    cash: Math.max(0, prev.cash + (pd.cash || 0)),
                    respect: Math.max(0, prev.respect + (pd.respect || 0)),
                    heat: clamp(prev.heat + (pd.heat || 0), 0, 100),
                  };
                  return next;
                });
                if (res?.delta?.player?.tension) {
                  incTension(res.delta.player.tension);
                }
                setWarFor(null);
                setWarReport({
                  familyName: fam.name,
                  success: !!res.success,
                  lines: res.narrative || [],
                  deltas: res.delta?.player || {},
                });
              }}
            />
          );
        })()}

      {/* Report modal after an operation */}
      {warReport && (
        <WarReportModal
          warReport={warReport}
          onClose={() => setWarReport(null)}
        />
      )}

      {/* Modal Case Opening */}
      {caseModal && (
        <CaseOpeningModal
          pool={caseModal.pool}
          targetIndex={caseModal.target}
          result={caseModal.result}
          familyNames={(state.families || []).map((f) => f.name)}
          audio={audio}
          canOpenAnother={(stateRef.current.inventory?.contracts || 0) > 0}
          onOpenAnother={() => {
            // close then reopen next
            setCaseModal(null);
            setTimeout(() => {
              // reuse start logic
              const poolSize = 40;
              const rarityWeights = [
                { r: "legendary", w: 1 },
                { r: "epic", w: 3 },
                { r: "rare", w: 10 },
                { r: "uncommon", w: 24 },
                { r: "common", w: 62 },
              ];
              const pick = () => {
                const total = rarityWeights.reduce((a, b) => a + b.w, 0);
                let t = Math.random() * total;
                for (const e of rarityWeights) {
                  if ((t -= e.w) <= 0) return e.r as Rarity;
                }
                return "common" as Rarity;
              };
              setState((prev) => {
                const c = prev.inventory?.contracts || 0;
                if (c <= 0) return prev;
                const result = pick();
                const pool: Rarity[] = Array.from({ length: poolSize }, () =>
                  pick()
                );
                const target =
                  Math.floor(poolSize * 0.7) +
                  Math.floor(Math.random() * Math.floor(poolSize * 0.2));
                pool[target] = result;
                setCaseModal({ pool, target, result });
                return {
                  ...prev,
                  inventory: {
                    ...(prev.inventory || {
                      weapons: [],
                      vehicles: [],
                      contracts: 0,
                    }),
                    contracts: c - 1,
                  },
                };
              });
            }, 30);
          }}
          existingStaffNames={state.staff.map((s) => s.name)}
          onFinished={(member) => {
            setState((prev) => ({ ...prev, staff: [...prev.staff, member] }));
          }}
          onCancel={() => setCaseModal(null)}
        />
      )}

      {/* Modal Options */}
      {showOptionsModal && (
        <Modal title="⚙️ Options" onClose={() => setShowOptionsModal(false)}>
          <OptionsModal
            muted={muted}
            volume={volume}
            setMuted={setMuted}
            setVolume={setVolume}
          />
        </Modal>
      )}

      {/* Modal Relations */}
      {relationsModal && (
        <Modal
          title="⚔️ Relations familiales"
          onClose={() => setRelationsModal(false)}
        >
          <div className="space-y-4 max-h-[70vh] overflow-auto pr-2">
            {state.families.map((f) => {
              const cooldown = f.lastWarTs
                ? Math.max(0, 24 * 3600000 - (Date.now() - f.lastWarTs))
                : 0;
              const cdHours = (cooldown / 3600000).toFixed(1);
              return (
                <div
                  key={f.id}
                  className="bg-black/40 border border-yellow-600/20 rounded-xl p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-yellow-600">{f.name}</div>
                    <div className="text-xs text-zinc-300">
                      État:{" "}
                      <span className="font-semibold">
                        {f.state === "peace"
                          ? "Paix"
                          : f.state === "war"
                          ? "Guerre"
                          : "Partenariat"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <button
                      onClick={() => setPeace(f.id)}
                      className={`px-3 py-1 rounded-md text-xs border ${
                        f.state === "peace"
                          ? "bg-emerald-700/40 border-emerald-500"
                          : "bg-zinc-800 border-zinc-600"
                      }`}
                    >
                      Paix
                    </button>
                    <button
                      onClick={() => declareWar(f.id)}
                      disabled={cooldown > 0}
                      className={`px-3 py-1 rounded-md text-xs border ${
                        cooldown > 0 ? "opacity-50 cursor-not-allowed" : ""
                      } ${
                        f.state === "war"
                          ? "bg-red-700/40 border-red-500"
                          : "bg-zinc-800 border-zinc-600"
                      }`}
                    >
                      Déclarer guerre {cooldown > 0 ? `(CD ${cdHours}h)` : ""}
                    </button>
                    <button
                      onClick={() => setPartnership(f.id)}
                      className={`px-3 py-1 rounded-md text-xs border ${
                        f.state === "partnership"
                          ? "bg-indigo-700/40 border-indigo-500"
                          : "bg-zinc-800 border-zinc-600"
                      }`}
                    >
                      Partenariat
                    </button>
                    {f.state === "war" && (
                      <button
                        onClick={() => resolveWar(f.id)}
                        className="px-3 py-1 rounded-md text-xs border bg-red-800/60 border-red-500"
                      >
                        Résoudre le conflit
                      </button>
                    )}
                    {f.state === "war" && (
                      <button
                        onClick={() => setWarFor({ id: f.id })}
                        className="px-3 py-1 rounded-md text-xs border bg-yellow-800/60 border-yellow-500"
                      >
                        Planifier une action
                      </button>
                    )}
                  </div>
                  {f.state === "partnership" && (
                    <div className="text-xs text-zinc-300 space-y-2">
                      <div className="font-semibold text-yellow-600">
                        Filières dynamisées (+10%)
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {(Object.keys(state.gens) as GeneratorKey[]).map(
                          (k) => (
                            <label
                              key={k}
                              className="flex items-center gap-2 bg-black/30 rounded-md px-2 py-1"
                            >
                              <input
                                type="checkbox"
                                checked={f.partnershipSectors.includes(k)}
                                onChange={() =>
                                  togglePartnershipSector(f.id, k)
                                }
                              />
                              <span>
                                {state.gens[k].icon} {state.gens[k].name}
                              </span>
                            </label>
                          )
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Chaque filière cochée reçoit +10% pour chaque famille
                        impliquée dans le partenariat.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="text-xs text-zinc-300">
              Tension actuelle:{" "}
              <span
                className={`font-bold ${
                  state.tension >= 80 ? "text-red-400" : "text-yellow-400"
                }`}
              >
                {Math.round(state.tension)}
              </span>
              /100
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Tension Sanction */}
      {tensionModal && (
        <TensionModal
          cost={tensionModal.cost}
          onClose={() => setTensionModal(null)}
          onPayBail={(cost) => {
            setState((prev) => ({
              ...prev,
              cash: Math.max(0, prev.cash - cost),
              tension: 50,
            }));
            setTensionModal(null);
          }}
          onAcceptSanction={() => {
            setState((prev) => {
              // Lose all illegal filières
              const newGens: Record<GeneratorKey, Generator> = {
                ...prev.gens,
              };
              (Object.keys(newGens) as GeneratorKey[]).forEach((k) => {
                if (!newGens[k].legal) newGens[k] = { ...newGens[k], owned: 0 };
              });
              return {
                ...prev,
                gens: newGens,
                respect: prev.respect * 0.5,
                // Lock actions until heat drops to 20
                actionLockedUntilHeat: 20,
                tension: 0,
              };
            });
            setTensionModal(null);
          }}
        />
      )}
    </div>
  );
}

// ----------------------------
// Sous-composants UI
// (RelationBar removed - replaced by inline UI in Relations card)

// RelationBar removed

// Modal moved to src/Modal.tsx

// ----------------------------
// Random Events System
// ----------------------------

// Events data moved to domain/events

/* RandomEvent extracted to components/EventModal */
/*
function RandomEvent({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (apply: (s: SaveState) => SaveState) => {
    cash: number;
    respect: number;
    heat: number;
  };
}) {
  const ev = useMemo(
    () => EVENTS[Math.floor(Math.random() * EVENTS.length)],
    []
  );
  const [flash, setFlash] = useState<"success" | "fail" | null>(null);
  const [delta, setDelta] = useState<null | {
    cash: number;
    respect: number;
    heat: number;
  }>(null);
  const pick = (apply: (s: SaveState) => SaveState) => {
    const d = onApply(apply);
    setDelta(d);
    const good = (d.cash ?? 0) + (d.respect ?? 0) - Math.abs(d.heat ?? 0) > 0;
    setFlash(good ? "success" : "fail");
    setTimeout(() => onClose(), 1200);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-lg mx-4 bg-linear-to-br from-violet-800/90 to-purple-900/90 border-2 border-violet-400 rounded-2xl p-6 shadow-2xl">
        <div className="text-2xl font-bold mb-2 text-white">{ev.title}</div>
        <div className="text-sm mb-4 text-violet-100">{ev.desc}</div>
        <div className="flex flex-col gap-2">
          {ev.choices.map((c, i) => (
            <div key={i} className="flex flex-col gap-1">
              <button
                onClick={() => pick(c.apply)}
                className="px-4 py-3 rounded-lg bg-white/10 border border-white/30 hover:bg-white/20 transition text-sm text-left text-white"
              >
                {c.label}
              </button>
              {c.meta && (
                <div className="text-[11px] text-violet-200 ml-2">
                  {typeof c.meta.successChance === "number" && (
                    <span>
                      Chance de succès {(c.meta.successChance * 100).toFixed(0)}
                      %
                    </span>
                  )}
                  {c.meta.info && <span className="ml-2">• {c.meta.info}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
        {flash && (
          <div
            className={`pointer-events-none absolute inset-0 rounded-2xl ${
              flash === "success" ? "bg-emerald-400/30" : "bg-red-500/30"
            } animate-pulse`}
          />
        )}
        {delta && (
          <div className="mt-3 text-xs text-white/90">
            Résultat:{" "}
            {delta.cash ? `💰 ${delta.cash > 0 ? "+" : ""}${delta.cash} ` : ""}
            {delta.respect
              ? `• 👑 ${delta.respect > 0 ? "+" : ""}${delta.respect} `
              : ""}
            {typeof delta.heat === "number"
              ? `• 🔥 ${delta.heat > 0 ? "+" : ""}${delta.heat}`
              : ""}
          </div>
        )}
      </div>
    </div>
  );
}
*/

// ----------------------------
// Families Intel Component
