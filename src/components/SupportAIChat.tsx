// file: src/components/ai/AssistantChat.tsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Bot, Send, Loader2, Paperclip, Calendar, FileText, LifeBuoy,
  Link as LinkIcon, CreditCard, Info, Sparkles, Check, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/* ============================= Tipos ============================= */
type ChatRole = "user" | "assistant";
type Intent = "schedule" | "ticket" | "payments" | "kb" | "qa";
type KBSource = { id: string; title: string; snippet: string; score?: number; url?: string };
type Slot = { id: string; starts_at: string; ends_at: string; teacher_name: string; modality?: "presencial" | "online" };

type BaseMsg = { id: string; role: ChatRole; time: string };
type TextMsg = BaseMsg & { kind: "text"; content: string; sources?: KBSource[] };
type SlotsMsg = BaseMsg & { kind: "slots"; title: string; slots: Slot[]; reason?: string };
type TicketMsg = BaseMsg & { kind: "ticket"; ticketId: string; subject: string; link?: string };
type PaymentsMsg = BaseMsg & { kind: "payments"; note?: string };
type FormMsg = BaseMsg & { kind: "form"; form: "schedule" | "ticket"; schedule?: TriageSchedule; ticket?: TriageTicket };
type ConfirmAction = { id: string; label: string; role?: "primary" | "secondary" | "destructive" };
type ConfirmMsg = BaseMsg & { kind: "confirm"; title: string; description?: string; actions: ConfirmAction[]; meta?: any };

type Message = TextMsg | SlotsMsg | TicketMsg | PaymentsMsg | FormMsg | ConfirmMsg;

type TriageSchedule = {
  assunto: string;
  duracao: "30" | "60" | "90";
  modalidade: "presencial" | "online" | "indiferente";
  professor?: string;
  janelas?: string;
  detalhe?: string;
};

type TriageTicket = {
  categoria: "Técnico" | "Acesso" | "Pagamento" | "Pedagógico" | "Outro";
  urgencia: "Baixa" | "Média" | "Alta";
  assunto: string;
  descricao: string;
};

/* =========================== Constantes ========================== */
const SUGESTOES = [
  "Explica o Teorema de Pitágoras com um exemplo",
  "Quais são os métodos de pagamento?",
  "Quero marcar um esclarecimento de dúvidas",
  "Abre um ticket para falar com o professor João",
];

const SYSTEM_HINT = `
Responde em PT-PT, sem gerúndio. Sê objetivo, claro e autónomo.
Se a questão for administrativa, dá passos concretos e referencia a KB antes de sugerir reunião/ticket.
Se for pedagógica, explica em passos, dá exemplo curto e propõe exercícios.
Evita encaminhar desnecessariamente. Decide tu quando é estritamente necessário escalonar.
`.trim();

