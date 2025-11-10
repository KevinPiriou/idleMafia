import React, { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import type { Rarity, StaffMember } from "../domain/types";
import { useAudioEngine } from "../hooks/useAudioEngine";
import { generateMafiaFullName } from "../utils/nameGenerator";
import { generateItemId } from "../domain/item";
import { Avatar } from "./ui/Avatar";

export function CaseOpeningModal({
  pool,
  targetIndex,
  result,
  onFinished,
  onCancel,
  familyNames,
  audio,
  canOpenAnother,
  onOpenAnother,
  existingStaffNames,
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
  existingStaffNames: string[];
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
    const names = new Set(existingStaffNames);
    const name = generateMafiaFullName(names);
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
    existingStaffNames,
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
