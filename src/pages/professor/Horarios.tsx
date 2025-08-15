import React from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Timetable from "@/components/Timetable";
import {
  Calendar,
  Plus,
  Clock,
  Users,
  BookOpen,
} from "lucide-react";

export default function ProfessorHorarios() {
  const professorSchedule = [
    {
      day: 'Segunda',
      slots: [
        { time: '09:00', subject: 'Matemática', student: 'Ana Silva', room: 'Sala 1', type: 'individual' },
        { time: '10:30', subject: 'Física', student: 'João Santos', room: 'Sala 2', type: 'individual' },
        { time: '14:00', subject: 'Matemática', student: 'Grupo A', room: 'Sala 3', type: 'group' },
        { time: '16:00', subject: 'Química', student: 'Pedro Lima', room: 'Sala 1', type: 'individual' },
      ]
    },
    {
      day: 'Terça',
      slots: [
        { time: '09:30', subject: 'Física', student: 'Maria Costa', room: 'Sala 2', type: 'individual' },
        { time: '11:00', subject: 'Matemática', student: 'Carlos Sousa', room: 'Sala 1', type: 'individual' },
        { time: '15:30', subject: 'Química', student: 'Grupo B', room: 'Sala 3', type: 'group' },
      ]
    },
    {
      day: 'Quarta',
      slots: [
        { time: '08:30', subject: 'Matemática', student: 'Ana Silva', room: 'Sala 1', type: 'individual' },
        { time: '10:00', subject: 'Física', student: 'João Santos', room: 'Sala 2', type: 'individual' },
        { time: '13:30', subject: 'Matemática', student: 'Preparação Exames', room: 'Sala 3', type: 'group' },
        { time: '15:00', subject: 'Química', student: 'Pedro Lima', room: 'Sala 1', type: 'individual' },
      ]
    },
    {
      day: 'Quinta',
      slots: [
        { time: '09:00', subject: 'Física', student: 'Maria Costa', room: 'Sala 2', type: 'individual' },
        { time: '11:30', subject: 'Matemática', student: 'Carlos Sousa', room: 'Sala 1', type: 'individual' },
        { time: '14:30', subject: 'Química', student: 'Grupo B', room: 'Sala 3', type: 'group' },
        { time: '16:30', subject: 'Matemática', student: 'Ana Silva', room: 'Sala 1', type: 'individual' },
      ]
    },
    {
      day: 'Sexta',
      slots: [
        { time: '09:30', subject: 'Física', student: 'João Santos', room: 'Sala 2', type: 'individual' },
        { time: '11:00', subject: 'Matemática', student: 'Revisões', room: 'Sala 1', type: 'group' },
        { time: '15:00', subject: 'Química', student: 'Pedro Lima', room: 'Sala 1', type: 'individual' },
      ]
    },
    {
      day: 'Sábado',
      slots: [
        { time: '10:00', subject: 'Matemática', student: 'Preparação Exames', room: 'Sala 3', type: 'group' },
        { time: '11:30', subject: 'Física', student: 'Revisões Gerais', room: 'Sala 2', type: 'group' },
      ]
    },
    {
      day: 'Domingo',
      slots: []
    }
  ];

  const weekStats = {
    totalClasses: 23,
    individualClasses: 16,
    groupClasses: 7,
    totalHours: 34.5,
  };

  const getClassTypeColor = (type: string) => {
    return type === 'individual' 
      ? 'bg-blue-100 text-blue-800 border-blue-200' 
      : 'bg-purple-100 text-purple-800 border-purple-200';
  };

  return (
    <>
      <Helmet>
        <title>Horários - Professor | Centro de Explicações</title>
        <meta name="description" content="Gerir os seus horários de aulas e disponibilidade" />
      </Helmet>

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Horários</h1>
            <p className="text-muted-foreground">
              Gerir os seus horários de aulas e disponibilidade
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Definir Disponibilidade
            </Button>
            <Button className="bg-gradient-hero hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Nova Aula
            </Button>
          </div>
        </div>

        {/* Week Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{weekStats.totalClasses}</div>
                  <p className="text-sm text-muted-foreground">Total de Aulas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{weekStats.individualClasses}</div>
                  <p className="text-sm text-muted-foreground">Aulas Individuais</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{weekStats.groupClasses}</div>
                  <p className="text-sm text-muted-foreground">Aulas de Grupo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{weekStats.totalHours}h</div>
                  <p className="text-sm text-muted-foreground">Horas Semanais</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timetable */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Horário Semanal
            </CardTitle>
            <CardDescription>
              Vista geral das suas aulas para esta semana
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Timetable 
              schedule={professorSchedule}
              renderSlot={(slot) => (
                <div className="p-2 h-full">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">
                      {slot.subject}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getClassTypeColor(slot.type)}`}
                    >
                      {slot.type === 'individual' ? 'Individual' : 'Grupo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {slot.student}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{slot.time}</span>
                    <span className="text-muted-foreground">{slot.room}</span>
                  </div>
                </div>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}