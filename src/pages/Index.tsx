import { useState, useCallback, useEffect } from "react";
import UploadZone from "@/components/UploadZone";
import AudioPlayer from "@/components/AudioPlayer";
import ProcessingStatus from "@/components/ProcessingStatus";
import ProjectsLibrary from "@/components/ProjectsLibrary";
import { useAudioJob } from "@/hooks/useAudioJob";
import { listProjects, type SavedProject } from "@/lib/projects-store";
import type { AudioJob } from "@/lib/audio-service";

const Index = () => {
  const [file, setFile] = useState<{ name: string; size?: number } | null>(null);
  const [openedProject, setOpenedProject] = useState<SavedProject | null>(null);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const { job, uploading, error, startJob, reset } = useAudioJob();

  const refreshProjects = useCallback(() => setProjects(listProjects()), []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const handleFileSelect = useCallback(
    (selected: File) => {
      setFile({ name: selected.name, size: selected.size });
      setOpenedProject(null);
      startJob(selected);
    },
    [startJob]
  );

  const handleOpenProject = useCallback((p: SavedProject) => {
    setOpenedProject(p);
    setFile({ name: p.filename });
  }, []);

  const handleReset = useCallback(() => {
    setFile(null);
    setOpenedProject(null);
    reset();
  }, [reset]);

  // Synthesize an AudioJob shape when opening a saved project
  const activeJob: AudioJob | null = openedProject
    ? {
        id: openedProject.jobId,
        original_filename: openedProject.filename,
        storage_path: "",
        status: "completed",
        tracks: openedProject.tracks,
        error_message: null,
        created_at: openedProject.savedAt,
        updated_at: openedProject.savedAt,
      }
    : job;

  const showUpload = !file && !uploading;
  const showProcessing = file && !openedProject && job && job.status !== "completed";
  const showPlayer = file && activeJob?.status === "completed";

  return (
    <div className="min-h-screen bg-background">
      {showUpload && (
        <>
          <UploadZone onFileSelect={handleFileSelect} isProcessing={uploading} />
          <ProjectsLibrary
            projects={projects}
            onOpen={handleOpenProject}
            onChange={refreshProjects}
          />
        </>
      )}
      {showProcessing && (
        <ProcessingStatus
          status={job.status}
          filename={file.name}
          error={job.status === "failed" ? job.error_message : error}
          onRetry={handleReset}
        />
      )}
      {showPlayer && activeJob && (
        <AudioPlayer
          file={file}
          job={activeJob}
          initialEffects={openedProject?.effects}
          initialBpm={openedProject?.bpm}
          onReset={handleReset}
          onSaved={refreshProjects}
        />
      )}
    </div>
  );
};

export default Index;
