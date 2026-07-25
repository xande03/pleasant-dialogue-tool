import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  Upload, Download, Trash2, QrCode as QrIcon, FileText, Music, Image as ImgIcon,
  File as FileIcon, Link as LinkIcon, Type as TypeIcon, History, ShieldCheck,
} from "lucide-react";

type QrKind = "text" | "url" | "file" | "image" | "music";
type QrItem = {
  id: string;
  createdAt: number;
  kind: QrKind;
  label: string;
  size: number; // payload size (chars)
  mime?: string;
  fileName?: string;
  qrDataUrl: string;   // PNG data URL of the QR
  payload: string;     // original content (text/url or data:...;base64,)
  qrPayload?: string;  // compact encrypted package actually embedded in the QR
  qrScanUrl?: string;  // viewer URL embedded in the QR for scanners
  encrypted?: boolean;
};

const STORAGE_KEY = "qr-tool:history:v1";
const QR_PREFIX = "AISQR1";
// QR v40 with EC "L" holds up to 2953 bytes binary — we use EC "L" for media
// so images/music (as data URLs) can actually fit.
const MAX_QR_CHARS = 2750;
const IMG_TARGET_MAX = 1550; // target content size before encrypted wrapper overhead
const FILE_MAX_BYTES = 1050; // hard cap for generic file payloads before encryption
const MUSIC_MAX_BYTES = 1050; // hard cap for audio payload (base64 expands ~4/3)

const load = (): QrItem[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
};
const save = (list: QrItem[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
};

const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

const iconForMime = (m?: string) => {
  if (!m) return FileIcon;
  if (m.startsWith("image/")) return ImgIcon;
  if (m.startsWith("audio/")) return Music;
  if (m === "application/pdf") return FileText;
  return FileIcon;
};

const readAsDataURL = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result as string);
  r.onerror = () => rej(new Error("read fail"));
  r.readAsDataURL(f);
});

const encodeBytes = (bytes: Uint8Array) => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const packEncryptedPayload = async (payload: string, meta: Partial<QrItem>) => {
  const body = JSON.stringify({
    v: 1,
    kind: meta.kind || "text",
    label: meta.label || "",
    mime: meta.mime || "",
    fileName: meta.fileName || "",
    payload,
  });
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(body),
  ));

  // Self-contained encrypted package: QR contains ciphertext + unlock material so
  // the content is real/portable, but not stored as raw readable text in the QR.
  return `${QR_PREFIX}.${encodeBytes(iv)}.${encodeBytes(keyBytes)}.${encodeBytes(cipher)}`;
};

const buildQrViewerUrl = (qrPayload: string) => {
  const origin = window.location.origin;
  const basePath = `${origin}/qr-viewer`;
  return `${basePath}#p=${qrPayload}`;
};

// Compress an image file to fit under ~IMG_TARGET_MAX chars (data URL)
// Iteratively reduces max dimension and JPEG quality until it fits.
const compressImageToFit = async (file: File, targetChars = IMG_TARGET_MAX): Promise<string> => {
  const original = await readAsDataURL(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("decode"));
    i.src = original;
  });
  const sizes = [320, 256, 200, 160, 128, 96, 80, 64, 48];
  const qualities = [0.78, 0.68, 0.58, 0.48, 0.38, 0.28, 0.2];
  let best = "";
  for (const maxDim of sizes) {
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    for (const q of qualities) {
      const url = canvas.toDataURL("image/jpeg", q);
      if (url.length <= targetChars) return url;
      best = url;
    }
  }
  return best; // may still be > target; caller will validate
};

