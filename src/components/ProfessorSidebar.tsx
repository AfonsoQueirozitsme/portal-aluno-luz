// file: src/components/ProfessorSidebar.tsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users as UsersIcon,
  Calendar,
  BookOpen,
  MessageCircle,
  ClipboardCheck,
  FileText,
  Settings,
  User,
  LogOut,
  ChevronDown,
  GraduationCap,
  CreditCard,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  full_name: string | null;
  subject?: string | null;      // ou department
  avatar_url?: string | null;
};

const menuItems = [
  { title: "Dashboard", url: "/professor", icon: LayoutDashboard },
  { title: "Encarregados de Educação", url: "/professor/users", icon: UsersIcon },
  { title: "Ponto de Venda", url: "/professor/pos", icon: CreditCard },
  { title: "Alunos", url: "/professor/alunos", icon: GraduationCap },
  { title: "Horários", url: "/professor/horarios", icon: Calendar },
  { title: "Aulas", url: "/professor/aulas", icon: BookOpen },
  { title: "Materiais", url: "/professor/materiais", icon: FileText },
  { title: "Mensagens", url: "/professor/mensagens", icon: MessageCircle },
  { title: "Avaliações", url: "/professor/avaliacoes", icon: ClipboardCheck },
];

export function ProfessorSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);

  // Sessão + perfil do utilizador autenticado
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, subject, avatar_url")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!cancelled) setProfile(p ?? { full_name: user.email ?? "Professor", subject: null, avatar_url: null });
    })();
    return () => { cancelled = true; };
  }, []);

  const initials = useMemo(() => {
    const name = profile?.full_name?.trim() || "PR";
    const parts = name.split(" ").filter(Boolean);
    const first = parts[0]?.[0] ?? "P";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "R";
    return (first + last).toUpperCase();
  }, [profile]);

  const isActive = (path: string) => {
    if (path === "/professor") return location.pathname === "/professor";
    return location.pathname.startsWith(path);
  };

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  // classes visuais reutilizáveis
  const baseItem =
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 outline-none";
  const activeItem =
    "bg-indigo-500/10 text-gray-900 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.25)]"; // indigo suave + vidro
  const hoverItem =
    "text-gray-800 hover:bg-indigo-400/10 hover:shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]";
  const iconCls = "h-5 w-5 flex-shrink-0";

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} transition-all duration-300 bg-white/80 backdrop-blur-md border-r border-border`}>
      <SidebarHeader className="border-b border-border/40 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 shadow-sm">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Professor</h2>
              <p className="text-xs text-gray-700/90">Árvore do Conhecimento</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <TooltipProvider disableHoverableContent>
                {menuItems.map((item) => {
                  const ActiveIcon = item.icon;
                  const active = isActive(item.url);
                  const content = (
                    <NavLink
                      to={item.url}
                      end={item.url === "/professor"}
                      className={({ isActive: navIsActive }) =>
                        [
                          baseItem,
                          (navIsActive || active) ? activeItem : hoverItem,
                          "focus-visible:ring-2 focus-visible:ring-indigo-400/50 focus-visible:ring-offset-2",
                        ].join(" ")
                      }
                    >
                      <ActiveIcon className={iconCls} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  );

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        {collapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{content}</TooltipTrigger>
                            <TooltipContent side="right">{item.title}</TooltipContent>
                          </Tooltip>
                        ) : (
                          content
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </TooltipProvider>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors text-gray-900 hover:bg-indigo-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
              aria-label="Menu do utilizador"
            >
              <Avatar className="h-8 w-8">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? "Professor"} />
                ) : (
                  <AvatarFallback className="bg-indigo-100 text-gray-900 text-sm">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {profile?.full_name || "Professor"}
                    </p>
                    <p className="text-[11px] text-gray-700/90 truncate">
                      {profile?.subject || "Docente"}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-700" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <NavLink to="/professor/perfil" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Perfil
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink to="/professor/configuracoes" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Configurações
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Terminar sessão
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
  