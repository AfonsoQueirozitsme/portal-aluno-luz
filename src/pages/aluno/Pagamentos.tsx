// file: src/pages/Aluno/Pagamentos.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, TrendingUp, Receipt, Info, ArrowRight } from "lucide-react";
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
  status: "pending" | "paid" | "failed" | "canceled" | "expired";
  horas: number;
  amount_cents: number;
  created_at: string;
  paid_at: string | null;
};

export default function Pagamentos() {
  const navigate = useNavigate();
  const location = useLocation();

  // rota ativa
  const tab: "pre" | "pos" = location.pathname.endsWith("pos-pago") ? "pos" : "pre";

  // UI estados
  const [modalOpen, setModalOpen] = useState(false);
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
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
  const [hasSession, setHasSession] = useState(false);

  // observar sessão
  useEffect(() => {
    let unsub: (() => void) | undefined;
    supabase.auth.getSession().then(({ data: { session } }) => setHasSession(!!session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s));
    unsub = () => sub.subscription.unsubscribe();
    return () => unsub?.();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setFetchErr(null);

      const { data: { user }, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      if (!user) throw new Error("Sessão inválida. Faz login novamente.");

      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("school_year")
        .eq("id", user.id)
        .maybeSingle();
      if (pErr) throw pErr;

      const sy = prof?.school_year ?? null;
      setSchoolYear(sy);
      setNivel(mapSchoolYearToNivel(sy));

      const { data: bal, error: bErr } = await supabase.rpc("get_my_balance");
      if (bErr) throw bErr;
      setSaldo(Number(bal ?? 0));

      const { data: ords, error: oErr } = await supabase
        .from("orders")
        .select("id,status,horas,amount_cents,created_at,paid_at")
        .order("created_at", { ascending: false });
      if (oErr) throw oErr;
      setOrders(ords ?? []);
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

  // após retorno do Stripe ?checkout=success → refetch
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "success") {
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
    return null;
  }, [location.search]);

  // tabs handler
  const handleTab = (t: "pre" | "pos") => {
    if (t !== tab) {
      setPendingTab(t);
      setSwitchModalOpen(true);
    }
  };
  const confirmSwitch = () => {
    if (pendingTab) {
      navigate(`/aluno/pagamentos/${pendingTab === "pre" ? "pre-pago" : "pos-pago"}`);
      setSwitchModalOpen(false);
      setPendingTab(null);
    }
  };

  // orçamento (client-side; valor final é o do servidor)
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
      const supaUrl = import.meta.env.VITE_SUPABASE_URL;      // ex: https://qzvikwxwvwmngbnyxpwr.supabase.co
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // anon key
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
        if (res.status === 401) {
          throw new Error("Não autorizado (401). Garante que a função lê o utilizador via JWT e que estás autenticado.");
        }
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
              : "border-transparent text-muted-foreground hover:text-primary hover:bg-primary/5"
          }`}
          onClick={() => handleTab("pos")}
        >
          <Receipt className="w-5 h-5" /> Pós-pago
        </button>
      </div>

      {/* Modal troca de método */}
      <Dialog open={switchModalOpen} onOpenChange={setSwitchModalOpen}>
        <DialogContent className="max-w-md rounded-2xl shadow-2xl border-0 animate-modal-fade-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ArrowRight className="w-6 h-6 text-primary" />
              Trocar método de pagamento
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 mb-6 text-base text-muted-foreground text-center">
            Tem a certeza que pretende trocar para o modo{" "}
            <span className="font-semibold text-primary">
              {pendingTab === "pre" ? "Pré-pago" : "Pós-pago"}
            </span>
            ?<br />
            Esta ação pode afetar a forma como as suas explicações são faturadas.
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

          {/* Mensagens do Stripe */}
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

          {/* Notas */}
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground text-sm">
              <Info className="w-4 h-4" />
              O saldo pré-pago é descontado à medida que utiliza as explicações.
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="w-4 h-4" />
              Pode comprar mais horas a qualquer momento.
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo PÓS-PAGO (placeholders) */}
      {tab === "pos" && (
        <div className="transition-all duration-500 animate-fade-in-smooth">
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

          <div className="overflow-x-auto">
            <table className="w-full mt-2 border-spacing-y-2 border-separate">
              <thead>
                <tr>
                  <th className="text-left py-2 px-4">Fatura</th>
                  <th className="text-left py-2 px-4">Período</th>
                  <th className="text-left py-2 px-4">Data</th>
                  <th className="text-right py-2 px-4">Valor</th>
                  <th className="text-center py-2 px-4">Estado</th>
                  <th className="text-center py-2 px-4">Método</th>
                  <th className="text-center py-2 px-4">Vencimento</th>
                  <th className="text-center py-2 px-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {faturasPos.map((f) => (
                  <tr key={f.id} className="bg-card rounded-xl shadow border border-border">
                    <td className="py-2 px-4 font-medium">{f.numero}</td>
                    <td className="py-2 px-4">{f.periodo}</td>
                    <td className="py-2 px-4">{f.data}</td>
                    <td className="py-2 px-4 text-right">{f.valor.toFixed(2)} €</td>
                    <td className="py-2 px-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          f.estado === "Pago" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {f.estado}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-center">{f.metodo}</td>
                    <td className="py-2 px-4 text-center">{f.vencimento}</td>
                    <td className="py-2 px-4 text-center">
                      <Button variant="outline" size="sm" className="rounded-lg" onClick={() => window.open("/fatura", "_blank")}>
                        Ver Fatura
                      </Button>
                      {f.estado !== "Pago" && (
                        <Button variant="hero" size="sm" className="ml-2 rounded-lg" onClick={() => window.open("/fatura", "_blank")}>
                          Pagar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground text-sm">
              <Info className="w-4 h-4" />
              O pós-pago permite consumir explicações e pagar no final do mês.
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="w-4 h-4" />
              Receberá uma fatura mensal com o resumo dos serviços.
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
