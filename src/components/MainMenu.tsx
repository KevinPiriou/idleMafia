import React from "react";
import type { SaveState } from "../domain/types";
import { blankSave, saveGame } from "../domain/save";

type MainMenuProps = {
  setState: React.Dispatch<React.SetStateAction<SaveState>>;
  setShowMenu: (show: boolean) => void;
  setShowOptionsModal: (show: boolean) => void;
};

export function MainMenu({
  setState,
  setShowMenu,
  setShowOptionsModal,
}: MainMenuProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="w-full max-w-md rounded-2xl border-2 border-yellow-600 bg-linear-to-br from-zinc-900 to-zinc-800 p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-yellow-400 mb-2 tracking-widest">
          MAFIA IDLE
        </h2>
        <p className="text-sm text-zinc-300 mb-4">
          Reprenez votre empire ou démarrez une nouvelle partie.
        </p>
        <div className="space-y-3">
          <button
            className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-lg"
            onClick={() => {
              if (
                !confirm(
                  "Démarrer une nouvelle partie ? L'Omertà est conservée."
                )
              )
                return;
              setState((prev) => {
                const fresh = blankSave();
                fresh.prestigeMult = prev.prestigeMult;
                fresh.prestigePoints = prev.prestigePoints;
                saveGame(fresh);
                return fresh;
              });
              setShowMenu(false);
            }}
          >
            Nouvelle partie
          </button>
          <button
            className="w-full px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-lg"
            onClick={() => setShowMenu(false)}
          >
            Reprendre
          </button>
          <button
            className="w-full px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-lg"
            onClick={() => setShowOptionsModal(true)}
          >
            Options
          </button>
        </div>
      </div>
    </div>
  );
}
