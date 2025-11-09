import React, { useEffect } from "react";
import type { Generator, GeneratorKey, StaffMember } from "../../domain/types";
import { Avatar } from "./Avatar";

interface StaffListWithPaginationProps {
  staff: StaffMember[];
  assignments: Record<string, GeneratorKey | null>;
  equipped: Record<string, string | null>;
  gens: Record<GeneratorKey, Generator>;
  isLocked: boolean;
  onStaffDragStart: (e: React.DragEvent, id: string) => void;
  onMouseEnter: (id: string) => (e: React.MouseEvent) => void;
  onMouseMove: (id: string) => (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

export function StaffListWithPagination({
  staff,
  assignments,
  equipped,
  gens,
  isLocked,
  onStaffDragStart,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}: StaffListWithPaginationProps) {
  const [page, setPage] = React.useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(staff.length / pageSize));
  const start = (page - 1) * pageSize;
  const current = staff.slice(start, start + pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="text-zinc-300">
          Page {page}/{totalPages} • {staff.length} membres
        </div>
        <div className="space-x-2">
          <button
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ◀
          </button>
          <button
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            ▶
          </button>
        </div>
      </div>
      <div className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-yellow-600 scrollbar-track-black/30">
        {current.map((char) => (
          <div
            key={char.id}
            className="bg-black/50 border border-yellow-600/20 rounded-xl p-3 hover:border-yellow-600 hover:translate-x-1 transition cursor-grab"
            draggable={!isLocked}
            onDragStart={(e) => onStaffDragStart(e, char.id)}
            onMouseEnter={onMouseEnter(char.id)}
            onMouseMove={onMouseMove(char.id)}
            onMouseLeave={onMouseLeave}
          >
            <div className="flex items-center gap-3 mb-2">
              <Avatar
                size={40}
                name={char.id}
                variant="beam"
                colors={["#d4af37", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981"]}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{char.name}</div>
                <div className="text-xs text-yellow-600">{char.role}</div>
                {assignments[char.id] && (
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-600/20 text-yellow-300 border border-yellow-600/50">
                    Assigné à {gens[assignments[char.id] as GeneratorKey].name}
                  </div>
                )}
                {equipped[char.id] && (
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 border border-red-600/50 ml-2">
                    Armé
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {["🎭", "💪", "🧠", "🤝"].map((icon, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span>{icon}</span>
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-yellow-600 to-yellow-300 rounded-full transition-all"
                      style={{ width: `${char.stats[i]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
