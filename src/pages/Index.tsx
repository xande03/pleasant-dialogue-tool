import { useEffect, useState } from "react";
import { Sparkles, QrCode, FileText, Menu, X, Zap } from "lucide-react";
import ImageStudio from "@/tools/ImageStudio";
import QrTool from "@/tools/QrTool";
import PdfTool from "@/tools/PdfTool";

type ToolKey = "image" | "qr" | "pdf";

const TOOLS: { key: ToolKey; Icon: typeof Sparkles; label: string; subtitle: string }[] = [
  { key: "image", Icon: Sparkles, label: "Image Studio", subtitle: "AI generation" },
  { key: "qr", Icon: QrCode, label: "QR Tool", subtitle: "Codes & uploads" },
  { key: "pdf", Icon: FileText, label: "PDF Tool", subtitle: "PDF ↔ DOCX" },
];

const Index = () => {
  const [active, setActive] = useState<ToolKey>(() => {
    try { return (localStorage.getItem("app:tool") as ToolKey) || "image"; } catch { return "image"; }
  });
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-theme");
  }, []);
  useEffect(() => { try { localStorage.setItem("app:tool", active); } catch {} }, [active]);

  const currentTool = TOOLS.find(t => t.key === active)!;
  const Tool = active === "image" ? ImageStudio : active === "qr" ? QrTool : PdfTool;

  const NavItem = ({ t, onClick }: { t: typeof TOOLS[number]; onClick?: () => void }) => {
    const on = active === t.key;
    return (
      <button
        onClick={() => { setActive(t.key); onClick?.(); }}
        className={`w-full flex items-center gap-4 p-4 ink-border-thick brutal-hover text-left ${
          on ? "bg-accent shadow-brutal" : "bg-background"
        }`}
      >
        <div className="w-9 h-9 ink-border flex items-center justify-center shrink-0 bg-background">
          <t.Icon className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <div className="font-display text-sm uppercase tracking-tight truncate">{t.label}</div>
          <div className="text-[10px] font-semibold uppercase opacity-60 truncate">{t.subtitle}</div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[260px] xl:w-[288px] z-30 border-r-4 border-foreground flex-col bg-background">
        <div className="p-6 border-b-4 border-foreground flex items-center gap-3">
          <div className="w-10 h-10 bg-primary ink-border shadow-brutal-sm flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" strokeWidth={3} />
          </div>
          <div className="min-w-0">
            <div className="font-display text-xl leading-none uppercase tracking-tighter">Creator</div>
            <div className="font-display text-xl leading-none uppercase tracking-tighter">Suite</div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-thin">
          <div className="text-[10px] font-black uppercase tracking-widest px-1 pb-1 opacity-60">Tools</div>
          {TOOLS.map(t => <NavItem key={t.key} t={t} />)}
        </nav>

        <div className="p-6 border-t-4 border-foreground bg-primary text-primary-foreground">
          <div className="font-black uppercase text-xs mb-2 tracking-wider">Local Only</div>
          <div className="text-[10px] font-semibold opacity-90 leading-relaxed">
            All data stays inside your browser. No server, no tracking.
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-16 border-b-4 border-foreground bg-background flex items-center justify-between px-4">
        <button
          onClick={() => setMobileNav(true)}
          className="w-11 h-11 ink-border-thick shadow-brutal-sm bg-background flex items-center justify-center brutal-hover"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" strokeWidth={3} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-accent ink-border flex items-center justify-center shrink-0">
            <currentTool.Icon className="w-4 h-4" strokeWidth={3} />
          </div>
          <span className="font-display text-sm uppercase tracking-tighter truncate">{currentTool.label}</span>
        </div>
        <div className="w-11" />
      </header>

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setMobileNav(false)} />
          <div className="relative w-[85%] max-w-[320px] h-full bg-background border-r-4 border-foreground flex flex-col">
            <div className="p-5 border-b-4 border-foreground flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-primary ink-border flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                </div>
                <span className="font-display text-lg uppercase tracking-tighter">Creator Suite</span>
              </div>
              <button
                onClick={() => setMobileNav(false)}
                className="w-10 h-10 ink-border shadow-brutal-sm bg-background flex items-center justify-center brutal-hover"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {TOOLS.map(t => <NavItem key={t.key} t={t} onClick={() => setMobileNav(false)} />)}
            </div>
            <div className="p-5 border-t-4 border-foreground bg-primary text-primary-foreground">
              <div className="font-black uppercase text-xs">Local Only</div>
              <div className="text-[10px] font-semibold opacity-90 mt-1">All data stays in your browser.</div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-[260px] xl:ml-[288px] pt-16 md:pt-0 min-h-screen w-full max-w-full min-w-0 overflow-x-hidden flex flex-col">
        {/* Desktop tool header */}
        <div className="hidden md:flex h-20 border-b-4 border-foreground bg-background items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 bg-accent ink-border-thick shadow-brutal-sm flex items-center justify-center shrink-0">
              <currentTool.Icon className="w-5 h-5" strokeWidth={3} />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-2xl xl:text-3xl uppercase tracking-tighter leading-none truncate">
                {currentTool.label}
              </h2>
              <div className="text-[11px] font-bold uppercase tracking-widest opacity-60 mt-1">{currentTool.subtitle}</div>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <div className="px-4 py-2 ink-border-thick bg-background font-black uppercase text-xs tracking-wide">
              v2 · Brutalist
            </div>
            <div className="w-11 h-11 ink-border-thick bg-primary shadow-brutal-sm" />
          </div>
        </div>

        <div className="flex-1 min-h-0 w-full">
          <Tool />
        </div>
      </main>
    </div>
  );
};

export default Index;
