// file: src/pages/Index.tsx
import React, { useMemo, useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import GlowCursor from "@/components/GlowCursor";
import { GraduationCap, User, Mail, Loader2, Eye, EyeOff, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

// Imagem remota (URL assinado). Idealmente tornar público ou gerar em runtime.
const LOGIN_BG =
  "https://qzvikwxwvwmngbnyxpwr.supabase.co/storage/v1/object/sign/static/login.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lODBjMDg3My1kM2U4LTQ5OWMtODczNy0xYWRlMDUwMGUxNGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMvbG9naW4ucG5nIiwiaWF0IjoxNzU1ODY1OTg3LCJleHAiOjE3ODc0MDE5ODd9.B_usEBExlQuotMSI-x828FCIziWpcUeBPxqrS_KS-3I";

// ---------------- Types ----------------
type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string;
  level: number | null;
};

type UIError = { title: string; detail?: string; ctaLabel?: string; ctaTo?: string };

// ---------------- Utils ----------------
const isEmail = (val: string) => /\S+@\S+\.[\S]+/.test(val.trim());

function initials(name?: string | null) {
  if (!name) return "👤";
  const parts = name.split(" ").filter(Boolean);
  const i1 = parts[0]?.[0] ?? "";
  const i2 = parts[parts.length - 1]?.[0] ?? "";
  return (i1 + i2).toUpperCase();
}

// ---------------- Component ----------------
export default function Index() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const [stage, setStage] = useState<"form" | "pick-profile">("form");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<UIError | null>(null);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [authedUserId, setAuthedUserId] = useState<string | null>(null);

  const email = useMemo(() => identifier.trim().toLowerCase(), [identifier]);
  const validEmail = isEmail(email);
  const canSubmit = validEmail && password.length >= 6 && !loading;

  // reset erro ao editar campos
  useEffect(() => {
    if (err) setErr(null);
    // eslint-disable-next-line
  }, [identifier, password]);

  // Pequena animação de erro
  const [shake, setShake] = useState(0);
  useEffect(() => {
    if (err) setShake((s) => s + 1);
  }, [err]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!validEmail) {
      setErr({ title: "Verifica o email", detail: "O formato não parece válido." });
      return;
    }

    setLoading(true);
    try {
      // 1) Tenta autenticar
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // --- Falha de autenticação: decidir mensagem correta ---
      if (signInErr) {
        const status = (signInErr as any)?.status as number | undefined;
        const raw = (signInErr as any)?.message?.toLowerCase?.() || "";

        // Se for throttling / rate limit, mostra isso diretamente
        if (status === 429) {
          setErr({ title: "Demasiadas tentativas", detail: "Aguarda um pouco antes de tentares novamente." });
          setLoading(false);
          return;
        }

        // Caso genérico (Supabase devolve muitas vezes 'Invalid login credentials')
        // Vamos confirmar se existe conta na nossa tabela de perfis:
        const { data: profsByEmail } = await supabase
          .from("profiles")
          .select("id")
          .ilike("email", email)
          .limit(1);

        if (profsByEmail && profsByEmail.length > 0) {
          // Existe perfil → password errada (ou credenciais inválidas)
          setErr({
            title: "Credenciais incorretas",
            detail: "Confirma o email e a palavra-passe. Se te esqueceste, recupera o acesso.",
            ctaLabel: "Recuperar palavra-passe",
            ctaTo: "/recuperar-password",
          });
        } else {
          // Não há perfil → conta não encontrada
          setErr({
            title: "Credenciais incorretas",
            detail: "Confirma o email e a palavra-passe. Se te esqueceste, recupera o acesso.",
          });
        }

        setLoading(false);
        return;
      }

      // 2) Autenticado → carregar perfis pelo auth_user_id
      if (signInData?.user?.id) {
        const userId = signInData.user.id;
        setAuthedUserId(userId);

        const { data: profs, error: profsErr } = await supabase
          .from("profiles")
          .select("id, full_name, username, level")
          .eq("auth_user_id", userId)
          .order("created_at", { ascending: false });

        if (profsErr) {
          setErr({ title: "Não deu para carregar os perfis", detail: "Tenta novamente dentro de momentos." });
          setLoading(false);
          return;
        }

        if (!profs || profs.length === 0) {
          navigate("/setup", { state: { email } });
          setLoading(false);
          return;
        }

        setProfiles(profs);
        setStage("pick-profile");
        setLoading(false);
        return;
      }
    } catch {
      setErr({ title: "Algo correu mal ao iniciar sessão", detail: "Verifica a tua ligação e tenta outra vez." });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = async (profile: ProfileRow) => {
    try {
      if (authedUserId) {
        localStorage.setItem("auth_user_id", authedUserId);
      }
      localStorage.setItem("active_profile_id", profile.id);
      if (profile.username) {
        localStorage.setItem("active_profile_username", profile.username);
      } else {
        localStorage.removeItem("active_profile_username");
      }
      if (profile.full_name) {
        localStorage.setItem("active_profile_name", profile.full_name);
      } else {
        localStorage.setItem("active_profile_name", profile.username);
      }
      // limpar legacy
      localStorage.removeItem("activeProfileId");
      localStorage.removeItem("activeUsername");
      localStorage.removeItem("activeFullName");
      navigate("/aluno");
    } catch {
      setErr({ title: "Não foi possível ativar o perfil", detail: "Tenta novamente." });
    }
  };

  // Variantes de animação
  const panel = {
    hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
  } as const;

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  } as const;

  const item = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  } as const;

  return (
    <>
      <Helmet>
        <title>Árvore do Conhecimento - Login</title>
        <meta
          name="description"
          content="Acede à tua conta do Árvore do Conhecimento. Área reservada para alunos e professores."
        />
        <meta name="keywords" content="login, centro explicações, alunos, professores, educação" />
        <link rel="canonical" href={window.location.origin} />
      </Helmet>

      <GlowCursor />

      <main className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
        {/* Fundo de página com a imagem remota + overlay claro (fixo) */}
        <motion.div
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{
            background: `linear-gradient(120deg, hsl(var(--background)/.86), hsl(var(--background)/.86)), url('${LOGIN_BG}') center/cover no-repeat fixed`,
          }}
        />

        <section className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-stretch">
          {/* Painel visual à esquerda (mantido com as tuas alturas) */}
          <motion.div
            variants={panel}
            initial="hidden"
            animate="show"
            className="relative overflow-hidden rounded-2xl border border-border/40 card-hover"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
            <div
              className="w-full h-[520px] lg:h-[600px] bg-center bg-cover"
              style={{ backgroundImage: `url('${LOGIN_BG}')` }}
              role="img"
              aria-label="Estudantes a estudar juntos"
            />
            <div className="absolute inset-0 [mask-image:linear-gradient(to_top,black,transparent_55%)] bg-background/30 backdrop-blur-[1px]" />
            <div className="absolute bottom-6 left-6 right-6 text-white drop-shadow">
              <h2 className="text-2xl font-bold mb-1">Bem-vindo à Árvore do Conhecimento</h2>
              <p className="text-white/90 text-sm">
                Entra na tua área reservada e continua a tua jornada de aprendizagem.
              </p>
            </div>
          </motion.div>

          {/* Cartão de login / seleção de perfil */}
          <AnimatePresence mode="wait">
            {stage === "form" ? (
              <motion.div
                key="form"
                variants={panel}
                initial="hidden"
                animate="show"
                exit="exit"
                className="space-y-6"
              >
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="show"
                  className="text-center space-y-2"
                >
                  <motion.div variants={item} className="flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                      <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                  </motion.div>
                  <motion.h1 variants={item} className="text-3xl font-bold text-foreground">
                    Iniciar Sessão
                  </motion.h1>
                  <motion.p variants={item} className="text-muted-foreground">
                    Acede aos teus recursos com segurança
                  </motion.p>
                </motion.div>

                <motion.div variants={item}>
                  <Card className="card-surface">
                    <CardHeader>
                      <CardTitle>Aceder à Conta</CardTitle>
                      <CardDescription>Introduz o teu email e palavra-passe</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <motion.form
                        onSubmit={handleLogin}
                        className="space-y-4"
                        onKeyUp={(e) =>
                          setCapsOn((e.getModifierState && e.getModifierState("CapsLock")) || false)
                        }
                        noValidate
                      >
                        <div className="space-y-2">
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="email"
                              placeholder="Email"
                              value={identifier}
                              onChange={(e) => setIdentifier(e.target.value)}
                              required
                              className="h-11 pl-9 input-elevated"
                              autoComplete="username email"
                              inputMode="email"
                              aria-invalid={!validEmail && identifier.length > 0}
                            />
                          </div>
                          {!validEmail && identifier.length > 0 && (
                            <p className="text-xs text-destructive">Formato de email inválido.</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type={showPass ? "text" : "password"}
                              placeholder="Palavra-passe"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              className="h-11 pl-9 pr-10 input-elevated"
                              autoComplete="current-password"
                              aria-describedby="password-hint"
                              minLength={6}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPass((s) => !s)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              aria-label={showPass ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                            >
                              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <div id="password-hint" className="text-xs text-muted-foreground">
                            Mínimo 6 caracteres.
                          </div>
                          {capsOn && (
                            <div className="text-xs text-accent">Atenção: Caps Lock está ativo.</div>
                          )}
                        </div>

                        <AnimatePresence>
                          {err && (
                            <motion.div
                              key={"err"}
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="flex items-start gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2 text-sm mt-2"
                              role="alert"
                            >
                              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                              <div className="space-y-0.5">
                                <p className="font-medium">{err.title}</p>
                                {err.detail && (
                                  <p className="text-muted-foreground">{err.detail}</p>
                                )}
                                {err.ctaLabel && err.ctaTo && (
                                  <Link
                                    to={err.ctaTo}
                                    className="text-primary underline underline-offset-4"
                                  >
                                    {err.ctaLabel}
                                  </Link>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <motion.div
                          animate={err ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                          transition={{ key: shake, duration: 0.35 }}
                        >
                          <Button type="submit" className="w-full h-11 btn-hero" disabled={!canSubmit}>
                            {loading ? (
                              <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> A entrar…
                              </span>
                            ) : (
                              "Entrar"
                            )}
                          </Button>
                        </motion.div>
                      </motion.form>

                      <div className="mt-6 text-center">
                        <Link
                          to="/recuperar-password"
                          className="text-sm story-link text-muted-foreground hover:text-primary"
                        >
                          Esqueceste-te da palavra-passe?
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="pick"
                variants={panel}
                initial="hidden"
                animate="show"
                exit="exit"
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                      <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h1 className="text-3xl font-bold text-foreground">Escolhe o teu perfil</h1>
                  <p className="text-muted-foreground">Seleciona o perfil com que queres entrar</p>
                </div>

                <Card className="card-surface">
  <CardHeader>
    <CardTitle>Perfis disponíveis</CardTitle>
    <CardDescription>Carregados da tua conta</CardDescription>
  </CardHeader>
  <CardContent>
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
      {profiles.map((p) => (
        <motion.button
          key={p.id}
          variants={item}
          onClick={() => handleAccountSelect(p)}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleAccountSelect(p);
            }
          }}
          className={[
            "group relative w-full rounded-xl border border-border/50",
            "bg-gradient-to-br from-background/60 to-muted/30",
            "p-4 text-left flex items-center gap-4",
            "transition-all duration-300",
            "hover:from-accent/20 hover:to-accent/40 hover:border-accent/40",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
          ].join(" ")}
        >
          {/* Avatar com anel ao hover */}
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold ring-0 transition-all duration-300 group-hover:ring-2 group-hover:ring-primary/40">
              {initials(p.full_name)}
            </div>
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{p.full_name || p.username}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                @{p.username}
              </span>
              {p.level != null && (
                <span className="inline-flex items-center rounded-full bg-secondary text-foreground/80 px-2 py-0.5 text-[11px]">
                  Nível {p.level}
                </span>
              )}
            </div>
          </div>

          {/* Chevron animado */}
          <div className="ml-2 opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Glow subtil no hover */}
          <span className="pointer-events-none absolute inset-0 rounded-xl shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.25)] opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      ))}
    </motion.div>

    <Button variant="ghost" onClick={() => setStage("form")} className="w-full mt-4">
      <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
    </Button>
  </CardContent>
</Card>

              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </>
  );
}
