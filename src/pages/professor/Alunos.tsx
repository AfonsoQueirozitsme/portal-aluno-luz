import React, { useEffect, useMemo, useState, Fragment } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, MoreVertical, MessageCircle, Calendar, FileText, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Tables } from "@/lib/database.types";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select as ShSelect, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
// (já tens Button, Input, etc.)

type DbUser = Tables<"users">;

const MaleAvatar = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="18" fill="#e0e7ff" />
    <ellipse cx="18" cy="15" rx="7" ry="7" fill="#6366f1" />
    <ellipse cx="18" cy="29" rx="10" ry="6" fill="#a5b4fc" />
  </svg>
);
const FemaleAvatar = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="18" fill="#fce7f3" />
    <ellipse cx="18" cy="15" rx="7" ry="7" fill="#f472b6" />
    <ellipse cx="18" cy="29" rx="10" ry="6" fill="#f9a8d4" />
  </svg>
);

export default function ProfessorAlunos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [students, setStudents] = useState<Array<{
    id: string;
    username: string;
    name: string;
    email: string;
    phone: string | null;
    subjects: string[];
    year: string;
    status: "active" | "inactive";
    lastClass: string | null;
    progress: number | null;
    avatar?: string | null;
    gender?: string | null;
  }>>([]);

  // --------- Fetch de alunos (public.users) ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFetchError(null);
      const { data, error } = await supabase
        .from("users")
        .select("id, username, full_name, email, phone, year, privacy_newsletter, gender")
        .order("full_name", { ascending: true });

      if (cancelled) return;

      if (error) {
        setFetchError(error.message);
        setStudents([]);
        setLoading(false);
        return;
      }

      const mapped = (data ?? []).map((row: any) => ({
        id: row.id,
        username: row.username,
        name: row.full_name,
        email: row.email,
        phone: row.phone ?? null,
        subjects: [],
        year: row.year ? `${row.year}º ano` : "—",
        status: row.privacy_newsletter ? "active" as const : "inactive" as const,
        lastClass: null,
        progress: null,
        avatar: null,
        gender: row.gender ?? null,
      }));

      setStudents(mapped);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      s.subjects.some(sub => sub.toLowerCase().includes(q))
    );
  }, [searchTerm, students]);

  const getStatusBadge = (status: "active" | "inactive") => {
    return status === "active"
      ? <Badge variant="default" className="bg-green-100 text-green-700">Ativo</Badge>
      : <Badge variant="secondary">Inativo</Badge>;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return "text-green-600";
    if (progress >= 75) return "text-blue-600";
    if (progress >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  // --------- Modal Inscrever Aluno (username obrigatório) ----------
  const [showEnroll, setShowEnroll] = useState(false);
  const [enEmail, setEnEmail] = useState("");
  const [enName, setEnName] = useState("");
  const [enUsername, setEnUsername] = useState("");
  const [enYear, setEnYear] = useState<number | "">("");
  const [enLoading, setEnLoading] = useState(false);
  const [enMsg, setEnMsg] = useState<string | null>(null);
  const [enErr, setEnErr] = useState<string | null>(null);


  // ----- Modal: Enviar mensagem -----
type Channel = "email" | "sms" | "inapp";

const [msgOpen, setMsgOpen] = useState(false);
const [msgStudent, setMsgStudent] = useState<{
  id: string; name: string; email: string; phone?: string | null;
} | null>(null);

const [msgChannel, setMsgChannel] = useState<Channel>("email");
const [msgTemplate, setMsgTemplate] = useState<string>("faltapg");
const [msgSubject, setMsgSubject] = useState<string>("");
const [msgBody, setMsgBody] = useState<string>("");
const [msgSending, setMsgSending] = useState(false);
const [msgOk, setMsgOk] = useState<string | null>(null);
const [msgErr, setMsgErr] = useState<string | null>(null);

type MessageCtx = {
  name: string;
  username?: string;
};

type MessageTemplate = {
  label: string;
  subject: string;                              // obrigatório
  body: (ctx: MessageCtx) => string;            // texto simples
  ctaText?: string;                              // opcional
  ctaHref?: (ctx: MessageCtx) => string | undefined; // opcional
};

// ❌ removido "export"
const MESSAGE_TEMPLATES: Record<string, MessageTemplate> = {
  faltapg: {
    label: "Falta de pagamento",
    subject: "Pagamento em falta",
    body: ({ name }) =>
      `Olá ${name},\n\nDetetámos um pagamento em falta. Agradecemos a regularização assim que possível. Caso já o tenha feito, por favor ignore esta mensagem.\n\nObrigado.`,
    ctaText: "Ir para Pagamentos",
    ctaHref: () => `${window.location.origin}/aluno/pagamentos`,
  },

  fatura: {
    label: "Fatura disponível",
    subject: "A sua fatura está disponível",
    body: ({ name }) =>
      `Olá ${name},\n\nA sua fatura/recibo já está disponível no portal. Pode consultar e proceder ao pagamento quando quiser.\n\nObrigado.`,
    ctaText: "Ver fatura",
    ctaHref: () => `${window.location.origin}/aluno/pagamentos`,
  },

  avisoaula: {
    label: "Aviso de explicações",
    subject: "Aviso de explicações",
    body: ({ name }) =>
      `Olá ${name},\n\nRelembramos que tem uma explicação agendada. Por favor confirme a presença no portal ou responda a esta mensagem.\n\nAté já!`,
    ctaText: "Ver próximas aulas",
    ctaHref: () => `${window.location.origin}/aluno/aulas`,
  },

  lembrarhorario: {
    label: "Relembrar horário",
    subject: "Relembrar horário",
    body: ({ name }) =>
      `Olá ${name},\n\nSegue o lembrete do seu horário desta semana. Verifique no portal caso exista alguma alteração.\n\nBom estudo!`,
    ctaText: "Abrir horário",
    ctaHref: () => `${window.location.origin}/aluno/horario`,
  },

  boasvindas: {
    label: "Boas-vindas",
    subject: "Bem-vindo(a) ao Centro de Explicações",
    body: ({ name }) =>
      `Olá ${name},\n\nBem-vindo(a)! A sua conta foi criada com sucesso. Qualquer dúvida, estamos ao dispor.\n\nBoa jornada!`,
    ctaText: "Entrar no portal",
    ctaHref: () => `${window.location.origin}/aluno`,
  },

  custom: {
    label: "Mensagem personalizada",
    subject: "",
    body: () => "",
  },
};


// sempre que muda template/canal/aluno, preenche campos
useEffect(() => {
  if (!msgStudent) return;
  const t = MESSAGE_TEMPLATES[msgTemplate];
  if (!t) return;
  setMsgSubject(t.subject ?? "");
  setMsgBody(t.body({ name: msgStudent.name || "Encarregado" }));
}, [msgTemplate, msgStudent]);

// abrir modal helper
const openMessageModal = (s: {
  id: string; name: string; email: string; phone?: string | null;
}) => {
  setMsgStudent(s);
  setMsgChannel("email");
  setMsgTemplate("faltapg");
  setMsgOk(null);
  setMsgErr(null);
  setMsgOpen(true);
};

// enviar (insere numa outbox)
// enviar (insere numa outbox)
const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!msgStudent) return;

  try {
    setMsgSending(true);
    setMsgOk(null);
    setMsgErr(null);

    // ---------- EMAIL ----------
    if (msgChannel === "email") {
      const to = (msgStudent.email || "").trim().toLowerCase();
      const subject = (msgSubject || "").trim();
      const body = (msgBody || "").trim();
      const t = MESSAGE_TEMPLATES[msgTemplate];
      const ctaText = t?.ctaText;
      const ctaHref = t?.ctaHref?.({ name: msgStudent.name, username: localStorage.getItem("activeUsername") || undefined });

      if (!to) throw new Error("Este aluno não tem email definido.");
      if (!subject) throw new Error("Assunto é obrigatório para Email.");
      if (!body) throw new Error("O corpo do email não pode estar vazio.");

      // Chamada à Edge Function (gera SEMPRE o template bonito com o teu HTML)
      // NOTA: A função usa 'text' e ignora 'html' on purpose (ela própria constrói o template)
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess?.session?.access_token ?? "";


      // 1) tenta via invoke (jwt automático)
      try {
        const { error: fxErr } = await supabase.functions.invoke("email-mailersend", {
          body: {
            to,
            subject,
            text: body,      // A função gera o HTML de template com base neste texto
            ctaText,
            ctaHref,
          },
        });
        if (fxErr) throw fxErr;
      } catch {
        // 2) fallback com fetch manual (útil em ambientes onde invoke não esteja a passar)
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-mailersend`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: accessToken ? `Bearer ${accessToken}` : "",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            to,
            subject,
            text: body,
            ctaText,
            ctaHref,
          }),
        });

        const raw = await res.text();
        let json: any = null;
        try { json = raw ? JSON.parse(raw) : null; } catch {}
        if (!res.ok) {
          throw new Error(json?.error || json?.message || raw || `Falha no envio de email (HTTP ${res.status})`);
        }
      }

      // Outbox (registo do envio)
      const outboxEmail = {
        recipient_user_id: msgStudent.id,     // UUID do aluno
        channel: "email" as const,
        recipient_email: to,
        recipient_phone: null,
        subject,
        body,                                 // guarda texto simples
        template_name: msgTemplate !== "custom" ? msgTemplate : null,
        status: "sent" as const,            // fica 'queued' (ou 'sent' se preferires confirmar)
        metadata: {
          sent_via: "mailersend",
          edge_function: "email-mailersend",
          // podes guardar ctx extra, p.ex. { ctaText, ctaHref }
        } as any,
        created_at: new Date().toISOString(),
      };

      const { error: insEmailErr } = await supabase
        .from("notifications_outbox")
        .insert(outboxEmail);
      if (insEmailErr) throw insEmailErr;

      setMsgOk("Email colocado para envio.");
      setTimeout(() => setMsgOpen(false), 1200);
      return;
    }

    // ---------- SMS ----------
    if (msgChannel === "sms") {
      const text = (msgBody || "").trim();
      if (!text) throw new Error("A mensagem não pode estar vazia.");
      if (text.length > 445) throw new Error("A mensagem SMS não pode exceder 445 caracteres.");

      const to = String(msgStudent.phone || "").replace(/\D+/g, "");
      if (!to) throw new Error("O aluno não tem um número de telefone válido.");

      // 1) via invoke
      try {
        const { data, error } = await supabase.functions.invoke("luso-send-sms", {
          body: { to, text },
        });
        if (error) throw error;

        let providerText = "";
        if (typeof data === "string") providerText = data;
        else if (data?.providerText) providerText = String(data.providerText);
        else providerText = JSON.stringify(data ?? {});

        if (!/mensagem_enviada/i.test(providerText)) {
          throw new Error(providerText || "Falha no envio via LusoSMS.");
        }
      } catch {
        // 2) fallback fetch manual
        const { data: sess } = await supabase.auth.getSession();
        const accessToken = sess?.session?.access_token ?? "";
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/luso-send-sms`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: accessToken ? `Bearer ${accessToken}` : "",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ to, text }),
        });

        const raw = await res.text();
        let json: any = null;
        try { json = raw ? JSON.parse(raw) : null; } catch {}
        const providerText = (json && (json.providerText || json.message)) || raw || "";

        if (!res.ok || !/mensagem_enviada/i.test(providerText)) {
          const reason = providerText || `HTTP ${res.status}`;
          throw new Error(reason);
        }
      }

      // Outbox
      const outboxSms = {
        recipient_user_id: msgStudent.id,
        channel: "sms" as const,
        recipient_email: null,
        recipient_phone: msgStudent.phone ?? null,
        subject: null,
        body: (msgBody || "").trim(),
        template_name: msgTemplate !== "custom" ? msgTemplate : null,
        status: "queued" as const,
        metadata: { sent_via: "lusosms", edge_function: "luso-send-sms" } as any,
        created_at: new Date().toISOString(),
      };

      const { error: insSmsErr } = await supabase
        .from("notifications_outbox")
        .insert(outboxSms);
      if (insSmsErr) throw insSmsErr;

      setMsgOk("SMS colocado para envio.");
      setTimeout(() => setMsgOpen(false), 1200);
      return;
    }

    // ---------- IN-APP ----------
    if (!msgBody.trim()) throw new Error("Escreve a mensagem a enviar.");

    const outboxInapp = {
      recipient_user_id: msgStudent.id,
      channel: "inapp" as const,
      recipient_email: null,
      recipient_phone: null,
      subject: null,
      body: (msgBody || "").trim(),
      template_name: msgTemplate !== "custom" ? msgTemplate : null,
      status: "queued" as const,
      metadata: { sent_via: "inapp" } as any,
      created_at: new Date().toISOString(),
    };

    const { error: insInappErr } = await supabase
      .from("notifications_outbox")
      .insert(outboxInapp);
    if (insInappErr) throw insInappErr;

    setMsgOk("Mensagem colocada em fila para envio.");
    setTimeout(() => setMsgOpen(false), 1200);
  } catch (err: any) {
    setMsgErr(err?.message ?? "Não foi possível enviar a mensagem.");
  } finally {
    setMsgSending(false);
  }
};


