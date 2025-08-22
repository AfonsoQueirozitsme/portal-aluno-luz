// file: src/pages/Aluno/Mensagens.tsx
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { Paperclip, Send, Bot, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const canonical = () => `${window.location.origin}/aluno/mensagens`;

type ChatRole = "user" | "assistant";
type Message = { id: number; role: ChatRole; content: string; time: string };

function nowPT() {
  return new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

// opcional: info institucional que podes incluir na conversa do user
const INSTITUTION_KB = `
**Horário de atendimento (receção)**
- Segunda a Sexta: 10:00–13:00, 14:00–19:00
- Sábado: 10:00–13:00
- Domingos e feriados: encerrado

**Morada**
- Rua das Acácias, nº 12, 6000-123 Castelo Branco

**Contactos**
- Telefone: 272 000 000
- Email: apoio@arvoredoconhecimento.pt

**Política de cancelamentos**
- Cancelamento sem custos até 24h antes.
- <24h poderá ser cobrada a totalidade.
- Falta sem aviso (no-show): conforme regras internas.

**Pagamentos**
- MBWay, Referência Multibanco, Débito Direto (Stripe opcional; nunca cobramos sem autorização).

**Marcação**
- Indica disciplina, duração (30/60/90) e janelas horárias.

`.trim();

export default function Mensagens() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "assistant", content: "Olá! Sou o assistente do Centro. Em que posso ajudar — matéria ou informações?", time: nowPT() },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTyping]);

  // Extrai texto da resposta da Edge Function (Cloudflare AI)
  function extractAIText(data: any): string | null {
    // formato típico do Cloudflare Workers AI
    if (data?.result?.response) return String(data.result.response);
    if (data?.result?.output_text) return String(data.result.output_text);

    // formatos alternativos
    if (Array.isArray(data?.choices) && data.choices[0]?.message?.content) {
      return String(data.choices[0].message.content);
    }
    if (typeof data === "string") return data;
    return null;
  }

  // Chama a Edge Function
  async function askAI(userText: string) {
    setAiTyping(true);
    try {
      // levar até 12 últimas interações
      const convo = messages
        .slice(-12)
        .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

      // injeta também um pequeno contexto útil no turno atual
      const composedUser = INSTITUTION_KB
        ? `${userText}\n\n[contexto]\n${INSTITUTION_KB}`
        : userText;

      const { data, error } = await supabase.functions.invoke("ai-chat", {
        method: "POST",
        body: { messages: [...convo, { role: "user", content: composedUser }] },
      });

      if (error) {
        // erro HTTP/camada Supabase
        throw error;
      }

      const reply = extractAIText(data) ?? "Desculpa, não consegui responder agora.";
      setMessages(cur => [
        ...cur,
        { id: cur.length + 1, role: "assistant", content: reply, time: nowPT() },
      ]);
    } catch (e) {
      console.error("[AI] invoke error:", e);
      setMessages(cur => [
        ...cur,
        {
          id: cur.length + 1,
          role: "assistant",
          content:
            "Ocorreu um erro a contactar a IA. Tenta novamente dentro de instantes.",
          time: nowPT(),
        },
      ]);
    } finally {
      setAiTyping(false);
    }
  }

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() && !attachment) return;
    setSending(true);

    const composed = input + (attachment ? `\n📎 ${attachment.name}` : "");
    setMessages(cur => [...cur, { id: cur.length + 1, role: "user", content: composed, time: nowPT() }]);
    setInput("");
    setAttachment(null);

    await askAI(composed);
    setSending(false);
  };

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setAttachment(e.target.files[0]);
  };

  return (
    <div className="max-w-4xl mx-auto h-[70vh] flex bg-card rounded-xl shadow-lg p-0 animate-fade-in overflow-hidden">
      <Helmet>
        <title>Mensagens — Área do Aluno</title>
        <meta name="description" content="Conversa com o assistente: dúvidas de matéria e informações do centro." />
        <link rel="canonical" href={canonical()} />
      </Helmet>

      {/* Sidebar minimal (apenas IA) */}
      <aside className="w-56 bg-background border-r border-border flex flex-col py-4 px-2 gap-2">
        <div className="px-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">
          Conversa
        </div>
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-primary/10 text-primary shadow">
          <Bot className="w-5 h-5" />
          <span>Assistente IA</span>
        </div>
      </aside>

      {/* Área de chat */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b bg-primary/5">
          <Bot className="w-5 h-5" />
          <span className="font-bold text-lg text-primary">Assistente IA</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-background">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-msg-fade-in`}>
              <div
                className={`max-w-[70%] px-4 py-3 rounded-2xl shadow
                ${m.role === "user" ? "bg-primary text-white rounded-br-md" : "bg-white border border-border text-primary rounded-bl-md"}`}
              >
                <div className="text-xs text-muted-foreground mb-1">{m.time}</div>
                <div className="whitespace-pre-line">{m.content}</div>
              </div>
            </div>
          ))}

          {aiTyping && (
            <div className="flex justify-start">
              <div className="max-w-[60%] px-3 py-2 rounded-xl bg-white border border-border text-primary flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">a escrever…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form className="flex items-center gap-2 px-4 py-4 border-t bg-background" onSubmit={sendMessage}>
          <label className="relative flex items-center">
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAttachment} disabled={sending || aiTyping} />
            <Button type="button" variant={attachment ? "hero" : "ghost"} size="icon" className="rounded-full" tabIndex={-1} asChild>
              <span>📎</span>
            </Button>
          </label>

          <Input
            className="flex-1 rounded-full px-4 py-2 bg-white border border-input focus:ring-2 focus:ring-primary"
            placeholder="Pergunta sobre a matéria ou sobre o centro…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending || aiTyping}
            autoFocus
          />

          <Button type="submit" variant="hero" size="icon" className="rounded-full" disabled={sending || aiTyping || (!input.trim() && !attachment)}>
            <Send className="w-5 h-5" />
          </Button>
        </form>

        {attachment && (
          <div className="px-6 pb-2 text-xs text-muted-foreground flex items-center gap-2">
            <span>📎</span><span>{attachment.name}</span>
            <button className="ml-2 text-destructive hover:underline" onClick={() => setAttachment(null)} type="button">Remover</button>
          </div>
        )}

        <style>{`
          .animate-fade-in { animation: fadeIn .7s cubic-bezier(.4,0,.2,1); }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
          .animate-msg-fade-in { animation: msgFadeIn .4s cubic-bezier(.4,0,.2,1); }
          @keyframes msgFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </div>
  );
}
