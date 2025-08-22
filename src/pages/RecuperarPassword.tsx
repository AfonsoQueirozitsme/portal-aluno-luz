// file: src/pages/RecoverPassword.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";

type Mode = "request" | "reset";

export default function RecoverPassword() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("request");

  // REQUEST
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState<string | null>(null);
  const [reqError, setReqError] = useState<string | null>(null);

  // RESET
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetOk, setResetOk] = useState(false);

  // Alterar para modo RESET quando a Supabase sinaliza recuperação
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });
    // fallback: hash do URL
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setMode("reset");
    }
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const redirectUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/recuperar`;
  }, []);

  const sendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setReqError(null);
    setSentMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl });
      if (error) throw error;
      setSentMsg("Enviámos um email com um link para definires uma nova palavra-passe.");
    } catch (err: any) {
      setReqError(err?.message || "Não foi possível enviar o email de recuperação.");
    } finally {
      setSending(false);
    }
  };

  const pwdStrength = useMemo(() => getPwdStrength(newPwd), [newPwd]);

  const validatePwd = () => {
    if (newPwd.length < 8) return "A palavra-passe deve ter pelo menos 8 caracteres.";
    if (newPwd !== confirmPwd) return "As palavras-passe não coincidem.";
    return null;
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    const v = validatePwd();
    if (v) {
      setResetError(v);
      return;
    }
    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      setResetOk(true);
      setTimeout(() => navigate("/aluno"), 1000);
    } catch (err: any) {
      setResetError(err?.message || "Não foi possível atualizar a palavra-passe.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-foreground">
      {/* AURORA / BACKGROUND */}
      <AuroraBackground />

      {/* GLOW por trás do cartão */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[56%] h-[520px] w-[520px] rounded-full blur-[90px] opacity-40"
             style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / .35), transparent 70%)" }} />
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 px-4 py-10 md:py-16 grid place-items-center">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          {/* CARTÃO com border animada */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-white/10 via-primary/30 to-white/10">
            <div className="relative rounded-2xl bg-gradient-to-b from-background/90 to-background/70 backdrop-blur-xl border border-white/10">
              {/* linha brilhante superior */}
              <div className="absolute inset-x-8 -top-[1px] h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-60" />
              {/* conteúdo do cartão */}
              <div className="p-6 md:p-7">
                <div className="mb-5 flex items-center justify-between">
                  <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Voltar</span>
                  </Link>
                  <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-400/80 animate-pulse" />
                    seguro
                  </span>
                </div>

                <div className="mb-5 text-center">
                  <motion.h1
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="text-xl md:text-2xl font-semibold tracking-tight"
                  >
                    {mode === "request" ? "Recuperar palavra-passe" : "Definir nova palavra-passe"}
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 }}
                    className="text-sm text-muted-foreground mt-1.5"
                  >
                    {mode === "request"
                      ? "Escreve o teu email e enviaremos um link de recuperação."
                      : "Escolhe uma nova palavra-passe forte para a tua conta."}
                  </motion.p>
                </div>

                {/* FORM REQUEST */}
                {mode === "request" && (
                  <motion.form
                    onSubmit={sendEmail}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-4"
                    aria-busy={sending}
                  >
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <div className="mt-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                        </span>
                        <Input
                          type="email"
                          placeholder="o.teu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoFocus
                          className="pl-10 h-11 rounded-xl bg-white/90 dark:bg-white/5 border-white/10 focus-visible:ring-2 focus-visible:ring-primary"
                        />
                      </div>
                    </div>

                    {reqError && (
                      <Alert kind="error">{reqError}</Alert>
                    )}
                    {sentMsg && (
                      <Alert kind="success">
                        <div className="inline-flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{sentMsg}</span>
                        </div>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      disabled={sending}
                      className="h-11 rounded-xl font-semibold tracking-tight"
                    >
                      {sending ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> A enviar…
                        </span>
                      ) : (
                        "Enviar link"
                      )}
                    </Button>

                    <div className="text-xs text-muted-foreground text-center mt-1.5">
                      Lembraste da password?{" "}
                      <Link to="/" className="text-primary hover:underline">
                        Entrar
                      </Link>
                    </div>
                  </motion.form>
                )}

                {/* FORM RESET */}
                {mode === "reset" && (
                  <motion.form
                    onSubmit={updatePassword}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-4"
                    aria-busy={updating}
                  >
                    <div>
                      <label className="text-sm font-medium">Nova palavra-passe</label>
                      <div className="mt-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          <Lock className="h-4 w-4" />
                        </span>
                        <Input
                          type={showPwd ? "text" : "password"}
                          placeholder="Mínimo 8 caracteres"
                          value={newPwd}
                          onChange={(e) => setNewPwd(e.target.value)}
                          required
                          autoFocus
                          className="pl-10 pr-10 h-11 rounded-xl bg-white/90 dark:bg-white/5 border-white/10 focus-visible:ring-2 focus-visible:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                          aria-label={showPwd ? "Ocultar password" : "Mostrar password"}
                        >
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Barra de força */}
                      <PwdStrengthBar score={pwdStrength.score} label={pwdStrength.label} />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Confirmar palavra-passe</label>
                      <div className="mt-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          <Lock className="h-4 w-4" />
                        </span>
                        <Input
                          type={showConfirm ? "text" : "password"}
                          placeholder="Repete a palavra-passe"
                          value={confirmPwd}
                          onChange={(e) => setConfirmPwd(e.target.value)}
                          required
                          className="pl-10 pr-10 h-11 rounded-xl bg-white/90 dark:bg-white/5 border-white/10 focus-visible:ring-2 focus-visible:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                          aria-label={showConfirm ? "Ocultar password" : "Mostrar password"}
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {resetError && <Alert kind="error">{resetError}</Alert>}
                    {resetOk && (
                      <Alert kind="success">
                        <div className="inline-flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Password atualizada. A redirecionar…</span>
                        </div>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      disabled={updating}
                      className="h-11 rounded-xl font-semibold tracking-tight"
                    >
                      {updating ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> A atualizar…
                        </span>
                      ) : (
                        "Guardar nova password"
                      )}
                    </Button>

                    <div className="text-xs text-muted-foreground text-center mt-1.5">
                      Preferes voltar?{" "}
                      <Link to="/" className="text-primary hover:underline">
                        Página inicial
                      </Link>
                    </div>
                  </motion.form>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CSS do aurora/partículas */}
      <style>{AURORA_CSS}</style>
    </div>
  );
}

/* ------------------------- UI Helpers -------------------------- */

function PwdStrengthBar({ score, label }: { score: number; label: string }) {
  const pct = Math.min(100, Math.max(0, (score / 4) * 100));
  const color =
    score <= 1 ? "bg-red-500" : score === 2 ? "bg-yellow-500" : score === 3 ? "bg-emerald-500" : "bg-primary";
  return (
    <div className="mt-2">
      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Alert({ kind, children }: { kind: "success" | "error"; children: React.ReactNode }) {
  const classes =
    kind === "success"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-600"
      : "border-destructive/30 bg-destructive/10 text-destructive";
  return <div className={`text-sm rounded-md border px-3 py-2 ${classes}`}>{children}</div>;
}

function getPwdStrength(pwd: string): { score: number; label: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const label = ["Muito fraca", "Fraca", "Média", "Forte", "Excelente"][score] ?? "Muito fraca";
  return { score, label };
}

/* ------------------------- Aurora BG --------------------------- */

function AuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* véu suave */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_10%_-10%,hsl(var(--primary)/.25),transparent),radial-gradient(1000px_600px_at_110%_0%,#22d3ee22,transparent)]" />
      {/* faixas aurora */}
      <div className="aurora-wrap">
        <div className="aurora a1" />
        <div className="aurora a2" />
        <div className="aurora a3" />
        <div className="aurora a4" />
      </div>
      {/* partículas */}
      <div className="particles">
        {Array.from({ length: 28 }).map((_, i) => (
          <span key={i} className="particle" style={{ ["--i" as any]: i + 1 }} />
        ))}
      </div>
    </div>
  );
}

const AURORA_CSS = `
.aurora-wrap { position: absolute; inset: -20% -10% -10% -10%; overflow: hidden; filter: blur(24px) saturate(120%); }
.aurora {
  position: absolute;
  width: 55vw;
  height: 55vh;
  opacity: .55;
  background: radial-gradient(60% 60% at 50% 50%, hsl(var(--primary) / .65), transparent 70%),
              conic-gradient(from 180deg at 50% 50%, #22d3ee33, transparent 45%, #a78bfa33);
  mix-blend-mode: screen;
  animation: auroraMove 16s ease-in-out infinite alternate;
}
.aurora.a1 { left: -10%; top: -8%; animation-duration: 18s; }
.aurora.a2 { right: -15%; top: 0%; animation-duration: 20s; }
.aurora.a3 { left: 5%; bottom: -10%; animation-duration: 22s; }
.aurora.a4 { right: 0%; bottom: -6%; animation-duration: 24s; }

@keyframes auroraMove {
  0% { transform: translate3d(0,0,0) rotate(0deg) scale(1); filter: hue-rotate(0deg); }
  50% { transform: translate3d(2%, -2%, 0) rotate(6deg) scale(1.06); filter: hue-rotate(10deg); }
  100% { transform: translate3d(-2%, 1%, 0) rotate(-4deg) scale(1.04); filter: hue-rotate(-10deg); }
}

.particles { position: absolute; inset: 0; overflow: hidden; }
.particle {
  position: absolute;
  top: calc(100% * var(--i) / 28);
  left: calc(100% * (var(--i) % 10) / 10);
  width: 2px; height: 2px;
  background: white; border-radius: 999px; opacity: .4;
  animation: floatUp linear infinite;
  animation-duration: calc(8s + (var(--i) * .25s));
  filter: drop-shadow(0 0 8px #fff);
}
@keyframes floatUp {
  0% { transform: translateY(20vh); opacity: 0; }
  10% { opacity: .5; }
  100% { transform: translateY(-120vh); opacity: 0; }
}
`;
