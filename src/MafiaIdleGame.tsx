import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import WarModal from "./WarModal";
import TopBar from "./components/TopBar";
import BlackMarket from "./components/BlackMarket";
import OptionsModal from "./components/OptionsModal";
import Warehouse from "./components/Warehouse";
import WarReportModal from "./components/WarReportModal";
import RelationsModal from "./components/RelationsModal";
import TensionModal from "./components/TensionModal";
import { Avatar } from "./components/ui/Avatar";
import { Card } from "./components/ui/Card";
import { ActionCard } from "./components/ui/ActionCard";
import { ParticleCanvas } from "./components/ui/ParticleCanvas";
import { useAudioEngine } from "./hooks/useAudioEngine";
import { generateMafiaFullName } from "./utils/nameGenerator";
import {
  clamp,
  TOP_FILL_TIME,
  TIME_XP_RATE,
  XP_PER_CASH_PER_SEC,
  XP_PER_DOLLAR_SPENT,
  XP_PER_UPGRADE_DOLLAR,
  XP_PER_INFLUENCE_DOLLAR,
} from "./domain/balance";
import {
  discountedGenCost,
  staffBonusFor,
  staffMultiplierForGenerator,
  prodPerUnit,
  computeProduction,
  computeTick,
  revenuePerSecForKey,
  xpForLevel,
} from "./domain/economy";
import { pickRarity } from "./domain/events";
import Modal from "./Modal";
import EventModal from "./components/EventModal";
// (RandomEventDef imported in domain/events types; not needed here)
import { useGameStore, createInitialFromSave } from "./store/root";

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

// Simple Avatar component to replace boring-avatars
function Avatar({
  name,
  size,
  // allow extra props from previous avatar API and ignore them
  variant,
  colors,
}: {
  name: string;
  size: number;
  variant?: string;
  colors?: string[];
}) {
  const defaultColors = ["#d4af37", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981"];
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const palette = colors ?? defaultColors;
  const bgColor = palette[hash % palette.length];
  const extraStyle =
    variant === "beam"
      ? { boxShadow: "inset 0 0 8px rgba(255,255,255,0.06)" }
      : {};
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white border-2 border-yellow-600"
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        fontSize: size * 0.5,
        ...extraStyle,
      }}
    >
      {initial}
    </div>
  );
}

// ----------------------------
// Moteur audio (identique)
// ----------------------------
function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const bgGainRef = useRef<GainNode | null>(null);
  const sfxGainRef = useRef<GainNode | null>(null);
  const loopTimerRef = useRef<number | null>(null);
  const reelTimerRef = useRef<number | null>(null);
  const [enabled, setEnabled] = useState<boolean>(false);
  const volRef = useRef<number>(1);
  const BG_BASE = 0.2;
  const SFX_BASE = 0.5;

  const ensureCtx = async () => {
    if (ctxRef.current) return ctxRef.current;
    const ctx: AudioContext = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    const bgGain = ctx.createGain();
    bgGain.gain.value = BG_BASE * volRef.current;
    bgGain.connect(master);
    const sfxGain = ctx.createGain();
    sfxGain.gain.value = SFX_BASE * volRef.current;
    sfxGain.connect(master);
    ctxRef.current = ctx;
    bgGainRef.current = bgGain;
    sfxGainRef.current = sfxGain;
    return ctx;
  };

  const stopBgLoop = () => {
    if (loopTimerRef.current != null) {
      window.clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
    }
  };

  const startBgLoop = async () => {
    const ctx = await ensureCtx();
    stopBgLoop();
    const scale = [0, 3, 5, 7, 10];
    const root = 196;
    let step = 0;
    loopTimerRef.current = window.setInterval(() => {
      if (!bgGainRef.current) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      const deg = scale[step++ % scale.length];
      osc.frequency.value = root * Math.pow(2, deg / 12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(g);
      g.connect(bgGainRef.current!);
      osc.start(t);
      osc.stop(t + 0.5);
    }, 600);
  };

  const applyGains = (muted: boolean) => {
    if (!bgGainRef.current || !sfxGainRef.current) return;
    bgGainRef.current.gain.value = muted ? 0 : BG_BASE * volRef.current;
    sfxGainRef.current.gain.value = muted ? 0 : SFX_BASE * volRef.current;
  };

  const setMuted = async (m: boolean) => {
    await ensureCtx();
    applyGains(m);
    setEnabled(!m);
  };
  const setVolume = async (v: number) => {
    volRef.current = Math.max(0, Math.min(1, v));
    await ensureCtx();
    applyGains(!enabled);
  };

  const playCash = async () => {
    await ensureCtx();
    if (!sfxGainRef.current || !ctxRef.current) return;
    const ctx = ctxRef.current;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.07);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(g);
    g.connect(sfxGainRef.current);
    osc.start(t);
    osc.stop(t + 0.16);
  };

  const playOmerta = async () => {
    await ensureCtx();
    if (!sfxGainRef.current || !ctxRef.current) return;
    const ctx = ctxRef.current;
    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();
    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.value = 196;
    osc2.frequency.value = 196 * 0.98;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    osc1.connect(g);
    osc2.connect(g);
    g.connect(sfxGainRef.current);
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.25);
    osc2.stop(t + 1.25);
  };

  const startReelSound = async () => {
    const ctx = await ensureCtx();
    stopReelSound();
    reelTimerRef.current = window.setInterval(() => {
      if (!sfxGainRef.current) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(1200, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(g);
      g.connect(sfxGainRef.current);
      osc.start(t);
      osc.stop(t + 0.06);
    }, 90) as unknown as number;
  };
  const stopReelSound = () => {
    if (reelTimerRef.current != null) {
      window.clearInterval(reelTimerRef.current);
      reelTimerRef.current = null;
    }
  };

  const playDropWin = async (rarity: string) => {
    const ctx = await ensureCtx();
    if (!sfxGainRef.current) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    const freq =
      rarity === "legendary"
        ? 880
        : rarity === "epic"
        ? 660
        : rarity === "rare"
        ? 520
        : rarity === "uncommon"
        ? 440
        : 360;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    osc.connect(g);
    g.connect(sfxGainRef.current);
    osc.start(t);
    osc.stop(t + 0.42);
  };

  const enable = async () => {
    await ensureCtx();
    setEnabled(true);
    applyGains(false);
    startBgLoop();
  };
  const disable = () => {
    setEnabled(false);
    stopBgLoop();
    applyGains(true);
  };

  useEffect(() => {
    return () => {
      setEnabled(false);
      if (loopTimerRef.current != null) {
        window.clearInterval(loopTimerRef.current);
        loopTimerRef.current = null;
      }
      if (bgGainRef.current) bgGainRef.current.gain.value = 0;
      if (sfxGainRef.current) sfxGainRef.current.gain.value = 0;
    };
  }, []);

  return {
    enabled,
    enable,
    disable,
    setMuted,
    setVolume,
    playCash,
    playOmerta,
    startReelSound,
    stopReelSound,
    playDropWin,
  };
}

