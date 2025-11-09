import React from "react";
import type { Family, SaveState } from "../domain/types";
import { formatNumberUI } from "../domain/format";
import { computeCompositePower, computeFamilyScore } from "../domain/power";

interface FamiliesIntelProps {
  families: Family[];
  playerState: SaveState;
}

const FamiliesIntel: React.FC<FamiliesIntelProps> = ({
  families,
  playerState,
}) => {
  const playerScore = computeCompositePower(playerState);
  const list = families.map((f) => {
    const e = f.econ || {
      cash: 0,
      respect: 0,
      members: 0,
      weapons: 0,
      vehicles: 0,
      tier: "normal",
    };
    const score = computeFamilyScore(f);
    const ratio = playerScore > 0 ? score / playerScore : 1;
    const stars = Math.max(1, Math.min(5, Math.round(ratio * 3)));
    return { f, e, stars };
  });

  return (
    <div className="space-y-3">
      {list.map(({ f, e, stars }) => (
        <div
          key={f.id}
          className="bg-black/50 border border-yellow-600/20 rounded-xl p-3 flex items-center justify-between"
        >
          <div>
            <div className="font-semibold text-yellow-600">{f.name}</div>
            <div className="text-xs text-zinc-300 flex gap-3 mt-1">
              <span>💰 {formatNumberUI(e.cash)}</span>
              <span>🤝 {formatNumberUI(e.respect)}</span>
              <span>👥 {Math.floor(e.members)}</span>
              <span>🔫 {e.weapons}</span>
              <span>🚗 {e.vehicles}</span>
              {e.tier === "bankrupt" && (
                <span className="text-red-400">(Bankrupt)</span>
              )}
              {e.tier === "boss" && (
                <span className="text-yellow-400">(Boss)</span>
              )}
            </div>
          </div>
          <div className="text-yellow-400">{"⭐".repeat(stars)}</div>
        </div>
      ))}
    </div>
  );
};

export default FamiliesIntel;
