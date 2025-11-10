import { useMemo, useState } from "react";
import type { EventLogEntry } from "../domain/types";

const KINDS: EventLogEntry["kind"][] = [
  "event",
  "war",
  "economy",
  "system",
  "upgrade",
  "prestige",
];

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFull(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventJournal({
  entries,
  onClose,
  onClear,
}: {
  entries: EventLogEntry[];
  onClose: () => void;
  onClear?: () => void;
}) {
  // UI state
  const [query, setQuery] = useState("");
  const [activeKinds, setActiveKinds] = useState<Set<EventLogEntry["kind"]>>(
    () => new Set()
  );

  const toggleKind = (k: EventLogEntry["kind"]) => {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const clearFilters = () => {
    setQuery("");
    setActiveKinds(new Set());
  };

  const exportJSON = () => {
    try {
      const blob = new Blob([JSON.stringify(entries, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `journal-${new Date().toISOString().slice(0, 19)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // no-op
    }
  };

  // 1) Ordonner récent -> ancien
  const ordered = useMemo(
    () => [...entries].sort((a, b) => b.ts - a.ts),
    [entries]
  );

  // 2) Filtrer par kinds + recherche texte
  const filtered = useMemo(() => {
    const hasKindFilter = activeKinds.size > 0;
    const q = query.trim().toLowerCase();
    return ordered.filter((e) => {
      if (hasKindFilter && !activeKinds.has(e.kind)) return false;
      if (!q) return true;
      const hay = `${e.title} ${e.summary} ${(e.tags || []).join(" ")} ${(
        e.details || []
      ).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [ordered, activeKinds, query]);

  // 3) Grouper par jour lisible
  const groups = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const map = new Map<string, EventLogEntry[]>();
    for (const e of filtered) {
      const key = fmt.format(new Date(e.ts));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-6xl mx-4 rounded-2xl overflow-hidden border-2 border-yellow-600 shadow-[0_10px_40px_rgba(212,175,55,0.25)]">
        {/* Header */}
        <div className="bg-linear-to-r from-black/90 via-amber-900/30 to-black/90 px-6 py-4">
          <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
            <div>
              <div className="text-[11px] tracking-[0.2em] uppercase text-yellow-400/70">
                Gazette criminelle
              </div>
              <div className="text-3xl md:text-4xl font-serif font-extrabold text-yellow-200 drop-shadow">
                Journal des événements
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportJSON}
                className="px-3 py-1.5 rounded-md border border-yellow-600/40 bg-black/40 text-yellow-200 hover:bg-yellow-600/10 transition"
                title="Exporter en JSON"
              >
                Exporter JSON
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-md border border-yellow-600/40 bg-black/40 text-yellow-200 hover:bg-yellow-600/10 transition"
              >
                Fermer
              </button>
              {onClear && (
                <button
                  onClick={onClear}
                  className="px-3 py-1.5 rounded-md border border-red-500/50 bg-red-900/30 text-red-200 hover:bg-red-800/40 transition"
                >
                  Effacer le journal
                </button>
              )}
            </div>
          </div>

          {/* Toolbar filtres */}
          <div className="mt-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={clearFilters}
                className={`text-[12px] px-2 py-1 rounded border ${
                  activeKinds.size === 0 && query === ""
                    ? "bg-yellow-600/20 border-yellow-600 text-yellow-200"
                    : "bg-black/40 border-yellow-700/40 text-yellow-200 hover:bg-yellow-700/10"
                }`}
                title="Réinitialiser filtres & recherche"
              >
                Tous
              </button>
              {KINDS.map((k) => {
                const active = activeKinds.has(k);
                return (
                  <button
                    key={k}
                    onClick={() => toggleKind(k)}
                    className={`text-[12px] px-2 py-1 rounded border ${
                      active
                        ? "bg-yellow-600/20 border-yellow-600 text-yellow-200"
                        : "bg-black/40 border-yellow-700/40 text-yellow-200 hover:bg-yellow-700/10"
                    }`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher titre, tags, texte…"
                className="w-full md:w-80 px-3 py-1.5 rounded-md border border-yellow-700/40 bg-black/40 text-yellow-100 placeholder:text-yellow-200/40 outline-none focus:border-yellow-500"
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="bg-[#0a0a0a]/95 backdrop-blur-sm p-6 max-h-[70vh] overflow-auto">
          {groups.length === 0 ? (
            <div className="text-center text-zinc-300 italic py-16">
              Aucun événement ne correspond à vos filtres.
            </div>
          ) : (
            groups.map(([dayTitle, dayEntries]) => (
              <section key={dayTitle} className="mb-8">
                {/* Jour */}
                <div className="sticky top-0 z-10 -mx-6 px-6 py-2 mb-4 bg-black/50 backdrop-blur border-l-2 border-r-2 border-yellow-600/30">
                  <div className="text-sm uppercase tracking-wider text-yellow-400">
                    {dayTitle}
                  </div>
                </div>

                {/* Grille */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {dayEntries.map((e) => (
                    <article
                      key={e.id}
                      className="rounded-xl border border-yellow-600/30 bg-black/60 hover:bg-black/70 transition shadow-md p-4"
                    >
                      <header className="mb-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] uppercase tracking-wider font-semibold ${
                              e.kind === "war"
                                ? "text-red-400"
                                : e.kind === "event"
                                ? "text-indigo-300"
                                : e.kind === "prestige"
                                ? "text-amber-300"
                                : "text-zinc-300"
                            }`}
                          >
                            {e.kind}
                          </span>
                          <time
                            title={formatFull(e.ts)}
                            className="text-[10px] text-zinc-400"
                          >
                            {formatTime(e.ts)}
                          </time>
                        </div>
                        <h3 className="text-xl font-serif font-extrabold leading-snug mt-1 text-yellow-100">
                          {e.title}
                        </h3>
                        {e.tags && e.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {e.tags.map((t, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-600/10 border border-yellow-600/30 text-yellow-200"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </header>

                      <p className="text-[15px] leading-relaxed mt-1 text-zinc-200">
                        {e.summary}
                      </p>
                      {e.details && e.details.length > 0 && (
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-[14px] text-zinc-300">
                          {e.details.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      )}

                      {e.deltas &&
                        (e.deltas.cash ||
                          e.deltas.respect ||
                          e.deltas.heat ||
                          e.deltas.tension) && (
                          <div className="mt-3 text-[13px] text-zinc-300">
                            {typeof e.deltas.cash === "number" && (
                              <span className="mr-3">
                                💰 {e.deltas.cash >= 0 ? "+" : ""}
                                {e.deltas.cash}
                              </span>
                            )}
                            {typeof e.deltas.respect === "number" && (
                              <span className="mr-3">
                                👑 {e.deltas.respect >= 0 ? "+" : ""}
                                {e.deltas.respect}
                              </span>
                            )}
                            {typeof e.deltas.heat === "number" && (
                              <span className="mr-3">
                                🔥 {e.deltas.heat >= 0 ? "+" : ""}
                                {e.deltas.heat}
                              </span>
                            )}
                            {typeof e.deltas.tension === "number" && (
                              <span className="mr-3">
                                ⚠️ {e.deltas.tension >= 0 ? "+" : ""}
                                {e.deltas.tension}
                              </span>
                            )}
                          </div>
                        )}
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
