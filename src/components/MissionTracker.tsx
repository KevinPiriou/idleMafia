import { getAllMissionsWithStatus } from "../domain/missions";
import { calculateTaskProgress } from "../domain/missions";
import type { SaveState } from "../domain/types";
import type { MissionProgress, Mission } from "../domain/missions";

interface MissionTrackerProps {
  state: SaveState;
  onOpenMissions?: () => void;
}

export function MissionTracker({ state, onOpenMissions }: MissionTrackerProps) {
  const missionsWithStatus = getAllMissionsWithStatus(state);
  const activeMissions = missionsWithStatus.filter(
    (m) => m.status === "active"
  );
  const completedCount = missionsWithStatus.filter(
    (m) => m.status === "completed"
  ).length;

  // Afficher max 3 missions actives
  const displayedMissions = activeMissions.slice(0, 3);

  if (activeMissions.length === 0) {
    return (
      <div className="relative group">
        <div
          role="button"
          onClick={onOpenMissions}
          className="cursor-pointer rounded-xl border-2 border-yellow-600/60
                     bg-black/60 hover:bg-yellow-600/10 transition px-4 py-3
                     min-w-[200px] shadow-[0_4px_20px_rgba(212,175,55,0.08)]"
        >
          <div className="text-[11px] uppercase tracking-wider text-yellow-500 flex items-center gap-2">
            <span className="text-yellow-400">📋</span> Missions
          </div>
          <div className="text-lg font-bold text-yellow-100">
            {completedCount} complétée{completedCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div
        role="button"
        onClick={onOpenMissions}
        className="cursor-pointer rounded-xl border-2 border-yellow-600/60
                   bg-black/60 hover:bg-yellow-600/10 transition px-4 py-3
                   min-w-[280px] shadow-[0_4px_20px_rgba(212,175,55,0.08)]"
      >
        <div className="text-[11px] uppercase tracking-wider text-yellow-500 flex items-center gap-2">
          <span className="text-yellow-400">📋</span> Missions
          {activeMissions.length > 0 && (
            <span
              className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1
                          rounded-full text-[11px] bg-amber-600 text-white border border-amber-300"
            >
              {activeMissions.length}
            </span>
          )}
        </div>

        {/* Mini mission list */}
        <div className="mt-2 space-y-1.5">
          {displayedMissions.map((missionData) => (
            <MissionProgressBar
              key={missionData.mission.id}
              mission={missionData.mission}
              progress={missionData.progress}
              state={state}
            />
          ))}
          {activeMissions.length > 3 && (
            <div className="text-[10px] text-yellow-600/60 px-2 py-1 italic">
              +{activeMissions.length - 3} autre
              {activeMissions.length - 3 > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Tooltip avec toutes les missions - Style StatBox */}
      <div
        className="absolute left-0 top-[calc(100%+8px)] z-50 hidden
                    group-hover:block"
      >
        <div
          className="rounded-xl border-2 border-yellow-600 bg-black/60 backdrop-blur-sm
                      shadow-[0_5px_20px_rgba(212,175,55,0.4)] p-5 min-w-[380px]"
        >
          {/* Header */}
          <div className="text-[11px] uppercase tracking-wider text-yellow-600 mb-3">
            Missions Actives ({activeMissions.length})
          </div>

          {/* Missions list */}
          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {activeMissions.map((missionData) => (
              <MissionTooltipItem
                key={missionData.mission.id}
                mission={missionData.mission}
                progress={missionData.progress}
                state={state}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MissionProgressBarProps {
  mission: Mission;
  progress: MissionProgress | undefined;
  state: SaveState;
}

function MissionProgressBar({
  mission,
  progress,
  state,
}: MissionProgressBarProps) {
  if (!progress || mission.tasks.length === 0) return null;

  const firstTask = mission.tasks[0];
  const taskProgress = calculateTaskProgress(state, firstTask);
  const percentage = Math.min((taskProgress / firstTask.goal) * 100, 100);

  return (
    <div className="text-[11px]">
      <div className="flex justify-between items-center mb-0.5 px-2">
        <span className="text-yellow-300 font-medium truncate max-w-[180px]">
          {mission.shortDesc}
        </span>
        <span className="text-yellow-600/70 ml-2 shrink-0">
          {taskProgress}/{firstTask.goal}
        </span>
      </div>
      <div
        className={`bg-black/40 rounded-full h-1.5 overflow-hidden border-2 ${
          percentage >= 100 ? "border-green-500/40" : "border-yellow-600/20"
        }`}
      >
        <div
          className={`h-full transition-all duration-300 ${
            percentage >= 100
              ? "bg-linear-to-r from-green-500 to-emerald-400"
              : "bg-linear-to-r from-yellow-500 to-amber-400"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface MissionTooltipItemProps {
  mission: Mission;
  progress: MissionProgress | undefined;
  state: SaveState;
}

function MissionTooltipItem({
  mission,
  progress,
  state,
}: MissionTooltipItemProps) {
  if (!progress || mission.tasks.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTasksComplete = mission.tasks.every((_task: any, idx: number) => {
    const currentProgress = progress.tasksProgress[idx] || 0;
    return currentProgress >= mission.tasks[idx].goal;
  });

  // Calcul du progrès global (moyenne de toutes les tâches)
  let globalProgress = 0;
  mission.tasks.forEach((task) => {
    const taskProgress = calculateTaskProgress(state, task);
    globalProgress += Math.min(taskProgress / task.goal, 1);
  });
  globalProgress = (globalProgress / mission.tasks.length) * 100;

  // Premier task pour affichage
  const firstTask = mission.tasks[0];
  const firstTaskProgress = calculateTaskProgress(state, firstTask);

  return (
    <div className="bg-black/40 border border-yellow-600/20 rounded-lg px-3 py-2">
      {/* Title & Status */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-[11px] font-semibold text-yellow-300">
            {mission.shortDesc}
          </div>
          <div className="text-[9px] text-yellow-600/60">{mission.title}</div>
        </div>
        {allTasksComplete && (
          <span className="text-sm text-green-400 ml-2 shrink-0">✓</span>
        )}
      </div>

      {/* Main Progress Bar */}
      <div className="mb-1.5">
        <div className="flex justify-between items-center mb-0.5">
          <span className="text-[10px] text-yellow-600/70">
            {firstTask.description}
          </span>
          <span className="text-[10px] text-yellow-600/70 ml-2 shrink-0">
            {firstTaskProgress}/{firstTask.goal}
          </span>
        </div>
        <div
          className={`bg-black/60 rounded-full h-2 overflow-hidden border ${
            globalProgress >= 100
              ? "border-green-500/40"
              : "border-yellow-600/20"
          }`}
        >
          <div
            className={`h-full transition-all duration-300 ${
              globalProgress >= 100 ? "bg-green-500" : "bg-yellow-500"
            }`}
            style={{ width: `${Math.min(globalProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Rewards inline */}
      {mission.tasks.length > 1 && (
        <div className="text-[9px] text-yellow-600/60 mb-1 italic">
          +{mission.tasks.length - 1} autre tâche
          {mission.tasks.length - 1 > 1 ? "s" : ""}
        </div>
      )}

      <div className="flex gap-2 text-[9px] text-yellow-600/70 flex-wrap mt-1.5 pt-1.5 border-t border-yellow-600/10">
        {mission.rewards.cash && (
          <span className="text-yellow-300">
            💰 +${(mission.rewards.cash / 1000).toFixed(0)}k
          </span>
        )}
        {mission.rewards.respect && (
          <span className="text-yellow-300">👑 +{mission.rewards.respect}</span>
        )}
        {mission.rewards.xp && (
          <span className="text-yellow-300">⭐ +{mission.rewards.xp}</span>
        )}
      </div>
    </div>
  );
}
