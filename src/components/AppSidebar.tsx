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

type Props = { badges?: Partial<Record<string, number>> };

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
          className={`rounded-md object-cover shadow-[var(--shadow-elegant)] transition-all ${isCollapsed ? "h-10 w-10" : "h-9 w-9"}`}
        />
        {!isCollapsed && (
          <div className="font-semibold tracking-tight text-foreground">
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
      <Sidebar
  className="custom-sidebar transition-[width] duration-300 w-64 data-[state=collapsed]:w-[104px] data-[collapsed=true]:w-[104px] pt-10"
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
                        className={[
                          "ml-auto inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 text-[10px] font-semibold",
                          active ? "badge-tint badge-tint--active" : "badge-tint",
                        ].join(" ")}
                        aria-label={`${badges[item.url]} novas`}
                      >
                        {badges[item.url]}
                      </span>
                    ) : null;

                  const iconSizeCollapsed = "h-5 w-5";
                  const iconSizeExpanded = "h-[18px] w-[18px]";
                  const pillBase = `grid place-items-center rounded-lg transition-all duration-300 ${isCollapsed ? "h-11 w-11" : "h-9 w-9"}`;

                  const buttonInner = (
                    <NavLink to={item.url} end aria-current={active ? "page" : undefined} className="w-full">
                      <div
                        className={[
                          "group relative w-full flex items-center gap-3 rounded-xl px-2.5 py-2",
                          "transition-all duration-300 will-change-transform hover:translate-x-[1px]",
                          "border border-transparent sidebar-link",
                          active ? "sidebar-link--active" : "",
                        ].join(" ")}
                      >
                        {/* rail subtil (apenas activo) */}
                        <span
                          className="absolute left-1 top-1 bottom-1 w-1 rounded-full transition-opacity duration-300"
                          style={{ background: active ? "hsl(var(--accent) / 0.28)" : undefined, opacity: active ? 1 : 0 }}
                          aria-hidden="true"
                        />

                        {/* Ícone em pastilha (glass com leve roxo) */}
                        <span
                          className={[
                            pillBase,
                            active ? "icon-pill icon-pill--active" : "icon-pill",
                            "supports-[backdrop-filter]:backdrop-blur-[12px]",
                          ].join(" ")}
                        >
                          <item.icon className={isCollapsed ? iconSizeCollapsed : iconSizeExpanded} />
                        </span>

                        {/* Título */}
                        {!isCollapsed && <span className="truncate text-sm text-foreground">{item.title}</span>}

                        {!isCollapsed && Badge}
                      </div>
                    </NavLink>
                  );

                  return (
                    <SidebarMenuItem key={item.title} className="px-2">
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

        {/* estilos finos - glass com roxo MUITO fraquinho */}
        <style>{`
          .custom-sidebar{
            /* Roxo super leve (H 266) */
            --accent: 266 70% 60%;
            /* Glass base */
            --glass-hover: 0 0% 100% / 0.04;
            --glass-active: 0 0% 100% / 0.06;
            --glass-border: 0 0% 100% / 0.08;
            --glass-border-strong: 0 0% 100% / 0.12;
          }

          /* Link com glass neutro + leve tinte roxo (quase imperceptível) */
          .sidebar-link{
            position: relative;
            background: transparent;
          }
          .sidebar-link:hover{
            background:
              linear-gradient(0deg, hsl(var(--accent) / 0.025), hsl(var(--accent) / 0.025)),
              hsl(var(--glass-hover));
            border-color: hsl(var(--glass-border));
            backdrop-filter: blur(14px) saturate(115%);
            -webkit-backdrop-filter: blur(14px) saturate(115%);
          }
          .sidebar-link::before{
            content:"";
            position:absolute; inset:0;
            border-radius: 0.75rem;
            background:
              linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,0) 38%);
            opacity:.12; pointer-events:none;
            transition: opacity .25s ease;
          }
          .sidebar-link:hover::before{ opacity:.16; }

          .sidebar-link--active{
            background:
              linear-gradient(0deg, hsl(var(--accent) / 0.04), hsl(var(--accent) / 0.04)),
              hsl(var(--glass-active));
            border-color: hsl(var(--accent) / 0.14);
            backdrop-filter: blur(16px) saturate(120%);
            -webkit-backdrop-filter: blur(16px) saturate(120%);
            box-shadow: var(--shadow-elegant);
          }

          /* Pastilha do ícone (glass + tinte roxo leve) */
          .icon-pill{
            background:
              linear-gradient(0deg, hsl(var(--accent) / 0.02), hsl(var(--accent) / 0.02)),
              rgba(255,255,255,.06);
            color: hsl(0 0% 40%);
          }
          .icon-pill:hover{
            background:
              linear-gradient(0deg, hsl(var(--accent) / 0.03), hsl(var(--accent) / 0.03)),
              rgba(255,255,255,.08);
            color: hsl(0 0% 18%);
          }
          .icon-pill--active{
            background:
              linear-gradient(0deg, hsl(var(--accent) / 0.05), hsl(var(--accent) / 0.05)),
              rgba(255,255,255,.10);
            color: hsl(0 0% 12%);
            border: 1px solid hsl(var(--accent) / 0.16);
          }

          /* Badge com tinte roxo muito suave */
          .badge-tint{
            background: hsl(var(--accent) / 0.08);
            color: hsl(var(--accent));
          }
          .badge-tint--active{
            background: hsl(var(--accent) / 0.12);
          }

          /* Colapso confortável */
          .custom-sidebar[data-state="collapsed"],
          .custom-sidebar[data-collapsed="true"],
          .custom-sidebar[data-collapsible="icon"][data-state="collapsed"]{
            width:104px!important;
          }

          :root{ --shadow-elegant: 0 10px 24px -12px hsl(0 0% 0% / .25); }
        `}</style>
      </Sidebar>
    </TooltipProvider>
  );
}
