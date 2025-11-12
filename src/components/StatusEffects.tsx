import { useEffect, useState } from "react";
import type { SaveState } from "../domain/types";

export type StatusEffectsProps = {
  state: SaveState;
};

interface StatusEffect {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  description?: string;
  timeRemaining?: string;
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Expiré";
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
  } else {
    return `${secs}s`;
  }
}

export function StatusEffects({ state }: StatusEffectsProps) {
  const [effects, setEffects] = useState<StatusEffect[]>([]);

  useEffect(() => {
    const calculateEffects = () => {
      const newEffects: StatusEffect[] = [];

      // Buff temporaire global
      if (state.tempGlobalBuffUntil && Date.now() < state.tempGlobalBuffUntil) {
        const remainMs = state.tempGlobalBuffUntil - Date.now();
        newEffects.push({
          icon: "✨",
          label: "Opération Avantageuse",
          value: "+50%",
          color: "yellow",
          description: "Tous les revenus augmentés",
          timeRemaining: formatTimeRemaining(remainMs),
        });
      }

      // Tension haute
      if (state.tension && state.tension > 70) {
        newEffects.push({
          icon: "⚡",
          label: "Tension Extrême",
          value: `${Math.round(state.tension)}%`,
          color: "red",
          description: "Les familles rivales s'agitent",
        });
      }

      // Chaleur haute
      if (state.heat > 70) {
        newEffects.push({
          icon: "🔥",
          label: "Chaleur Critique",
          value: `${Math.round(state.heat)}%`,
          color: "orange",
          description: "Les autorités se rapprochent",
        });
      }

      // Multiplicateur permanent
      if (state.permaGlobalMult && state.permaGlobalMult > 1) {
        const bonus = Math.round((state.permaGlobalMult - 1) * 100);
        newEffects.push({
          icon: "📈",
          label: "Multiplicateur Permanent",
          value: `+${bonus}%`,
          color: "green",
          description: `Revenus de base: ${state.permaGlobalMult.toFixed(2)}x`,
        });
      }

      // Partenariats actifs
      const partnerships = state.families.filter(
        (f) => f.state === "partnership"
      ).length;
      if (partnerships > 0) {
        newEffects.push({
          icon: "🤝",
          label: "Partenariats",
          value: partnerships,
          color: "indigo",
          description: `${partnerships} famille(s) alliée(s)`,
        });
      }

      // Guerres actives
      const wars = state.families.filter((f) => f.state === "war").length;
      if (wars > 0) {
        newEffects.push({
          icon: "⚔️",
          label: "Guerres Actives",
          value: wars,
          color: "red",
          description: `${wars} conflit(s) en cours`,
        });
      }

      setEffects(newEffects);
    };

    calculateEffects();
    const interval = setInterval(calculateEffects, 250);

    return () => clearInterval(interval);
  }, [state]);

  if (effects.length === 0) {
    return null;
  }

  const colorClasses = {
    yellow: "border-yellow-500 bg-yellow-500/10 text-yellow-100",
    red: "border-red-500 bg-red-500/10 text-red-100",
    orange: "border-orange-500 bg-orange-500/10 text-orange-100",
    green: "border-emerald-500 bg-emerald-500/10 text-emerald-100",
    indigo: "border-indigo-500 bg-indigo-500/10 text-indigo-100",
  };

  return (
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {effects.map((effect, idx) => {
        const colorClass =
          colorClasses[effect.color as keyof typeof colorClasses] ||
          colorClasses.yellow;
        return (
          <div
            key={idx}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs ${colorClass} 
                         hover:shadow-lg transition group cursor-help`}
            title={effect.description}
          >
            <span className="text-lg">{effect.icon}</span>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs uppercase truncate">
                {effect.label}
              </span>
              <span className="text-xs font-mono">
                {effect.value}
                {effect.timeRemaining && (
                  <span className="ml-1 opacity-75">
                    ({effect.timeRemaining})
                  </span>
                )}
              </span>
            </div>

            {/* Tooltip */}
            {effect.description && (
              <div
                className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block
                             bg-black/95 border border-yellow-500/70 rounded-lg px-3 py-2 text-xs 
                             text-yellow-100 max-w-xs z-50 pointer-events-none shadow-lg"
              >
                {effect.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
