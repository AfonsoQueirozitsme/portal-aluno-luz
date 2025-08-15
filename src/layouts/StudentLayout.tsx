import { Outlet, Link, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Bug } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import type { Tables } from "@/lib/database.types";

type DbUser = Tables<"users">;

// Notificação simples
const NotificationBar = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-lg bg-primary text-white shadow-lg animate-fade-in-down flex items-center gap-3">
    <span>{message}</span>
    <button onClick={onClose} className="ml-2 text-white/80 hover:text-white font-bold text-lg leading-none">&times;</button>
    <style>
      {`
        .animate-fade-in-down { animation: fadeInDown .5s cubic-bezier(.4,0,.2,1); }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-24px);} to { opacity: 1; transform: translateY(0);} }
      `}
    </style>
  </div>
);

const notificationsMock = [
  { id: 1, title: "Fatura disponível", description: "A tua nova fatura está disponível para pagamento." },
  { id: 2, title: "Aula marcada", description: "A tua próxima aula é amanhã às 15h." },
];

const NotificationDropdown = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="relative p-2 rounded-full transition group"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        style={{ outline: "none", border: "none", background: "none" }}
      >
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full border-2 border-white" />
        <Bell className="w-6 h-6 text-primary group-hover:text-white transition" />
        <span className="sr-only">Notificações</span>
        <style>
          {`
            .group:hover { background: linear-gradient(90deg, #6366f1 0%, #a5b4fc 100%); box-shadow: 0 2px 8px 0 #6366f11a; }
            .group:active { filter: brightness(0.97); }
          `}
        </style>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-popover rounded-xl shadow-xl z-50 animate-fade-in border border-border">
          <div className="p-4 border-b font-semibold text-primary">Notificações</div>
          <div className="max-h-72 overflow-y-auto">
            {notificationsMock.length === 0 ? (
              <div className="p-4 text-muted-foreground text-sm">Sem notificações.</div>
            ) : (
              notificationsMock.map((n) => (
                <div
                  key={n.id}
                  className="p-4 border-b last:border-b-0 transition-colors duration-150 cursor-pointer rounded-none hover:bg-primary/10 hover:text-primary"
                >
                  <div className="font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.description}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <style>
        {`
          .animate-fade-in { animation: fadeIn .3s cubic-bezier(.4,0,.2,1); }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px);} to { opacity: 1; transform: translateY(0);} }
        `}
      </style>
    </div>
  );
};

const reportCategories = [
  "Erro técnico",
  "Problema de pagamento",
  "Problema de acesso",
  "Sugestão de melhoria",
  "Outro",
];

export default function StudentLayout() {
  const navigate = useNavigate();

  // Notificações & report
  const [notification, setNotification] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState(reportCategories[0]);
  const [reportText, setReportText] = useState("");

  // Sessão & perfil ativo
  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<DbUser | null>(null);

  // Iniciais para o avatar (nome → username → email local-part)
  const initials = useMemo(() => {
    const base =
      activeProfile?.full_name?.trim() ||
      activeProfile?.username?.trim() ||
      (sessionEmail ? sessionEmail.split("@")[0] : "");
    if (!base) return "AL";
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [activeProfile, sessionEmail]);

  const displayName =
    activeProfile?.full_name ||
    activeProfile?.username ||
    (sessionEmail ? sessionEmail.split("@")[0] : "Centro de Explicações");

  // helper: carrega perfil ativo validando ownership
  const loadActiveProfile = async (uid: string): Promise<DbUser | null> => {
    const storedId = localStorage.getItem("activeProfileId");

    // 1) tentar pelo storedId, mas garantindo que pertence ao uid atual
    if (storedId) {
      const { data: byId, error: errId } = await supabase
        .from("users")
        .select("*")
        .eq("id", storedId)
        .eq("auth_user_id", uid)
        .maybeSingle();

      if (!errId && byId) return byId as DbUser;
      // se falhar, limpa lixo
      localStorage.removeItem("activeProfileId");
      localStorage.removeItem("activeUsername");
      localStorage.removeItem("activeFullName");
    }

    // 2) fallback: buscar primeira conta do utilizador
    const { data: list, error: errList } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", uid)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (!errList && list && list.length) return list[0] as DbUser;

    return null;
  };

  // Carrega sessão e escolhe perfil ativo
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      // 1) sessão obrigatória
      const { data: sess, error: sessErr } = await supabase.auth.getSession();
      const user = sess?.session?.user;

      if (sessErr || !user) {
        navigate("/"); // sem sessão → login
        return;
      }

      setSessionEmail(user.email ?? null);

      // 2) tenta obter perfil ativo de forma segura
      const profile = await loadActiveProfile(user.id);

      if (cancelled) return;

      if (!profile) {
        // sem perfil/sem permissões → manda para login (ou /completar-perfil se preferires)
        navigate("/");
        return;
      }

      setActiveProfile(profile);
      localStorage.setItem("activeProfileId", profile.id);
      localStorage.setItem("activeUsername", profile.username);
      localStorage.setItem("activeFullName", profile.full_name ?? "");

      setLoading(false);

      // Saudação rápida
      setTimeout(() => setNotification("Bem-vindo de volta!"), 400);
      setTimeout(() => setNotification(null), 3400);
    })();

    // listener logout noutra aba
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/");
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  // Sair
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("activeProfileId");
    localStorage.removeItem("activeUsername");
    localStorage.removeItem("activeFullName");
    navigate("/");
  };

  // Se quiseres mesmo bloquear tudo até validar, podes renderizar um mini loader
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground">A validar sessão…</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background animate-fade-in-page relative">
        {notification && (
          <NotificationBar message={notification} onClose={() => setNotification(null)} />
        )}

        <AppSidebar />

        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-4 border-b px-4 animate-fade-in-header">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-2 h-6" />
            <div className="flex-1 flex items-center justify-between">
              <Link to="/aluno" className="text-sm text-muted-foreground story-link">
                {displayName}
              </Link>

              <div className="flex items-center gap-2">
                <NotificationDropdown />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="cursor-pointer">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-50 bg-popover">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/aluno/perfil">Perfil</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/aluno/definicoes">Definições</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>Sair</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 animate-fade-in-main">
            <Outlet />
          </main>
        </SidebarInset>

        {/* Reportar erro */}
        <button
          className="fixed left-4 bottom-4 flex items-center gap-2 px-3 py-1.5 rounded-md bg-background border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary transition z-40 shadow-sm text-sm"
          onClick={() => setReportOpen(true)}
          style={{ boxShadow: "0 2px 8px 0 #0001" }}
        >
          <Bug className="w-4 h-4" />
          Reportar erro
        </button>

        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogContent className="max-w-md rounded-2xl shadow-2xl border-0 animate-modal-fade-in">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Bug className="w-5 h-5 text-destructive" />
                Reportar erro
              </DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-4 mt-2"
              onSubmit={(e) => {
                e.preventDefault();
                setReportOpen(false);
                setReportText("");
                setReportCategory(reportCategories[0]);
                alert("Obrigado pelo teu feedback!");
              }}
            >
              <label className="text-sm font-medium">Categoria</label>
              <select
                className="w-full rounded-md border border-input p-2 bg-background"
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
                required
              >
                {reportCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <label className="text-sm font-medium">Descrição</label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input p-3"
                placeholder="Descreve o erro ou problema encontrado..."
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2">
                <button type="button" className="px-4 py-2 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition" onClick={() => setReportOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded-md bg-primary text-white font-semibold hover:bg-primary/90 transition">
                  Enviar
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <style>
          {`
            .animate-fade-in-page { animation: fadeInPage .7s cubic-bezier(.4,0,.2,1); }
            @keyframes fadeInPage { from { opacity: 0; } to { opacity: 1; } }
            .animate-fade-in-header { animation: fadeInHeader .7s .2s cubic-bezier(.4,0,.2,1) both; }
            @keyframes fadeInHeader { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
            .animate-fade-in-main { animation: fadeInMain .7s .35s cubic-bezier(.4,0,.2,1) both; }
            @keyframes fadeInMain { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
            .animate-modal-fade-in { animation: modalFadeIn .4s ease-out; }
            @keyframes modalFadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
          `}
        </style>
      </div>
    </SidebarProvider>
  );
}