// ----------------------------
// Types (identiques)
// ----------------------------
type GeneratorKey =
  | "pickpocket"
  | "racket"
  | "club"
  | "casino"
  | "olive"
  | "bar"
  | "grocery";

type Generator = {
  key: GeneratorKey;
  name: string;
  icon: string;
  baseCost: number;
  costGrowth: number;
  baseProd: number;
  baseHeat: number;
  legal: boolean;
  owned: number;
};

type Upgrade = {
  id: string;
  label: string;
  desc: string;
  target: GeneratorKey | "global";
  cost: number;
  owned: boolean;
  mult: number;
};

type SaveState = {
  cash: number;
  respect: number;
  heat: number;
  gens: Record<GeneratorKey, Generator>;
  upgrades: Record<string, Upgrade>;
  prestigeMult: number;
  prestigePoints: number;
  heatMitigationPerSec: number;
  lastSave: number;
  version?: number;
  level: number;
  xp: number;
  // NEW: Staff management
  staff: StaffMember[];
  assignments: Record<string, GeneratorKey | null>; // charId -> generator key
  // NEW: Family relations
  families: Family[];
  tempGlobalBuffUntil?: number; // timestamp for temporary +50% buff after war won
  tension: number; // 0..100
  disabledUntil?: number; // timestamp until which actions are disabled due to sanction
  actionLockedUntilHeat?: number; // if set, actions locked while heat > this threshold
  // Inventory & equipment
  inventory?: {
    weapons: WeaponItem[];
    vehicles: VehicleItem[];
    contracts: number;
  };
  equipped?: Record<string, string | null>; // staffId -> weaponItemId
  // Investments (Omertà permanent upgrades)
  permaGlobalMult?: number;
  costDiscount?: number;
  investmentsPurchased?: Record<string, boolean>;
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

const defaultGenerators = (): Record<GeneratorKey, Generator> => ({
  pickpocket: {
    key: "pickpocket",
    name: "Pickpockets",
    icon: "🎯",
    baseCost: 10,
    costGrowth: 1.12,
    baseProd: 0.6,
    baseHeat: 0.02,
    legal: false,
    owned: 0,
  },
  racket: {
    key: "racket",
    name: "Rackets",
    icon: "💰",
    baseCost: 120,
    costGrowth: 1.13,
    baseProd: 6,
    baseHeat: 0.06,
    legal: false,
    owned: 0,
  },
  club: {
    key: "club",
    name: "Boîtes de nuit",
    icon: "🍸",
    baseCost: 1600,
    costGrowth: 1.14,
    baseProd: 40,
    baseHeat: 0.12,
    legal: false,
    owned: 0,
  },
  casino: {
    key: "casino",
    name: "Casinos",
    icon: "🎰",
    baseCost: 24000,
    costGrowth: 1.16,
    baseProd: 220,
    baseHeat: 0.22,
    legal: false,
    owned: 0,
  },
  olive: {
    key: "olive",
    name: "Huile d'olive",
    icon: "🫒",
    baseCost: 300,
    costGrowth: 1.12,
    baseProd: 4,
    baseHeat: 0.0,
    legal: true,
    owned: 0,
  },
  bar: {
    key: "bar",
    name: "Bars",
    icon: "🍷",
    baseCost: 900,
    costGrowth: 1.13,
    baseProd: 12,
    baseHeat: 0.01,
    legal: true,
    owned: 0,
  },
  grocery: {
    key: "grocery",
    name: "Épiceries",
    icon: "🛒",
    baseCost: 2200,
    costGrowth: 1.14,
    baseProd: 25,
    baseHeat: 0.005,
    legal: true,
    owned: 0,
  },
});

const defaultUpgrades = (): Record<string, Upgrade> => ({
  u_pp_1: {
    id: "u_pp_1",
    label: "Doigts agiles",
    desc: "+100% pickpockets",
    target: "pickpocket",
    cost: 250,
    owned: false,
    mult: 2,
  },
  u_rk_1: {
    id: "u_rk_1",
    label: "Bâtons",
    desc: "+100% rackets",
    target: "racket",
    cost: 1800,
    owned: false,
    mult: 2,
  },
  u_cb_1: {
    id: "u_cb_1",
    label: "DJ maison",
    desc: "+100% boîtes",
    target: "club",
    cost: 12000,
    owned: false,
    mult: 2,
  },
  u_cs_1: {
    id: "u_cs_1",
    label: "Croupiers",
    desc: "+100% casinos",
    target: "casino",
    cost: 80000,
    owned: false,
    mult: 2,
  },
});

const blankSave = (): SaveState => ({
  cash: 10,
  respect: 0,
  heat: 0,
  gens: defaultGenerators(),
  upgrades: defaultUpgrades(),
  prestigeMult: 1,
  prestigePoints: 0,
  heatMitigationPerSec: 0,
  lastSave: Date.now(),
  version: 2,
  level: 1,
  xp: 0,
  staff: defaultStaff(),
  assignments: {},
  families: defaultFamilies(),
  tempGlobalBuffUntil: undefined,
  tension: 0,
  disabledUntil: undefined,
  actionLockedUntilHeat: undefined,
  inventory: { weapons: [], vehicles: [], contracts: 0 },
  equipped: {},
  permaGlobalMult: 1,
  costDiscount: 0,
  investmentsPurchased: {},
});

const STORAGE_KEY = "mafia-idle-redesign-v1";

const loadSave = (): SaveState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankSave();
    const parsed = JSON.parse(raw) as SaveState;
    const gens = defaultGenerators();
    const upgs = defaultUpgrades();
    Object.values(parsed.gens || {}).forEach((g) => {
      if (gens[g.key]) gens[g.key] = { ...gens[g.key], ...g };
    });
    Object.values(parsed.upgrades || {}).forEach((u) => {
      if (upgs[u.id]) upgs[u.id] = { ...upgs[u.id], ...u };
    });
    // Migrate new fields safely
    const base = blankSave();
    return {
      ...base,
      ...parsed,
      gens,
      upgrades: upgs,
      // Ensure numeric fields are sane after migration
      prestigeMult:
        typeof (parsed as SaveState).prestigeMult === "number"
          ? (parsed as SaveState).prestigeMult
          : base.prestigeMult,
      heatMitigationPerSec:
        typeof (parsed as SaveState).heatMitigationPerSec === "number"
          ? (parsed as SaveState).heatMitigationPerSec
          : base.heatMitigationPerSec,
      staff: parsed.staff && parsed.staff.length ? parsed.staff : base.staff,
      assignments: parsed.assignments || base.assignments,
      families:
        parsed.families && parsed.families.length
          ? parsed.families
          : base.families,
      tempGlobalBuffUntil: parsed.tempGlobalBuffUntil,
      tension:
        typeof parsed.tension === "number" ? parsed.tension : base.tension,
      disabledUntil: parsed.disabledUntil,
      actionLockedUntilHeat: parsed.actionLockedUntilHeat,
      inventory: parsed.inventory || base.inventory,
      equipped: parsed.equipped || base.equipped,
      permaGlobalMult:
        typeof (parsed as SaveState).permaGlobalMult === "number"
          ? (parsed as SaveState).permaGlobalMult
          : base.permaGlobalMult,
      costDiscount:
        typeof (parsed as SaveState).costDiscount === "number"
          ? (parsed as SaveState).costDiscount
          : base.costDiscount,
      investmentsPurchased:
        (parsed as SaveState).investmentsPurchased || base.investmentsPurchased,
    };
  } catch (e) {
    console.warn("Failed to load save:", e);
    return blankSave();
  }
};

