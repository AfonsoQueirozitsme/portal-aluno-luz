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

import { Loader2, CheckCircle2, ShieldCheck, Eye, EyeOff, AlertTriangle } from "lucide-react";

/*
  Página de Recuperação de Password (Supabase)
  - Lê os parâmetros do hash ("#access_token=...&refresh_token=...&type=recovery")
  - Faz set da sessão com supabase.auth.setSession({ access_token, refresh_token })
  - Mostra formulário para definir nova password e chama supabase.auth.updateUser({ password })

  Colocar esta página em: src/pages/Recuperar.tsx (ou ajustar a rota para "/recuperar")
*/

function parseHashParams(): Record<string, string> {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(hash);
  const result: Record<string, string> = {};
  params.forEach((v, k) => (result[k] = v));
  return result;
}

function scorePassword(pw: string) {
  // pontuação simples: comprimento + variedade de classes de caracteres
  let score = 0;
  if (!pw) return 0;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]/];
  score += Math.min(20, pw.length * 2); // até 20
  score += classes.reduce((acc, rgx) => acc + (rgx.test(pw) ? 20 : 0), 0); // até 80
  return Math.min(100, score);
}

export default function RecuperarPasswordPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);

  const strength = useMemo(() => scorePassword(password), [password]);
  const match = password.length > 0 && password === confirm;
  const canSubmit = sessionReady && match && strength >= 40 && password.length >= 8 && !updating;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const p = parseHashParams();

        if (p.error) {
          setError(decodeURIComponent(p.error_description || p.error));
          setLoading(false);
          return;
        }

        const access_token = p["access_token"];
        const refresh_token = p["refresh_token"]; 
        const type = p["type"]; // deve ser "recovery"

        if (access_token && refresh_token && type === "recovery") {
          const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
          if (setErr) {
            setError(setErr.message);
            setSessionReady(false);
          } else {
            setSessionReady(true);
          }
        } else {
          // fallback: alguns links novos usam ?code= e exchangeCodeForSession
          const url = new URL(window.location.href);
          const code = url.searchParams.get("code");
          if (code) {
            const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exchErr) {
              setError(exchErr.message);
              setSessionReady(false);
            } else {
              setSessionReady(true);
            }
          } else {
            setError("Link de recuperação inválido ou expirado. Pede um novo link.");
          }
        }
      } catch (e: any) {
        setError(e?.message || "Ocorreu um erro inesperado ao validar o link.");
      } finally {
        // limpar hash da barra de endereço por segurança
        try {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        } catch (_) {}
        setLoading(false);
      }
    })();
  }, []);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setUpdating(true);
    setError(null);
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      setUpdated(true);
      // redireciona após um segundo
      setTimeout(() => navigate("/aluno"), 1200);
    } catch (e: any) {
      setError(e?.message || "Não foi possível atualizar a password.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Recuperar palavra‑passe · Árvore do Conhecimento</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-emerald-500/10 p-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
          <Card className="backdrop-blur-xl bg-white/70 dark:bg-zinc-900/60 border-white/40 dark:border-white/10 shadow-xl">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <Badge variant="secondary" className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">Segurança</Badge>
              </div>
              <CardTitle className="text-2xl">Definir nova palavra‑passe</CardTitle>
              <CardDescription>
                Utiliza o formulário abaixo para definires uma nova password em segurança.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {loading && (
                <Alert className="bg-white/60 dark:bg-zinc-900/60">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertTitle>A validar link…</AlertTitle>
                  <AlertDescription>
                    Estamos a confirmar o teu link de recuperação. Por favor aguarda um instante.
                  </AlertDescription>
                </Alert>
              )}

              {!loading && error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Não foi possível continuar</AlertTitle>
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {!loading && !error && !sessionReady && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Link inválido ou expirado</AlertTitle>
                  <AlertDescription>
                    Solicita um novo email de recuperação e tenta novamente.
                  </AlertDescription>
                </Alert>
              )}

              {!loading && sessionReady && (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Nova palavra‑passe</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        placeholder="Min. 8 caracteres"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
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
                      <Input
                        id="confirm"
                        type={showConfirm ? "text" : "password"}
                        placeholder="Repete a password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="pr-10"
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

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Requisitos recomendados:</p>
                    <ul className="list-disc pl-5">
                      <li>Mínimo 8 caracteres (recomendado 12+)</li>
                      <li>Usa maiúsculas, minúsculas, números e símbolos</li>
                    </ul>
                  </div>

                  <Button type="submit" className="w-full" disabled={!canSubmit}>
                    {updating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A atualizar…
                      </>
                    ) : (
                      <>Guardar nova password</>
                    )}
                  </Button>

                  {updated && (
                    <Alert className="bg-emerald-50/80 border-emerald-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertTitle>Password atualizada</AlertTitle>
                      <AlertDescription>
                        Redirecionar para a área reservada…
                      </AlertDescription>
                    </Alert>
                  )}

                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Preferes voltar mais tarde?</span>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/aluno">Ir para login</Link>
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
