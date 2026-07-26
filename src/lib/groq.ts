// ⚠️ Chave embutida no bundle — visível a qualquer usuário que inspecionar.
// Foi ativada direto no código a pedido explícito para uso público.
const GROQ_KEY = "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";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export async function* streamGroq(messages: ChatMsg[], model = "llama-3.3-70b-versatile") {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({ model, messages, stream: true, temperature: 0.7 }),
  });
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${txt.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      const l = line.trim();
      if (!l.startsWith("data:")) continue;
      const data = l.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const j = JSON.parse(data);
        const delta = j.choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch {}
    }
  }
}

export const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (rápido)" },
  { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B" },
  { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
];
