import type { WeaponItem, VehicleItem, Rarity } from "../domain/types";
import { formatNumber } from "../domain/format";

const MARKET_WEAPONS: Omit<WeaponItem, "id">[] = [
  {
    name: "Pistolet .38",
    rarity: "common",
    bonusPower: 2,
    bonusDesc: "+2 puissance en guerre",
    price: 350,
  },
  {
    name: "Fusil à pompe",
    rarity: "uncommon",
    bonusPower: 5,
    bonusDesc: "+5 puissance en guerre",
    price: 1200,
  },
  {
    name: "Thompson SMG",
    rarity: "rare",
    bonusPower: 10,
    bonusDesc: "+10 puissance en guerre",
    price: 4000,
  },
  {
    name: "Carabine M1",
    rarity: "epic",
    bonusPower: 16,
    bonusDesc: "+16 puissance en guerre",
    price: 9000,
  },
  {
    name: "Fusil de précision",
    rarity: "legendary",
    bonusPower: 25,
    bonusDesc: "+25 puissance en guerre",
    price: 20000,
  },
];

const MARKET_VEHICLES: Omit<VehicleItem, "id">[] = [
  { name: "Coupé 1934", rarity: "common", speed: 2, armor: 1, price: 1500 },
  {
    name: "Sedan blindé 1939",
    rarity: "uncommon",
    speed: 2,
    armor: 4,
    price: 4200,
  },
  { name: "Roadster 1941", rarity: "rare", speed: 5, armor: 3, price: 8200 },
  { name: "Limousine 1948", rarity: "epic", speed: 4, armor: 7, price: 15000 },
  {
    name: "V12 Spécial 1950",
    rarity: "legendary",
    speed: 7,
    armor: 6,
    price: 30000,
  },
];

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

type BlackMarketProps = {
  cash: number;
  onBuyWeapon: (base: Omit<WeaponItem, "id">) => void;
  onBuyVehicle: (base: Omit<VehicleItem, "id">) => void;
  onBuyContract: (price: number) => void;
};

export default function BlackMarket({
  cash,
  onBuyWeapon,
  onBuyVehicle,
  onBuyContract,
}: BlackMarketProps) {
  const contractPrice = 10;
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-yellow-600 font-bold mb-2">Armes</h4>
        <div className="grid sm:grid-cols-2 gap-3">
          {MARKET_WEAPONS.map((w, i) => (
            <div
              key={i}
              className="bg-black/50 border border-yellow-600/20 rounded-xl p-3 flex items-center justify-between"
            >
              <div>
                <div className="font-semibold">{w.name}</div>
                <div
                  className={`text-[11px] inline-block px-2 py-0.5 rounded-full border ${rarityBadge(
                    w.rarity
                  )} mt-1`}
                >
                  {w.rarity}
                </div>
                <div className="text-xs text-zinc-300 mt-1">{w.bonusDesc}</div>
              </div>
              <button
                className={`px-3 py-2 rounded-lg text-sm ${
                  cash >= w.price
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-zinc-800 opacity-50"
                }`}
                disabled={cash < w.price}
                onClick={() => onBuyWeapon(w)}
              >
                $ {formatNumber(w.price)}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-yellow-600 font-bold mb-2">Véhicules</h4>
        <div className="grid sm:grid-cols-2 gap-3">
          {MARKET_VEHICLES.map((v, i) => (
            <div
              key={i}
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
                className={`px-3 py-2 rounded-lg text-sm ${
                  cash >= v.price
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-zinc-800 opacity-50"
                }`}
                disabled={cash < v.price}
                onClick={() => onBuyVehicle(v)}
              >
                $ {formatNumber(v.price)}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-yellow-600 font-bold mb-2">Contrats</h4>
        <div className="bg-black/50 border border-yellow-600/20 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="font-semibold">Contrat de recrutement</div>
            <div className="text-xs text-zinc-300 mt-1">
              Ouvre un tirage pour ajouter un membre (raretés aléatoires)
            </div>
          </div>
          <button
            className={`px-3 py-2 rounded-lg text-sm ${
              cash >= contractPrice
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-zinc-800 opacity-50"
            }`}
            disabled={cash < contractPrice}
            onClick={() => onBuyContract(contractPrice)}
          >
            $ {formatNumber(contractPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}
