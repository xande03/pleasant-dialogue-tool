import { useState, useCallback } from "react";
import { type AudioJob, uploadAudioAndCreateJob, releaseJob } from "@/lib/audio-service";

export function useAudioJob() {
  const [job, setJob] = useState<AudioJob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startJob = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const created = await uploadAudioAndCreateJob(file);
      setJob((prev) => {
        releaseJob(prev);
        return created;
      });
    } catch (e: any) {
      setError(e?.message ?? "Falha ao processar o áudio.");
    } finally {
      setUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setJob((prev) => {
      releaseJob(prev);
      return null;
    });
    setError(null);
  }, []);

  return { job, uploading, error, startJob, reset };
}
