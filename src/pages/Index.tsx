import { useState, useCallback } from "react";
import UploadZone from "@/components/UploadZone";
import AudioPlayer from "@/components/AudioPlayer";
import ProcessingStatus from "@/components/ProcessingStatus";
import { useAudioJob } from "@/hooks/useAudioJob";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const { job, uploading, error, startJob, reset } = useAudioJob();

  const handleFileSelect = useCallback(
    (selected: File) => {
      setFile(selected);
      startJob(selected);
    },
    [startJob]
  );

  const handleReset = useCallback(() => {
    setFile(null);
    reset();
  }, [reset]);

  const showUpload = !file && !uploading;
  const showProcessing = file && job && job.status !== "completed";
  const showPlayer = file && job?.status === "completed";

  return (
    <div className="min-h-screen bg-background">
      {showUpload && (
        <UploadZone onFileSelect={handleFileSelect} isProcessing={uploading} />
      )}
      {showProcessing && (
        <ProcessingStatus
          status={job.status}
          filename={file.name}
          error={job.status === "failed" ? job.error_message : error}
          onRetry={handleReset}
        />
      )}
      {showPlayer && (
        <AudioPlayer file={file} job={job} onReset={handleReset} />
      )}
    </div>
  );
};

export default Index;
