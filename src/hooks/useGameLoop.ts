import { useEffect, useRef } from "react";

/**
 * Lance un intervalle qui appelle onTick(dtSeconds) toutes les intervalMs.
 * dt est mesuré avec performance.now() et exprimé en secondes.
 */
export function useGameLoop(
  onTick: (dtSeconds: number) => void,
  intervalMs = 250
) {
  const last = useRef<number>(0);

  useEffect(() => {
    last.current = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last.current) / 1000;
      last.current = now;
      onTick(dt);
    }, intervalMs);

    return () => clearInterval(id);
  }, [onTick, intervalMs]);
}
