// file: src/layouts/StudentLayout.tsx
import { Outlet, Link, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Bug,
  User,
  Settings,
  ArrowLeftRight,
  AtSign,
  Hash,
  CheckCircle2,
  Command,
  LogOut,
  Home,
  Calendar,
  CreditCard,
  FileText,
  BookOpen,
  MessageSquare,
  HelpCircle,
  LifeBuoy,
  MessageCircle,
  Check,
  X, // ← cruz para fechar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import AssistantChat from "@/components/SupportAIChat";

/* ----------------------------- Tipos ----------------------------- */
type Profile = {
  id: string;
  full_name: string | null;
  username: string;
  email: string;
  auth_user_id?: string;
  level?: number;
  updated_at?: string;
};

type UINotification = {
  id: string;
  title: string;
  description?: string | null;
  created_at: string;
  read_at: string | null;
  action_url?: string | null;
  severity?: "info" | "success" | "warning" | "error" | null;
};

/* -------------------------- Animações ---------------------------- */
const flyDown: any = {
  hidden: { opacity: 0, y: -12, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};
const staggerCol: any = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } };
const item: any = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

/* ----------------------- Toasts laterais ------------------------- */
type ToastItem = { id: string; message: string; duration: number };

const ToastCard = ({ toast, onClose }: { toast: ToastItem; onClose: (id: string) => void }) => {
  const [progress, setProgress] = useState(100);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

// dentro de ToastCard -> useEffect cleanup
useEffect(() => {
  const step = (t: number) => {
    if (startRef.current === null) startRef.current = t;
    const elapsed = t - startRef.current;
    const pct = Math.max(0, 100 - (elapsed / toast.duration) * 100);
    setProgress(pct);
    if (elapsed < toast.duration) {
      rafRef.current = requestAnimationFrame(step);
    } else {
      onClose(toast.id);
    }
  };

  rafRef.current = requestAnimationFrame(step);

  return () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current); // ✅ corrigido
  };
}, [toast, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 24, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.98 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden rounded-xl border border-primary/25 bg-popover shadow-[0_12px_30px_-10px_hsl(var(--primary)/0.35)]"
      role="status"
      aria-live="polite"
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-primary" />
        <span className="font-medium text-foreground">{toast.message}</span>
        <button
          onClick={() => onClose(toast.id)}
          className="ml-auto rounded-md px-2 py-0.5 bg-muted hover:bg-muted/80 transition text-xs text-foreground/80"
          aria-label="Fechar notificação"
        >
          Fechar
        </button>
      </div>
      <div className="h-1 w-full bg-primary/15">
        <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} aria-hidden />
      </div>
    </motion.div>
  );
};

const ToastStack = ({ toasts, remove }: { toasts: ToastItem[]; remove: (id: string) => void }) => (
  <div className="fixed right-4 top-4 z-[100] flex flex-col gap-3 max-w-[360px]">
    <AnimatePresence>
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onClose={remove} />
      ))}
    </AnimatePresence>
  </div>
);

const useToasts = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const push = (message: string, duration = 3600) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts, { id, message, duration }]);
  };
  const remove = (id: string) => setToasts((ts) => ts.filter((t) => t.id !== id));
  return { toasts, push, remove };
};

