import React from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Book,
  Award,
  Clock,
  Users,
  Edit,
  Camera,
  Save,
} from "lucide-react";

export default function ProfessorPerfil() {
  const professorData = {
    name: "Prof. João Silva",
    email: "joao.silva@centrodeexplicacoes.pt",
    phone: "+351 912 345 678",
    address: "Rua das Flores 123, 1200-200 Lisboa",
    birthDate: "1985-03-15",
    joinDate: "2020-09-01",
    bio: "Professor de Matemática e Física com mais de 10 anos de experiência no ensino secundário. Especializado em preparação para exames nacionais e apoio a alunos com dificuldades de aprendizagem.",
    subjects: ["Matemática", "Física", "Estatística"],
    qualifications: [
      "Licenciatura em Matemática - Universidade de Lisboa",
      "Mestrado em Ensino de Matemática - Instituto Superior Técnico",
      "Formação em Necessidades Educativas Especiais",
    ],
    avatar: "/avatars/professor.jpg",
  };

  const stats = [
    {
      label: "Anos de Experiência",
      value: "10+",
      icon: Calendar,
      color: "text-blue-600",
    },
    {
      label: "Alunos Ativos",
      value: "24",
      icon: Users,
      color: "text-green-600",
    },
    {
      label: "Horas Lecionadas",
      value: "1,250+",
      icon: Clock,
      color: "text-purple-600",
    },
    {
      label: "Taxa de Sucesso",
      value: "95%",
      icon: Award,
      color: "text-orange-600",
    },
  ];

  return (
    <>
      <Helmet>
        <title>Perfil - Professor | Árvore do Conhecimento</title>
        <meta name="description" content="Gerir o seu perfil e informações pessoais" />
      </Helmet>

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Perfil</h1>
            <p className="text-muted-foreground">
              Gerir o seu perfil e informações pessoais
            </p>
          </div>
          <Button className="bg-gradient-hero hover:opacity-90">
            <Edit className="h-4 w-4 mr-2" />
            Editar Perfil
          </Button>
        </div>

        {/* Profile Overview */}
        <Card className="glass-panel">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Avatar and Basic Info */}
              <div className="flex flex-col items-center lg:items-start gap-4">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={professorData.avatar} alt={professorData.name} />
                    <AvatarFallback className="bg-gradient-hero text-white text-2xl">
                      {professorData.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <Button 
                    size="sm" 
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 bg-gradient-hero hover:opacity-90"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-center lg:text-left">
                  <h2 className="text-2xl font-bold text-foreground">{professorData.name}</h2>
                  <p className="text-muted-foreground">Professor de Matemática e Física</p>
                  <div className="flex flex-wrap gap-2 mt-2 justify-center lg:justify-start">
                    {professorData.subjects.map((subject, index) => (
                      <Badge key={index} variant="outline">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.map((stat, index) => (
                    <Card key={index} className="glass-panel text-center">
                      <CardContent className="p-4">
                        <stat.icon className={`h-8 w-8 mx-auto mb-2 ${stat.color}`} />
                        <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Bio */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Sobre</h3>
                  <p className="text-muted-foreground leading-relaxed">{professorData.bio}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Information */}
        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Informações Pessoais</TabsTrigger>
            <TabsTrigger value="qualifications">Qualificações</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Informações Pessoais
                </CardTitle>
                <CardDescription>
                  Gerir as suas informações pessoais e de contacto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" defaultValue={professorData.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue={professorData.email} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" defaultValue={professorData.phone} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <Input id="birthDate" type="date" defaultValue={professorData.birthDate} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Morada</Label>
                  <Input id="address" defaultValue={professorData.address} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Biografia</Label>
                  <Textarea 
                    id="bio" 
                    defaultValue={professorData.bio}
                    rows={4}
                    placeholder="Conte-nos um pouco sobre si..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline">Cancelar</Button>
                  <Button className="bg-gradient-hero hover:opacity-90">
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qualifications">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Qualificações e Experiência
                </CardTitle>
                <CardDescription>
                  As suas qualificações académicas e profissionais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Subjects */}
                <div>
                  <Label className="text-base font-medium">Disciplinas Lecionadas</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {professorData.subjects.map((subject, index) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        <Book className="h-3 w-3 mr-1" />
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Qualifications */}
                <div>
                  <Label className="text-base font-medium">Formação Académica</Label>
                  <div className="space-y-3 mt-2">
                    {professorData.qualifications.map((qualification, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-accent/20">
                        <Award className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{qualification}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Experience */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/20">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        {new Date(professorData.joinDate).toLocaleDateString('pt-PT')}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Anos de Experiência</Label>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/20">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        {new Date().getFullYear() - new Date(professorData.joinDate).getFullYear()} anos
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline">Adicionar Qualificação</Button>
                  <Button className="bg-gradient-hero hover:opacity-90">
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Configurações da Conta</CardTitle>
                <CardDescription>
                  Gerir as configurações da sua conta e preferências
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-border/40 rounded-lg">
                    <div>
                      <h4 className="font-medium text-foreground">Notificações por Email</h4>
                      <p className="text-sm text-muted-foreground">
                        Receber notificações sobre novas mensagens e aulas
                      </p>
                    </div>
                    <Button variant="outline" size="sm">Configurar</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border/40 rounded-lg">
                    <div>
                      <h4 className="font-medium text-foreground">Disponibilidade</h4>
                      <p className="text-sm text-muted-foreground">
                        Definir os seus horários de disponibilidade
                      </p>
                    </div>
                    <Button variant="outline" size="sm">Definir</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border/40 rounded-lg">
                    <div>
                      <h4 className="font-medium text-foreground">Palavra-passe</h4>
                      <p className="text-sm text-muted-foreground">
                        Alterar a sua palavra-passe de acesso
                      </p>
                    </div>
                    <Button variant="outline" size="sm">Alterar</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-destructive/40 rounded-lg">
                    <div>
                      <h4 className="font-medium text-destructive">Eliminar Conta</h4>
                      <p className="text-sm text-muted-foreground">
                        Eliminar permanentemente a sua conta
                      </p>
                    </div>
                    <Button variant="destructive" size="sm">Eliminar</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}