import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Play, Pause, SkipBack, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import TrackControls, { type Track } from "./TrackControls";
import { type AudioJob, getTrackUrl } from "@/lib/audio-service";

interface AudioPlayerProps {
  file: File;
  job: AudioJob;
  onReset: () => void;
}

const TRACK_DEFS: { id: string; name: string; color: string }[] = [
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

const AudioPlayer = ({ file, job, onReset }: AudioPlayerProps) => {
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [tracks, setTracks] = useState<Track[]>(
    TRACK_DEFS.map((t) => ({ ...t, volume: 80, muted: false, solo: false }))
  );

  const anySolo = tracks.some((t) => t.solo);

  // Initialize audio elements for each separated track
  useEffect(() => {
    const refs: Record<string, HTMLAudioElement> = {};
    const trackPaths = job.tracks || {};

    TRACK_DEFS.forEach((def) => {
      const path = trackPaths[def.id];
      if (path) {
        const url = getTrackUrl(path);
        const audio = new Audio(url);
        audio.crossOrigin = "anonymous";
        refs[def.id] = audio;
      }
    });

    // Use first available track for timing
    const firstAudio = Object.values(refs)[0];
    if (firstAudio) {
      firstAudio.addEventListener("loadedmetadata", () =>
        setDuration(firstAudio.duration)
      );
      firstAudio.addEventListener("timeupdate", () =>
        setCurrentTime(firstAudio.currentTime)
      );
      firstAudio.addEventListener("ended", () => setIsPlaying(false));
    }

    audioRefs.current = refs;

    return () => {
      Object.values(refs).forEach((a) => {
        a.pause();
        a.src = "";
      });
    };
  }, [job.tracks]);

  // Sync volumes with track state
  useEffect(() => {
    tracks.forEach((track) => {
      const audio = audioRefs.current[track.id];
      if (!audio) return;
      const isAudible = anySolo ? track.solo : !track.muted;
      audio.volume = isAudible ? track.volume / 100 : 0;
    });
  }, [tracks, anySolo]);

  const togglePlay = useCallback(() => {
    const audios = Object.values(audioRefs.current);
    if (isPlaying) {
      audios.forEach((a) => a.pause());
    } else {
      audios.forEach((a) => a.play().catch(() => {}));
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seek = useCallback(([val]: number[]) => {
    Object.values(audioRefs.current).forEach((a) => {
      a.currentTime = val;
    });
    setCurrentTime(val);
  }, []);

  const restart = useCallback(() => {
    Object.values(audioRefs.current).forEach((a) => {
      a.currentTime = 0;
    });
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

  const handleDownload = useCallback(
    (trackId: string) => {
      const path = job.tracks?.[trackId];
      if (!path) return;
      const url = getTrackUrl(path);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.[^.]+$/, "")}_${trackId}.wav`;
      a.click();
    },
    [job.tracks, file.name]
  );

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
            {(file.size / (1024 * 1024)).toFixed(1)} MB · Separado por IA
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

        <div className="mt-3">
          <Slider
            value={[currentTime]}
            max={duration || 1}
            step={0.1}
            onValueChange={seek}
          />
        </div>

        <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

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
          Faixas separadas
        </h3>
        {tracks.map((track, i) => (
          <motion.div
            key={track.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2"
          >
            <div className="flex-1">
              <TrackControls
                track={track}
                onVolumeChange={handleVolumeChange}
                onMuteToggle={handleMuteToggle}
                onSoloToggle={handleSoloToggle}
                anySolo={anySolo}
              />
            </div>
            {job.tracks?.[track.id] && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownload(track.id)}
                className="shrink-0"
                title="Baixar faixa"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default AudioPlayer;
