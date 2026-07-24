import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Play, Pause } from "lucide-react";

interface MetronomeProps {
  bpm: number | null;
}

const Metronome = ({ bpm }: MetronomeProps) => {
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const beatRef = useRef(0);

  useEffect(() => {
    if (!playing || !bpm) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (!ctxRef.current) ctxRef.current = new AudioContext();
    const ctx = ctxRef.current;
    ctx.resume();

    const intervalMs = 60000 / bpm;
    beatRef.current = 0;

    const tick = () => {
      const isDownbeat = beatRef.current % 4 === 0;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = isDownbeat ? 1200 : 800;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);

      setBeat(beatRef.current % 4);
      beatRef.current++;
    };

    tick();
    timerRef.current = window.setInterval(tick, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, bpm]);

  if (!bpm) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-mono">Detectando BPM...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2">
      <button
        onClick={() => setPlaying(!playing)}
        className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110"
        aria-label="Metrônomo"
      >
        {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
      </button>
      <div>
        <div className="text-xs text-muted-foreground leading-tight">BPM</div>
        <div className="text-sm font-mono font-bold leading-tight">{bpm}</div>
      </div>
      <div className="flex gap-1 ml-1">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            animate={{
              backgroundColor:
                playing && beat === i
                  ? i === 0
                    ? "hsl(var(--primary))"
                    : "hsl(var(--accent))"
                  : "hsl(var(--muted))",
              scale: playing && beat === i ? 1.3 : 1,
            }}
            transition={{ duration: 0.1 }}
          />
        ))}
      </div>
    </div>
  );
};

export default Metronome;
