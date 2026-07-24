import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  Upload, Download, Trash2, QrCode as QrIcon, FileText, Music, Image as ImgIcon,
  File as FileIcon, Link as LinkIcon, Type as TypeIcon, History,
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
  payload: string;     // encoded string (text/url or data:...;base64,)
};

const STORAGE_KEY = "qr-tool:history:v1";
const MAX_QR_CHARS = 2200; // safe practical limit for QR v40 with low EC
const IMG_TARGET_MAX = 2000; // target payload size for compressed images
const MUSIC_MAX_BYTES = 2000; // hard cap for audio payload

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

export default function QrTool() {
  const [kind, setKind] = useState<QrKind>("text");
  const [text, setText] = useState("");
  const [history, setHistory] = useState<QrItem[]>(() => load());
  const [current, setCurrent] = useState<QrItem | null>(null);
  const [generating, setGenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { save(history); }, [history]);

  const generateFromPayload = async (payload: string, meta: Partial<QrItem>) => {
    if (payload.length > MAX_QR_CHARS) {
      toast.error(`Conteúdo muito grande para caber em um QR code (${fmtBytes(payload.length)}). Limite prático: ~${fmtBytes(MAX_QR_CHARS)}. Para arquivos maiores use um link.`);
      return;
    }
    setGenerating(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 512,
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
      };
      const next = [item, ...history].slice(0, 50);
      setHistory(next);
      setCurrent(item);
      toast.success("QR code gerado e salvo localmente!");
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
      const dataUrl = await readAsDataURL(f);
      generateFromPayload(dataUrl, {
        kind: "file",
        label: f.name,
        mime: f.type,
        fileName: f.name,
      });
    } catch { toast.error("Falha ao ler arquivo."); }
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
    if (item.kind !== "file") return;
    const a = document.createElement("a");
    a.href = item.payload;
    a.download = item.fileName || "arquivo";
    a.click();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-3 sm:p-4 lg:p-6 min-h-full">
      {/* Left: input */}
      <div className="lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col gap-3">
        <section className="glass rounded-2xl p-4 border border-border/40">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg gradient-aurora flex items-center justify-center glow-primary">
              <QrIcon className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold">Gerar QR Code</h3>
              <p className="text-[10px] text-muted-foreground">Texto, link ou arquivo</p>
            </div>
          </div>

          <div className="flex glass rounded-xl p-1 mb-3">
            {([
              { k: "text" as QrKind, Icon: TypeIcon, l: "Texto" },
              { k: "url" as QrKind, Icon: LinkIcon, l: "Link" },
              { k: "file" as QrKind, Icon: FileIcon, l: "Arquivo" },
            ]).map(t => (
              <button key={t.k} onClick={() => setKind(t.k)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${kind === t.k ? "gradient-aurora text-primary-foreground" : "text-muted-foreground"}`}>
                <t.Icon className="w-3.5 h-3.5" /> {t.l}
              </button>
            ))}
          </div>

          {kind !== "file" ? (
            <>
              <textarea
                value={text} onChange={e => setText(e.target.value)}
                placeholder={kind === "url" ? "https://exemplo.com/..." : "Digite qualquer texto…"}
                className="w-full h-32 glass rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="text-[10px] text-muted-foreground mt-1">{text.length} / {MAX_QR_CHARS} chars</div>
              <button onClick={onGenerateText} disabled={generating}
                className="w-full mt-3 gradient-aurora text-primary-foreground font-semibold py-2.5 rounded-xl glow-primary disabled:opacity-60">
                {generating ? "Gerando…" : "Gerar QR Code"}
              </button>
            </>
          ) : (
            <>
              <div onClick={() => fileRef.current?.click()}
                className="glass border-2 border-dashed border-border/60 rounded-xl min-h-[140px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/60 transition p-4">
                <input ref={fileRef} type="file" className="hidden"
                  accept="image/*,audio/*,application/pdf,application/*,text/*"
                  onChange={onFile} />
                <Upload className="w-6 h-6 text-muted-foreground" />
                <div className="text-xs font-medium">Selecione um arquivo</div>
                <div className="text-[10px] text-muted-foreground text-center">Imagem, música, PDF ou documento<br/>Limite prático: ~{fmtBytes(MAX_QR_CHARS)}</div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                ⚠️ QR codes têm capacidade limitada (~2 KB). Arquivos grandes serão rejeitados. Para arquivos volumosos, hospede-os e gere um QR do link.
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
                        {fmtBytes(item.size)} • {new Date(item.createdAt).toLocaleDateString()}
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
              <div className="font-display font-semibold truncate max-w-[300px]">{current.label}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {current.kind.toUpperCase()} • {fmtBytes(current.size)}
                {current.mime && ` • ${current.mime}`}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => downloadQr(current)}
                className="gradient-aurora text-primary-foreground font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 glow-primary">
                <Download className="w-4 h-4" /> Baixar QR (PNG)
              </button>
              {current.kind === "file" && (
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
