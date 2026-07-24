// Fully local audio "service" — no backend. Uses object URLs + in-memory state.
// The "splitter" is simulated: the uploaded file becomes 4 stems (vocals/drums/
// bass/other) all pointing at the same blob. Real ML separation would run
// server-side; this keeps the mixer/EQ/automation/export UX fully functional.

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface AudioJob {
  id: string;
  original_filename: string;
  storage_path: string;
  status: JobStatus;
  tracks: Record<string, string> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const STEM_NAMES = ["vocals", "drums", "bass", "other"] as const;

// Keep object URLs alive for the session so <audio> tags can fetch them.
const urlRegistry = new Map<string, string[]>();

function makeJob(file: File, url: string): AudioJob {
  const id = crypto.randomUUID();
  const tracks: Record<string, string> = {};
  for (const stem of STEM_NAMES) tracks[stem] = url;
  urlRegistry.set(id, [url]);
  const now = new Date().toISOString();
  return {
    id,
    original_filename: file.name,
    storage_path: `local://${id}`,
    status: "completed",
    tracks,
    error_message: null,
    created_at: now,
    updated_at: now,
  };
}

export async function uploadAudioAndCreateJob(file: File): Promise<AudioJob> {
  if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|ogg|flac)$/i.test(file.name)) {
    throw new Error("Formato inválido. Envie um arquivo de áudio (mp3, wav, m4a, ogg, flac).");
  }
  // Small delay so the "processing" UI is visible.
  await new Promise((r) => setTimeout(r, 400));
  const url = URL.createObjectURL(file);
  return makeJob(file, url);
}

export async function getJob(jobId: string): Promise<AudioJob> {
  // Jobs are transient/in-memory; the hook already has the latest copy.
  throw new Error(`Local job ${jobId} not found (no polling needed).`);
}

export function getTrackUrl(storagePath: string): string {
  return storagePath;
}

export function releaseJob(job: AudioJob | null) {
  if (!job) return;
  const urls = urlRegistry.get(job.id);
  if (urls) {
    urls.forEach((u) => URL.revokeObjectURL(u));
    urlRegistry.delete(job.id);
  }
}
