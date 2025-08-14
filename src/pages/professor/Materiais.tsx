import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  Upload,
  FileText,
  Image,
  Video,
  Download,
  Eye,
  MoreVertical,
  Filter,
  Grid3X3,
  List,
} from "lucide-react";

export default function ProfessorMateriais() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const materials = [
    {
      id: 1,
      title: "Exercícios de Álgebra Linear",
      type: "PDF",
      subject: "Matemática",
      year: "11º ano",
      size: "2.3 MB",
      downloads: 45,
      uploadDate: "2024-01-10",
      icon: FileText,
      color: "text-red-600",
      description: "Conjunto de exercícios sobre matrizes e determinantes",
    },
    {
      id: 2,
      title: "Vídeo Aula - Leis de Newton",
      type: "MP4",
      subject: "Física",
      year: "10º ano",
      size: "156 MB",
      downloads: 32,
      uploadDate: "2024-01-08",
      icon: Video,
      color: "text-purple-600",
      description: "Explicação das três leis fundamentais da mecânica",
    },
    {
      id: 3,
      title: "Diagrama de Ligações Químicas",
      type: "PNG",
      subject: "Química",
      year: "11º ano",
      size: "1.8 MB",
      downloads: 28,
      uploadDate: "2024-01-05",
      icon: Image,
      color: "text-green-600",
      description: "Representação visual dos tipos de ligações químicas",
    },
    {
      id: 4,
      title: "Resumo de Funções Trigonométricas",
      type: "PDF",
      subject: "Matemática",
      year: "12º ano",
      size: "1.2 MB",
      downloads: 67,
      uploadDate: "2024-01-03",
      icon: FileText,
      color: "text-red-600",
      description: "Resumo completo com fórmulas e exemplos práticos",
    },
    {
      id: 5,
      title: "Experiência Virtual - Ácidos e Bases",
      type: "HTML",
      subject: "Química",
      year: "10º ano",
      size: "5.4 MB",
      downloads: 41,
      uploadDate: "2024-01-01",
      icon: FileText,
      color: "text-blue-600",
      description: "Simulação interativa de reações ácido-base",
    },
    {
      id: 6,
      title: "Exercícios de Ondas e Som",
      type: "PDF",
      subject: "Física",
      year: "11º ano",
      size: "3.1 MB",
      downloads: 39,
      uploadDate: "2023-12-28",
      icon: FileText,
      color: "text-red-600",
      description: "Problemas práticos sobre propagação de ondas",
    },
  ];

  const subjects = ["Todas", "Matemática", "Física", "Química"];
  const years = ["Todos", "10º ano", "11º ano", "12º ano"];

  const filteredMaterials = materials.filter(material =>
    material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case "PDF":
        return "bg-red-100 text-red-700 border-red-200";
      case "MP4":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "PNG":
      case "JPG":
        return "bg-green-100 text-green-700 border-green-200";
      case "HTML":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const MaterialCard = ({ material }: { material: any }) => {
    const IconComponent = material.icon;
    
    return (
      <Card className="glass-panel hover-lift cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <IconComponent className={`h-6 w-6 ${material.color}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">
                  {material.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-xs ${getTypeColor(material.type)}`}>
                    {material.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{material.size}</span>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Descarregar
                </DropdownMenuItem>
                <DropdownMenuItem>Editar</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Eliminar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {material.description}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>{material.subject}</span>
              <span>{material.year}</span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              <span>{material.downloads}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Helmet>
        <title>Materiais - Professor | Centro de Explicações</title>
        <meta name="description" content="Gerir e partilhar materiais educativos com os seus alunos" />
      </Helmet>

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Materiais</h1>
            <p className="text-muted-foreground">
              Gerir e partilhar materiais educativos com os seus alunos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Carregar Ficheiro
            </Button>
            <Button className="bg-gradient-hero hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Criar Material
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar materiais por título, disciplina ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{materials.length}</div>
                  <p className="text-sm text-muted-foreground">Total Materiais</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Download className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {materials.reduce((sum, m) => sum + m.downloads, 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Downloads</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Video className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {materials.filter(m => m.type === 'MP4').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Vídeos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Upload className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">5</div>
                  <p className="text-sm text-muted-foreground">Este Mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Materials by Subject */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="math">Matemática</TabsTrigger>
            <TabsTrigger value="physics">Física</TabsTrigger>
            <TabsTrigger value="chemistry">Química</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {viewMode === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMaterials.map((material) => (
                  <MaterialCard key={material.id} material={material} />
                ))}
              </div>
            ) : (
              <Card className="glass-panel">
                <CardContent className="p-0">
                  <div className="space-y-2">
                    {filteredMaterials.map((material, index) => (
                      <div
                        key={material.id}
                        className={`flex items-center justify-between p-4 hover:bg-accent/20 transition-colors ${
                          index !== filteredMaterials.length - 1 ? 'border-b border-border/40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <material.icon className={`h-8 w-8 ${material.color}`} />
                          <div>
                            <p className="font-medium text-foreground">{material.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={`text-xs ${getTypeColor(material.type)}`}>
                                {material.type}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {material.subject} • {material.year} • {material.size}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              {material.downloads} downloads
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(material.uploadDate).toLocaleDateString('pt-PT')}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Visualizar</DropdownMenuItem>
                              <DropdownMenuItem>Descarregar</DropdownMenuItem>
                              <DropdownMenuItem>Editar</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Other tabs would filter by subject */}
          <TabsContent value="math">
            <p className="text-muted-foreground">Materiais de Matemática</p>
          </TabsContent>
          
          <TabsContent value="physics">
            <p className="text-muted-foreground">Materiais de Física</p>
          </TabsContent>
          
          <TabsContent value="chemistry">
            <p className="text-muted-foreground">Materiais de Química</p>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
