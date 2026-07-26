import { useEffect, useRef, useState } from "react";
import { Send, Trash2, Bot, User, Loader2, Sparkles } from "lucide-react";
import { streamGroq, GROQ_MODELS, type ChatMsg } from "@/lib/groq";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const SYSTEM: ChatMsg = {
  role: "system",
  content:
    "Você é um assistente inteligente, direto e amigável do Creator Suite. Responda em português brasileiro por padrão, use markdown leve quando útil, e seja conciso.",
};

const STORAGE_KEY = "chat:messages";
const MODEL_KEY = "chat:model";

const ChatTool = () => {
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(() => {
    try {
      return localStorage.getItem(MODEL_KEY) || GROQ_MODELS[0].id;
    } catch {
      return GROQ_MODELS[0].id;
    }
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
    } catch {}
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(MODEL_KEY, model);
    } catch {}
  }, [model]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    const asstId = crypto.randomUUID();
    const asstMsg: Msg = { id: asstId, role: "assistant", content: "" };
    const next = [...messages, userMsg, asstMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const history: ChatMsg[] = [
        SYSTEM,
        ...next
          .filter((m) => m.id !== asstId)
          .map((m) => ({ role: m.role, content: m.content }) as ChatMsg),
      ];
      let acc = "";
      for await (const delta of streamGroq(history, model)) {
        acc += delta;
        setMessages((cur) =>
          cur.map((m) => (m.id === asstId ? { ...m, content: acc } : m)),
        );
      }
    } catch (e: any) {
      setMessages((cur) =>
        cur.map((m) =>
          m.id === asstId
            ? { ...m, content: `⚠️ Erro: ${e?.message || "falha na requisição"}` }
            : m,
        ),
      );
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clear = () => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <div className="h-full w-full flex flex-col md:flex-row min-h-0">
      {/* Sidebar controls */}
      <aside className="md:w-[320px] xl:w-[360px] shrink-0 border-b md:border-b-0 md:border-r border-border bg-background/70 backdrop-blur-sm p-5 md:p-6 space-y-5 overflow-y-auto scrollbar-thin">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
            Modelo
          </div>
          <div className="space-y-1.5">
            {GROQ_MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all ink-border ${
                  model === m.id
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background hover:bg-secondary/70"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={2.4} />
            <div className="font-display text-[12px]">Chat com IA</div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Conversa livre com IA via Groq. Histórico salvo no seu navegador (últimas 100 mensagens).
          </p>
        </div>

        <button
          onClick={clear}
          disabled={!messages.length}
          className="w-full glass rounded-lg py-2 text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:border-destructive/40 hover:text-destructive transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3.5 h-3.5" /> Limpar conversa
        </button>
      </aside>

      {/* Chat area */}
      <section className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-8 py-6 space-y-5"
        >
          {messages.length === 0 && (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 rounded-2xl gradient-aurora flex items-center justify-center mb-4 shadow-brutal">
                <Bot className="w-6 h-6 text-primary-foreground" strokeWidth={2.2} />
              </div>
              <h3 className="font-display text-[20px] mb-2">Como posso te ajudar hoje?</h3>
              <p className="text-[13px] text-muted-foreground max-w-md">
                Faça uma pergunta, peça um resumo, brainstorm de ideias, ajuda com código ou o que precisar.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ink-border ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}
              >
                {m.role === "user" ? (
                  <User className="w-4 h-4" strokeWidth={2.2} />
                ) : (
                  <Bot className="w-4 h-4" strokeWidth={2.2} />
                )}
              </div>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap break-words ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-secondary/70 text-foreground rounded-tl-sm ink-border"
                }`}
              >
                {m.content || (loading && m.role === "assistant" ? (
                  <Loader2 className="w-4 h-4 animate-spin opacity-60" />
                ) : null)}
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-background/80 backdrop-blur-sm p-4 md:px-8 md:py-5">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                rows={1}
                placeholder="Escreva sua mensagem... (Enter envia, Shift+Enter quebra linha)"
                className="w-full resize-none rounded-xl ink-border bg-background px-4 py-3 pr-12 text-[13.5px] leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition min-h-[48px] max-h-[200px] scrollbar-thin"
                style={{ height: "auto" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 200) + "px";
                }}
              />
            </div>
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="h-12 w-12 rounded-xl gradient-aurora text-primary-foreground flex items-center justify-center shadow-brutal brutal-hover disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Enviar"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" strokeWidth={2.4} />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ChatTool;
