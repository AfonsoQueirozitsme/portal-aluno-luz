import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, Fragment } from "react";
import { supabase } from "@/lib/supabaseClient";

// Avatares SVG
const MaleAvatar = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="18" fill="#e0e7ff" />
    <ellipse cx="18" cy="15" rx="7" ry="7" fill="#6366f1" />
    <ellipse cx="18" cy="29" rx="10" ry="6" fill="#a5b4fc" />
  </svg>
);
const FemaleAvatar = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="18" fill="#fce7f3" />
    <ellipse cx="18" cy="15" rx="7" ry="7" fill="#f472b6" />
    <ellipse cx="18" cy="29" rx="10" ry="6" fill="#f9a8d4" />
  </svg>
);

type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  gender: string | null;
  email: string;
};

const Index = () => {
  const navigate = useNavigate();
  const canonical = useMemo(() => `${window.location.origin}/`, []);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Profile[]>([]);
  const [showAccounts, setShowAccounts] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordOk, setNewPasswordOk] = useState(false);

  const isEmail = (val: string) => /\S+@\S+\.\S+/.test(val);

  // Ouve o evento de recuperação (quando o utilizador vem do link de reset)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setShowForgot(false);
        setForgotSent(false);
        setError(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ------------ helpers ------------
  const storeActiveProfile = (p: Profile) => {
    localStorage.setItem("activeProfileId", p.id);
    localStorage.setItem("activeUsername", p.username);
    localStorage.setItem("activeFullName", p.full_name ?? "");
  };

  const fetchAccountsByEmail = async (email: string): Promise<Profile[]> => {
    // requer RLS que permita este select (ou fazes isto após login)
    const { data, error: selErr } = await supabase
      .from("users")
      .select("id, username, full_name, gender, email")
      .eq("email", email);

    if (selErr) {
      // Sem permissão? devolve vazio para o fluxo cair no fallback do auth
      return [];
    }
    return (data ?? []) as Profile[];
  };

  const fetchAccountByUsername = async (username: string): Promise<Profile | null> => {
    const { data, error: selErr } = await supabase
      .from("users")
      .select("id, username, full_name, gender, email")
      .eq("username", username)
      .limit(1)
      .maybeSingle();
    if (selErr) return null;
    return (data as Profile) ?? null;
  };

  // ------------ actions ------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowAccounts(false);
    setAccounts([]);

    try {
      if (isEmail(identifier)) {
        // 1) procura contas por email (se RLS permitir)
        const list = await fetchAccountsByEmail(identifier);

        if (list.length === 0) {
          // 2) tenta autenticar mesmo assim → permite distinguir "password errada" vs inexistente
          const { error: authErr } = await supabase.auth.signInWithPassword({
            email: identifier,
            password,
          });
          if (authErr) {
            // Mensagens mais amigáveis
            if (authErr.message.toLowerCase().includes("invalid login"))
              throw new Error("Credenciais inválidas. Verifica o email e a palavra-passe.");
            throw authErr;
          }
          // Autenticou mas não vimos contas (RLS fechado) → pede conta ao utilizador?
          // Como não temos lista, segue direto para /aluno.
          navigate("/aluno");
          return;
        }

        if (list.length === 1) {
          // autentica e entra nesse perfil
          const { error: authErr } = await supabase.auth.signInWithPassword({
            email: identifier,
            password,
          });
          if (authErr) {
            if (authErr.message.toLowerCase().includes("invalid login"))
              throw new Error("Palavra-passe errada.");
            throw authErr;
          }
          storeActiveProfile(list[0]);
          navigate("/aluno");
          return;
        }

        // várias contas → autentica primeiro, depois mostra picker
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        });
        if (authErr) {
          if (authErr.message.toLowerCase().includes("invalid login"))
            throw new Error("Palavra-passe errada.");
          throw authErr;
        }
        setAccounts(list);
        setShowAccounts(true);
        return;
      } else {
        // username
        const profile = await fetchAccountByUsername(identifier);
        if (!profile) {
          throw new Error("Utilizador não encontrado.");
        }
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password,
        });
        if (authErr) {
          if (authErr.message.toLowerCase().includes("invalid login"))
            throw new Error("Palavra-passe errada.");
          throw authErr;
        }
        storeActiveProfile(profile);
        navigate("/aluno");
      }
    } catch (err: any) {
      setError(err?.message ?? "Falha ao iniciar sessão.");
    } finally {
      setLoading(false);
    }
  };

  // Seleção da conta (após email com várias contas)
  const handleAccountSelect = async (p: Profile) => {
    try {
      setLoading(true);
      setError(null);
      // Já estamos autenticados por email+password. Só falta “ligar” o perfil ativo.
      storeActiveProfile(p);
      navigate("/aluno");
    } catch (err: any) {
      setError("Não foi possível ativar essa conta.");
    } finally {
      setLoading(false);
    }
  };

  // Recuperação de password (envio do email)
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: window.location.origin,
    });
    if (resetErr) {
      setError(resetErr.message);
      return;
    }
    setForgotSent(true);
    setTimeout(() => {
      setShowForgot(false);
      setForgotSent(false);
      setForgotEmail("");
    }, 1800);
  };

  // Definir nova password (após link de recuperação)
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updErr) throw updErr;
      setNewPasswordOk(true);
      setTimeout(() => navigate("/aluno"), 800);
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível definir a nova palavra-passe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #e3e9f7 50%, #f9fafb 100%)" }}
    >
      <Helmet>
        <title>Iniciar Sessão</title>
        <link rel="canonical" href={canonical} />
      </Helmet>

      {/* Seta voltar atrás */}
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

      <section className="text-center max-w-md w-full p-8 rounded-xl shadow-lg bg-card relative overflow-hidden">
        <h1 className="text-4xl font-bold mb-4">Iniciar Sessão</h1>
        <p className="text-base text-muted-foreground mb-4">Acede com email ou utilizador.</p>

        {/* Mensagens */}
        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
        {newPasswordOk && (
          <div className="mb-4 text-sm text-green-600">Palavra-passe atualizada com sucesso. A entrar…</div>
        )}

        <div className="relative min-h-[260px]">
          {/* Form de login */}
          <div
            className={`absolute inset-0 w-full transition-all duration-500 ${
              !showAccounts && !showForgot && !isRecovery
                ? "opacity-100 translate-x-0 z-10"
                : "opacity-0 pointer-events-none -translate-x-8 z-0"
            }`}
          >
            <form className="flex flex-col gap-4" onSubmit={handleLogin}>
              <input
                type="text"
                placeholder="Email ou utilizador"
                className="px-4 py-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition"
                autoComplete="username email"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Palavra-passe"
                className="px-4 py-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <Button type="submit" variant="hero" className="mt-2" disabled={loading}>
                {loading ? "A entrar…" : "Entrar"}
              </Button>
            </form>
            <div className="mt-6">
              <button
                type="button"
                className="text-sm text-primary hover:underline transition"
                onClick={() => setShowForgot(true)}
                disabled={loading}
              >
                Esqueceste-te da palavra-passe?
              </button>
            </div>
          </div>

          {/* Picker de contas (email com várias contas) */}
          <div
            className={`absolute inset-0 w-full transition-all duration-500 ${
              showAccounts && !showForgot && !isRecovery
                ? "opacity-100 translate-x-0 z-10"
                : "opacity-0 pointer-events-none translate-x-8 z-0"
            }`}
          >
            {showAccounts && (
              <div className="animate-fade-in flex flex-col items-center gap-4" style={{ minHeight: 220 }}>
                <div className="mb-2 text-lg font-semibold">Escolhe a tua conta</div>
                <div className="flex flex-col gap-4 w-full">
                  {accounts.map((acc) => (
                    <Button
                      key={acc.id}
                      variant="outline"
                      className="flex items-center gap-4 justify-start px-8 py-5 text-lg font-medium transition-all duration-200 rounded-xl shadow-sm hover:bg-primary hover:text-white hover:shadow-lg"
                      onClick={() => handleAccountSelect(acc)}
                      disabled={loading}
                      style={{ minHeight: 64 }}
                    >
                      <span className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-gray-200">
                        {acc.gender === "female" ? <FemaleAvatar /> : <MaleAvatar />}
                      </span>
                      <span>{acc.username}</span>
                    </Button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  className="mt-2 text-muted-foreground text-sm"
                  onClick={() => setShowAccounts(false)}
                  disabled={loading}
                >
                  Voltar
                </Button>
              </div>
            )}
          </div>

          {/* Modal: recuperar password */}
          <div
            className={`absolute inset-0 w-full flex items-center justify-center transition-all duration-500 ${
              showForgot ? "opacity-100 translate-y-0 z-20" : "opacity-0 pointer-events-none translate-y-8 z-0"
            }`}
            style={{ background: showForgot ? "rgba(249,250,251,0.96)" : "transparent" }}
          >
            {showForgot && (
              <div
                className="bg-white rounded-xl shadow-xl p-8 animate-fade-in flex flex-col items-center"
                style={{ width: "100%", minHeight: "352px", display: "flex", justifyContent: "center" }}
              >
                <h2 className="text-2xl font-bold mb-2">Recuperar palavra-passe</h2>
                <p className="text-muted-foreground mb-6 text-sm">
                  Insere o teu email para receberes instruções.
                </p>
                {!forgotSent ? (
                  <Fragment>
                    <form className="w-full flex flex-col gap-4" onSubmit={handleForgotSubmit}>
                      <input
                        type="email"
                        placeholder="O teu email"
                        className="px-4 py-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        autoFocus
                      />
                      <Button type="submit" variant="hero">Enviar</Button>
                    </form>
                    <Button
                      variant="ghost"
                      className="mt-2 text-muted-foreground text-sm"
                      onClick={() => setShowForgot(false)}
                    >
                      Cancelar
                    </Button>
                  </Fragment>
                ) : (
                  <div className="w-full text-center py-8">
                    <p className="text-primary font-semibold mb-2">Verifica o teu email!</p>
                    <p className="text-muted-foreground text-sm">Enviámos instruções de recuperação.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal: definir nova password */}
          <div
            className={`absolute inset-0 w-full flex items-center justify-center transition-all duration-500 ${
              isRecovery ? "opacity-100 translate-y-0 z-30" : "opacity-0 pointer-events-none translate-y-8 z-0"
            }`}
            style={{ background: isRecovery ? "rgba(249,250,251,0.96)" : "transparent" }}
          >
            {isRecovery && (
              <div
                className="bg-white rounded-xl shadow-xl p-8 animate-fade-in flex flex-col items-center"
                style={{ width: "100%", minHeight: "352px", display: "flex", justifyContent: "center" }}
              >
                <h2 className="text-2xl font-bold mb-2">Nova palavra-passe</h2>
                <p className="text-muted-foreground mb-6 text-sm">
                  Define a tua nova palavra-passe para concluir.
                </p>
                <form className="w-full flex flex-col gap-4" onSubmit={handleSetNewPassword}>
                  <input
                    type="password"
                    placeholder="Nova palavra-passe"
                    className="px-4 py-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                  />
                  <Button type="submit" variant="hero" disabled={loading}>
                    {loading ? "A atualizar…" : "Guardar nova palavra-passe"}
                  </Button>
                </form>
                <Button
                  variant="ghost"
                  className="mt-2 text-muted-foreground text-sm"
                  onClick={() => setIsRecovery(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Animação fade-in */}
        <style>
          {`
            .animate-fade-in { animation: fadeIn .5s cubic-bezier(.4,0,.2,1); }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px);}
              to { opacity: 1; transform: translateY(0);}
            }
          `}
        </style>
      </section>
    </main>
  );
};

export default Index;
