import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient"; // ajusta o path conforme o teu projeto
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, Clock, ArrowRight } from "lucide-react";
import studentHero from "@/assets/student-hero.jpg";
import GlowCursor from "@/components/GlowCursor";
import { Link } from "react-router-dom";

const canonical = () => `${window.location.origin}/aluno`;

const Dashboard = () => {
  const [nomeAluno, setNomeAluno] = useState<string>("");

  const proximo = { disciplina: "Matemática", dia: "Quarta-feira", data: "21 Ago", hora: "17:30" };

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Aqui assumes que tens o nome na tabela "users" com a coluna "nome"
      const { data, error } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (!error && data?.full_name) {
        setNomeAluno(data.full_name);
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="relative">
      <Helmet>
        <title>Área do Aluno | Dashboard - Árvore do Conhecimento</title>
        <meta name="description" content="Acompanhe aulas, horários, progresso e pagamentos na sua Área do Aluno." />
        <link rel="canonical" href={canonical()} />
      </Helmet>

      <section className="relative overflow-hidden rounded-xl border bg-card">
        <div className="grid md:grid-cols-2 gap-6 p-6 md:p-8">
          <div className="flex flex-col justify-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">
              {nomeAluno ? `Bem-vindo(a), ${nomeAluno}` : "Bem-vindo(a) à sua Área do Aluno"}
            </h1>
            <p className="text-muted-foreground">
              Consulte o seu horário, materiais, comunicações e acompanhe o seu progresso.
            </p>
            <div className="flex gap-3">
              <Button asChild variant="hero">
                <Link to="/aluno/horario" className="inline-flex items-center">
                  Ver horário completo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/aluno/materiais">Materiais</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <img
              src={studentHero}
              alt="Ilustração da Área do Aluno com computador, calendário e gráficos"
              className="w-full h-56 md:h-64 object-cover rounded-lg shadow"
              loading="lazy"
            />
            <GlowCursor />
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Próxima aula</CardTitle>
            <CardDescription>Prepare-se para a sessão</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4" /> {proximo.dia}, {proximo.data}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" /> {proximo.hora}
            </div>
            <div className="text-sm">
              Disciplina: <span className="font-medium">{proximo.disciplina}</span>
            </div>
            <Button asChild variant="secondary" className="mt-2">
              <Link to="/aluno/aulas">Ver detalhes</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Progresso semanal</CardTitle>
            <CardDescription>Horas de estudo concluídas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2 text-sm">6 / 8 horas</div>
            <Progress value={75} />
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Atalhos</CardTitle>
            <CardDescription>Acesso rápido</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline">
              <Link to="/aluno/mensagens">Mensagens</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/aluno/pagamentos">Pagamentos</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/aluno/perfil">Perfil</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Dashboard;
