import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  MessageCircle,
  ClipboardCheck,
  FileText,
  Settings,
  User,
  LogOut,
  ChevronDown,
  GraduationCap
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

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/professor",
    icon: LayoutDashboard,
  },
  {
    title: "Alunos",
    url: "/professor/alunos",
    icon: Users,
  },
  {
    title: "Horários",
    url: "/professor/horarios",
    icon: Calendar,
  },
  {
    title: "Aulas",
    url: "/professor/aulas",
    icon: BookOpen,
  },
  {
    title: "Materiais",
    url: "/professor/materiais",
    icon: FileText,
  },
  {
    title: "Mensagens",
    url: "/professor/mensagens",
    icon: MessageCircle,
  },
  {
    title: "Avaliações",
    url: "/professor/avaliacoes",
    icon: ClipboardCheck,
  },
];

export function ProfessorSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/professor") {
      return location.pathname === "/professor";
    }
    return location.pathname.startsWith(path);
  };

  return (
  <Sidebar className={`${collapsed ? "w-16" : "w-64"} transition-all duration-300 bg-white border-r border-border`}>
      <SidebarHeader className="border-b border-border/40 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-700">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Professor</h2>
              <p className="text-sm text-gray-700">Árvore do Conhecimento</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/professor"}
                      className={({ isActive: navIsActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                          navIsActive || isActive(item.url)
                            ? "bg-indigo-100 text-gray-900 shadow-lg"
                            : "text-gray-700 hover:bg-indigo-50 hover:text-gray-900"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-indigo-50 transition-colors text-gray-900">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatars/professor.jpg" alt="Professor" />
                <AvatarFallback className="bg-indigo-100 text-gray-900 text-sm">
                  PR
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Prof. Silva
                    </p>
                    <p className="text-xs text-gray-700 truncate">
                      Matemática
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-700" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <NavLink
                to="/professor/perfil"
                className="flex items-center gap-2 cursor-pointer"
              >
                <User className="h-4 w-4" />
                Perfil
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink
                to="/professor/configuracoes"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                Configurações
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Terminar sessão
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}