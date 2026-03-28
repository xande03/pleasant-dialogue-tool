import { motion } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export interface Track {
  id: string;
  name: string;
  color: string;
  volume: number;
  muted: boolean;
  solo: boolean;
}

interface TrackControlsProps {
  track: Track;
  onVolumeChange: (id: string, volume: number) => void;
  onMuteToggle: (id: string) => void;
  onSoloToggle: (id: string) => void;
  anySolo: boolean;
}

const TrackControls = ({
  track,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  anySolo,
}: TrackControlsProps) => {
  const isAudible = track.solo || (!anySolo && !track.muted);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        flex items-center gap-4 p-4 rounded-xl bg-card border border-border
        transition-opacity duration-200
        ${!isAudible ? "opacity-40" : ""}
      `}
    >
      {/* Color indicator */}
      <div
        className="w-1 h-12 rounded-full shrink-0"
        style={{ backgroundColor: track.color }}
      />

      {/* Track name */}
      <span className="text-sm font-medium w-20 shrink-0 truncate">
        {track.name}
      </span>

      {/* Mute button */}
      <button
        onClick={() => onMuteToggle(track.id)}
        className={`
          w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0
          transition-colors duration-150
          ${track.muted
            ? "bg-destructive/20 text-destructive"
            : "bg-secondary text-muted-foreground hover:text-foreground"
          }
        `}
      >
        {track.muted ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>

      {/* Solo button */}
      <button
        onClick={() => onSoloToggle(track.id)}
        className={`
          w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0
          transition-colors duration-150
          ${track.solo
            ? "text-primary-foreground"
            : "bg-secondary text-muted-foreground hover:text-foreground"
          }
        `}
        style={track.solo ? { backgroundColor: track.color } : {}}
      >
        S
      </button>

      {/* Volume slider */}
      <div className="flex-1 min-w-0">
        <Slider
          value={[track.volume]}
          max={100}
          step={1}
          onValueChange={([v]) => onVolumeChange(track.id, v)}
          className="w-full"
        />
      </div>

      {/* Volume % */}
      <span className="text-xs text-muted-foreground font-mono w-10 text-right shrink-0">
        {track.volume}%
      </span>
    </motion.div>
  );
};

export default TrackControls;
