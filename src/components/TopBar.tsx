import { useGameStore, selectBuffActive } from "../store/root";
import { formatNumber } from "../domain/format";
import type { SaveState } from "../domain/types";

type StatBoxProps = {
  label: string;
  value: string;
  danger?: boolean;
  tooltip?: React.ReactNode;
};

function StatBox({
  label,
  value,
  danger = false,
  tooltip,
  ...props
}: StatBoxProps & { "data-stat"?: string }) {
  return (
    <div className="relative group" {...props}>
      <div className="bg-black/60 border border-yellow-600 rounded-xl px-5 py-3 backdrop-blur-sm hover:translate-y-[-3px] hover:shadow-[0_5px_20px_rgba(212,175,55,0.4)] transition min-w-[140px]">
        <div className="text-[11px] uppercase tracking-wider text-yellow-600 mb-1">
          {label}
        </div>
        <div
          className={`text-xl font-bold ${
            danger ? "text-red-400 animate-pulse" : "text-white"
          }`}
        >
          {value}
        </div>
      </div>
      {tooltip && (
        <div className="pointer-events-none absolute z-50 mt-2 hidden group-hover:block left-0 top-full">
          <div className="rounded-xl border border-yellow-600/50 bg-zinc-900/95 backdrop-blur-sm p-3 shadow-2xl">
            {tooltip}
          </div>
        </div>
      )}
    </div>
  );
}

export type TopBarProps = {
  state: SaveState;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  setShowOptionsModal: (show: boolean) => void;
  setShowMenu: (show: boolean) => void;
  cashTooltipContent?: React.ReactNode;
  respectTooltipContent?: React.ReactNode;
  heatTooltipContent?: React.ReactNode;
  unreadJournal?: number;
  onShowJournal?: () => void;
  saveVersion?: number;
  migratedFrom?: number | null;
};

export default function TopBar({
  state,
  muted,
  setMuted,
  setShowOptionsModal,
  setShowMenu,
  cashTooltipContent,
  respectTooltipContent,
  heatTooltipContent,
  unreadJournal,
  onShowJournal,
  saveVersion = 0,
  migratedFrom = null,
}: TopBarProps) {
  // Store selectors (HUD wiring)
  const cashSel = useGameStore((s) => s.cash);
  const respectSel = useGameStore((s) => s.respect);
  const heatSel = useGameStore((s) => s.heat);
  const buffActiveSel = useGameStore(selectBuffActive);

  return (
    <header className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        {/* Logo */}
        <div className="flex gap-4 items-center">
          <div className="text-6xl">🕴️</div>
          <div>
            <h1 className="text-5xl font-bold bg-linear-to-r from-yellow-600 via-yellow-300 to-yellow-600 bg-clip-text text-transparent tracking-[0.2em]">
              LA FAMIGLIA
            </h1>
            <div className="text-xs text-yellow-600 tracking-[0.15em] mt-1">
              MAFIA IDLE
            </div>
          </div>
        </div>

        {/* Stats & Controls */}
        <div className="flex gap-6 flex-wrap">
          <StatBox
            label="💰 Cash"
            value={`$ ${formatNumber(cashSel)}`}
            tooltip={cashTooltipContent}
            data-stat="cash"
          />
          <StatBox
            label="👑 Respect"
            value={formatNumber(respectSel)}
            tooltip={respectTooltipContent}
            data-stat="respect"
          />
          <StatBox
            label="🔥 Chaleur"
            value={`${formatNumber(heatSel)} / 100`}
            danger={heatSel >= 80}
            tooltip={heatTooltipContent}
            data-stat="heat"
          />
          <StatBox
            label="🤝 Omertà"
            value={`x${(state.prestigeMult ?? 1).toFixed(2)}`}
            data-stat="omerta"
          />
          <StatBox
            label="⭐ Niveau"
            value={`Lv ${state.level}`}
            data-stat="level"
          />
          <button
            onClick={onShowJournal}
            className="relative px-3 py-1.5 rounded-md border border-yellow-600/40 bg-black/40 text-yellow-200 hover:bg-yellow-600/10 transition"
            title="Ouvrir le journal des événements"
          >
            📰 Journal
            {typeof unreadJournal === "number" && unreadJournal > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full text-[11px] flex items-center justify-center bg-red-600 text-white border border-red-300 shadow">
                {unreadJournal > 99 ? "99+" : unreadJournal}
              </span>
            )}
          </button>
          <button
            onClick={() => setMuted(!muted)}
            className="px-4 py-2 bg-black/60 border border-yellow-700/60 rounded-xl hover:bg-yellow-700/20 transition backdrop-blur-sm"
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button
            onClick={() => setShowOptionsModal(true)}
            className="px-4 py-2 bg-black/60 border border-yellow-700/60 rounded-xl hover:bg-yellow-700/20 transition backdrop-blur-sm"
            title="Options"
          >
            ⚙️
          </button>
          <button
            onClick={() => setShowMenu(true)}
            className="px-4 py-2 bg-black/60 border border-yellow-700/60 rounded-xl hover:bg-yellow-700/20 transition backdrop-blur-sm"
            title="Menu principal"
          >
            🏠
          </button>
        </div>
      </div>

      {/* Badges relations + buffs */}
      {(() => {
        const peace = state.families.filter((f) => f.state === "peace").length;
        const war = state.families.filter((f) => f.state === "war").length;
        const partner = state.families.filter(
          (f) => f.state === "partnership"
        ).length;
        const buffActive = buffActiveSel;
        const remainMs =
          buffActive && state.tempGlobalBuffUntil
            ? state.tempGlobalBuffUntil - Date.now()
            : 0;
        const remain = buffActive
          ? new Date(remainMs).toISOString().substring(11, 19)
          : null;
        return (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded-full text-[11px] border border-yellow-600/40 bg-black/40 text-zinc-200">
              Paix: <b className="text-emerald-400">{peace}</b>
            </span>
            <span className="px-2 py-1 rounded-full text-[11px] border border-yellow-600/40 bg-black/40 text-zinc-200">
              Guerre: <b className="text-red-400">{war}</b>
            </span>
            <span className="px-2 py-1 rounded-full text-[11px] border border-yellow-600/40 bg-black/40 text-zinc-200">
              Partenariat: <b className="text-indigo-300">{partner}</b>
            </span>
            {buffActive && (
              <span className="px-2 py-1 rounded-full text-[11px] border border-yellow-600 bg-yellow-600/20 text-yellow-300">
                +50% toutes filières • {remain}
              </span>
            )}
            <div className="ml-2 flex items-center gap-2">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold
               bg-yellow-600/20 border border-yellow-500/40 text-yellow-300"
                title="Version de sauvegarde"
              >
                v{saveVersion}
              </span>

              {typeof migratedFrom === "number" &&
                migratedFrom > 0 &&
                migratedFrom !== saveVersion && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold
                   bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 animate-pulse"
                    title={`Migré depuis v${migratedFrom}`}
                  >
                    migré v{migratedFrom} → v{saveVersion}
                  </span>
                )}
            </div>
          </div>
        );
      })()}
    </header>
  );
}
