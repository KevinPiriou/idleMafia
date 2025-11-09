interface AvatarProps {
  name: string;
  size: number;
  variant?: string;
  colors?: string[];
}

export function Avatar({ name, size, variant, colors }: AvatarProps) {
  const safeName = name || "?";
  const defaultColors = ["#d4af37", "#f59e0b", "#ef4444", "#8b5cf6", "#10b981"];
  const hash = safeName
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const palette = colors ?? defaultColors;
  const bgColor = palette[hash % palette.length];
  const extraStyle =
    variant === "beam"
      ? { boxShadow: "inset 0 0 8px rgba(255,255,255,0.06)" }
      : {};
  const initial = safeName.charAt(0).toUpperCase() || "?";

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white border-2 border-yellow-600"
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        fontSize: size * 0.5,
        ...extraStyle,
      }}
    >
      {initial}
    </div>
  );
}
