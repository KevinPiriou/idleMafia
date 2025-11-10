import type { SaveState } from "../domain/types";
import Modal from "../Modal";
import { formatNumber } from "../domain/format";

type UpgradesModalProps = {
  state: SaveState;
  buyUpgrade: (id: string) => void;
  setShowUpgradesModal: (show: boolean) => void;
};

export function UpgradesModal({
  state,
  buyUpgrade,
  setShowUpgradesModal,
}: UpgradesModalProps) {
  return (
    <Modal
      title="⚙️ Upgrades disponibles"
      onClose={() => setShowUpgradesModal(false)}
    >
      <div className="grid md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
        {Object.values(state.upgrades).map((u) => (
          <div
            key={u.id}
            className="bg-black/50 border border-yellow-600/20 rounded-xl p-4 flex justify-between items-center hover:border-yellow-600 transition"
          >
            <div>
              <div className="font-bold">{u.label}</div>
              <div className="text-sm text-zinc-400">{u.desc}</div>
            </div>
            {u.owned ? (
              <span className="text-emerald-400 text-sm font-bold">
                ✓ Acheté
              </span>
            ) : (
              <button
                onClick={() => buyUpgrade(u.id)}
                disabled={state.cash < u.cost}
                className={`px-4 py-2 rounded-lg font-bold transition ${
                  state.cash >= u.cost
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-zinc-800 opacity-50 cursor-not-allowed"
                }`}
              >
                $ {formatNumber(u.cost)}
              </button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
