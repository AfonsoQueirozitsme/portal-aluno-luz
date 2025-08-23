// file: src/pages/Aluno/Pagamentos.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, TrendingUp, Receipt, Info, ArrowRight, Lock, ShieldCheck, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ─────────────────────────────────────────────────────────────
   Tipos e tabela de preços (espelha a Edge Function)
---------------------------------------------------------------- */
type Nivel =
  | "ciclo1_1_4"
  | "ciclo2_5_6"
  | "ciclo3_7_8"
  | "ciclo3_9"
  | "sec_sem_exame"
  | "sec_com_exame"
  | "sec_especial"
  | "exames"
  | "universidade";

type Modalidade = "individual" | "grupo";
type Duracao = 60 | 90;

const PRICE_TABLE: Record<Nivel, Record<Modalidade, Record<Duracao, number>>> = {
  ciclo1_1_4:     { individual: { 60: 12, 90: 18 },  grupo: { 60:  9, 90: 13.5 } },
  ciclo2_5_6:     { individual: { 60: 13, 90: 19.5 }, grupo: { 60: 10, 90: 15   } },
  ciclo3_7_8:     { individual: { 60: 15, 90: 22.5 }, grupo: { 60: 12, 90: 18   } },
  ciclo3_9:       { individual: { 60: 16, 90: 24 },   grupo: { 60: 13, 90: 19.5 } },
  sec_sem_exame:  { individual: { 60: 18, 90: 27 },   grupo: { 60: 14, 90: 21   } },
  sec_com_exame:  { individual: { 60: 20, 90: 30 },   grupo: { 60: 16, 90: 24   } },
  sec_especial:   { individual: { 60: 22, 90: 33 },   grupo: { 60: 18, 90: 27   } },
  exames:         { individual: { 60: 24, 90: 36 },   grupo: { 60: 20, 90: 30   } },
  universidade:   { individual: { 60: 26, 90: 39 },   grupo: { 60: 22, 90: 33   } },
};

const SERVICE_FEE = 0.05;

const NIVEL_LABEL: Record<Nivel, string> = {
  ciclo1_1_4: "1º Ciclo (1º-4º)",
  ciclo2_5_6: "2º Ciclo (5º-6º)",
  ciclo3_7_8: "3º Ciclo (7º-8º)",
  ciclo3_9: "3º Ciclo (9º)",
  sec_sem_exame: "Secundário (10º-11º) — sem exame",
  sec_com_exame: "Secundário (11º-12º) — com exame",
  sec_especial: "Secundário (disciplinas especiais)",
  exames: "Exames nacionais",
  universidade: "Universidade",
};

/* Heurística para mapear profiles.school_year → Nivel */
function mapSchoolYearToNivel(sy?: string | null): Nivel {
  const s = (sy ?? "").toLowerCase();

  if (s.includes("univers")) return "universidade";
  if (s.includes("exame")) return "exames";
  if (s.includes("disciplinas especiais")) return "sec_especial";

  if (s.includes("1º ciclo") || /(^|\D)[1-4](º|o)/.test(s)) return "ciclo1_1_4";
  if (s.includes("2º ciclo") || /(^|\D)[5-6](º|o)/.test(s)) return "ciclo2_5_6";
  if (s.includes("3º ciclo") && s.includes("9")) return "ciclo3_9";
  if (s.includes("3º ciclo") || /(^|\D)[7-8](º|o)/.test(s)) return "ciclo3_7_8";

  const has10 = s.includes("10");
  const has11 = s.includes("11");
  const has12 = s.includes("12");

  if (has12 || (has11 && s.includes("exame"))) return "sec_com_exame";
  if (has10 || has11) return "sec_sem_exame";

  return "sec_sem_exame";
}

/* Packs base (horas) */
const pacotes = [
  { id: 1, nome: "Pacote 5h", horas: 5 },
  { id: 2, nome: "Pacote 10h", horas: 10 },
  { id: 3, nome: "Pacote 20h", horas: 20 },
];

