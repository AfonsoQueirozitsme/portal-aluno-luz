// src/routes/CompletarPerfil.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/lib/database.types";
import { Loader2 } from "lucide-react"; // já usado noutros spinners

type DbUser = Tables<"users">;

type DraftStudent = {
  id?: string; // só em existentes
  username: string;
  full_name: string;
  year?: number | null;
  gender?: "male" | "female" | "other" | null;
};

export default function CompletarPerfil() {
  const navigate = useNavigate();
  const canonical = useMemo(() => `${window.location.origin}/completar-perfil`, []);

  // estado base
  const [loading, setLoading] = useState(true);
  const [savingPwd, setSavingPwd] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingStudents, setSavingStudents] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [okPwd, setOkPwd] = useState<string | null>(null);
  const [okInfo, setOkInfo] = useState<string | null>(null);
  const [okStudents, setOkStudents] = useState<string | null>(null);

  // sessão/auth user
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  // contas existentes
  const [existingStudents, setExistingStudents] = useState<DbUser[]>([]);

  // PASSWORD enc. educação
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  // CONTACTO/FATURAÇÃO enc. educação (guardar em user_metadata + replicar para alunos)
  const [phone, setPhone] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [wantsReceipt, setWantsReceipt] = useState<boolean>(true);

  // DRAFTS de novos alunos (mínimo 1)
  const [drafts, setDrafts] = useState<DraftStudent[]>([
    { username: "", full_name: "" },
  ]);

  // —— Edição inline de alunos existentes ——
type EditBag = {
  full_name?: string | null;
  year?: number | null;
  gender?: "male" | "female" | "other" | null;
};

const [editingId, setEditingId] = useState<string | null>(null);
const [editDraft, setEditDraft] = useState<EditBag>({});

const startEdit = (a: DbUser) => {
  setEditingId(a.id);
  setEditDraft({
    full_name: a.full_name ?? "",
    year: a.year ?? null,
    gender: (a.gender as any) ?? null,
  });
};

const cancelEdit = () => {
  setEditingId(null);
  setEditDraft({});
};

const setEditField = (key: keyof EditBag, value: any) => {
  setEditDraft(prev => ({ ...prev, [key]: value }));
};

