// file: src/components/AppSidebar.tsx
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  CalendarDays,
  BookOpenText,
  Files,
  MessageSquare,
  CreditCard,
  UserRound,
  LayoutDashboard,
  Layers,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMemo } from "react";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const items: NavItem[] = [
  { title: "Dashboard", url: "/aluno", icon: LayoutDashboard },
  { title: "Horário", url: "/aluno/horario", icon: CalendarDays },
  { title: "Materiais", url: "/aluno/materiais", icon: Files },
  { title: "Recursos", url: "/aluno/recursos", icon: Layers },
  { title: "Cursos", url: "/aluno/cursos", icon: BookOpenText },
  { title: "Mensagens", url: "/aluno/mensagens", icon: MessageSquare },
  { title: "Pagamentos", url: "/aluno/pagamentos", icon: CreditCard },
  { title: "Perfil", url: "/aluno/perfil", icon: UserRound },
];

type Props = {
  /** Ex.: { "/aluno/mensagens": 2 } */
  badges?: Partial<Record<string, number>>;
};

export function AppSidebar({ badges = {} }: Props) {
  const location = useLocation();
  const current = location.pathname;
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const brand = useMemo(
    () => (
      <div className="flex items-center gap-2 p-2">
        <img
          src="https://qzvikwxwvwmngbnyxpwr.supabase.co/storage/v1/object/sign/static/logo_cores.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lODBjMDg3My1kM2U4LTQ5OWMtODczNy0xYWRlMDUwMGUxNGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMvbG9nb19jb3Jlcy5wbmciLCJpYXQiOjE3NTU4ODQ1NTQsImV4cCI6MTc4NzQyMDU1NH0.RL58Vd5_3CyJ-CI114b_Mme3HVyUwazIGfNVmhkDeD4"
          alt="Logo"
          className={`rounded-md object-cover shadow-[var(--shadow-elegant)] transition-all ${isCollapsed ? "h-9 w-9" : "h-8 w-8"}`}
        />
        {!isCollapsed && (
          <div className="font-semibold bg-[image:var(--gradient-hero)] bg-clip-text text-transparent tracking-tight">
            Árvore do Conhecimento
          </div>
        )}
      </div>
    ),
    [isCollapsed]
  );

  const isActive = (url: string) =>
    current === url || (url !== "/aluno" && current.startsWith(url + "/"));

  return (
    <TooltipProvider delayDuration={60}>
      {/* Nota: classes data-[state=collapsed] e data-[collapsed=true] para cobrir variantes da lib */}
      <Sidebar
        className="w-64 custom-sidebar transition-[width] duration-300 data-[state=collapsed]:w-[88px] data-[collapsed=true]:w-[88px]"
        collapsible="icon"
      >
        <SidebarContent>
          <SidebarHeader>{brand}</SidebarHeader>
          <SidebarSeparator />

          <SidebarGroup>
            {!isCollapsed && <SidebarGroupLabel>Área Reservada</SidebarGroupLabel>}

            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  const active = isActive(item.url);

                  const Badge =
                    badges[item.url] && badges[item.url]! > 0 ? (
                      <span
                        className={`ml-auto inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 text-[10px] font-semibold
                        ${active ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"}`}
                        aria-label={`${badges[item.url]} novas`}
                      >
                        {badges[item.url]}
                      </span>
                    ) : null;

                  const buttonInner = (
                    <NavLink to={item.url} end aria-current={active ? "page" : undefined} className="w-full">
                      <div
                        className={[
                          "group relative w-full flex items-center gap-3 rounded-xl px-2.5 py-2",
                          "transition-all duration-300 will-change-transform",
                          "hover:translate-x-[1px]",
                          active
                            ? "bg-gradient-to-r from-primary/15 to-accent/10 text-primary ring-1 ring-primary/20 shadow-[var(--shadow-elegant)]"
                            : "hover:bg-muted/60",
                        ].join(" ")}
                      >
                        {/* rail activo com glow */}
                        <span
                          className={[
                            "absolute left-1 top-1 bottom-1 w-1 rounded-full",
                            "transition-opacity duration-300",
                            active ? "bg-primary opacity-100 animate-glow" : "opacity-0",
                          ].join(" ")}
                          aria-hidden="true"
                        />

                        {/* ícone em pastilha (ligeiramente maior em colapso) */}
                        <span
                          className={[
                            "grid place-items-center rounded-lg transition-all duration-300",
                            isCollapsed ? "h-10 w-10" : "h-8 w-8",
                            active
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground group-hover:text-primary",
                          ].join(" ")}
                        >
                          <item.icon className={isCollapsed ? "h-5 w-5" : "h-4.5 w-4.5"} />
                        </span>

                        {/* título */}
                        {!isCollapsed && <span className="truncate text-sm">{item.title}</span>}

                        {/* badge */}
                        {!isCollapsed && Badge}
                      </div>
                    </NavLink>
                  );

                  return (
                    <SidebarMenuItem key={item.title} className="px-2">
                      {/* Tooltips só quando colapsado */}
                      {isCollapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton asChild isActive={active} className="!p-0">
                              {buttonInner}
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="px-2 py-1 text-xs">
                            {item.title}
                            {badges[item.url] ? <span className="ml-1 opacity-70">({badges[item.url]})</span> : null}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <SidebarMenuButton asChild isActive={active} className="!p-0">
                          {buttonInner}
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Estilos finos + fallback para largura colapsada */}
        <style>{`
          /* Fallbacks para diferentes libs/attrs */
          .custom-sidebar[data-state="collapsed"],
          .custom-sidebar[data-collapsed="true"],
          .custom-sidebar[data-collapsible="icon"][data-state="collapsed"] { width: 88px !important; }

          .sidebar .group:active { transform: translateY(0.5px); }

          @keyframes glow {
            0%,100% { box-shadow: 0 0 0px hsl(var(--primary)/0.0); }
            50% { box-shadow: 0 0 10px hsl(var(--primary)/0.3); }
          }
          .animate-glow { animation: glow 2.4s ease-in-out infinite; }
        `}</style>
      </Sidebar>
    </TooltipProvider>
  );
}
