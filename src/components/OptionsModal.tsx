type OptionsModalProps = {
  muted: boolean;
  volume: number;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
};

export default function OptionsModal({
  muted,
  volume,
  setMuted,
  setVolume,
}: OptionsModalProps) {
  return (
    <div className="grid grid-cols-1 gap-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="accent-emerald-600 h-4 w-4"
            checked={!muted}
            onChange={(e) => setMuted(!e.target.checked)}
          />
          <span>Activer le son</span>
        </label>
        <span className="text-xs text-zinc-400">
          {!muted ? "Activé" : "Muet"}
        </span>
      </div>
      <div>
        <label className="text-xs text-zinc-400">Volume ({volume}%)</label>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full accent-emerald-600"
        />
      </div>
    </div>
  );
}