const saveEdit = async (id: string) => {
  try {
    setSavingStudents(true);
    setError(null);
    setOkStudents(null);

    // só permitimos editar estes campos
    const payload: Partial<DbUser> = {
      full_name: (editDraft.full_name ?? "") || null,
      year: typeof editDraft.year === "number" ? editDraft.year : null,
      gender: (editDraft.gender as any) ?? null,
      updated_at: new Date().toISOString() as any,
    };

    // RLS: o utilizador deve ter permissão para atualizar linhas do seu email
    const { error: upErr } = await supabase
      .from("users")
      .update(payload)
      .eq("id", id);
    if (upErr) throw upErr;

    // refresh local
    const idx = existingStudents.findIndex(s => s.id === id);
    if (idx !== -1) {
      const next = [...existingStudents];
      next[idx] = { ...next[idx], ...payload };
      setExistingStudents(next as DbUser[]);
    }

    setOkStudents("Alterações guardadas.");
    cancelEdit();
  } catch (err: any) {
    setError(err?.message ?? "Não foi possível guardar as alterações.");
  } finally {
    setSavingStudents(false);
  }
};


  // ---------- bootstrap ----------
  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) sessão
        const { data: sess, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;

        const user = sess?.session?.user;
        if (!active) return;

        if (!user) {
          setLoading(false);
          navigate("/");
          return;
        }

        const email = user.email ?? null;
        setAuthEmail(email);

        // 2) prefill do user_metadata (encarregado)
        const meta = (user.user_metadata || {}) as Record<string, any>;
        if (meta.phone) setPhone(meta.phone);
        if (meta.tax_number) setTaxNumber(meta.tax_number);
        if (meta.address) setAddress(meta.address);
        if (meta.postal_code) setPostalCode(meta.postal_code);
        if (meta.city) setCity(meta.city);
        if (typeof meta.wants_receipt === "boolean") setWantsReceipt(meta.wants_receipt);

        // 3) carregar educandos do encarregado por EMAIL (chave comum)
        if (email) {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .order("updated_at", { ascending: false });

          if (!active) return;

          if (error) {
            setError(error.message);
            setExistingStudents([]);
          } else {
            const list = (data ?? []) as DbUser[];
            setExistingStudents(list);
            // mantém sempre pelo menos 1 draft para criar novo
            setDrafts([{ username: "", full_name: "" }]);
          }
        } else {
          setExistingStudents([]);
          setDrafts([{ username: "", full_name: "" }]);
        }
      } catch (e: any) {
        if (!active) return;
        setError(e?.message ?? "Falha a carregar sessão.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    // reage a logout noutra aba
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/");
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  // ---------- ações ----------
  // 1) Password (encarregado)
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPwd(true);
    setError(null);
    setOkPwd(null);
    try {
      if (!password || password.length < 6) throw new Error("A palavra-passe deve ter pelo menos 6 caracteres.");
      if (password !== password2) throw new Error("As palavras-passe não coincidem.");
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;
      setOkPwd("Palavra-passe atualizada com sucesso.");
      setPassword("");
      setPassword2("");
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível guardar a palavra-passe.");
    } finally {
      setSavingPwd(false);
    }
  };

  // 2) Contacto/Faturação (encarregado) → guarda em auth.user_metadata e replica para alunos existentes (por email)
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    setError(null);
    setOkInfo(null);

    try {
      if (!authEmail) throw new Error("Sessão inválida: email não disponível.");

      // 2.1 atualiza metadata do utilizador (encarregado)
      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          phone,
          tax_number: taxNumber,
          address,
          postal_code: postalCode,
          city,
          wants_receipt: wantsReceipt,
        },
      });
      if (metaErr) throw metaErr;

      // 2.2 replica para todos os alunos com o mesmo email
      if (existingStudents.length > 0) {
        const baseUpdate: Partial<DbUser> = {
          phone: phone || null,
          tax_number: taxNumber || null,
          address: address || null,
          postal_code: postalCode || null,
          city: city || null,
          // se não existir esta coluna no teu schema, remove a linha abaixo:
          wants_receipt: wantsReceipt as any,
          updated_at: new Date().toISOString() as any,
        };

        const { error: updErr } = await supabase
          .from("users")
          .update(baseUpdate)
          .eq("email", authEmail);

        if (updErr) throw updErr;
      }

      // refresh
      const { data, error: selErr } = await supabase
        .from("users")
        .select("*")
        .eq("email", authEmail);

      if (selErr) throw selErr;

      setExistingStudents((data ?? []) as DbUser[]);
      setOkInfo("Dados de contacto e faturação guardados.");
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível guardar os dados.");
    } finally {
      setSavingInfo(false);
    }
  };

  // 3) Adicionar/remover linhas de aluno
  const addDraft = () => setDrafts((d) => [...d, { username: "", full_name: "" }]);
  const removeDraft = (idx: number) =>
    setDrafts((d) => (d.length === 1 ? d : d.filter((_, i) => i !== idx)));
  const setDraftField = (idx: number, key: keyof DraftStudent, value: any) =>
    setDrafts((d) => d.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));

  // 4) Guardar alunos (insere novos; não mexe nos existentes aqui)
  const handleSaveStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStudents(true);
    setError(null);
    setOkStudents(null);
    try {
      if (!authEmail) throw new Error("Sessão inválida.");

      // valida mínimo 1 aluno (existentes + drafts válidos)
      const validDrafts = drafts
        .map(d => ({ ...d, username: d.username.trim(), full_name: d.full_name.trim() }))
        .filter(d => d.username && d.full_name);

      if (existingStudents.length + validDrafts.length < 1) {
        throw new Error("Tens de ter pelo menos 1 educando.");
      }

      // valida duplicados locais
      const localUsernames = new Set<string>();
      for (const d of validDrafts) {
        const key = d.username.toLowerCase();
        if (localUsernames.has(key)) {
          throw new Error(`Username duplicado nos novos: ${d.username}`);
        }
        localUsernames.add(key);
      }

      // valida duplicados na BD
      if (validDrafts.length > 0) {
        const usernames = validDrafts.map(d => d.username);
        const { data: taken, error: selErr } = await supabase
          .from("users")
          .select("username")
          .in("username", usernames);
        if (selErr) throw selErr;
        const takenSet = new Set<string>((taken ?? []).map(r => String(r.username).toLowerCase()));
        const dup = usernames.find(u => takenSet.has(u.toLowerCase()));
        if (dup) throw new Error(`O username "${dup}" já existe. Escolhe outro.`);
      }

      // inserir
      if (validDrafts.length > 0) {
        const payload: Partial<DbUser>[] = validDrafts.map((d) => ({
          username: d.username,
          full_name: d.full_name,
          year: d.year ?? null,
          gender: (d.gender as any) ?? null,
          email: authEmail.toLowerCase(), // liga ao encarregado por email
          phone: phone || null,
          tax_number: taxNumber || null,
          address: address || null,
          postal_code: postalCode || null,
          city: city || null,
          wants_receipt: wantsReceipt as any,
          privacy_newsletter: true,
        }));
        const { error: insErr } = await supabase.from("users").insert(payload);
        if (insErr) throw insErr;
      }

      // refresh
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("email", authEmail)
        .order("updated_at", { ascending: false });

      const updated = (data ?? []) as DbUser[];
      setExistingStudents(updated);
      setDrafts([{ username: "", full_name: "" }]);
      setOkStudents("Educando(s) guardado(s) com sucesso.");

      // escolhe 1º aluno como ativo por defeito e segue para o portal
      const pick = updated[0];
      if (pick) {
        localStorage.setItem("activeProfileId", pick.id);
        localStorage.setItem("activeUsername", pick.username);
        localStorage.setItem("activeFullName", pick.full_name ?? "");
      }
      navigate("/aluno");
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível guardar os educandos.");
    } finally {
      setSavingStudents(false);
    }
  };

  // ---------- UI ----------
  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #e3e9f7 50%, #f9fafb 100%)" }}
    >
      <Helmet>
        <title>Completar Perfil</title>
        <link rel="canonical" href={canonical} />
      </Helmet>

      {/* Voltar estilo login */}
      <button
        type="button"
        onClick={() => window.history.back()}
        className="absolute top-6 left-6 flex items-center gap-2 text-primary font-medium transition z-30 group"
        style={{ fontSize: 17, padding: "6px 12px", borderRadius: "8px", overflow: "hidden" }}
      >
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
          <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="transition-colors">Voltar</span>
        <style>
          {`
            .group { background: transparent; transition: background .35s cubic-bezier(.4,0,.2,1), color .25s; }
            .group:hover { background: linear-gradient(90deg, #6366f1 0%, #a5b4fc 100%); color: #fff; }
            .group:hover span { color: #fff; }
            .group:active { filter: brightness(0.97); }
          `}
        </style>
      </button>

