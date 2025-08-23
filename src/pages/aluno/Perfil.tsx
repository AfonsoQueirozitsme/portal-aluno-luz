// file: src/pages/Aluno/Perfil.tsx
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Util: canonical seguro em SSR
const canonical = () =>
  (typeof window !== "undefined" ? window.location.origin : "") + "/aluno/perfil";

// Escolaridade (school_year)
const escolaridadeOpcoes = [
  "1º Ciclo",
  "2º Ciclo",
  "3º Ciclo",
  "Ensino Secundário",
  "Universidade",
  "Outro",
];

// Access level (profiles.level)
const accessLevels = [
  { value: "0", label: "Aluno" },
  { value: "1", label: "Professor" },
  { value: "2", label: "Admin" },
];

const generos = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
  { value: "nao-dizer", label: "Prefiro não dizer" },
];

const estadosCivis = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "Outro"];

const nacionalidades = [
  "Portuguesa",
  "Brasileira",
  "Angolana",
  "Moçambicana",
  "Cabo-verdiana",
  "Guineense",
  "São-tomense",
  "Outra",
];

const religioes = ["Católica", "Protestante", "Muçulmana", "Judaica", "Agnóstico", "Ateu", "Outra", "Prefiro não dizer"];

// ======= validações PT =======
const CP_REGEX = /^\d{4}-\d{3}$/;
const isValidCP = (v: string) => CP_REGEX.test(v.trim());
const isValidPhone = (p: string) => {
  const s = p.trim();
  return /^\+?[1-9]\d{7,14}$/.test(s) || /^9\d{8}$/.test(s) || /^2\d{8}$/.test(s);
};
const isValidNIF = (nif: string) => {
  const only = (nif || "").replace(/\D/g, "");
  if (!/^\d{9}$/.test(only)) return false;
  if (!/[1235689]/.test(only[0])) return false;
  const digits = only.split("").map(Number);
  const sum = digits.slice(0, 8).reduce((acc, d, i) => acc + d * (9 - i), 0);
  const mod = sum % 11;
  const check = mod < 2 ? 0 : 11 - mod;
  return digits[8] === check;
};

type FormState = {
  nome: string;
  username: string;
  email: string;
  telefone: string;
  dataNascimento: string;
  genero: string;
  estadoCivil: string;
  nacionalidade: string;
  nif: string;
  morada: string;
  codPostal: string;
  localidade: string;
  instituicao: string;
  curso: string;
  escolaridade: string; // -> school_year
  nivelAcesso: "0" | "1" | "2"; // -> level
  religiao: string;
  alergias: string;
  necessidadesEspeciais: string;
  encarregadoEducacao: string;
  contactoEncarregado: string;
  observacoes: string;
  privPartilharEmail: boolean;
  privNewsletter: boolean;
  privEstatisticas: boolean;
};

