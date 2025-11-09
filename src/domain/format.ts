export function formatNumber(n: number) {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} k`;
  return Math.floor(n).toLocaleString();
}

// Variante UI alignée sur MafiaIdleGame.tsx (espaces + 2 décimales + gestion de ∞)
export function formatNumberUI(n: number): string {
  if (!isFinite(n)) return "∞";
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + " T";
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + " B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + " M";
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + " k";
  return n.toFixed(2);
}