<section className="w-full max-w-4xl p-6 sm:p-8 rounded-xl shadow-lg bg-card relative overflow-hidden mt-16">        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Completar Perfil</h1>
        <p className="text-base text-muted-foreground mb-6">
          Define a tua palavra-passe, os teus dados de faturação e adiciona os teus educandos.
        </p>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
        {loading ? (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* PASS */}
            <Card className="glass-panel">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-1">Palavra-passe do Encarregado</h2>
                <p className="text-sm text-muted-foreground mb-4">Esta será usada para entrar no portal.</p>
                {okPwd && <div className="mb-3 text-sm text-green-600">{okPwd}</div>}
                <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={handleSavePassword}>
                  <Input
                    type="password"
                    placeholder="Nova palavra-passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Input
                    type="password"
                    placeholder="Confirmar palavra-passe"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    required
                  />
                  <div className="sm:col-span-2 flex justify-end">
                    <Button type="submit" disabled={savingPwd}>
                      {savingPwd ? "A guardar…" : "Guardar palavra-passe"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* CONTACTO/FATURAÇÃO */}
            <Card className="glass-panel">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-1">Dados do Encarregado (Contacto & Faturação)</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Guardados no teu perfil e aplicados também às contas dos educandos.
                </p>
                {okInfo && <div className="mb-3 text-sm text-green-600">{okInfo}</div>}
                <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={handleSaveInfo}>
                  <Input placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <Input placeholder="NIF" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
                  <Input className="sm:col-span-2" placeholder="Morada" value={address} onChange={(e) => setAddress(e.target.value)} />
                  <Input placeholder="Código Postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                  <Input placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
                  <label className="sm:col-span-2 flex items-center gap-2 text-sm text-foreground mt-1">
                    <input type="checkbox" className="h-4 w-4" checked={wantsReceipt} onChange={(e) => setWantsReceipt(e.target.checked)} />
                    <span>Pretendo receber recibo/fatura</span>
                  </label>
                  <div className="sm:col-span-2 flex justify-end pt-1">
                    <Button type="submit" disabled={savingInfo}>
                      {savingInfo ? "A guardar…" : "Guardar dados"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* EDUCANDOS */}
            <Card className="glass-panel">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-1">Educandos</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Cria as contas de aluno (mínimo 1). O email usado será o teu ({authEmail || "—"}).
                </p>

                {/* Lista de EXISTENTES (só ver) */}
{existingStudents.length > 0 && (
  <div className="mb-4">
    <div className="text-sm font-medium mb-2">Já existentes</div>
    <ul className="space-y-2">
      {existingStudents.map((a) => {
        const isEditing = editingId === a.id;
        return (
          <li
            key={a.id}
            className="flex flex-col gap-2 border rounded-md p-3"
          >
            {!isEditing ? (
              // ——— Modo leitura ———
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-sm">
                  <div className="font-medium">{a.full_name || a.username}</div>
                  <div className="text-muted-foreground">
                    Username: <span className="font-mono">{a.username}</span>
                    {a.year ? ` • ${a.year}º ano` : ""}
                    {a.gender ? ` • ${a.gender === "male" ? "M" : a.gender === "female" ? "F" : "Outro"}` : ""}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{a.email}</div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => startEdit(a)}>
                    Editar
                  </Button>
                </div>
              </div>
            ) : (
              // ——— Modo edição ———
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Nome completo"
                    value={editDraft.full_name ?? ""}
                    onChange={(e) => setEditField("full_name", e.target.value)}
                  />
                </div>

                {/* Username fica bloqueado para não partir unicidade */}
                <div className="sm:col-span-2">
                  <Input value={a.username} disabled className="opacity-70" />
                  <div className="text-[11px] text-muted-foreground mt-1">
                    O username não pode ser alterado aqui.
                  </div>
                </div>

                <div>
                  <Input
                    type="number"
                    min={1}
                    max={13}
                    placeholder="Ano"
                    value={editDraft.year ?? ""}
                    onChange={(e) =>
                      setEditField("year", e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <Select
                    value={(editDraft.gender as any) ?? (a.gender as any) ?? ""}
                    onValueChange={(v) => setEditField("gender", (v || null) as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Género" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                      <SelectItem value="other">Outro / Prefere não dizer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 flex items-center gap-2">
                  <Button type="button" onClick={() => saveEdit(a.id)} disabled={savingStudents}>
                    {savingStudents ? "A guardar…" : "Guardar"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={cancelEdit} disabled={savingStudents}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  </div>
)}

                {/* DRAFTS NOVOS */}
                <form className="space-y-3" onSubmit={handleSaveStudents}>
                  {drafts.map((d, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-3 border rounded-md p-3">
                      <div className="sm:col-span-2">
                        <Input
                          placeholder="Nome completo *"
                          value={d.full_name}
                          onChange={(e) => setDraftField(idx, "full_name", e.target.value)}
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Input
                          placeholder="Username *"
                          value={d.username}
                          onChange={(e) => setDraftField(idx, "username", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          min={1}
                          max={13}
                          placeholder="Ano"
                          value={d.year ?? ""}
                          onChange={(e) =>
                            setDraftField(idx, "year", e.target.value ? Number(e.target.value) : null)
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Select
                          value={(d.gender as any) ?? ""}
                          onValueChange={(v) => setDraftField(idx, "gender", (v || null) as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Género (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Masculino</SelectItem>
                            <SelectItem value="female">Feminino</SelectItem>
                            <SelectItem value="other">Outro / Prefere não dizer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="sm:col-span-3 flex items-center gap-2">
                        <Button type="button" variant="outline" onClick={addDraft}>
                          + Adicionar educando
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeDraft(idx)}
                          disabled={drafts.length === 1}
                        >
                          Remover esta linha
                        </Button>
                      </div>
                    </div>
                  ))}

                  {okStudents && <div className="text-sm text-green-600">{okStudents}</div>}

                  <div className="flex justify-end">
                    <Button type="submit" disabled={savingStudents}>
                      {savingStudents ? "A guardar…" : "Guardar educandos e continuar"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => navigate("/aluno")}>Saltar e ir para o portal</Button>
            </div>
          </div>
        )}
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
      </section>
    </main>
  );
}
