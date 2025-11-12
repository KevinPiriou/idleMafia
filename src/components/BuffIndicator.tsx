import { useEffect, useState } from "react";
import type { SaveState } from "../domain/types";

export type BuffIndicatorProps = {
  state: SaveState;
};

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

export function BuffIndicator({ state }: BuffIndicatorProps) {
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!state.tempGlobalBuffUntil || Date.now() >= state.tempGlobalBuffUntil) {
      setTimeRemaining(null);
      setIsActive(false);
      return;
    }

    setIsActive(true);

    const updateTimer = () => {
      const remainMs = Math.max(0, state.tempGlobalBuffUntil! - Date.now());
      if (remainMs <= 0) {
        setTimeRemaining(null);
        setIsActive(false);
      } else {
        setTimeRemaining(formatTimeRemaining(remainMs));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250);

    return () => clearInterval(interval);
  }, [state.tempGlobalBuffUntil]);

  if (!isActive || !timeRemaining) {
    return null;
  }

  return (
    <div
      className="inline-flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-bold
                   border-2 border-yellow-400 bg-linear-to-r from-yellow-600/40 to-yellow-500/20 
                   text-yellow-100 shadow-[0_0_20px_rgba(250,204,21,0.4)] animate-pulse"
      title="Bonus temporaire actif: +50% à tous les revenus"
    >
      <span className="text-lg">✨</span>
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wider text-yellow-300">
          Buff actif
        </span>
        <span className="text-sm">+50% revenus</span>
      </div>
      <span className="text-yellow-200 font-mono text-xs ml-2 bg-black/40 px-2 py-1 rounded">
        {timeRemaining}
      </span>
    </div>
  );
}
