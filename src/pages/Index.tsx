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

const CREATE_FNS: { id: CreateFn; icon: string; label: string }[] = [
  { id: "free", icon: "✨", label: "Prompt" },
  { id: "sticker", icon: "🏷️", label: "Adesivos" },
  { id: "text", icon: "📝", label: "Logo" },
  { id: "comic", icon: "💭", label: "HQ" },
];

const EDIT_FNS: { id: EditFn; icon: string; label: string }[] = [
  { id: "add-remove", icon: "➕", label: "Adicionar" },
  { id: "retouch", icon: "🎯", label: "Retoque" },
  { id: "style", icon: "🎨", label: "Estilo" },
  { id: "compose", icon: "🖼️", label: "Unir" },
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
        contents: [
          {
            parts: [
              {
                text: `Rewrite this prompt for AI image generation, making it vivid and detailed. Return ONLY the rewritten prompt in English: "${prompt}"`,
              },
            ],
          },
        ],
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
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

  const fileMain = useRef<HTMLInputElement>(null);
  const file1 = useRef<HTMLInputElement>(null);
  const file2 = useRef<HTMLInputElement>(null);

  const currentFn: string = mode === "create" ? createFn : editFn;
  const showMainUpload =
    (mode === "create" && currentFn !== "free") ||
    (mode === "edit" && currentFn !== "compose");
  const showTwoImages = mode === "edit" && currentFn === "compose";

  const handleUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void
  ) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const generate = async () => {
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
        finalPrompt += ", die-cut sticker design, white background, vector art, bold outlines, isolated, cute, colorful";
      if (createFn === "text")
        finalPrompt += ", minimalist logo design, vector graphics, simple typography, flat design, centered, professional, clean background";
      if (createFn === "comic")
        finalPrompt += ", comic book style, graphic novel, bold black outlines, halftone dots, vibrant colors, speech bubbles, dynamic action shot";
    }

    try {
      if (GEMINI_KEY) {
        toast.message("Refinando prompt...");
        const enhanced = await enhancePrompt(finalPrompt);
        if (enhanced) finalPrompt = enhanced;
      }
      const seed = Math.floor(Math.random() * 1_000_000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        finalPrompt
      )}?width=${ratio.w}&height=${ratio.h}&nologo=true&seed=${seed}&model=flux`;
      await preloadImage(url);
      setImgUrl(url);
      toast.success("Imagem gerada!");
    } catch (err) {
      console.error(err);
      toast.error("Erro na geração. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

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
    toast.success("Configurações originais restauradas!");
  };

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-0 md:p-4">
      <div className="w-full max-w-[1400px] md:h-[92vh] flex flex-col md:flex-row bg-card md:rounded-2xl overflow-hidden border border-border shadow-2xl min-h-screen md:min-h-[600px]">
        {/* LEFT PANEL */}
        <aside className="w-full md:w-[400px] md:shrink-0 p-6 border-b md:border-b-0 md:border-r border-border overflow-y-auto scrollbar-thin flex flex-col gap-5 bg-card">
          <div>
            <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              AI Image Studio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerador profissional de imagens
            </p>
          </div>

          {/* PROMPT */}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
              💭 Descreva sua ideia
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Um gato samurai..."
              className="w-full h-24 bg-secondary border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          {/* RATIO */}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
              📐 Proporção
            </label>
            <div className="grid grid-cols-5 gap-2">
              {RATIOS.map((r) => (
                <button
                  key={r.ratio}
                  onClick={() => setRatio(r)}
                  title={r.tooltip}
                  className={`aspect-square rounded-lg border flex items-center justify-center transition ${
                    ratio.ratio === r.ratio
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-secondary border-border hover:border-muted-foreground"
                  }`}
                >
                  <div
                    className="border-2 border-current bg-white/10"
                    style={{
                      width: Math.min(20, (r.w / Math.max(r.w, r.h)) * 18),
                      height: Math.min(20, (r.h / Math.max(r.w, r.h)) * 18),
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* STYLE */}
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
              🎨 Estilo Artístico
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full h-11 px-3 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:border-primary cursor-pointer"
            >
              {STYLES.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.l}
                </option>
              ))}
            </select>
          </div>

          {/* MODE TOGGLE */}
          <div className="flex bg-secondary rounded-xl p-1 border border-border">
            {(["create", "edit"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                  mode === m
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground"
                }`}
              >
                {m === "create" ? "Criar" : "Editar"}
              </button>
            ))}
          </div>

          {/* FUNCTIONS */}
          {mode === "create" ? (
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
                🛠️ Estilo de Criação
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CREATE_FNS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setCreateFn(f.id)}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-1.5 transition hover:-translate-y-0.5 ${
                      createFn === f.id
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-secondary border-border"
                    }`}
                  >
                    <div className="text-2xl">{f.icon}</div>
                    <div className="text-sm font-medium">{f.label}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold block mb-2">
                🔧 Ferramentas de Edição
              </label>
              <div className="grid grid-cols-2 gap-2">
                {EDIT_FNS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setEditFn(f.id)}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-1.5 transition hover:-translate-y-0.5 ${
                      editFn === f.id
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-secondary border-border"
                    }`}
                  >
                    <div className="text-2xl">{f.icon}</div>
                    <div className="text-sm font-medium">{f.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* UPLOADS */}
          {showTwoImages && (
            <div className="flex flex-col gap-3">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                📸 Duas Imagens Necessárias
              </label>
              {[
                { ref: file1, preview: preview1, set: setPreview1, label: "Primeira Imagem" },
                { ref: file2, preview: preview2, set: setPreview2, label: "Segunda Imagem" },
              ].map((u, i) => (
                <div
                  key={i}
                  onClick={() => u.ref.current?.click()}
                  className="relative bg-secondary border-2 border-dashed border-border rounded-xl p-4 min-h-[120px] flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition overflow-hidden"
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
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <div className="text-sm mt-2">{u.label}</div>
                      <div className="text-xs text-muted-foreground">Clique para selecionar</div>
                    </>
                  )}
                </div>
              ))}
              <button
                onClick={() => setEditFn("add-remove")}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar para Edição
              </button>
            </div>
          )}

          {showMainUpload && (
            <div
              onClick={() => fileMain.current?.click()}
              className="relative bg-secondary border-2 border-dashed border-border rounded-xl p-4 min-h-[120px] flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition overflow-hidden"
            >
              <input
                ref={fileMain}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload(e, setPreviewMain)}
              />
              {previewMain ? (
                <img src={previewMain} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <div className="text-sm mt-2">Clique ou arraste uma imagem</div>
                  <div className="text-xs text-muted-foreground">PNG, JPG, WebP (máx. 10MB)</div>
                </>
              )}
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading}
            className="mt-auto gradient-primary text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 glow-primary hover:-translate-y-0.5 active:translate-y-0 transition disabled:opacity-60 disabled:cursor-not-allowed"
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
        </aside>

        {/* RIGHT PANEL */}
        <section className="flex-1 relative bg-black bg-dot-grid flex items-center justify-center overflow-hidden min-h-[400px] md:min-h-0">
          {!imgUrl && !loading && (
            <div className="text-center text-muted-foreground p-6">
              <ImageIcon className="w-16 h-16 mx-auto opacity-40 mb-3" />
              <div>Sua obra de arte aparecerá aqui</div>
            </div>
          )}
          {loading && (
            <div className="flex flex-col items-center gap-4 z-10">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="font-semibold tracking-widest animate-pulse">
                Processando seu prompt...
              </div>
            </div>
          )}
          {imgUrl && !loading && (
            <>
              <img src={imgUrl} alt="Imagem gerada" className="w-full h-full object-contain" />
              <div className="absolute bottom-5 right-5 flex gap-2">
                <button
                  onClick={editCurrent}
                  title="Editar"
                  className="w-11 h-11 rounded-full bg-black/70 border border-white/20 backdrop-blur flex items-center justify-center hover:bg-primary hover:border-primary hover:scale-110 transition"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button
                  onClick={download}
                  title="Baixar"
                  className="w-11 h-11 rounded-full bg-black/70 border border-white/20 backdrop-blur flex items-center justify-center hover:bg-primary hover:border-primary hover:scale-110 transition"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Index;
