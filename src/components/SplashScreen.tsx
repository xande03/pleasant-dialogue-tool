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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background" style={{
      backgroundImage: "url('/gaivota.webp')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat"
    }}>
      <div className="text-center max-w-md mx-auto bg-black/30 backdrop-blur-sm p-8 rounded-lg border border-white/10">
        <div className="mb-6">
          <img 
            src="/Adicione_uma_capivaa_ao_lado_deste_cachorro_2k_delpmaspu.png" 
            alt="Beagle puppy walking on grass"
            className="w-full h-auto max-h-64 object-cover rounded-lg shadow-lg mx-auto"
          />
        </div>
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