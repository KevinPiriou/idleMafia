import React from "react";
import Modal from "../Modal";

interface WarReport {
  familyName: string;
  success: boolean;
  lines: string[];
  deltas: {
    cash?: number;
    respect?: number;
    heat?: number;
    tension?: number;
  };
}

interface WarReportModalProps {
  warReport: WarReport;
  onClose: () => void;
}

const WarReportModal: React.FC<WarReportModalProps> = ({
  warReport,
  onClose,
}) => {
  return (
    <Modal title={`Compte-rendu — ${warReport.familyName}`} onClose={onClose}>
      <div className="text-sm space-y-2">
        <div
          className={`text-${
            warReport.success ? "emerald" : "red"
          }-400 font-semibold`}
        >
          {warReport.success ? "Succès de l'opération" : "Échec de l'opération"}
        </div>
        <ul className="list-disc list-inside text-zinc-300">
          {warReport.lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
        <div className="text-xs text-zinc-400 border-t border-yellow-600/20 pt-2">
          Variations côté joueur:{" "}
          {warReport.deltas.cash
            ? `Cash ${warReport.deltas.cash > 0 ? "+" : ""}${
                warReport.deltas.cash
              } `
            : ""}
          {warReport.deltas.respect
            ? `• Respect ${warReport.deltas.respect > 0 ? "+" : ""}${
                warReport.deltas.respect
              } `
            : ""}
          {warReport.deltas.heat
            ? `• Chaleur ${warReport.deltas.heat > 0 ? "+" : ""}${
                warReport.deltas.heat
              }`
            : ""}
        </div>
      </div>
    </Modal>
  );
};

export default WarReportModal;
