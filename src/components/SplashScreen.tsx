import { useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000); // Show splash for 2 seconds
    
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="font-display text-[48px] font-bold tracking-tight text-foreground">
          olá designers
        </h1>
        <div className="mt-4 text-[16px] text-muted-foreground">
          Carregando ferramentas premium...
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;