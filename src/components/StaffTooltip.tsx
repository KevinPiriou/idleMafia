import type { StaffMember, Generator } from "../domain/types";
import { Avatar } from "./ui/Avatar";
import { staffBonusFor } from "../domain/economy";

type StaffTooltipProps = {
  staffMember: StaffMember;
  assignedGen?: Generator;
  x: number;
  y: number;
};

export function StaffTooltip({
  staffMember,
  assignedGen,
  x,
  y,
}: StaffTooltipProps) {
  const force = staffMember.stats[1];
  const esprit = staffMember.stats[2];
  const reseau = staffMember.stats[3];
  const legalPct = Math.round(
    ((esprit / 100) * 0.1 + (reseau / 100) * 0.05) * 100
  );
  const illegalPct = Math.round(
    ((force / 100) * 0.15 + (reseau / 100) * 0.05) * 100
  );
  const currentPct = assignedGen
    ? Math.round((staffBonusFor(staffMember, assignedGen) - 1) * 100)
    : null;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{ left: x + 16, top: y + 16 }}
    >
      <div className="rounded-xl border border-yellow-600/60 bg-black/85 backdrop-blur-sm p-3 shadow-2xl min-w-60">
        <div className="flex items-center gap-2 mb-2">
          <Avatar size={28} name={staffMember.id} />
          <div className="text-sm font-semibold truncate">
            {staffMember.name}
          </div>
        </div>
        <div className="text-[11px] text-zinc-300 mb-2">
          <span className="px-1.5 py-0.5 rounded border border-zinc-700 mr-2">
            {staffMember.role}
          </span>
          <span className="px-1.5 py-0.5 rounded border border-zinc-700">
            {staffMember.family}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {[
            {
              label: "🎭 Charisme",
              v: staffMember.stats[0],
              color: "from-yellow-600 to-yellow-300",
            },
            {
              label: "💪 Force",
              v: staffMember.stats[1],
              color: "from-red-600 to-red-400",
            },
            {
              label: "🧠 Esprit",
              v: staffMember.stats[2],
              color: "from-sky-600 to-sky-400",
            },
            {
              label: "🤝 Réseau",
              v: staffMember.stats[3],
              color: "from-emerald-600 to-emerald-400",
            },
          ].map((s, i) => (
            <div key={i}>
              <div className="flex justify-between">
                <span>{s.label}</span>
                <span>{s.v}</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-linear-to-r ${s.color}`}
                  style={{ width: `${s.v}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-[11px] text-zinc-300 grid grid-cols-2 gap-2">
          <div>Bonus légal potentiel</div>
          <div className="text-right text-emerald-400 font-semibold">
            +{legalPct}%
          </div>
          <div>Bonus illégal potentiel</div>
          <div className="text-right text-emerald-400 font-semibold">
            +{illegalPct}%
          </div>
          {assignedGen && (
            <>
              <div>Affecté à</div>
              <div className="text-right">
                {assignedGen.icon} {assignedGen.name}
              </div>
              <div>Bonus actuel</div>
              <div className="text-right text-yellow-400 font-semibold">
                +{currentPct}%
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
