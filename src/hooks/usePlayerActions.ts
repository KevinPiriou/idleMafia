import React from "react";
import type { SaveState, GeneratorKey } from "../domain/types";
import { useAudioEngine } from "./useAudioEngine";
import { discountedGenCost } from "../domain/economy";
import {
  XP_PER_DOLLAR_SPENT,
  XP_PER_UPGRADE_DOLLAR,
  XP_PER_INFLUENCE_DOLLAR,
} from "../domain/balance";
import { xpForLevel } from "../domain/economy";
import { clamp } from "../domain/balance";
import { prestigeGain } from "../domain/prestige";
import { blankSave, saveGame } from "../domain/save";

export function usePlayerActions(
  stateRef: React.MutableRefObject<SaveState>,
  setState: React.Dispatch<React.SetStateAction<SaveState>>,
  incTension: (amount: number) => void,
  isActionLocked: () => boolean
) {
  const audio = useAudioEngine();

  const buy = (key: GeneratorKey, qty = 1) => {
    if (isActionLocked()) return;
    const g = stateRef.current.gens[key];
    const cost = discountedGenCost(stateRef.current, g, qty);
    if (stateRef.current.cash < cost) return;
    audio.playCash();
    setState((prev) => {
      const next: SaveState = {
        ...prev,
        cash: prev.cash - cost,
        gens: {
          ...prev.gens,
          [key]: { ...prev.gens[key], owned: prev.gens[key].owned + qty },
        },
      };
      // XP for spending on generators
      const xpGain = cost * XP_PER_DOLLAR_SPENT;
      if (xpGain > 0) {
        let nxp = (next.xp ?? 0) + xpGain;
        let nlevel = next.level ?? 1;
        while (nxp >= xpForLevel(nlevel)) {
          nxp -= xpForLevel(nlevel);
          nlevel += 1;
        }
        next.xp = nxp;
        next.level = nlevel;
      }
      return next;
    });
    // Tension rises slightly when expanding illegal operations
    if (!stateRef.current.gens[key].legal) incTension(1);
  };

  const buyMax = (key: GeneratorKey) => {
    if (isActionLocked()) return;
    const g = stateRef.current.gens[key];
    let lo = 0,
      hi = 100000;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const c = discountedGenCost(stateRef.current, g, mid);
      if (c <= stateRef.current.cash) lo = mid;
      else hi = mid - 1;
    }
    if (lo <= 0) return;
    const cost = discountedGenCost(stateRef.current, g, lo);
    audio.playCash();
    setState((prev) => {
      const next: SaveState = {
        ...prev,
        cash: prev.cash - cost,
        gens: {
          ...prev.gens,
          [key]: { ...prev.gens[key], owned: prev.gens[key].owned + lo },
        },
      };
      const xpGain = cost * XP_PER_DOLLAR_SPENT;
      if (xpGain > 0) {
        let nxp = (next.xp ?? 0) + xpGain;
        let nlevel = next.level ?? 1;
        while (nxp >= xpForLevel(nlevel)) {
          nxp -= xpForLevel(nlevel);
          nlevel += 1;
        }
        next.xp = nxp;
        next.level = nlevel;
      }
      return next;
    });
    if (!stateRef.current.gens[key].legal) incTension(2);
  };

  const buyUpgrade = (id: string) => {
    if (isActionLocked()) return;
    const u = stateRef.current.upgrades[id];
    if (!u || u.owned || stateRef.current.cash < u.cost) return;
    audio.playCash();
    setState((prev) => {
      const next: SaveState = {
        ...prev,
        cash: prev.cash - u.cost,
        upgrades: {
          ...prev.upgrades,
          [id]: { ...prev.upgrades[id], owned: true },
        },
      };
      const xpGain = u.cost * XP_PER_UPGRADE_DOLLAR;
      if (xpGain > 0) {
        let nxp = (next.xp ?? 0) + xpGain;
        let nlevel = next.level ?? 1;
        while (nxp >= xpForLevel(nlevel)) {
          nxp -= xpForLevel(nlevel);
          nlevel += 1;
        }
        next.xp = nxp;
        next.level = nlevel;
      }
      return next;
    });
  };

  const bribe = (cashCost: number, respectCost: number, heatReduce: number) => {
    if (isActionLocked()) return;
    if (
      stateRef.current.cash < cashCost ||
      stateRef.current.respect < respectCost
    )
      return;
    audio.playCash();
    setState((prev) => {
      const next: SaveState = {
        ...prev,
        cash: prev.cash - cashCost,
        respect: prev.respect - respectCost,
        heat: clamp(prev.heat - heatReduce, 0, 100),
      };
      const xpGain = cashCost * XP_PER_INFLUENCE_DOLLAR;
      if (xpGain > 0) {
        let nxp = (next.xp ?? 0) + xpGain;
        let nlevel = next.level ?? 1;
        while (nxp >= xpForLevel(nlevel)) {
          nxp -= xpForLevel(nlevel);
          nlevel += 1;
        }
        next.xp = nxp;
        next.level = nlevel;
      }
      return next;
    });
    incTension(2);
  };

  const buyPassiveInfluence = (
    cashCost: number,
    respectCost: number,
    addMitigationPerSec: number
  ) => {
    if (isActionLocked()) return;
    if (
      stateRef.current.cash < cashCost ||
      stateRef.current.respect < respectCost
    )
      return;
    audio.playCash();
    setState((prev) => {
      const next: SaveState = {
        ...prev,
        cash: prev.cash - cashCost,
        respect: prev.respect - respectCost,
        heatMitigationPerSec: prev.heatMitigationPerSec + addMitigationPerSec,
      };
      const xpGain = cashCost * XP_PER_INFLUENCE_DOLLAR;
      if (xpGain > 0) {
        let nxp = (next.xp ?? 0) + xpGain;
        let nlevel = next.level ?? 1;
        while (nxp >= xpForLevel(nlevel)) {
          nxp -= xpForLevel(nlevel);
          nlevel += 1;
        }
        next.xp = nxp;
        next.level = nlevel;
      }
      return next;
    });
  };

  const doPrestige = () => {
    if (isActionLocked()) return;
    const gain = prestigeGain(stateRef.current.respect);
    if (gain <= 0) return;
    if (!confirm(`Activer l'Omertà pour ${gain} point(s) ?`)) return;
    audio.playOmerta();
    setState((prev) => {
      const newMult = prev.prestigeMult * (1 + gain * 0.1);
      const s = blankSave();
      s.prestigeMult = newMult;
      s.prestigePoints = prev.prestigePoints + gain;
      saveGame(s);
      return s;
    });
  };

  return {
    buy,
    buyMax,
    buyUpgrade,
    bribe,
    buyPassiveInfluence,
    doPrestige,
  };
}
