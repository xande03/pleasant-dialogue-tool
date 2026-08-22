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
      <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/gaivota.webp')" }}>
        <div className="absolute inset-0 bg-black/30" />
      </div>
      <div className="text-center max-w-md mx-auto relative z-10">
        <h1 className="font-display text-[48px] font-bold tracking-tight text-foreground">
          guerreiros, membros
        </h1>
        <div className="mt-4 text-[16px] text-muted-foreground">
          Carregando ferramentas premium...
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;