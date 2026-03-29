import { supabase } from "@/integrations/supabase/client";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface AudioJob {
  id: string;
  original_filename: string;
  storage_path: string;
  status: JobStatus;
  tracks: Record<string, string> | null; // { vocals: url, drums: url, bass: url, other: url }
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const SUPABASE_URL = "https://qilfwtzkzwwtwaxvdctv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MsU4zlEAX-X-CunDEYyqPg_otls-VX3";

export async function uploadAudioAndCreateJob(file: File): Promise<AudioJob> {
  const ext = file.name.split(".").pop() || "mp3";
  const storagePath = `uploads/${crypto.randomUUID()}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("audio-files")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // Create job record
  const { data, error } = await supabase
    .from("audio_jobs")
    .insert({
      original_filename: file.name,
      storage_path: storagePath,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(`Job creation failed: ${error.message}`);

  // Trigger processing via edge function
  const { error: fnError } = await supabase.functions.invoke("process-audio", {
    body: { job_id: data.id },
  });

  if (fnError) {
    console.error("Edge function invoke error:", fnError);
    // Don't throw - the job is created, processing might still work
  }

  return data as AudioJob;
}

export async function getJob(jobId: string): Promise<AudioJob> {
  const { data, error } = await supabase
    .from("audio_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) throw new Error(`Failed to fetch job: ${error.message}`);
  return data as AudioJob;
}

export function getTrackUrl(storagePath: string): string {
  const { data } = supabase.storage.from("audio-files").getPublicUrl(storagePath);
  return data.publicUrl;
}