export default function QrTool() {
  const [kind, setKind] = useState<QrKind>("text");
  const [text, setText] = useState("");
  const [history, setHistory] = useState<QrItem[]>(() => load());
  const [current, setCurrent] = useState<QrItem | null>(null);
  const [generating, setGenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { save(history); }, [history]);

  const generateFromPayload = async (payload: string, meta: Partial<QrItem>) => {
    setGenerating(true);
    try {
      const qrPayload = await packEncryptedPayload(payload, meta);
      const qrScanUrl = buildQrViewerUrl(qrPayload);
      if (qrScanUrl.length > MAX_QR_CHARS) {
        toast.error(`Conteúdo muito grande para caber em um QR com visualizador (${fmtBytes(qrScanUrl.length)}). Limite prático: ~${fmtBytes(MAX_QR_CHARS)}. Para arquivos maiores use um link.`);
        return;
      }
      // Media (image/music/file) needs low EC to fit; text/url stays medium.
      const isMedia = meta.kind === "image" || meta.kind === "music" || meta.kind === "file";
      const qrDataUrl = await QRCode.toDataURL(qrScanUrl, {
        errorCorrectionLevel: isMedia ? "L" : "M",
        margin: 2,
        width: isMedia ? 1024 : 760,
        color: { dark: "#0e1024", light: "#ffffff" },
      });
      const item: QrItem = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        kind: meta.kind || "text",
        label: meta.label || payload.slice(0, 40),
        size: payload.length,
        mime: meta.mime,
        fileName: meta.fileName,
        qrDataUrl,
        payload,
        qrPayload,
        qrScanUrl,
        encrypted: true,
      };
      const next = [item, ...history].slice(0, 50);
      setHistory(next);
      setCurrent(item);
      toast.success("QR code com visualizador criptografado gerado e salvo localmente!");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao gerar QR");
    } finally { setGenerating(false); }
  };

  const onGenerateText = () => {
    if (!text.trim()) { toast.error("Digite algum texto ou URL."); return; }
    const payload = text.trim();
    const isUrl = /^https?:\/\//i.test(payload);
    generateFromPayload(payload, {
      kind: isUrl ? "url" : "text",
      label: payload.slice(0, 60),
    });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      // Image kind: auto-compress to fit ~2KB (moderate visual size)
      if (kind === "image") {
        if (!f.type.startsWith("image/")) {
          toast.error("Selecione um arquivo de imagem.");
          return;
        }
        setGenerating(true);
        const compressed = await compressImageToFit(f, IMG_TARGET_MAX);
        setGenerating(false);
        if (compressed.length > MAX_QR_CHARS) {
          toast.error(`Não foi possível reduzir a imagem o suficiente (${fmtBytes(compressed.length)}). Tente uma imagem mais simples.`);
          return;
        }
        await generateFromPayload(compressed, {
          kind: "image",
          label: f.name,
          mime: "image/jpeg",
          fileName: f.name.replace(/\.[^.]+$/, "") + ".jpg",
        });
        return;
      }
      // Music kind: hard limit — real songs won't fit; accept only short clips
      if (kind === "music") {
        if (!f.type.startsWith("audio/")) {
          toast.error("Selecione um arquivo de áudio.");
          return;
        }
        if (f.size > MUSIC_MAX_BYTES) {
          toast.error(`Áudio muito grande (${fmtBytes(f.size)}). QR codes cabem no máx. ~${fmtBytes(MUSIC_MAX_BYTES)}. Use um clipe muito curto ou hospede o áudio e gere um QR do link.`);
          return;
        }
        const dataUrl = await readAsDataURL(f);
        await generateFromPayload(dataUrl, {
          kind: "music",
          label: f.name,
          mime: f.type,
          fileName: f.name,
        });
        return;
      }
      // Generic file
      if (f.size > FILE_MAX_BYTES) {
        toast.error(`Arquivo muito grande (${fmtBytes(f.size)}). QR criptografado aceita até ~${fmtBytes(FILE_MAX_BYTES)}. Para arquivos maiores, gere QR de um link.`);
        return;
      }
      const dataUrl = await readAsDataURL(f);
      await generateFromPayload(dataUrl, {
        kind: "file",
        label: f.name,
        mime: f.type,
        fileName: f.name,
      });
    } catch {
      setGenerating(false);
      toast.error("Falha ao ler arquivo.");
    }
  };

  const remove = (id: string) => {
    setHistory(h => h.filter(i => i.id !== id));
    if (current?.id === id) setCurrent(null);
  };

  const downloadQr = (item: QrItem) => {
    const a = document.createElement("a");
    a.href = item.qrDataUrl;
    a.download = `qr-${(item.fileName || item.label).replace(/\W+/g, "_").slice(0, 40)}.png`;
    a.click();
  };

  const downloadPayload = (item: QrItem) => {
    if (item.kind !== "file" && item.kind !== "image" && item.kind !== "music") return;
    const a = document.createElement("a");
    a.href = item.payload;
    a.download = item.fileName || "arquivo";
    a.click();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-3 sm:p-4 lg:p-6 min-h-full w-full max-w-full overflow-x-hidden">
      {/* Left: input */}
      <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col gap-3 min-w-0">

        <section className="glass rounded-2xl p-4 border border-border/40">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg gradient-aurora flex items-center justify-center glow-primary">
              <QrIcon className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold">Gerar QR Code</h3>
              <p className="text-[10px] text-muted-foreground">Texto, link, imagem, música ou arquivo</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1 glass rounded-xl p-1 mb-3">
            {([
              { k: "text" as QrKind, Icon: TypeIcon, l: "Texto" },
              { k: "url" as QrKind, Icon: LinkIcon, l: "Link" },
              { k: "image" as QrKind, Icon: ImgIcon, l: "Imagem" },
              { k: "music" as QrKind, Icon: Music, l: "Música" },
              { k: "file" as QrKind, Icon: FileIcon, l: "Arquivo" },
            ]).map(t => (
              <button key={t.k} onClick={() => setKind(t.k)}
                className={`py-1.5 rounded-lg text-[10px] font-semibold transition flex flex-col items-center justify-center gap-0.5 ${kind === t.k ? "gradient-aurora text-primary-foreground" : "text-muted-foreground"}`}>
                <t.Icon className="w-3.5 h-3.5" /> {t.l}
              </button>
            ))}
          </div>

          {kind === "text" || kind === "url" ? (
            <>
              <textarea
                value={text} onChange={e => setText(e.target.value)}
                placeholder={kind === "url" ? "https://exemplo.com/..." : "Digite qualquer texto…"}
                className="w-full h-32 glass rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="text-[10px] text-muted-foreground mt-1">{text.length} chars • QR abrirá o visualizador criptografado do app</div>
              <button onClick={onGenerateText} disabled={generating}
                className="w-full mt-3 gradient-aurora text-primary-foreground font-semibold py-2.5 rounded-xl glow-primary disabled:opacity-60">
                {generating ? "Gerando…" : "Gerar QR Code"}
              </button>
            </>
          ) : (
            <>
              <div onClick={() => !generating && fileRef.current?.click()}
                className="glass border-2 border-dashed border-border/60 rounded-xl min-h-[140px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/60 transition p-4">
                <input ref={fileRef} type="file" className="hidden"
                  accept={
                    kind === "image" ? "image/*"
                    : kind === "music" ? "audio/*"
                    : "image/*,audio/*,application/pdf,application/*,text/*"
                  }
                  onChange={onFile} />
                {kind === "image" ? <ImgIcon className="w-6 h-6 text-primary" />
                  : kind === "music" ? <Music className="w-6 h-6 text-primary" />
                  : <Upload className="w-6 h-6 text-muted-foreground" />}
                <div className="text-xs font-medium">
                  {generating ? "Processando…"
                    : kind === "image" ? "Selecione uma imagem"
                    : kind === "music" ? "Selecione um áudio curto"
                    : "Selecione um arquivo"}
                </div>
                <div className="text-[10px] text-muted-foreground text-center">
                  {kind === "image" ? <>JPG, PNG, WEBP…<br/>Será redimensionada automaticamente para caber no QR</>
                    : kind === "music" ? <>MP3, OGG, WAV, M4A…<br/>Máx. ~{fmtBytes(MUSIC_MAX_BYTES)} (clipes muito curtos)</>
                    : <>Imagem, música, PDF ou documento<br/>Máx. ~{fmtBytes(FILE_MAX_BYTES)} com criptografia</>}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                {kind === "image"
                  ? "ℹ️ Imagens são reduzidas (tamanho moderado, ~256px) e comprimidas em JPEG até caberem no QR."
                  : kind === "music"
                  ? "⚠️ QR codes cabem em poucos KB. Músicas completas não cabem — para faixas inteiras, hospede o arquivo e gere um QR do link."
                  : "⚠️ QR codes têm capacidade limitada. Arquivos grandes serão rejeitados para preservar conteúdo + criptografia."}
              </div>
            </>
          )}
        </section>

        {history.length > 0 && (
          <section className="glass rounded-2xl p-4 border border-border/40 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="font-display text-sm font-semibold">Histórico</h3>
                <span className="text-[10px] text-muted-foreground">({history.length})</span>
              </div>
              <button onClick={() => { setHistory([]); setCurrent(null); }}
                className="text-[10px] text-muted-foreground hover:text-destructive">Limpar tudo</button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-1 max-h-[40vh] lg:max-h-none">
              {history.map(item => {
                const Icon = iconForMime(item.mime) || (item.kind === "url" ? LinkIcon : TypeIcon);
                const active = current?.id === item.id;
                return (
                  <div key={item.id} onClick={() => setCurrent(item)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2 ${active ? "bg-primary/10 border-primary/60" : "glass hover:border-primary/30"}`}>
                    <div className="w-9 h-9 rounded-lg bg-background/50 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {fmtBytes(item.size)} • {item.encrypted ? "criptografado" : "legado"} • {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); remove(item.id); }}
                      className="w-7 h-7 rounded-lg hover:bg-destructive/20 hover:text-destructive flex items-center justify-center shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Right: preview */}
      <section className="flex-1 relative bg-dot-grid rounded-2xl glass overflow-hidden min-h-[400px] lg:min-h-0 flex items-center justify-center p-6">
        {!current ? (
          <div className="text-center text-muted-foreground">
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl glass flex items-center justify-center"><QrIcon className="w-9 h-9 opacity-60" /></div>
            <div className="font-display text-lg">Seu QR code aparecerá aqui</div>
            <div className="text-xs mt-1 opacity-70">Envie um arquivo ou digite um texto</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 max-w-md w-full">
            <div className="bg-white p-4 rounded-2xl shadow-2xl">
              <img src={current.qrDataUrl} alt="QR" className="w-64 h-64 sm:w-80 sm:h-80" />
            </div>
            <div className="text-center">
              <div className="font-display font-semibold truncate w-full max-w-[300px] mx-auto">{current.label}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {current.kind.toUpperCase()} • {fmtBytes(current.size)}
                {current.mime && ` • ${current.mime}`}
              </div>
              {current.encrypted && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/60 px-2.5 py-1 text-[10px] text-muted-foreground">
                  <ShieldCheck className="w-3 h-3 text-accent" /> Ao escanear, abre o conteúdo no visualizador seguro
                </div>
              )}
            </div>
            {(current.kind === "image" || current.kind === "music" || current.kind === "file") && (
              <div className="w-full rounded-2xl border border-border/40 bg-secondary/40 p-3 text-center">
                {current.kind === "image" ? (
                  <img src={current.payload} alt={current.fileName || "Imagem embutida no QR"} className="mx-auto max-h-36 rounded-xl object-contain" />
                ) : current.kind === "music" ? (
                  <audio controls src={current.payload} className="w-full" />
                ) : (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <FileIcon className="w-4 h-4 text-primary" /> Arquivo embutido pronto para download
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => downloadQr(current)}
                className="gradient-aurora text-primary-foreground font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 glow-primary">
                <Download className="w-4 h-4" /> Baixar QR (PNG)
              </button>
              {(current.kind === "file" || current.kind === "image" || current.kind === "music") && (
                <button onClick={() => downloadPayload(current)}
                  className="glass-strong font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:border-primary">
                  <Download className="w-4 h-4" /> Baixar arquivo
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
