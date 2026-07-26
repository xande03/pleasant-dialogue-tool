import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

const MOBILE_MAX = 768;

export default function MobileOnlyGate({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => {
      const ua = navigator.userAgent || "";
      const uaMobile = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile|BlackBerry/i.test(ua);
      const narrow = window.innerWidth < MOBILE_MAX;
      setIsMobile(uaMobile || narrow);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile === null) return null;
  if (isMobile) return <>{children}</>;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl gradient-aurora flex items-center justify-center shadow-brutal">
          <Smartphone className="w-7 h-7 text-primary-foreground" strokeWidth={2.2} />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl tracking-tight">Disponível apenas no celular</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Este app foi desenhado exclusivamente para dispositivos móveis. Abra em um smartphone
            ou reduza a janela do navegador para menos de 768&nbsp;px para continuar.
          </p>
        </div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
          Creator Suite · Mobile only
        </div>
      </div>
    </div>
  );
}
