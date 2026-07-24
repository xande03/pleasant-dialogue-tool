import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, Sliders } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { TrackEffects, AutomationLane as Lane } from "@/lib/audio-engine";
import AutomationLane from "./AutomationLane";

export interface TrackMeta {
  id: string;
  name: string;
  color: string;
}

interface TrackControlsProps {
  meta: TrackMeta;
  fx: TrackEffects;
  onChange: (patch: Partial<TrackEffects>) => void;
  anySolo: boolean;
  duration: number;
  currentTime: number;
}

const TrackControls = ({ meta, fx, onChange, anySolo }: TrackControlsProps) => {
  const [expanded, setExpanded] = useState(false);
  const audible = fx.solo || (!anySolo && !fx.muted);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-xl bg-card border border-border transition-opacity duration-200 ${
        !audible ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-center gap-3 p-4">
        <div
          className="w-1 h-12 rounded-full shrink-0"
          style={{ backgroundColor: meta.color }}
        />
        <span className="text-sm font-medium w-20 shrink-0 truncate">
          {meta.name}
        </span>

        <button
          onClick={() => onChange({ muted: !fx.muted })}
          className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${
            fx.muted
              ? "bg-destructive/20 text-destructive"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Mute"
        >
          {fx.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={() => onChange({ solo: !fx.solo })}
          className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
            fx.solo
              ? "text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
          style={fx.solo ? { backgroundColor: meta.color } : {}}
        >
          S
        </button>

        <div className="flex-1 min-w-0">
          <Slider
            value={[fx.volume]}
            max={100}
            step={1}
            onValueChange={([v]) => onChange({ volume: v })}
          />
        </div>

        <span className="text-xs text-muted-foreground font-mono w-10 text-right shrink-0">
          {fx.volume}%
        </span>

        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${
            expanded
              ? "bg-primary/20 text-primary"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Efeitos"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/50 grid grid-cols-2 gap-x-6 gap-y-3">
              <EQKnob label="Low" value={fx.low} onChange={(v) => onChange({ low: v })} />
              <EQKnob label="Mid" value={fx.mid} onChange={(v) => onChange({ mid: v })} />
              <EQKnob label="High" value={fx.high} onChange={(v) => onChange({ high: v })} />
              <FxKnob
                label="Reverb"
                value={fx.reverb}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => onChange({ reverb: v })}
              />
              <div className="col-span-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Pan</span>
                  <span className="font-mono">
                    {fx.pan === 0 ? "C" : fx.pan < 0 ? `L${Math.round(-fx.pan * 100)}` : `R${Math.round(fx.pan * 100)}`}
                  </span>
                </div>
                <Slider
                  value={[fx.pan * 100]}
                  min={-100}
                  max={100}
                  step={1}
                  onValueChange={([v]) => onChange({ pan: v / 100 })}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const EQKnob = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => (
  <FxKnob label={label} value={value} min={-12} max={12} unit="dB" onChange={onChange} />
);

const FxKnob = ({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) => (
  <div>
    <div className="flex justify-between text-xs text-muted-foreground mb-1">
      <span>{label}</span>
      <span className="font-mono">
        {value > 0 && unit === "dB" ? "+" : ""}
        {value}
        {unit}
      </span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={1}
      onValueChange={([v]) => onChange(v)}
    />
  </div>
);

export default TrackControls;