/* ============================= KB ============================== */
const KB_LOCAL: { title: string; content: string; url?: string; tags: string[] }[] = [
  /* 🔹 PAGAMENTOS */
  {
    title: "Pagamentos — Métodos aceites",
    url: "/aluno/pagamentos",
    tags: ["pagamentos", "dinheiro", "cartao", "mbway", "multibanco", "klarna"],
    content: `
Pode ser pago em dinheiro no espaço, ou online através de cartão de crédito/débito, MBWay, Multibanco e dezenas de outros meios. Consulta a **Página de Pagamentos**.
`.trim(),
  },
  {
    title: "Pagamentos — Prestações",
    url: "/aluno/pagamentos",
    tags: ["pagamentos", "prestações", "klarna"],
    content: `Sim, via Klarna na página de pagamentos.`.trim(),
  },
  {
    title: "Débito Direto",
    tags: ["pagamentos", "debito direto"],
    content: `O débito direto pode ser configurado no perfil do aluno. É automático e seguro.`.trim(),
  },
  {
    title: "Fatura com NIF",
    tags: ["pagamentos", "faturas", "nif"],
    content: `Sim, basta configurar o NIF no perfil.`.trim(),
  },
  {
    title: "Histórico de pagamentos",
    tags: ["pagamentos", "histórico", "saldo"],
    content: `Disponível na zona de pagamentos.`.trim(),
  },
  {
    title: "Atrasos de pagamento",
    tags: ["pagamentos", "atraso", "bloqueio"],
    content: `Pode ter até 2 horas em atraso, após isso a conta fica bloqueada e as explicações deixam de ser confirmadas.`.trim(),
  },
  {
    title: "Descontos por antecipação",
    tags: ["pagamentos", "descontos"],
    content: `Não existem descontos para pagamentos antecipados.`.trim(),
  },
  {
    title: "Uso de saldo pré-carregado",
    tags: ["pagamentos", "saldo"],
    content: `Sim, é possível pagar com saldo pré-carregado.`.trim(),
  },
  {
    title: "Tempo de confirmação (referência MB)",
    tags: ["pagamentos", "multibanco"],
    content: `É automático, mas pode demorar até 1 hora.`.trim(),
  },
  {
    title: "Cancelar débito direto agendado",
    tags: ["pagamentos", "debito direto", "cancelamento"],
    content: `Sim, desde que seja cancelado com pelo menos 24 horas de antecedência.`.trim(),
  },

  /* 🔹 AULAS */
  {
    title: "Marcar aulas",
    tags: ["aulas", "marcação", "ticket"],
    content: `As aulas podem ser marcadas por ticket.`.trim(),
  },
  {
    title: "Remarcar aulas",
    tags: ["aulas", "remarcar"],
    content: `Sim, até 24 horas antes ou em caso de saúde/doença súbita.`.trim(),
  },
  {
    title: "Política de faltas",
    tags: ["aulas", "faltas", "reembolso"],
    content: `Cancelamento até 24h antes dá direito a restituição. Em caso de doença súbita, o reembolso é automático.`.trim(),
  },
  {
    title: "Aulas online",
    tags: ["aulas", "online"],
    content: `Sim, podes pedir durante a marcação por ticket, sujeito à disponibilidade do professor.`.trim(),
  },
  {
    title: "Duração das aulas",
    tags: ["aulas", "duração"],
    content: `Normalmente 1 hora, podendo variar conforme pedido e modalidade.`.trim(),
  },
  {
    title: "Onde ver o horário das aulas",
    tags: ["aulas", "horario"],
    content: `Na página de horário está visível a hora agendada.`.trim(),
  },
  {
    title: "Aulas em grupo ou individuais",
    tags: ["aulas", "grupo", "individuais"],
    content: `Existem aulas em grupo e individuais.`.trim(),
  },
  {
    title: "Mudar de horário",
    tags: ["aulas", "horario", "ticket"],
    content: `Sim, abre um ticket e fala com o professor.`.trim(),
  },
  {
    title: "Lista de espera",
    tags: ["aulas", "lista de espera"],
    content: `Não existe lista de espera para horários cheios.`.trim(),
  },
  {
    title: "Aulas em feriados",
    tags: ["aulas", "feriados"],
    content: `Depende. Confirma com o professor por ticket.`.trim(),
  },

  /* 🔹 PROFESSORES & ALUNOS */
  {
    title: "Professores",
    tags: ["professores"],
    content: `Temos vários professores. Para detalhes abre um ticket.`.trim(),
  },
  {
    title: "Escolher professor",
    tags: ["professores", "escolha"],
    content: `Sim, podes escolher o professor.`.trim(),
  },
  {
    title: "Troca de professor",
    tags: ["professores", "troca"],
    content: `Sim, se solicitado. Agenda reunião com a administração.`.trim(),
  },
  {
    title: "Feedback dos professores",
    tags: ["professores", "feedback"],
    content: `Sim, os professores dão feedback personalizado.`.trim(),
  },
  {
    title: "Acompanhamento extra",
    tags: ["apoio", "professores"],
    content: `Sim, por ticket.`.trim(),
  },
  {
    title: "Certificado final",
    tags: ["alunos", "certificado"],
    content: `Sim, nos cursos que indicam essa opção.`.trim(),
  },
  {
    title: "Troca de turma",
    tags: ["alunos", "turma"],
    content: `Possível sob consulta com a administração.`.trim(),
  },
  {
    title: "Número de alunos por turma",
    tags: ["alunos", "turmas"],
    content: `3 em explicações, 10 em cursos.`.trim(),
  },
  {
    title: "Idade mínima",
    tags: ["alunos", "idade"],
    content: `Não existe idade mínima obrigatória.`.trim(),
  },
  {
    title: "Descontos familiares",
    tags: ["alunos", "descontos"],
    content: `Os únicos descontos são para empresas parceiras.`.trim(),
  },

  /* 🔹 APOIO & CONTACTOS */
  {
    title: "Contacto com a receção",
    tags: ["apoio", "contacto", "receção"],
    content: `Via administração, mediante marcação.`.trim(),
  },
  {
    title: "Horário de atendimento telefónico",
    tags: ["apoio", "horario"],
    content: `Dias úteis das 9h às 19h.`.trim(),
  },
  {
    title: "WhatsApp de apoio",
    tags: ["apoio", "whatsapp"],
    content: `Não existe WhatsApp de apoio.`.trim(),
  },
  {
    title: "Reclamações",
    tags: ["apoio", "reclamações"],
    content: `Agenda reunião com a administração.`.trim(),
  },
  {
    title: "Apoio fora do horário",
    tags: ["apoio", "horario", "ticket"],
    content: `Sim, por ticket e chat do assistente.`.trim(),
  },
  {
    title: "Apoio técnico (online)",
    tags: ["apoio", "tecnico"],
    content: `Sim. Recomenda-se ligar para **928312655 (24/7)** em caso de problemas de acesso.`.trim(),
  },
  {
    title: "Tempo médio de resposta por email",
    tags: ["apoio", "email"],
    content: `Até 24 horas.`.trim(),
  },
  {
    title: "Chat ao vivo",
    tags: ["apoio", "chat"],
    content: `Sim, existe chat ao vivo no site.`.trim(),
  },
  {
    title: "Pedido de declarações",
    tags: ["apoio", "declarações"],
    content: `Marcação com a administração.`.trim(),
  },
  {
    title: "Cancelar inscrição",
    tags: ["apoio", "cancelamento"],
    content: `Marcação com a administração.`.trim(),
  },
];

/* =========================== Helpers ============================= */
const nowPT = () => new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
const rid = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

