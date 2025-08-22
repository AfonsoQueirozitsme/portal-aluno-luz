import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Calendar,
  Clock,
  MapPin,
  MoreVertical,
  CheckCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
} from "lucide-react";

export default function ProfessorAulas() {
  const [searchTerm, setSearchTerm] = useState("");

  const classes = [
    {
      id: 1,
      subject: "Matemática",
      student: "Ana Silva",
      studentAvatar: "/avatars/ana.jpg",
      date: "2024-01-15",
      time: "09:30",
      duration: "1h30",
      room: "Sala 1",
      type: "Individual",
      status: "scheduled",
      notes: "Revisão de funções quadráticas",
    },
    {
      id: 2,
      subject: "Física",
      student: "João Santos",
      studentAvatar: "/avatars/joao.jpg",
      date: "2024-01-15",
      time: "11:00",
      duration: "1h",
      room: "Sala 2",
      type: "Individual",
      status: "in-progress",
      notes: "Leis de Newton",
    },
    {
      id: 3,
      subject: "Matemática",
      student: "Grupo A (5 alunos)",
      studentAvatar: null,
      date: "2024-01-15",
      time: "14:30",
      duration: "2h",
      room: "Sala 3",
      type: "Grupo",
      status: "completed",
      notes: "Preparação para exame nacional",
    },
    {
      id: 4,
      subject: "Química",
      student: "Pedro Lima",
      studentAvatar: "/avatars/pedro.jpg",
      date: "2024-01-16",
      time: "16:00",
      duration: "1h30",
      room: "Sala 1",
      type: "Individual",
      status: "scheduled",
      notes: "Reações ácido-base",
    },
    {
      id: 5,
      subject: "Física",
      student: "Maria Costa",
      studentAvatar: "/avatars/maria.jpg",
      date: "2024-01-16",
      time: "10:30",
      duration: "1h",
      room: "Sala 2",
      type: "Individual",
      status: "cancelled",
      notes: "Cancelada pelo aluno",
    },
  ];

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "scheduled":
        return {
          label: "Agendada",
          variant: "outline" as const,
          className: "text-blue-600 border-blue-200",
          icon: <Calendar className="h-3 w-3" />
        };
      case "in-progress":
        return {
          label: "Em curso",
          variant: "default" as const,
          className: "bg-green-100 text-green-700",
          icon: <PlayCircle className="h-3 w-3" />
        };
      case "completed":
        return {
          label: "Concluída",
          variant: "secondary" as const,
          className: "",
          icon: <CheckCircle className="h-3 w-3" />
        };
      case "cancelled":
        return {
          label: "Cancelada",
          variant: "destructive" as const,
          className: "",
          icon: <XCircle className="h-3 w-3" />
        };
      default:
        return {
          label: "Desconhecido",
          variant: "outline" as const,
          className: "",
          icon: <Clock className="h-3 w-3" />
        };
    }
  };

  const filterClassesByStatus = (status?: string) => {
    let filtered = classes;
    
    if (status) {
      filtered = filtered.filter(cls => cls.status === status);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(cls =>
        cls.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.room.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const todayClasses = filterClassesByStatus();
  const scheduledClasses = filterClassesByStatus("scheduled");
  const completedClasses = filterClassesByStatus("completed");

  return (
    <>
      <Helmet>
        <title>Aulas - Professor | Árvore do Conhecimento</title>
        <meta name="description" content="Gerir as suas aulas, horários e sessões com alunos" />
      </Helmet>

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Aulas</h1>
            <p className="text-muted-foreground">
              Gerir as suas aulas, horários e sessões com alunos
            </p>
          </div>
          <Button className="bg-gradient-hero hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            Agendar Aula
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por disciplina, aluno ou sala..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {scheduledClasses.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Agendadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <PlayCircle className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {classes.filter(c => c.status === 'in-progress').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Em Curso</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {completedClasses.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Concluídas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">12h</div>
                  <p className="text-sm text-muted-foreground">Esta Semana</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Classes Tabs */}
        <Tabs defaultValue="today" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Todas as Aulas</TabsTrigger>
            <TabsTrigger value="scheduled">Agendadas</TabsTrigger>
            <TabsTrigger value="completed">Concluídas</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Todas as Aulas</CardTitle>
                <CardDescription>
                  {todayClasses.length} aulas encontradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Disciplina</TableHead>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayClasses.map((classItem) => {
                      const statusInfo = getStatusInfo(classItem.status);
                      return (
                        <TableRow key={classItem.id} className="hover:bg-accent/20">
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{classItem.subject}</p>
                              <p className="text-sm text-muted-foreground">{classItem.notes}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {classItem.studentAvatar ? (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={classItem.studentAvatar} alt={classItem.student} />
                                  <AvatarFallback>
                                    {classItem.student.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-gradient-hero flex items-center justify-center">
                                  <span className="text-white text-xs font-medium">G</span>
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-foreground">{classItem.student}</p>
                                <Badge variant="outline" className="text-xs">
                                  {classItem.type}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">
                                {new Date(classItem.date).toLocaleDateString('pt-PT')}
                              </p>
                              <p className="text-sm text-muted-foreground">{classItem.time}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{classItem.duration}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{classItem.room}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={statusInfo.variant} 
                              className={`flex items-center gap-1 ${statusInfo.className}`}
                            >
                              {statusInfo.icon}
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                                <DropdownMenuItem>Editar Aula</DropdownMenuItem>
                                <DropdownMenuItem>Reagendar</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  Cancelar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Aulas Agendadas</CardTitle>
                <CardDescription>
                  {scheduledClasses.length} aulas agendadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Same table structure with filtered data */}
                <p className="text-muted-foreground">Apenas aulas com status "Agendada"</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Aulas Concluídas</CardTitle>
                <CardDescription>
                  {completedClasses.length} aulas concluídas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Same table structure with filtered data */}
                <p className="text-muted-foreground">Histórico de aulas concluídas</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}