// file: src/pages/Professor/Alunos.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  BookOpen,
  Calendar,
  MessageCircle,
  TrendingUp,
  Mail,
  Phone,
  ChevronRight,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type StudentRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  course: string | null;
  subjects: string[];
  status: "active" | "inactive";
  lastClass: string | null; // ISO
  totalClasses: number;
  performance: "excellent" | "good" | "needs_improvement" | "unknown";
  avatar: string;
};

export default function ProfessorAlunos() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [professorProfileId, setProfessorProfileId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);

  // Estado do modal "Adicionar Encarregado"
  const [openGuardian, setOpenGuardian] = useState(false);
  const [submittingGuardian, setSubmittingGuardian] = useState(false);
  const [gName, setGName] = useState("");
  const [gEmail, setGEmail] = useState("");

  // Base das rotas pedidas
  const MSG_BASE = "/professor/mensagens";

  useEffect(() => {
    let cancel = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        // 0) Sessão atual
        const { data: sess, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        const user = sess?.session?.user;
        if (!user) {
          navigate("/");
          return;
        }

        // 0.1) Perfil do professor autenticado
        const { data: myProfiles, error: myProfErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (myProfErr) throw myProfErr;
        const myProfId = myProfiles?.[0]?.id ?? null;
        setProfessorProfileId(myProfId);

        // 1) Perfis de alunos (assumimos level = 0)
        const { data: profiles, error: pErr } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, course, updated_at, created_at")
          .eq("level", 0);

        if (pErr) throw pErr;

        const base: StudentRow[] = (profiles ?? []).map((p: any) => ({
          id: p.id,
          name: p.full_name ?? null,
          email: p.email ?? null,
          phone: p.phone ?? null,
          course: p.course ?? null,
          subjects: [],
          status: "inactive",
          lastClass: null,
          totalClasses: 0,
          performance: "unknown",
          avatar: "👨‍🎓",
        }));

        if (base.length === 0) {
          if (!cancel) {
            setStudents([]);
            setLoading(false);
          }
          return;
        }

        const profileIds = base.map((b) => b.id);

        // 2) Aulas agendadas
        const { data: sched, error: sErr } = await supabase
          .from("scheduled_lessons")
          .select("profile_id, starts_at")
          .in("profile_id", profileIds);

        if (sErr) throw sErr;

        // 3) Recorrências (padrão semanal) + subjects
        const { data: rec, error: rErr } = await supabase
          .from("recurring_lessons")
          .select("profile_id, subject_id")
          .in("profile_id", profileIds);

        if (rErr) throw rErr;

        // 4) Mapear subject_id → nome
        const subjectIds = Array.from(
          new Set((rec ?? []).map((x) => x.subject_id).filter(Boolean))
        ) as string[];

        let subjectMap = new Map<string, string>();
        if (subjectIds.length > 0) {
          const { data: subjs, error: subjErr } = await supabase
            .from("subjects")
            .select("id, name")
            .in("id", subjectIds);
          if (subjErr) throw subjErr;
          subjectMap = new Map((subjs ?? []).map((s) => [s.id, s.name]));
        }

        // 5) Agregar info
        const nowIso = new Date().toISOString();
        const byId: Record<string, StudentRow> = Object.fromEntries(
          base.map((b) => [b.id, { ...b }])
        );

        (sched ?? []).forEach((row: any) => {
          const item = byId[row.profile_id];
          if (!item) return;
          item.totalClasses += 1;
          if (!item.lastClass || row.starts_at > item.lastClass) {
            item.lastClass = row.starts_at;
          }
          if (row.starts_at > nowIso) {
            item.status = "active";
          }
        });

        (rec ?? []).forEach((row: any) => {
          const item = byId[row.profile_id];
          if (!item) return;
          const subjectName = row.subject_id ? subjectMap.get(row.subject_id) : undefined;
          if (subjectName && !item.subjects.includes(subjectName)) {
            item.subjects.push(subjectName);
          }
          if (item.status !== "active") item.status = "active";
        });

        Object.values(byId).forEach((item) => {
          if (item.totalClasses >= 25) item.performance = "excellent";
          else if (item.totalClasses >= 12) item.performance = "good";
          else if (item.totalClasses > 0) item.performance = "needs_improvement";
          else item.performance = "unknown";
        });

        if (!cancel) {
          setStudents(
            Object.values(byId).sort((a, b) =>
              (a.name || "").localeCompare(b.name || "", "pt")
            )
          );
          setLoading(false);
        }
      } catch (e: any) {
        console.error("[ProfessorAlunos] load error:", e);
        if (!cancel) {
          setErr("Erro a carregar alunos. Tenta novamente.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancel = true;
    };
  }, [navigate]);

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.course || "").toLowerCase().includes(q) ||
        s.subjects.some((subj) => subj.toLowerCase().includes(q))
    );
  }, [searchTerm, students]);

  const getStatusBadge = (status: StudentRow["status"]) => {
    switch (status) {
      case "active":
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Ativo</Badge>;
      case "inactive":
        return <Badge variant="outline" className="text-gray-600 border-gray-300">Inativo</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getPerformanceBadge = (performance: StudentRow["performance"]) => {
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

  // Submit do novo encarregado → chama Edge Function
  async function handleCreateGuardian(e: React.FormEvent) {
    e.preventDefault();
    const email = gEmail.trim().toLowerCase();
    if (!email) return alert("Indica o email do encarregado.");
    try {
      setSubmittingGuardian(true);

      const { error } = await supabase.functions.invoke("invite-guardian", {
        body: {
          full_name: gName.trim() || null,
          email,
        },
      });

      if (error) {
        console.error("invite-guardian error:", error);
        alert(error.message || "Falhou criar o encarregado.");
        return;
      }

      setOpenGuardian(false);
      setGName("");
      setGEmail("");
      alert("Convite enviado. O encarregado deve verificar o email.");
    } catch (e: any) {
      console.error(e);
      alert("Ocorreu um erro a criar o encarregado.");
    } finally {
      setSubmittingGuardian(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">A carregar…</CardContent>
        </Card>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Gestão de Alunos</CardTitle>
            <CardDescription>Ocorreu um erro</CardDescription>
          </CardHeader>
          <CardContent className="text-destructive">{err}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Gestão de Alunos - Professor | Árvore do Conhecimento</title>
        <meta name="description" content="Gerir e acompanhar os seus alunos, progresso e comunicação" />
      </Helmet>

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Gestão de Alunos</h1>
            <p className="text-muted-foreground">Acompanha o progresso e gere a comunicação com os teus alunos</p>
          </div>

          {/* Botão + modal Adicionar Encarregado */}
          <Dialog open={openGuardian} onOpenChange={setOpenGuardian}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Encarregado
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar encarregado de educação</DialogTitle>
                <DialogDescription>
                  Será enviado um email de verificação com redireção para a página de setup.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateGuardian} className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="g_full_name">Nome</Label>
                  <Input
                    id="g_full_name"
                    value={gName}
                    onChange={(e) => setGName(e.target.value)}
                    placeholder="Ex.: Ana Martins"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="g_email">Email *</Label>
                  <Input
                    id="g_email"
                    type="email"
                    required
                    value={gEmail}
                    onChange={(e) => setGEmail(e.target.value)}
                    placeholder="encarregado@dominio.tld"
                  />
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="ghost" onClick={() => setOpenGuardian(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submittingGuardian}>
                    {submittingGuardian ? "A enviar…" : "Convidar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{students.length}</div>
              <p className="text-xs text-muted-foreground">
                {students.filter((s) => s.status === "active").length} ativos
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aulas (total)</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {students.reduce((acc, s) => acc + s.totalClasses, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Soma de todas as aulas agendadas</p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance Média (heur.)</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {(() => {
                  const score = students.reduce((acc, s) => {
                    if (s.performance === "excellent") return acc + 9.5;
                    if (s.performance === "good") return acc + 8;
                    if (s.performance === "needs_improvement") return acc + 6.5;
                    return acc + 7;
                  }, 0);
                  return students.length ? (score / students.length).toFixed(1) : "—";
                })()}
              </div>
              <p className="text-xs text-muted-foreground">Indicador provisório</p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mensagens Pendentes</CardTitle>
              <MessageCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">—</div>
              <p className="text-xs text-muted-foreground">Integração futura</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, email, curso ou disciplina…"
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
              {`${filteredStudents.length} aluno(s) encontrado(s)`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {filteredStudents.map((student) => {
                const ultima = student.lastClass
                  ? new Date(student.lastClass).toLocaleDateString("pt-PT")
                  : "—";

                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:bg-accent/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl" aria-hidden>{student.avatar}</div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {student.name || "Aluno sem nome"}
                          </span>
                          {getStatusBadge(student.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{student.course || "Sem curso"}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {student.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {student.email}
                            </span>
                          )}
                          {student.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {student.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Disciplinas:</span>
                          {student.subjects.length > 0 ? (
                            student.subjects.map((subject, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {subject}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">
                          {student.totalClasses} aulas
                        </div>
                        <div className="text-xs text-muted-foreground">Última: {ultima}</div>
                        <div className="mt-1">{getPerformanceBadge(student.performance)}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!professorProfileId}
                          onClick={() => {
                            if (!professorProfileId) return;
                            navigate(`${MSG_BASE}/${professorProfileId}/${student.id}`);
                          }}
                          title="Abrir conversa"
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Mensagem
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/professor/alunos/${student.id}`)}
                          aria-label="Ver aluno"
                          title="Ver mais"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Operações frequentes para gestão de alunos</CardDescription>
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

      <style>
        {`
          .animate-fade-in {
            animation: fadeIn .5s cubic-bezier(.4,0,.2,1);
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(12px);}
            to { opacity: 1; transform: translateY(0);}
          }
        `}
      </style>
    </>
  );
}
