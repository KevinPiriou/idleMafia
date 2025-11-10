import React, { useMemo, useState } from "react";
import type {
  StaffMember,
  //Rarity,FamilyState,
  WeaponItem,
  VehicleItem,
  Family,
} from "./domain/types";

type WarAction = "assassination" | "kidnapping" | "intimidation";

export default function WarModal({
  family,
  staff,
  equipped,
  weapons,
  vehicles,
  allFamilies,
  onClose,
  onResolve,
  isLocked,
}: {
  family: Family;
  staff: StaffMember[];
  equipped: Record<string, string | null>;
  weapons: WeaponItem[];
  vehicles: VehicleItem[];
  allFamilies: Family[];
  onClose: () => void;
  // Apply effects and close from parent; returns true if applied
  onResolve: (result: ResolveResult) => void;
  isLocked?: boolean;
}) {
  const [action, setAction] = useState<WarAction>("assassination");
  const [selection, setSelection] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const econ = React.useMemo(
    () =>
      family.econ || {
        cash: 0,
        respect: 0,
        members: 0,
        weapons: 0,
        vehicles: 0,
      },
    [family.econ]
  );

  // Allies: treat families in partnership as allied to the target for defense
  const allies = useMemo(
    () =>
      allFamilies.filter(
        (f) => f.id !== family.id && f.state === "partnership"
      ),
    [allFamilies, family.id]
  );

  const equippedWeaponPowerByStaff = useMemo(() => {
    const map = new Map<string, number>();
    staff.forEach((s) => {
      const wid = equipped[s.id];
      if (!wid) return map.set(s.id, 0);
      const item = weapons.find((w) => w.id === wid);
      map.set(s.id, item ? item.bonusPower : 0);
    });
    return map;
  }, [equipped, staff, weapons]);

  const bestVehicle = useMemo(() => {
    if (!vehicles || vehicles.length === 0) return null;
    // pick vehicle maximizing speed+armor
    return vehicles.reduce((a, b) =>
      a.speed + a.armor >= b.speed + b.armor ? a : b
    );
  }, [vehicles]);

  const requirements = useMemo(() => {
    const oneArmed = selection.some((sid) => (equipped[sid] ? true : false));
    const hasVehicle = vehicles.length > 0;
    return {
      oneMember: selection.length >= 1,
      twoMembers: selection.length >= 2,
      oneArmed,
      hasVehicle,
    };
  }, [selection, equipped, vehicles.length]);

  const preview = useMemo(
    () =>
      computeChances({
        action,
        selection,
        staff,
        econ,
        allies,
        equippedWeaponPowerByStaff,
        bestVehicle,
      }),
    [
      action,
      selection,
      staff,
      econ,
      allies,
      equippedWeaponPowerByStaff,
      bestVehicle,
    ]
  );

  const canLaunch = useMemo(() => {
    if (isLocked) return false;
    if (action === "assassination")
      return requirements.oneMember && requirements.oneArmed;
    if (action === "kidnapping")
      return (
        requirements.twoMembers &&
        requirements.oneArmed &&
        requirements.hasVehicle
      );
    if (action === "intimidation") return requirements.oneMember;
    return false;
  }, [action, requirements, isLocked]);

  const toggleSelect = (id: string) => {
    setSelection((prev) => {
      const has = prev.includes(id);
      if (!has)
        return action === "kidnapping" ? [...prev, id].slice(0, 2) : [id];
      return prev.filter((x) => x !== id);
    });
  };

  const launch = () => {
    if (!canLaunch || running) return;
    setRunning(true);
    // Simulate slight delay for tension
    setTimeout(() => {
      const roll = Math.random();
      const success = roll < preview.chance;
      const result = resolveOutcome({
        action,
        success,
        family,
        allies,
        econ,
      });
      onResolve(result);
      setRunning(false);
    }, 650);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-3xl mx-4 bg-linear-to-br from-zinc-900 to-zinc-800 border-2 border-yellow-600 rounded-2xl p-6 shadow-2xl">
        <button
          className="absolute top-4 right-4 text-zinc-300 hover:text-white"
          onClick={onClose}
        >
          ✕
        </button>
        <div className="text-2xl font-bold text-yellow-500 mb-1">
          Opération clandestine
        </div>
        <div className="text-sm text-zinc-300 mb-4">
          Cible:{" "}
          <span className="text-yellow-400 font-semibold">{family.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Actions */}
          <div className="space-y-2">
            <ActionRadio
              label="Tentative d'assassinat"
              desc="1 membre requis, doit être armé. Basé sur Force/Esprit/Arme."
              selected={action === "assassination"}
              onClick={() => setAction("assassination")}
            />
            <ActionRadio
              label="Enlèvement"
              desc="2 membres requis, au moins un armé et un véhicule. Basé sur Force/Réseau/Vitesse."
              selected={action === "kidnapping"}
              onClick={() => setAction("kidnapping")}
            />
            <ActionRadio
              label="Intimidation"
              desc="1 membre requis, pas besoin d'être armé. Basé sur Charisme/Réseau."
              selected={action === "intimidation"}
              onClick={() => setAction("intimidation")}
            />

            {/* Requirements hints */}
            <div className="mt-3 text-xs text-zinc-300 space-y-1">
              {action === "assassination" && (
                <Req ok={requirements.oneMember}>1 membre sélectionné</Req>
              )}
              {action === "assassination" && (
                <Req ok={requirements.oneArmed}>Membre armé</Req>
              )}
              {action === "kidnapping" && (
                <Req ok={requirements.twoMembers}>2 membres sélectionnés</Req>
              )}
              {action === "kidnapping" && (
                <Req ok={requirements.oneArmed}>Au moins 1 membre armé</Req>
              )}
              {action === "kidnapping" && (
                <Req ok={requirements.hasVehicle}>
                  Au moins 1 véhicule disponible
                </Req>
              )}
              {action === "intimidation" && (
                <Req ok={requirements.oneMember}>1 membre sélectionné</Req>
              )}
            </div>
          </div>

          {/* Selection + Preview */}
          <div className="space-y-2">
            <div className="text-sm text-yellow-500 font-bold mb-1">
              Sélection des membres
            </div>
            <div className="max-h-48 overflow-auto pr-2 space-y-1">
              {staff.map((s) => {
                const armed = !!equipped[s.id];
                const sel = selection.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSelect(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border ${
                      sel
                        ? "border-yellow-500 bg-yellow-500/10"
                        : "border-zinc-700 bg-black/40"
                    } hover:border-yellow-500 transition text-sm flex items-center justify-between`}
                  >
                    <span className="truncate">
                      {s.name} • <span className="text-zinc-300">{s.role}</span>
                    </span>
                    <span
                      className={`text-xs ${
                        armed ? "text-red-300" : "text-zinc-500"
                      }`}
                    >
                      {armed ? "Armé" : "Non armé"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 p-3 rounded-lg border border-yellow-600/30 bg-black/40">
              <div className="text-sm text-yellow-500 font-bold">
                Évaluation de l'opération
              </div>
              <div className="text-xs text-zinc-300 mt-1">
                Chance de réussite:{" "}
                <span className="font-bold text-yellow-400">
                  {Math.round(preview.chance * 100)}%
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Puissance équipe:{" "}
                <span className="text-emerald-400 font-semibold">
                  {preview.playerPower.toFixed(1)}
                </span>{" "}
                • Défense ennemie:{" "}
                <span className="text-red-400 font-semibold">
                  {preview.enemyDefense.toFixed(1)}
                </span>
                {allies.length > 0 ? ` (incl. ${allies.length} alliés)` : ""}
              </div>
              {bestVehicle && (
                <div className="text-[11px] text-zinc-400 mt-1">
                  Véhicule clé: {bestVehicle.name} • Vit {bestVehicle.speed} /
                  Blind {bestVehicle.armor}
                </div>
              )}
              <div className="text-[11px] text-zinc-400 mt-2">
                Impacts potentiels: {preview.hint}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700"
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-bold ${
              canLaunch
                ? "bg-red-700 hover:bg-red-600"
                : "bg-zinc-700 opacity-50"
            }`}
            onClick={launch}
            disabled={!canLaunch || running}
          >
            Lancer l'opération
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionRadio({
  label,
  desc,
  selected,
  onClick,
}: {
  label: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg border ${
        selected
          ? "border-yellow-500 bg-yellow-500/10"
          : "border-zinc-700 bg-black/40"
      } hover:border-yellow-500 transition`}
    >
      <div className="text-sm font-semibold text-yellow-500">{label}</div>
      <div className="text-xs text-zinc-300">{desc}</div>
    </button>
  );
}

function Req({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`flex items-center gap-2 ${
        ok ? "text-emerald-400" : "text-zinc-500"
      }`}
    >
      <span>{ok ? "✓" : "✕"}</span>
      <span>{children}</span>
    </div>
  );
}

// --- Computation helpers ---

export type ChancePreview = {
  playerPower: number;
  enemyDefense: number;
  chance: number; // 0..1
  hint: string;
};

function baseEnemyDefense(econ: NonNullable<Family["econ"]>): number {
  // Aggregate then divide by members as specified
  const members = Math.max(1, econ.members || 1);
  const raw =
    econ.respect * 0.4 +
    econ.weapons * 10 +
    econ.vehicles * 8 +
    econ.cash / 10000;
  return raw / members;
}

function allyDefenseContribution(f: Family): number {
  const e = f.econ || {
    cash: 0,
    respect: 0,
    members: 1,
    weapons: 0,
    vehicles: 0,
  };
  return baseEnemyDefense(e) * 0.5; // allies contribute at 50% strength
}

function computePlayerPower(
  action: WarAction,
  selection: string[],
  staff: StaffMember[],
  weaponPower: Map<string, number>,
  bestVehicle: VehicleItem | null
): number {
  const chars = selection
    .map((id) => staff.find((s) => s.id === id))
    .filter(Boolean) as StaffMember[];
  if (chars.length === 0) return 0;
  let power = 0;
  if (action === "assassination") {
    const c = chars[0];
    const force = c.stats[1];
    const esprit = c.stats[2];
    const wp = weaponPower.get(c.id) || 0;
    power = force * 0.6 + esprit * 0.2 + wp * 5 + 10; // weapon strongly matters
    if (bestVehicle) power += bestVehicle.speed * 0.5; // light bonus for getaway
  } else if (action === "kidnapping") {
    const avgForce = chars.reduce((a, c) => a + c.stats[1], 0) / chars.length;
    const avgReseau = chars.reduce((a, c) => a + c.stats[3], 0) / chars.length;
    const armedBonus = chars.some((c) => (weaponPower.get(c.id) || 0) > 0)
      ? 8
      : 0;
    const veh = bestVehicle
      ? bestVehicle.speed * 1.5 + bestVehicle.armor * 0.5
      : 0;
    power = avgForce * 0.5 + avgReseau * 0.3 + veh + armedBonus + 8;
  } else {
    // intimidation
    const c = chars[0];
    const charisme = c.stats[0];
    const reseau = c.stats[3];
    power = charisme * 0.7 + reseau * 0.3 + 5;
  }
  return power;
}

function computeChances({
  action,
  selection,
  staff,
  econ,
  allies,
  equippedWeaponPowerByStaff,
  bestVehicle,
}: {
  action: WarAction;
  selection: string[];
  staff: StaffMember[];
  econ: NonNullable<Family["econ"]>;
  allies: Family[];
  equippedWeaponPowerByStaff: Map<string, number>;
  bestVehicle: VehicleItem | null;
}): ChancePreview {
  const playerPower = computePlayerPower(
    action,
    selection,
    staff,
    equippedWeaponPowerByStaff,
    bestVehicle
  );
  let defense = baseEnemyDefense(econ);
  for (const a of allies) defense += allyDefenseContribution(a);
  // Convert vs-defense ratio to chance with floor/ceiling
  let chance = playerPower <= 0 ? 0 : playerPower / (playerPower + defense);
  // Baselines and caps by action
  if (action === "assassination") chance = clamp(0.1 + chance * 0.9, 0.05, 0.9);
  else if (action === "kidnapping")
    chance = clamp(0.08 + chance * 0.85, 0.05, 0.85);
  else chance = clamp(0.2 + chance * 0.8, 0.15, 0.95);

  const hint =
    action === "assassination"
      ? "Succès: -membres, -respect, perte possible d'armes. Échec: +chaleur, -respect."
      : action === "kidnapping"
      ? "Succès: rançon (+cash), -respect, -logistique. Échec: +chaleur, -respect."
      : "Succès: -respect et -cash modérés. Échec: +chaleur légère.";

  return { playerPower, enemyDefense: defense, chance, hint };
}

type ResolveResult = {
  familyId: string;
  action: WarAction;
  success: boolean;
  // deltas to apply on target econ and player stats
  delta: {
    target: {
      cash?: number;
      respect?: number;
      members?: number;
      weapons?: number;
      vehicles?: number;
    };
    player: {
      cash?: number;
      respect?: number;
      heat?: number;
      tension?: number;
    };
  };
  narrative: string[]; // lines of feedback
};

function resolveOutcome({
  action,
  success,
  family,
  allies,
  econ,
}: {
  action: WarAction;
  success: boolean;
  family: Family;
  allies: Family[];
  econ: NonNullable<Family["econ"]>;
}): ResolveResult {
  const lines: string[] = [];
  let targetDelta: ResolveResult["delta"]["target"] = {};
  let playerDelta: ResolveResult["delta"]["player"] = {};
  if (action === "assassination") {
    if (success) {
      const loss = -1 - Math.round(Math.random()); // -1 or -2 members
      const respectLoss = -Math.round(15 + Math.random() * 20);
      const weaponLoss = Math.random() < 0.35 ? -1 : 0;
      targetDelta = {
        members: loss,
        respect: respectLoss,
        weapons: weaponLoss,
      };
      playerDelta = {
        respect: 20 + Math.round(Math.random() * 20),
        heat: 8,
        tension: 6,
      };
      lines.push("Votre tueur frappe sans un son. La cible chancelle.");
      lines.push(
        `-${Math.abs(loss)} membre(s), ${respectLoss} respect chez ${
          family.name
        }${weaponLoss ? ", armes égarées" : ""}.`
      );
    } else {
      playerDelta = { respect: -20, heat: 18, tension: 10 };
      lines.push(
        "La fenêtre était piégée. Le coup foire, la ville s'enflamme."
      );
    }
  } else if (action === "kidnapping") {
    if (success) {
      const ransom = Math.round(
        1500 + econ.cash * (0.03 + Math.random() * 0.02)
      );
      const respectLoss = -Math.round(20 + Math.random() * 30);
      const vehicleLoss = Math.random() < 0.25 ? -1 : 0;
      targetDelta = {
        cash: -ransom,
        respect: respectLoss,
        vehicles: vehicleLoss,
      };
      playerDelta = { cash: +ransom, respect: 10, heat: 12, tension: 8 };
      lines.push("Sac noir, pneus qui crissent. La rançon tombe.");
      lines.push(
        `+${ransom}$, ${respectLoss} respect pour ${family.name}${
          vehicleLoss ? ", un véhicule perdu" : ""
        }.`
      );
    } else {
      playerDelta = { respect: -15, heat: 20, tension: 10 };
      lines.push("Le convoi était surveillé. Vos hommes battent en retraite.");
    }
  } else {
    // intimidation
    if (success) {
      const cashHit = -Math.round(500 + Math.random() * 1500);
      const respectLoss = -Math.round(10 + Math.random() * 15);
      targetDelta = { cash: cashHit, respect: respectLoss };
      playerDelta = { respect: 6, heat: 6, tension: 4 };
      lines.push("Des regards, des mots. La rue comprend.");
      lines.push(`${cashHit}$ et ${respectLoss} respect pour ${family.name}.`);
    } else {
      playerDelta = { respect: -8, heat: 10, tension: 5 };
      lines.push("Ils ne tremblent pas. Vos menaces sonnent creux.");
    }
  }

  // Allies participation flavor
  if (allies.length > 0) {
    lines.push(`${allies.length} allié(s) épaulent ${family.name}.`);
  }

  return {
    familyId: family.id,
    action,
    success,
    delta: { target: targetDelta, player: playerDelta },
    narrative: lines,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
