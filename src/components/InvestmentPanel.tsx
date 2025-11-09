type Investment = {
  id: string;
  label: string;
  desc: string;
  points: number;
};

const INVESTMENTS: Investment[] = [
  {
    id: "inv_income_1",
    label: "+5% revenus globaux",
    desc: "Augmente vos revenus de toutes filières.",
    points: 1,
  },
  {
    id: "inv_income_2",
    label: "+10% revenus globaux",
    desc: "Cumulable avec le précédent.",
    points: 3,
  },
  {
    id: "inv_heat_1",
    label: "-0.03 chaleur/s",
    desc: "Mitigation passive permanente.",
    points: 1,
  },
  {
    id: "inv_heat_2",
    label: "-0.05 chaleur/s",
    desc: "Mitigation additionnelle.",
    points: 2,
  },
  {
    id: "inv_cost_1",
    label: "-3% coûts",
    desc: "Réduction du coût d'achat des générateurs.",
    points: 1,
  },
  {
    id: "inv_cost_2",
    label: "-5% coûts",
    desc: "Réduction additionnelle des coûts.",
    points: 2,
  },
];

interface InvestmentsPanelProps {
  points: number;
  purchased: Record<string, boolean>;
  onBuy: (id: string) => void;
}

export function InvestmentsPanel({
  points,
  purchased,
  onBuy,
}: InvestmentsPanelProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-zinc-300">
        Points disponibles:{" "}
        <span className="text-yellow-500 font-bold">{points}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {INVESTMENTS.map((it) => {
          const owned = !!purchased[it.id];
          const can = points >= it.points && !owned;
          return (
            <div
              key={it.id}
              className="bg-black/50 border border-yellow-600/30 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-yellow-600">{it.label}</div>
                <div className="text-xs text-zinc-400">{it.desc}</div>
              </div>
              {owned ? (
                <span className="text-emerald-400 text-sm font-bold">
                  ✓ Acheté
                </span>
              ) : (
                <button
                  className={`px-3 py-2 rounded-lg text-sm ${
                    can
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-zinc-800 opacity-50"
                  }`}
                  disabled={!can}
                  onClick={() => onBuy(it.id)}
                >
                  {it.points} pts
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-[11px] text-zinc-400">
        Ces investissements sont permanents et s'appliquent à toutes les parties
        via l'Omertà.
      </div>
    </div>
  );
}