/* ===== Intents simples (continua útil para CTAs e heurística) ==== */
function detectIntent(txt: string): Intent {
  const t = txt.toLowerCase();
  if (["pagar", "pagamento", "mbway", "referência", "referencia", "fatura", "saldo", "debito", "débito"].some(k => t.includes(k))) return "payments";
  if (["marcar", "agendar", "horário", "disponibilidade", "esclarecimento", "reunião", "apoio", "explicação"].some(k => t.includes(k))) return "schedule";
  if (["ticket", "abrir ticket", "reclamação", "contactar professor", "falar com professor", "administrador", "suporte direto"].some(k => t.includes(k))) return "ticket";
  if (["política", "preço", "preços", "pagamento", "morada", "contacto", "horário", "fatura", "cancelamento"].some(k => t.includes(k))) return "kb";
  return "qa";
}

/* ===================== KB-first helpers ===================== */
function explicitScheduleAsk(t: string) {
  const s = t.toLowerCase();
  return /\b(marcar|agendar|reserva(r)?|quero uma explicação|quero marcar)\b/.test(s);
}
function explicitTicketAsk(t: string) {
  const s = t.toLowerCase();
  return /\b(abrir ticket|abre um ticket|criar ticket|fazer reclama(ç|c)[aã]o|falar com a administra[cç][aã]o)\b/.test(s);
}

/** Formata top resultados da KB para contexto do modelo */
function formatKBForContext(sources: KBSource[]) {
  return sources
    .slice(0, 4)
    .map((s, i) => `### Doc ${i + 1}: ${s.title}\n${(s.snippet || "").trim()}`)
    .join("\n\n");
}

/** Constrói mensagens p/ IA com instrução de usar só a KB sempre que existir */
function buildKBFirstMessages(userText: string, kb: KBSource[]) {
  const kbBlock = kb.length ? formatKBForContext(kb) : "";
  const sys = `
${SYSTEM_HINT}

Se existirem blocos da KB, baseia a resposta nesses blocos.
- Primeiro, responde de forma direta e prática (2–5 frases).
- Depois, se fizer sentido, acrescenta passos concisos (bullets).
- Evita pedir reuniões/tickets a menos que seja estritamente necessário.
- Se a pergunta for "como pagar", "saldo", "fatura", etc., lembra a Página de Pagamentos.
`.trim();

  const userPrompt = kb.length
    ? `Pergunta:\n${userText}\n\n---\nKB:\n${kbBlock}\n\nResponde apenas com base no conteúdo acima. Se faltar algo, diz o que falta.`
    : `Pergunta (sem KB correspondente encontrada):\n${userText}\n\nDá a melhor resposta possível, sucinta e útil.`;

  return [
    { role: "system" as const, content: sys },
    { role: "user" as const, content: userPrompt },
  ];
}

/** Heurística simples para decidir se a resposta foi fraca e deve escalar */
function shouldEscalate(userText: string, answer: string, intent: Intent): "schedule" | "ticket" | null {
  const t = userText.toLowerCase();
  const a = (answer || "").toLowerCase();

  const errorHints = ["erro", "falha", "não consigo", "bloqueio", "bloqueada", "acesso negado", "não abre", "não entra", "expirou", "indisponível"];
  const wantsLive = ["preciso falar em direto", "preciso falar ao vivo", "preciso de reunião", "preciso de professor"];
  const adminIssue = ["fatura", "pagamento", "cobrança", "saldo", "nif", "débito", "debito"];

  const lowInfo = a.length < 120;           // resposta muito curta
  const noKB = !/\bDoc\s+\d+:/.test(answer); // sem blocos KB na resposta
  const hasError = errorHints.some(k => t.includes(k) || a.includes(k));
  const asksLive = wantsLive.some(k => t.includes(k));
  const isPaymentProblem = adminIssue.some(k => t.includes(k));

  // Escalonar para ticket se parece problema técnico/administrativo sem solução direta
  if (hasError || (noKB && (lowInfo || isPaymentProblem))) return "ticket";

  // Escalonar para marcação se o utilizador parece pedir apoio síncrono
  if (asksLive && intent !== "payments") return "schedule";

  // Caso a intenção tenha sido schedule/ticket e a resposta não resolva claramente
  if ((intent === "schedule" || intent === "ticket") && (lowInfo || noKB)) {
    return intent;
  }

  return null;
}

/* ====== Pesquisa KB local + remota ====== */
function filterKB(query: string): KBSource[] {
  const q = query.toLowerCase();
  const out: KBSource[] = [];
  KB_LOCAL.forEach((doc, i) => {
    const hay = [doc.title, doc.content, doc.tags.join(" ")].join(" ").toLowerCase();
    if (hay.includes(q)) {
      out.push({ id: `local-${i}`, title: doc.title, snippet: doc.content.slice(0, 220) + (doc.content.length > 220 ? "…" : ""), url: doc.url, score: 0.8 });
    }
  });
  return out;
}