const Perfil = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    nome: "",
    username: "",
    email: "",
    telefone: "",
    dataNascimento: "",
    genero: "",
    estadoCivil: "",
    nacionalidade: "",
    nif: "",
    morada: "",
    codPostal: "",
    localidade: "",
    instituicao: "",
    curso: "",
    escolaridade: "",
    nivelAcesso: "0",
    religiao: "",
    alergias: "",
    necessidadesEspeciais: "",
    encarregadoEducacao: "",
    contactoEncarregado: "",
    observacoes: "",
    privPartilharEmail: false,
    privNewsletter: false,
    privEstatisticas: true,
  });

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const getActiveProfileId = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("active_profile_id");
  };

  // Carregar do Supabase (auth + perfil ativo por ID)
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // sessão
        const { data: sessionData, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;

        const authUserId = sessionData?.session?.user?.id;
        const authEmail = sessionData?.session?.user?.email || "";
        if (!authUserId) {
          setErr("Sessão inválida.");
          return;
        }

        // perfil ativo
        let profileId = getActiveProfileId();

        // fallback: primeiro perfil do utilizador
        if (!profileId) {
          const { data: first, error: fErr } = await supabase
            .from("profiles")
            .select("id")
            .eq("auth_user_id", authUserId)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (fErr) throw fErr;
          if (!first?.id) {
            setErr("Não encontrei nenhum perfil.");
            return;
          }
          profileId = first.id;
          localStorage.setItem("active_profile_id", profileId);
        }
        setActiveProfileId(profileId);

        // buscar 1 linha pelo ID
        const { data: prof, error: pErr } = await supabase
          .from("profiles")
          .select(`
            id, auth_user_id, full_name, username, email, phone, date_of_birth, gender,
            marital_status, nationality, tax_number, nif, address, postal_code, city,
            institution, course, school_year, level, religion, allergies, special_needs,
            guardian_name, guardian_contact, notes, privacy_share_email, privacy_newsletter,
            privacy_statistics, country
          `)
          .eq("id", profileId)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!prof) {
          setErr("Perfil não encontrado.");
          return;
        }
        if (prof.auth_user_id !== authUserId) {
          setErr("Esse perfil não pertence ao utilizador atual.");
          return;
        }

        // preencher form
        setForm((prev) => ({
          ...prev,
          nome: prof.full_name || "",
          username: prof.username || "",
          email: prof.email || authEmail,
          telefone: prof.phone || "",
          dataNascimento: prof.date_of_birth || "",
          genero: prof.gender || "",
          estadoCivil: prof.marital_status || "",
          nacionalidade: prof.nationality || "",
          nif: String(prof.tax_number || prof.nif || ""),
          morada: prof.address || "",
          codPostal: prof.postal_code || "",
          localidade: prof.city || "",
          instituicao: prof.institution || "",
          curso: prof.course || "",
          escolaridade: prof.school_year || "",
          nivelAcesso: String(prof.level ?? 0) as "0" | "1" | "2",
          religiao: prof.religion || "",
          alergias: prof.allergies || "",
          necessidadesEspeciais: prof.special_needs || "",
          encarregadoEducacao: prof.guardian_name || "",
          contactoEncarregado: prof.guardian_contact || "",
          observacoes: prof.notes || "",
          privPartilharEmail: Boolean(prof.privacy_share_email ?? false),
          privNewsletter: Boolean(prof.privacy_newsletter ?? false),
          privEstatisticas: Boolean(prof.privacy_statistics ?? true),
        }));
      } catch (e: any) {
        setErr(e?.message ?? "Falha a carregar o perfil.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const validar = (): string | null => {
    if (!form.nome.trim()) return "O nome é obrigatório.";
    if (!form.username.trim()) return "O nome de utilizador é obrigatório.";
    if (!form.email.trim()) return "O email é obrigatório.";
    if (form.telefone && !isValidPhone(form.telefone)) return "Telemóvel inválido.";
    if (form.nif && !isValidNIF(form.nif)) return "NIF inválido.";
    if (form.codPostal && !isValidCP(form.codPostal)) return "Código postal inválido (usa 1234-567).";
    if (!["0", "1", "2"].includes(form.nivelAcesso)) return "Nível de acesso inválido.";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    const v = validar();
    if (v) {
      setErr(v);
      return;
    }

    try {
      setSaving(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const authUserId = sessionData?.session?.user?.id;
      // const currentEmail = sessionData?.session?.user?.email || "";
      if (!authUserId) throw new Error("Sessão inválida.");
      if (!activeProfileId) throw new Error("Perfil ativo não definido.");

      // ⚠️ Em ambientes multi-perfil, normalmente não se altera o email do Auth aqui.
      // Se quiseres mesmo alterar o email de login neste ecrã, descomenta o bloco:
      // if (form.email && form.email !== currentEmail) {
      //   const { error: e1 } = await supabase.auth.updateUser({ email: form.email });
      //   if (e1) throw e1;
      // }

      const nifNumeric =
        form.nif && isValidNIF(form.nif) ? Number(form.nif.replace(/\D/g, "")) : null;

      const { error: e2 } = await supabase
        .from("profiles")
        .update({
          full_name: form.nome || null,
          username: form.username || null,
          email: form.email || null,
          phone: form.telefone || null,
          date_of_birth: form.dataNascimento || null,
          gender: form.genero || null,
          marital_status: form.estadoCivil || null,
          nationality: form.nacionalidade || null,
          tax_number: form.nif || null,
          nif: nifNumeric,
          address: form.morada || null,
          postal_code: form.codPostal || null,
          city: form.localidade || null,
          institution: form.instituicao || null,
          course: form.curso || null,
          school_year: form.escolaridade || null,
          level: Number(form.nivelAcesso),
          religion: form.religiao || null,
          allergies: form.alergias || null,
          special_needs: form.necessidadesEspeciais || null,
          guardian_name: form.encarregadoEducacao || null,
          guardian_contact: form.contactoEncarregado || null,
          notes: form.observacoes || null,
          privacy_share_email: form.privPartilharEmail,
          privacy_newsletter: form.privNewsletter,
          privacy_statistics: form.privEstatisticas,
          country: "Portugal",
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeProfileId)       // 👈 atualiza só o perfil ativo
        .eq("auth_user_id", authUserId); // 👈 double-check de segurança

      if (e2) throw e2;

      setMsg("Perfil guardado com sucesso.");
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao guardar o perfil.");
    } finally {
      setSaving(false);
    }
  };

  const emailHelp = useMemo(
    () => "Se alterares o email de login, confirma o endereço através do link que te vamos enviar.",
    []
  );

  return (
    <div>
      <Helmet>
        <title>Área do Aluno | Perfil - Árvore do Conhecimento</title>
        <meta name="description" content="Atualiza os teus dados pessoais e preferências." />
        <link rel="canonical" href={canonical()} />
      </Helmet>

      <div className="max-w-3xl mx-auto bg-card rounded-xl shadow-lg p-4 sm:p-6 md:p-8 animate-fade-in">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-primary">Dados Pessoais</h1>

          {/* Opcional: atalho para trocar de perfil */}
          {/* <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem("active_profile_id");
              window.location.reload();
            }}
          >
            Trocar de perfil
          </Button> */}
        </div>

        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={onSubmit}>
              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block mb-1 font-medium">Nome completo</label>
                  <Input value={form.nome} onChange={(e) => handleChange("nome", e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Nome de utilizador</label>
                  <Input value={form.username} onChange={(e) => handleChange("username", e.target.value)} />
                </div>

                <div>
                  <label className="block mb-1 font-medium">Email</label>
                  <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">{emailHelp}</p>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Telefone</label>
                  <Input
                    type="tel"
                    value={form.telefone}
                    onChange={(e) => handleChange("telefone", e.target.value)}
                    placeholder="+3519XXXXXXXX"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium">Data de nascimento</label>
                  <Input
                    type="date"
                    value={form.dataNascimento}
                    onChange={(e) => handleChange("dataNascimento", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Género</label>
                  <Select value={form.genero} onValueChange={(v) => handleChange("genero", v as any)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar género" /></SelectTrigger>
                    <SelectContent>
                      {generos.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block mb-1 font-medium">Estado civil</label>
                  <Select value={form.estadoCivil} onValueChange={(v) => handleChange("estadoCivil", v as any)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar estado civil" /></SelectTrigger>
                    <SelectContent>
                      {estadosCivis.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Nacionalidade</label>
                  <Select value={form.nacionalidade} onValueChange={(v) => handleChange("nacionalidade", v as any)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar nacionalidade" /></SelectTrigger>
                    <SelectContent>
                      {nacionalidades.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block mb-1 font-medium">NIF</label>
                  <Input value={form.nif} onChange={(e) => handleChange("nif", e.target.value)} placeholder="9 dígitos" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Morada</label>
                  <Input value={form.morada} onChange={(e) => handleChange("morada", e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Código Postal</label>
                  <Input
                    value={form.codPostal}
                    onChange={(e) => handleChange("codPostal", e.target.value)}
                    placeholder="1234-567"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Localidade</label>
                  <Input value={form.localidade} onChange={(e) => handleChange("localidade", e.target.value)} />
                </div>

                <div>
                  <label className="block mb-1 font-medium">Instituição de ensino</label>
                  <Input value={form.instituicao} onChange={(e) => handleChange("instituicao", e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Curso</label>
                  <Input value={form.curso} onChange={(e) => handleChange("curso", e.target.value)} />
                </div>

                {/* Escolaridade (school_year) */}
                <div>
                  <label className="block mb-1 font-medium">Nível de escolaridade</label>
                  <Select value={form.escolaridade} onValueChange={(v) => handleChange("escolaridade", v as any)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar nível" /></SelectTrigger>
                    <SelectContent>
                      {escolaridadeOpcoes.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Access level */}
                <div>
                  <label className="block mb-1 font-medium">Nível de acesso</label>
                  <Select
                    value={form.nivelAcesso}
                    onValueChange={(v) => handleChange("nivelAcesso", v as "0" | "1" | "2")}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecionar nível de acesso" /></SelectTrigger>
                    <SelectContent>
                      {accessLevels.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block mb-1 font-medium">Religião</label>
                  <Select value={form.religiao} onValueChange={(v) => handleChange("religiao", v as any)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar religião" /></SelectTrigger>
                    <SelectContent>
                      {religioes.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Alergias</label>
                  <Input value={form.alergias} onChange={(e) => handleChange("alergias", e.target.value)} />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Necessidades especiais</label>
                  <Input
                    value={form.necessidadesEspeciais}
                    onChange={(e) => handleChange("necessidadesEspeciais", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Encarregado de educação</label>
                  <Input
                    value={form.encarregadoEducacao}
                    onChange={(e) => handleChange("encarregadoEducacao", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Contacto do encarregado</label>
                  <Input
                    value={form.contactoEncarregado}
                    onChange={(e) => handleChange("contactoEncarregado", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-medium">Observações</label>
                <Textarea value={form.observacoes} onChange={(e) => handleChange("observacoes", e.target.value)} />
              </div>

              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4 text-primary">Privacidade e consentimentos</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={form.privPartilharEmail}
                      onCheckedChange={(v) => handleChange("privPartilharEmail", v)}
                      id="partilharEmail"
                    />
                    <label htmlFor="partilharEmail" className="text-sm">
                      Permitir partilha do meu email com professores
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={form.privNewsletter}
                      onCheckedChange={(v) => handleChange("privNewsletter", v)}
                      id="newsletter"
                    />
                    <label htmlFor="newsletter" className="text-sm">
                      Receber newsletter e comunicações
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={form.privEstatisticas}
                      onCheckedChange={(v) => handleChange("privEstatisticas", v)}
                      id="dadosEstatisticos"
                    />
                    <label htmlFor="dadosEstatisticos" className="text-sm">
                      Permitir uso dos meus dados para estatísticas anónimas
                    </label>
                  </div>
                </div>
              </div>

              {err && <div className="text-destructive text-sm">{err}</div>}
              {msg && <div className="text-green-600 text-sm">{msg}</div>}

              <div className="flex justify-end mt-6">
                <Button type="submit" variant="hero" disabled={saving}>
                  {saving ? "A guardar..." : "Guardar alterações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <style>{`
          .animate-fade-in { animation: fadeIn .7s cubic-bezier(.4,0,.2,1); }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(24px);} to { opacity: 1; transform: translateY(0);} }
        `}</style>
      </div>

      {(loading) && (
        <div className="fixed inset-0 z-50 grid place-items-center backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted-foreground/30 border-t-primary" />
        </div>
      )}
    </div>
  );
};

export default Perfil;