/* ------------------ Notifications (dropdown) --------------------- */
function formatPTDate(input: string) {
  try {
    const d = new Date(input);
    return d.toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const NotificationDropdown = ({
  open,
  setOpen,
  items,
  unread,
  onItemClick,
  onMarkAllRead,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  items: UINotification[];
  unread: number;
  onItemClick: (n: UINotification) => void;
  onMarkAllRead: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [setOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative p-2 rounded-full transition group/btn focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
        onClick={() => setOpen(!open)}
        aria-label="Notificações"
      >
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-semibold grid place-items-center border-2 border-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
        <Bell className="w-6 h-6 text-foreground/90 group-hover/btn:text-primary transition" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={flyDown}
            initial="hidden"
            animate="show"
            exit="exit"
            className="absolute right-0 mt-2 w-96 max-w-[92vw] rounded-xl border border-border bg-popover shadow-xl z-50"
          >
            <div className="px-4 py-3 border-b flex items-center">
              <div className="font-semibold text-primary">Notificações</div>
              <button
                onClick={onMarkAllRead}
                className="ml-auto text-xs rounded-md px-2 py-1 border border-border hover:bg-primary/10 hover:text-primary transition"
              >
                Marcar todas como lidas
              </button>
            </div>
            <motion.div variants={staggerCol} initial="hidden" animate="show" className="max-h-80 overflow-y-auto p-2">
              {items.length === 0 ? (
                <motion.div variants={item} className="p-4 text-muted-foreground text-sm">Sem notificações.</motion.div>
              ) : (
                items.map((n) => {
                  const isUnread = !n.read_at;
                  return (
                    <motion.button
                      key={n.id}
                      variants={item}
                      onClick={() => onItemClick(n)}
                      className={[
                        "w-full text-left p-3 rounded-lg transition-colors border flex items-start gap-3",
                        isUnread ? "bg-primary/10 text-foreground border-primary/30 hover:bg-primary/15" : "hover:bg-muted/60 border-transparent",
                      ].join(" ")}
                    >
                      <div className="mt-0.5 h-2 w-2 rounded-full" style={{ background: isUnread ? "hsl(var(--primary))" : "transparent" }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{n.title}</div>
                        {n.description ? <div className="text-xs text-muted-foreground line-clamp-2">{n.description}</div> : null}
                        <div className="text-[10px] text-muted-foreground mt-1">{formatPTDate(n.created_at)}</div>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ----------------------- Command Palette ------------------------ */
type CommandItem = { label: string; to?: string; action?: () => void; icon?: React.ReactNode };

const useCommandPalette = (items: CommandItem[]) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      if ((e.metaKey || e.ctrlKey) && isK) { e.preventDefault(); setOpen((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, query]);
  return { open, setOpen, query, setQuery, filtered };
};

/* ---------------------- Util styles (safe) ---------------------- */
const UTILS_CSS = String.raw`
.story-link { position: relative; display: inline-block; }
.story-link::after { content: ""; position: absolute; left: 0; bottom: -2px; height: 2px; width: 100%; transform-origin: 100% 100%; transform: scaleX(0); background: hsl(var(--primary)); transition: transform .25s; }
.story-link:hover::after { transform-origin: 0 0; transform: scaleX(1); }
`;

/* --------------------------- Layout ----------------------------- */
export default function StudentLayout() {
  const navigate = useNavigate();

  // chat flutuante
  const [chatOpen, setChatOpen] = useState(false);

  // toasts laterais
  const toast = useToasts();

  // notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<UINotification[]>([]);
  const unreadCount = useMemo(() => notifs.filter((n) => !n.read_at).length, [notifs]);

  // sessão & perfil
  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // switcher modal
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // bloqueio de scroll quando modal aberto
  useEffect(() => {
    document.body.style.overflow = switcherOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [switcherOpen]);

  /* --------- Notificações --------- */
  async function loadNotifications(uid: string) {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setNotifs(data as UINotification[]);
  }
  async function markAsRead(id: string) {
    setNotifs((arr) => arr.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  }
  async function markAllAsRead() {
    const ids = notifs.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return;
    const ts = new Date().toISOString();
    setNotifs((arr) => arr.map((n) => (!n.read_at ? { ...n, read_at: ts } : n)));
    await supabase.from("notifications").update({ read_at: ts }).in("id", ids);
  }
  function onNotificationClick(n: UINotification) {
    markAsRead(n.id);
    setNotifOpen(false);
    if (n.action_url) navigate(n.action_url);
  }

  /* --------- Perfil ativo --------- */
  const loadActiveProfile = async (uid: string): Promise<Profile | null> => {
    const storedNew = localStorage.getItem("active_profile_id");
       const storedLegacy = localStorage.getItem("activeProfileId");
    const storedId = storedNew || storedLegacy;

    if (storedId) {
      const { data: byId } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", storedId)
        .eq("auth_user_id", uid)
        .maybeSingle();
      if (byId) return byId as Profile;

      // limpar se inválido
      localStorage.removeItem("activeProfileId");
      localStorage.removeItem("activeUsername");
      localStorage.removeItem("activeFullName");
      localStorage.removeItem("active_profile_id");
      localStorage.removeItem("active_profile_username");
      localStorage.removeItem("active_profile_name");
    }

    const { data: list } = await supabase
      .from("profiles")
      .select("*")
      .eq("auth_user_id", uid)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (list && list.length) return list[0] as Profile;
    return null;
  };

  // abrir modal e carregar perfis (sem sair da página)
  const openProfileSwitcher = useCallback(async () => {
    if (!userId) return;
    setSwitcherOpen(true);
    setLoadingProfiles(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, username, email, auth_user_id, level, updated_at")
      .eq("auth_user_id", userId)
      .order("updated_at", { ascending: false });
    if (!error && data) setProfiles(data as Profile[]);
    setLoadingProfiles(false);
  }, [userId]);

  // escolher perfil
  const handlePickProfile = (p: Profile) => {
    setActiveProfile(p);
    localStorage.setItem("active_profile_id", p.id);
    localStorage.setItem("activeProfileId", p.id);
    localStorage.setItem("activeUsername", p.username);
    localStorage.setItem("activeFullName", p.full_name ?? "");
    setSwitcherOpen(false);
    toast.push(`Trocaste para ${p.full_name || p.username}.`, 2500);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("activeProfileId");
    localStorage.removeItem("activeUsername");
    localStorage.removeItem("activeFullName");
    localStorage.removeItem("active_profile_id");
    localStorage.removeItem("active_profile_username");
    localStorage.removeItem("active_profile_name");
    navigate("/");
  };

  /* --------- Sessão + inicialização --------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      const user = sess?.session?.user;
      if (!user) { navigate("/"); return; }

      setSessionEmail(user.email ?? null);
      setUserId(user.id);

      const profile = await loadActiveProfile(user.id);
      if (cancelled) return;
      if (!profile) { navigate("/setup"); return; }
      setActiveProfile(profile);

      await loadNotifications(user.id);

      const channel = supabase
        .channel(`notif-user-${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const n = payload.new as UINotification;
            setNotifs((arr) => [n, ...arr].slice(0, 30));
            toast.push(n.title);
          }
        )
        .subscribe();

      setLoading(false);
      setTimeout(() => toast.push("Bem-vindo de volta!"), 300);

      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") navigate("/");
      });

      return () => {
        cancelled = true;
        try { supabase.removeChannel(channel); } catch {}
        sub?.subscription?.unsubscribe?.();
      };
    })();
  }, [navigate]); // eslint-disable-line

  // iniciais & display
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
    (sessionEmail ? sessionEmail.split("@")[0] : "Árvore do Conhecimento");

  // report
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("Erro técnico");
  const [reportText, setReportText] = useState("");

  // Command Palette (rotas principais + ações)
  const commandItems = useMemo<CommandItem[]>(
    () => [
      { label: "Dashboard", to: "/aluno", icon: <Home className="h-4 w-4" /> },
      { label: "Aulas", to: "/aluno/aulas", icon: <Calendar className="h-4 w-4" /> },
      { label: "Calendário", to: "/aluno/calendario", icon: <Calendar className="h-4 w-4" /> },
      { label: "Mensagens", to: "/aluno/mensagens", icon: <MessageSquare className="h-4 w-4" /> },
      { label: "Materiais", to: "/aluno/materiais", icon: <BookOpen className="h-4 w-4" /> },
      { label: "Faturas", to: "/aluno/faturas", icon: <CreditCard className="h-4 w-4" /> },
      { label: "Documentos", to: "/aluno/documentos", icon: <FileText className="h-4 w-4" /> },
      { label: "Perfil", to: "/aluno/perfil", icon: <User className="h-4 w-4" /> },
      { label: "Definições", to: "/aluno/definicoes", icon: <Settings className="h-4 w-4" /> },
      { label: "Ajuda", to: "/ajuda", icon: <HelpCircle className="h-4 w-4" /> },
      { label: "Suporte", to: "/suporte", icon: <LifeBuoy className="h-4 w-4" /> },
      { label: "Abrir chat de suporte", action: () => setChatOpen(true), icon: <MessageCircle className="h-4 w-4" /> },
      { label: "Trocar de perfil", action: openProfileSwitcher, icon: <ArrowLeftRight className="h-4 w-4" /> },
      { label: "Sair", action: handleSignOut, icon: <LogOut className="h-4 w-4" /> },
    ],
    [openProfileSwitcher] // eslint-disable-line
  );
  const palette = useCommandPalette(commandItems);

  // Loader minimalista
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background via-background to-muted/30">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="h-12 w-12 rounded-full border-4 border-muted-foreground/20 border-t-primary animate-spin"
          aria-label="A carregar…"
        />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative bg-gradient-to-b from-background via-background/95 to-muted/20">

        {/* TOASTS laterais */}
        <ToastStack toasts={toast.toasts} remove={toast.remove} />

        {/* Sidebar */}
        <AppSidebar />

        <SidebarInset>
          {/* Header */}
          <motion.header
            variants={flyDown} initial="hidden" animate="show"
            className="relative flex h-14 shrink-0 items-center gap-4 px-4 border-b sticky top-0 z-40
                       bg-gradient-to-r from-background/90 via-background/90 to-background/90
                       backdrop-blur supports-[backdrop-filter]:bg-background/90"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-2 h-6" />

            <div className="flex-1 flex items-center justify-between">
              <Link to="/aluno" className="inline-flex items-center gap-2 text-sm text-muted-foreground story-link">
                {displayName}
              </Link>

              <div className="flex items-center gap-2">
                {/* Command Palette button */}
                <button
                  onClick={() => palette.setOpen(true)}
                  className="hidden sm:inline-flex items-center gap-2 px-2.5 h-8 rounded-md border border-border
                             bg-background hover:bg-primary/10 hover:text-primary transition text-xs"
                  aria-label="Abrir Command Palette"
                  title="⌘/Ctrl + K"
                >
                  <Command className="h-3.5 w-3.5" />
                  <span>Comandos</span>
                </button>

                {/* Notificações (reais) */}
                <NotificationDropdown
                  open={notifOpen}
                  setOpen={setNotifOpen}
                  items={notifs}
                  unread={unreadCount}
                  onItemClick={onNotificationClick}
                  onMarkAllRead={markAllAsRead}
                />

                {/* Avatar / Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-full focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2">
                      <div className="relative">
                        <Avatar className="cursor-pointer ring-0 transition hover:ring-2 hover:ring-primary/40">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className="pointer-events-none absolute -right-0 -bottom-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                      </div>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="z-50 bg-popover min-w-[260px] border-border">
                    <DropdownMenuLabel className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {activeProfile?.full_name || activeProfile?.username || "Utilizador"}
                          </div>
                          {sessionEmail && (
                            <div className="text-xs text-muted-foreground truncate">{sessionEmail}</div>
                          )}
                        </div>
                      </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator />

                    {/* Info compacta */}
                    <div className="px-3 py-2 text-xs space-y-1.5">
                      {activeProfile?.username && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AtSign className="h-3.5 w-3.5" />
                          <span className="truncate">@{activeProfile.username}</span>
                        </div>
                      )}
                      {typeof activeProfile?.level === "number" && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Hash className="h-3.5 w-3.5" />
                          <span>Nível: {activeProfile.level}</span>
                        </div>
                      )}
                    </div>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild>
                      <Link to="/aluno/perfil" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Perfil</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link to="/aluno/definicoes" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span>Definições</span>
                      </Link>
                    </DropdownMenuItem>

                    {/* Trocar de perfil → abre modal full-screen */}
                    <DropdownMenuItem onClick={openProfileSwitcher} className="flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4" />
                      <span>Trocar de perfil</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      <span>Sair</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

              </div>
            </div>
          </motion.header>

          {/* Main */}
          <motion.main
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 p-4"
          >
            <Outlet />
          </motion.main>
        </SidebarInset>

        {/* Botão reportar erro (esquerda) */}
        <motion.button
          whileHover={{ y: -2 }} whileTap={{ y: 0 }}
          className="fixed left-4 bottom-4 flex items-center gap-2 px-3 py-1.5 rounded-md bg-background border border-border
                     text-muted-foreground hover:bg-primary/10 hover:text-primary transition z-40 shadow-sm text-sm"
          onClick={() => setReportOpen(true)} aria-label="Reportar erro"
        >
          <Bug className="w-4 h-4" />
          Reportar erro
        </motion.button>

        {/* FAB Suporte → abre chat */}
        <motion.button
          whileHover={{ y: -2 }} whileTap={{ y: 0 }}
          onClick={() => setChatOpen(true)}
          className="fixed right-4 bottom-4 z-50 h-12 w-12 rounded-full bg-primary text-white shadow-[0_12px_30px_-10px_hsl(var(--primary)/0.45)]
                     flex items-center justify-center border border-primary/30"
          aria-label="Abrir chat de suporte"
          title="Suporte"
        >
          <MessageCircle className="h-5 w-5" />
        </motion.button>

        {/* Chat flutuante com IA */}
        <AnimatePresence>{chatOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] pointer-events-none">
            <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px] pointer-events-auto" onClick={() => setChatOpen(false)} />
            <div className="absolute right-4 bottom-20 sm:bottom-24 pointer-events-auto">
              <AssistantChat compact />
            </div>
          </motion.div>
        )}</AnimatePresence>

        {/* Dialog: Reportar erro */}
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogContent className="max-w-md rounded-2xl shadow-2xl border border-border bg-popover">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">Reportar erro</DialogTitle>
            </DialogHeader>
            <form
              className="flex flex-col gap-4 mt-2"
              onSubmit={(e) => {
                e.preventDefault();
                setReportOpen(false);
                setReportText("");
                setReportCategory("Erro técnico");
                toast.push("Obrigado pelo teu feedback!");
              }}
            >
              <label className="text-sm font-medium">Categoria</label>
              <select
                className="w-full rounded-md border border-input p-2 bg-background"
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
                required
              >
                <option>Erro técnico</option>
                <option>Problema de pagamento</option>
                <option>Problema de acesso</option>
                <option>Sugestão de melhoria</option>
                <option>Outro</option>
              </select>

              <label className="text-sm font-medium">Descrição</label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input p-3 bg-background"
                placeholder="Descreve o erro ou problema encontrado…"
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

        {/* Command Palette */}
        <Dialog open={palette.open} onOpenChange={palette.setOpen}>
          <DialogContent className="max-w-lg rounded-2xl shadow-2xl border border-border bg-popover p-0 overflow-hidden">
            <div className="p-3 border-b">
              <div className="relative">
                <Command className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus placeholder="Escreve um comando… (ex.: aulas, faturas, chat, sair)"
                  value={palette.query} onChange={(e) => palette.setQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2">
              {palette.filtered.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">Sem resultados.</div>
              ) : (
                <div className="grid gap-1">
                  {palette.filtered.map((it, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        palette.setOpen(false);
                        if (it.to) navigate(it.to);
                        if (it.action) it.action();
                      }}
                      className="flex items-center gap-2 p-2 rounded-md text-left hover:bg-primary/10 hover:text-primary transition"
                    >
                      {it.icon ?? <HelpCircle className="h-4 w-4" />}
                      <span className="text-sm">{it.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ============== MODAL FULL-PAGE: Trocar de perfil (centrado) ============== */}
        <AnimatePresence>
          {switcherOpen && (
            <motion.div className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Fundo aurora + blur */}
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  background:
                    "radial-gradient(1000px 600px at 20% -10%, rgba(99,102,241,.35), transparent 60%), radial-gradient(1000px 600px at 80% 110%, rgba(165,180,252,.35), transparent 60%), linear-gradient(120deg, #0b1020 0%, #0c1230 100%)",
                  filter: "saturate(1.2)",
                }}
              />
              <div className="absolute inset-0 backdrop-blur-[10px]" />

              {/* Botão fechar (cruz animada) */}
              <motion.button
                onClick={() => setSwitcherOpen(false)}
                whileHover={{ rotate: 90, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Fechar seleção de perfil"
                className="absolute top-4 right-4 sm:top-6 sm:right-6 h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 text-white grid place-items-center border border-white/20"
              >
                <X className="h-5 w-5" />
              </motion.button>

              {/* Conteúdo centrado */}
              <motion.div
                className="relative h-full w-full flex items-center justify-center px-4 sm:px-8"
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { type: "spring", stiffness: 110, damping: 20 } }}
                exit={{ y: 12, opacity: 0 }}
              >
                <div className="w-full max-w-6xl">
                  {/* Título centrado */}
                  <h2 className="text-center text-white font-semibold text-xl sm:text-2xl mb-6 select-none">
                    Quem vai estudar?
                  </h2>

                  {/* Carrossel horizontal (sem setas), centrado */}
                  <div
                    id="profiles-row"
                    className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 pr-2 mx-auto justify-center"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {loadingProfiles ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="snap-start shrink-0 w-[260px] h-[120px] rounded-2xl bg-white/10 border border-white/10 animate-pulse" />
                      ))
                    ) : profiles.length === 0 ? (
                      <div className="text-white/90">
                        Ainda não tens perfis.{" "}
                        <button onClick={() => { setSwitcherOpen(false); navigate("/setup"); }} className="underline">
                          Criar perfil
                        </button>
                      </div>
                    ) : (
                      profiles.map((p) => {
                        const isActive = p.id === activeProfile?.id;
                        const initials =
                          (p.full_name || p.username || "U")
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((s) => s[0]?.toUpperCase())
                            .join("") || "U";

                        return (
                          <motion.button
                            key={p.id}
                            whileHover={{ y: -2, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handlePickProfile(p)}
                            className={`snap-start shrink-0 w-[260px] h-[120px] rounded-2xl border text-left overflow-hidden transition relative ${
                              isActive ? "border-white/40 bg-white/15" : "border-white/15 bg-white/8 hover:bg-white/15"
                            }`}
                            style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}
                            title={p.full_name || p.username}
                          >
                            {/* brilho interno */}
                            <div className="pointer-events-none absolute -inset-10 opacity-0 hover:opacity-100 transition">
                              <div className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-indigo-400/20 blur-2xl" />
                              <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-violet-300/20 blur-2xl" />
                            </div>

                            <div className="relative h-full flex items-center gap-3 px-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-white text-lg font-semibold">
                                {initials}
                              </div>
                              <div className="min-w-0 text-white">
                                <div className="font-semibold truncate">{p.full_name || p.username}</div>
                                <div className="text-xs text-white/80 truncate">
                                  @{p.username}{p.level != null ? ` · Nível ${p.level}` : ""}
                                </div>
                              </div>
                              {isActive && (
                                <div className="ml-auto text-emerald-300">
                                  <Check className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                          </motion.button>
                        );
                      })
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Utils visuais */}
        <style dangerouslySetInnerHTML={{ __html: UTILS_CSS }} />
      </div>
    </SidebarProvider>
  );
}
