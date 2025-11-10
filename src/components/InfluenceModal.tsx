import type { SaveState } from "../domain/types";
import Modal from "../Modal";

type InfluenceModalProps = {
  state: SaveState;
  bribe: (cashCost: number, respectCost: number, heatReduce: number) => void;
  buyPassiveInfluence: (
    cashCost: number,
    respectCost: number,
    addMitigationPerSec: number
  ) => void;
  setShowInfluenceModal: (show: boolean) => void;
};

export function InfluenceModal({
  state,
  bribe,
  buyPassiveInfluence,
  setShowInfluenceModal,
}: InfluenceModalProps) {
  return (
    <Modal
      title="🎩 Influence politique"
      onClose={() => setShowInfluenceModal(false)}
    >
      <div className="space-y-3">
        <div className="text-sm text-zinc-300 mb-4">
          Mitigation passive:{" "}
          <span className="text-yellow-600 font-bold">
            {(state.heatMitigationPerSec ?? 0).toFixed(2)} /s
          </span>
        </div>
        <button
          onClick={() => {
            bribe(500, 50, 5);
            setShowInfluenceModal(false);
          }}
          disabled={state.cash < 500 || state.respect < 50}
          className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition"
        >
          Graisser la pâte du juge (−5 chaleur) • $500 + 50 respect
        </button>
        <button
          onClick={() => buyPassiveInfluence(5000, 250, 0.05)}
          disabled={state.cash < 5000 || state.respect < 250}
          className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition"
        >
          Réseau politique (−0.05/s) • $5k + 250 respect
        </button>
        <button
          onClick={() => buyPassiveInfluence(10000, 125, 0.05)}
          disabled={state.cash < 10000 || state.respect < 125}
          className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition"
        >
          Pot de vin au commissaire (−0.05/s) • $10k + 125 respect
        </button>
      </div>
    </Modal>
  );
}