const saveGame = (state: SaveState) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, lastSave: Date.now() })
    );
  } catch (e) {
    console.warn("Failed to save game:", e);
  }
};

const prestigeGain = (respect: number) => Math.floor(Math.sqrt(respect) / 50);

// totalLocalMult and totalGlobalMult imported from domain/economy

// prodPerUnit imported from domain/economy

// computeProduction imported from domain/economy

// computeTick imported from domain/economy

// revenuePerSecForKey imported from domain/economy

// ----------------------------
// Staff & Relations (new)
// ----------------------------
type StaffMember = {
  id: string;
  name: string;
  role: string;
  family: string;
  stats: [number, number, number, number]; // [Art/Charisme, Force, Esprit, Réseau]
};

function defaultStaff(): StaffMember[] {
  return [
    {
      id: "1",
      name: 'Marco "Le Rat" Rossi',
      role: "Soldat",
      family: "Famiglia d'Oro",
      stats: [80, 60, 40, 70],
    },
    {
      id: "2",
      name: 'Luca "La Main" Ferrari',
      role: "Capieri",
      family: "Famiglia del Vino",
      stats: [90, 85, 75, 95],
    },
    {
      id: "3",
      name: 'Giovanni "Blade" Conti',
      role: "Associé",
      family: "Famiglia Smeraldo",
      stats: [50, 95, 30, 45],
    },
    {
      id: "4",
      name: 'Antoine "Le Chat" Dubois',
      role: "Petite frappe",
      family: "Famiglia della Notte",
      stats: [65, 40, 55, 50],
    },
  ];
}

// ------------- Mafia-themed name generator (faker-like fallback) -------------
const MAFIA_FIRST = [
  "Marco",
  "Luca",
  "Giovanni",
  "Alessio",
  "Vito",
  "Salvatore",
  "Rocco",
  "Franco",
  "Enzo",
  "Paolo",
  "Nico",
  "Gino",
  "Fabrizio",
  "Massimo",
  "Domenico",
  "Carlo",
  "Angelo",
  "Pietro",
  "Sergio",
  "Leonardo",
  "Antonio",
  "Giuseppe",
  "Carmine",
  "Michele",
  "Donato",
  "Gaetano",
  "Raffaele",
  "Bruno",
  "Emilio",
  "Alberto",
  "Mario",
  "Luigi",
  "Ettore",
  "Tommaso",
  "Giorgio",
  "Riccardo",
  "Silvio",
  "Claudio",
  "Umberto",
  "Adriano",
  "Renato",
  "Toni",
  "Alfonso",
  "Cosimo",
  "Pasquale",
  "Gennaro",
  "Vincenzo",
  "Pino",
  "Lorenzo",
  "Matteo",
  "Nerio",
  "Rinaldo",
  "Aldo",
  "Cesare",
  "Giuliano",
  "Dario",
  "Santino", // clin d'œil au Parrain
  "Mauro",
  "Federico",
  "Giacomo",
  "Emanuele",
];
const MAFIA_LAST = [
  "Rossi",
  "Moretti",
  "Ferrari",
  "Bianchi",
  "Conti",
  "Costa",
  "Romano",
  "Greco",
  "Gallo",
  "Barbieri",
  "Gatti",
  "Marino",
  "Giordano",
  "De Luca",
  "Lombardi",
  "Esposito",
  "Ricci",
  "De Santis",
  "Caruso",
  "Giuliani",
  "Mancini",
  "De Angelis",
  "Ruggiero",
  "Bellini",
  "Santoro",
  "Vitale",
  "Parisi",
  "Serra",
  "Palermo",
  "Caputo",
  "Giuliano",
  "De Rosa",
  "Ferretti",
  "Pellegrini",
  "Romani",
  "Leone",
  "Battaglia",
  "Benedetti",
  "Martelli",
  "Luciano",
  "Grella",
  "Corsetti",
  "Riccardi",
  "D’Amico",
  "Lombardo",
  "Siciliano",
  "Calabrese",
  "Toscano",
  "Valenti",
  "Brunetti",
  "Barone",
  "Cattaneo",
  "Fiore",
  "Sartori",
  "Capriani",
  "De Matteo",
  "Veneziano",
  "Santini",
  "Falcone", // clin d'œil au juge Giovanni Falcone
  "Corleone", // référence au Parrain
];
const MAFIA_NICK = [
  "Le Rat",
  "La Main",
  "L'Ombre",
  "Le Chat",
  "La Griffe",
  "Il Saggio",
  "Il Toro",
  "Il Veloce",
  "Le Chacal",
  "Il Silenzio",
  "Il Muto",
  "Il Rosso",
  "Il Lupo",
  "Il Furetto",
  "Le Fantôme",
  "La Vipère",
  "Le Serpent",
  "La Mort",
  "Le Tueur",
  "Le Boss",
  "La Main Noire",
  "Le Bourreau",
  "Le Vieux",
  "Le Jeune",
  "Le Boucher",
  "Le Corbeau",
  "Le Professeur",
  "Le Traître",
  "Le Lion",
  "Le Médecin",
  "La Bête",
  "Le Sanguinaire",
  "Le Beau",
  "Le Sourd",
  "Le Noir",
  "La Flamme",
  "Le Poing",
  "Le Roi",
  "Le Fou",
  "Le Comptable",
  "Le Saint",
  "Le Marionnettiste",
  "La Lame",
  "Le Tailleur",
  "Le Jaguar",
  "Le Renard",
  "L’Araignée",
  "Le Loup Noir",
  "Le Magnifique",
  "Le Juste",
  "Le Nettoyeur",
  "Le Croque-mort",
  "Le Gentleman",
  "Le Forgeron",
  "Le Couteau",
  "Le Bâtisseur",
  "Le Fossoyeur",
  "Le Vautour",
  "Le Revenant",
  "Le Diable",
  "L’Ange Noir",
  "Le Corsaire",
  "Le Cuirassé",
  "Le Sang-Froid",
  "Le Miracle",
  "Le Solitaire",
  "Le Spectre",
  "Le Bouclier",
  "Le Goupil",
  "Le Boiteux",
  "Le Borgne",
  "Le Parfumé",
  "Le Grincheux",
  "Le Maréchal",
  "Le Consul",
  "Le Notaire",
  "Le Chanteur",
  "Le Cardinal",
  "Le Serin",
  "Le Poète",
  "Le Maudit",
  "Le Sans-Visage",
  "Le Corrompu",
  "Le Protecteur",
  "Le Froid",
  "Le Cuistot",
  "Le Négociant",
  "Le Tigre",
  "Le Vieux Loup",
  "Le Revenant",
  "Le Caméléon",
  "Le Duc",
  "Le Capitaine",
  "Le Moine",
  "Le Saint-Homme",
  "Le Maquignon",
  "Le Scorpion",
  "Le Grizzly",
  "Le Pèlerin",
  "Le Sommeil",
  "Le Brumeux",
  "Le Sage Fou",
];
const usedNames = new Set<string>();
function generateMafiaFullName(): string {
  let tries = 0;
  while (tries++ < 200) {
    const f = MAFIA_FIRST[Math.floor(Math.random() * MAFIA_FIRST.length)];
    const l = MAFIA_LAST[Math.floor(Math.random() * MAFIA_LAST.length)];
    const n = MAFIA_NICK[Math.floor(Math.random() * MAFIA_NICK.length)];
    const full = `${f} "${n}" ${l}`;
    if (!usedNames.has(full)) {
      usedNames.add(full);
      return full;
    }
  }
  return `${MAFIA_FIRST[0]} "${MAFIA_NICK[0]}" ${MAFIA_LAST[0]}`;
}

