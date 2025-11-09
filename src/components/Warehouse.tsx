import type { Rarity, SaveState, StaffMember } from "../domain/types";
import { formatNumber } from "../domain/format";
import { useState } from "react";

function rarityBadge(r: Rarity) {
  switch (r) {
    case "legendary":
      return "text-yellow-300 border-yellow-500";
    case "epic":
      return "text-purple-300 border-purple-500";
    case "rare":
      return "text-sky-300 border-sky-500";
    case "uncommon":
      return "text-emerald-300 border-emerald-500";
    default:
      return "text-zinc-300 border-zinc-600";
  }
}

type WarehouseProps = {
  inventory: NonNullable<SaveState["inventory"]>;
  staff: StaffMember[];
  equipped: NonNullable<SaveState["equipped"]>;
  onEquip: (staffId: string, weaponId: string | null) => void;
  onSellWeapon: (id: string, price: number) => void;
  onSellVehicle: (id: string, price: number) => void;
  onOpenContract: () => void;
  onOpenMultiple?: (n: number) => void;
};

export default function Warehouse({
  inventory,
  staff,
  equipped,
  onEquip,
  onSellWeapon,
  onSellVehicle,
  onOpenContract,
  onOpenMultiple,
}: WarehouseProps) {
  const [filter, setFilter] = useState<"all" | "weapons" | "vehicles">("all");
  const sellRate = 0.5;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <button
          className={`px-3 py-1 rounded border ${
            filter === "all"
              ? "border-yellow-600 text-yellow-400"
              : "border-zinc-600"
          }`}
          onClick={() => setFilter("all")}
        >
          Tout
        </button>
        <button
          className={`px-3 py-1 rounded border ${
            filter === "weapons"
              ? "border-yellow-600 text-yellow-400"
              : "border-zinc-600"
          }`}
          onClick={() => setFilter("weapons")}
        >
          Armes
        </button>
        <button
          className={`px-3 py-1 rounded border ${
            filter === "vehicles"
              ? "border-yellow-600 text-yellow-400"
              : "border-zinc-600"
          }`}
          onClick={() => setFilter("vehicles")}
        >
          Véhicules
        </button>
        <div className="ml-auto text-xs text-zinc-300">
          Contrats: {inventory.contracts}
          <button
            className="ml-2 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500"
            onClick={onOpenContract}
          >
            Ouvrir
          </button>
          <button
            className="ml-2 px-2 py-1 rounded bg-indigo-700 hover:bg-indigo-600 text-sm"
            onClick={() => onOpenMultiple && onOpenMultiple(10)}
            disabled={(inventory.contracts || 0) <= 0}
            title="Ouvrir 10 caisses en séquence"
          >
            Ouvrir 10
          </button>
        </div>
      </div>

      {(filter === "all" || filter === "weapons") && (
        <div>
          <h4 className="text-yellow-600 font-bold mb-2">Armes</h4>
          <div className="grid sm:grid-cols-2 gap-3">
            {inventory.weapons.length === 0 && (
              <div className="text-xs text-zinc-400">Aucune arme</div>
            )}
            {inventory.weapons.map((w) => (
              <div
                key={w.id}
                className="bg-black/50 border border-yellow-600/20 rounded-xl p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{w.name}</div>
                    <div
                      className={`text-[11px] inline-block px-2 py-0.5 rounded-full border ${rarityBadge(
                        w.rarity
                      )} mt-1`}
                    >
                      {w.rarity}
                    </div>
                    <div className="text-xs text-zinc-300 mt-1">
                      {w.bonusDesc}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div>Valeur: $ {formatNumber(w.price)}</div>
                    <div>
                      Revente: $ {formatNumber(Math.floor(w.price * sellRate))}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <select
                    className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded"
                    value={
                      Object.entries(equipped).find(
                        ([, wid]) => wid === w.id
                      )?.[0] || ""
                    }
                    onChange={(e) => {
                      const sid = e.target.value;
                      if (!sid) return;
                      onEquip(sid, w.id);
                    }}
                  >
                    <option value="">Équiper sur...</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="ml-auto px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
                    onClick={() =>
                      onSellWeapon(w.id, Math.floor(w.price * sellRate))
                    }
                  >
                    Vendre
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(filter === "all" || filter === "vehicles") && (
        <div>
          <h4 className="text-yellow-600 font-bold mb-2">Véhicules</h4>
          <div className="grid sm:grid-cols-2 gap-3">
            {inventory.vehicles.length === 0 && (
              <div className="text-xs text-zinc-400">Aucun véhicule</div>
            )}
            {inventory.vehicles.map((v) => (
              <div
                key={v.id}
                className="bg-black/50 border border-yellow-600/20 rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold">{v.name}</div>
                  <div
                    className={`text-[11px] inline-block px-2 py-0.5 rounded-full border ${rarityBadge(
                      v.rarity
                    )} mt-1`}
                  >
                    {v.rarity}
                  </div>
                  <div className="text-xs text-zinc-300 mt-1">
                    Vitesse {v.speed} • Blindage {v.armor}
                  </div>
                </div>
                <button
                  className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
                  onClick={() =>
                    onSellVehicle(v.id, Math.floor(v.price * sellRate))
                  }
                >
                  Vendre
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
