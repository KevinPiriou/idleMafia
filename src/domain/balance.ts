// Centralised gameplay balance parameters and helpers

// Generic helpers
export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

// UI/progression
export const TOP_FILL_TIME = 1.5; // seconds for fastest generator cycle bar

// Leveling
export const LEVEL_BASE_XP = 100;
export const LEVEL_GROWTH = 1.25;
export const TIME_XP_RATE = 0.05; // xp per second baseline
export const XP_PER_CASH_PER_SEC = 0.01; // xp per $/s produced
export const XP_PER_DOLLAR_SPENT = 0.0001; // xp per $ spent on generators
export const XP_PER_UPGRADE_DOLLAR = 0.0002; // xp per $ spent on upgrades
export const XP_PER_INFLUENCE_DOLLAR = 0.0002; // xp per $ spent on influence

// Future: move more constants here (war chances, cooldowns, tensions, durations)
