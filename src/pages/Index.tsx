import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Download,
  Pencil,
  Upload,
  Rocket,
  Loader2,
  ImageIcon,
  ArrowLeft,
  Wand2,
  SlidersHorizontal,
  Menu,
  X,
  Palette,
  Ratio as RatioIcon,
  Type as TypeIcon,
  Sticker,
  MessageSquare,
  Plus,
  Target,
  Layers,
  Combine,
} from "lucide-react";

type Mode = "create" | "edit";
type CreateFn = "free" | "sticker" | "text" | "comic";
type EditFn = "add-remove" | "retouch" | "style" | "compose";

const RATIOS: { label: string; ratio: string; w: number; h: number; tooltip: string }[] = [
  { label: "1:1", ratio: "1:1", w: 1024, h: 1024, tooltip: "Quadrado" },
  { label: "9:16", ratio: "9:16", w: 720, h: 1280, tooltip: "Story" },
  { label: "16:9", ratio: "16:9", w: 1280, h: 720, tooltip: "Cinema" },
  { label: "2:3", ratio: "2:3", w: 768, h: 1152, tooltip: "Retrato" },
  { label: "3:2", ratio: "3:2", w: 1152, h: 768, tooltip: "Paisagem" },
];

const STYLES = [
  { v: "", l: "Nenhum (Padrão)" },
  { v: "photorealistic", l: "Fotorealista" },
  { v: "3d render", l: "Render 3D" },
  { v: "anime style", l: "Anime" },
  { v: "creative", l: "Criativo" },
  { v: "dynamic", l: "Dinâmico" },
  { v: "illustration", l: "Ilustração" },
  { v: "watercolor painting", l: "Aquarela" },
  { v: "portrait", l: "Retrato Artístico" },
  { v: "cinematic lighting", l: "Cinematográfico" },
  { v: "fashion photography", l: "Moda" },
  { v: "cyberpunk", l: "Cyberpunk" },
  { v: "oil painting", l: "Pintura a Óleo" },
  { v: "pixel art", l: "Pixel Art" },
  { v: "minimalist", l: "Minimalista" },
  { v: "vintage", l: "Vintage" },
  { v: "noir", l: "Noir (Preto e Branco)" },
  { v: "fantasy", l: "Fantasia" },
  { v: "scifi", l: "Ficção Científica" },
];

const CREATE_FNS: { id: CreateFn; Icon: typeof Sparkles; label: string }[] = [
  { id: "free", Icon: Sparkles, label: "Prompt" },
  { id: "sticker", Icon: Sticker, label: "Adesivos" },
  { id: "text", Icon: TypeIcon, label: "Logo" },
  { id: "comic", Icon: MessageSquare, label: "HQ" },
];

const EDIT_FNS: { id: EditFn; Icon: typeof Plus; label: string }[] = [
  { id: "add-remove", Icon: Plus, label: "Adicionar" },
  { id: "retouch", Icon: Target, label: "Retoque" },
  { id: "style", Icon: Layers, label: "Estilo" },
  { id: "compose", Icon: Combine, label: "Unir" },
];

const GEMINI_KEY =
  import.meta.env.VITE_GEMINI_KEY || import.meta.env.VITE_GOOGLE_AI_KEY || "";

