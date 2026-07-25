import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles, Download, Pencil, Upload, Rocket, Loader2, ImageIcon,
  Wand2, SlidersHorizontal, Palette, Ratio as RatioIcon, Type as TypeIcon,
  Sticker, MessageSquare, Plus, Target, Layers, Combine, Cpu,
  Blocks, Film, Drama,
} from "lucide-react";
import { expandKnownTerms, getCachedEnhancement, setCachedEnhancement } from "@/lib/prompt-knowledge";

type Mode = "create" | "edit";
type CreateFn = "free" | "sticker" | "text" | "comic" | "lego" | "poster" | "anime";
type EditFn = "add-remove" | "retouch" | "style" | "compose";

const RATIOS = [
  { label: "1:1", ratio: "1:1", w: 1024, h: 1024, tip: "Quadrado" },
  { label: "9:16", ratio: "9:16", w: 720, h: 1280, tip: "Story" },
  { label: "16:9", ratio: "16:9", w: 1280, h: 720, tip: "Cinema" },
  { label: "2:3", ratio: "2:3", w: 768, h: 1152, tip: "Retrato" },
  { label: "3:2", ratio: "3:2", w: 1152, h: 768, tip: "Paisagem" },
];

const STYLES = [
  { v: "", l: "Padrão" }, { v: "photorealistic", l: "Fotorealista" },
  { v: "3d render", l: "Render 3D" }, { v: "anime style", l: "Anime" },
  { v: "creative", l: "Criativo" }, { v: "dynamic", l: "Dinâmico" },
  { v: "illustration", l: "Ilustração" }, { v: "watercolor painting", l: "Aquarela" },
  { v: "portrait", l: "Retrato Artístico" }, { v: "cinematic lighting", l: "Cinematográfico" },
  { v: "fashion photography", l: "Moda" }, { v: "cyberpunk", l: "Cyberpunk" },
  { v: "oil painting", l: "Óleo" }, { v: "pixel art", l: "Pixel Art" },
  { v: "minimalist", l: "Minimalista" }, { v: "vintage", l: "Vintage" },
  { v: "noir", l: "Noir" }, { v: "fantasy", l: "Fantasia" }, { v: "scifi", l: "Sci-Fi" },
];

const CREATE_FNS: { id: CreateFn; Icon: typeof Sparkles; label: string }[] = [
  { id: "free", Icon: Sparkles, label: "Prompt" },
  { id: "sticker", Icon: Sticker, label: "Adesivos" },
  { id: "text", Icon: TypeIcon, label: "Logo" },
  { id: "comic", Icon: MessageSquare, label: "HQ" },
  { id: "lego", Icon: Blocks, label: "Lego" },
  { id: "poster", Icon: Film, label: "Poster" },
  { id: "anime", Icon: Drama, label: "Anime" },
];
const EDIT_FNS: { id: EditFn; Icon: typeof Plus; label: string }[] = [
  { id: "add-remove", Icon: Plus, label: "Adicionar" },
  { id: "retouch", Icon: Target, label: "Retoque" },
  { id: "style", Icon: Layers, label: "Estilo" },
  { id: "compose", Icon: Combine, label: "Unir" },
];
const MODELS = [
  { v: "flux", l: "Flux", desc: "Padrão equilibrado" },
  { v: "flux-realism", l: "Realism", desc: "Fotorrealismo" },
  { v: "flux-anime", l: "Anime", desc: "Anime / mangá" },
  { v: "flux-3d", l: "3D", desc: "Render estilizado" },
  { v: "flux-cablyai", l: "Cably", desc: "Ilustração" },
  { v: "turbo", l: "Turbo", desc: "Baixa latência" },
];

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || import.meta.env.VITE_GOOGLE_AI_KEY || "";

const ENHANCE_SYSTEM = `You are a world-class prompt engineer for text-to-image models. Rewrite the user's idea into ONE vivid, detailed English prompt (max ~90 words) preserving real-world accuracy of natural phenomena, cultural/historical references, cinematic references (mirror actual look: lens, film stock, color grading, framing), contemporary music/film/art figures, pop-culture movements, and named real people (factual neutral description). Preserve named entities exactly. Return only the final prompt in English, no quotes or preface.`;

