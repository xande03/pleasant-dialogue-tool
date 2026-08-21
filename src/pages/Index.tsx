import { useEffect, useState } from "react";
import { Sparkles, QrCode, FileText, Menu, X, Sun, Moon, MessageCircle } from "lucide-react";
import ImageStudio from "@/tools/ImageStudio";
import QrTool from "@/tools/QrTool";
import PdfTool from "@/tools/PdfTool";
import ChatTool from "@/tools/ChatTool";
import backgroundAsset from "@/assets/background-dance.png.asset.";

type ToolKey = "image" | "qr" | "pdf" | "chat";
type Theme = "light" | "dark";

const TOOLS: { key: ToolKey; Icon: typeof Sparkles; label: string; subtitle: string }[] = [
  { key: "image", Icon: Sparkles,      label: "Image Studio", subtitle: "AI generation" },
  { key: "chat",  Icon: MessageCircle, label: "Chat IA",      subtitle: "Conversa livre" },
  { key: "qr",    Icon: QrCode,        label: "QR Tool",      subtitle: "Codes & uploads" },
  { key: "pdf",   Icon: FileText,      label: "PDF Tool",     subtitle: "PDF ↔ DOCX" },
];

const Index = () => {
  const [active, setActive] = useState<ToolKey>(() => {
    try { return (localStorage.getItem("app:tool") as ToolKey) || "image"; } catch { return "image"; }
  });
  const [mobileNav, setMobileNav] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem("app:theme") as Theme | null;
      if (saved) return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch { return "light"; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark"); else root.classList.remove("dark");
    try { localStorage.setItem("app:theme", theme); } catch {}
  }, [theme]);
  useEffect(() => { try { localStorage.setItem("app:tool", active); } catch {} }, [active]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  const currentTool = TOOLS.find(t => t.key === active)!;
  const Tool = active === "image" ? ImageStudio : active === "chat" ? ChatTool : active === "qr" ? QrTool : PdfTool;

  const NavItem = ({ t, onClick }: { t: typeof TOOLS[number]; onClick?: () => void }) => {
    const on = active === t.key;
    return (
      <button
        onClick={() => { setActive(t.key); onClick?.(); }}
        className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
          on
            ? "bg-foreground text-background shadow-brutal"
            : "text-foreground/80 hover:bg-secondary/70"
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
          on ? "bg-background/10 text-background" : "bg-secondary text-foreground/70 group-hover:bg-background"
        }`}>
          <t.Icon className="w-4 h-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[13px] leading-tight truncate">{t.label}</div>
          <div className={`text-[10.5px] font-medium truncate ${on ? "opacity-70" : "text-muted-foreground"}`}>
            {t.subtitle}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div 
      className="flex min-h-screen w-full bg-background text-foreground overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: `linear-gradient(hsl(var(--background) / 0.86), hsl(var(--background) / 0.94)), url(${backgroundAsset.url})` }}
    >

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[248px] xl:w-[272px] z-30 border-r border-border flex-col bg-background/60 backdrop-blur-md">
        <div className="px-5 pt-6 pb-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-aurora flex items-center justify-center shadow-brutal-sm">
            <Sparkles className="w-4 h-4 text-primary-foreground" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <div className="font-display text-[15px] leading-tight tracking-tight">flowcheats</div>
            <div className="text-[10.5px] text-muted-foreground font-medium">Premium tools</div>
          </div>
        </div>

        <div className="divider-hairline mx-5" />

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground px-3 pt-2 pb-2">Tools</div>
          {TOOLS.map(t => <NavItem key={t.key} t={t} />)}
        </nav>

        <div className="p-4">
          <div className="rounded-2xl p-4 ink-border bg-secondary/40">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-brutal-pulse" style={{ background: "hsl(var(--success))" }} />
              <div className="font-display text-[12px]">Local only</div>
            </div>
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              Todos os dados ficam no seu navegador. Sem servidor, sem tracking.
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 border-b border-border bg-background/85 backdrop-blur-md flex items-center justify-between px-4">
        <button
          onClick={() => setMobileNav(true)}
          className="w-10 h-10 rounded-xl ink-border bg-background flex items-center justify-center brutal-hover"
          aria-label="Menu"
        >
          <Menu className="w-4.5 h-4.5" strokeWidth={2} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            <currentTool.Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
          </div>
          <span className="font-display text-[13px] truncate">{currentTool.label}</span>
        </div>
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl ink-border bg-background flex items-center justify-center brutal-hover"
          aria-label="Alternar tema"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" strokeWidth={2} /> : <Moon className="w-4 h-4" strokeWidth={2} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" onClick={() => setMobileNav(false)} />
          <div className="relative w-[86%] max-w-[320px] h-full bg-background border-r border-border flex flex-col">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl gradient-aurora flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" strokeWidth={2.4} />
                </div>
                <span className="font-display text-[15px]">flowcheats</span>
              </div>
              <button
                onClick={() => setMobileNav(false)}
                className="w-9 h-9 rounded-xl ink-border bg-background flex items-center justify-center brutal-hover"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
            <div className="divider-hairline mx-5" />
            <div className="flex-1 p-3 space-y-1 overflow-y-auto">
              {TOOLS.map(t => <NavItem key={t.key} t={t} onClick={() => setMobileNav(false)} />)}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-[248px] xl:ml-[272px] pt-14 md:pt-0 min-h-screen w-full max-w-full min-w-0 overflow-x-hidden flex flex-col">
        {/* Desktop tool header */}
        <div className="hidden md:flex h-[72px] border-b border-border bg-background/40 backdrop-blur-md items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-secondary ink-border flex items-center justify-center shrink-0">
              <currentTool.Icon className="w-4.5 h-4.5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-[19px] leading-none truncate">{currentTool.label}</h2>
              <div className="text-[11px] text-muted-foreground mt-1.5 font-medium">{currentTool.subtitle}</div>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2.5">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl ink-border bg-background flex items-center justify-center brutal-hover"
              aria-label="Alternar tema"
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" strokeWidth={2} /> : <Moon className="w-4 h-4" strokeWidth={2} />}
            </button>
            <div className="px-3 py-1.5 rounded-full ink-border bg-background text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
              v3 · Premium
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 w-full bg-transparent">
          <Tool />
        </div>
      </main>
    </div>
  );
};

export default Index;