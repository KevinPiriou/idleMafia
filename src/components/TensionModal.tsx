import React from "react";
import Modal from "../Modal";

import { formatNumber } from "../domain/format";

interface TensionModalProps {
  cost: number;
  onClose: () => void;
  onPayBail: (cost: number) => void;
  onAcceptSanction: () => void;
}

const TensionModal: React.FC<TensionModalProps> = ({
  cost,
  onClose,
  onPayBail,
  onAcceptSanction,
}) => {
  return (
    <Modal title="💥 Tension maximale" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p>La tension entre familles a atteint 100. Choisissez :</p>
        <div className="grid md:grid-cols-2 gap-3">
          <button
            className="px-4 py-3 rounded-lg bg-yellow-700/60 hover:bg-yellow-700 border border-yellow-500"
            onClick={() => onPayBail(cost)}
          >
            💸 Payer la caution élevée ({`$ ${formatNumber(cost)}`})
          </button>
          <button
            className="px-4 py-3 rounded-lg bg-red-700/60 hover:bg-red-700 border border-red-500"
            onClick={onAcceptSanction}
          >
            ⛓️ Accepter la sanction (inactif jusqu'à chaleur ≤ 20, -toutes
            illégales, -50% respect)
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TensionModal;
