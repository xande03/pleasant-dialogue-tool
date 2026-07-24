import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Download,
  Pencil,
  Upload,
  Rocket,
  Loader2,
  ImageIcon,
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
  Cpu,
} from "lucide-react";

type Mode = "create" | "edit";
type CreateFn = "free" | "sticker" | "text" | "comic";
type EditFn = "add-remove" | "retouch" | "style" | "compose";
type NavKey = "compose" | "ratio" | "style" | "mode" | "model";

const RATIOS = [
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

const MODELS = [
  { v: "flux", l: "Flux", desc: "Padrão — equilíbrio geral" },
  { v: "flux-realism", l: "Flux Realism", desc: "Fotorrealismo" },
  { v: "flux-anime", l: "Flux Anime", desc: "Anime / mangá" },
  { v: "flux-3d", l: "Flux 3D", desc: "Render 3D estilizado" },
  { v: "flux-cablyai", l: "Flux Cably", desc: "Ilustração criativa" },
  { v: "turbo", l: "Turbo", desc: "Rápido, baixa latência" },
];

const NAV: { key: NavKey; Icon: typeof Wand2; label: string }[] = [
  { key: "compose", Icon: Wand2, label: "Prompt" },
  { key: "mode", Icon: SlidersHorizontal, label: "Modo" },
  { key: "model", Icon: Cpu, label: "Modelo" },
  { key: "ratio", Icon: RatioIcon, label: "Proporção" },
  { key: "style", Icon: Palette, label: "Estilo" },
];

import {
  expandKnownTerms,
  getCachedEnhancement,
  setCachedEnhancement,
} from "@/lib/prompt-knowledge";

const GEMINI_KEY =
  import.meta.env.VITE_GEMINI_KEY || import.meta.env.VITE_GOOGLE_AI_KEY || "";

const ENHANCE_SYSTEM = `You are a world-class prompt engineer for text-to-image models. Rewrite the user's idea into ONE vivid, detailed English prompt (max ~90 words) that captures REAL-WORLD accuracy of any:
- natural phenomena (weather, geology, astronomy, biology): correct scale, physics, lighting, materials.
- cultural / historical references (clothing, architecture, rituals, symbols): accurate era, region, ethnicity, materials.
- cinematic references (films, directors, genres, franchises, camera work): mirror the ACTUAL look — lens, film stock, color grading, framing, production design, mood. Examples: "Wes Anderson" = symmetrical pastel; "Villeneuve/Dune" = ochre desert brutalism; "cyberpunk" = neon-drenched rainy megacity; "A24" = 35mm arthouse grain.
- contemporary music/film/art figures and pop-culture movements (Taylor Swift, Beyoncé, Anitta, Billie Eilish, Bad Bunny, Studio Ghibli, Pixar, Barbiecore, Y2K, cottagecore, solarpunk, vaporwave, dark academia): use their canonical visual signature.
- named real politicians and public figures: describe factual appearance neutrally (hair, age, typical attire, national symbols) — never invent political statements.
The user prompt may include a bracketed "[visual references — ...]" block: TREAT IT AS GROUND TRUTH and integrate those descriptors, but drop the brackets in the final output.
Preserve the user's original named entities EXACTLY (spelling and meaning). Add concrete visual detail (composition, lighting, lens, materials, mood) but do NOT invent facts that contradict reality. Return ONLY the final prompt in English, no quotes, no preface, no explanation.`;

async function enhancePrompt(prompt: string): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  const cached = getCachedEnhancement(prompt);
  if (cached) return cached;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  } catch {
    return null;
  }
}

function preloadImage(url: string) {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = url;
  });
}

/* -------------------- STATIC subcomponents (defined outside Index to avoid
   remount-on-render, which was killing textarea focus on every keystroke). */

