import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gauge, Sparkles, Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { MasterSettings } from "@/lib/audio-engine";

interface Props {
  master: MasterSettings;
  onChange: (patch: Partial<MasterSettings>) => void;
  onNormalize: () => void;
  normalizing: boolean;
}

const MasterControls = ({ master, onChange, onNormalize, normalizing }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl bg-card border border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Master</span>
          <span className="text-xs text-muted-foreground font-mono">
            {master.gain}% · {master.limiterEnabled ? `Lim ${master.limiterThreshold} dB` : "Sem lim"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "−" : "+"}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/50 space-y-3">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Volume Master</span>
                  <span className="font-mono">{master.gain}%</span>
                </div>
                <Slider
                  value={[master.gain]}
                  min={0}
                  max={200}
                  step={1}
                  onValueChange={([v]) => onChange({ gain: v })}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-medium">Limiter</div>
                  <div className="text-[10px] text-muted-foreground">
                    Evita clipping no output final
                  </div>
                </div>
                <button
                  onClick={() => onChange({ limiterEnabled: !master.limiterEnabled })}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase transition-colors ${
                    master.limiterEnabled
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {master.limiterEnabled ? "ON" : "OFF"}
                </button>
              </div>

              <div className={master.limiterEnabled ? "" : "opacity-40 pointer-events-none"}>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Ceiling</span>
                  <span className="font-mono">{master.limiterThreshold} dB</span>
                </div>
                <Slider
                  value={[master.limiterThreshold]}
                  min={-24}
                  max={0}
                  step={0.5}
                  onValueChange={([v]) => onChange({ limiterThreshold: v })}
                />
              </div>

              <button
                onClick={onNormalize}
                disabled={normalizing}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-secondary hover:bg-secondary/80 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {normalizing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Normalizar (auto)
              </button>
              <p className="text-[10px] text-muted-foreground -mt-1">
                Analisa o mix e ajusta o volume master para pico em −1 dBFS.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MasterControls;
