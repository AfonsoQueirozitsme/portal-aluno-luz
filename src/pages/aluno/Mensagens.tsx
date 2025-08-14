import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { Paperclip, Send, User, Bot } from "lucide-react";

const canonical = () => `${window.location.origin}/aluno/mensagens`;

type Message = {
  id: number;
  from: "user" | "ai";
  text: string;
  time: string;
  to: string;
};

const professores = [
  { id: "ai", nome: "AI (Assistente)", icon: <Bot className="w-5 h-5" /> },
  { id: "prof1", nome: "Prof. Ana Martins", icon: <User className="w-5 h-5" /> },
  { id: "prof2", nome: "Prof. Carlos Silva", icon: <User className="w-5 h-5" /> },
];

const mockMessages: Message[] = [
  { id: 1, from: "user", text: "Olá! Gostava de marcar uma explicação.", time: "09:00", to: "ai" },
  { id: 2, from: "ai", text: "Olá João! Claro, para que dia pretendes?", time: "09:01", to: "ai" },
];

const Mensagens = () => {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState(professores[0]);
  const [attachment, setAttachment] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() && !attachment) return;
    setSending(true);

    setTimeout(() => {
      const next: Message[] = [
        ...messages,
        {
          id: messages.length + 1,
          from: "user",
          text: input + (attachment ? `\n📎 ${attachment.name}` : ""),
          time: new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
          to: selected.id,
        },
      ];

      if (selected.id === "ai") {
        next.push({
          id: messages.length + 2,
          from: "ai",
          text: "Recebido! Em breve serás contactado por um professor.",
          time: new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
          to: "ai",
        });
      }

      setMessages(next);
      setInput("");
      setAttachment(null);
      setSending(false);
    }, 700);
  };

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[70vh] flex bg-card rounded-xl shadow-lg p-0 animate-fade-in overflow-hidden">
      <Helmet>
        <title>Mensagens — Área do Aluno</title>
        <meta name="description" content="Conversa com professores e assistente." />
        <link rel="canonical" href={canonical()} />
      </Helmet>

      {/* Sidebar de professores */}
      <aside className="w-56 bg-background border-r border-border flex flex-col py-4 px-2 gap-2">
        <div className="mb-2 px-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          Conversas
        </div>
        {professores.map((p) => (
          <button
            key={p.id}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 font-medium
              ${selected.id === p.id ? "bg-primary/10 text-primary shadow" : "hover:bg-primary/5 text-muted-foreground"}`}
            onClick={() => setSelected(p)}
            type="button"
          >
            {p.icon}
            <span>{p.nome}</span>
          </button>
        ))}
      </aside>

      {/* Área de mensagens */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b bg-primary/5">
          {selected.icon}
          <span className="font-bold text-lg text-primary">{selected.nome}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-background transition-all duration-500">
          {messages
            .filter((msg) => msg.to === selected.id)
            .map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} animate-msg-fade-in`}>
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-2xl shadow transition-all duration-300
                    ${msg.from === "user" ? "bg-primary text-white rounded-br-md" : "bg-white border border-border text-primary rounded-bl-md"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {msg.from === "user" ? <User className="w-4 h-4 opacity-70" /> : <Bot className="w-4 h-4 opacity-70" />}
                    <span className="text-xs text-muted-foreground">{msg.time}</span>
                  </div>
                  <div className="whitespace-pre-line">{msg.text}</div>
                </div>
              </div>
            ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="flex items-center gap-2 px-4 py-4 border-t bg-background" onSubmit={sendMessage}>
          <label className="relative flex items-center">
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleAttachment}
              disabled={sending}
            />
            <Button
              type="button"
              variant={attachment ? "hero" : "ghost"}
              size="icon"
              className="rounded-full"
              tabIndex={-1}
              asChild
            >
              <span>
                <Paperclip className="w-5 h-5 text-muted-foreground" />
              </span>
            </Button>
          </label>

          <Input
            className="flex-1 rounded-full px-4 py-2 bg-white border border-input focus:ring-2 focus:ring-primary transition"
            placeholder="Escreve a tua mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            autoFocus
          />

          <Button
            type="submit"
            variant="hero"
            size="icon"
            className="rounded-full transition-all duration-200"
            disabled={sending || (!input.trim() && !attachment)}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>

        {attachment && (
          <div className="px-6 pb-2 text-xs text-muted-foreground flex items-center gap-2 animate-fade-in">
            <Paperclip className="w-4 h-4" />
            <span>{attachment.name}</span>
            <button className="ml-2 text-destructive hover:underline" onClick={() => setAttachment(null)} type="button">
              Remover
            </button>
          </div>
        )}

        {/* Estilos locais */}
        <style>{`
          .animate-fade-in {
            animation: fadeIn .7s cubic-bezier(.4,0,.2,1);
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(24px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-msg-fade-in {
            animation: msgFadeIn .4s cubic-bezier(.4,0,.2,1);
          }
          @keyframes msgFadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default Mensagens;
