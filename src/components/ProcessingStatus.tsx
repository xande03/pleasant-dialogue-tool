import { motion } from "motion/react";
import { Loader2, CheckCircle, XCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JobStatus } from "@/lib/audio-service";

interface ProcessingStatusProps {
  status: JobStatus;
  filename: string;
  error?: string | null;
  onRetry?: () => void;
}

const ProcessingStatus = ({ status, filename, error, onRetry }: ProcessingStatusProps) => {
  const stages: { key: JobStatus; label: string }[] = [
    { key: "pending", label: "Na fila..." },
    { key: "processing", label: "Separando instrumentos com IA..." },
    { key: "completed", label: "Concluído!" },
  ];

  const currentIndex = stages.findIndex((s) => s.key === status);

  if (status === "failed") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] px-4 gap-4"
      >
        <XCircle className="w-16 h-16 text-destructive" />
        <h2 className="text-xl font-bold">Erro no processamento</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {error || "Ocorreu um erro ao processar o áudio. Tente novamente."}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Tentar novamente
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4 gap-6"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="w-16 h-16 text-primary" />
      </motion.div>

      <div className="text-center">
        <h2 className="text-xl font-bold mb-1">{filename}</h2>
        <p className="text-muted-foreground">
          {stages[Math.min(currentIndex, stages.length - 1)]?.label}
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mt-4">
        {stages.map((stage, i) => (
          <div key={stage.key} className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full transition-colors ${
                i <= currentIndex
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
            {i < stages.length - 1 && (
              <div
                className={`w-8 h-0.5 transition-colors ${
                  i < currentIndex ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Isso pode levar alguns minutos dependendo do tamanho do arquivo
      </p>
    </motion.div>
  );
};

export default ProcessingStatus;
