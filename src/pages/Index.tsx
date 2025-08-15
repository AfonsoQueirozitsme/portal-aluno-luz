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

  // Modal para definir password (apenas para PASSWORD_RECOVERY)
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [settingPass, setSettingPass] = useState(false);
  const [newPasswordOk, setNewPasswordOk] = useState(false);

  const isEmail = (val: string) => /\S+@\S+\.\S+/.test(val);

  // ---------- helpers ----------
  const storeActiveProfile = (p: Profile) => {
    localStorage.setItem("activeProfileId", p.id);
    localStorage.setItem("activeUsername", p.username);
    localStorage.setItem("activeFullName", p.full_name ?? "");
  };

  const mapAuthError = (err: any) => {
    const m = (err?.message || "").toLowerCase();
    if (m.includes("email not confirmed") || m.includes("not confirmed")) {
      return "Tens de confirmar o email primeiro. Verifica a caixa de entrada.";
    }
    if (m.includes("invalid login credentials")) {
      return "Credenciais inválidas. Verifica o email/nome de utilizador e a palavra-passe.";
    }
    if (m.includes("user not found")) {
      return "Utilizador não encontrado.";
    }
    return err?.message || "Falha ao iniciar sessão.";
  };

  const getRoleFromUser = (u: any): string | undefined =>
    (u?.app_metadata && (u.app_metadata.role || u.app_metadata.user_role)) ||
    (u?.user_metadata && (u.user_metadata.role || u.user_metadata.user_role));

  const fetchAccountsForCurrentUser = async (): Promise<Profile[]> => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return [];
    const { data, error } = await supabase
      .from("users")
      .select("id, username, full_name, gender, email")
      .eq("auth_user_id", uid)
      .order("username");
    if (error) return [];
    return (data ?? []) as Profile[];
  };

  const fetchAccountByUsername = async (username: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, full_name, gender, email")
      .eq("username", username)
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return (data as Profile) ?? null;
  };

  const decideAfterAuth = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) {
      setError("Sessão inválida. Tenta novamente.");
      return;
    }

    // Professores vão para /professor
    const role = getRoleFromUser(user);
    if (role === "professor" || role === "teacher") {
      navigate("/professor");
      return;
    }

    // Alunos: escolher/definir perfil
    const list = await fetchAccountsForCurrentUser();
    if (list.length === 0) {
      navigate("/completar-perfil");
      return;
    }
    if (list.length === 1) {
      storeActiveProfile(list[0]);
      navigate("/aluno");
      return;
    }
    setAccounts(list);
    setShowAccounts(true);
  };

  // 1) Só abre modal de password quando vem de recuperação
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setShowSetPassword(true);
        setError(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ------------ actions ------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowAccounts(false);
    setAccounts([]);

    try {
      if (isEmail(identifier)) {
        // 1) autentica por email/password
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        });
        if (authErr) throw new Error(mapAuthError(authErr));

        // 2) decide redirecionamento (professor/aluno/picker/completar-perfil)
        await decideAfterAuth();
        return;
      }

      // username
      const profile = await fetchAccountByUsername(identifier);
      if (!profile) throw new Error("Utilizador não encontrado.");

      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });
      if (authErr) throw new Error(mapAuthError(authErr));

      // confirma ownership do perfil
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error("Sessão inválida após autenticação.");

      const { data: owned } = await supabase
        .from("users")
        .select("id")
        .eq("id", profile.id)
        .eq("auth_user_id", uid)
        .maybeSingle();

      if (owned) {
        storeActiveProfile(profile);
        navigate("/aluno");
      } else {
        // não pertence → decide pelo conjunto de contas disponíveis
        await decideAfterAuth();
      }
    } catch (err: any) {
      setError(err?.message ?? "Falha ao iniciar sessão.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = async (p: Profile) => {
    try {
      setLoading(true);
      setError(null);
      // garante sessão
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        setError("Sessão expirada. Inicia sessão novamente.");
        return;
      }
      storeActiveProfile(p);
      navigate("/aluno");
    } catch {
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
      redirectTo: window.location.origin, // ao voltar, onAuthStateChange -> PASSWORD_RECOVERY abre modal
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
    setSettingPass(true);
    setError(null);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updErr) throw updErr;

      setNewPasswordOk(true);
      setTimeout(async () => {
        setShowSetPassword(false);
        // depois de actualizar a password, decide para onde ir
        await decideAfterAuth();
      }, 600);
    } catch (err: any) {
      setError(err?.message ?? "Não foi possível definir a nova palavra-passe.");
    } finally {
      setSettingPass(false);
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
          <div className="mb-4 text-sm text-green-600">Palavra-passe atualizada com sucesso!</div>
        )}

        <div className="relative min-h-[260px]">
          {/* Form de login */}
          <div
            className={`absolute inset-0 w-full transition-all duration-500 ${
              !showAccounts && !showForgot && !showSetPassword
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
              showAccounts && !showForgot && !showSetPassword
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

          {/* Modal: definir nova password (apenas para PASSWORD_RECOVERY) */}
          <div
            className={`absolute inset-0 w-full flex items-center justify-center transition-all duration-500 ${
              showSetPassword ? "opacity-100 translate-y-0 z-30" : "opacity-0 pointer-events-none translate-y-8 z-0"
            }`}
            style={{ background: showSetPassword ? "rgba(249,250,251,0.96)" : "transparent" }}
          >
            {showSetPassword && (
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
                  <Button type="submit" variant="hero" disabled={settingPass}>
                    {settingPass ? "A atualizar…" : "Guardar nova palavra-passe"}
                  </Button>
                </form>
                <Button
                  variant="ghost"
                  className="mt-2 text-muted-foreground text-sm"
                  onClick={() => setShowSetPassword(false)}
                  disabled={settingPass}
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
