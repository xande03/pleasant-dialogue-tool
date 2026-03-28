import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Play, Pause, SkipBack, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import TrackControls, { type Track } from "./TrackControls";

interface AudioPlayerProps {
  file: File;
  onReset: () => void;
}

const DEFAULT_TRACKS: Omit<Track, "volume" | "muted" | "solo">[] = [
  { id: "vocals", name: "Vocais", color: "hsl(160, 84%, 39%)" },
  { id: "drums", name: "Bateria", color: "hsl(280, 60%, 55%)" },
  { id: "bass", name: "Baixo", color: "hsl(25, 95%, 53%)" },
  { id: "other", name: "Outros", color: "hsl(200, 80%, 55%)" },
];

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const AudioPlayer = ({ file, onReset }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [tracks, setTracks] = useState<Track[]>(
    DEFAULT_TRACKS.map((t) => ({ ...t, volume: 80, muted: false, solo: false }))
  );

  const anySolo = tracks.some((t) => t.solo);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("ended", () => setIsPlaying(false));

    return () => {
      audio.pause();
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seek = useCallback(([val]: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = val;
    setCurrentTime(val);
  }, []);

  const restart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
  }, []);

  const handleVolumeChange = useCallback((id: string, volume: number) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, volume } : t)));
  }, []);

  const handleMuteToggle = useCallback((id: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, muted: !t.muted } : t))
    );
  }, []);

  const handleSoloToggle = useCallback((id: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, solo: !t.solo } : t))
    );
  }, []);

  // Compute effective volume based on mute/solo state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // For the demo, we simulate by adjusting the master volume
    // based on which tracks are "audible"
    const audibleTracks = tracks.filter(
      (t) => (anySolo ? t.solo : !t.muted)
    );
    const avgVolume =
      audibleTracks.length > 0
        ? audibleTracks.reduce((sum, t) => sum + t.volume, 0) /
          (audibleTracks.length * 100)
        : 0;
    audio.volume = Math.min(1, avgVolume);
  }, [tracks, anySolo]);

  // Waveform visualization
  const waveformBars = 80;
  const [waveData] = useState(() =>
    Array.from({ length: waveformBars }, () => 0.15 + Math.random() * 0.85)
  );
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto px-4 py-8 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold truncate max-w-md">{file.name}</h2>
          <p className="text-sm text-muted-foreground">
            {(file.size / (1024 * 1024)).toFixed(1)} MB
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Nova música
        </Button>
      </div>

      {/* Waveform */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-end gap-[2px] h-24 w-full">
          {waveData.map((h, i) => {
            const barProgress = i / waveformBars;
            const isPast = barProgress < progress;
            return (
              <div
                key={i}
                className="flex-1 rounded-sm transition-colors duration-100"
                style={{
                  height: `${h * 100}%`,
                  backgroundColor: isPast
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted))",
                }}
              />
            );
          })}
        </div>

        {/* Seek bar */}
        <div className="mt-3">
          <Slider
            value={[currentTime]}
            max={duration || 1}
            step={0.1}
            onValueChange={seek}
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Transport controls */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button variant="ghost" size="icon" onClick={restart}>
            <SkipBack className="w-5 h-5" />
          </Button>
          <Button
            onClick={togglePlay}
            size="icon"
            className="w-12 h-12 rounded-full glow-primary"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Track Controls */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Faixas
        </h3>
        {tracks.map((track, i) => (
          <motion.div
            key={track.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <TrackControls
              track={track}
              onVolumeChange={handleVolumeChange}
              onMuteToggle={handleMuteToggle}
              onSoloToggle={handleSoloToggle}
              anySolo={anySolo}
            />
          </motion.div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground pt-4">
        💡 A separação real de instrumentos requer processamento por IA no servidor.
        Esta é uma demo da interface.
      </p>
    </motion.div>
  );
};

export default AudioPlayer;
