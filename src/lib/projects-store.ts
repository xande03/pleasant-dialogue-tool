import type { TrackEffects } from "./audio-engine";

const KEY = "bandlab_projects_v1";

export interface SavedProject {
  id: string;
  jobId: string;
  filename: string;
  tracks: Record<string, string>; // storage paths
  effects: Record<string, TrackEffects>;
  bpm: number | null;
  savedAt: string;
  thumbnailColor: string;
}

export function listProjects(): SavedProject[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveProject(p: SavedProject) {
  const all = listProjects().filter((x) => x.jobId !== p.jobId);
  all.unshift(p);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 50)));
}

export function deleteProject(id: string) {
  const all = listProjects().filter((x) => x.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getProject(id: string): SavedProject | null {
  return listProjects().find((p) => p.id === id) || null;
}