// ----------------------------
// Inventory & Market types
// ----------------------------
type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

type WeaponItem = {
  id: string;
  name: string;
  rarity: Rarity;
  bonusPower: number; // impacts war outcomes
  bonusDesc: string;
  price: number;
};

type VehicleItem = {
  id: string;
  name: string;
  rarity: Rarity;
  speed: number;
  armor: number;
  price: number;
};

function generateItemId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// staffBonusFor imported from domain/economy

// staffMultiplierForGenerator imported from domain/economy

type FamilyState = "peace" | "war" | "partnership";
type Family = {
  id: string;
  name: string;
  state: FamilyState;
  partnershipSectors: GeneratorKey[]; // selected filières for partnership
  lastWarTs?: number; // ms
  // Dynamic economy fields
  econ?: {
    cash: number;
    respect: number;
    members: number;
    weapons: number;
    vehicles: number;
    tier?: "normal" | "bankrupt" | "boss";
  };
  econFactor?: number; // 0.6 .. 1.4 scaling vs player
};

function defaultFamilies(): Family[] {
  return [
    {
      id: "f1",
      name: "Famiglia d'Oro",
      state: "peace",
      partnershipSectors: [],
      econ: {
        cash: 2500,
        respect: 200,
        members: 24,
        weapons: 2,
        vehicles: 1,
        tier: "normal",
      },
      econFactor: 1.0,
    },
    {
      id: "f2",
      name: "Famiglia del Vino",
      state: "peace",
      partnershipSectors: [],
      econ: {
        cash: 1800,
        respect: 160,
        members: 20,
        weapons: 1,
        vehicles: 1,
        tier: "normal",
      },
      econFactor: 0.9,
    },
    {
      id: "f3",
      name: "Famiglia Smeraldo",
      state: "peace",
      partnershipSectors: [],
      econ: {
        cash: 3000,
        respect: 220,
        members: 26,
        weapons: 2,
        vehicles: 2,
        tier: "normal",
      },
      econFactor: 1.1,
    },
  ];
}

// familyMultiplierForGenerator imported from domain/economy

// familyRespectMultiplier imported from domain/economy

// Compute total war power from equipped weapons
function computeWarPower(state: SaveState): number {
  const inv = state.inventory || { weapons: [], vehicles: [], contracts: 0 };
  const eq = state.equipped || {};
  let power = 0;
  Object.values(eq).forEach((wid) => {
    if (!wid) return;
    const item = inv.weapons.find((w) => w.id === wid);
    if (item) power += item.bonusPower;
  });
  return power;
}

// Simulate other families' economies to keep pacing with player
function simulateFamiliesEconomy(
  state: SaveState,
  dt: number,
  playerCashPerSec: number
): Family[] {
  const fams = state.families.map((f) => ({ ...f }));
  const avgWeaponPrice = 4000;
  const avgVehiclePrice = 9000;
  fams.forEach((f, idx) => {
    const econ = f.econ || {
      cash: 0,
      respect: 0,
      members: 10,
      weapons: 0,
      vehicles: 0,
      tier: "normal",
    };
    const factor = Math.max(
      0.6,
      Math.min(1.4, f.econFactor ?? 0.9 + 0.1 * idx)
    );
    let mult = 1;
    if (f.state === "war") mult *= 1.15;
    if (f.state === "partnership") mult *= 1.08;
    const noise = (Math.random() - 0.5) * 0.1; // +/-5%
    const inflow = Math.max(0, playerCashPerSec * factor * mult * (1 + noise));
    // Basic cash dynamics
    econ.cash += inflow * dt;

    // Occasional random events (gain or loss)
    if (Math.random() < 0.003 * dt) {
      const good = Math.random() < 0.55;
      if (good) {
        econ.cash += 2000 + Math.random() * 4000;
        econ.respect += 10 + Math.random() * 15;
      } else {
        econ.cash = Math.max(0, econ.cash - (1000 + Math.random() * 5000));
        econ.respect = Math.max(0, econ.respect - (10 + Math.random() * 20));
      }
    }

    // Spend cash to acquire weapons/vehicles
    if (econ.cash > avgWeaponPrice * 1.2 && Math.random() < 0.004 * dt) {
      econ.cash -= avgWeaponPrice;
      econ.weapons += 1;
    }
    if (econ.cash > avgVehiclePrice * 1.2 && Math.random() < 0.0025 * dt) {
      econ.cash -= avgVehiclePrice;
      econ.vehicles += 1;
    }

    // Members growth/decay
    const memberDrift = (0.02 + econ.respect / 10000) * dt; // ~slow growth with respect
    if (Math.random() < memberDrift) econ.members += 1;
    if (Math.random() < 0.005 * dt && econ.members > 5) econ.members -= 1;

    // Respect drifts slightly toward player's trend
    econ.respect = Math.max(
      0,
      econ.respect +
        (Math.log10(1 + playerCashPerSec) * 0.05 - state.heat * 0.001) * dt
    );

    // Bankruptcy detection
    if (
      econ.cash <= 0 &&
      econ.respect < 50 &&
      econ.members < 8 &&
      Math.random() < 0.001 * dt
    ) {
      econ.tier = "bankrupt";
      econ.cash = 0;
      econ.weapons = Math.max(0, Math.floor(econ.weapons * 0.5));
      econ.vehicles = Math.max(0, Math.floor(econ.vehicles * 0.5));
    } else if (econ.tier === "bankrupt" && Math.random() < 0.002 * dt) {
      // chance to recover from bankruptcy
      econ.tier = "normal";
      econ.respect += 20;
    }

    f.econ = econ;
  });

  // Determine boss family relative to player score
  const playerScore = computeCompositePower(state);
  let maxScore = playerScore;
  const scores: number[] = fams.map((f) => computeFamilyScore(f));
  scores.forEach((s) => {
    if (s > maxScore) maxScore = s;
  });
  // Set tiers: one boss if significantly higher than player
  let bossSet = false;
  fams.forEach((f, i) => {
    if (!f.econ) return;
    if (!bossSet && scores[i] > playerScore * 1.35) {
      f.econ.tier = "boss";
      bossSet = true;
    } else if (f.econ.tier !== "bankrupt") {
      f.econ.tier = "normal";
    }
  });

  return fams;
}

