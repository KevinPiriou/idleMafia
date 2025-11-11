import { useState } from "react";
import type { RandomEventDef, SaveState } from "../domain/types";

export default function EventModal({
  onClose,
  onApply,
  onLog,
  event,
}: {
  onClose: () => void;
  onApply: (apply: (s: SaveState) => SaveState) => {
    cash: number;
    respect: number;
    heat: number;
  };
  onLog?: (e: {
    title: string;
    choice: string;
    desc: string;
    deltas: { cash?: number; respect?: number; heat?: number };
    eventId: string;
  }) => void;
  event: RandomEventDef;
}) {
  const [flash, setFlash] = useState<"success" | "fail" | null>(null);
  const [delta, setDelta] = useState<null | {
    cash: number;
    respect: number;
    heat: number;
  }>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-lg mx-4 bg-linear-to-br from-violet-800/90 to-purple-900/90 border-2 border-violet-400 rounded-2xl p-6 shadow-2xl">
        <div className="text-2xl font-bold mb-2 text-white">{event.title}</div>
        <div className="text-sm mb-4 text-violet-100">{event.desc}</div>
        <div className="flex flex-col gap-2">
          {event.choices.map((c, i) => (
            <div key={i} className="flex flex-col gap-1">
              <button
                onClick={() => {
                  const d = onApply(c.apply);
                  onLog?.({
                    title: event.title,
                    desc: event.desc,
                    choice: c.label,
                    deltas: d,
                    eventId: event.id,
                  });
                  setDelta(d);
                  const good =
                    (d.cash ?? 0) + (d.respect ?? 0) - Math.abs(d.heat ?? 0) >
                    0;
                  setFlash(good ? "success" : "fail");
                  setTimeout(() => onClose(), 1200);
                }}
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
