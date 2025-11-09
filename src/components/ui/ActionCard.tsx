import React from "react";

interface ActionCardProps {
  icon: string;
  title: string;
  desc: string | React.ReactNode;
  buttonText: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

export function ActionCard({
  icon,
  title,
  desc,
  buttonText,
  onClick,
  disabled = false,
  danger = false,
}: ActionCardProps) {
  return (
    <div className="bg-black/50 border border-yellow-600/30 rounded-xl p-4 hover:border-yellow-600 hover:bg-black/70 transition">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <div className="text-sm font-bold text-yellow-600">{title}</div>
      </div>
      <div className="text-xs text-zinc-400 mb-3">{desc}</div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full px-3 py-2 rounded-lg font-bold transition ${
          danger
            ? "bg-linear-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700"
            : "bg-linear-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {buttonText}
      </button>
    </div>
  );
}
