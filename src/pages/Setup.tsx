// file: src/pages/Setup.tsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Lock,
  User,
  FileText,
  Users,
  ArrowLeft,
  ArrowRight,
  X,
  CheckCircle,
  XCircle,
  Phone,
  ShieldCheck,
  Pencil
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ------------------- Tipos -------------------
type Student = { name: string; year: string };

type CTTEntry = {
  morada: string;
  porta: string;
  localidade: string;
  freguesia: string;
  concelho: string;
  distrito: string;
  latitude: string;
  longitude: string;
  "codigo-postal": string;
  "info-local": string;
  "codigo-arteria": string;
  "concelho-codigo": number;
  "distrito-codigo": number;
};

const CP_REGEX = /^\d{4}-\d{3}$/;
const NIF_DIGITS = /^\d{9}$/;

// 👉 ajusta aqui se a tua Edge Function tiver nome diferente
const EDGE_FN_SMS = "luso-send-sms";

// username único/estável por aluno
const makeUsername = (studentName: string, userId: string) => {
  const base = (studentName || "aluno")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const short = userId.replace(/-/g, "").slice(0, 6);
  return `${base || "aluno"}_${short}`;
};

// validação simples E.164/PT (+351XXXXXXXXX) ou 9 dígitos nacionais
const isValidPhone = (p: string) => {
  const s = p.trim();
  return /^\+?[1-9]\d{7,14}$/.test(s) || /^9\d{8}$/.test(s) || /^2\d{8}$/.test(s);
};