/* Placeholders para o separador Pós-pago */
const faturasPos = [
  { id: 1, numero: "2024-001", periodo: "Maio 2024", data: "2024-06-01", valor: 90, estado: "Por pagar", metodo: "MBWay", referencia: "MBW123456", vencimento: "2024-06-15" },
  { id: 2, numero: "2024-002", periodo: "Abril 2024", data: "2024-05-01", valor: 75, estado: "Pago", metodo: "Cartão", referencia: "CC987654", vencimento: "2024-05-15" },
];

type OrderRow = {
  id: string;
  status: string;
  horas: number;
  amount_cents: number;
  created_at: string;
  paid_at: string | null;
};

type StripeMandate = "not_started" | "pending" | "done";

type BalanceOp = {
  id: string;
  type: "credit" | "debit";
  hours_delta: number;
  amount_cents: number;
  source: string | null;
  order_id: string | null;
  lesson_id: string | null;
  note: string | null;
  created_at: string;
};

type DiscountRow = {
  id: string;
  name: string;
  code: string;
  value: number;   // percentagem [0..100] (toleramos também 0..1 no UI)
  active?: boolean | null;
};

export default function Pagamentos() {
  const navigate = useNavigate();
  const location = useLocation();

  // rota ativa
  const tab: "pre" | "pos" = location.pathname.endsWith("pos-pago") ? "pos" : "pre";

  // UI estados
  const [modalOpen, setModalOpen] = useState(false);
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [ddModalOpen, setDdModalOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<"pre" | "pos" | null>(null);

  const [modalidade, setModalidade] = useState<Modalidade>("individual");
  const [duracao, setDuracao] = useState<Duracao>(60);
  const [comprandoPack, setComprandoPack] = useState<number | null>(null);

  // dados
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [schoolYear, setSchoolYear] = useState<string | null>(null);
  const [nivel, setNivel] = useState<Nivel>("sec_sem_exame"); // derivado (read-only)
  const [saldo, setSaldo] = useState<number>(0); // horas
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ops, setOps] = useState<BalanceOp[]>([]);
  const [hasSession, setHasSession] = useState(false);

  // perfil/pos-pago/discount
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [allowPospago, setAllowPospago] = useState<boolean>(false);
  const [stripeMandateStatus, setStripeMandateStatus] = useState<StripeMandate>("not_started");
  const [stripeBusy, setStripeBusy] = useState(false);
  const [discount, setDiscount] = useState<DiscountRow | null>(null);

  // observar sessão
  useEffect(() => {
    let unsub: (() => void) | undefined;
    supabase.auth.getSession().then(({ data: { session } }) => setHasSession(!!session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s));
    unsub = () => sub.subscription.unsubscribe();
    return () => unsub?.();
  }, []);

  const getActiveProfileId = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("active_profile_id");
  };

  async function loadData() {
    try {
      setLoading(true);
      setFetchErr(null);

      const { data: { user }, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      if (!user) throw new Error("Sessão inválida. Faz login novamente.");

      // perfil ativo
      let profId = getActiveProfileId();
      if (!profId) {
        const { data: first, error: fErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (fErr) throw fErr;
        if (!first?.id) throw new Error("Não encontrei nenhum perfil.");
        profId = first.id;
        localStorage.setItem("active_profile_id", profId);
      }
      setActiveProfileId(profId);

      // dados do perfil (inclui coluna discount)
      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("school_year, allow_pospago, stripe_mandate_status, discount")
        .eq("id", profId)
        .maybeSingle();
      if (pErr) throw pErr;

      const sy = prof?.school_year ?? null;
      setSchoolYear(sy);
      setNivel(mapSchoolYearToNivel(sy));
      setAllowPospago(Boolean(prof?.allow_pospago));
      setStripeMandateStatus((prof?.stripe_mandate_status as StripeMandate) ?? "not_started");

      // carrega o desconto (se houver)
      setDiscount(null);
      const discountId = prof?.discount as string | null;
      if (discountId) {
        const { data: disc, error: dErr } = await supabase
          .from("discount")
          .select("id, name, code, value, active")
          .eq("id", discountId)
          .maybeSingle();
        if (!dErr && disc && (disc.active ?? true) && Number(disc.value) > 0) {
          setDiscount({
            id: disc.id,
            name: disc.name,
            code: disc.code,
            value: Number(disc.value),
            active: disc.active,
          });
        }
      }

      // saldo (RPC por utilizador)
      const { data: bal, error: bErr } = await supabase.rpc("get_my_balance");
      if (bErr) throw bErr;
      setSaldo(Number(bal ?? 0));

      // orders do utilizador auth
      const { data: ords, error: oErr } = await supabase
        .from("orders")
        .select("id,status,horas,amount_cents,created_at,paid_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (oErr) throw oErr;
      setOrders(ords ?? []);

      // balance_operations (últimos 50)
      const { data: opsData, error: opsErr } = await supabase
        .from("balance_operations")
        .select("id,type,hours_delta,amount_cents,source,order_id,lesson_id,note,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (opsErr) throw opsErr;
      setOps(opsData ?? []);
    } catch (e: any) {
      setFetchErr(e?.message ?? "Falha a carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  // load inicial
  useEffect(() => {
    loadData();
  }, []);

  // após retorno do Stripe ?checkout=success ou ?setup=success → refetch
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "success" || params.get("setup") === "success") {
      loadData();
    }
  }, [location.search]);

  // métricas pré-pago (reais)
  const totalGasto = useMemo(
    () => (orders ?? []).filter(o => o.status === "paid").reduce((acc, o) => acc + o.amount_cents / 100, 0),
    [orders]
  );
  const ultimaCompra = useMemo(() => {
    const row = (orders ?? []).find(o => o.status === "paid");
    if (!row) return null;
    const dt = new Date(row.paid_at ?? row.created_at);
    return { horas: row.horas, data: dt.toLocaleDateString() };
  }, [orders]);

  // mensagens de retorno do Stripe
  const checkoutMsg = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const flag = params.get("checkout");
    if (flag === "success") return { type: "success" as const, text: "Pagamento concluído com sucesso! 🎉" };
    if (flag === "cancel") return { type: "warn" as const, text: "Pagamento cancelado." };
    const setup = params.get("setup");
    if (setup === "success") return { type: "success" as const, text: "Débito direto configurado com sucesso. 👍" };
    if (setup === "cancel") return { type: "warn" as const, text: "Configuração de débito direto cancelada." };
    return null;
  }, [location.search]);

  // tabs handler com bloqueio de pós-pago
  const handleTab = (t: "pre" | "pos") => {
    if (t === tab) return;
    if (t === "pos" && !allowPospago) {
      setDdModalOpen(true);
      return;
    }
    setPendingTab(t);
    setSwitchModalOpen(true);
  };
  const confirmSwitch = () => {
    if (pendingTab) {
      navigate(`/aluno/pagamentos/${pendingTab === "pre" ? "pre-pago" : "pos-pago"}`);
      setSwitchModalOpen(false);
      setPendingTab(null);
    }
  };

  function quotePrice(horasPack: number) {
    const unit = PRICE_TABLE[nivel][modalidade][duracao]; // €/sessão
    const sessions = horasPack / (duracao / 60);
    const subtotal = unit * sessions;
    const total = subtotal * (1 + SERVICE_FEE);
    return Math.round(total * 100) / 100;
  }
  

  // exige sessão
  async function requireSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Precisas de iniciar sessão para comprar.");
    return session;
  }

  // checkout
  async function comprar(horasPack: number) {
    try {
      setComprandoPack(horasPack);

      // 1) sessão válida (obrigatória)
      const session = await requireSession();
      const access_token = session.access_token;

      // 2) envs obrigatórios
      const supaUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supaUrl || !anonKey) throw new Error("VITE_SUPABASE_URL/ANON_KEY em falta");

      // 3) domínio correto das functions
      const fnBase = supaUrl.replace(".supabase.co", ".functions.supabase.co");
      const fnUrl  = `${fnBase}/create-checkout`;

      const origin = window.location.origin;
      const payload = {
        nivel,
        modalidade,
        duracaoMin: duracao,
        horasPack,
        success_url: `${origin}/aluno/pagamentos/pre-pago?checkout=success`,
        cancel_url:  `${origin}/aluno/pagamentos/pre-pago?checkout=cancel`,
      };

      // 4) chamada com JWT do user + apikey
      const res = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${access_token}`,
          "apikey": anonKey,
          "x-client-info": "pagamentos-ui",
        },
        body: JSON.stringify(payload),
        credentials: "omit",
      });

      const text = await res.text();
      let json: any; try { json = JSON.parse(text); } catch { json = { raw: text }; }

      if (!res.ok) {
        console.error("[create-checkout] status:", res.status, json);
        if (res.status === 401) throw new Error("Não autorizado (401). Garante que estás autenticado.");
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      if (!json?.url) throw new Error("Resposta inválida da função (sem url)");

      window.location.href = json.url;
    } catch (e: any) {
      console.error("[comprar] erro:", e);
      alert(`Falha ao iniciar compra: ${e?.message ?? e}`);
    } finally {
      setComprandoPack(null);
    }
  }

  // Stripe setup (débito direto) — envia profile_id + URLs
  async function handleStripeSetup() {
    try {
      setStripeBusy(true);
      const profileId = activeProfileId || getActiveProfileId();
      if (!profileId) throw new Error("Perfil ativo não encontrado.");

      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke("create-stripe-setup-session", {
        method: "POST",
        body: {
          profile_id: profileId,
          success_url: `${origin}/aluno/pagamentos/pre-pago?setup=success`,
          cancel_url:  `${origin}/aluno/pagamentos/pre-pago?setup=cancel`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url; // redireciona para o Checkout (Setup Mode)
        return;
      }
      throw new Error("Resposta inesperada da Stripe.");
    } catch (e: any) {
      alert(e?.message ?? "Erro ao iniciar configuração do débito direto.");
    } finally {
      setStripeBusy(false);
    }
  }

  // helpers UI
  const euro = (cents: number) => (cents === 0 ? "—" : `${(cents / 100).toFixed(2)} €`);
  const fmtHours = (h: number) => (h === 0 ? "—" : `${h > 0 ? "+" : ""}${Number(h.toFixed(2))}h`);
  const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("pt-PT");
  const pct = (v: number) => {
    const val = Number(v);
    if (!Number.isFinite(val) || val <= 0) return null;
    const p = val <= 1 ? val * 100 : val; // tolera 0..1 também
    return Math.round(p);
  };

  const preOps = useMemo(
    () => ops.filter(o => o.source === "order" || o.source === "lesson_precharge"),
    [ops]
  );
  const posOps = useMemo(
    () => ops.filter(o => o.source === "lesson_poscharge"),
    [ops]
  );

  const OpsTable = ({ rows }: { rows: BalanceOp[] }) => (
    <div className="overflow-x-auto">
      <table className="w-full mt-2 border-spacing-y-2 border-separate">
        <thead>
          <tr>
            <th className="text-left py-2 px-4">Data</th>
            <th className="text-left py-2 px-4">Tipo</th>
            <th className="text-left py-2 px-4">Origem</th>
            <th className="text-right py-2 px-4">Horas</th>
            <th className="text-right py-2 px-4">Valor</th>
            <th className="text-left py-2 px-4">Ref.</th>
            <th className="text-left py-2 px-4">Nota</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-4 px-4 text-sm text-muted-foreground">
                Sem movimentos a apresentar.
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const typeBadge =
              r.type === "credit"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700";

            const sourceBadge =
              r.source === "order"
                ? "bg-blue-100 text-blue-700"
                : r.source === "lesson_precharge"
                  ? "bg-amber-100 text-amber-700"
                  : r.source === "lesson_poscharge"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-muted text-muted-foreground";

            const sourceLabel =
              r.source === "order"
                ? "Compra"
                : r.source === "lesson_precharge"
                  ? "Explicação"
                  : (r.source ?? "—");

            const ref =
              r.order_id ? `Pedido ${r.order_id.slice(0, 8)}…` :
              r.lesson_id ? `Aula ${r.lesson_id.slice(0, 8)}…` : "—";

            return (
              <tr key={r.id} className="bg-card rounded-xl shadow border border-border">
                <td className="py-2 px-4">{new Date(r.created_at).toLocaleString("pt-PT")}</td>
                <td className="py-2 px-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${typeBadge}`}>
                    {r.type === "credit" ? "Crédito" : "Débito"}
                  </span>
                </td>
                <td className="py-2 px-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${sourceBadge}`}>
                    {sourceLabel}
                  </span>
                </td>
                <td className="py-2 px-4 text-right">{fmtHours(r.hours_delta)}</td>
                <td className="py-2 px-4 text-right">{euro(r.amount_cents)}</td>
                <td className="py-2 px-4">{ref}</td>
                <td className="py-2 px-4 max-w-[320px]">
                  <span className="text-sm text-muted-foreground line-clamp-2">{r.note ?? "—"}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // pós-pago (placeholders)
  const valorDivida = useMemo(
    () => faturasPos.filter((f) => f.estado !== "Pago").reduce((acc, f) => acc + f.valor, 0),
    []
  );
  const faturasPorPagar = useMemo(
    () => faturasPos.filter((f) => f.estado !== "Pago").length,
    []
  );
  const totalFaturadoPos = useMemo(
    () => faturasPos.reduce((acc, f) => acc + f.valor, 0),
    []
  );

  // Banner de desconto (se existir)
  const DiscountBanner = () => {
    if (!discount) return null;
    const percent = pct(discount.value);
    if (!percent) return null;

    return (
      <div className="mb-4 px-4 py-3 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-start gap-2">
        <Tag className="w-4 h-4 mt-0.5" />
        <div className="text-sm">
          Estás coberto pelo desconto <span className="font-semibold">“{discount.name}”</span>
          {` — ${percent}% em todas as explicações.`}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex mb-8 border-b border-border">
        <button
          className={`px-6 py-3 font-semibold transition-all duration-300 border-b-2 flex items-center gap-2 rounded-t-lg ${
            tab === "pre"
              ? "border-primary text-primary bg-primary/5 shadow"
              : "border-transparent text-muted-foreground hover:text-primary hover:bg-primary/5"
          }`}
          onClick={() => handleTab("pre")}
        >
          <CreditCard className="w-5 h-5" /> Pré-pago
        </button>

        <button
          className={`px-6 py-3 font-semibold transition-all duration-300 border-b-2 flex items-center gap-2 rounded-t-lg ${
            tab === "pos"
              ? "border-primary text-primary bg-primary/5 shadow"
              : !allowPospago
                ? "border-transparent text-muted-foreground/70 hover:text-primary/90 hover:bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-primary hover:bg-primary/5"
          }`}
          onClick={() => handleTab("pos")}
          aria-disabled={!allowPospago}
          title={!allowPospago ? "Disponível apenas com débito direto ativo" : undefined}
        >
          {!allowPospago ? <Lock className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
          Pós-pago
        </button>
      </div>

      {/* Modal bloqueio pós-pago por falta de DD */}
      <Dialog open={ddModalOpen} onOpenChange={setDdModalOpen}>
        <DialogContent className="max-w-md rounded-2xl shadow-2xl border-0 animate-modal-fade-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Lock className="w-6 h-6 text-primary" />
              Pós-pago indisponível
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 mb-6 text-sm text-muted-foreground">
            Para usares o <strong>Pós-pago</strong>, precisas de ter o <strong>débito direto</strong> configurado.
            Assim garantimos a cobrança automática das aulas no fim do mês.
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <ShieldCheck className="w-4 h-4" />
            Estado atual: <span className="font-medium ml-1">{stripeMandateStatus === "done" ? "Ativo" : stripeMandateStatus === "pending" ? "A aguardar confirmação" : "Não iniciado"}</span>
          </div>
          <div className="flex gap-4 justify-center mt-2">
            <Button variant="outline" onClick={() => setDdModalOpen(false)}>
              Fechar
            </Button>
            <Button variant="hero" onClick={handleStripeSetup} disabled={stripeBusy}>
              {stripeBusy ? "A abrir…" : "Configurar débito direto"}
            </Button>
          </div>
          <div className="text-[11px] text-muted-foreground mt-3 text-center">
            Depois de concluíres, voltamos e atualizamos o estado automaticamente.
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal troca de método (quando permitido) */}
      <Dialog open={switchModalOpen} onOpenChange={setSwitchModalOpen}>
        <DialogContent className="max-w-md rounded-2xl shadow-2xl border-0 animate-modal-fade-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ArrowRight className="w-6 h-6 text-primary" />
              Trocar método de pagamento
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 mb-6 text-base text-muted-foreground text-center">
            Tens a certeza de que queres mudar para{" "}
            <span className="font-semibold text-primary">
              {pendingTab === "pre" ? "Pré-pago" : "Pós-pago"}
            </span>
            ?
          </div>
          <div className="flex gap-4 justify-center mt-4">
            <Button variant="outline" onClick={() => setSwitchModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="hero" onClick={confirmSwitch}>
              Trocar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conteúdo PRE-PAGO */}
      {tab === "pre" && (
        <div className="transition-all duration-500 animate-fade-in-smooth">
          {/* Estado de carregamento/erro */}
          {loading && (
            <div className="mb-6 text-sm text-muted-foreground">A carregar dados…</div>
          )}
          {!loading && fetchErr && (
            <div className="mb-6 text-sm text-destructive">{fetchErr}</div>
          )}

          {/* Mensagens */}
          {!loading && !fetchErr && checkoutMsg && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg ${
                checkoutMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {checkoutMsg.text}
            </div>
          )}

          {/* Banner de desconto (se existir) */}
          {!loading && !fetchErr && <DiscountBanner />}

          {/* Métricas reais */}
          {!loading && !fetchErr && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-primary/10 text-primary rounded-xl px-6 py-4 text-lg font-semibold flex flex-col items-center">
                <span>Saldo atual</span>
                <span className="font-bold text-2xl">{saldo.toFixed(2)}h</span>
              </div>
              <div className="bg-muted rounded-xl px-6 py-4 text-lg font-semibold flex flex-col items-center">
                <span>Total gasto</span>
                <span className="font-bold text-2xl">{totalGasto.toFixed(2)} €</span>
              </div>
              <div className="bg-background border border-border rounded-xl px-6 py-4 text-lg font-semibold flex flex-col items-center">
                <span>Última compra</span>
                {ultimaCompra ? (
                  <>
                    <span className="font-bold text-2xl">{ultimaCompra.horas}h</span>
                    <span className="text-xs text-muted-foreground">em {ultimaCompra.data}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-3">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Nível detetado:</span>{" "}
              {NIVEL_LABEL[nivel]}{" "}
              {schoolYear ? (
                <span className="opacity-70">(perfil: {schoolYear})</span>
              ) : (
                <span className="opacity-70">(perfil sem nível definido)</span>
              )}
            </div>
            <Button variant="hero" onClick={() => setModalOpen(true)} disabled={!hasSession}>
              {hasSession ? "Comprar pacote" : "Inicia sessão para comprar"}
            </Button>
          </div>

          {/* Modal de compra */}
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="max-w-3xl rounded-2xl shadow-2xl border-0 animate-modal-fade-in">
              <DialogHeader>
                <DialogTitle className="text-xl">Comprar horas</DialogTitle>
              </DialogHeader>

              {/* Seletores (nível read-only) */}
              <div className="grid md:grid-cols-3 gap-3">
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground mb-1">Modalidade</label>
                  <select
                    className="border rounded px-3 py-2 text-sm"
                    value={modalidade}
                    onChange={(e) => setModalidade(e.target.value as Modalidade)}
                  >
                    <option value="individual">Individual</option>
                    <option value="grupo">Grupo</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground mb-1">Nível de ensino</label>
                  <input
                    className="border rounded px-3 py-2 text-sm bg-muted cursor-not-allowed"
                    value={NIVEL_LABEL[nivel]}
                    readOnly
                  />
                  <span className="text-[11px] text-muted-foreground mt-1">
                    Detetado automaticamente a partir do teu perfil.
                  </span>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground mb-1">Duração por sessão</label>
                  <select
                    className="border rounded px-3 py-2 text-sm"
                    value={duracao}
                    onChange={(e) => setDuracao(Number(e.target.value) as Duracao)}
                  >
                    <option value={60}>1h00</option>
                    <option value={90}>1h30</option>
                  </select>
                </div>
              </div>

              {/* Packs */}
              <div className="grid md:grid-cols-3 gap-6 mt-5">
                {pacotes.map((p) => {
                  const preco = quotePrice(p.horas);
                  const buying = comprandoPack === p.horas;
                  return (
                    <div
                      key={p.id}
                      className="bg-card rounded-xl shadow-lg p-6 flex flex-col items-center text-center border border-border transition-all duration-300 hover:shadow-xl hover:border-primary"
                    >
                      <div className="text-xl font-bold mb-1">{p.nome}</div>
                      <div className="text-4xl font-extrabold text-primary mb-1">{p.horas}h</div>
                      <div className="text-xs text-muted-foreground mb-4">
                        {NIVEL_LABEL[nivel]} · {modalidade === "grupo" ? "Grupo" : "Individual"} · {duracao}min/sessão
                        <br />
                        <span className="text-[11px]">Inclui taxa de serviço ({Math.round(SERVICE_FEE * 100)}%)</span>
                      </div>
                      <div className="text-lg font-semibold mb-4">{preco.toFixed(2)} €</div>
                      <Button
                        variant="hero"
                        className="w-full"
                        onClick={() => comprar(p.horas)}
                        disabled={buying || !hasSession}
                      >
                        {buying ? "A redirecionar..." : "Comprar"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>

          {/* Movimentos PRE-PAGO */}
          <h3 className="mt-10 mb-2 text-lg font-semibold">Movimentos (pré-pago)</h3>
          <OpsTable rows={preOps} />

          {/* Notas */}
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground text-sm">
              <Info className="w-4 h-4" />
              O saldo pré-pago é descontado à medida que usas as explicações.
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="w-4 h-4" />
              Podes comprar mais horas a qualquer momento.
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo PÓS-PAGO */}
      {tab === "pos" && (
        <div className="transition-all duration-500 animate-fade-in-smooth">
          {/* Banner de desconto (se existir) */}
          {!loading && !fetchErr && <DiscountBanner />}

          <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-primary/10 text-primary rounded-xl px-6 py-4 text-lg font-semibold flex flex-col items-center">
              <span>Horas consumidas</span>
              <span className="font-bold text-2xl">12h</span>
            </div>
            <div className="bg-yellow-100 text-yellow-800 rounded-xl px-6 py-4 text-lg font-semibold flex flex-col items-center">
              <span>Valor em dívida</span>
              <span className="font-bold text-2xl">{valorDivida.toFixed(2)} €</span>
            </div>
            <div className="bg-destructive/10 text-destructive rounded-xl px-6 py-4 text-lg font-semibold flex flex-col items-center">
              <span>Faturas por pagar</span>
              <span className="font-bold text-2xl">{faturasPorPagar}</span>
            </div>
            <div className="bg-muted rounded-xl px-6 py-4 text-lg font-semibold flex flex-col items-center">
              <span>Total faturado</span>
              <span className="font-bold text-2xl">{totalFaturadoPos.toFixed(2)} €</span>
            </div>
          </div>

          {/* Movimentos PÓS-PAGO */}
          <h3 className="mt-2 mb-2 text-lg font-semibold">Movimentos (pós-pago)</h3>
          <OpsTable rows={posOps} />

          <div className="mt-10">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground text-sm">
              <Info className="w-4 h-4" />
              O pós-pago permite consumir explicações e pagar no final do mês.
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="w-4 h-4" />
              Receberás uma fatura mensal com o resumo dos serviços.
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          .animate-fade-in-smooth { animation: fadeInSmooth .6s cubic-bezier(.4,0,.2,1); }
          @keyframes fadeInSmooth {
            from { opacity: 0; transform: translateY(24px);}
            to   { opacity: 1; transform: translateY(0);}
          }
          .animate-modal-fade-in { animation: modalFadeIn .4s cubic-bezier(.4,0,.2,1); }
          @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.97);}
            to   { opacity: 1; transform: scale(1);}
          }
        `}
      </style>
    </div>
  );
}
