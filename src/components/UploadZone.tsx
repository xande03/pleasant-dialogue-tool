import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, Music, Loader2 } from "lucide-react";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const UploadZone = ({ onFileSelect, isProcessing }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("audio/")) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[70vh] px-4"
    >
      <motion.h1
        className="text-4xl md:text-6xl font-bold mb-3 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <span className="text-primary">Split</span>{" "}
        <span className="text-foreground">your music</span>
      </motion.h1>
      <motion.p
        className="text-muted-foreground text-lg mb-10 text-center max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Separe vocais, bateria, baixo e outros instrumentos em faixas individuais
      </motion.p>

      <motion.label
        htmlFor="audio-upload"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative cursor-pointer w-full max-w-lg rounded-2xl border-2 border-dashed p-12
          flex flex-col items-center justify-center gap-4 transition-all duration-300
          ${isDragging ? "border-primary bg-primary/5 glow-primary" : "border-border hover:border-primary/50 bg-card/50"}
          ${isProcessing ? "pointer-events-none opacity-60" : ""}
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center gap-3"
            >
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <span className="text-primary font-medium">Processando...</span>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                {isDragging ? (
                  <Music className="w-8 h-8 text-primary" />
                ) : (
                  <Upload className="w-8 h-8 text-primary" />
                )}
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium">
                  Arraste seu arquivo de áudio aqui
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  ou clique para selecionar · MP3, WAV, FLAC
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <input
          id="audio-upload"
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileInput}
          disabled={isProcessing}
        />
      </motion.label>
    </motion.div>
  );
};

export default UploadZone;
