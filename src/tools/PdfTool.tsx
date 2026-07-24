import { useRef, useState } from "react";
import { toast } from "sonner";
import { Document, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";
import jsPDF from "jspdf";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  FileText, FileType, Upload, Download, Loader2, ArrowRightLeft, CheckCircle2,
} from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type Direction = "pdf2docx" | "docx2pdf";

type Result = { name: string; blob: Blob; kind: "docx" | "pdf" };

async function pdfToDocx(file: File): Promise<Result> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const paragraphs: Paragraph[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Group by line using transform Y coord
    const lines = new Map<number, string[]>();
    for (const item of content.items as any[]) {
      const y = Math.round(item.transform[5]);
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push(item.str);
    }
    const sorted = [...lines.entries()].sort((a, b) => b[0] - a[0]);
    for (const [, parts] of sorted) {
      const text = parts.join(" ").replace(/\s+/g, " ").trim();
      paragraphs.push(new Paragraph({ children: [new TextRun(text || " ")] }));
    }
    if (i < pdf.numPages) paragraphs.push(new Paragraph({ children: [new TextRun("")] }));
  }
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  return { name: file.name.replace(/\.pdf$/i, "") + ".docx", blob, kind: "docx" };
}

async function docxToPdf(file: File): Promise<Result> {
  const buf = await file.arrayBuffer();
  const { value: text } = await mammoth.extractRawText({ arrayBuffer: buf });
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  const lineHeight = 16;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(11);
  let y = margin;
  const paragraphs = text.split(/\n+/);
  for (const para of paragraphs) {
    const wrapped = pdf.splitTextToSize(para || " ", maxW);
    for (const line of wrapped) {
      if (y > pageH - margin) { pdf.addPage(); y = margin; }
      pdf.text(line, margin, y);
      y += lineHeight;
    }
    y += lineHeight * 0.4;
  }
  const blob = pdf.output("blob");
  return { name: file.name.replace(/\.docx?$/i, "") + ".pdf", blob, kind: "pdf" };
}

export default function PdfTool() {
  const [dir, setDir] = useState<Direction>("pdf2docx");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const accept = dir === "pdf2docx" ? "application/pdf,.pdf" : ".doc,.docx";

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const okPdf = dir === "pdf2docx" && /\.pdf$/i.test(f.name);
    const okDocx = dir === "docx2pdf" && /\.docx?$/i.test(f.name);
    if (!okPdf && !okDocx) { toast.error(`Selecione um ${dir === "pdf2docx" ? "PDF" : "DOC/DOCX"}.`); return; }
    setFile(f); setResult(null);
  };

  const convert = async () => {
    if (!file) { toast.error("Selecione um arquivo."); return; }
    setBusy(true); setResult(null);
    try {
      toast.message("Convertendo…");
      const r = dir === "pdf2docx" ? await pdfToDocx(file) : await docxToPdf(file);
      setResult(r);
      toast.success("Conversão concluída!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Falha na conversão.");
    } finally { setBusy(false); }
  };

  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url; a.download = result.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const swap = () => {
    setDir(d => d === "pdf2docx" ? "docx2pdf" : "pdf2docx");
    setFile(null); setResult(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-3 sm:p-4 lg:p-6 min-h-full">
      <div className="lg:w-[420px] shrink-0 flex flex-col gap-3">
        <section className="glass rounded-2xl p-4 border border-border/40">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg gradient-aurora flex items-center justify-center glow-primary">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold">Conversor de documentos</h3>
              <p className="text-[10px] text-muted-foreground">PDF ↔ DOC/DOCX</p>
            </div>
          </div>

          <div className="flex items-center gap-2 glass rounded-xl p-2 mb-3">
            <div className="flex-1 text-center">
              <div className="text-[10px] uppercase text-muted-foreground">De</div>
              <div className="font-display text-sm font-semibold text-primary">
                {dir === "pdf2docx" ? "PDF" : "DOCX"}
              </div>
            </div>
            <button onClick={swap} className="w-9 h-9 rounded-lg gradient-aurora flex items-center justify-center glow-primary hover:scale-105 transition">
              <ArrowRightLeft className="w-4 h-4 text-primary-foreground" />
            </button>
            <div className="flex-1 text-center">
              <div className="text-[10px] uppercase text-muted-foreground">Para</div>
              <div className="font-display text-sm font-semibold text-accent">
                {dir === "pdf2docx" ? "DOCX" : "PDF"}
              </div>
            </div>
          </div>

          <div onClick={() => fileRef.current?.click()}
            className="glass border-2 border-dashed border-border/60 rounded-xl min-h-[140px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/60 transition p-4">
            <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={onFile} />
            {file ? (
              <>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileType className="w-6 h-6 text-primary" />
                </div>
                <div className="text-xs font-semibold truncate max-w-[280px]">{file.name}</div>
                <div className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB • trocar arquivo</div>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground" />
                <div className="text-xs font-medium">Selecione um {dir === "pdf2docx" ? "PDF" : "DOC/DOCX"}</div>
                <div className="text-[10px] text-muted-foreground">Processado 100% no seu navegador</div>
              </>
            )}
          </div>

          <button onClick={convert} disabled={!file || busy}
            className="w-full mt-3 gradient-aurora text-primary-foreground font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 glow-primary disabled:opacity-60">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Convertendo…</> : <>Converter agora</>}
          </button>

          <div className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
            <strong>Observação:</strong> a conversão preserva o <em>texto</em>. Layouts complexos, imagens e formatações avançadas podem ser simplificados. PDFs escaneados (imagem pura) não têm texto extraível.
          </div>
        </section>
      </div>

      <section className="flex-1 relative bg-dot-grid rounded-2xl glass overflow-hidden min-h-[400px] lg:min-h-0 flex items-center justify-center p-6">
        {!result ? (
          <div className="text-center text-muted-foreground">
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl glass flex items-center justify-center">
              <FileText className="w-9 h-9 opacity-60" />
            </div>
            <div className="font-display text-lg">Envie um arquivo para converter</div>
            <div className="text-xs mt-1 opacity-70">O resultado ficará disponível aqui</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <div className="w-20 h-20 rounded-3xl gradient-aurora flex items-center justify-center glow-primary">
              <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="font-display text-xl font-bold">Conversão pronta!</div>
            <div className="glass rounded-xl px-4 py-3">
              <div className="text-xs text-muted-foreground">Arquivo gerado</div>
              <div className="font-semibold truncate max-w-[300px]">{result.name}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{(result.blob.size / 1024).toFixed(1)} KB</div>
            </div>
            <button onClick={download}
              className="gradient-aurora text-primary-foreground font-semibold px-6 py-3 rounded-xl flex items-center gap-2 glow-primary">
              <Download className="w-4 h-4" /> Baixar {result.kind.toUpperCase()}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
