import { Outlet, Link } from "react-router-dom";
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
import { Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bug } from "lucide-react";

// Sistema de notificações simples
const NotificationBar = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-lg bg-primary text-white shadow-lg animate-fade-in-down flex items-center gap-3">
    <span>{message}</span>
    <button onClick={onClose} className="ml-2 text-white/80 hover:text-white font-bold text-lg leading-none">&times;</button>
    <style>
      {`
        .animate-fade-in-down {
          animation: fadeInDown .5s cubic-bezier(.4,0,.2,1);
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-24px);}
          to { opacity: 1; transform: translateY(0);}
        }
      `}
    </style>
  </div>
);

const notificationsMock = [
  { id: 1, title: "Fatura disponível", description: "A sua nova fatura está disponível para pagamento." },
  { id: 2, title: "Aula marcada", description: "A sua próxima aula é amanhã às 15h." },
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
            .group:hover {
              background: linear-gradient(90deg, #6366f1 0%, #a5b4fc 100%);
              box-shadow: 0 2px 8px 0 #6366f11a;
            }
            .group:active {
              filter: brightness(0.97);
            }
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
          .animate-fade-in {
            animation: fadeIn .3s cubic-bezier(.4,0,.2,1);
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px);}
            to { opacity: 1; transform: translateY(0);}
          }
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
  "Outro"
];

const StudentLayout = () => {
  const [notification, setNotification] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState(reportCategories[0]);
  const [reportText, setReportText] = useState("");

  // Exemplo: mostrar notificação ao carregar a página
  useEffect(() => {
    setTimeout(() => setNotification("Bem-vindo de volta!"), 400);
    setTimeout(() => setNotification(null), 3400);
  }, []);

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
                Centro de Explicações
              </Link>
              <div className="flex items-center gap-2">
                <NotificationDropdown />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="cursor-pointer">
                      <AvatarFallback>AL</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-50 bg-popover">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/aluno/perfil">Perfil</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>Definições</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Sair</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 animate-fade-in-main">
            <Outlet />
          </main>
        </SidebarInset>
        {/* Reportar erro modal trigger */}
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
              onSubmit={e => {
                e.preventDefault();
                setReportOpen(false);
                setReportText("");
                setReportCategory(reportCategories[0]);
                alert("Obrigado pelo seu feedback!");
              }}
            >
              <label className="text-sm font-medium">Categoria</label>
              <select
                className="w-full rounded-md border border-input p-2 bg-background"
                value={reportCategory}
                onChange={e => setReportCategory(e.target.value)}
                required
              >
                {reportCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <label className="text-sm font-medium">Descrição</label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input p-3"
                placeholder="Descreva o erro ou problema encontrado..."
                value={reportText}
                onChange={e => setReportText(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition"
                  onClick={() => setReportOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-primary text-white font-semibold hover:bg-primary/90 transition"
                >
                  Enviar
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <style>
          {`
            .animate-fade-in-page {
              animation: fadeInPage .7s cubic-bezier(.4,0,.2,1);
            }
            @keyframes fadeInPage {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .animate-fade-in-header {
              animation: fadeInHeader .7s .2s cubic-bezier(.4,0,.2,1) both;
            }
            @keyframes fadeInHeader {
              from { opacity: 0; transform: translateY(-16px);}
              to { opacity: 1; transform: translateY(0);}
            }
            .animate-fade-in-main {
              animation: fadeInMain .7s .35s cubic-bezier(.4,0,.2,1) both;
            }
            @keyframes fadeInMain {
              from { opacity: 0; transform: translateY(24px);}
              to { opacity: 1; transform: translateY(0);}
            }
            .animate-modal-fade-in {
              animation: modalFadeIn .4s ease-out;
            }
            @keyframes modalFadeIn {
              from { opacity: 0; transform: translateY(-10px);}
              to { opacity: 1; transform: translateY(0);}
            }
          `}
        </style>
      </div>
    </SidebarProvider>
  );
};

export default StudentLayout;