function computeFamilyScore(f: Family): number {
  const e = f.econ || {
    cash: 0,
    respect: 0,
    members: 0,
    weapons: 0,
    vehicles: 0,
  };
  return (
    e.cash / 10000 +
    e.respect / 500 +
    e.members / 50 +
    e.weapons * 2 +
    e.vehicles * 1.5
  );
}

function computeCompositePower(state: SaveState): number {
  const inv = state.inventory || { weapons: [], vehicles: [], contracts: 0 };
  const staffCount = state.staff.length;
  return (
    state.cash / 10000 +
    state.respect / 500 +
    staffCount / 50 +
    inv.weapons.length * 2 +
    inv.vehicles.length * 1.5
  );
}

// ----------------------------
// Composant Canvas Particles
// ----------------------------
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2,
        opacity: Math.random() * 0.5,
      });
    }

    let animationId: number;
    function animate() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity})`;
        ctx.fill();
      });

      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(212, 175, 55, ${
              0.1 * (1 - distance / 150)
            })`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    }
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none opacity-30 z-0"
    />
  );
}

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
  }, []);

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

  // Réseau politique / mitigation passive
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
      {/* Main Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="w-full max-w-md rounded-2xl border-2 border-yellow-600 bg-linear-to-br from-zinc-900 to-zinc-800 p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-yellow-400 mb-2 tracking-widest">
              MAFIA IDLE
            </h2>
            <p className="text-sm text-zinc-300 mb-4">
              Reprenez votre empire ou démarrez une nouvelle partie.
            </p>
            <div className="space-y-3">
              <button
                className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-lg"
                onClick={() => {
                  if (
                    !confirm(
                      "Démarrer une nouvelle partie ? L'Omertà est conservée."
                    )
                  )
                    return;
                  setState((prev) => {
                    const fresh = blankSave();
                    fresh.prestigeMult = prev.prestigeMult;
                    fresh.prestigePoints = prev.prestigePoints;
                    saveGame(fresh);
                    return fresh;
                  });
                  setShowMenu(false);
                }}
              >
                Nouvelle partie
              </button>
              <button
                className="w-full px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-lg"
                onClick={() => setShowMenu(false)}
              >
                Reprendre
              </button>
              <button
                className="w-full px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-lg"
                onClick={() => setShowOptionsModal(true)}
              >
                Options
              </button>
            </div>
          </div>
        </div>
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
        <div className="relative bg-linear-to-r from-black/90 via-amber-900/30 to-black/90 border-2 border-yellow-600 rounded-2xl p-6 mb-5 shadow-[0_10px_40px_rgba(212,175,55,0.3)] overflow-visible">
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
            <div className="lg:col-span-3">
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
            <div className="lg:col-span-3">
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
                />
                <ActionCard
                  icon="⚔️"
                  title="Relations famille"
                  desc="Gérer alliances, guerres et partenariats"
                  buttonText="Gérer relations"
                  onClick={() => setRelationsModal(true)}
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
          const force = c.stats[1];
          const esprit = c.stats[2];
          const reseau = c.stats[3];
          const legalPct = Math.round(
            ((esprit / 100) * 0.1 + (reseau / 100) * 0.05) * 100
          );
          const illegalPct = Math.round(
            ((force / 100) * 0.15 + (reseau / 100) * 0.05) * 100
          );
          const currentPct = assignedGen
            ? Math.round((staffBonusFor(c, assignedGen) - 1) * 100)
            : null;
          return (
            <div
              className="absolute z-50 pointer-events-none"
              style={{ left: staffTooltip.x + 16, top: staffTooltip.y + 16 }}
            >
              <div className="rounded-xl border border-yellow-600/60 bg-black/85 backdrop-blur-sm p-3 shadow-2xl min-w-60">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar size={28} name={c.id} />
                  <div className="text-sm font-semibold truncate">{c.name}</div>
                </div>
                <div className="text-[11px] text-zinc-300 mb-2">
                  <span className="px-1.5 py-0.5 rounded border border-zinc-700 mr-2">
                    {c.role}
                  </span>
                  <span className="px-1.5 py-0.5 rounded border border-zinc-700">
                    {c.family}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {[
                    {
                      label: "🎭 Charisme",
                      v: c.stats[0],
                      color: "from-yellow-600 to-yellow-300",
                    },
                    {
                      label: "💪 Force",
                      v: c.stats[1],
                      color: "from-red-600 to-red-400",
                    },
                    {
                      label: "🧠 Esprit",
                      v: c.stats[2],
                      color: "from-sky-600 to-sky-400",
                    },
                    {
                      label: "🤝 Réseau",
                      v: c.stats[3],
                      color: "from-emerald-600 to-emerald-400",
                    },
                  ].map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between">
                        <span>{s.label}</span>
                        <span>{s.v}</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-linear-to-r ${s.color}`}
                          style={{ width: `${s.v}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[11px] text-zinc-300 grid grid-cols-2 gap-2">
                  <div>Bonus légal potentiel</div>
                  <div className="text-right text-emerald-400 font-semibold">
                    +{legalPct}%
                  </div>
                  <div>Bonus illégal potentiel</div>
                  <div className="text-right text-emerald-400 font-semibold">
                    +{illegalPct}%
                  </div>
                  {assignedGen && (
                    <>
                      <div>Affecté à</div>
                      <div className="text-right">
                        {assignedGen.icon} {assignedGen.name}
                      </div>
                      <div>Bonus actuel</div>
                      <div className="text-right text-yellow-400 font-semibold">
                        +{currentPct}%
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
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
        <Modal
          title="⚙️ Upgrades disponibles"
          onClose={() => setShowUpgradesModal(false)}
        >
          <div className="grid md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
            {Object.values(state.upgrades).map((u) => (
              <div
                key={u.id}
                className="bg-black/50 border border-yellow-600/20 rounded-xl p-4 flex justify-between items-center hover:border-yellow-600 transition"
              >
                <div>
                  <div className="font-bold">{u.label}</div>
                  <div className="text-sm text-zinc-400">{u.desc}</div>
                </div>
                {u.owned ? (
                  <span className="text-emerald-400 text-sm font-bold">
                    ✓ Acheté
                  </span>
                ) : (
                  <button
                    onClick={() => buyUpgrade(u.id)}
                    disabled={state.cash < u.cost}
                    className={`px-4 py-2 rounded-lg font-bold transition ${
                      state.cash >= u.cost
                        ? "bg-emerald-600 hover:bg-emerald-500"
                        : "bg-zinc-800 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    $ {formatNumber(u.cost)}
                  </button>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Modal Influence */}
      {showInfluenceModal && (
        <Modal
          title="🎩 Influence politique"
          onClose={() => setShowInfluenceModal(false)}
        >
          <div className="space-y-3">
            <div className="text-sm text-zinc-300 mb-4">
              Mitigation passive:{" "}
              <span className="text-yellow-600 font-bold">
                {(state.heatMitigationPerSec ?? 0).toFixed(2)} /s
              </span>
            </div>
            <button
              onClick={() => {
                bribe(500, 50, 5);
                setShowInfluenceModal(false);
              }}
              disabled={state.cash < 500 || state.respect < 50}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition"
            >
              Graisser la pâte du juge (−5 chaleur) • $500 + 50 respect
            </button>
            <button
              onClick={() => buyPassiveInfluence(5000, 250, 0.05)}
              disabled={state.cash < 5000 || state.respect < 250}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition"
            >
              Réseau politique (−0.05/s) • $5k + 250 respect
            </button>
            <button
              onClick={() => buyPassiveInfluence(10000, 125, 0.05)}
              disabled={state.cash < 10000 || state.respect < 125}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition"
            >
              Pot de vin au commissaire (−0.05/s) • $10k + 125 respect
            </button>
          </div>
        </Modal>
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

function Card({
  title,
  subtitle,
  children,
  fullHeight = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  fullHeight?: boolean;
}) {
  return (
    <div
      className={
        "relative bg-linear-to-br from-zinc-900/95 to-zinc-800/95 border-2 border-yellow-600/30 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm overflow-hidden " +
        (fullHeight ? "h-full flex flex-col" : "")
      }
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-yellow-600 to-transparent" />
      <div className="p-5 border-b border-yellow-600/20">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-yellow-600 uppercase tracking-wider">
            {title}
          </h2>
          {subtitle && (
            <span className="text-sm text-emerald-400 font-semibold">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <div
        className={"p-5 " + (fullHeight ? "flex-1 min-h-0 flex flex-col" : "")}
      >
        {children}
      </div>
    </div>
  );
}

// Paginated staff list component
function StaffListWithPagination({
  staff,
  assignments,
  equipped,
  gens,
  isLocked,
  onStaffDragStart,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}: {
  staff: StaffMember[];
  assignments: Record<string, GeneratorKey | null>;
  equipped: Record<string, string | null>;
  gens: Record<GeneratorKey, Generator>;
  isLocked: boolean;
  onStaffDragStart: (e: React.DragEvent, id: string) => void;
  onMouseEnter: (id: string) => (e: React.MouseEvent) => void;
  onMouseMove: (id: string) => (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}) {
  const [page, setPage] = React.useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(staff.length / pageSize));
  const start = (page - 1) * pageSize;
  const current = staff.slice(start, start + pageSize);
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="text-zinc-300">
          Page {page}/{totalPages} • {staff.length} membres
        </div>
        <div className="space-x-2">
          <button
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ◀
          </button>
          <button
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            ▶
          </button>
        </div>
      </div>
      <div className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-yellow-600 scrollbar-track-black/30">
        {current.map((char) => (
          <div
            key={char.id}
            className="bg-black/50 border border-yellow-600/20 rounded-xl p-3 hover:border-yellow-600 hover:translate-x-1 transition cursor-grab"
            draggable={!isLocked}
            onDragStart={(e) => onStaffDragStart(e, char.id)}
            onMouseEnter={onMouseEnter(char.id)}
            onMouseMove={onMouseMove(char.id)}
            onMouseLeave={onMouseLeave}
          >
            <div className="flex items-center gap-3 mb-2">
              <Avatar
                size={40}
                name={char.id}
                variant="beam"
                colors={["#d4af37", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981"]}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{char.name}</div>
                <div className="text-xs text-yellow-600">{char.role}</div>
                {assignments[char.id] && (
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-600/20 text-yellow-300 border border-yellow-600/50">
                    Assigné à {gens[assignments[char.id] as GeneratorKey].name}
                  </div>
                )}
                {equipped[char.id] && (
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 border border-red-600/50">
                    Armé
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {["🎭", "💪", "🧠", "🤝"].map((icon, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span>{icon}</span>
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-yellow-600 to-yellow-300 rounded-full transition-all"
                      style={{ width: `${char.stats[i]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeneratorCard({
  g,
  cash,
  cost1,
  cost10,
  onBuyOne,
  onBuyTen,
  onBuyMax,
  prodPerUnit,
  revenuePerSec,
  progress,
  maxRevenue,
  assigned,
  staffBonusPct,
  onDropStaff,
  onDragOver,
}: {
  g: Generator;
  cash: number;
  cost1: number;
  cost10: number;
  onBuyOne: () => void;
  onBuyTen: () => void;
  onBuyMax: () => void;
  prodPerUnit: number;
  revenuePerSec: number;
  progress: number;
  maxRevenue: number;
  assigned: StaffMember[];
  staffBonusPct: number;
  onDropStaff: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}) {
  const affordable = cash >= cost1;

  return (
    <div
      className="bg-linear-to-br from-black/80 to-zinc-900/80 border-2 border-yellow-600/20 rounded-xl p-4 hover:border-yellow-600 hover:translate-y-[-3px] hover:shadow-[0_10px_25px_rgba(212,175,55,0.3)] transition"
      onDrop={onDropStaff}
      onDragOver={onDragOver}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{g.icon}</span>
          <div>
            <div className="font-bold">{g.name}</div>
            <div className="text-xs text-zinc-400">Possédé: {g.owned}</div>
          </div>
        </div>
        <span
          className={`text-[10px] px-2 py-1 rounded-full font-bold border ${
            g.legal
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
              : "bg-red-500/20 text-red-400 border-red-500"
          }`}
        >
          {g.legal ? "LÉGAL" : "ILLÉGAL"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div>
          <span className="text-zinc-400">Prod/u:</span>
          <span className="text-yellow-600 font-bold ml-1">
            ${formatNumber(prodPerUnit)}/s
          </span>
        </div>
        <div>
          <span className="text-zinc-400">Revenus:</span>
          <span className="text-yellow-600 font-bold ml-1">
            ${formatNumber(revenuePerSec)}/s
          </span>
        </div>
        <div>
          <span className="text-zinc-400">Bonus personnel:</span>
          <span className="text-emerald-400 font-bold ml-1">
            +{Math.max(0, staffBonusPct)}%
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-yellow-600 via-yellow-300 to-yellow-600 rounded-full transition-all shadow-[0_0_10px_rgba(212,175,55,0.5)]"
            style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-zinc-400 mt-1">
          <span>Cycle en cours</span>
          <span>
            {revenuePerSec > 0 && maxRevenue > 0
              ? `${(TOP_FILL_TIME * (maxRevenue / revenuePerSec)).toFixed(1)}s`
              : "∞"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onBuyOne}
          disabled={!affordable}
          className={`px-2 py-2 rounded-lg text-xs font-bold transition ${
            affordable
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "bg-zinc-800 opacity-50 cursor-not-allowed"
          }`}
        >
          +1
          <br />${formatNumber(cost1)}
        </button>
        <button
          onClick={onBuyTen}
          disabled={cash < cost10}
          className={`px-2 py-2 rounded-lg text-xs font-bold transition ${
            cash >= cost10
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "bg-zinc-800 opacity-50 cursor-not-allowed"
          }`}
        >
          +10
          <br />${formatNumber(cost10)}
        </button>
        <button
          onClick={onBuyMax}
          className="px-2 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold transition"
        >
          MAX
        </button>
      </div>

      {assigned.length > 0 && (
        <div className="mt-3 border-t border-yellow-600/20 pt-2">
          <div className="text-[11px] text-zinc-400 mb-1">
            Personnel affecté
          </div>
          <div className="flex -space-x-2">
            {assigned.map((s) => (
              <div key={s.id} title={s.name} className="inline-block">
                <Avatar name={s.id} size={26} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionCard({
  icon,
  title,
  desc,
  buttonText,
  onClick,
  disabled = false,
  danger = false,
}: {
  icon: string;
  title: string;
  desc: string | React.ReactNode;
  buttonText: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="bg-black/50 border border-yellow-600/30 rounded-xl p-4 hover:border-yellow-600 hover:bg-black/70 transition">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <div className="text-sm font-bold text-yellow-600">{title}</div>
      </div>
      <div className="text-xs text-zinc-400 mb-3">{desc}</div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full px-3 py-2 rounded-lg font-bold transition ${
          danger
            ? "bg-linear-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700"
            : "bg-linear-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {buttonText}
      </button>
    </div>
  );
}

// RelationBar removed

// Modal moved to src/Modal.tsx

// ----------------------------
// Random Events System
// ----------------------------
// --------- Omertà Investments ---------
type Investment = {
  id: string;
  label: string;
  desc: string;
  points: number;
};

const INVESTMENTS: Investment[] = [
  {
    id: "inv_income_1",
    label: "+5% revenus globaux",
    desc: "Augmente vos revenus de toutes filières.",
    points: 1,
  },
  {
    id: "inv_income_2",
    label: "+10% revenus globaux",
    desc: "Cumulable avec le précédent.",
    points: 3,
  },
  {
    id: "inv_heat_1",
    label: "-0.03 chaleur/s",
    desc: "Mitigation passive permanente.",
    points: 1,
  },
  {
    id: "inv_heat_2",
    label: "-0.05 chaleur/s",
    desc: "Mitigation additionnelle.",
    points: 2,
  },
  {
    id: "inv_cost_1",
    label: "-3% coûts",
    desc: "Réduction du coût d'achat des générateurs.",
    points: 1,
  },
  {
    id: "inv_cost_2",
    label: "-5% coûts",
    desc: "Réduction additionnelle des coûts.",
    points: 2,
  },
];

function applyInvestment(prev: SaveState, id: string): SaveState {
  if ((prev.investmentsPurchased || {})[id]) return prev;
  const inv = INVESTMENTS.find((i) => i.id === id);
  if (!inv) return prev;
  if ((prev.prestigePoints || 0) < inv.points) return prev;
  const next: SaveState = { ...prev };
  next.prestigePoints = (next.prestigePoints || 0) - inv.points;
  next.investmentsPurchased = {
    ...(next.investmentsPurchased || {}),
    [id]: true,
  };
  switch (id) {
    case "inv_income_1":
      next.permaGlobalMult = (next.permaGlobalMult || 1) * 1.05;
      break;
    case "inv_income_2":
      next.permaGlobalMult = (next.permaGlobalMult || 1) * 1.1;
      break;
    case "inv_heat_1":
      next.heatMitigationPerSec = (next.heatMitigationPerSec || 0) + 0.03;
      break;
    case "inv_heat_2":
      next.heatMitigationPerSec = (next.heatMitigationPerSec || 0) + 0.05;
      break;
    case "inv_cost_1":
      next.costDiscount = clamp((next.costDiscount || 0) + 0.03, 0, 0.5);
      break;
    case "inv_cost_2":
      next.costDiscount = clamp((next.costDiscount || 0) + 0.05, 0, 0.5);
      break;
  }
  return next;
}

function InvestmentsPanel({
  points,
  purchased,
  onBuy,
}: {
  points: number;
  purchased: Record<string, boolean>;
  onBuy: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-zinc-300">
        Points disponibles:{" "}
        <span className="text-yellow-500 font-bold">{points}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {INVESTMENTS.map((it) => {
          const owned = !!purchased[it.id];
          const can = points >= it.points && !owned;
          return (
            <div
              key={it.id}
              className="bg-black/50 border border-yellow-600/30 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-yellow-600">{it.label}</div>
                <div className="text-xs text-zinc-400">{it.desc}</div>
              </div>
              {owned ? (
                <span className="text-emerald-400 text-sm font-bold">
                  ✓ Acheté
                </span>
              ) : (
                <button
                  className={`px-3 py-2 rounded-lg text-sm ${
                    can
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-zinc-800 opacity-50"
                  }`}
                  disabled={!can}
                  onClick={() => onBuy(it.id)}
                >
                  {it.points} pts
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-[11px] text-zinc-400">
        Ces investissements sont permanents et s'appliquent à toutes les parties
        via l'Omertà.
      </div>
    </div>
  );
}
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

// ----------------------------
// Case Opening Modal
// ----------------------------
function CaseOpeningModal({
  pool,
  targetIndex,
  result,
  onFinished,
  onCancel,
  familyNames,
  audio,
  canOpenAnother,
  onOpenAnother,
}: {
  pool: Rarity[];
  targetIndex: number;
  result: Rarity;
  onFinished: (member: StaffMember) => void;
  onCancel: (refund: boolean) => void;
  familyNames: string[];
  audio?: ReturnType<typeof useAudioEngine>;
  canOpenAnother?: boolean;
  onOpenAnother?: () => void;
}) {
  const containerWidth = 600; // px
  const itemWidth = 120; // px
  const [offset, setOffset] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [reward, setReward] = useState<null | StaffMember>(null);
  const reelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Start animation on mount
    const start = setTimeout(() => {
      const center = containerWidth / 2 - itemWidth / 2;
      const final = -(targetIndex * itemWidth - center);
      setOffset(final);
      setStarted(true);
    }, 50);
    return () => clearTimeout(start);
  }, [targetIndex]);

  // Rank mapping and stat model
  type Rank = "Petite frappe" | "Soldat" | "Associé" | "Capieri";
  const pickRoleForRarity = React.useCallback((r: Rarity): Rank => {
    const roll = Math.random() * 100;
    if (r === "legendary") return roll < 70 ? "Capieri" : "Associé";
    if (r === "epic")
      return roll < 30 ? "Capieri" : roll < 80 ? "Associé" : "Soldat";
    if (r === "rare")
      return roll < 10
        ? "Capieri"
        : roll < 45
        ? "Associé"
        : roll < 85
        ? "Soldat"
        : "Petite frappe";
    if (r === "uncommon")
      return roll < 15 ? "Associé" : roll < 60 ? "Soldat" : "Petite frappe";
    return roll < 5 ? "Soldat" : "Petite frappe";
  }, []);
  const rankBase = React.useMemo<Record<Rank, number>>(
    () => ({ "Petite frappe": 35, Soldat: 50, Associé: 60, Capieri: 70 }),
    []
  );
  const rarityBonus = React.useMemo<Record<Rarity, number>>(
    () => ({ common: 0, uncommon: 4, rare: 9, epic: 16, legendary: 25 }),
    []
  );
  const raritySpread = React.useMemo<Record<Rarity, number>>(
    () => ({ common: 10, uncommon: 12, rare: 15, epic: 20, legendary: 25 }),
    []
  );

  // Finalize helper used both for transitionend and "skip"
  const finalizeDrop = React.useCallback(() => {
    if (done) return;
    setDone(true);
    // Build member based on rarity result and rank
    const id = generateItemId("staff");
    const name = generateMafiaFullName();
    const rank = pickRoleForRarity(result);
    const base = rankBase[rank] + rarityBonus[result];
    const spread = raritySpread[result];
    const rnd = () =>
      Math.max(25, Math.min(100, Math.round(base + Math.random() * spread)));
    const family =
      familyNames.length > 0
        ? familyNames[Math.floor(Math.random() * familyNames.length)]
        : "Famiglia d'Oro";
    const member: StaffMember = {
      id,
      name,
      role: rank,
      family,
      stats: [rnd(), rnd(), rnd(), rnd()],
    };
    setReward(member);
    try {
      // stop reel audio and play win tone
      if (audio) {
        audio.stopReelSound();
        audio.playDropWin(result);
      }
    } catch (e) {
      console.warn("audio finalize error", e);
    }
    // confetti tuned by rarity
    try {
      const colors = ["#ffd700", "#f97316", "#ef4444", "#8b5cf6", "#10b981"];
      const small = {
        particleCount: 30,
        spread: 60,
        startVelocity: 35,
        colors,
      };
      const big = { particleCount: 120, spread: 90, startVelocity: 45, colors };
      if (result === "legendary") {
        confetti(big);
        setTimeout(() => confetti(small), 180);
      } else if (result === "epic") {
        confetti({ particleCount: 80, spread: 80, colors });
      } else if (result === "rare") {
        confetti({ particleCount: 50, spread: 70, colors });
      } else {
        confetti(small);
      }
    } catch (e) {
      // if confetti lib fails, ignore gracefully
      console.warn("confetti failed", e);
    }

    onFinished(member);
  }, [
    done,
    familyNames,
    onFinished,
    pickRoleForRarity,
    rankBase,
    rarityBonus,
    raritySpread,
    result,
    audio,
  ]);

  useEffect(() => {
    if (!started) return;
    const node = reelRef.current;
    let timer: number | null = null;
    if (node)
      node.addEventListener("transitionend", finalizeDrop, { once: true });
    // Fallback timer (dev/slow devices)
    timer = window.setTimeout(finalizeDrop, 4600);
    return () => {
      if (node) node.removeEventListener("transitionend", finalizeDrop);
      if (timer) window.clearTimeout(timer);
    };
  }, [started, finalizeDrop]);

  // Start/stop reel audio
  useEffect(() => {
    if (started) {
      try {
        audio?.startReelSound();
      } catch (e) {
        console.warn("startReelSound error", e);
      }
    }
    return () => {
      try {
        audio?.stopReelSound();
      } catch (e) {
        console.warn("stopReelSound error", e);
      }
    };
  }, [started, audio]);

  const colorFor = (r: Rarity) =>
    r === "legendary"
      ? "from-yellow-500 to-amber-300"
      : r === "epic"
      ? "from-purple-600 to-fuchsia-400"
      : r === "rare"
      ? "from-sky-600 to-cyan-400"
      : r === "uncommon"
      ? "from-emerald-600 to-emerald-400"
      : "from-zinc-600 to-zinc-400";

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-3xl mx-4 p-6 rounded-2xl border-2 border-yellow-600 bg-linear-to-br from-zinc-900 to-zinc-800 shadow-2xl overflow-hidden">
        {/* Close button (always enabled) */}
        <button
          className="absolute top-3 right-3 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-sm"
          onClick={() => onCancel(false)}
        >
          ✕
        </button>
        <div className="text-center text-yellow-500 font-bold mb-3">
          Ouverture de contrat
        </div>
        <div
          className="relative mx-auto"
          style={{ width: `${containerWidth}px` }}
        >
          {/* Marker */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-0.5 bg-yellow-500 z-10" />
          {/* Reel */}
          <div
            className="relative whitespace-nowrap will-change-transform"
            ref={reelRef}
            style={{
              transform: `translateX(${offset}px)`,
              transition: started
                ? "transform 4.2s cubic-bezier(0.1, 0.9, 0.1, 1)"
                : undefined,
            }}
          >
            {pool.map((r, i) => (
              <div
                key={i}
                className="inline-block px-2"
                style={{ width: `${itemWidth}px` }}
              >
                <div
                  className={`h-24 rounded-xl border p-2 text-center text-xs text-white bg-linear-to-br ${colorFor(
                    r
                  )} border-white/20 shadow-inner flex items-center justify-center`}
                >
                  {r.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual effects on finish */}
        {started && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-24 bg-linear-to-b from-transparent via-yellow-500/10 to-transparent" />
          </div>
        )}

        {/* Reward card replaces reel once done */}
        {done && reward && (
          <div className="mt-6 p-4 rounded-xl border border-yellow-600/40 bg-black/40">
            <div className="text-yellow-500 font-bold mb-2">Nouveau membre</div>
            <div className="flex items-center gap-3">
              <Avatar size={48} name={reward.id} />
              <div>
                <div className="font-semibold">{reward.name}</div>
                <div className="text-xs text-zinc-400">
                  {reward.role} • {reward.family}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] mt-3">
              {[
                ["🎭 Charisme", 0],
                ["💪 Force", 1],
                ["🧠 Esprit", 2],
                ["🤝 Réseau", 3],
              ].map(([label, idx]) => (
                <div key={label as string}>
                  <div className="flex justify-between">
                    <span>{label as string}</span>
                    <span>{reward.stats[idx as number]}</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-1 bg-linear-to-r from-yellow-600 to-yellow-300"
                      style={{ width: `${reward.stats[idx as number]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-center gap-3">
          {!done && started && (
            <button
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-black"
              onClick={() => {
                // Skip the animation and finalize immediately
                finalizeDrop();
              }}
            >
              Passer l'animation
            </button>
          )}
          {done && reward && canOpenAnother && (
            <button
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg"
              onClick={() => {
                if (onOpenAnother) onOpenAnother();
              }}
            >
              Ouvrir une autre caisse
            </button>
          )}
          <button
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
            onClick={() => onCancel(false)}
            disabled={!done}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
