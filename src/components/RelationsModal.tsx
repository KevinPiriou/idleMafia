import React from "react";
import Modal from "../Modal";
import type { Family, SaveState } from "../domain/types";
import FamiliesIntel from "../components/FamiliesIntel";

interface RelationsModalProps {
  families: Family[];
  playerState: SaveState;
  onClose: () => void;
}

const RelationsModal: React.FC<RelationsModalProps> = ({
  families,
  playerState,
  onClose,
}) => {
  return (
    <Modal title="🏠 Renseignements Familles" onClose={onClose}>
      <FamiliesIntel families={families} playerState={playerState} />
    </Modal>
  );
};

export default RelationsModal;