const handleEnroll = async (e: React.FormEvent) => {
  e.preventDefault();
  setEnLoading(true);
  setEnErr(null);
  setEnMsg(null);

  try {
    const username = enUsername.trim();
    const email = enEmail.trim().toLowerCase();

    if (!username) throw new Error("O username é obrigatório.");
    if (!email) throw new Error("O email é obrigatório.");

    // 0) username único
    const { data: exists, error: selErr } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .limit(1);

    if (selErr) throw selErr;
    if (exists && exists.length > 0) {
      throw new Error("Esse username já existe. Escolhe outro.");
    }

    // 1) envia magic link para confirmação e redireciona para /completar-perfil
    const { error: otpErr1 } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/completar-perfil`,
      },
    });
    if (otpErr1) throw otpErr1;

    // (opcional) marcar que este email deve configurar palavra-passe/completar perfil ao entrar
    localStorage.setItem("awaiting_password_setup", email);

    // 2) pré-criar registo na tua tabela (pode falhar por RLS; não é crítico)
    const insertPayload: Partial<DbUser> = {
      email,
      full_name: enName || email.split("@")[0],
      username,
      year: typeof enYear === "number" ? enYear : null,
      privacy_newsletter: true,
    };

    const { error: insErr } = await supabase.from("users").insert(insertPayload);
    if (insErr) {
      // se RLS bloquear, seguimos em frente (vai ligar após confirmação/login com attach_accounts_to_me)
      const msg = (insErr.message || "").toLowerCase();
      if (!msg.includes("rls") && !msg.includes("permission")) {
        throw insErr;
      }
    }

    setEnMsg("Enviámos um email de confirmação. Depois de confirmares, vais completar o perfil.");
    // refresh suave da lista (ignora erros)
    const { data } = await supabase
      .from("users")
      .select("id, username, full_name, email, phone, year, privacy_newsletter, gender")
      .order("full_name", { ascending: true });

    if (data) {
      const mapped = (data ?? []).map((row: any) => ({
        id: row.id,
        username: row.username,
        name: row.full_name,
        email: row.email,
        phone: row.phone ?? null,
        subjects: [],
        year: row.year ? `${row.year}º ano` : "—",
        status: row.privacy_newsletter ? ("active" as const) : ("inactive" as const),
        lastClass: null,
        progress: null,
        avatar: null,
        gender: row.gender ?? null,
      }));
      setStudents(mapped);
    }

    // limpa form
    setEnEmail("");
    setEnName("");
    setEnUsername("");
    setEnYear("");
  } catch (err: any) {
    setEnErr(err?.message ?? "Não foi possível inscrever o aluno.");
  } finally {
    setEnLoading(false);
  }
};

  // --------- Login: helpers para o teu ecrã de login (email → múltiplos usernames) ----------
  // Podes reutilizar estes dois métodos no teu componente de login:
  async function getAccountsByEmail(email: string) {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, full_name, gender, email")
      .eq("email", email);
    if (error) throw error;
    return data ?? [];
  }
  async function getAccountByUsername(username: string) {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, full_name, gender, email")
      .eq("username", username)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  return (
    <>
      <Helmet>
        <title>Alunos - Professor | Centro de Explicações</title>
        <meta name="description" content="Gerir e acompanhar o progresso dos teus alunos" />
      </Helmet>

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Alunos</h1>
            <p className="text-muted-foreground">Gerir e acompanhar o progresso dos teus alunos</p>
          </div>

          <Button className="bg-gradient-hero hover:opacity-90" onClick={() => setShowEnroll(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Inscrever Aluno
          </Button>
        </div>

        {/* Search and Stats */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, email ou username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-panel">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-foreground">
                  {loading ? "…" : students.length}
                </div>
                <p className="text-xs text-muted-foreground">Total Alunos</p>
              </CardContent>
            </Card>
            <Card className="glass-panel">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {loading ? "…" : students.filter(s => s.status === "active").length}
                </div>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </CardContent>
            </Card>
            <Card className="glass-panel">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">—</div>
                <p className="text-xs text-muted-foreground">Progresso Médio</p>
              </CardContent>
            </Card>
            <Card className="glass-panel">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">—</div>
                <p className="text-xs text-muted-foreground">Aulas Semana</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Erro fetch */}
        {fetchError && (
          <Card className="glass-panel border-red-200">
            <CardContent className="p-4 text-sm text-red-600">{fetchError}</CardContent>
          </Card>
        )}

        {/* Students Table */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Lista de Alunos</CardTitle>
            <CardDescription>
              {filteredStudents.length} de {students.length} alunos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Disciplinas</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Última Aula</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      A carregar…
                    </TableCell>
                  </TableRow>
                )}

                {!loading && filteredStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      Sem resultados.
                    </TableCell>
                  </TableRow>
                )}

                {!loading && filteredStudents.map((s) => (
                  <TableRow key={s.id} className="hover:bg-accent/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={s.avatar ?? undefined} alt={s.name} />
                          <AvatarFallback className="bg-gradient-hero text-white">
                            {s.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{s.name}</p>
                          <p className="text-sm text-muted-foreground">{s.email}</p>
                          {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{s.username}</TableCell>
                    <TableCell>
                      {s.subjects.length ? (
                        <div className="flex flex-wrap gap-1">
                          {s.subjects.map((subject, index) => (
                            <Badge key={index} variant="outline" className="text-xs">{subject}</Badge>
                          ))}
                        </div>
                      ) : <span className="text-sm text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="font-medium">{s.year}</TableCell>
                    <TableCell>{getStatusBadge(s.status)}</TableCell>
                    <TableCell>
                      {typeof s.progress === "number" ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div className="bg-gradient-hero h-2 rounded-full transition-all" style={{ width: `${s.progress}%` }} />
                          </div>
                          <span className={`text-sm font-medium ${getProgressColor(s.progress)}`}>{s.progress}%</span>
                        </div>
                      ) : <span className="text-sm text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.lastClass ? new Date(s.lastClass).toLocaleDateString('pt-PT') : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
<DropdownMenuItem
  className="flex items-center gap-2"
  onClick={() =>
    openMessageModal({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
    })
  }
>
  <MessageCircle className="h-4 w-4" /> Enviar mensagem
</DropdownMenuItem>

                          <DropdownMenuItem className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Agendar Aula
                          </DropdownMenuItem>
 <DropdownMenuItem
    className="flex items-center gap-2"
    onClick={() => navigate(`/professor/alunos/${s.id}`)}
  >
    <FileText className="h-4 w-4" />
    Ver Relatório
  </DropdownMenuItem>
                          <DropdownMenuItem className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Ver Progresso
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
{/* Modal: Enviar mensagem */}
<Dialog open={msgOpen} onOpenChange={setMsgOpen}>
  <DialogContent className="max-w-lg rounded-xl">
    <DialogHeader>
      <DialogTitle>Enviar mensagem {msgStudent ? `— ${msgStudent.name}` : ""}</DialogTitle>
    </DialogHeader>

    <form className="space-y-4" onSubmit={handleSendMessage}>
      {/* Canal */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant={msgChannel === "email" ? "default" : "outline"}
          onClick={() => setMsgChannel("email")}
        >
          Email
        </Button>
        <Button
          type="button"
          variant={msgChannel === "sms" ? "default" : "outline"}
          onClick={() => setMsgChannel("sms")}
        >
          Mensagem telefónica
        </Button>
        <Button
          type="button"
          variant={msgChannel === "inapp" ? "default" : "outline"}
          onClick={() => setMsgChannel("inapp")}
        >
          In-App
        </Button>
      </div>

      {/* Template */}
      <div className="grid gap-2">
        <Label>Template</Label>
        <ShSelect value={msgTemplate} onValueChange={(v) => setMsgTemplate(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Seleciona um template" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MESSAGE_TEMPLATES).map(([key, t]) => (
              <SelectItem key={key} value={key}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </ShSelect>
      </div>

      {/* Assunto (só Email) */}
      {msgChannel === "email" && (
        <div className="grid gap-2">
          <Label>Assunto</Label>
          <Input
            placeholder="Assunto da mensagem"
            value={msgSubject}
            onChange={(e) => setMsgSubject(e.target.value)}
          />
        </div>
      )}

      {/* Corpo */}
      <div className="grid gap-2">
        <Label>Mensagem</Label>
        <Textarea
          placeholder="Escreve a tua mensagem…"
          rows={8}
          value={msgBody}
          onChange={(e) => setMsgBody(e.target.value)}
        />
      </div>

      {/* Feedback */}
      {msgErr && <div className="text-sm text-red-600">{msgErr}</div>}
      {msgOk && <div className="text-sm text-green-600">{msgOk}</div>}

      {/* Preview curto */}
      <div className="text-xs text-muted-foreground">
        <b>Pré-visualização:</b>{" "}
        {msgChannel === "email"
          ? `Para: ${msgStudent?.email || "—"} • Assunto: ${msgSubject || "—"}`
          : msgChannel === "sms"
          ? `Para: ${msgStudent?.phone || "—"}`
          : "Notificação In-App"}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setMsgOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={msgSending}>
          {msgSending ? "A enviar…" : "Enviar"}
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>

      {/* Modal: Inscrever Aluno */}
      <div className={`fixed inset-0 z-40 ${showEnroll ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!showEnroll}>
        <div
          className={`absolute inset-0 transition-opacity ${showEnroll ? "opacity-100" : "opacity-0"}`}
          style={{ background: "rgba(17,24,39,0.45)" }}
          onClick={() => !enLoading && setShowEnroll(false)}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-full max-w-md rounded-xl bg-white shadow-2xl p-6 transition-all ${showEnroll ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h3 className="text-xl font-bold mb-1">Inscrever Aluno</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enviamos um link de acesso por email para o aluno concluir o registo. O <b>username é obrigatório</b>.
            </p>

            {enErr && <div className="mb-3 text-sm text-red-600">{enErr}</div>}
            {enMsg && <div className="mb-3 text-sm text-green-600">{enMsg}</div>}

            <form className="space-y-3" onSubmit={handleEnroll}>
              <Input type="email" placeholder="Email do aluno" value={enEmail} onChange={(e) => setEnEmail(e.target.value)} required disabled={enLoading} />
              <Input type="text" placeholder="Nome completo (opcional)" value={enName} onChange={(e) => setEnName(e.target.value)} disabled={enLoading} />
              <Input type="text" placeholder="Username (obrigatório)" value={enUsername} onChange={(e) => setEnUsername(e.target.value)} required disabled={enLoading} />
              <Input type="number" placeholder="Ano (ex: 10)" value={enYear} onChange={(e) => setEnYear(e.target.value ? Number(e.target.value) : "")} disabled={enLoading} min={1} max={13} />

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={enLoading || !enEmail || !enUsername.trim()}>
                  {enLoading ? "A enviar…" : "Enviar convite"}
                </Button>
                <Button type="button" variant="ghost" className="flex-1" onClick={() => !enLoading && setShowEnroll(false)} disabled={enLoading}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
