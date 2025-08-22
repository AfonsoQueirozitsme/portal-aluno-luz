import React from "react";
import { Outlet } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ProfessorSidebar } from "@/components/ProfessorSidebar";

export default function ProfessorLayout() {
  return (
    <>
      <Helmet>
        <title>Professor - Árvore do Conhecimento</title>
        <meta name="description" content="Área reservada para professores - gerir alunos, aulas e materiais" />
      </Helmet>
      
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
          <ProfessorSidebar />
          <main className="flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </SidebarProvider>
    </>
  );
}