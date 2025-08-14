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

const items = [
  { title: "Dashboard", url: "/aluno", icon: LayoutDashboard },
  { title: "Horário", url: "/aluno/horario", icon: CalendarDays },
  { title: "Materiais", url: "/aluno/materiais", icon: Files },
  { title: "Recursos", url: "/aluno/recursos", icon: Layers },
  { title: "Cursos", url: "/aluno/cursos", icon: BookOpenText },
  { title: "Mensagens", url: "/aluno/mensagens", icon: MessageSquare },
  { title: "Pagamentos", url: "/aluno/pagamentos", icon: CreditCard },
  { title: "Perfil", url: "/aluno/perfil", icon: UserRound },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <Sidebar className="w-64" collapsible="icon">
      <SidebarContent>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <div className="h-8 w-8 rounded-md bg-[image:var(--gradient-hero)] shadow-[var(--shadow-elegant)]" />
            <div className="font-semibold bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">Árvore do Conhecimento</div>
          </div>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Área Reservada</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={currentPath === item.url}>
                    <NavLink to={item.url} end>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