/* ==== Edge Functions (Cloudflare AI / utils) ==== */
async function callAIChatCF(messages: { role: "user" | "assistant" | "system"; content: string }[]) {
  const { data, error } = await supabase.functions.invoke("ai-chat", { method: "POST", body: { messages } });
  if (error) throw error;
  const txt = data?.result?.response || data?.result?.output_text || data?.choices?.[0]?.message?.content || data?.text || "";
  return String(txt);
}
async function searchKB(query: string): Promise<KBSource[]> {
  try {
    const { data, error } = await supabase.functions.invoke("kb-search", { method: "POST", body: { query, top_k: 5 } });
    if (error) throw error;
    const arr = Array.isArray(data?.results) ? (data.results as KBSource[]) : [];
    const local = filterKB(query);
    const map = new Map<string, KBSource>();
    [...local, ...arr].forEach((s) => map.set(s.title, s));
    return Array.from(map.values()).slice(0, 6);
  } catch {
    return filterKB(query);
  }
}
async function fetchSlots(query: string, triage?: TriageSchedule): Promise<{ slots: Slot[]; reason?: string }> {
  const { data, error } = await supabase.functions.invoke("availability-scan", { method: "POST", body: { query, triage, horizon_days: 14, top_k: 8 } });
  if (error) throw error;
  return { slots: (data?.slots as Slot[]) || [], reason: data?.reason };
}
async function bookSlot(slot_id: string, reason: string): Promise<{ ok: boolean; booking_id?: string }> {
  const { data, error } = await supabase.functions.invoke("book-slot", { method: "POST", body: { slot_id, reason } });
  if (error) throw error;
  return { ok: Boolean(data?.ok), booking_id: data?.booking_id };
}
async function openTicket(payload: TriageTicket & { originalText: string }): Promise<{ id: string; link?: string }> {
  const { data, error } = await supabase.functions.invoke("create-ticket", { method: "POST", body: payload });
  if (error) throw error;
  return { id: String(data?.id || ""), link: data?.link };
}

/* ======================= UI helpers ============================== */
const SourcePill = ({ s }: { s: KBSource }) => (
  <a
    href={s.url || "#"}
    target={s.url ? "_blank" : undefined}
    rel={s.url ? "noopener noreferrer" : undefined}
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border text-xs text-muted-foreground hover:text-primary hover:border-primary/40 transition group"
    title={s.title}
  >
    <LinkIcon className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
    <span className="truncate max-w-[140px]">{s.title}</span>
  </a>
);

const SlotCard = ({ slot, onBook }: { slot: Slot; onBook: (s: Slot) => void }) => {
  const start = new Date(slot.starts_at);
  const end = new Date(slot.ends_at);
  const when = new Intl.DateTimeFormat("pt-PT", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(start);
  const endHour = end.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="p-3 rounded-lg border border-border bg-background hover:bg-primary/5 transition">
      <div className="text-sm font-medium">{slot.teacher_name}</div>
      <div className="text-xs text-muted-foreground">{when} – {endHour}{slot.modality ? ` · ${slot.modality}` : ""}</div>
      <Button variant="outline" size="sm" className="mt-2" onClick={() => onBook(slot)}>Reservar</Button>
    </div>
  );
};

const PaymentsQuickPanel = ({
  onOpenPayments, onCheckBalance, balance, loadingBalance,
}: { onOpenPayments: () => void; onCheckBalance: () => void; balance?: number | null; loadingBalance?: boolean }) => (
  <div className="rounded-lg border border-border bg-background/50 p-3">
    <div className="flex items-center gap-2 mb-2">
      <CreditCard className="h-4 w-4 text-primary" />
      <div className="font-medium">Pagamentos</div>
    </div>
    <div className="text-xs text-muted-foreground mb-3">
      Consulta o saldo, gera referência Multibanco ou usa MBWay. Para Débito Direto, a autorização é sempre pedida primeiro.
    </div>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={onOpenPayments}>Abrir página de pagamentos</Button>
      <Button size="sm" variant="outline" onClick={onCheckBalance} disabled={loadingBalance}>
        {loadingBalance ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> A calcular…</span> : "Ver saldo"}
      </Button>
      {typeof balance === "number" && (
        <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
          Saldo atual: {balance.toFixed(2)} €
        </span>
      )}
    </div>
  </div>
);

