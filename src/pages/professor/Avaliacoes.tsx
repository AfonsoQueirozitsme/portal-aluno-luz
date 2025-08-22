import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  ClipboardCheck,
  TrendingUp,
  Award,
  BarChart3,
  MoreVertical,
  Eye,
  Edit,
  FileText,
} from "lucide-react";

export default function ProfessorAvaliacoes() {
  const [searchTerm, setSearchTerm] = useState("");

  const assessments = [
    {
      id: 1,
      title: "Teste de Álgebra Linear",
      subject: "Matemática",
      year: "11º ano",
      type: "Teste",
      date: "2024-01-20",
      studentsCount: 8,
      completedCount: 6,
      averageScore: 14.2,
      maxScore: 20,
      status: "active",
    },
    {
      id: 2,
      title: "Quiz de Leis de Newton",
      subject: "Física",
      year: "10º ano",
      type: "Quiz",
      date: "2024-01-18",
      studentsCount: 5,
      completedCount: 5,
      averageScore: 16.8,
      maxScore: 20,
      status: "completed",
    },
    {
      id: 3,
      title: "Avaliação de Ligações Químicas",
      subject: "Química",
      year: "11º ano",
      type: "Teste",
      date: "2024-01-15",
      studentsCount: 6,
      completedCount: 6,
      averageScore: 13.5,
      maxScore: 20,
      status: "completed",
    },
    {
      id: 4,
      title: "Exercícios de Funções",
      subject: "Matemática",
      year: "12º ano",
      type: "Exercícios",
      date: "2024-01-25",
      studentsCount: 4,
      completedCount: 0,
      averageScore: 0,
      maxScore: 20,
      status: "draft",
    },
  ];

  const studentResults = [
    {
      id: 1,
      name: "Ana Silva",
      avatar: "/avatars/ana.jpg",
      assessmentId: 1,
      score: 16,
      maxScore: 20,
      completedAt: "2024-01-20 14:30",
      timeSpent: "45 min",
      status: "completed",
    },
    {
      id: 2,
      name: "João Santos",
      avatar: "/avatars/joao.jpg",
      assessmentId: 1,
      score: 12,
      maxScore: 20,
      completedAt: "2024-01-20 15:15",
      timeSpent: "52 min",
      status: "completed",
    },
    {
      id: 3,
      name: "Maria Costa",
      avatar: "/avatars/maria.jpg",
      assessmentId: 1,
      score: 18,
      maxScore: 20,
      completedAt: "2024-01-20 16:00",
      timeSpent: "38 min",
      status: "completed",
    },
    {
      id: 4,
      name: "Pedro Lima",
      avatar: "/avatars/pedro.jpg",
      assessmentId: 1,
      score: 14,
      maxScore: 20,
      completedAt: "2024-01-21 10:20",
      timeSpent: "48 min",
      status: "completed",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700">Ativo</Badge>;
      case "completed":
        return <Badge variant="secondary">Concluído</Badge>;
      case "draft":
        return <Badge variant="outline">Rascunho</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 85) return "text-green-600";
    if (percentage >= 70) return "text-blue-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const filteredAssessments = assessments.filter(assessment =>
    assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Avaliações - Professor | Árvore do Conhecimento</title>
        <meta name="description" content="Criar e gerir avaliações dos seus alunos" />
      </Helmet>

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Avaliações</h1>
            <p className="text-muted-foreground">
              Criar e gerir avaliações dos seus alunos
            </p>
          </div>
          <Button className="bg-gradient-hero hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            Nova Avaliação
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar avaliações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{assessments.length}</div>
                  <p className="text-sm text-muted-foreground">Total Avaliações</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {assessments.filter(a => a.status === 'completed').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Concluídas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">15.1</div>
                  <p className="text-sm text-muted-foreground">Média Geral</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {assessments.filter(a => a.status === 'active').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="assessments" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assessments">Avaliações</TabsTrigger>
            <TabsTrigger value="results">Resultados</TabsTrigger>
          </TabsList>

          <TabsContent value="assessments">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Lista de Avaliações</CardTitle>
                <CardDescription>
                  {filteredAssessments.length} avaliações encontradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Disciplina</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Média</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssessments.map((assessment) => (
                      <TableRow key={assessment.id} className="hover:bg-accent/20">
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{assessment.title}</p>
                            <p className="text-sm text-muted-foreground">{assessment.year}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{assessment.subject}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{assessment.type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(assessment.date).toLocaleDateString('pt-PT')}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>{assessment.completedCount}/{assessment.studentsCount}</span>
                              <span>{Math.round((assessment.completedCount / assessment.studentsCount) * 100)}%</span>
                            </div>
                            <Progress 
                              value={(assessment.completedCount / assessment.studentsCount) * 100} 
                              className="h-2"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {assessment.status === 'completed' ? (
                            <span className={`font-medium ${getScoreColor(assessment.averageScore, assessment.maxScore)}`}>
                              {assessment.averageScore.toFixed(1)}/{assessment.maxScore}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(assessment.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem className="flex items-center gap-2">
                                <Edit className="h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Relatório
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Resultados dos Alunos</CardTitle>
                <CardDescription>
                  Resultados detalhados das avaliações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Avaliação</TableHead>
                      <TableHead>Pontuação</TableHead>
                      <TableHead>Tempo</TableHead>
                      <TableHead>Concluído em</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentResults.map((result) => {
                      const assessment = assessments.find(a => a.id === result.assessmentId);
                      return (
                        <TableRow key={result.id} className="hover:bg-accent/20">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={result.avatar} alt={result.name} />
                                <AvatarFallback className="bg-gradient-hero text-white">
                                  {result.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-foreground">{result.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{assessment?.title}</p>
                              <p className="text-sm text-muted-foreground">{assessment?.subject}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${getScoreColor(result.score, result.maxScore)}`}>
                                {result.score}/{result.maxScore}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                ({Math.round((result.score / result.maxScore) * 100)}%)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {result.timeSpent}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(result.completedAt).toLocaleString('pt-PT')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">Concluído</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}