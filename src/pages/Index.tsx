import { useEffect, useState } from "react";
import { Sparkles, QrCode, FileText, Menu, X, Palette } from "lucide-react";
import ImageStudio from "@/tools/ImageStudio";
import QrTool from "@/tools/QrTool";
import PdfTool from "@/tools/PdfTool";

type ToolKey = "image" | "qr" | "pdf";
type ThemeKey = "aurora" | "noir";

const TOOLS: { key: ToolKey; Icon: typeof Sparkles; label: string; subtitle: string }[] = [
  { key: "image", Icon: Sparkles, label: "AI Image", subtitle: "Gere imagens com IA" },
  { key: "qr", Icon: QrCode, label: "QR Codes", subtitle: "Texto, links e arquivos" },
  { key: "pdf", Icon: FileText, label: "PDF ↔ DOCX", subtitle: "Conversor de documentos" },
];

const THEMES: { key: ThemeKey; label: string; swatch: string[] }[] = [
  { key: "aurora", label: "Glass Aurora", swatch: ["#a78bfa", "#4ade80", "#0e1024"] },
  { key: "noir", label: "Noir & Gold", swatch: ["#c9a84c", "#f0d78c", "#0d0d0d"] },
];

const Index = () => {
  const [active, setActive] = useState<ToolKey>(() => {
    try { return (localStorage.getItem("app:tool") as ToolKey) || "image"; } catch { return "image"; }
  });
  const [theme, setTheme] = useState<ThemeKey>(() => {
    try { return (localStorage.getItem("app:theme") as ThemeKey) || "aurora"; } catch { return "aurora"; }
  });
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => { document.documentElement.classList.add("dark"); }, []);
  useEffect(() => { try { localStorage.setItem("app:tool", active); } catch {} }, [active]);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("app:theme", theme); } catch {}
  }, [theme]);

  const currentTool = TOOLS.find(t => t.key === active)!;

  const Tool = active === "image" ? ImageStudio : active === "qr" ? QrTool : PdfTool;

  return (
    <div className="min-h-screen w-full flex">
      {/* Desktop tool rail */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-[220px] xl:w-[260px] z-30 flex-col glass-strong border-r border-border/40">
        <div className="p-5 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl gradient-aurora flex items-center justify-center glow-primary">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display text-base font-bold text-aurora leading-tight">Creator Suite</div>
              <div className="text-[10px] text-muted-foreground">Ferramentas · Local</div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-3 space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 py-2">Ferramentas</div>
          {TOOLS.map(t => {
            const on = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left ${
                  on ? "bg-primary/15 text-primary glow-primary border border-primary/40"
                     : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${on ? "gradient-aurora" : "glass"}`}>
                  <t.Icon className={`w-4 h-4 ${on ? "text-primary-foreground" : ""}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{t.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{t.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t border-border/40">
          <div className="text-[10px] text-muted-foreground leading-relaxed">
            Todos os dados ficam no seu navegador. Nenhum upload é enviado a servidores.
          </div>
        </div>
      </nav>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 glass-strong border-b border-border/40 flex items-center justify-between px-3 h-14">
        <button onClick={() => setMobileNav(true)} className="w-10 h-10 rounded-xl glass flex items-center justify-center" aria-label="Menu">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg gradient-aurora flex items-center justify-center shrink-0">
            <currentTool.Icon className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-aurora text-sm truncate">{currentTool.label}</span>
        </div>
        <div className="w-10" />
      </header>

      {mobileNav && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <div className="relative w-[85%] max-w-[300px] h-full glass-strong border-r border-border/40 flex flex-col">
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl gradient-aurora flex items-center justify-center"><Sparkles className="w-4 h-4 text-primary-foreground" /></div>
                <span className="font-display font-bold text-aurora">Creator Suite</span>
              </div>
              <button onClick={() => setMobileNav(false)} className="w-9 h-9 rounded-xl glass flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 p-3 space-y-1.5">
              {TOOLS.map(t => {
                const on = active === t.key;
                return (
                  <button key={t.key} onClick={() => { setActive(t.key); setMobileNav(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition text-left ${on ? "bg-primary/15 text-primary border border-primary/40" : "hover:bg-white/5 border border-transparent"}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${on ? "gradient-aurora" : "glass"}`}>
                      <t.Icon className={`w-4 h-4 ${on ? "text-primary-foreground" : ""}`} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{t.label}</div>
                      <div className="text-[10px] text-muted-foreground">{t.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-[220px] xl:ml-[260px] pt-14 md:pt-0 min-h-screen w-full max-w-full min-w-0 overflow-x-hidden">
        <Tool />
      </main>

    </div>
  );
};

export default Index;
