import React, { Suspense, lazy } from "react";
import { Toaster as ToastToaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import '@vidstack/react/player/styles/base.css';

// Páginas (lazy)
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Intro = lazy(() => import("./pages/Intro"));

// Student pages
const StudentLayout = lazy(() => import("./layouts/StudentLayout"));
const Dashboard = lazy(() => import("./pages/aluno/Dashboard"));
const Horario = lazy(() => import("./pages/aluno/Horario"));
const Materiais = lazy(() => import("./pages/aluno/Materiais"));
const MaterialDetalhe = lazy(() => import("./pages/aluno/MaterialDetalhe"));
const QuizPage = lazy(() => import("./pages/aluno/Quizz"));
const Mensagens = lazy(() => import("./pages/aluno/Mensagens"));
const Pagamentos = lazy(() => import("./pages/aluno/Pagamentos"));
const Perfil = lazy(() => import("./pages/aluno/Perfil"));
const Recursos = lazy(() => import("./pages/aluno/Recursos"));
const Cursos = lazy(() => import("./pages/aluno/Cursos"));
const CursoDetalhe = lazy(() => import("./pages/aluno/CursoDetalhe"));

// Professor pages
const ProfessorLayout = lazy(() => import("./layouts/ProfessorLayout"));
const ProfessorDashboard = lazy(() => import("./pages/professor/Dashboard"));
const ProfessorAlunos = lazy(() => import("./pages/professor/Alunos"));
const ProfessorHorarios = lazy(() => import("./pages/professor/Horarios"));
const ProfessorAulas = lazy(() => import("./pages/professor/Aulas"));
const ProfessorMateriais = lazy(() => import("./pages/professor/Materiais"));
const ProfessorMensagens = lazy(() => import("./pages/professor/Mensagens"));
const ProfessorAvaliacoes = lazy(() => import("./pages/professor/Avaliacoes"));
const ProfessorPerfil = lazy(() => import("./pages/professor/Perfil"));
const ProfessorAlunoRelatorio = lazy(() => import("./pages/professor/RelatorioAluno"));
const ProfessorPos = lazy(() => import("./pages/professor/Pos"));
const Users = lazy(() => import("./pages/professor/Users"));
// Other pages
const ContaBloqueada = lazy(() => import("./pages/ContaBloqueada"));
const EmManutencao = lazy(() => import("./pages/EmManutencao"));
const Recuperar = lazy(() => import("./pages/RecuperarPassword"));
const Setup = lazy(() => import("./pages/Setup"));
const Landing = lazy(() => import("./pages/Landing"));
const RecuperarPassword = lazy(() => import("./pages/Recuperar"));

const queryClient = new QueryClient();

const Loader = () => (
  <div
  className="fixed inset-0 z-50 grid place-items-center bg-background/60 backdrop-blur-xl"
  role="status"
  aria-live="polite"
  aria-busy="true"
>
  {/* aurora suave */}
  <div
    className="absolute -inset-20 blur-3xl opacity-60"
    style={{ backgroundImage: "var(--gradient-hero)" }}
    aria-hidden
  />

  <div className="relative h-28 w-28">
    {/* anel principal com gradiente (vidro + glow) */}
    <div
      className="absolute inset-0 rounded-full animate-[spin_1.1s_linear_infinite] motion-reduce:animate-none"
      style={{
        backgroundImage: "var(--gradient-hero)",
        WebkitMask:
          "radial-gradient(farthest-side, transparent 58%, #000 60%)",
        mask: "radial-gradient(farthest-side, transparent 58%, #000 60%)",
        filter: "drop-shadow(0 10px 30px rgba(0,0,0,.35))",
      }}
      aria-hidden
    />

    {/* anel interior fino (contra-rotação) */}
    <div
      className="absolute inset-3 rounded-full animate-[spin_1.3s_linear_infinite_reverse] opacity-70 motion-reduce:animate-none"
      style={{
        backgroundImage: "var(--gradient-hero)",
        WebkitMask:
          "radial-gradient(farthest-side, transparent 72%, #000 74%)",
        mask: "radial-gradient(farthest-side, transparent 72%, #000 74%)",
        boxShadow: "var(--shadow-elegant)",
      }}
      aria-hidden
    />

    {/* satélites em órbita */}
    <div className="absolute inset-0 animate-[spin_2.2s_linear_infinite] motion-reduce:animate-none" aria-hidden>
      <span
        className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-md"
        style={{ transform: "translate(-50%, -50%) translateY(-46px)" }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow"
        style={{ transform: "translate(-50%, -50%) rotate(120deg) translateY(-46px)" }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 shadow"
        style={{ transform: "translate(-50%, -50%) rotate(240deg) translateY(-46px)" }}
      />
    </div>

    {/* núcleo com logotipo */}
    <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-2xl shadow-[var(--shadow-elegant)] flex items-center justify-center overflow-hidden">
      <img
        src="https://qzvikwxwvwmngbnyxpwr.supabase.co/storage/v1/object/sign/static/logo_cores.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lODBjMDg3My1kM2U4LTQ5OWMtODczNy0xYWRlMDUwMGUxNGMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzdGF0aWMvbG9nb19jb3Jlcy5wbmciLCJpYXQiOjE3NTU5NjIzOTAsImV4cCI6MTc4NzQ5ODM5MH0.Ly40AcA7GdZLXriGVuRbNRcIoPdoPORVmIY93az-Fpg"
        alt="Logo"
        className="h-8 w-8 object-contain"
      />
    </div>
  </div>

  <span className="sr-only">A carregar…</span>
</div>
);


export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {/* Se só quiseres um sistema de toasts, remove o outro */}
          <ToastToaster />
          <SonnerToaster />

          <BrowserRouter>
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route path="/" element={<Landing />} />

                <Route path="/aluno" element={<StudentLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="horario" element={<Horario />} />
                  <Route path="materiais" element={<Materiais />} />
                  <Route path="materiais/:id" element={<MaterialDetalhe />} />
                  <Route path="/aluno/quiz/:id" element={<QuizPage />} />
                  <Route path="recursos" element={<Recursos />} />
                  <Route path="cursos" element={<Cursos />} />
                  <Route path="cursos/:id" element={<CursoDetalhe />} />
                  <Route path="mensagens" element={<Mensagens />} />

                  {/* Pagamentos com sub-routes para tab bar */}
                  <Route path="pagamentos">
                    <Route index element={<Pagamentos />} />
                    <Route path="pre-pago" element={<Pagamentos />} />
                    <Route path="pos-pago" element={<Pagamentos />} />
                  </Route>

                  <Route path="perfil" element={<Perfil />} />
                </Route>

                {/* Rotas extra */}
                <Route path="/conta-bloqueada" element={<ContaBloqueada />} />
                <Route path="/manutencao" element={<EmManutencao />} />
                <Route path="/recuperar-password" element={<Recuperar />} />
                <Route path="/setup" element={<Setup />} />
                <Route path="/auth" element={<Index />} />
                <Route path="/introduction" element={<Intro />} />
                <Route path="/recuperar" element={<RecuperarPassword />} />

                

                {/* Professor Routes */}
                <Route path="/professor" element={<ProfessorLayout />}>
                  <Route index element={<ProfessorDashboard />} />
                  <Route path="alunos" element={<ProfessorAlunos />} />
                  <Route path="horarios" element={<ProfessorHorarios />} />
                  <Route path="aulas" element={<ProfessorAulas />} />
                  <Route path="materiais" element={<ProfessorMateriais />} />
                  <Route path="mensagens" element={<ProfessorMensagens />} />
                  <Route path="avaliacoes" element={<ProfessorAvaliacoes />} />
                  <Route path="perfil" element={<ProfessorPerfil />} />
                  <Route path="alunos/:id" element={<ProfessorAlunoRelatorio />} />
                  <Route path="users" element={<Users />} />
                  <Route path="pos" element={<ProfessorPos />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
