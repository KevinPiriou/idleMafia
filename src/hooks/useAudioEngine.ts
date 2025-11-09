import { useEffect, useRef, useState } from "react";

export default function useAudioEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const bgGainRef = useRef<GainNode | null>(null);
  const sfxGainRef = useRef<GainNode | null>(null);
  const loopTimerRef = useRef<number | null>(null);
  const reelTimerRef = useRef<number | null>(null);
  const [enabled, setEnabled] = useState<boolean>(false);
  const volRef = useRef<number>(1);
  const BG_BASE = 0.2;
  const SFX_BASE = 0.5;

  const ensureCtx = async () => {
    if (ctxRef.current) return ctxRef.current;
    const ctx: AudioContext = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    const bgGain = ctx.createGain();
    bgGain.gain.value = BG_BASE * volRef.current;
    bgGain.connect(master);
    const sfxGain = ctx.createGain();
    sfxGain.gain.value = SFX_BASE * volRef.current;
    sfxGain.connect(master);
    ctxRef.current = ctx;
    bgGainRef.current = bgGain;
    sfxGainRef.current = sfxGain;
    return ctx;
  };

  const stopBgLoop = () => {
    if (loopTimerRef.current != null) {
      window.clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
    }
  };

  const startBgLoop = async () => {
    const ctx = await ensureCtx();
    stopBgLoop();
    const scale = [0, 3, 5, 7, 10];
    const root = 196;
    let step = 0;
    loopTimerRef.current = window.setInterval(() => {
      if (!bgGainRef.current) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      const deg = scale[step++ % scale.length];
      osc.frequency.value = root * Math.pow(2, deg / 12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(g);
      g.connect(bgGainRef.current!);
      osc.start(t);
      osc.stop(t + 0.5);
    }, 600);
  };

  const applyGains = (muted: boolean) => {
    if (!bgGainRef.current || !sfxGainRef.current) return;
    bgGainRef.current.gain.value = muted ? 0 : BG_BASE * volRef.current;
    sfxGainRef.current.gain.value = muted ? 0 : SFX_BASE * volRef.current;
  };

  const setMuted = async (m: boolean) => {
    await ensureCtx();
    applyGains(m);
    setEnabled(!m);
  };
  const setVolume = async (v: number) => {
    volRef.current = Math.max(0, Math.min(1, v));
    await ensureCtx();
    applyGains(!enabled);
  };

  const playCash = async () => {
    await ensureCtx();
    if (!sfxGainRef.current || !ctxRef.current) return;
    const ctx = ctxRef.current;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.07);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(g);
    g.connect(sfxGainRef.current);
    osc.start(t);
    osc.stop(t + 0.16);
  };

  const playOmerta = async () => {
    await ensureCtx();
    if (!sfxGainRef.current || !ctxRef.current) return;
    const ctx = ctxRef.current;
    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();
    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.value = 196;
    osc2.frequency.value = 196 * 0.98;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    osc1.connect(g);
    osc2.connect(g);
    g.connect(sfxGainRef.current);
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.25);
    osc2.stop(t + 1.25);
  };
  const startReelSound = async () => {
    const ctx = await ensureCtx();
    stopReelSound();
    reelTimerRef.current = window.setInterval(() => {
      if (!sfxGainRef.current) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(1200, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(g);
      g.connect(sfxGainRef.current);
      osc.start(t);
      osc.stop(t + 0.06);
    }, 90) as unknown as number;
  };
  const stopReelSound = () => {
    if (reelTimerRef.current != null) {
      window.clearInterval(reelTimerRef.current);
      reelTimerRef.current = null;
    }
  };

  const playDropWin = async (rarity: string) => {
    const ctx = await ensureCtx();
    if (!sfxGainRef.current) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    const freq =
      rarity === "legendary"
        ? 880
        : rarity === "epic"
        ? 660
        : rarity === "rare"
        ? 520
        : rarity === "uncommon"
        ? 440
        : 360;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    osc.connect(g);
    g.connect(sfxGainRef.current);
    osc.start(t);
    osc.stop(t + 0.42);
  };

  const enable = async () => {
    await ensureCtx();
    setEnabled(true);
    applyGains(false);
    startBgLoop();
  };
  const disable = () => {
    setEnabled(false);
    stopBgLoop();
    applyGains(true);
  };
  useEffect(() => {
    return () => {
      setEnabled(false);
      if (loopTimerRef.current != null) {
        window.clearInterval(loopTimerRef.current);
        loopTimerRef.current = null;
      }
      if (bgGainRef.current) bgGainRef.current.gain.value = 0;
      if (sfxGainRef.current) sfxGainRef.current.gain.value = 0;
    };
  }, []);

  return {
    enabled,
    enable,
    disable,
    setMuted,
    setVolume,
    playCash,
    playOmerta,
    startReelSound,
    stopReelSound,
    playDropWin,
  };
}
