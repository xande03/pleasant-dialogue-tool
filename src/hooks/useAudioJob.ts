import { useState, useEffect, useCallback, useRef } from "react";
import { type AudioJob, uploadAudioAndCreateJob, getJob } from "@/lib/audio-service";

export function useAudioJob() {
  const [job, setJob] = useState<AudioJob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startJob = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const created = await uploadAudioAndCreateJob(file);
      setJob(created);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }, []);

  // Poll for job status updates
  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const updated = await getJob(job.id);
        setJob(updated);
        if (updated.status === "completed" || updated.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [job?.id, job?.status]);

  const reset = useCallback(() => {
    setJob(null);
    setError(null);
  }, []);

  return { job, uploading, error, startJob, reset };
}
