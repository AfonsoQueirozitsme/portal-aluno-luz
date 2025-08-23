// file: src/pages/Professor/POS.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";

import {
  ShoppingCart, Plus, Minus, Trash2, User, Percent, CheckCircle2, Search,
  Euro, ArrowLeftCircle, PlusCircle, CreditCard as CardIcon, HandCoins, Send, Loader2
} from "lucide-react";

/* ============================
   Tipos e helpers
============================ */

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  auth_user_id: string | null;
  discount: string | null;       // código
  school_year: string | null;    // para mapear nivel
};

type DiscountRow = {
  code: string;
  name: string;
  value: number; // percentagem (ex.: 10 = 10%)
};

type CatalogItem = {
  sku: string;
  name: string;
  default_price_cents: number;
  kind: "hours" | "fee";  // "hours" contam para horas; "fee" é taxa/serviço
  horas_per_unit?: number;
  badge?: string;
};

type CartItem = {
  sku: string;
  name: string;
  qty: number;
  price_cents: number;     // unit price (pode ser ajustado)
  kind: "hours" | "fee";
  horas_per_unit?: number; // se "hours"
};

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

const NO_CLIENT = "__NO_CLIENT__";
const NO_DISC   = "__NONE__";       // sentinela para select de desconto
const centsToEuro = (c: number) => (c / 100).toFixed(2) + " €";

// Heurística usada noutros ecrãs
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

/* Catálogo base */
const CATALOG: CatalogItem[] = [
  { sku: "H60-1",   name: "Aula Individual 60min", default_price_cents: 1800, kind: "hours", horas_per_unit: 1,   badge: "1h" },
  { sku: "H90-1",   name: "Aula Individual 90min", default_price_cents: 2700, kind: "hours", horas_per_unit: 1.5, badge: "1h30" },
  { sku: "PACK-5H", name: "Pacote 5h (pré-pago)",  default_price_cents: 9000, kind: "hours", horas_per_unit: 5,   badge: "5h" },
  { sku: "PACK-10H",name: "Pacote 10h (pré-pago)", default_price_cents: 17000,kind: "hours", horas_per_unit: 10,  badge: "10h" },
  { sku: "ENR",     name: "Matrícula",             default_price_cents: 1500, kind: "fee",                       badge: "Taxa" },
  { sku: "MAT",     name: "Materiais",             default_price_cents: 500,  kind: "fee",                       badge: "Extra" },
];

/* ============================
   Componente
============================ */

