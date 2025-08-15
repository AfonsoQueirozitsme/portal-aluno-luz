import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Search,
  BookOpen,
  Calendar,
  MessageCircle,
  TrendingUp,
  Clock,
  Mail,
  Phone,
  User,
  ChevronRight,
} from "lucide-react";

const mockStudents = [
  {
    id: "1",
    name: "Ana Silva",
    email: "ana.silva@email.com",
    phone: "912345678",
    course: "12º Ano - Ciências",
    subjects: ["Matemática", "Física"],
    status: "active",
    lastClass: "2024-01-15",
    totalClasses: 24,
    performance: "excellent",
    avatar: "👩‍🎓",
  },
  {
    id: "2",
    name: "João Santos",
    email: "joao.santos@email.com",
    phone: "923456789",
    course: "11º Ano - Ciências",
    subjects: ["Matemática", "Química"],
    status: "active",
    lastClass: "2024-01-14",
    totalClasses: 18,
    performance: "good",
    avatar: "👨‍🎓",
  },
  {
    id: "3",
    name: "Maria Costa",
    email: "maria.costa@email.com",
    phone: "934567890",
    course: "12º Ano - Humanidades",
    subjects: ["Português", "História"],
    status: "inactive",
    lastClass: "2024-01-10",
    totalClasses: 12,
    performance: "needs_improvement",
    avatar: "👩‍🎓",
  },
];

export default function ProfessorAlunos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const filteredStudents = mockStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.subjects.some(subject => subject.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Ativo</Badge>;
      case "inactive":
        return <Badge variant="outline" className="text-gray-600 border-gray-300">Inativo</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getPerformanceBadge = (performance: string) => {
    switch (performance) {
      case "excellent":
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Excelente</Badge>;
      case "good":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Bom</Badge>;
      case "needs_improvement":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">A melhorar</Badge>;
      default:
        return <Badge variant="outline">N/A</Badge>;
    }
  };

  return (
    <>
      <Helmet>
        <title>Gestão de Alunos - Professor | Centro de Explicações</title>
        <meta name="description" content="Gerir e acompanhar os seus alunos, progresso e comunicação" />
      </Helmet>

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Gestão de Alunos</h1>
          <p className="text-muted-foreground">
            Acompanhe o progresso e gerir a comunicação com os seus alunos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{mockStudents.length}</div>
              <p className="text-xs text-muted-foreground">
                {mockStudents.filter(s => s.status === 'active').length} ativos
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aulas Este Mês</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">54</div>
              <p className="text-xs text-muted-foreground">+12% vs mês anterior</p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance Média</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">8.2</div>
              <p className="text-xs text-muted-foreground">Em 10 valores</p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mensagens Pendentes</CardTitle>
              <MessageCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">3</div>
              <p className="text-xs text-muted-foreground">Requerem resposta</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, email ou disciplina..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Lista de Alunos
            </CardTitle>
            <CardDescription>
              {filteredStudents.length} aluno(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:bg-accent/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{student.avatar}</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{student.name}</span>
                        {getStatusBadge(student.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{student.course}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {student.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {student.phone}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Disciplinas:</span>
                        {student.subjects.map((subject, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">
                        {student.totalClasses} aulas
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Última: {new Date(student.lastClass).toLocaleDateString('pt-PT')}
                      </div>
                      <div className="mt-1">
                        {getPerformanceBadge(student.performance)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => console.log(`Enviar mensagem para ${student.name}`)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Mensagem
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStudent(student.id)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Operações frequentes para gestão de alunos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="flex-col h-auto py-4">
                <BookOpen className="h-6 w-6 mb-2 text-primary" />
                <span className="text-sm">Novo Material</span>
              </Button>
              <Button variant="outline" className="flex-col h-auto py-4">
                <Calendar className="h-6 w-6 mb-2 text-primary" />
                <span className="text-sm">Agendar Aula</span>
              </Button>
              <Button variant="outline" className="flex-col h-auto py-4">
                <MessageCircle className="h-6 w-6 mb-2 text-primary" />
                <span className="text-sm">Mensagem Grupo</span>
              </Button>
              <Button variant="outline" className="flex-col h-auto py-4">
                <TrendingUp className="h-6 w-6 mb-2 text-primary" />
                <span className="text-sm">Relatório</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}