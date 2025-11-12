import { useState } from "react";
import { getAllMissionsWithStatus } from "../domain/missions";
import type { Mission, MissionProgress } from "../domain/missions";
import type { SaveState } from "../domain/types";

type MissionPanelState = "overview" | "active" | "completed";

interface MissionsPanelProps {
  state: SaveState;
}

export function MissionsPanel({ state }: MissionsPanelProps) {
  const [panelView, setPanelView] = useState<MissionPanelState>("overview");
  const [selectedMission, setSelectedMission] = useState<string | null>(null);

  const missionsWithStatus = getAllMissionsWithStatus(state);
  const activeMissions = missionsWithStatus.filter(
    (m) => m.status === "active"
  );
  const completedMissions = missionsWithStatus.filter(
    (m) => m.status === "completed"
  );

  const selectedMissionData =
    selectedMission &&
    missionsWithStatus.find((m) => m.mission.id === selectedMission);

  const handleCompleteMission = () => {
    // Les missions sont mises à jour automatiquement par la boucle de jeu
    setSelectedMission(null);
  };

  const getMissionIcon = (missionLevel: number): string => {
    if (missionLevel <= 3) return "🟡";
    if (missionLevel <= 7) return "🟠";
    if (missionLevel <= 12) return "🔴";
    if (missionLevel <= 18) return "⭐";
    return "👑";
  };

  return (
    <div className="w-full h-full bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <div className="bg-black/40 border-b-2 border-yellow-600/50 p-6">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-yellow-400">
          <span>📋</span> Missions
        </h1>
        <p className="text-sm text-yellow-600/70 mt-2">
          Niveau: {state.level} | Complétées: {completedMissions.length}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-black/20 p-4 border-b border-yellow-600/20">
        <button
          onClick={() => setPanelView("overview")}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            panelView === "overview"
              ? "bg-yellow-600/30 border-yellow-600 text-yellow-400"
              : "bg-black/40 border-yellow-600/20 text-yellow-600/70 hover:bg-black/50 border"
          } border`}
        >
          Vue d'ensemble ({activeMissions.length})
        </button>
        <button
          onClick={() => setPanelView("active")}
          className={`px-4 py-2 rounded-lg font-semibold transition border ${
            panelView === "active"
              ? "bg-yellow-600/30 border-yellow-600 text-yellow-400"
              : "bg-black/40 border-yellow-600/20 text-yellow-600/70 hover:bg-black/50"
          }`}
        >
          Actives ({activeMissions.length})
        </button>
        <button
          onClick={() => setPanelView("completed")}
          className={`px-4 py-2 rounded-lg font-semibold transition border ${
            panelView === "completed"
              ? "bg-yellow-600/30 border-yellow-600 text-yellow-400"
              : "bg-black/40 border-yellow-600/20 text-yellow-600/70 hover:bg-black/50"
          }`}
        >
          Complétées ({completedMissions.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedMissionData ? (
          // Détails de la mission
          <MissionDetailView
            mission={selectedMissionData.mission}
            status={selectedMissionData.status}
            progress={selectedMissionData.progress}
            onClose={() => setSelectedMission(null)}
            onComplete={() => handleCompleteMission()}
          />
        ) : panelView === "overview" ? (
          <OverviewTab
            missions={missionsWithStatus}
            onSelectMission={setSelectedMission}
            getMissionIcon={getMissionIcon}
          />
        ) : panelView === "active" ? (
          <MissionListTab
            missions={activeMissions}
            onSelectMission={setSelectedMission}
            getMissionIcon={getMissionIcon}
          />
        ) : (
          <MissionListTab
            missions={completedMissions}
            onSelectMission={setSelectedMission}
            getMissionIcon={getMissionIcon}
          />
        )}
      </div>
    </div>
  );
}

interface OverviewTabProps {
  missions: Array<{ mission: Mission; status: string }>;
  onSelectMission: (id: string) => void;
  getMissionIcon: (level: number) => string;
}

function OverviewTab({
  missions,
  onSelectMission,
  getMissionIcon,
}: OverviewTabProps) {
  const stats = {
    total: missions.length,
    active: missions.filter((m) => m.status === "active").length,
    completed: missions.filter((m) => m.status === "completed").length,
    locked: missions.filter((m) => m.status === "locked").length,
  };

  const nextMissions = missions
    .filter((m) => m.status === "locked")
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-black/40 p-4 rounded-lg border-2 border-yellow-600/30">
          <p className="text-yellow-600/60 text-sm uppercase tracking-wider">
            Total
          </p>
          <p className="text-3xl font-bold text-yellow-400 mt-2">
            {stats.total}
          </p>
        </div>
        <div className="bg-black/40 p-4 rounded-lg border-2 border-yellow-600/50">
          <p className="text-yellow-600 text-sm uppercase tracking-wider">
            Actives
          </p>
          <p className="text-3xl font-bold text-yellow-300 mt-2">
            {stats.active}
          </p>
        </div>
        <div className="bg-black/40 p-4 rounded-lg border-2 border-yellow-600/30">
          <p className="text-yellow-600/60 text-sm uppercase tracking-wider">
            Complétées
          </p>
          <p className="text-3xl font-bold text-yellow-200 mt-2">
            {stats.completed}
          </p>
        </div>
        <div className="bg-black/40 p-4 rounded-lg border-2 border-yellow-600/20">
          <p className="text-yellow-600/40 text-sm uppercase tracking-wider">
            Bloquées
          </p>
          <p className="text-3xl font-bold text-yellow-500/60 mt-2">
            {stats.locked}
          </p>
        </div>
      </div>

      {/* Next Missions */}
      {nextMissions.length > 0 && (
        <div className="bg-black/40 p-4 rounded-lg border-2 border-yellow-600/30">
          <h3 className="text-lg font-bold text-yellow-400 mb-4">
            ⬆️ Prochaines missions (déverrouille au niveau requis)
          </h3>
          <div className="space-y-2">
            {nextMissions.map((item) => (
              <button
                key={item.mission.id}
                onClick={() => onSelectMission(item.mission.id)}
                className="w-full text-left p-3 bg-black/20 hover:bg-black/40 rounded-lg transition border-l-4 border-yellow-600/30"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-yellow-200 flex items-center gap-2">
                      {getMissionIcon(item.mission.level)}
                      Niveau {item.mission.level}: {item.mission.title}
                    </p>
                    <p className="text-sm text-yellow-600/60">
                      {item.mission.shortDesc}
                    </p>
                  </div>
                  <span className="text-2xl opacity-50">🔒</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Missions Preview */}
      {missions.filter((m) => m.status === "active").length > 0 && (
        <div className="bg-black/40 p-4 rounded-lg border-2 border-yellow-600/50">
          <h3 className="text-lg font-bold text-yellow-400 mb-4">
            ⚡ Missions actives
          </h3>
          <div className="space-y-2">
            {missions
              .filter((m) => m.status === "active")
              .map((item) => (
                <button
                  key={item.mission.id}
                  onClick={() => onSelectMission(item.mission.id)}
                  className="w-full text-left p-3 bg-black/20 hover:bg-black/40 rounded-lg transition border-l-4 border-yellow-600"
                >
                  <p className="font-semibold text-yellow-200">
                    {item.mission.title}
                  </p>
                  <p className="text-sm text-yellow-600/70">
                    {item.mission.shortDesc}
                  </p>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface MissionListTabProps {
  missions: Array<{ mission: Mission; status: string }>;
  onSelectMission: (id: string) => void;
  getMissionIcon: (level: number) => string;
}

function MissionListTab({
  missions,
  onSelectMission,
  getMissionIcon,
}: MissionListTabProps) {
  if (missions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center">
        <div className="text-yellow-600/40">
          <p className="text-4xl mb-4">📭</p>
          <p className="text-lg">Aucune mission pour le moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {missions.map((item) => (
        <button
          key={item.mission.id}
          onClick={() => onSelectMission(item.mission.id)}
          className="w-full text-left p-4 bg-black/40 hover:bg-black/50 rounded-lg transition border-2 border-yellow-600/30 hover:border-yellow-600/60"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-bold text-yellow-400 flex items-center gap-2">
                {getMissionIcon(item.mission.level)}
                {item.mission.title}
              </p>
              <p className="text-sm text-yellow-600/60 mt-1">
                {item.mission.shortDesc}
              </p>
              <div className="flex gap-4 text-xs text-yellow-600/50 mt-2">
                <span>💰 {item.mission.rewards.cash}</span>
                <span>🙏 {item.mission.rewards.respect}</span>
                <span>⭐ {item.mission.rewards.xp} XP</span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

interface MissionDetailViewProps {
  mission: Mission;
  status: string;
  progress: MissionProgress | undefined;
  onClose: () => void;
  onComplete: () => void;
}

function MissionDetailView({
  mission,
  status,
  progress,
  onClose,
  onComplete,
}: MissionDetailViewProps) {
  const isCompleted = status === "completed";
  const isLocked = status === "locked";

  return (
    <div className="space-y-4">
      <button
        onClick={onClose}
        className="text-yellow-600 hover:text-yellow-400 transition flex items-center gap-2"
      >
        ← Retour
      </button>

      <div className="bg-black/40 p-6 rounded-lg border-2 border-yellow-600/50">
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">
          {mission.title}
        </h2>
        <p className="text-yellow-600/60 mb-4">
          Niveau requis: {mission.level}
        </p>

        {isLocked && (
          <div className="bg-black/60 border-2 border-yellow-600/30 p-4 rounded-lg mb-4 text-yellow-600/70">
            🔒 Mission bloquée - Atteins le niveau {mission.level} pour la
            déverrouiller
          </div>
        )}

        {isCompleted && (
          <div className="bg-black/60 border-2 border-yellow-600/50 p-4 rounded-lg mb-4 text-yellow-300">
            ✅ Mission complétée!{" "}
            {progress?.completedAt && (
              <span className="text-sm">
                {new Date(progress.completedAt).toLocaleDateString("fr-FR")}
              </span>
            )}
          </div>
        )}

        <p className="text-yellow-100 text-lg mb-6">{mission.description}</p>

        {/* Rewards */}
        <div className="bg-black/40 p-4 rounded-lg mb-6 border border-yellow-600/30">
          <h3 className="font-bold text-yellow-400 mb-3">Récompenses:</h3>
          <div className="grid grid-cols-3 gap-4">
            {mission.rewards.cash && (
              <div className="text-center">
                <p className="text-2xl">💰</p>
                <p className="font-semibold text-yellow-300">
                  +{mission.rewards.cash}$
                </p>
              </div>
            )}
            {mission.rewards.respect && (
              <div className="text-center">
                <p className="text-2xl">🙏</p>
                <p className="font-semibold text-yellow-300">
                  +{mission.rewards.respect}
                </p>
              </div>
            )}
            {mission.rewards.xp && (
              <div className="text-center">
                <p className="text-2xl">⭐</p>
                <p className="font-semibold text-yellow-300">
                  +{mission.rewards.xp} XP
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tâches */}
        <div>
          <h3 className="font-bold text-yellow-400 mb-3">Objectifs:</h3>
          <div className="space-y-3">
            {mission.tasks.map((task, idx) => (
              <div
                key={idx}
                className="bg-black/40 p-3 rounded-lg border-l-4 border-yellow-600/50"
              >
                <p className="font-semibold text-yellow-200">{task.title}</p>
                <p className="text-sm text-yellow-600/60 mt-1">
                  {task.description}
                </p>
                <p className="text-xs text-yellow-600/50 mt-2">
                  Objectif: {task.goal} {task.type}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {!isLocked && !isCompleted && (
          <button
            onClick={onComplete}
            className="mt-6 w-full bg-yellow-600/40 hover:bg-yellow-600/60 text-yellow-300 font-bold py-3 px-4 rounded-lg transition border border-yellow-600/60"
          >
            ✅ Marquer comme complétée (TEST)
          </button>
        )}

        <button
          onClick={onClose}
          className="mt-2 w-full bg-black/40 hover:bg-black/50 text-yellow-600 font-bold py-2 px-4 rounded-lg transition border border-yellow-600/30"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
