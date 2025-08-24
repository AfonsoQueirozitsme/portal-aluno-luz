import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { Loader2, CheckCircle2, ShieldCheck, Eye, EyeOff, AlertTriangle, Mail, Lock, ArrowLeft } from "lucide-react";

type Mode = "request" | "reset";

/*
  RecoverPassword — Visual IGUAL ao da primeira página (glassmorphism com Card, Badge, Alert, Progress, etc.)
  - Modo REQUEST: envia email de recuperação (resetPasswordForEmail)
  - Modo RESET: valida sessão via #access_token/&refresh_token&type=recovery ou ?code= e permite definir nova password
*/

function parseHashParams(): Record<string, string> {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(hash);
  const result: Record<string, string> = {};
  params.forEach((v, k) => (result[k] = v));
  return result;
}

function scorePassword(pw: string) {
  let score = 0;
  if (!pw) return 0;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]/];
  score += Math.min(20, pw.length * 2);
  score += classes.reduce((acc, rgx) => acc + (rgx.test(pw) ? 20 : 0), 0);
  return Math.min(100, score);
}

export default function RecoverPassword() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("request");
  const [loadingLink, setLoadingLink] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // REQUEST
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState<string | null>(null);
  const [reqError, setReqError] = useState<string | null>(null);

  // RESET
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const strength = useMemo(() => scorePassword(password), [password]);
  const match = password.length > 0 && password === confirm;
  const canSubmit = sessionReady && match && strength >= 40 && password.length >= 8 && !updating;

  // Detectar e preparar sessão a partir do link
  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });

    (async () => {
      setLoadingLink(true);
      try {
        setLinkError(null);
        const p = parseHashParams();
        const access_token = p["access_token"];
        const refresh_token = p["refresh_token"]; 
        const type = p["type"]; // "recovery"

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setSessionReady(true);
          setMode("reset");
        } else if (access_token && refresh_token && type === "recovery") {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          setSessionReady(true);
          setMode("reset");
        } else if (window.location.hash.includes("type=recovery")) {
          // Sem tokens, dependemos do onAuthStateChange; mantemos UI de reset mas sem submit
          setMode("reset");
        }
      } catch (e: any) {
        setLinkError(e?.message || "Link de recuperação inválido ou expirado.");
      } finally {
        try {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        } catch {}
        setLoadingLink(false);
      }
    })();

    return () => {
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const redirectUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/recuperar`;
  }, []);

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setReqError(null);
    setSentMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl });
      if (error) throw error;
      setSentMsg("Enviámos um email com um link para definires uma nova palavra‑passe.");
    } catch (err: any) {
      setReqError(err?.message || "Não foi possível enviar o email de recuperação.");
    } finally {
      setSending(false);
    }
  }

  function validatePwd(): string | null {
    if (password.length < 8) return "A palavra‑passe deve ter pelo menos 8 caracteres.";
    if (password !== confirm) return "As palavras‑passe não coincidem.";
    if (!sessionReady) return "Sessão inválida. Abre o link de recuperação novamente.";
    return null;
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    const v = validatePwd();
    if (v) {
      setResetError(v);
      return;
    }
    setUpdating(true);
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password });
      if (upErr) throw upErr;
      setUpdated(true);
      setTimeout(() => navigate("/aluno"), 1200);
    } catch (e: any) {
      setResetError(e?.message || "Não foi possível atualizar a password.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>{mode === "request" ? "Recuperar palavra‑passe" : "Definir nova palavra‑passe"} · Árvore do Conhecimento</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-emerald-500/10 p-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
          <Card className="backdrop-blur-xl bg-white/70 dark:bg-zinc-900/60 border-white/40 dark:border-white/10 shadow-xl">
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <Badge variant="secondary" className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">Segurança</Badge>
                </div>
                <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Link>
              </div>
              <CardTitle className="text-2xl">
                {mode === "request" ? "Recuperar palavra‑passe" : "Definir nova palavra‑passe"}
              </CardTitle>
              <CardDescription>
                {mode === "request"
                  ? "Escreve o teu email e enviaremos um link de recuperação."
                  : "Utiliza o formulário abaixo para definires uma nova password em segurança."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Estado a validar link */}
              {mode === "reset" && (loadingLink || (!sessionReady && !linkError)) && (
                <Alert className="bg-white/60 dark:bg-zinc-900/60">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertTitle>A validar link…</AlertTitle>
                  <AlertDescription>
                    Estamos a confirmar o teu link de recuperação. Por favor aguarda um instante.
                  </AlertDescription>
                </Alert>
              )}

              {/* Erro de link */}
              {mode === "reset" && linkError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Não foi possível continuar</AlertTitle>
                  <AlertDescription>
                    {linkError}
                  </AlertDescription>
                </Alert>
              )}

              {/* FORM REQUEST */}
              {mode === "request" && (
                <form onSubmit={sendEmail} className="space-y-4" aria-busy={sending}>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                        <Mail className="h-4 w-4" />
                      </span>
                      <Input
                        id="email"
                        type="email"
                        placeholder="o.teu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>

                  {reqError && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Erro</AlertTitle>
                      <AlertDescription>{reqError}</AlertDescription>
                    </Alert>
                  )}
                  {sentMsg && (
                    <Alert className="bg-emerald-50/80 border-emerald-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertTitle>Email enviado</AlertTitle>
                      <AlertDescription>{sentMsg}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={sending}>
                    {sending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A enviar…
                      </>
                    ) : (
                      <>Enviar link</>
                    )}
                  </Button>

                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Lembraste da password?</span>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/auth">Entrar</Link>
                    </Button>
                  </div>
                </form>
              )}

              {/* FORM RESET */}
              {mode === "reset" && (
                <form onSubmit={handleUpdatePassword} className="space-y-4" aria-busy={updating}>
                  <div className="space-y-2">
                    <Label htmlFor="password">Nova palavra‑passe</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                        <Lock className="h-4 w-4" />
                      </span>
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        placeholder="Min. 8 caracteres"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-11"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute inset-y-0 right-2 flex items-center text-zinc-500 hover:text-zinc-700"
                        aria-label={showPw ? "Esconder password" : "Mostrar password"}
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="space-y-1">
                      <Progress value={strength} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Força: {strength < 40 ? "fraca" : strength < 70 ? "média" : "forte"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirmar palavra‑passe</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                        <Lock className="h-4 w-4" />
                      </span>
                      <Input
                        id="confirm"
                        type={showConfirm ? "text" : "password"}
                        placeholder="Repete a password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="pl-10 pr-10 h-11"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((s) => !s)}
                        className="absolute inset-y-0 right-2 flex items-center text-zinc-500 hover:text-zinc-700"
                        aria-label={showConfirm ? "Esconder" : "Mostrar"}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirm.length > 0 && !match && (
                      <p className="text-xs text-red-600">As passwords não coincidem.</p>
                    )}
                  </div>

                  {resetError && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Erro</AlertTitle>
                      <AlertDescription>{resetError}</AlertDescription>
                    </Alert>
                  )}

                  {updated && (
                    <Alert className="bg-emerald-50/80 border-emerald-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertTitle>Password atualizada</AlertTitle>
                      <AlertDescription>
                        Redirecionar para a área reservada…
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={!canSubmit}>
                    {updating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A atualizar…
                      </>
                    ) : (
                      <>Guardar nova password</>
                    )}
                  </Button>

                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Preferes voltar mais tarde?</span>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/">Página inicial</Link>
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