// ------------------- Componente -------------------
export default function Setup() {
  const navigate = useNavigate();

  // wizard: 0=password, 1=billing, 2=stripe (opcional), 3=students
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // step 0 — password + telefone
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  const [phone, setPhone] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<number | null>(null);

  const [sentCode, setSentCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  // step 1 — faturação (sem email / sem IBAN)
  const [billingInfo, setBillingInfo] = useState({
    full_name: "",
    tax_number: "",
    address: "", // artéria / morada base
    address_name: "", // complemento opcional (Lote/Bloco)
    postal_code: "",
    city: "",
    country: "Portugal",
  });

  // step 2 — stripe (opcional)
  const [stripeSetup, setStripeSetup] = useState<"not_started" | "pending" | "done">("not_started");

  // NIF validation (informativo)
  const [nifChecking, setNifChecking] = useState(false);
  const [nifValid, setNifValid] = useState<boolean | null>(null);
  const [nifQuotaExceeded, setNifQuotaExceeded] = useState(false);

  // CP → artérias
  const [cpLoading, setCpLoading] = useState(false);
  const [streetOptions, setStreetOptions] = useState<string[]>([]);
  const [addressMode, setAddressMode] = useState<"dropdown" | "readonly" | "text">("text");

  // step 3 — alunos
  const [students, setStudents] = useState<Student[]>([]);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [studentForm, setStudentForm] = useState<Student>({ name: "", year: "" });

  const planLimit = 3;

  // ------------------- UI helpers / animações -------------------
  const stepVariants = {
    hidden: { opacity: 0, y: 15, filter: "blur(6px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -10, filter: "blur(4px)", transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } },
  } as const;

  // Barra de progresso animada
  const progress = ((step + 1) / 4) * 100;

  // password strength
  useEffect(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    setPasswordStrength(score);
  }, [password]);

  // sessão + pré-preenchimento
  useEffect(() => {
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) {
          navigate("/");
          return;
        }

        const { data: profiles, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, auth_user_id, full_name, username, email, phone, phone_verified, tax_number, address, postal_code, city, country, stripe_mandate_status, setup_complete"
          )
          .eq("auth_user_id", userId)
          .order("created_at", { ascending: true });

        if (profErr) throw profErr;

        const any = profiles?.[0];
        if (any?.phone) setPhone(String(any.phone));
        if (typeof any?.phone_verified === "boolean") setPhoneVerified(Boolean(any.phone_verified));

        const withBilling =
          profiles?.find(
            (p) => p.tax_number || p.address || p.postal_code || p.city || p.country
          ) || any;

        if (withBilling) {
          setBillingInfo((b) => ({
            ...b,
            full_name: withBilling.full_name || b.full_name,
            tax_number: withBilling.tax_number || b.tax_number,
            address: withBilling.address || b.address,
            address_name: "",
            postal_code: withBilling.postal_code || b.postal_code,
            city: withBilling.city || b.city,
            country: withBilling.country || b.country || "Portugal",
          }));
        }

        if (any?.stripe_mandate_status === "done" || any?.stripe_mandate_status === "pending") {
          setStripeSetup(any.stripe_mandate_status as "done" | "pending");
        } else {
          setStripeSetup("not_started");
        }

        if (profiles && profiles.length > 0) {
          const loadedStudents: Student[] = profiles
            .filter((p) => p.full_name)
            .map((p) => ({ name: p.full_name as string, year: "" }));
          if (loadedStudents.length > 0) setStudents(loadedStudents);
        }

        const billingOk =
          Boolean(
            (withBilling?.full_name || "").trim() &&
              (withBilling?.tax_number || "").trim() &&
              (withBilling?.address || "").trim() &&
              (withBilling?.postal_code || "").trim() &&
              (withBilling?.city || "").trim() &&
              (withBilling?.country || "").trim()
          ) && CP_REGEX.test(String(withBilling?.postal_code || ""));

        if (!Boolean(any?.phone_verified)) {
          setStep(0);
        } else if (!billingOk) {
          setStep(1);
        } else {
          setStep(2);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setBootLoading(false);
      }
    })();
  }, [navigate]);

  // limpa cooldown on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) window.clearInterval(cooldownRef.current);
    };
  }, []);

  // Validação NIF (debounce) — informativo
  useEffect(() => {
    const nif = billingInfo.tax_number.trim();
    setNifValid(null);
    setNifQuotaExceeded(false);
    if (!NIF_DIGITS.test(nif)) return;

    const t = setTimeout(async () => {
      try {
        setNifChecking(true);
        const key = import.meta.env.VITE_NIF_API_KEY as string | undefined;
        const base = `https://www.nif.pt/?json=1&q=${encodeURIComponent(nif)}`;
        const url = key ? `${base}&key=${encodeURIComponent(key)}` : base;

        const res = await fetch(url, { headers: { Accept: "application/json" } });

        if (res.status === 429) {
          setNifQuotaExceeded(true);
          setNifValid(null);
          return;
        }
        if (!res.ok) {
          setNifValid(false);
          return;
        }

        const json = await res.json();

        const credits = json?.credits;
        const limitHit =
          res.status === 429 ||
          (credits &&
            (("left" in credits &&
              ((typeof credits.left === "number" && credits.left <= 0) ||
                (Array.isArray(credits.left) && credits.left.length === 0))) ||
              (String(credits?.used || "").toLowerCase() === "free" &&
                Array.isArray(credits?.left) &&
                credits.left.length === 0)));

        if (limitHit) {
          setNifQuotaExceeded(true);
          setNifValid(null);
          return;
        }

        const resultOk = String(json?.result || "").toLowerCase() === "success";
        const validationFlag = json?.nif_validation === true || json?.is_nif === true;
        let recordMatch = false;
        if (json?.records && typeof json.records === "object") {
          recordMatch = Boolean(json.records[nif]) || Object.keys(json.records).length > 0;
        }

        setNifValid(resultOk && (validationFlag || recordMatch));
      } catch {
        setNifValid(false);
      } finally {
        setNifChecking(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [billingInfo.tax_number]);

  // Código Postal → API CTT (debounce)
  useEffect(() => {
    const cp = billingInfo.postal_code.trim();
    setStreetOptions([]);
    setAddressMode("text");

    if (!CP_REGEX.test(cp)) return;

    const t = setTimeout(async () => {
      try {
        setCpLoading(true);
        const API_KEY = import.meta.env.VITE_CTT_CP_API_KEY as string | undefined;
        if (!API_KEY) {
          setAddressMode("text");
          return;
        }

        const url = `https://www.cttcodigopostal.pt/api/v1/${encodeURIComponent(API_KEY)}/${encodeURIComponent(cp)}`;
        const res = await fetch(url);
        if (!res.ok) {
          setAddressMode("text");
          return;
        }

        const data: CTTEntry[] = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
          setAddressMode("text");
          return;
        }

        const first = data[0];
        setBillingInfo((b) => ({
          ...b,
          city: first.localidade || b.city,
          country: "Portugal",
        }));

        const uniqueStreets = Array.from(
          new Set(
            data
              .map((d) => (d.morada || "").trim())
              .filter((s) => s.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b, "pt"));

        setStreetOptions(uniqueStreets);

        if (uniqueStreets.length === 1) {
          setBillingInfo((b) => ({ ...b, address: uniqueStreets[0] }));
          setAddressMode("readonly");
        } else if (uniqueStreets.length > 1) {
          setBillingInfo((b) => ({ ...b, address: "" }));
          setAddressMode("dropdown");
        } else {
          setAddressMode("text");
        }
      } catch {
        setAddressMode("text");
      } finally {
        setCpLoading(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [billingInfo.postal_code]);

  const handlePrev = () => {
    setError(null);
    if (step > 0) setStep((s) => ((s - 1) as 0 | 1 | 2 | 3));
  };

  // ======== SMS / PHONE HELPERS ========
  const startCooldown = (seconds = 60) => {
    setResendCooldown(seconds);
    if (cooldownRef.current) window.clearInterval(cooldownRef.current);
    cooldownRef.current = window.setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          if (cooldownRef.current) window.clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const sendSmsCode = async () => {
    setError(null);
    const p = phone.trim();
    if (!isValidPhone(p)) {
      setError("Insere um número de telemóvel válido (ex.: 9XXXXXXXX ou +3519XXXXXXXX).");
      return;
    }
    try {
      setSmsSending(true);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);
      const text = `Código de verificação: ${code}. Expira em 10 minutos.`;
      const { error } = await supabase.functions.invoke(EDGE_FN_SMS, {
        method: "POST",
        body: { to: p, text },
      });
      if (error) {
        console.error(error);
        setError("Não foi possível enviar o SMS. Tenta novamente.");
        setSentCode(null);
        return;
      }
      startCooldown(60);
    } catch (e) {
      console.error(e);
      setError("Falha ao enviar SMS. Verifica a ligação e tenta novamente.");
      setSentCode(null);
    } finally {
      setSmsSending(false);
    }
  };

  const verifyCode = async () => {
    setError(null);
    if (!sentCode) {
      setError("Primeiro envia o código por SMS.");
      return;
    }
    if (codeInput.trim() !== sentCode) {
      setError("Código inválido. Confirma o código que recebeste por SMS.");
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("Sessão inválida.");

      const { error: upErr } = await supabase
        .from("profiles")
        .update({ phone, phone_verified: true })
        .eq("auth_user_id", userId);

      if (upErr) throw upErr;

      setPhoneVerified(true);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Não foi possível confirmar o telemóvel.");
    }
  };

  const handleNext = async () => {
    setError(null);

    // STEP 0 → validar telefone; password é OPCIONAL (mantém a atual se deixares vazio)
    if (step === 0) {
      const wantsChangePassword = password.length > 0 || confirmPassword.length > 0;

      if (wantsChangePassword) {
        if (password !== confirmPassword) {
          setError("As passwords não coincidem.");
          return;
        }
        if (passwordStrength < 3) {
          setError("Password demasiado fraca. Usa 8+ caracteres, maiúsculas, números e símbolos.");
          return;
        }
      }

      if (!phoneVerified) {
        setError("Verifica o teu número de telemóvel antes de continuar.");
        return;
      }

      try {
        setLoading(true);
        if (wantsChangePassword) {
          const { error: passErr } = await supabase.auth.updateUser({ password });
          if (passErr) throw passErr;
        }
        setStep(1);
      } catch (e: any) {
        setError(e?.message ?? "Erro ao atualizar a password.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // STEP 1 → validar faturação (NIF informativo, nunca bloqueia)
    if (step === 1) {
      const { full_name, tax_number, address, postal_code, city, country } = billingInfo;
      if (!full_name || !tax_number || !address || !postal_code || !city || !country) {
        setError("Preenche todos os campos obrigatórios.");
        return;
      }
      if (!CP_REGEX.test(postal_code)) {
        setError("Código postal inválido. Usa o formato 1234-567.");
        return;
      }
      setStep(2);
      return;
    }

    // STEP 2 → stripe é opcional; pode avançar sempre
    if (step === 2) {
      setStep(3);
      return;
    }

    // STEP 3 → valida alunos e grava perfis (um por aluno) em `profiles`
    if (step === 3) {
      if (students.length === 0) {
        setError("Adiciona pelo menos um aluno.");
        return;
      }
      if (students.length > planLimit) {
        setError("Excedeste o limite do plano.");
        return;
      }

      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) throw new Error("Sessão inválida.");

        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const guardianEmail = userResp.user?.email ?? "sem-email@exemplo.local";

        const { tax_number, address, address_name, postal_code, city, country } = billingInfo;
        const combinedAddress = [address, address_name].filter(Boolean).join(", ");

        const rows = students.map((s) => ({
          auth_user_id: userId,
          full_name: s.name,
          username: makeUsername(s.name, userId),
          email: guardianEmail,
          tax_number,
          address: combinedAddress,
          postal_code,
          city,
          country: country || "Portugal",
          stripe_mandate_status: stripeSetup,
          setup_complete: true,
        }));

        const { data: insertedProfiles, error: upsertErr } = await supabase
          .from("profiles")
          .upsert(rows, { onConflict: "username" })
          .select("id, username");

        if (upsertErr) throw upsertErr;

        if (insertedProfiles && insertedProfiles.length > 0) {
          localStorage.setItem("active_profile_id", insertedProfiles[0].id);
        }

        navigate("/aluno");
      } catch (err: any) {
        setError(err?.message ?? "Erro ao guardar dados.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Stripe helpers (opcional)
  const handleStripeSetup = async () => {
    try {
      setStripeSetup("pending");
      const { data, error } = await supabase.functions.invoke(
        "create-stripe-setup-session",
        { method: "POST", body: {} }
      );

      if (error) {
        console.error(error);
        setStripeSetup("not_started");
        setError("Não foi possível abrir a configuração Stripe.");
        return;
      }

      if (data?.url) {
        window.location.href = data.url; // redireciona para o Checkout (Setup Mode)
        return;
      }

      setStripeSetup("not_started");
      setError("Resposta inesperada da Stripe.");
    } catch (e) {
      console.error(e);
      setStripeSetup("not_started");
      setError("Erro ao iniciar configuração do débito direto.");
    }
  };

  // alunos
  const openAddStudent = () => {
    if (students.length >= planLimit) return;
    setEditingIndex(null);
    setStudentForm({ name: "", year: "" });
    setShowStudentModal(true);
  };
  const openEditStudent = (idx: number) => {
    setEditingIndex(idx);
    setStudentForm(students[idx]);
    setShowStudentModal(true);
  };
  const handleSaveStudent = () => {
    if (!studentForm.name || !studentForm.year) return;
    if (editingIndex === null) {
      setStudents((prev) => [...prev, { ...studentForm }]);
    } else {
      setStudents((prev) => prev.map((s, i) => (i === editingIndex ? { ...studentForm } : s)));
    }
    setShowStudentModal(false);
  };
  const handleRemoveStudent = (idx: number) => {
    setStudents((prev) => prev.filter((_, i) => i !== idx));
  };

  // UI helpers para NIF (apenas estilo)
  const nifClass =
    nifChecking && !nifQuotaExceeded
      ? "border-yellow-400"
      : nifValid === true
      ? "border-green-500"
      : nifValid === false
      ? "border-destructive"
      : "";

  // Progresso — 4 passos
  const steps = ["Password", "Faturação", "Pagamento", "Alunos"];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-4 overflow-hidden">
      {/* Fundo animado */}
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        transition={{ duration: 0.6 }}
        style={{
          background:
            "radial-gradient(1000px 600px at 20% -10%, rgba(99,102,241,.35), transparent 60%), radial-gradient(1000px 600px at 80% 110%, rgba(165,180,252,.35), transparent 60%), linear-gradient(120deg, #0b1020 0%, #0c1230 100%)",
          filter: "saturate(1.15) blur(0px)",
        }}
      />

      {/* Barra de progresso */}
      <div className="w-full max-w-3xl mb-6">
        <div className="flex items-center justify-between gap-2 mb-2">
          {steps.map((label, i) => (
            <div key={label} className={`flex-1 flex flex-col items-center ${step === i ? "text-primary" : "text-muted-foreground"}`}>
              <motion.div
                layout
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${step >= i ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}
              >
                {i + 1}
              </motion.div>
              <span className="text-xs mt-1">{label}</span>
            </div>
          ))}
        </div>
        <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
          <motion.div
            className="h-2 bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 16 }}
          />
        </div>
      </div>

      {/* Card principal */}
      <motion.div layout className="max-w-3xl w-full">
        <Card className="w-full shadow-2xl border border-border rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary">Configuração Inicial</CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.form
                  key="step0"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col gap-8"
                  onSubmit={(e) => { e.preventDefault(); handleNext(); }}
                >
                  {/* Password */}
                  <motion.div layout className="flex flex-col gap-2 p-4 bg-muted/40 rounded-xl border border-border">
                    <div className="flex items-center gap-2 font-semibold text-lg mb-2 text-primary">
                      <Lock className="w-5 h-5" /> Definir Password
                    </div>
                    <div className="text-xs text-muted-foreground -mt-2 mb-1">
                      (Opcional) Se deixares em branco, mantemos a password atual.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <Lock className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Nova password (opcional)"
                          minLength={0}
                          className="pl-8"
                        />
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirmar password (opcional)"
                          minLength={0}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    {password.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-32 h-2 bg-muted/30 rounded-full">
                          <motion.div
                            className={`h-2 rounded-full ${
                              passwordStrength === 0
                                ? "bg-muted"
                                : passwordStrength === 1
                                ? "bg-orange-400"
                                : passwordStrength === 2
                                ? "bg-yellow-400"
                                : passwordStrength === 3
                                ? "bg-green-400"
                                : "bg-primary"
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(passwordStrength / 4) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs">{["Fraca", "Média", "Boa", "Forte", "Excelente"][passwordStrength]}</span>
                      </div>
                    )}
                  </motion.div>

                  {/* Telefone + verificação */}
                  <motion.div layout className="flex flex-col gap-3 p-4 bg-muted/40 rounded-xl border border-border">
                    <div className="flex items-center gap-2 font-semibold text-lg text-primary">
                      <Phone className="w-5 h-5" /> Verificação de Telemóvel
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2 relative">
                        <Phone className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          value={phone}
                          onChange={(e) => { setPhone(e.target.value); setPhoneVerified(false); }}
                          placeholder="Telemóvel (ex.: 9XXXXXXXX ou +3519XXXXXXXX)"
                          className="pl-8"
                          disabled={smsSending}
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={sendSmsCode}
                          disabled={smsSending || resendCooldown > 0 || !isValidPhone(phone) || phoneVerified}
                          className="w-full"
                        >
                          {smsSending ? "A enviar…" : phoneVerified ? "Verificado" : resendCooldown > 0 ? `Reenviar (${resendCooldown}s)` : "Enviar código"}
                        </Button>
                      </div>
                    </div>

                    {!phoneVerified && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={codeInput}
                            onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="Código recebido por SMS"
                            disabled={!sentCode}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={verifyCode}
                          disabled={!sentCode || codeInput.length < 6}
                        >
                          Confirmar código
                        </Button>
                      </div>
                    )}

                    {phoneVerified && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-green-600 text-sm">
                        <ShieldCheck className="w-4 h-4" />
                        Telemóvel verificado.
                      </motion.div>
                    )}
                  </motion.div>

                  {error && <div className="text-destructive text-sm mt-2">{error}</div>}
                  <div className="flex justify-end mt-4">
                    <Button type="submit" disabled={loading}>
                      Guardar e continuar <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.form>
              )}

              {step === 1 && (
                <motion.form
                  key="step1"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col gap-8"
                  onSubmit={(e) => { e.preventDefault(); handleNext(); }}
                >
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Dados de Faturação */}
                    <motion.div layout className="flex-1 flex flex-col gap-3 p-4 bg-muted/40 rounded-xl border border-border">
                      <div className="flex items-center gap-2 font-semibold text-lg mb-1 text-primary">
                        <FileText className="w-5 h-5" /> Dados de Faturação
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        {/* Nome (3) | NIF (3) */}
                        <div className="md:col-span-3 relative">
                          <User className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="text"
                            value={billingInfo.full_name}
                            onChange={(e) => setBillingInfo({ ...billingInfo, full_name: e.target.value })}
                            placeholder="Nome completo"
                            required
                            className="pl-8"
                          />
                        </div>
                        <div className="md:col-span-3 relative">
                          <FileText className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="text"
                            value={billingInfo.tax_number}
                            onChange={(e) => setBillingInfo({ ...billingInfo, tax_number: e.target.value })}
                            placeholder="NIF"
                            required
                            className={`pl-8 ${nifClass}`}
                          />
                          {!nifQuotaExceeded && (
                            <div className="absolute right-2 top-2.5">
                              {nifChecking ? (
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
                              ) : nifValid === true ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : nifValid === false ? (
                                <XCircle className="h-4 w-4 text-red-600" />
                              ) : null}
                            </div>
                          )}
                        </div>

                        {/* CP (2) | Localidade (2, RO) | País (2, RO) */}
                        <div className="md:col-span-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="Código Postal (1234-567)"
                            value={billingInfo.postal_code}
                            onChange={(e) => setBillingInfo({ ...billingInfo, postal_code: e.target.value })}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Input type="text" placeholder="Localidade" value={billingInfo.city} readOnly disabled />
                        </div>
                        <div className="md:col-span-2">
                          <Input type="text" placeholder="País" value={billingInfo.country} readOnly disabled />
                        </div>

                        {/* Morada + Nome (artéria 5 | nome 1) */}
                        {addressMode === "dropdown" && (
                          <>
                            <div className="md:col-span-5">
                              <select
                                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={billingInfo.address}
                                onChange={(e) => setBillingInfo((b) => ({ ...b, address: e.target.value }))}
                                disabled={cpLoading || streetOptions.length === 0}
                                required
                              >
                                <option value="" disabled>
                                  {cpLoading ? "A carregar artérias…" : "Seleciona a artéria"}
                                </option>
                                {streetOptions.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="md:col-span-1">
                              <Input
                                type="text"
                                placeholder="Nome"
                                value={billingInfo.address_name}
                                onChange={(e) => setBillingInfo({ ...billingInfo, address_name: e.target.value })}
                              />
                            </div>
                          </>
                        )}
                        {addressMode === "readonly" && (
                          <>
                            <div className="md:col-span-5">
                              <Input type="text" placeholder="Artéria" value={billingInfo.address} readOnly disabled required />
                            </div>
                            <div className="md:col-span-1">
                              <Input
                                type="text"
                                placeholder="Nome"
                                value={billingInfo.address_name}
                                onChange={(e) => setBillingInfo({ ...billingInfo, address_name: e.target.value })}
                              />
                            </div>
                          </>
                        )}
                        {addressMode === "text" && (
                          <>
                            <div className="md:col-span-5">
                              <Input
                                type="text"
                                placeholder="Morada (rua, nº, andar)"
                                value={billingInfo.address}
                                onChange={(e) => setBillingInfo({ ...billingInfo, address: e.target.value })}
                                required
                              />
                            </div>
                            <div className="md:col-span-1">
                              <Input
                                type="text"
                                placeholder="Nome"
                                value={billingInfo.address_name}
                                onChange={(e) => setBillingInfo({ ...billingInfo, address_name: e.target.value })}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>

                    {/* Preview pequena */}
                    <motion.div layout className="w-full md:w-64 shrink-0 h-fit flex flex-col gap-2 p-4 bg-background border border-border rounded-xl shadow">
                      <div className="font-semibold text-primary text-sm mb-1">Preview Fatura</div>
                      <div className="text-xs text-muted-foreground">{billingInfo.full_name || "—"}</div>
                      <div className="text-xs">NIF: {billingInfo.tax_number || "—"}</div>
                      <div className="text-xs">
                        Morada: {[billingInfo.address, billingInfo.address_name].filter(Boolean).join(", ") || "—"}
                        {billingInfo.address && (billingInfo.postal_code || billingInfo.city || billingInfo.country) ? ", " : ""}
                        {billingInfo.postal_code} {billingInfo.city}
                        {billingInfo.city && billingInfo.country ? ", " : ""}
                        {billingInfo.country}
                      </div>
                    </motion.div>
                  </div>

                  {error && <div className="text-destructive text-sm mt-2">{error}</div>}
                  <div className="flex justify-between mt-2">
                    <Button type="button" variant="outline" onClick={handlePrev}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      Guardar e continuar <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.form>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col gap-6"
                >
                  <div className="p-4 bg-muted/40 rounded-xl border border-border">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-primary">Débito Direto</div>
                        <p className="text-sm text-muted-foreground">
                          Podes ligar o débito direto para simplificar pagamentos. {" "}
                          <span className="font-medium">Não vamos cobrar nada sem a tua autorização.</span>
                        </p>
                      </div>
                      {stripeSetup === "done" && (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">Configurado</span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant={stripeSetup === "done" ? "outline" : "default"}
                        onClick={handleStripeSetup}
                        disabled={stripeSetup === "pending"}
                      >
                        {stripeSetup === "pending" ? "A abrir..." : stripeSetup === "done" ? "Rever" : "Configurar agora"}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setStripeSetup((s) => (s === "done" ? s : "not_started"))}
                        className="text-muted-foreground"
                      >
                        Preferes tratar mais tarde?
                      </Button>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      Passo opcional. Podes avançar sem configurar agora.
                    </p>
                  </div>

                  {error && <div className="text-destructive text-sm">{error}</div>}
                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={handlePrev}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                    <Button type="button" onClick={() => setStep(3)} disabled={loading}>
                      Continuar <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col gap-8"
                >
                  <div className="flex flex-col gap-2 p-4 bg-muted/40 rounded-xl border border-border">
                    <div className="flex items-center gap-2 font-semibold text-lg mb-2 text-primary">
                      <Users className="w-5 h-5" /> Alunos do Plano
                    </div>
                    <div className="mb-2 text-sm text-muted-foreground">Limite do plano: {planLimit} alunos</div>

                    {students.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className="text-muted-foreground mb-2">Ainda não adicionaste nenhum aluno.</div>
                        <Button variant="secondary" onClick={openAddStudent}>
                          Adicionar primeiro aluno
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {students.map((student, idx) => (
                          <motion.div
                            key={`${student.name}-${idx}`}
                            layout
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-4 p-3 bg-background/80 hover:bg-background border border-border rounded-xl transition-shadow shadow-sm hover:shadow-md"
                          >
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                {student.name}
                                <button
                                  type="button"
                                  onClick={() => openEditStudent(idx)}
                                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-muted/60 hover:bg-muted transition"
                                  aria-label="Editar aluno"
                                >
                                  <Pencil className="w-3 h-3" /> Editar
                                </button>
                              </div>
                              <div className="text-xs text-muted-foreground">Ano: {student.year || "—"}</div>
                            </div>
                            <Button variant="outline" size="icon" onClick={() => handleRemoveStudent(idx)} aria-label="Remover aluno">
                              <X className="w-4 h-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {students.length < planLimit && (
                      <Button variant="secondary" className="mt-2" onClick={openAddStudent}>
                        Adicionar aluno
                      </Button>
                    )}
                  </div>

                  {error && <div className="text-destructive text-sm mt-2">{error}</div>}

                  <div className="flex justify-between mt-4">
                    <Button type="button" variant="outline" onClick={handlePrev}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                    <Button type="button" onClick={handleNext} disabled={loading}>
                      Prosseguir para o painel <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  {/* modal aluno (Adicionar/Editar) */}
                  <AnimatePresence>
                    {showStudentModal && (
                      <motion.div
                        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <motion.div
                          className="bg-background rounded-xl p-6 shadow-xl w-full max-w-md border border-border"
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.95, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 220, damping: 20 }}
                        >
                          <div className="font-semibold text-lg mb-4">
                            {editingIndex === null ? "Adicionar Aluno" : "Editar Aluno"}
                          </div>
                          <div className="flex flex-col gap-4">
                            <Input
                              type="text"
                              value={studentForm.name}
                              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                              placeholder="Nome do aluno"
                              required
                            />
                            <select
                              value={studentForm.year}
                              onChange={(e) => setStudentForm({ ...studentForm, year: e.target.value })}
                              required
                              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="">Seleciona o ano</option>
                              {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={`${i + 1}º ano`}>
                                  {i + 1}º ano
                                </option>
                              ))}
                              <option value="Ensino Superior">Ensino Superior</option>
                            </select>
                          </div>
                          <div className="flex justify-end gap-2 mt-6">
                            <Button variant="outline" onClick={() => setShowStudentModal(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleSaveStudent}>
                              Guardar
                            </Button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      <style>{`
        .animate-fade-in { animation: fadeIn .5s cubic-bezier(.4,0,.2,1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: translateY(0);} }
      `}</style>

      {(loading || bootLoading) && (
        <div className="fixed inset-0 z-50 grid place-items-center backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted-foreground/30 border-t-primary" />
        </div>
      )}
    </div>
  );
}