const Section = ({
  id,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  id: string;
  icon: typeof Wand2;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <section id={`sec-${id}`} className="glass rounded-3xl p-4 sm:p-5 border border-border/40">
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-9 h-9 rounded-xl gradient-aurora flex items-center justify-center glow-primary shrink-0">
        <Icon className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="min-w-0">
        <h3 className="font-display text-base font-semibold leading-tight truncate">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </div>
    {children}
  </section>
);

type PanelProps = {
  prompt: string;
  setPrompt: (v: string) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  createFn: CreateFn;
  setCreateFn: (v: CreateFn) => void;
  editFn: EditFn;
  setEditFn: (v: EditFn) => void;
  ratio: (typeof RATIOS)[number];
  setRatio: (r: (typeof RATIOS)[number]) => void;
  style: string;
  setStyle: (s: string) => void;
  showMainUpload: boolean;
  showTwoImages: boolean;
  previewMain: string | null;
  setPreviewMain: (v: string) => void;
  preview1: string | null;
  setPreview1: (v: string) => void;
  preview2: string | null;
  setPreview2: (v: string) => void;
};

const Panel = (p: PanelProps) => {
  const fileMain = useRef<HTMLInputElement>(null);
  const file1 = useRef<HTMLInputElement>(null);
  const file2 = useRef<HTMLInputElement>(null);

  const handleUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void,
  ) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  return (
    <div className="flex flex-col gap-4">
      <Section id="compose" icon={Wand2} title="Prompt" subtitle="Descreva sua ideia">
        <textarea
          value={p.prompt}
          onChange={(e) => p.setPrompt(e.target.value)}
          placeholder="Ex: Um gato samurai sob luz neon em Tóquio nos anos 80..."
          autoComplete="off"
          spellCheck
          className="w-full h-28 glass rounded-2xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition placeholder:text-muted-foreground/60"
        />

        {p.showTwoImages && (
          <div className="flex flex-col gap-3 mt-3">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Duas Imagens
            </label>
            {[
              { ref: file1, preview: p.preview1, set: p.setPreview1, label: "Primeira Imagem" },
              { ref: file2, preview: p.preview2, set: p.setPreview2, label: "Segunda Imagem" },
            ].map((u, i) => (
              <div
                key={i}
                onClick={() => u.ref.current?.click()}
                className="relative glass border-2 border-dashed border-border/60 rounded-2xl p-3 min-h-[90px] flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 transition overflow-hidden"
              >
                <input
                  ref={u.ref}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e, u.set)}
                />
                {u.preview ? (
                  <img src={u.preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <div className="text-xs mt-1.5">{u.label}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {p.showMainUpload && (
          <div
            onClick={() => fileMain.current?.click()}
            className="relative glass border-2 border-dashed border-border/60 rounded-2xl p-3 min-h-[100px] mt-3 flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 transition overflow-hidden"
          >
            <input
              ref={fileMain}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUpload(e, p.setPreviewMain)}
            />
            {p.previewMain ? (
              <img src={p.previewMain} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <Upload className="w-5 h-5 text-muted-foreground" />
                <div className="text-xs mt-1.5">Envie uma imagem</div>
                <div className="text-[10px] text-muted-foreground">PNG, JPG, WebP</div>
              </>
            )}
          </div>
        )}
      </Section>

      <Section id="mode" icon={SlidersHorizontal} title="Modo" subtitle="Criar ou editar">
        <div className="flex glass rounded-2xl p-1 mb-3">
          {(["create", "edit"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => p.setMode(m)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                p.mode === m
                  ? "gradient-aurora text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "create" ? "Criar" : "Editar"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(p.mode === "create" ? CREATE_FNS : EDIT_FNS).map((f: any) => {
            const active = p.mode === "create" ? p.createFn === f.id : p.editFn === f.id;
            return (
              <button
                key={f.id}
                onClick={() =>
                  p.mode === "create" ? p.setCreateFn(f.id) : p.setEditFn(f.id)
                }
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition ${
                  active
                    ? "bg-primary/15 border-primary/60 text-primary glow-primary"
                    : "glass hover:border-primary/30"
                }`}
              >
                <f.Icon className="w-4 h-4" />
                <div className="text-xs font-medium">{f.label}</div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        id="ratio"
        icon={RatioIcon}
        title="Proporção"
        subtitle={`Atual: ${p.ratio.label} • ${p.ratio.w}×${p.ratio.h}`}
      >
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {RATIOS.map((r) => (
            <button
              key={r.ratio}
              onClick={() => p.setRatio(r)}
              title={r.tooltip}
              className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                p.ratio.ratio === r.ratio
                  ? "gradient-aurora border-transparent text-primary-foreground glow-primary"
                  : "glass hover:border-primary/30"
              }`}
            >
              <div
                className="border-2 border-current rounded-sm"
                style={{
                  width: Math.min(22, (r.w / Math.max(r.w, r.h)) * 20),
                  height: Math.min(22, (r.h / Math.max(r.w, r.h)) * 20),
                }}
              />
              <span className="text-[10px] font-semibold">{r.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section id="style" icon={Palette} title="Estilo" subtitle="Preset visual">
        <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto scrollbar-thin pr-1">
          {STYLES.map((s) => (
            <button
              key={s.v}
              onClick={() => p.setStyle(s.v)}
              className={`p-2.5 rounded-xl border text-left text-xs transition ${
                p.style === s.v
                  ? "bg-primary/15 border-primary/60 text-primary"
                  : "glass hover:border-primary/30"
              }`}
            >
              {s.l}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
};

/* ---------------------------------- PAGE --------------------------------- */

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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<NavKey>("compose");

  const currentFn: string = mode === "create" ? createFn : editFn;
  const showMainUpload =
    (mode === "create" && currentFn !== "free") ||
    (mode === "edit" && currentFn !== "compose");
  const showTwoImages = mode === "edit" && currentFn === "compose";

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const generate = useCallback(async () => {
    if (loading) return;
    if (!prompt.trim()) {
      toast.error("Por favor, digite um prompt.");
      return;
    }
    setLoading(true);
    setImgUrl(null);

    let finalPrompt = prompt.trim();
    if (style) finalPrompt += `, ${style} style`;
    if (mode === "create") {
      if (createFn === "sticker")
        finalPrompt +=
          ", die-cut sticker design, white background, vector art, bold outlines, isolated, cute, colorful";
      if (createFn === "text")
        finalPrompt +=
          ", minimalist logo design, vector graphics, simple typography, flat design, centered, professional, clean background";
      if (createFn === "comic")
        finalPrompt +=
          ", comic book style, graphic novel, bold black outlines, halftone dots, vibrant colors, speech bubbles, dynamic action shot";
    }

    // Expande referências conhecidas (filmes, diretores, artistas, políticos,
    // fenômenos, movimentos culturais) com descritores visuais canônicos.
    const { expanded, matches } = expandKnownTerms(finalPrompt);
    finalPrompt = expanded;
    if (matches.length) {
      toast.message(
        `Referências reconhecidas: ${matches.slice(0, 3).join(", ")}${matches.length > 3 ? "…" : ""}`,
      );
    }

    try {
      if (GEMINI_KEY) {
        toast.message("Refinando prompt com contexto real...");
        const enhanced = await enhancePrompt(finalPrompt);
        if (enhanced) finalPrompt = enhanced;
      }
      const seed = Math.floor(Math.random() * 1_000_000);
      finalPrompt += `, aspect ratio ${ratio.ratio}, ${ratio.w}x${ratio.h}, accurate real-world detail, high fidelity`;
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        finalPrompt,
      )}?width=${ratio.w}&height=${ratio.h}&nologo=true&seed=${seed}&model=flux&nofeed=true&enhance=true`;
      await preloadImage(url);
      setImgUrl(url);
      toast.success("Imagem gerada!");
    } catch (err) {
      console.error(err);
      toast.error("Erro na geração. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [loading, prompt, style, mode, createFn, ratio]);

  const download = () => {
    if (!imgUrl) {
      toast.error("Gere uma imagem primeiro.");
      return;
    }
    window.open(imgUrl, "_blank");
  };

  const editCurrent = () => {
    if (!imgUrl) {
      toast.error("Não há imagem para editar.");
      return;
    }
    setPreviewMain(imgUrl);
    setMode("edit");
    setEditFn("retouch");
    setActivePanel("mode");
    toast.success("Modo edição ativado!");
  };

  const scrollTo = (key: NavKey) => {
    setActivePanel(key);
    const el = document.getElementById(`sec-${key}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const panelProps: PanelProps = useMemo(
    () => ({
      prompt,
      setPrompt,
      mode,
      setMode,
      createFn,
      setCreateFn,
      editFn,
      setEditFn,
      ratio,
      setRatio,
      style,
      setStyle,
      showMainUpload,
      showTwoImages,
      previewMain,
      setPreviewMain,
      preview1,
      setPreview1,
      preview2,
      setPreview2,
    }),
    [
      prompt,
      mode,
      createFn,
      editFn,
      ratio,
      style,
      showMainUpload,
      showTwoImages,
      previewMain,
      preview1,
      preview2,
    ],
  );

  return (
    <div className="min-h-screen w-full flex">
      {/* ICON RAIL (desktop) */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-[68px] lg:w-[76px] z-30 flex-col items-center py-6 gap-6 glass-strong border-r border-border/40">
        <div className="w-11 h-11 rounded-2xl gradient-aurora flex items-center justify-center glow-primary">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          {NAV.map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => scrollTo(key)}
              title={label}
              className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition group ${
                activePanel === key
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {activePanel === key && (
                <span className="absolute -left-[14px] top-2 bottom-2 w-1 rounded-full gradient-aurora" />
              )}
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </div>
        <button
          onClick={generate}
          disabled={loading}
          title="Gerar"
          className="w-12 h-12 rounded-2xl gradient-aurora glow-primary flex items-center justify-center hover:scale-105 active:scale-95 transition disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Rocket className="w-5 h-5 text-primary-foreground" />
          )}
        </button>
      </nav>

      {/* SIDEBAR PANEL (desktop) */}
      <aside className="hidden md:flex fixed left-[68px] lg:left-[76px] top-0 bottom-0 w-[300px] lg:w-[340px] z-20 flex-col glass-strong border-r border-border/40">
        <header className="px-5 lg:px-6 pt-6 pb-4 border-b border-border/40">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            AI Image Studio
          </div>
          <h2 className="font-display text-2xl font-bold text-aurora mt-1">Painel</h2>
          <p className="text-xs text-muted-foreground mt-1">Tudo em um só lugar</p>
        </header>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 lg:px-6 py-5">
          <Panel {...panelProps} />
        </div>
        <div className="p-4 border-t border-border/40">
          <button
            onClick={generate}
            disabled={loading}
            className="w-full gradient-aurora text-primary-foreground font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 glow-primary hover:-translate-y-0.5 active:translate-y-0 transition disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Processando...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" /> Gerar Imagem
              </>
            )}
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 glass-strong border-b border-border/40 flex items-center justify-between px-3 sm:px-4 h-14">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-10 h-10 rounded-xl glass flex items-center justify-center"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-aurora flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-aurora text-sm sm:text-base">
            AI Studio
          </span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="w-10 h-10 rounded-xl gradient-aurora flex items-center justify-center disabled:opacity-60"
          aria-label="Gerar"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4 text-primary-foreground" />
          )}
        </button>
      </header>

      {/* MOBILE SHEET */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-[90%] max-w-[360px] h-full glass-strong border-r border-border/40 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl gradient-aurora flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display font-bold text-aurora">AI Image Studio</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-9 h-9 rounded-xl glass flex items-center justify-center"
                aria-label="Fechar menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-1 p-3 overflow-x-auto scrollbar-thin border-b border-border/40">
              {NAV.map(({ key, Icon, label }) => (
                <button
                  key={key}
                  onClick={() => scrollTo(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm whitespace-nowrap transition ${
                    activePanel === key
                      ? "gradient-aurora text-primary-foreground"
                      : "glass text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-5">
              <Panel {...panelProps} />
            </div>
            <div className="p-4 border-t border-border/40">
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  generate();
                }}
                disabled={loading}
                className="w-full gradient-aurora text-primary-foreground font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 glow-primary disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" /> Gerar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANVAS */}
      <main className="flex-1 md:ml-[368px] lg:ml-[416px] pt-14 md:pt-0 min-h-screen flex">
        <section className="flex-1 relative bg-dot-grid flex items-center justify-center overflow-hidden p-3 sm:p-4 md:p-8">
          <div className="relative w-full h-[calc(100vh-4.5rem)] md:h-[calc(100vh-4rem)] rounded-3xl glass overflow-hidden flex items-center justify-center">
            <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-accent/15 blur-3xl" />

            {!imgUrl && !loading && (
              <div className="text-center text-muted-foreground p-6 relative z-10">
                <div className="w-20 h-20 mx-auto mb-4 rounded-3xl glass flex items-center justify-center">
                  <ImageIcon className="w-9 h-9 opacity-60" />
                </div>
                <div className="font-display text-lg">Sua obra aparecerá aqui</div>
                <div className="text-xs mt-1 opacity-70">
                  Descreva algo no painel e toque em Gerar
                </div>
              </div>
            )}
            {loading && (
              <div className="flex flex-col items-center gap-4 z-10 relative">
                <div className="w-16 h-16 rounded-2xl gradient-aurora flex items-center justify-center glow-primary">
                  <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
                </div>
                <div className="font-display uppercase tracking-[0.3em] text-sm animate-pulse">
                  Processando
                </div>
              </div>
            )}
            {imgUrl && !loading && (
              <>
                <img
                  src={imgUrl}
                  alt="Imagem gerada"
                  className="relative z-10 max-w-full max-h-full object-contain rounded-2xl"
                />
                <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 flex gap-2 z-20">
                  <button
                    onClick={editCurrent}
                    title="Editar"
                    className="w-11 h-11 rounded-2xl glass-strong flex items-center justify-center hover:bg-primary hover:border-primary hover:text-primary-foreground transition"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={download}
                    title="Baixar"
                    className="w-11 h-11 rounded-2xl glass-strong flex items-center justify-center hover:bg-primary hover:border-primary hover:text-primary-foreground transition"
                  >
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
