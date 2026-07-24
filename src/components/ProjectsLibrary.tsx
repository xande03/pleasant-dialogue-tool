import { motion } from "motion/react";
import { Music, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type SavedProject, deleteProject } from "@/lib/projects-store";

interface ProjectsLibraryProps {
  projects: SavedProject[];
  onOpen: (p: SavedProject) => void;
  onChange: () => void;
}

const timeAgo = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h atrás`;
  return `${Math.floor(hr / 24)}d atrás`;
};

const ProjectsLibrary = ({ projects, onOpen, onChange }: ProjectsLibraryProps) => {
  if (projects.length === 0) return null;

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteProject(id);
    onChange();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto px-4 pb-8"
    >
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Meus projetos
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {projects.map((p) => (
          <motion.button
            key={p.id}
            onClick={() => onOpen(p)}
            className="group text-left bg-card hover:bg-card/70 border border-border hover:border-primary/50 rounded-xl p-4 flex items-center gap-3 transition-all"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: p.thumbnailColor }}
            >
              <Music className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{p.filename}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <Clock className="w-3 h-3" />
                {timeAgo(p.savedAt)}
                {p.bpm && <span className="font-mono">· {p.bpm} BPM</span>}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => handleDelete(e, p.id)}
              className="opacity-0 group-hover:opacity-100 shrink-0 h-8 w-8"
              aria-label="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default ProjectsLibrary;
