import { useState, useCallback } from "react";
import UploadZone from "@/components/UploadZone";
import AudioPlayer from "@/components/AudioPlayer";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = useCallback((selected: File) => {
    setIsProcessing(true);
    // Simulate processing delay
    setTimeout(() => {
      setFile(selected);
      setIsProcessing(false);
    }, 1500);
  }, []);

  const handleReset = useCallback(() => {
    setFile(null);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {file ? (
        <AudioPlayer file={file} onReset={handleReset} />
      ) : (
        <UploadZone onFileSelect={handleFileSelect} isProcessing={isProcessing} />
      )}
    </div>
  );
};

export default Index;
