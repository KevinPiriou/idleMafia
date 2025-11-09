import React from "react";
import type { Generator, GeneratorKey, StaffMember } from "../../domain/types";
import { formatNumber } from "../../domain/format";
import { TOP_FILL_TIME } from "../../domain/balance";
import { Avatar } from "../../components/ui/Avatar";

interface GeneratorCardProps {
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
}

export function GeneratorCard({
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
}: GeneratorCardProps) {
  const affordable = cash >= cost1;

  return (
    <div
      className="bg-linear-to-br from-black/80 to-zinc-900/80 border-2 border-yellow-600/20 rounded-xl p-4 hover:border-yellow-600 hover:translate-y-[-3px] hover:shadow-[0_10px_25px_rgba(212,175,55,0.3)] transition"
      onDrop={onDropStaff}
      onDragOver={onDragOver}
      data-generator={g.key}
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