async function enhancePrompt(prompt: string): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  const cached = getCachedEnhancement(prompt);
  if (cached) return cached;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: ENHANCE_SYSTEM }] },
        contents: [{ parts: [{ text: `User idea: "${prompt}"` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 280 },
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const out = d?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
    const clean = out ? out.trim().replace(/^["']|["']$/g, "") : null;
    if (clean) setCachedEnhancement(prompt, clean);
    return clean;
  } catch { return null; }
}

const preloadImage = (url: string) => new Promise<string>((res, rej) => {
  const img = new Image();
  img.onload = () => res(url); img.onerror = () => rej(new Error("fail")); img.src = url;
});

const Card = ({ icon: Icon, title, subtitle, children }: any) => (
  <section className="glass rounded-2xl p-4 border border-border/40">
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-8 h-8 rounded-lg gradient-aurora flex items-center justify-center glow-primary shrink-0">
        <Icon className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="min-w-0">
        <h3 className="font-display text-sm font-semibold leading-tight truncate">{title}</h3>
        {subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </div>
    {children}
  </section>
);

export default function ImageStudio() {
  const [mode, setMode] = useState<Mode>("create");
  const [createFn, setCreateFn] = useState<CreateFn>("free");
  const [editFn, setEditFn] = useState<EditFn>("add-remove");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [model, setModel] = useState<string>(() => {
    try { return localStorage.getItem("ai-studio:model") || "flux"; } catch { return "flux"; }
  });
  const [ratio, setRatio] = useState(RATIOS[0]);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewMain, setPreviewMain] = useState<string | null>(null);
  const [preview1, setPreview1] = useState<string | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);
  const fileMain = useRef<HTMLInputElement>(null);
  const file1 = useRef<HTMLInputElement>(null);
  const file2 = useRef<HTMLInputElement>(null);

  const currentFn: string = mode === "create" ? createFn : editFn;
  const showMainUpload = (mode === "create" && currentFn !== "free") || (mode === "edit" && currentFn !== "compose");
  const showTwoImages = mode === "edit" && currentFn === "compose";

  useEffect(() => { try { localStorage.setItem("ai-studio:model", model); } catch {} }, [model]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = ev => setter(ev.target?.result as string); r.readAsDataURL(f);
  };

  const generate = useCallback(async () => {
    if (loading) return;
    if (!prompt.trim()) { toast.error("Digite um prompt."); return; }
    setLoading(true); setImgUrl(null);
    let finalPrompt = prompt.trim();
    if (style) finalPrompt += `, ${style} style`;
    if (mode === "create") {
      if (createFn === "sticker") finalPrompt += ", die-cut sticker design, white background, vector art, bold outlines, isolated";
      if (createFn === "text") finalPrompt += ", minimalist logo design, vector graphics, flat design, centered, clean background";
      if (createFn === "comic") finalPrompt += ", comic book style, bold black outlines, halftone dots, vibrant colors, dynamic action";
    }
    const { expanded, matches } = expandKnownTerms(finalPrompt);
    finalPrompt = expanded;
    if (matches.length) toast.message(`Refs: ${matches.slice(0, 3).join(", ")}${matches.length > 3 ? "…" : ""}`);
    try {
      if (GEMINI_KEY) {
        toast.message("Refinando prompt…");
        const enhanced = await enhancePrompt(finalPrompt);
        if (enhanced) finalPrompt = enhanced;
      }
      const seed = Math.floor(Math.random() * 1_000_000);
      finalPrompt += `, aspect ratio ${ratio.ratio}, ${ratio.w}x${ratio.h}, accurate real-world detail, high fidelity`;
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=${ratio.w}&height=${ratio.h}&nologo=true&seed=${seed}&model=${encodeURIComponent(model)}&nofeed=true&enhance=true`;
      await preloadImage(url);
      setImgUrl(url);
      toast.success("Imagem gerada!");
    } catch { toast.error("Erro na geração."); }
    finally { setLoading(false); }
  }, [loading, prompt, style, mode, createFn, ratio, model]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-3 sm:p-5 lg:p-6 xl:p-8 min-h-screen w-full max-w-full overflow-x-hidden">
      {/* Controls */}
      <div className="w-full lg:w-[340px] xl:w-[380px] 2xl:w-[420px] shrink-0 flex flex-col gap-3 lg:overflow-y-auto scrollbar-thin lg:max-h-[calc(100vh-4rem)] pr-1 min-w-0">

        <Card icon={Wand2} title="Prompt" subtitle="Descreva sua ideia">
          <textarea
            value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder="Ex: Um gato samurai sob luz neon em Tóquio nos anos 80..."
            autoComplete="off" spellCheck
            className="w-full h-24 glass rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60"
          />
          {showTwoImages && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[{ ref: file1, p: preview1, set: setPreview1, l: "Imagem 1" },
                { ref: file2, p: preview2, set: setPreview2, l: "Imagem 2" }].map((u, i) => (
                <div key={i} onClick={() => u.ref.current?.click()} className="relative glass border-2 border-dashed border-border/60 rounded-xl min-h-[80px] flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 overflow-hidden">
                  <input ref={u.ref} type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, u.set)} />
                  {u.p ? <img src={u.p} className="absolute inset-0 w-full h-full object-cover" alt="" />
                       : <><Upload className="w-4 h-4 text-muted-foreground" /><div className="text-[10px] mt-1">{u.l}</div></>}
                </div>
              ))}
            </div>
          )}
          {showMainUpload && (
            <div onClick={() => fileMain.current?.click()} className="relative glass border-2 border-dashed border-border/60 rounded-xl min-h-[90px] mt-3 flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 overflow-hidden">
              <input ref={fileMain} type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, setPreviewMain)} />
              {previewMain ? <img src={previewMain} className="absolute inset-0 w-full h-full object-cover" alt="" />
                : <><Upload className="w-5 h-5 text-muted-foreground" /><div className="text-xs mt-1">Envie uma imagem</div></>}
            </div>
          )}
        </Card>

        <Card icon={SlidersHorizontal} title="Modo" subtitle="Criar ou editar">
          <div className="flex glass rounded-xl p-1 mb-2">
            {(["create", "edit"] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${mode === m ? "gradient-aurora text-primary-foreground" : "text-muted-foreground"}`}>
                {m === "create" ? "Criar" : "Editar"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(mode === "create" ? CREATE_FNS : EDIT_FNS).map((f: any) => {
              const active = mode === "create" ? createFn === f.id : editFn === f.id;
              return (
                <button key={f.id} onClick={() => mode === "create" ? setCreateFn(f.id) : setEditFn(f.id)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${active ? "bg-primary/15 border-primary/60 text-primary" : "glass hover:border-primary/30"}`}>
                  <f.Icon className="w-3.5 h-3.5" /><div className="text-[10px] font-medium">{f.label}</div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card icon={Cpu} title="Modelo" subtitle={MODELS.find(m => m.v === model)?.l}>
          <div className="grid grid-cols-2 gap-1.5">
            {MODELS.map(m => (
              <button key={m.v} onClick={() => setModel(m.v)}
                className={`p-2 rounded-lg border text-left transition ${model === m.v ? "bg-primary/15 border-primary/60 text-primary" : "glass hover:border-primary/30"}`}>
                <div className="text-[11px] font-semibold">{m.l}</div>
                <div className="text-[9px] text-muted-foreground">{m.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card icon={RatioIcon} title="Proporção" subtitle={`${ratio.label} • ${ratio.w}×${ratio.h}`}>
          <div className="grid grid-cols-5 gap-1.5">
            {RATIOS.map(r => (
              <button key={r.ratio} onClick={() => setRatio(r)} title={r.tip}
                className={`min-h-[64px] rounded-lg border flex flex-col items-center justify-center gap-1.5 p-1 transition ${ratio.ratio === r.ratio ? "gradient-aurora border-transparent text-primary-foreground" : "glass hover:border-primary/30"}`}>
                <div className="border-2 border-current rounded-sm" style={{ width: (r.w / Math.max(r.w, r.h)) * 24, height: (r.h / Math.max(r.w, r.h)) * 24 }} />
                <span className="text-[10px] font-semibold">{r.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card icon={Palette} title="Estilo" subtitle={STYLES.find(s => s.v === style)?.l || "Padrão"}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {STYLES.map(s => (
              <button key={s.v} onClick={() => setStyle(s.v)}
                className={`px-2 py-2 rounded-lg border text-center text-[11px] font-medium transition ${style === s.v ? "bg-primary/15 border-primary/60 text-primary" : "glass hover:border-primary/30 text-muted-foreground hover:text-foreground"}`}>
                {s.l}
              </button>
            ))}
          </div>
        </Card>

        <button onClick={generate} disabled={loading}
          className="sticky bottom-0 w-full gradient-aurora text-primary-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2 glow-primary hover:-translate-y-0.5 transition disabled:opacity-60">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando…</> : <><Rocket className="w-4 h-4" /> Gerar Imagem</>}
        </button>
      </div>

      {/* Canvas */}
      <section className="flex-1 relative bg-dot-grid rounded-2xl glass overflow-hidden min-h-[400px] lg:min-h-0 flex items-center justify-center p-3 sm:p-4">
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-accent/15 blur-3xl" />
        {!imgUrl && !loading && (
          <div className="text-center text-muted-foreground p-6 relative z-10">
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl glass flex items-center justify-center"><ImageIcon className="w-9 h-9 opacity-60" /></div>
            <div className="font-display text-lg">Sua obra aparecerá aqui</div>
            <div className="text-xs mt-1 opacity-70">Descreva algo e toque em Gerar</div>
          </div>
        )}
        {loading && (
          <div className="flex flex-col items-center gap-4 z-10 relative">
            <div className="w-16 h-16 rounded-2xl gradient-aurora flex items-center justify-center glow-primary"><Loader2 className="w-7 h-7 text-primary-foreground animate-spin" /></div>
            <div className="font-display uppercase tracking-[0.3em] text-sm animate-pulse">Processando</div>
          </div>
        )}
        {imgUrl && !loading && (
          <>
            <img src={imgUrl} alt="Gerada" className="relative z-10 max-w-full max-h-full object-contain rounded-xl" />
            <div className="absolute bottom-4 right-4 flex gap-2 z-20">
              <button onClick={() => { setPreviewMain(imgUrl); setMode("edit"); setEditFn("retouch"); }}
                className="w-11 h-11 rounded-xl glass-strong flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition"><Pencil className="w-5 h-5" /></button>
              <button onClick={() => window.open(imgUrl, "_blank")}
                className="w-11 h-11 rounded-xl glass-strong flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition"><Download className="w-5 h-5" /></button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
