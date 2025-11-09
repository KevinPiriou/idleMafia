import React from "react";

interface CardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  fullHeight?: boolean;
}

export function Card({
  title,
  subtitle,
  children,
  fullHeight = false,
}: CardProps) {
  return (
    <div
      className={
        "relative bg-linear-to-br from-zinc-900/95 to-zinc-800/95 border-2 border-yellow-600/30 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-sm overflow-hidden " +
        (fullHeight ? "h-full flex flex-col" : "")
      }
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-yellow-600 to-transparent" />
      <div className="p-5 border-b border-yellow-600/20">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-yellow-600 uppercase tracking-wider">
            {title}
          </h2>
          {subtitle && (
            <span className="text-sm text-emerald-400 font-semibold">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <div
        className={"p-5 " + (fullHeight ? "flex-1 min-h-0 flex flex-col" : "")}
      >
        {children}
      </div>
    </div>
  );
}