/* ===================== Componente principal ====================== */
export default function AssistantChat({
  initialGreeting = "Olá! Sou o teu assistente. Posso ajudar com matéria, pagamentos, marcações e informação do centro.",
  compact = false,
}: { initialGreeting?: string; compact?: boolean }) {
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([
    { id: "m1", role: "assistant", kind: "text", content: initialGreeting, time: nowPT() },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);

  const [balance, setBalance] = useState<number | null>();
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [pendingText, setPendingText] = useState<string>("");

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, aiTyping]);

  // helpers estado
  const pushMsg = (m: Message) => setMessages((cur) => [...cur, m]);
  const rmMsg = (id: string) => setMessages((cur) => cur.filter((m) => m.id !== id));

  /* -------- composer -------- */
  const onAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setAttachment(e.target.files[0]);
  };
  const onSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() && !attachment) return;
    const composed = input + (attachment ? `\n📎 ${attachment.name}` : "");
    pushMsg({ id: rid(), role: "user", kind: "text", content: composed, time: nowPT() });
    setInput("");
    setAttachment(null);
    await orchestrate(composed);
  };

  /* -------------------- orquestração (KB-first + decisão autónoma) ------------------- */
  const orchestrate = async (userText: string) => {
    setSending(true);
    setAiTyping(true);
    try {
      const intent = detectIntent(userText);

      // 1) Pesquisa KB (local + remota)
      const kb = await searchKB(userText);

      // 2) Resposta com base na KB primeiro
      const kbMsgs = buildKBFirstMessages(userText, kb);
      const answer = await callAIChatCF(kbMsgs);

      // 3) Mostra resposta + fontes
      pushMsg({
        id: rid(),
        role: "assistant",
        kind: "text",
        content: answer || "Consigo ajudar, mas preciso de mais detalhe.",
        time: nowPT(),
        sources: kb,
      });

      // 4) CTA contextual de pagamentos (não intrusivo)
      if (intent === "payments") {
        pushMsg({ id: rid(), role: "assistant", kind: "payments", time: nowPT(), note: "Consulta/ação rápida de pagamentos." });
      }

      // 5) Decisão autónoma: abrir formulário quando for razoável
      const escalation = shouldEscalate(userText, answer, intent);
      if (escalation === "schedule") {
        setPendingText(userText);
        pushMsg({
          id: rid(), role: "assistant", kind: "form", form: "schedule", time: nowPT(),
          schedule: { assunto: "", duracao: "60", modalidade: "indiferente", professor: "", janelas: "", detalhe: "" },
        });
        setAiTyping(false); setSending(false);
        return;
      }
      if (escalation === "ticket") {
        setPendingText(userText);
        pushMsg({
          id: rid(), role: "assistant", kind: "form", form: "ticket", time: nowPT(),
          ticket: { categoria: "Técnico", urgencia: "Baixa", assunto: "", descricao: "" },
        });
        setAiTyping(false); setSending(false);
        return;
      }

      // 6) Se o utilizador pedir explicitamente, abre logo
      if (explicitScheduleAsk(userText)) {
        setPendingText(userText);
        pushMsg({
          id: rid(), role: "assistant", kind: "form", form: "schedule", time: nowPT(),
          schedule: { assunto: "", duracao: "60", modalidade: "indiferente", professor: "", janelas: "", detalhe: "" },
        });
        return;
      }
      if (explicitTicketAsk(userText)) {
        setPendingText(userText);
        pushMsg({
          id: rid(), role: "assistant", kind: "form", form: "ticket", time: nowPT(),
          ticket: { categoria: "Técnico", urgencia: "Baixa", assunto: "", descricao: "" },
        });
        return;
      }

      // 7) Se a intenção for schedule/ticket mas não houve escalonamento automático, oferece confirmação suave
      if (intent === "schedule") {
        pushMsg({
          id: rid(), role: "assistant", kind: "confirm", time: nowPT(),
          title: "Precisas mesmo de marcar horário?",
          description: "Se a resposta acima não resolveu, posso avançar para triagem e sugerir horários.",
          actions: [
            { id: "open-schedule-form", label: "Triagem de marcação", role: "primary" },
            { id: "cancel", label: "Agora não", role: "secondary" },
          ],
          meta: { pendingText: userText },
        });
      }
      if (intent === "ticket") {
        pushMsg({
          id: rid(), role: "assistant", kind: "confirm", time: nowPT(),
          title: "Queres abrir um ticket?",
          description: "Se a resposta acima não for suficiente, avanço com a triagem para criar o ticket.",
          actions: [
            { id: "open-ticket-form", label: "Triagem de ticket", role: "primary" },
            { id: "cancel", label: "Agora não", role: "secondary" },
          ],
          meta: { pendingText: userText },
        });
      }
    } catch {
      pushMsg({ id: rid(), role: "assistant", kind: "text", content: "Ocorreu um erro. Tenta outra vez.", time: nowPT() });
    } finally {
      setAiTyping(false);
      setSending(false);
    }
  };

  const buildModelMessages = (msgs: Message[]) => {
    const trimmed = msgs.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content:
        m.kind === "text" ? m.content :
        m.kind === "ticket" ? `TICKET#${(m as TicketMsg).ticketId}: ${(m as TicketMsg).subject}` :
        m.kind === "slots" ? `SLOTS: ${(m as SlotsMsg).slots.length} opções em análise` :
        m.kind === "payments" ? `PAGAMENTOS: atalho apresentado ao utilizador` :
        m.kind === "form" ? `FORM#${(m as FormMsg).form} em curso` :
        m.kind === "confirm" ? `CONFIRM#${(m as ConfirmMsg).title}` : "",
    }));
    return [{ role: "system", content: SYSTEM_HINT }, ...trimmed];
  };

  /* -------------------- ações pagamentos ------------------- */
  const openPayments = () => navigate("/aluno/pagamentos");
  const checkBalance = async () => {
    try {
      setLoadingBalance(true);
      const { data, error } = await supabase.rpc("get_balance");
      if (error) throw error;
      setBalance(Number(data ?? 0));
    } catch {
      setBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  };

  /* -------------------- reservar slot ------------------- */
  async function bookSelected(slot: Slot) {
    try {
      pushMsg({ id: rid(), role: "assistant", kind: "text", content: "A confirmar a reserva…", time: nowPT() });
      const { ok, booking_id } = await bookSlot(slot.id, `Reserva via assistente para ${slot.teacher_name}`);
      if (ok) {
        pushMsg({
          id: rid(), role: "assistant", kind: "confirm", time: nowPT(),
          title: "Reserva confirmada",
          description: `ID da reserva: ${booking_id || "—"}`,
          actions: [{ id: "cancel", label: "Fechar", role: "secondary" }],
        });
      } else {
        pushMsg({ id: rid(), role: "assistant", kind: "text", content: "Não foi possível confirmar. Tenta outro horário.", time: nowPT() });
      }
    } catch {
      pushMsg({ id: rid(), role: "assistant", kind: "text", content: "Falhou a reserva. Tenta mais tarde.", time: nowPT() });
    }
  }

  /* ============================ UI ============================= */
  return (
    <div className={`w-full ${compact ? "max-w-3xl" : "max-w-4xl"} mx-auto h-[70vh] flex bg-card rounded-xl shadow-lg overflow-hidden`}>
      {/* Sidebar mini */}
      <aside className="w-56 bg-background border-r border-border flex flex-col py-4 px-2 gap-2">
        <div className="px-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">Conversa</div>
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-primary/10 text-primary shadow">
          <Bot className="w-5 h-5" />
          <span>Assistente IA</span>
        </div>

        <div className="mt-4 px-2 text-xs text-muted-foreground">Sugestões</div>
        <div className="px-2 mt-2 grid gap-2">
          {SUGESTOES.map((s) => (
            <button key={s} className="text-left text-xs px-3 py-2 rounded-md border border-border hover:bg-primary/5 hover:text-primary transition" onClick={() => setInput(s)}>
              {s}
            </button>
          ))}
        </div>

        <div className="mt-auto p-2 rounded-lg border border-border bg-background/50">
          <div className="flex items-center gap-2 text-xs font-medium mb-1">
            <Info className="h-3.5 w-3.5 text-primary" />
            Minimiza reuniões/tickets
          </div>
          <p className="text-[11px] text-muted-foreground">
            Primeiro tento resolver por ti com resposta e KB. Se for mesmo preciso, avanço para marcação ou ticket com triagem.
          </p>
        </div>
      </aside>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-primary/5">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-bold text-lg text-primary">Assistente IA</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-background">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] px-4 py-3 rounded-2xl shadow border ${isUser ? "bg-primary text-white border-primary/20 rounded-br-md" : "bg-card text-foreground border-border rounded-bl-md"}`}>
                  <div className="text-[10px] uppercase tracking-wide opacity-60 mb-1">{m.time}</div>

                  {m.kind === "text" && (
                    <>
                      <div className="prose prose-sm max-w-none whitespace-pre-line leading-relaxed">{(m as TextMsg).content}</div>
                      {!!(m as TextMsg).sources?.length && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(m as TextMsg).sources!.map((s) => <SourcePill key={s.id} s={s} />)}
                        </div>
                      )}
                    </>
                  )}

                  {m.kind === "slots" && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <div className="font-medium">{(m as SlotsMsg).title}</div>
                      </div>
                      {(m as SlotsMsg).reason && <div className="text-xs text-muted-foreground mb-2">{(m as SlotsMsg).reason}</div>}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(m as SlotsMsg).slots.map((s) => (<SlotCard key={s.id} slot={s} onBook={bookSelected} />))}
                      </div>
                    </div>
                  )}

                  {m.kind === "payments" && (
                    <PaymentsQuickPanel onOpenPayments={openPayments} onCheckBalance={checkBalance} loadingBalance={loadingBalance} balance={balance ?? undefined} />
                  )}

                  {/* FORM INLINE: MARCAÇÃO */}
                  {m.kind === "form" && (m as FormMsg).form === "schedule" && (
                    <ScheduleForm
                      initial={(m as FormMsg).schedule!}
                      onCancel={() => rmMsg(m.id)}
                      onSubmit={async (vals) => {
                        rmMsg(m.id);
                        // resumo
                        pushMsg({
                          id: rid(), role: "assistant", kind: "text", time: nowPT(),
                          content:
                            `Triagem recebida:\n` +
                            `• Assunto: ${vals.assunto || "—"}\n` +
                            `• Duração: ${vals.duracao} min · Modalidade: ${vals.modalidade}\n` +
                            `• Professor: ${vals.professor || "—"}\n` +
                            `• Janelas: ${vals.janelas || "—"}\n` +
                            (vals.detalhe ? `• Detalhe: ${vals.detalhe}\n` : ""),
                        });
                        // slots
                        setAiTyping(true);
                        try {
                          const { slots, reason } = await fetchSlots(pendingText, vals);
                          if (slots.length) {
                            pushMsg({ id: rid(), role: "assistant", kind: "slots", title: "Sugestões de horário", slots, reason, time: nowPT() });
                          } else {
                            const convo = buildModelMessages(messages);
                            const reply = await callAIChatCF([...convo, { role: "user", content: `${pendingText}\n[nota] Triagem preenchida sem slots disponíveis.` }]);
                            pushMsg({ id: rid(), role: "assistant", kind: "text", content: reply, time: nowPT() });
                          }
                        } catch {
                          pushMsg({ id: rid(), role: "assistant", kind: "text", content: "Não consegui obter horários. Tenta mais tarde.", time: nowPT() });
                        } finally {
                          setAiTyping(false);
                        }
                      }}
                    />
                  )}

                  {/* FORM INLINE: TICKET */}
                  {m.kind === "form" && (m as FormMsg).form === "ticket" && (
                    <TicketForm
                      initial={(m as FormMsg).ticket!}
                      onCancel={() => rmMsg(m.id)}
                      onSubmit={async (vals) => {
                        rmMsg(m.id);
                        pushMsg({
                          id: rid(), role: "assistant", kind: "text", time: nowPT(),
                          content:
                            `Triagem recebida para ticket:\n` +
                            `• Categoria: ${vals.categoria} · Urgência: ${vals.urgencia}\n` +
                            `• Assunto: ${vals.assunto}\n` +
                            (vals.descricao ? `• Descrição: ${vals.descricao}\n` : ""),
                        });

                        // última tentativa de resolver + confirmação
                        setAiTyping(true);
                        try {
                          const convo = buildModelMessages(messages);
                          const composed = `
Pedido: ${pendingText}
Categoria: ${vals.categoria}
Urgência: ${vals.urgencia}
Assunto: ${vals.assunto}
Descrição: ${vals.descricao}
Se existir solução direta, apresenta passos claros. Só se for inevitável, recomenda ticket.`.trim();

                          const [kb, ai] = await Promise.allSettled([
                            searchKB(`${pendingText} ${vals.assunto} ${vals.categoria}`),
                            callAIChatCF([...convo, { role: "user", content: composed }]),
                          ]);
                          const kbSources = kb.status === "fulfilled" ? kb.value : [];
                          const aiText = ai.status === "fulfilled" ? ai.value : "";

                          if (aiText) {
                            pushMsg({ id: rid(), role: "assistant", kind: "text", content: aiText, time: nowPT(), sources: kbSources });
                          }

                          // confirmação suave
                          pushMsg({
                            id: rid(), role: "assistant", kind: "confirm", time: nowPT(),
                            title: "Ainda precisas abrir um ticket?",
                            description: "Se as instruções acima não resolverem, posso criar já o ticket com estes detalhes.",
                            actions: [
                              { id: "open-ticket", label: "Abrir ticket", role: "primary" },
                              { id: "cancel", label: "Não é preciso", role: "secondary" },
                            ],
                            meta: { vals, pendingText },
                          });
                        } finally {
                          setAiTyping(false);
                        }
                      }}
                    />
                  )}

                  {/* CONFIRM */}
                  {m.kind === "confirm" && (
                    <ConfirmCard
                      msg={m as ConfirmMsg}
                      onAction={async (actionId) => {
                        if (actionId === "cancel") {
                          rmMsg(m.id);
                          pushMsg({ id: rid(), role: "assistant", kind: "text", time: nowPT(), content: "Perfeito — qualquer questão diz por aqui 💬" });
                          return;
                        }
                        if (actionId === "open-ticket-form") {
                          rmMsg(m.id);
                          setPendingText((m as ConfirmMsg).meta?.pendingText || "");
                          pushMsg({
                            id: rid(), role: "assistant", kind: "form", form: "ticket", time: nowPT(),
                            ticket: { categoria: "Técnico", urgencia: "Baixa", assunto: "", descricao: "" },
                          });
                          return;
                        }
                        if (actionId === "open-schedule-form") {
                          rmMsg(m.id);
                          setPendingText((m as ConfirmMsg).meta?.pendingText || "");
                          pushMsg({
                            id: rid(), role: "assistant", kind: "form", form: "schedule", time: nowPT(),
                            schedule: { assunto: "", duracao: "60", modalidade: "indiferente", professor: "", janelas: "", detalhe: "" },
                          });
                          return;
                        }
                        if (actionId === "open-ticket") {
                          const vals: TriageTicket = (m as ConfirmMsg).meta?.vals;
                          try {
                            const res = await openTicket({ ...vals, originalText: String((m as ConfirmMsg).meta?.pendingText || "") });
                            rmMsg(m.id);
                            pushMsg({ id: rid(), role: "assistant", kind: "ticket", ticketId: res.id, subject: vals.assunto, link: res.link, time: nowPT() });
                          } catch {
                            pushMsg({ id: rid(), role: "assistant", kind: "text", time: nowPT(), content: "Não consegui abrir o ticket agora. Tenta novamente." });
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {aiTyping && (
            <div className="flex justify-start">
              <div className="max-w-[60%] px-3 py-2 rounded-xl bg-card border border-border text-primary flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">A preparar resposta…</span>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Composer */}
        <form className="flex items-center gap-2 px-4 py-4 border-t bg-background" onSubmit={onSend}>
          <label className="relative flex items-center">
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={onAttach} disabled={sending || aiTyping} />
            <Button type="button" variant={attachment ? "default" : "ghost"} size="icon" className="rounded-full" tabIndex={-1} aria-label="Anexar ficheiro">
              <Paperclip className="h-5 w-5" />
            </Button>
          </label>

          <Input
            className="flex-1 rounded-full px-4 py-2 bg-white border border-input focus:ring-2 focus:ring-primary"
            placeholder="Pergunta sobre matéria, pagamentos, marcações…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending || aiTyping}
            autoFocus
          />

          <Button type="submit" variant="default" size="icon" className="rounded-full" disabled={sending || aiTyping || (!input.trim() && !attachment)} aria-label="Enviar">
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>

        {attachment && (
          <div className="px-6 pb-2 text-xs text-muted-foreground flex items-center gap-2">
            <span>📎</span>
            <span>{attachment.name}</span>
            <button className="ml-2 text-destructive hover:underline" onClick={() => setAttachment(null)} type="button">Remover</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================== Subcomponentes (estado local) ====================== */

function ScheduleForm({
  initial, onCancel, onSubmit,
}: { initial: TriageSchedule; onCancel: () => void; onSubmit: (vals: TriageSchedule) => void }) {
  const [v, setV] = useState<TriageSchedule>(initial);
  return (
    <div className="grid gap-3">
      <div className="text-sm font-medium mb-1">Triagem rápida para marcação</div>
      <div>
        <label className="text-xs font-medium">Assunto</label>
        <Input value={v.assunto} onChange={(e) => setV((t) => ({ ...t, assunto: e.target.value }))} placeholder="Ex.: Dúvidas de Matemática — funções" className="h-9" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium">Duração</label>
          <select className="w-full rounded-md border border-input p-2 bg-background" value={v.duracao} onChange={(e) => setV((t) => ({ ...t, duracao: e.target.value as TriageSchedule["duracao"] }))}>
            <option value="30">30 min</option><option value="60">60 min</option><option value="90">90 min</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Modalidade</label>
          <select className="w-full rounded-md border border-input p-2 bg-background" value={v.modalidade} onChange={(e) => setV((t) => ({ ...t, modalidade: e.target.value as TriageSchedule["modalidade"] }))}>
            <option value="indiferente">Indiferente</option><option value="presencial">Presencial</option><option value="online">Online</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Professor (opcional)</label>
          <Input value={v.professor} onChange={(e) => setV((t) => ({ ...t, professor: e.target.value }))} placeholder="Nome (se preferires)" className="h-9" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium">Janelas horárias</label>
        <Input value={v.janelas} onChange={(e) => setV((t) => ({ ...t, janelas: e.target.value }))} placeholder="Ex.: 3ª/5ª 15h-18h; sábados manhã" className="h-9" />
      </div>

      <div>
        <label className="text-xs font-medium">Detalhe adicional</label>
        <textarea className="w-full min-h-[80px] rounded-md border border-input p-3 bg-background" value={v.detalhe} onChange={(e) => setV((t) => ({ ...t, detalhe: e.target.value }))} placeholder="Contexto que ajude a resolver sem reunião (opcional)" />
      </div>

      <div className="flex justify-between items-center pt-1">
        <span className="text-[11px] text-muted-foreground">Tento resolver sem marcação sempre que possível.</span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} className="h-8 px-3"><X className="w-4 h-4 mr-1" />Cancelar</Button>
          <Button onClick={() => onSubmit(v)} className="h-8 px-3"><Check className="w-4 h-4 mr-1" />Continuar</Button>
        </div>
      </div>
    </div>
  );
}

function TicketForm({
  initial, onCancel, onSubmit,
}: { initial: TriageTicket; onCancel: () => void; onSubmit: (vals: TriageTicket) => void }) {
  const [v, setV] = useState<TriageTicket>(initial);
  return (
    <div className="grid gap-3">
      <div className="text-sm font-medium mb-1">Triagem rápida de ticket</div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">Categoria</label>
          <select className="w-full rounded-md border border-input p-2 bg-background" value={v.categoria} onChange={(e) => setV((t) => ({ ...t, categoria: e.target.value as TriageTicket["categoria"] }))}>
            <option>Técnico</option><option>Acesso</option><option>Pagamento</option><option>Pedagógico</option><option>Outro</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Urgência</label>
          <select className="w-full rounded-md border border-input p-2 bg-background" value={v.urgencia} onChange={(e) => setV((t) => ({ ...t, urgencia: e.target.value as TriageTicket["urgencia"] }))}>
            <option>Baixa</option><option>Média</option><option>Alta</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium">Assunto</label>
        <Input value={v.assunto} onChange={(e) => setV((t) => ({ ...t, assunto: e.target.value }))} placeholder="Resumo do pedido" className="h-9" />
      </div>

      <div>
        <label className="text-xs font-medium">Descrição</label>
        <textarea className="w-full min-h-[90px] rounded-md border border-input p-3 bg-background" value={v.descricao} onChange={(e) => setV((t) => ({ ...t, descricao: e.target.value }))} placeholder="Explica com detalhe para tentar resolver sem escalonar." />
      </div>

      <div className="flex justify-between items-center pt-1">
        <span className="text-[11px] text-muted-foreground">Vou tentar resolver antes de escalar.</span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} className="h-8 px-3"><X className="w-4 h-4 mr-1" />Cancelar</Button>
          <Button onClick={() => onSubmit(v)} className="h-8 px-3"><Check className="w-4 h-4 mr-1" />Continuar</Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmCard({ msg, onAction }: { msg: ConfirmMsg; onAction: (actionId: string) => void }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <div className="text-sm font-medium">{msg.title}</div>
      {msg.description && <div className="text-xs text-muted-foreground mt-1">{msg.description}</div>}
      <div className="mt-2 flex gap-2">
        {msg.actions.map((a) => (
          <Button
            key={a.id}
            size="sm"
            variant={a.role === "primary" ? "default" : a.role === "destructive" ? "destructive" : "outline"}
            onClick={() => onAction(a.id)}
          >
            {a.id === "open-ticket" || a.id === "open-ticket-form" ? <LifeBuoy className="h-3.5 w-3.5 mr-1" /> : null}
            {a.id === "cancel" ? <X className="h-3.5 w-3.5 mr-1" /> : null}
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