async function enhancePrompt(prompt: string): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Rewrite this prompt for AI image generation, making it vivid and detailed. Return ONLY the rewritten prompt in English: "${prompt}"` }] }],
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch { return null; }
}

function preloadImage(url: string) {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = url;
  });
}

type NavKey = "compose" | "ratio" | "style" | "mode";

const Index = () => {
  const [mode, setMode] = useState<Mode>("create");
  const [createFn, setCreateFn] = useState<CreateFn>("free");
  const [editFn, setEditFn] = useState<EditFn>("add-remove");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [ratio, setRatio] = useState(RATIOS[0]);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview1, setPreview1] = useState<string | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);
  const [previewMain, setPreviewMain] = useState<string | null>(null);

  // Sidebar UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);        // mobile sheet
  const [activePanel, setActivePanel] = useState<NavKey>("compose");

  const fileMain = useRef<HTMLInputElement>(null);
  const file1 = useRef<HTMLInputElement>(null);
  const file2 = useRef<HTMLInputElement>(null);

  const currentFn: string = mode === "create" ? createFn : editFn;
  const showMainUpload =
    (mode === "create" && currentFn !== "free") ||
    (mode === "edit" && currentFn !== "compose");
  const showTwoImages = mode === "edit" && currentFn === "compose";

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const generate = async () => {
    if (loading) return;
    if (!prompt.trim()) { toast.error("Por favor, digite um prompt."); return; }
    setLoading(true);
    setImgUrl(null);

    let finalPrompt = prompt.trim();
    if (style) finalPrompt += `, ${style} style`;
    if (mode === "create") {
      if (createFn === "sticker") finalPrompt += ", die-cut sticker design, white background, vector art, bold outlines, isolated, cute, colorful";
      if (createFn === "text") finalPrompt += ", minimalist logo design, vector graphics, simple typography, flat design, centered, professional, clean background";
      if (createFn === "comic") finalPrompt += ", comic book style, graphic novel, bold black outlines, halftone dots, vibrant colors, speech bubbles, dynamic action shot";
    }

    try {
      if (GEMINI_KEY) {
        toast.message("Refinando prompt...");
        const enhanced = await enhancePrompt(finalPrompt);
        if (enhanced) finalPrompt = enhanced;
      }
      const seed = Math.floor(Math.random() * 1_000_000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=${ratio.w}&height=${ratio.h}&nologo=true&seed=${seed}&model=flux`;
      await preloadImage(url);
      setImgUrl(url);
      toast.success("Imagem gerada!");
    } catch (err) {
      console.error(err);
      toast.error("Erro na geração. Tente novamente.");
    } finally { setLoading(false); }
  };

  const download = () => {
    if (!imgUrl) { toast.error("Gere uma imagem primeiro."); return; }
    window.open(imgUrl, "_blank");
  };

  const editCurrent = () => {
    if (!imgUrl) { toast.error("Não há imagem para editar."); return; }
    setPreviewMain(imgUrl);
    setMode("edit");
    setEditFn("retouch");
    setActivePanel("mode");
    toast.success("Modo edição ativado!");
  };

  useEffect(() => { document.documentElement.classList.add("dark"); }, []);

  const NAV: { key: NavKey; Icon: typeof Wand2; label: string }[] = [
    { key: "compose", Icon: Wand2, label: "Prompt" },
    { key: "mode", Icon: SlidersHorizontal, label: "Modo" },
    { key: "ratio", Icon: RatioIcon, label: "Proporção" },
    { key: "style", Icon: Palette, label: "Estilo" },
  ];

  const Panel = () => (
    <div className="flex flex-col gap-5">
      {activePanel === "compose" && (
        <>
          <div>
            <h3 className="font-display text-lg font-semibold mb-1">Descreva sua ideia</h3>
            <p className="text-xs text-muted-foreground mb-3">O prompt é o coração da geração.</p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Um gato samurai sob luz neon..."
              className="w-full h-32 glass rounded-2xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition placeholder:text-muted-foreground/60"
            />
          </div>

          {showTwoImages && (
            <div className="flex flex-col gap-3">
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Duas Imagens</label>
              {[
                { ref: file1, preview: preview1, set: setPreview1, label: "Primeira Imagem" },
                { ref: file2, preview: preview2, set: setPreview2, label: "Segunda Imagem" },
              ].map((u, i) => (
                <div key={i} onClick={() => u.ref.current?.click()}
                  className="relative glass border-2 border-dashed border-border/60 rounded-2xl p-4 min-h-[110px] flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 transition overflow-hidden">
                  <input ref={u.ref} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, u.set)} />
                  {u.preview ? (
                    <img src={u.preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <div className="text-sm mt-2">{u.label}</div>
                    </>
                  )}
                </div>
              ))}
              <button onClick={() => setEditFn("add-remove")}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
            </div>
          )}

          {showMainUpload && (
            <div onClick={() => fileMain.current?.click()}
              className="relative glass border-2 border-dashed border-border/60 rounded-2xl p-4 min-h-[120px] flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 transition overflow-hidden">
              <input ref={fileMain} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, setPreviewMain)} />
              {previewMain ? (
                <img src={previewMain} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <div className="text-sm mt-2">Envie uma imagem</div>
                  <div className="text-xs text-muted-foreground">PNG, JPG, WebP</div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {activePanel === "mode" && (
        <>
          <div>
            <h3 className="font-display text-lg font-semibold mb-3">Modo de Trabalho</h3>
            <div className="flex glass rounded-2xl p-1">
              {(["create", "edit"] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                    mode === m ? "gradient-aurora text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {m === "create" ? "Criar" : "Editar"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-3">
              {mode === "create" ? "Estilo de Criação" : "Ferramenta de Edição"}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(mode === "create" ? CREATE_FNS : EDIT_FNS).map((f: any) => {
                const active = mode === "create" ? createFn === f.id : editFn === f.id;
                return (
                  <button key={f.id}
                    onClick={() => mode === "create" ? setCreateFn(f.id) : setEditFn(f.id)}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition ${
                      active
                        ? "bg-primary/15 border-primary/60 text-primary glow-primary"
                        : "glass hover:border-primary/30"
                    }`}>
                    <f.Icon className="w-5 h-5" />
                    <div className="text-sm font-medium">{f.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {activePanel === "ratio" && (
        <div>
          <h3 className="font-display text-lg font-semibold mb-1">Proporção</h3>
          <p className="text-xs text-muted-foreground mb-3">Escolha a moldura do canvas.</p>
          <div className="grid grid-cols-3 gap-2.5">
            {RATIOS.map((r) => (
              <button key={r.ratio} onClick={() => setRatio(r)} title={r.tooltip}
                className={`aspect-square rounded-2xl border flex flex-col items-center justify-center gap-2 transition ${
                  ratio.ratio === r.ratio ? "gradient-aurora border-transparent text-primary-foreground glow-primary" : "glass hover:border-primary/30"
                }`}>
                <div className="border-2 border-current rounded-sm"
                  style={{
                    width: Math.min(28, (r.w / Math.max(r.w, r.h)) * 26),
                    height: Math.min(28, (r.h / Math.max(r.w, r.h)) * 26),
                  }} />
                <span className="text-xs font-semibold">{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activePanel === "style" && (
        <div>
          <h3 className="font-display text-lg font-semibold mb-1">Estilo Artístico</h3>
          <p className="text-xs text-muted-foreground mb-3">Aplique um preset visual.</p>
          <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
            {STYLES.map((s) => (
              <button key={s.v} onClick={() => setStyle(s.v)}
                className={`p-3 rounded-xl border text-left text-sm transition ${
                  style === s.v ? "bg-primary/15 border-primary/60 text-primary" : "glass hover:border-primary/30"
                }`}>
                {s.l}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen w-full flex">
      {/* ICON RAIL */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-[76px] z-30 flex-col items-center py-6 gap-6 glass-strong border-r border-border/40">
        <div className="w-11 h-11 rounded-2xl gradient-aurora flex items-center justify-center glow-primary">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          {NAV.map(({ key, Icon, label }) => (
            <button key={key} onClick={() => setActivePanel(key)} title={label}
              className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition group ${
                activePanel === key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}>
              {activePanel === key && <span className="absolute -left-[14px] top-2 bottom-2 w-1 rounded-full gradient-aurora" />}
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </div>
        <button onClick={generate} disabled={loading} title="Gerar"
          className="w-12 h-12 rounded-2xl gradient-aurora glow-primary flex items-center justify-center hover:scale-105 active:scale-95 transition disabled:opacity-50">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5 text-primary-foreground" />}
        </button>
      </nav>

      {/* SIDEBAR PANEL (desktop) */}
      <aside className="hidden md:flex fixed left-[76px] top-0 bottom-0 w-[340px] z-20 flex-col glass-strong border-r border-border/40">
        <header className="px-6 pt-6 pb-4 border-b border-border/40">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AI Image Studio</div>
          <h2 className="font-display text-2xl font-bold text-aurora mt-1">
            {NAV.find(n => n.key === activePanel)?.label}
          </h2>
        </header>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
          <Panel />
        </div>
        <div className="p-4 border-t border-border/40">
          <button onClick={generate} disabled={loading}
            className="w-full gradient-aurora text-primary-foreground font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 glow-primary hover:-translate-y-0.5 active:translate-y-0 transition disabled:opacity-60">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</> : <><Rocket className="w-5 h-5" /> Gerar Imagem</>}
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 glass-strong border-b border-border/40 flex items-center justify-between px-4 h-14">
        <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-aurora flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-aurora">AI Studio</span>
        </div>
        <button onClick={generate} disabled={loading}
          className="w-10 h-10 rounded-xl gradient-aurora flex items-center justify-center disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4 text-primary-foreground" />}
        </button>
      </header>

      {/* MOBILE SHEET */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-[86%] max-w-[360px] h-full glass-strong border-r border-border/40 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl gradient-aurora flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display font-bold text-aurora">AI Image Studio</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="w-9 h-9 rounded-xl glass flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-1 p-3 overflow-x-auto scrollbar-thin border-b border-border/40">
              {NAV.map(({ key, Icon, label }) => (
                <button key={key} onClick={() => setActivePanel(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm whitespace-nowrap transition ${
                    activePanel === key ? "gradient-aurora text-primary-foreground" : "glass text-muted-foreground"
                  }`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
              <Panel />
            </div>
            <div className="p-4 border-t border-border/40">
              <button onClick={() => { setSidebarOpen(false); generate(); }} disabled={loading}
                className="w-full gradient-aurora text-primary-foreground font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 glow-primary disabled:opacity-60">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</> : <><Rocket className="w-5 h-5" /> Gerar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANVAS */}
      <main className="flex-1 md:ml-[416px] pt-14 md:pt-0 min-h-screen flex">
        <section className="flex-1 relative bg-dot-grid flex items-center justify-center overflow-hidden p-4 md:p-8">
          <div className="relative w-full h-[calc(100vh-4.5rem)] md:h-[calc(100vh-4rem)] rounded-3xl glass overflow-hidden flex items-center justify-center">
            {/* aurora glow behind canvas */}
            <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-accent/15 blur-3xl" />

            {!imgUrl && !loading && (
              <div className="text-center text-muted-foreground p-6 relative z-10">
                <div className="w-20 h-20 mx-auto mb-4 rounded-3xl glass flex items-center justify-center">
                  <ImageIcon className="w-9 h-9 opacity-60" />
                </div>
                <div className="font-display text-lg">Sua obra aparecerá aqui</div>
                <div className="text-xs mt-1 opacity-70">Descreva algo no painel e toque em Gerar</div>
              </div>
            )}
            {loading && (
              <div className="flex flex-col items-center gap-4 z-10 relative">
                <div className="w-16 h-16 rounded-2xl gradient-aurora flex items-center justify-center glow-primary">
                  <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
                </div>
                <div className="font-display uppercase tracking-[0.3em] text-sm animate-pulse">Processando</div>
              </div>
            )}
            {imgUrl && !loading && (
              <>
                <img src={imgUrl} alt="Imagem gerada" className="relative z-10 max-w-full max-h-full object-contain rounded-2xl" />
                <div className="absolute bottom-5 right-5 flex gap-2 z-20">
                  <button onClick={editCurrent} title="Editar"
                    className="w-11 h-11 rounded-2xl glass-strong flex items-center justify-center hover:bg-primary hover:border-primary hover:text-primary-foreground transition">
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button onClick={download} title="Baixar"
                    className="w-11 h-11 rounded-2xl glass-strong flex items-center justify-center hover:bg-primary hover:border-primary hover:text-primary-foreground transition">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
