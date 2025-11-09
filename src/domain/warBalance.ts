/**
 * Coefficients d'équilibrage des guerres.
 * Valeurs copiées du bloc interne de MafiaIdleGame.tsx.
 */
export const WAR_CONFIG = {
  CASH_GAIN_RATIO: 0.05,
  RESPECT_GAIN_RATIO: 0.02,
  CASH_LOSS_RATIO: 0.03,
  RESPECT_LOSS_RATIO: 0.015,
};

/**
 * Calcule le résultat d'une guerre entre deux puissances données.
 * Reproduit les formules internes actuelles (diff / abs / ratios).
 */
export function computeWarOutcome(
  powerA: number,
  powerB: number
): {
  gainCash: number;
  gainRespect: number;
  lossCash: number;
  lossRespect: number;
} {
  const diff = Math.abs(powerA - powerB);
  const base = Math.max(powerA, powerB);
  const ratio = diff / (base + 1e-6);

  return {
    gainCash: base * WAR_CONFIG.CASH_GAIN_RATIO * ratio,
    gainRespect: base * WAR_CONFIG.RESPECT_GAIN_RATIO * ratio,
    lossCash: base * WAR_CONFIG.CASH_LOSS_RATIO * ratio,
    lossRespect: base * WAR_CONFIG.RESPECT_LOSS_RATIO * ratio,
  };
}
