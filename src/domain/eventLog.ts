import type { SaveState } from "./types";
import { appendEvent } from "./journal";

/**
 * Enregistre l'application d'un événement avec ses impacts dans le journal
 * Améliore le feedback utilisateur sur les conséquences de chaque choix
 */
export function logEventChoice(
  _state: SaveState,
  _eventId: string,
  eventTitle: string,
  choiceLabel: string,
  before: SaveState,
  after: SaveState
): SaveState {
  // Calcule les différences
  const cashDelta = after.cash - before.cash;
  const respectDelta = after.respect - before.respect;
  const heatDelta = after.heat - before.heat;
  const tensionDelta = (after.tension || 0) - (before.tension || 0);

  // Construit les tags basé sur les impacts
  const tags: string[] = [];
  if (cashDelta > 0) tags.push("cash-gain");
  if (cashDelta < 0) tags.push("cash-loss");
  if (respectDelta > 0) tags.push("respect-gain");
  if (respectDelta < 0) tags.push("respect-loss");
  if (heatDelta > 0) tags.push("heat-gain");
  if (heatDelta < 0) tags.push("heat-loss");
  if (tensionDelta > 0) tags.push("tension-gain");
  if (tensionDelta < 0) tags.push("tension-loss");

  // Vérifie les buffs temporaires
  const buffAdded = after.tempGlobalBuffUntil && !before.tempGlobalBuffUntil;
  const buffExtended =
    after.tempGlobalBuffUntil &&
    before.tempGlobalBuffUntil &&
    after.tempGlobalBuffUntil > before.tempGlobalBuffUntil;
  if (buffAdded) tags.push("buff-activated");
  if (buffExtended) tags.push("buff-extended");

  // Vérifie les multiplicateurs permanents
  const multChangePercent =
    ((after.permaGlobalMult ?? 1) - (before.permaGlobalMult ?? 1)) /
    (before.permaGlobalMult ?? 1);
  if (multChangePercent > 0.001) tags.push("multiplier-boost");
  if (multChangePercent < -0.001) tags.push("multiplier-loss");

  // Construit les détails
  const details: string[] = [];

  if (cashDelta !== 0) {
    details.push(
      `Trésor: ${cashDelta > 0 ? "+" : ""}$${Math.abs(
        cashDelta
      ).toLocaleString()}`
    );
  }

  if (respectDelta !== 0) {
    details.push(
      `Respect: ${respectDelta > 0 ? "+" : ""}${respectDelta} (👑 ${Math.round(
        after.respect
      )}/1000)`
    );
  }

  if (heatDelta !== 0) {
    details.push(
      `Chaleur: ${heatDelta > 0 ? "+" : ""}${heatDelta} (🔥 ${Math.round(
        after.heat
      )}/100)`
    );
  }

  if (tensionDelta !== 0) {
    details.push(
      `Tension police: ${
        tensionDelta > 0 ? "+" : ""
      }${tensionDelta} (⚡ ${Math.round(after.tension || 0)}/100)`
    );
  }

  if (buffAdded) {
    const remainMs = (after.tempGlobalBuffUntil ?? 0) - Date.now();
    const hours = Math.floor(remainMs / 3600000);
    const minutes = Math.floor((remainMs % 3600000) / 60000);
    details.push(
      `🚀 Buff temporaire activé (+50% revenus pendant ${hours}h ${minutes}m)`
    );
  }

  if (multChangePercent > 0.001) {
    details.push(
      `📈 Multiplicateur permanent: +${(multChangePercent * 100).toFixed(
        1
      )}% (${(after.permaGlobalMult ?? 1).toFixed(3)}x)`
    );
  }

  return appendEvent(after, {
    kind: "event",
    title: eventTitle,
    summary: choiceLabel,
    details: details.length > 0 ? details : undefined,
    deltas: {
      cash: cashDelta !== 0 ? cashDelta : undefined,
      respect: respectDelta !== 0 ? respectDelta : undefined,
      heat: heatDelta !== 0 ? heatDelta : undefined,
      tension: tensionDelta !== 0 ? tensionDelta : undefined,
    },
    tags: tags.length > 0 ? tags : undefined,
  });
}