export default function POS() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Clientes / descontos
  const [clients, setClients] = useState<ProfileRow[]>([]);
  const [discounts, setDiscounts] = useState<Record<string, DiscountRow>>({});

  // Combobox cliente
  const [clientOpen, setClientOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>(NO_CLIENT);

  // Desconto “só para esta fatura”
  const [invoiceDiscountCode, setInvoiceDiscountCode] = useState<string>(NO_DISC);

  // Modalidade (requerida pela tabela orders)
  const [modalidade, setModalidade] = useState<Modalidade>("individual");
  const [modalidadeLocked, setModalidadeLocked] = useState(false); // evita override automático após intervenção do utilizador

  // Serviços
  const [serviceSearch, setServiceSearch] = useState("");

  // Carrinho
  const [cart, setCart] = useState<CartItem[]>([]);
  const [manualAdjustCents, setManualAdjustCents] = useState<number>(0);
  const [note, setNote] = useState("");

  // Mensagens
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [err,   setErr] = useState<string | null>(null);

  // Modal de pagamento
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [busyStripe, setBusyStripe] = useState(false);
  const [busyManual, setBusyManual] = useState<"paid" | "pending" | null>(null);

  // Carrega clientes + descontos
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id, full_name, email, auth_user_id, discount, school_year")
          .order("full_name", { ascending: true })
          .limit(1000);
        if (pErr) throw pErr;
        setClients((profs ?? []) as ProfileRow[]);

        // tabela correta: "discount" (singular)
        const { data: dsc, error: dErr } = await supabase
          .from("discount")
          .select("code, name, value")
          .order("name", { ascending: true })
          .limit(1000);
        if (dErr) throw dErr;
        const map: Record<string, DiscountRow> = {};
        (dsc ?? []).forEach((d) => { map[d.code] = d as DiscountRow; });
        setDiscounts(map);
      } catch (e: any) {
        setErr(e?.message ?? "Falha a carregar clientes/descontos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Cliente selecionado e desconto do perfil
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const profileDiscountPercent = useMemo(() => {
    if (!selectedClient?.discount) return 0;
    const row = discounts[selectedClient.discount];
    return row?.value ?? 0;
  }, [selectedClient, discounts]);

  const invoiceDiscountPercent = useMemo(() => {
    if (!invoiceDiscountCode || invoiceDiscountCode === NO_DISC) return 0;
    return discounts[invoiceDiscountCode]?.value ?? 0;
  }, [invoiceDiscountCode, discounts]);

  const effectiveDiscountPercent = profileDiscountPercent > 0
    ? profileDiscountPercent
    : invoiceDiscountPercent;

  // Filtro clientes no combobox
  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      (c.full_name ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      c.id.includes(q)
    );
  }, [clients, clientSearch]);

  // Filtro serviços
  const filteredCatalog = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG.filter((s) =>
      s.name.toLowerCase().includes(q) || s.sku.toLowerCase().includes(q)
    );
  }, [serviceSearch]);

  // Totais
  const subtotalCents = useMemo(
    () => cart.reduce((acc, it) => acc + it.price_cents * it.qty, 0),
    [cart]
  );

  const hoursItemsTotalCents = useMemo(
    () => cart.filter((i) => i.kind === "hours").reduce((acc, it) => acc + it.price_cents * it.qty, 0),
    [cart]
  );

  const discountCents = useMemo(() => {
    if (effectiveDiscountPercent <= 0) return 0;
    // desconto aplica-se apenas aos itens “hours”
    return Math.round((hoursItemsTotalCents * effectiveDiscountPercent) / 100);
  }, [hoursItemsTotalCents, effectiveDiscountPercent]);

  const finalTotalCents = useMemo(
    () => Math.max(0, subtotalCents - discountCents + manualAdjustCents),
    [subtotalCents, discountCents, manualAdjustCents]
  );

  const totalHoras = useMemo(
    () => cart.reduce((acc, it) => acc + (it.kind === "hours" ? (it.horas_per_unit ?? 0) * it.qty : 0), 0),
    [cart]
  );

  // Sugestão automática de modalidade com base no carrinho (sem sobrepor o utilizador)
  useEffect(() => {
    if (modalidadeLocked) return;
    const hasGroup = cart.some((i) => /grupo/i.test(i.name));
    if (hasGroup) setModalidade("grupo");
    // não força "individual" para não chatear se o user já mudou
  }, [cart, modalidadeLocked]);

  // Ações carrinho
  const addToCart = (c: CatalogItem) => {
    setCart((old) => {
      const idx = old.findIndex((i) => i.sku === c.sku);
      if (idx >= 0) {
        const next = [...old];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [
        ...old,
        {
          sku: c.sku,
          name: c.name,
          qty: 1,
          price_cents: c.default_price_cents,
          kind: c.kind,
          horas_per_unit: c.horas_per_unit,
        },
      ];
    });
  };

  const incQty = (sku: string) =>
    setCart((old) => old.map((i) => (i.sku === sku ? { ...i, qty: i.qty + 1 } : i)));
  const decQty = (sku: string) =>
    setCart((old) =>
      old
        .map((i) => (i.sku === sku ? { ...i, qty: Math.max(1, i.qty - 1) } : i))
        .filter((i) => i.qty > 0)
    );
  const removeItem = (sku: string) =>
    setCart((old) => old.filter((i) => i.sku !== sku));
  const setUnitPrice = (sku: string, euroStr: string) => {
    const v = Number((euroStr || "0").replace(",", "."));
    if (!Number.isFinite(v)) return;
    setCart((old) => old.map((i) => (i.sku === sku ? { ...i, price_cents: Math.round(v * 100) } : i)));
  };

  /* ============================
     Criar order + modal pagamento
  ============================ */

  const createOrderThenAskPayment = async () => {
    try {
      setSaving(true);
      setSaveMsg(null);
      setErr(null);

      if (!selectedClient || selectedClientId === NO_CLIENT) throw new Error("Seleciona um cliente.");
      if (cart.length === 0) throw new Error("O carrinho está vazio.");

      const userId = selectedClient.auth_user_id;
      if (!userId) throw new Error("Perfil sem utilizador associado (auth_user_id).");

      // Requisitos NOT NULL
      const nivel: Nivel = mapSchoolYearToNivel(selectedClient.school_year);
      const modalidadeToSave: Modalidade = modalidade || "individual";

      const payload: any = {
        user_id: userId,
        status: "pending",
        horas: Number(totalHoras.toFixed(2)),
        amount_cents: finalTotalCents,
        nivel,
        modalidade: modalidadeToSave,            // <-- agora enviado
        created_at: new Date().toISOString(),
        // opcionais (ativar se tiveres no schema):
        // items_json: cart,
        // discount_applied: effectiveDiscountPercent,
        // invoice_discount_code: profileDiscountPercent > 0 ? null : (invoiceDiscountCode === NO_DISC ? null : invoiceDiscountCode),
        // note,
      };

      const { data, error } = await supabase.from("orders").insert(payload).select("id").single();
      if (error) throw error;

      setCreatedOrderId(data.id);
      setPayModalOpen(true);
    } catch (e: any) {
      setErr(e?.message ?? "Não foi possível criar o pedido.");
    } finally {
      setSaving(false);
    }
  };

  const handleStripePayment = async () => {
    if (!createdOrderId || !selectedClient) return;
    try {
      setBusyStripe(true);
      const { data, error } = await supabase.functions.invoke("pos-create-payment-link", {
        method: "POST",
        body: {
          order_id: createdOrderId,
          profile_id: selectedClient.id,
        },
      });
      if (error) throw error;
      setSaveMsg("Link de pagamento criado e enviado por e-mail ao cliente.");
      setPayModalOpen(false);
      // limpa carrinho e campos
      setCart([]);
      setManualAdjustCents(0);
      setInvoiceDiscountCode(NO_DISC);
      setNote("");
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao criar/enviar link de pagamento.");
    } finally {
      setBusyStripe(false);
    }
  };

  const handleManualPayment = async (mark: "paid" | "pending") => {
    if (!createdOrderId) return;
    try {
      setBusyManual(mark);
      const { error } = await supabase
        .from("orders")
        .update({ status: mark, updated_at: new Date().toISOString() })
        .eq("id", createdOrderId);
      if (error) throw error;

      setSaveMsg(mark === "paid" ? "Pedido marcado como pago." : "Pedido criado como pendente.");
      setPayModalOpen(false);
      setCart([]);
      setManualAdjustCents(0);
      setInvoiceDiscountCode(NO_DISC);
      setNote("");
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao atualizar o estado do pedido.");
    } finally {
      setBusyManual(null);
    }
  };

  const canonical = () => `${window.location.origin}/professor/pos`;

  /* ============================
     Render
  ============================ */

  return (
    <div className="p-6">
      <Helmet>
        <title>POS — Árvore do Conhecimento</title>
        <meta name="description" content="Ponto de venda: seleção de serviços, resumo e criação de pedidos." />
        <link rel="canonical" href={canonical()} />
      </Helmet>

      <div className="mb-4 flex items-center justify-between">
        <Button asChild variant="ghost">
          <Link to="/professor">
            <ArrowLeftCircle className="h-4 w-4 mr-2" /> Voltar
          </Link>
        </Button>
        <div className="text-sm text-muted-foreground">POS para criar pedidos</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ESQUERDA (2/3): Cliente + Serviços + Carrinho */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cliente (Combobox com pesquisa) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Cliente
              </CardTitle>
              <CardDescription>Escolhe o aluno/encarregado</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-3">
                <Popover open={clientOpen} onOpenChange={setClientOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={clientOpen} className="w-full justify-between">
                      {selectedClient && selectedClientId !== NO_CLIENT
                        ? (selectedClient.full_name || selectedClient.email || selectedClient.id.slice(0,8))
                        : "Seleciona cliente"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command>
                      <CommandInput placeholder="Pesquisar por nome, email, id…" value={clientSearch} onValueChange={setClientSearch} />
                      <CommandList>
                        <CommandEmpty>Sem resultados.</CommandEmpty>

                        <CommandGroup heading="Ações">
                          <CommandItem
                            onSelect={() => {
                              setClientOpen(false);
                              navigate("/professor/alunos/");
                            }}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Criar novo aluno
                          </CommandItem>
                        </CommandGroup>

                        <CommandGroup heading="Alunos">
                          {filteredClients.map((c) => (
                            <CommandItem
                              key={c.id}
                              onSelect={() => {
                                setSelectedClientId(c.id);
                                setClientOpen(false);
                              }}
                            >
                              {c.full_name || c.email || c.id}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {selectedClient && selectedClientId !== NO_CLIENT && (
                <div className="md:col-span-3 space-y-2">
                  {profileDiscountPercent > 0 ? (
                    <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Estás coberto pelo desconto <strong>{selectedClient.discount}</strong> ({profileDiscountPercent}%)
                      {discounts[selectedClient.discount!]?.name ? ` — ${discounts[selectedClient.discount!].name}` : ""}.
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Aplicar desconto (só nesta fatura):</span>
                      <div className="min-w-[220px]">
                        <select
                          className="border rounded px-3 py-2 text-sm w-full"
                          value={invoiceDiscountCode}
                          onChange={(e) => setInvoiceDiscountCode(e.target.value)}
                        >
                          <option value={NO_DISC}>Sem desconto</option>
                          {Object.values(discounts).map((d) => (
                            <option key={d.code} value={d.code}>
                              {d.name} ({d.value}%)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Serviços + pesquisa */}
          <Card>
            <CardHeader>
              <CardTitle>Serviços</CardTitle>
              <CardDescription>Procura por nome ou código</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar serviço (ex.: 90min, pacote, H60-1)…"
                  className="pl-8"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCatalog.map((s) => (
                  <div
                    key={s.sku}
                    className="border rounded-xl p-4 shadow-sm hover:shadow transition flex flex-col"
                  >
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">{s.sku}</div>
                      <div className="text-base font-semibold">{s.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">{centsToEuro(s.default_price_cents)}</div>
                      {s.badge && (
                        <div className="mt-2 inline-flex text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                          {s.badge}
                        </div>
                      )}
                    </div>
                    <Button className="mt-3" variant="hero" onClick={() => addToCart(s)}>
                      <ShoppingCart className="h-4 w-4 mr-2" /> Adicionar
                    </Button>
                  </div>
                ))}
                {filteredCatalog.length === 0 && (
                  <div className="text-sm text-muted-foreground">Nenhum serviço encontrado.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Carrinho */}
          <Card>
            <CardHeader>
              <CardTitle>Carrinho</CardTitle>
              <CardDescription>Quantidades e preços podem ser ajustados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <div className="text-sm text-muted-foreground">Sem itens no carrinho.</div>
              ) : (
                cart.map((it) => (
                  <div key={it.sku} className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {it.kind === "hours" ? `${it.horas_per_unit}h por unidade` : "Serviço"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => decQty(it.sku)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="w-10 text-center">{it.qty}</div>
                      <Button variant="outline" size="icon" onClick={() => incQty(it.sku)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      <Input
                        className="w-28"
                        type="number"
                        step="0.01"
                        value={(it.price_cents / 100).toFixed(2)}
                        onChange={(e) => setUnitPrice(it.sku, e.target.value)}
                      />
                    </div>

                    <div className="w-24 text-right font-semibold">
                      {centsToEuro(it.price_cents * it.qty)}
                    </div>

                    <div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(it.sku)} title="Remover">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* DIREITA (1/3): Resumo */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
              <CardDescription>Revê e finaliza o pedido</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Modalidade requerida */}
              <div className="flex items-center justify-between">
                <span className="text-sm">Modalidade</span>
                <div className="min-w-[160px]">
                  <select
                    className="border rounded px-3 py-2 text-sm w-full"
                    value={modalidade}
                    onChange={(e) => {
                      setModalidade(e.target.value as Modalidade);
                      setModalidadeLocked(true);
                    }}
                  >
                    <option value="individual">Individual</option>
                    <option value="grupo">Grupo</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>Subtotal</span>
                <strong>{centsToEuro(subtotalCents)}</strong>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Percent className="h-4 w-4" />
                  Desconto {effectiveDiscountPercent > 0 ? `(${effectiveDiscountPercent}%)` : ""}
                </span>
                <strong>- {centsToEuro(discountCents)}</strong>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>Ajuste manual</span>
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <Input
                    className="w-28"
                    type="number"
                    step="0.01"
                    value={(manualAdjustCents / 100).toFixed(2)}
                    onChange={(e) => {
                      const v = Number((e.target.value || "0").replace(",", "."));
                      if (!Number.isFinite(v)) return;
                      setManualAdjustCents(Math.round(v * 100));
                    }}
                  />
                </div>
              </div>

              <div className="border-t pt-2 flex items-center justify-between">
                <span className="text-base">Total</span>
                <div className="text-xl font-extrabold">{centsToEuro(finalTotalCents)}</div>
              </div>

              <div className="text-xs text-muted-foreground">
                Horas (somente itens “aulas”): <strong>{totalHoras.toFixed(2)}h</strong>
              </div>

              <div className="pt-2">
                <label className="text-xs text-muted-foreground">Observações (internas)</label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Notas sobre este pedido (opcional)"
                />
              </div>

              {err && <div className="text-sm text-destructive">{err}</div>}
              {saveMsg && (
                <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> {saveMsg}
                </div>
              )}

              <Button
                className="w-full"
                onClick={createOrderThenAskPayment}
                disabled={saving || selectedClientId === NO_CLIENT || cart.length === 0}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {saving ? "A criar pedido…" : "Criar pedido"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dicas</CardTitle>
              <CardDescription>Regras do total</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <div>• O desconto aplica-se apenas a itens do tipo <em>“aulas”</em>.</div>
              <div>• Podes ajustar preços por linha, quantidades e aplicar um ajuste manual ao total.</div>
              <div>• O botão “Criar pedido” pergunta o método de pagamento (Stripe/Manual).</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal pagamento */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl shadow-2xl border-0">
          <DialogHeader>
            <DialogTitle className="text-xl">Selecionar método de pagamento</DialogTitle>
          </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stripe */}
          <div className="border rounded-xl p-4">
            <div className="flex items-center gap-2 font-semibold">
              <CardIcon className="h-5 w-5 text-primary" />
              Stripe (link por e-mail)
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cria um link de pagamento e envia para o e-mail do cliente.
            </p>
            <Button className="mt-3 w-full" onClick={handleStripePayment} disabled={busyStripe}>
              {busyStripe ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {busyStripe ? "A criar link…" : "Criar link e enviar"}
            </Button>
          </div>

          {/* Manual */}
          <div className="border rounded-xl p-4">
            <div className="flex items-center gap-2 font-semibold">
              <HandCoins className="h-5 w-5 text-primary" />
              Pagamento manual
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Regista o estado do pagamento (pago/pendente).
            </p>
            <div className="flex gap-2 mt-3">
              <Button variant="secondary" className="flex-1" onClick={() => handleManualPayment("paid")} disabled={busyManual !== null}>
                {busyManual === "paid" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Marcar como pago
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => handleManualPayment("pending")} disabled={busyManual !== null}>
                {busyManual === "pending" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Deixar pendente
              </Button>
            </div>
          </div>
        </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
