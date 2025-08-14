import React from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  BookOpen,
  MessageCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function ProfessorDashboard() {
  const stats = [
    {
      title: "Total de Alunos",
      value: "24",
      change: "+2 este mês",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Aulas Esta Semana",
      value: "18",
      change: "6 pendentes",
      icon: Calendar,
      color: "text-green-600",
    },
    {
      title: "Materiais Criados",
      value: "47",
      change: "+5 esta semana",
      icon: BookOpen,
      color: "text-purple-600",
    },
    {
      title: "Mensagens",
      value: "12",
      change: "3 não lidas",
      icon: MessageCircle,
      color: "text-orange-600",
    },
  ];

  const todayClasses = [
    {
      time: "09:30",
      subject: "Matemática",
      student: "Ana Silva",
      type: "Individual",
      status: "scheduled",
    },
    {
      time: "11:00",
      subject: "Física",
      student: "João Santos",
      type: "Individual",
      status: "in-progress",
    },
    {
      time: "14:30",
      subject: "Matemática",
      student: "Maria Costa",
      type: "Individual",
      status: "scheduled",
    },
    {
      time: "16:00",
      subject: "Química",
      student: "Pedro Lima",
      type: "Individual",
      status: "completed",
    },
  ];

  const recentActivity = [
    {
      action: "Novo material carregado",
      details: "Exercícios de Álgebra - 11º ano",
      time: "há 30 min",
      type: "material",
    },
    {
      action: "Aula concluída",
      details: "Matemática com Ana Silva",
      time: "há 1 hora",
      type: "class",
    },
    {
      action: "Mensagem recebida",
      details: "De João Santos - Dúvida sobre exercício",
      time: "há 2 horas",
      type: "message",
    },
    {
      action: "Nova avaliação criada",
      details: "Teste de Física - 10º ano",
      time: "há 3 horas",
      type: "assessment",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline" className="text-blue-600 border-blue-200">Agendada</Badge>;
      case "in-progress":
        return <Badge variant="default" className="bg-green-100 text-green-700">Em curso</Badge>;
      case "completed":
        return <Badge variant="secondary">Concluída</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "material":
        return <BookOpen className="h-4 w-4 text-purple-600" />;
      case "class":
        return <Calendar className="h-4 w-4 text-green-600" />;
      case "message":
        return <MessageCircle className="h-4 w-4 text-orange-600" />;
      case "assessment":
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <>
      <Helmet>
        <title>Dashboard - Professor | Centro de Explicações</title>
        <meta name="description" content="Visão geral das suas aulas, alunos e atividades como professor" />
      </Helmet>

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta, Prof. Silva. Aqui está um resumo das suas atividades.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="glass-panel hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Today's Classes */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Aulas de Hoje
              </CardTitle>
              <CardDescription>
                {todayClasses.length} aulas agendadas para hoje
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayClasses.map((classItem, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-accent/20 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {classItem.time}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {classItem.subject}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {classItem.student} • {classItem.type}
                    </p>
                  </div>
                  {getStatusBadge(classItem.status)}
                </div>
              ))}
              <Button variant="outline" className="w-full mt-4">
                Ver todos os horários
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Atividade Recente
              </CardTitle>
              <CardDescription>
                Últimas ações e atualizações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/20 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {activity.action}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.details}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-4">
                Ver todas as atividades
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}