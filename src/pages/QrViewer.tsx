import { useEffect, useMemo, useState } from "react";
import { Download, File as FileIcon, Image as ImageIcon, Link as LinkIcon, Loader2, Music, ShieldCheck, Type, AlertTriangle } from "lucide-react";

type ViewerKind = "text" | "url" | "file" | "image" | "music";

type DecodedContent = {
  v: number;
  kind: ViewerKind;
  label: string;
  mime?: string;
  fileName?: string;
  payload: string;
};

const QR_PREFIX = "AISQR1";

const decodeBytes = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const unpackEncryptedPayload = async (packed: string): Promise<DecodedContent> => {
  const [prefix, ivPart, keyPart, cipherPart] = packed.split(".");
  if (prefix !== QR_PREFIX || !ivPart || !keyPart || !cipherPart) {
    throw new Error("QR inválido ou incompleto.");
  }

  const iv = decodeBytes(ivPart);
  const keyBytes = decodeBytes(keyPart);
  const cipher = decodeBytes(cipherPart);
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(plain)) as DecodedContent;
};

const getPackedPayload = () => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const fromHash = hash.get("p");
  if (fromHash) return fromHash;
  const query = new URLSearchParams(window.location.search);
  return query.get("p") || "";
};

const iconForKind = (kind?: ViewerKind) => {
  if (kind === "image") return ImageIcon;
  if (kind === "music") return Music;
  if (kind === "file") return FileIcon;
  if (kind === "url") return LinkIcon;
  return Type;
};

export default function QrViewer() {
  const [content, setContent] = useState<DecodedContent | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const packed = getPackedPayload();
        if (!packed) throw new Error("Este QR não contém um pacote de conteúdo do app.");
        const decoded = await unpackEncryptedPayload(packed);
        if (mounted) setContent(decoded);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Não foi possível abrir este QR.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, []);

  const Icon = useMemo(() => iconForKind(content?.kind), [content?.kind]);

  const downloadPayload = () => {
    if (!content) return;
    const a = document.createElement("a");
    a.href = content.payload;
    a.download = content.fileName || content.label || "conteudo-qr";
    a.click();
  };

  const openUrl = () => {
    if (!content || content.kind !== "url") return;
    window.location.href = content.payload;
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-background text-foreground flex items-center justify-center p-4 sm:p-6">
      <section className="glass-strong border border-border/50 rounded-2xl w-full max-w-2xl overflow-hidden">
        <header className="border-b border-border/40 p-4 sm:p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-aurora flex items-center justify-center glow-primary shrink-0">
            {loading ? <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" /> : error ? <AlertTriangle className="w-5 h-5 text-primary-foreground" /> : <Icon className="w-5 h-5 text-primary-foreground" />}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-semibold truncate">Conteúdo do QR Code</h1>
            <p className="text-xs text-muted-foreground truncate">Visualizador seguro para arquivos, imagens, áudio e texto</p>
          </div>
        </header>

        <div className="p-4 sm:p-6">
          {loading && (
            <div className="min-h-[260px] flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm">Abrindo conteúdo criptografado…</span>
            </div>
          )}

          {!loading && error && (
            <div className="min-h-[260px] flex flex-col items-center justify-center text-center gap-3">
              <AlertTriangle className="w-10 h-10 text-destructive" />
              <div>
                <h2 className="font-display text-base font-semibold">Não foi possível exibir o conteúdo</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">{error}</p>
              </div>
            </div>
          )}

          {!loading && content && (
            <div className="space-y-4 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/60 px-2.5 py-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" /> descriptografado no dispositivo
                </span>
                <span className="rounded-full border border-border/50 bg-secondary/60 px-2.5 py-1 uppercase">{content.kind}</span>
                {content.mime && <span className="rounded-full border border-border/50 bg-secondary/60 px-2.5 py-1 break-all">{content.mime}</span>}
              </div>

              <div className="min-w-0">
                <h2 className="font-display text-base sm:text-lg font-semibold break-words">{content.label || content.fileName || "Conteúdo do QR"}</h2>
              </div>

              {content.kind === "image" && (
                <div className="rounded-2xl border border-border/40 bg-secondary/30 p-3 flex justify-center">
                  <img src={content.payload} alt={content.fileName || content.label || "Imagem do QR"} className="max-h-[62vh] w-auto max-w-full rounded-xl object-contain" />
                </div>
              )}

              {content.kind === "music" && (
                <div className="rounded-2xl border border-border/40 bg-secondary/30 p-4">
                  <audio controls src={content.payload} className="w-full" />
                </div>
              )}

              {content.kind === "file" && (
                <div className="rounded-2xl border border-border/40 bg-secondary/30 p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[220px]">
                  <FileIcon className="w-12 h-12 text-primary" />
                  <div>
                    <div className="font-medium break-words">{content.fileName || content.label || "Arquivo embutido"}</div>
                    <div className="text-xs text-muted-foreground mt-1">Arquivo pronto para download</div>
                  </div>
                </div>
              )}

              {content.kind === "text" && (
                <div className="rounded-2xl border border-border/40 bg-secondary/30 p-4 text-sm leading-relaxed whitespace-pre-wrap break-words max-h-[62vh] overflow-y-auto">
                  {content.payload}
                </div>
              )}

              {content.kind === "url" && (
                <div className="rounded-2xl border border-border/40 bg-secondary/30 p-4 text-sm break-all">
                  {content.payload}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {(content.kind === "image" || content.kind === "music" || content.kind === "file") && (
                  <button onClick={downloadPayload} className="gradient-aurora text-primary-foreground font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 glow-primary">
                    <Download className="w-4 h-4" /> Baixar conteúdo
                  </button>
                )}
                {content.kind === "url" && (
                  <button onClick={openUrl} className="gradient-aurora text-primary-foreground font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 glow-primary">
                    <LinkIcon className="w-4 h-4" /> Abrir link
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}