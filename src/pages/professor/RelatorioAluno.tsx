import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabaseClient";
import type { Tables } from "@/lib/database.types";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, Phone, MapPin, User, CreditCard, Save, Undo2 } from "lucide-react";
// se tiveres um Switch do shadcn/ui:
import { Switch } from "@/components/ui/switch";
// se tiveres Textarea do shadcn:
import { Textarea } from "@/components/ui/textarea";

type DbUser = Tables<"users">;

// Lista local de nacionalidades (emoji bandeira + label + código)
// Podes trocar por uma chamada à tua API quando quiseres.
const NATIONALITIES = [
  { code: "PT", label: "🇵🇹 Portugal" },
  { code: "BR", label: "🇧🇷 Brasil" },
  { code: "ES", label: "🇪🇸 Espanha" },
  { code: "FR", label: "🇫🇷 França" },
  { code: "GB", label: "🇬🇧 Reino Unido" },
  { code: "US", label: "🇺🇸 Estados Unidos" },
  { code: "AO", label: "🇦🇴 Angola" },
  { code: "MZ", label: "🇲🇿 Moçambique" },
  { code: "CV", label: "🇨🇻 Cabo Verde" },
  { code: "IT", label: "🇮🇹 Itália" },
];

export default function AlunoRelatorio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canonical = useMemo(() => `${window.location.origin}/professor/alunos/${id ?? ""}`, [id]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [aluno, setAluno] = useState<DbUser | null>(null);
  const [irmaos, setIrmaos] = useState<DbUser[]>([]);
  const [levels, setLevels] = useState<Array<{ id: number; name: string }>>([]);

  // draft editável do aluno
  const [draft, setDraft] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // loader minimal (sem fundo)
  const Spinner = () => (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="relative h-24 w-24">
        <div
          className="absolute inset-0 rounded-full animate-[spin_1.1s_linear_infinite]"
          style={{
            backgroundImage: "var(--gradient-hero)",
            WebkitMask: "radial-gradient(farthest-side, transparent 58%, #000 60%)",
            mask: "radial-gradient(farthest-side, transparent 58%, #000 60%)",
            filter: "drop-shadow(0 10px 30px rgba(0,0,0,.25))",
          }}
        />
        <div
          className="absolute inset-3 rounded-full animate-[spin_1.3s_linear_infinite_reverse] opacity-70"
          style={{
            backgroundImage: "var(--gradient-hero)",
            WebkitMask: "radial-gradient(farthest-side, transparent 72%, #000 74%)",
            mask: "radial-gradient(farthest-side, transparent 72%, #000 74%)",
          }}
        />
        <div className="absolute inset-0 animate-[spin_2.2s_linear_infinite]">
          <span
            className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-md"
            style={{ transform: "translate(-50%, -50%) translateY(-40px)" }}
          />
        </div>
      </div>
    </div>
  );

  // carregar aluno + irmãos + níveis (se existir tabela levels)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) {
        setErr("Aluno inválido.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr(null);

      // aluno
      const { data: a, error: e1 } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!alive) return;

      if (e1 || !a) {
        setErr(e1?.message || "Aluno não encontrado.");
        setAluno(null);
        setIrmaos([]);
        setLoading(false);
        return;
      }

      setAluno(a as DbUser);
      setDraft({
        full_name: a.full_name ?? "",
        username: a.username ?? "",
        year: a.year ?? null,
        gender: a.gender ?? null,
        date_of_birth: (a as any).date_of_birth ?? "",
        nationality: (a as any).nationality ?? "",
        institution: (a as any).institution ?? "",
        level_id: (a as any).level_id ?? null,
        special_needs: (a as any).special_needs ?? "",
        notes: (a as any).notes ?? "",
        phone: a.phone ?? "",
        tax_number: a.tax_number ?? "",
        address: a.address ?? "",
        postal_code: a.postal_code ?? "",
        city: a.city ?? "",
        saldo: (a as any).saldo ?? null,
        horas: (a as any).horas ?? null,
        privacy_share_email: (a as any).privacy_share_email ?? false,
        privacy_share_phone: (a as any).privacy_share_phone ?? false,
        privacy_newsletter: (a as any).privacy_newsletter ?? !!a.privacy_newsletter,
        privacy_statistics: (a as any).privacy_statistics ?? false,
        allow_pospago: (a as any).allow_pospago ?? false,
        wants_receipt: (a as any).wants_receipt ?? false,
      });

      // irmãos
      if (a.email) {
        const { data: siblings } = await supabase
          .from("users")
          .select("*")
          .eq("email", a.email)
          .neq("id", a.id)
          .order("full_name", { ascending: true });
        if (alive && siblings) setIrmaos(siblings as DbUser[]);
      } else {
        setIrmaos([]);
      }

      // níveis (opcional)
      try {
        const { data: lv } = await supabase.from("levels").select("id, name").order("id");
        if (alive && lv) setLevels(lv as any);
      } catch {
        // se não houver tabela levels, ignora
      }

      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  const setF = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }));

  const handleReset = () => {
    if (!aluno) return;
    setDraft({
      full_name: aluno.full_name ?? "",
      username: aluno.username ?? "",
      year: aluno.year ?? null,
      gender: aluno.gender ?? null,
      date_of_birth: (aluno as any).date_of_birth ?? "",
      nationality: (aluno as any).nationality ?? "",
      institution: (aluno as any).institution ?? "",
      level_id: (aluno as any).level_id ?? null,
      special_needs: (aluno as any).special_needs ?? "",
      notes: (aluno as any).notes ?? "",
      phone: aluno.phone ?? "",
      tax_number: aluno.tax_number ?? "",
      address: aluno.address ?? "",
      postal_code: aluno.postal_code ?? "",
      city: aluno.city ?? "",
      saldo: (aluno as any).saldo ?? null,
      horas: (aluno as any).horas ?? null,
      privacy_share_email: (aluno as any).privacy_share_email ?? false,
      privacy_share_phone: (aluno as any).privacy_share_phone ?? false,
      privacy_newsletter: (aluno as any).privacy_newsletter ?? !!aluno.privacy_newsletter,
      privacy_statistics: (aluno as any).privacy_statistics ?? false,
      allow_pospago: (aluno as any).allow_pospago ?? false,
      wants_receipt: (aluno as any).wants_receipt ?? false,
    });
    setSaveMsg(null);
  };

  const handleSave = async () => {
    if (!aluno) return;
    setSaving(true);
    setSaveMsg(null);
    setErr(null);
    try {
      // validações mínimas
      if (!draft.username || String(draft.username).trim().length === 0)
        throw new Error("O username é obrigatório.");
      // impedir duplicar username (outro aluno)
      if (draft.username !== aluno.username) {
        const { data: exists } = await supabase
          .from("users")
          .select("id")
          .eq("username", draft.username)
          .neq("id", aluno.id)
          .limit(1);
        if (exists && exists.length) throw new Error("Esse username já existe.");
      }

      const payload: any = {
        full_name: draft.full_name || null,
        username: draft.username,
        year: draft.year ?? null,
        gender: draft.gender ?? null,
        date_of_birth: draft.date_of_birth || null,
        nationality: draft.nationality || null,
        institution: draft.institution || null,
        level_id: draft.level_id ?? null,
        special_needs: draft.special_needs || null,
        notes: draft.notes || null,
        phone: draft.phone || null,
        tax_number: draft.tax_number || null,
        address: draft.address || null,
        postal_code: draft.postal_code || null,
        city: draft.city || null,
        saldo: draft.saldo !== "" ? Number(draft.saldo) : null,
        horas: draft.horas !== "" ? Number(draft.horas) : null,
        privacy_share_email: !!draft.privacy_share_email,
        privacy_share_phone: !!draft.privacy_share_phone,
        privacy_newsletter: !!draft.privacy_newsletter,
        privacy_statistics: !!draft.privacy_statistics,
        allow_pospago: !!draft.allow_pospago,
        wants_receipt: !!draft.wants_receipt,
        updated_at: new Date().toISOString(),
      };

      const { error: upErr } = await supabase.from("users").update(payload).eq("id", aluno.id);
      if (upErr) {
        // mensagem mais clara quando a coluna não existe
        const msg = upErr.message?.toLowerCase() || "";
        if (msg.includes("column") && msg.includes("does not exist")) {
          throw new Error(
            "Algum dos campos ainda não existe na tabela 'users'. Cria a migração/ALTER TABLE para os novos campos e tenta novamente."
          );
        }
        throw upErr;
      }

      // refresh
      const { data: a2, error: e2 } = await supabase
        .from("users")
        .select("*")
        .eq("id", aluno.id)
        .maybeSingle();
      if (e2 || !a2) throw e2 || new Error("Falha ao recarregar aluno.");
      setAluno(a2 as DbUser);
      setSaveMsg("Dados guardados com sucesso.");
    } catch (e: any) {
      setErr(e?.message ?? "Não foi possível guardar os dados.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  if (err) {
    return (
      <div className="p-6 space-y-4">
        <Helmet>
          <title>Relatório do Aluno</title>
          <link rel="canonical" href={canonical} />
        </Helmet>
        <Button asChild variant="ghost">
          <Link to="/professor/alunos"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar aos alunos</Link>
        </Button>
        <Card>
          <CardContent className="p-6 text-red-600 text-sm">{err}</CardContent>
        </Card>
      </div>
    );
  }

  if (!aluno) return null;

  const encarregado = {
    email: aluno.email || "—",
    phone: aluno.phone || "—",
    tax_number: aluno.tax_number || "—",
    address: aluno.address || "—",
    postal_code: aluno.postal_code || "—",
    city: aluno.city || "—",
    wants_receipt: (aluno as any).wants_receipt,
  };

  return (
    <div className="p-6 space-y-6">
      <Helmet>
        <title>Relatório do Aluno — {aluno.full_name || aluno.username}</title>
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="flex items-center justify-between">
        <Button asChild variant="ghost">
          <Link to="/professor/alunos"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link>
        </Button>
        <div className="text-xs text-muted-foreground">
          Criado em: {new Date(aluno.created_at as any).toLocaleString("pt-PT")} • Atualizado:{" "}
          {new Date(aluno.updated_at as any).toLocaleString("pt-PT")}
        </div>
      </div>

      {/* Cabeçalho */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Relatório de {aluno.full_name || aluno.username}</CardTitle>
          <CardDescription>Resumo do aluno e dados do encarregado de educação</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              <span><b>Username:</b> {aluno.username}</span>
            </div>
            <div className="text-sm text-muted-foreground"><b>Nome:</b> {aluno.full_name || "—"}</div>
            <div className="text-sm text-muted-foreground"><b>Ano:</b> {aluno.year ? `${aluno.year}º` : "—"}</div>
            <div className="text-sm text-muted-foreground"><b>Género:</b> {aluno.gender || "—"}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Encarregado de Educação</div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{encarregado.email}</span>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{encarregado.phone}</span>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>
                {encarregado.address}{encarregado.address ? ", " : ""}{encarregado.postal_code}{encarregado.postal_code ? " " : ""}{encarregado.city}
              </span>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span><b>NIF:</b> {encarregado.tax_number}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editar Dados do Aluno */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Dados do Aluno</CardTitle>
          <CardDescription>Atualiza as informações do aluno e as preferências</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {saveMsg && <div className="text-sm text-green-600">{saveMsg}</div>}
          {err && <div className="text-sm text-red-600">{err}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Nome completo</label>
              <Input value={draft.full_name} onChange={(e) => setF("full_name", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Username *</label>
              <Input value={draft.username} onChange={(e) => setF("username", e.target.value)} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Ano</label>
              <Input
                type="number" min={1} max={13}
                value={draft.year ?? ""}
                onChange={(e) => setF("year", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Género</label>
              <Select value={draft.gender ?? ""} onValueChange={(v) => setF("gender", v || null)}>
                <SelectTrigger><SelectValue placeholder="Seleciona" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="other">Outro / Prefere não dizer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Data de Nascimento</label>
              <Input
                type="date"
                value={draft.date_of_birth ?? ""}
                onChange={(e) => setF("date_of_birth", e.target.value || null)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Nacionalidade</label>
              <Select
                value={draft.nationality ?? ""}
                onValueChange={(v) => setF("nationality", v || null)}
              >
                <SelectTrigger><SelectValue placeholder="Seleciona nacionalidade" /></SelectTrigger>
                <SelectContent>
                  {NATIONALITIES.map((n) => (
                    <SelectItem key={n.code} value={n.code}>{n.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Instituição de Ensino</label>
              <Input value={draft.institution ?? ""} onChange={(e) => setF("institution", e.target.value)} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Nível de Utilizador</label>
              {levels.length > 0 ? (
                <Select
                  value={draft.level_id ? String(draft.level_id) : ""}
                  onValueChange={(v) => setF("level_id", v ? Number(v) : null)}
                >
                  <SelectTrigger><SelectValue placeholder="Seleciona nível" /></SelectTrigger>
                  <SelectContent>
                    {levels.map((lv) => (
                      <SelectItem key={lv.id} value={String(lv.id)}>{lv.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="number"
                  placeholder="level_id"
                  value={draft.level_id ?? ""}
                  onChange={(e) => setF("level_id", e.target.value ? Number(e.target.value) : null)}
                />
              )}
            </div>

            <div className="md:col-span-3">
              <label className="text-xs text-muted-foreground">Necessidades Especiais</label>
              {Textarea ? (
                <Textarea
                  placeholder="Ex.: Dislexia, DDAH, etc."
                  value={draft.special_needs ?? ""}
                  onChange={(e) => setF("special_needs", e.target.value)}
                />
              ) : (
                <textarea
                  className="w-full rounded-md border border-input p-2"
                  placeholder="Ex.: Dislexia, DDAH, etc."
                  value={draft.special_needs ?? ""}
                  onChange={(e) => setF("special_needs", e.target.value)}
                />
              )}
            </div>

            <div className="md:col-span-3">
              <label className="text-xs text-muted-foreground">Notas / Outras Informações</label>
              {Textarea ? (
                <Textarea
                  placeholder="Notas internas, preferências, observações…"
                  value={draft.notes ?? ""}
                  onChange={(e) => setF("notes", e.target.value)}
                />
              ) : (
                <textarea
                  className="w-full rounded-md border border-input p-2"
                  placeholder="Notas internas, preferências, observações…"
                  value={draft.notes ?? ""}
                  onChange={(e) => setF("notes", e.target.value)}
                />
              )}
            </div>

            {/* Contacto / Faturação (replicados no aluno) */}
            <div>
              <label className="text-xs text-muted-foreground">Telefone</label>
              <Input value={draft.phone ?? ""} onChange={(e) => setF("phone", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">NIF</label>
              <Input value={draft.tax_number ?? ""} onChange={(e) => setF("tax_number", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Morada</label>
              <Input value={draft.address ?? ""} onChange={(e) => setF("address", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Código Postal</label>
              <Input value={draft.postal_code ?? ""} onChange={(e) => setF("postal_code", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cidade</label>
              <Input value={draft.city ?? ""} onChange={(e) => setF("city", e.target.value)} />
            </div>

            {/* Finanças simples */}
            <div>
              <label className="text-xs text-muted-foreground">Saldo (€)</label>
              <Input
                type="number" step="0.01"
                value={draft.saldo ?? ""}
                onChange={(e) => setF("saldo", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Horas</label>
              <Input
                type="number" step="0.5"
                value={draft.horas ?? ""}
                onChange={(e) => setF("horas", e.target.value)}
              />
            </div>

            {/* Switches de privacidade e faturação */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              <label className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">Partilhar email</span>
                <Switch checked={!!draft.privacy_share_email} onCheckedChange={(v) => setF("privacy_share_email", v)} />
              </label>
              <label className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">Partilhar telefone</span>
                <Switch checked={!!draft.privacy_share_phone} onCheckedChange={(v) => setF("privacy_share_phone", v)} />
              </label>
              <label className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">Newsletter</span>
                <Switch checked={!!draft.privacy_newsletter} onCheckedChange={(v) => setF("privacy_newsletter", v)} />
              </label>
              <label className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">Partilhar estatísticas</span>
                <Switch checked={!!draft.privacy_statistics} onCheckedChange={(v) => setF("privacy_statistics", v)} />
              </label>
              <label className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">Permitir pós-pago</span>
                <Switch checked={!!draft.allow_pospago} onCheckedChange={(v) => setF("allow_pospago", v)} />
              </label>
              <label className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">Pretende recibo/fatura</span>
                <Switch checked={!!draft.wants_receipt} onCheckedChange={(v) => setF("wants_receipt", v)} />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleReset}>
              <Undo2 className="h-4 w-4 mr-2" /> Repor
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "A guardar…" : "Guardar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Irmãos (mesmo encarregado/email) */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Outros educandos do mesmo encarregado</CardTitle>
          <CardDescription>Alunos associados ao mesmo email</CardDescription>
        </CardHeader>
        <CardContent>
          {irmaos.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem outros educandos associados.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead className="w-36">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {irmaos.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.full_name || "—"}</TableCell>
                    <TableCell className="font-mono">{s.username}</TableCell>
                    <TableCell>{s.year ? `${s.year}º` : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/professor/alunos/${s.id}`}>Abrir relatório</Link>
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/professor/alunos/${s.id}`)}
                        >
                          Ir para perfil
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <style>
        {`
          .glass-panel {
            background: rgba(255,255,255,0.9);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          }
        `}
      </style>
    </div>
  );
}
