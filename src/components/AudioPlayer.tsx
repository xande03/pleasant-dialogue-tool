import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Play, Pause, SkipBack, RotateCcw, Download, Save, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import TrackControls, { type TrackMeta } from "./TrackControls";
import Metronome from "./Metronome";
import MasterControls from "./MasterControls";
import { type AudioJob, getTrackUrl } from "@/lib/audio-service";
import {
  AudioEngine,
  type TrackEffects,
  type MasterSettings,
  defaultEffects,
  defaultMaster,
} from "@/lib/audio-engine";
import { detectBPM } from "@/lib/bpm-detector";
import { saveProject, type SavedProject } from "@/lib/projects-store";
import { renderMix, audioBufferToWav, downloadBlob, computeMixPeak } from "@/lib/mix-exporter";

interface AudioPlayerProps {
  file: { name: string; size?: number };
  job: AudioJob;
  initialEffects?: Record<string, TrackEffects>;
  initialBpm?: number | null;
  onReset: () => void;
  onSaved?: () => void;
}

const TRACK_DEFS: TrackMeta[] = [
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

const normalizeEffects = (fx: TrackEffects): TrackEffects => ({
  ...defaultEffects(),
  ...fx,
  automation: {
    volume:
      fx.automation?.volume ?? { enabled: false, points: [] },
    pan: fx.automation?.pan ?? { enabled: false, points: [] },
  },
});

const AudioPlayer = ({
  file,
  job,
  initialEffects,
  initialBpm = null,
  onReset,
  onSaved,
}: AudioPlayerProps) => {
  const engineRef = useRef<AudioEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bpm, setBpm] = useState<number | null>(initialBpm);
  const [effects, setEffects] = useState<Record<string, TrackEffects>>(
    () =>
      initialEffects
        ? Object.fromEntries(
            TRACK_DEFS.map((t) => [t.id, normalizeEffects(initialEffects[t.id] ?? defaultEffects())])
          )
        : Object.fromEntries(TRACK_DEFS.map((t) => [t.id, defaultEffects()]))
  );
  const [master, setMaster] = useState<MasterSettings>(defaultMaster);
  const [normalizing, setNormalizing] = useState(false);

  const effectsRef = useRef(effects);
  effectsRef.current = effects;
  const anySolo = Object.values(effects).some((e) => e.solo);
  const anySoloRef = useRef(anySolo);
  anySoloRef.current = anySolo;

  // Initialize engine + tracks
  useEffect(() => {
    const engine = new AudioEngine();
    engineRef.current = engine;
    const trackPaths = job.tracks || {};
    let firstAudio: HTMLAudioElement | null = null;

    TRACK_DEFS.forEach((def) => {
      const path = trackPaths[def.id];
      if (path) {
        const url = getTrackUrl(path);
        const audio = engine.addTrack(def.id, url);
        if (!firstAudio) firstAudio = audio;
      }
    });

    if (firstAudio) {
      const a = firstAudio as HTMLAudioElement;
      a.addEventListener("loadedmetadata", () => setDuration(a.duration));
      a.addEventListener("ended", () => setIsPlaying(false));

      const bpmPath = trackPaths.other || Object.values(trackPaths)[0];
      if (bpmPath && initialBpm === null) {
        detectBPM(getTrackUrl(bpmPath)).then(setBpm);
      }
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      engine.dispose();
      engineRef.current = null;
    };
  }, [job.tracks]);

  // Smooth playhead update via rAF while playing
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      const engine = engineRef.current;
      if (!engine) return;
      const first = engine.tracks.values().next().value;
      if (first) setCurrentTime(first.audio.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  // Apply static effects (EQ/reverb) whenever effects change
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    TRACK_DEFS.forEach((def) => {
      engine.applyStaticEffects(def.id, effects[def.id]);
    });
  }, [effects]);

  // Apply volume/pan (and reschedule automation) when effects, solo, or playhead change
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const t = engine.tracks.values().next().value?.audio.currentTime ?? 0;
    TRACK_DEFS.forEach((def) => {
      engine.applyVolumePan(def.id, effects[def.id], anySolo, t, isPlayingRef.current);
    });
  }, [effects, anySolo]);

  // Apply master settings (gain / limiter) to the live engine
  useEffect(() => {
    engineRef.current?.applyMaster(master);
  }, [master]);

  const rescheduleAutomation = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const t = engine.tracks.values().next().value?.audio.currentTime ?? 0;
    TRACK_DEFS.forEach((def) => {
      engine.applyVolumePan(def.id, effectsRef.current[def.id], anySoloRef.current, t, isPlayingRef.current);
    });
  }, []);

  const togglePlay = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.resume();
    const audios = Array.from(engine.tracks.values()).map((t) => t.audio);
    if (isPlaying) {
      audios.forEach((a) => a.pause());
      isPlayingRef.current = false;
      setIsPlaying(false);
      rescheduleAutomation();
    } else {
      audios.forEach((a) => a.play().catch(() => {}));
      isPlayingRef.current = true;
      setIsPlaying(true);
      rescheduleAutomation();
    }
  }, [isPlaying, rescheduleAutomation]);

  const seek = useCallback(
    ([val]: number[]) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.tracks.forEach((t) => {
        t.audio.currentTime = val;
      });
      setCurrentTime(val);
      rescheduleAutomation();
    },
    [rescheduleAutomation]
  );

  const restart = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.tracks.forEach((t) => {
      t.audio.currentTime = 0;
    });
    setCurrentTime(0);
    rescheduleAutomation();
  }, [rescheduleAutomation]);

  const updateFx = useCallback((id: string, patch: Partial<TrackEffects>) => {
    setEffects((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
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

  const handleSaveProject = useCallback(() => {
    const project: SavedProject = {
      id: crypto.randomUUID(),
      jobId: job.id,
      filename: file.name,
      tracks: job.tracks || {},
      effects,
      bpm,
      savedAt: new Date().toISOString(),
      thumbnailColor: TRACK_DEFS[Math.floor(Math.random() * TRACK_DEFS.length)].color,
    };
    saveProject(project);
    toast.success("Projeto salvo na biblioteca");
    onSaved?.();
  }, [job, file.name, effects, bpm, onSaved]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportMix = useCallback(async () => {
    if (isExporting) return;
    const trackPaths = job.tracks || {};
    const exportTracks = TRACK_DEFS
      .filter((def) => trackPaths[def.id])
      .map((def) => ({
        id: def.id,
        url: getTrackUrl(trackPaths[def.id]!),
        fx: effects[def.id],
      }));
    if (exportTracks.length === 0) {
      toast.error("Nenhuma faixa disponível");
      return;
    }
    setIsExporting(true);
    const toastId = toast.loading("Renderizando mix...");
    try {
      const buffer = await renderMix(exportTracks);
      const wav = audioBufferToWav(buffer);
      const base = file.name.replace(/\.[^.]+$/, "");
      downloadBlob(wav, `${base}_mix.wav`);
      toast.success("Mix exportado!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Falha ao exportar mix", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, job.tracks, effects, file.name]);

  // Waveform
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
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold truncate">{file.name}</h2>
          <p className="text-sm text-muted-foreground">Mixer · Separado por IA</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Metronome bpm={bpm} />
          <Button variant="ghost" size="sm" onClick={handleExportMix} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-1" />
            )}
            Exportar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSaveProject}>
            <Save className="w-4 h-4 mr-1" />
            Salvar
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-end gap-[2px] h-24 w-full">
          {waveData.map((h, i) => {
            const isPast = i / waveformBars < progress;
            return (
              <div
                key={i}
                className="flex-1 rounded-sm transition-colors duration-100"
                style={{
                  height: `${h * 100}%`,
                  backgroundColor: isPast ? "hsl(var(--primary))" : "hsl(var(--muted))",
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
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Faixas separadas
        </h3>
        {TRACK_DEFS.map((meta, i) => (
          <motion.div
            key={meta.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2"
          >
            <div className="flex-1">
              <TrackControls
                meta={meta}
                fx={effects[meta.id]}
                onChange={(patch) => updateFx(meta.id, patch)}
                anySolo={anySolo}
                duration={duration}
                currentTime={currentTime}
              />
            </div>
            {job.tracks?.[meta.id] && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownload(meta.id)}
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
