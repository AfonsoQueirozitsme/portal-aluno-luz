// file: src/pages/Professor/Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
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
  Bell,
} from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { pt } from "date-fns/locale";

type TodayClass = {
  id: string;
  time: string;           // "HH:mm"
  subject: string;        // subject name
  student: string;        // profile full_name/username
  type: "Individual" | "Grupo";
  status: "scheduled" | "in-progress" | "completed" | "cancelled" | "no_show";
};

export default function ProfessorDashboard() {
  const navigate = useNavigate();

  // ───────────── State
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const [studentsCount, setStudentsCount] = useState<number>(0);
  const [materialsCount, setMaterialsCount] = useState<number>(0);

  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [pendingMessages, setPendingMessages] = useState<number>(0); // placeholder, se tiveres tabela de mensagens dá para ligar aqui

  const [loading, setLoading] = useState(true);

  // ───────────── Helpers
  const getStatusBadge = (status: TodayClass["status"]) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline" className="text-blue-600 border-blue-200">Agendada</Badge>;
      case "in-progress":
        return <Badge variant="default" className="bg-green-100 text-green-700">Em curso</Badge>;
      case "completed":
        return <Badge variant="secondary">Concluída</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-rose-600 border-rose-200">Cancelada</Badge>;
      case "no_show":
        return <Badge variant="outline" className="text-amber-700 border-amber-300">No-show</Badge>;
      default:
        return <Badge variant="outline">—</Badge>;
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

  // ───────────── Load data
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);

      // 1) sessão
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id ?? null;
      if (!uid) {
        setLoading(false);
        return;
      }
      if (!alive) return;
      setAuthUserId(uid);

      try {
        // 2) materiais do professor
        {
          const { count } = await supabase
            .from("materials")
            .select("id", { count: "exact", head: true })
            .eq("created_by", uid);
          if (alive) setMaterialsCount(count ?? 0);
        }

        // 3) alunos do professor (perfis com aulas deste professor — scheduled/recurring owner)
        {
          // distinct profile_ids a partir de scheduled_lessons do professor
          const { data: profIds1 } = await supabase
            .from("scheduled_lessons")
            .select("profile_id")
            .eq("owner_auth_user_id", uid);
          const { data: profIds2 } = await supabase
            .from("recurring_lessons")
            .select("profile_id")
            .eq("owner_auth_user_id", uid);

          const idsSet = new Set<string>();
          (profIds1 ?? []).forEach((r: any) => r?.profile_id && idsSet.add(r.profile_id));
          (profIds2 ?? []).forEach((r: any) => r?.profile_id && idsSet.add(r.profile_id));

          // conta apenas profiles existentes
          let total = 0;
          if (idsSet.size) {
            const ids = Array.from(idsSet);
            const { count } = await supabase
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .in("id", ids);
            total = count ?? 0;
          }
          if (alive) setStudentsCount(total);
        }

        // 4) aulas de hoje do professor
        {
          const start = startOfDay(new Date()).toISOString();
          const end = endOfDay(new Date()).toISOString();

          // join subject + recurring para teacher, e profile para nome do aluno
          const { data: rows, error } = await supabase
            .from("scheduled_lessons")
            .select(`
              id, profile_id, subject_id, starts_at, ends_at, status, source_recurring_id,
              subject:subjects(name),
              recurring:recurring_lessons(teacher),
              profile:profiles(full_name, username)
            `)
            .eq("owner_auth_user_id", uid)
            .gte("starts_at", start)
            .lte("starts_at", end)
            .order("starts_at", { ascending: true });

          if (error) throw error;

          // detectar grupo: mesma hora (minuto), mesma disciplina e mesmo professor
          const toKey = (r: any) => {
            const t = new Date(r.starts_at);
            const hh = String(t.getHours()).padStart(2, "0");
            const mm = String(t.getMinutes()).padStart(2, "0");
            const subj = r.subject_id ?? "__";
            const teacher = (r.recurring?.teacher || "").trim().toLowerCase();
            return `${hh}:${mm}|${subj}|${teacher}`;
          };
          const counts: Record<string, number> = {};
          (rows ?? []).forEach((r) => {
            const k = toKey(r);
            counts[k] = (counts[k] ?? 0) + 1;
          });

          const mapped: TodayClass[] = (rows ?? []).map((r) => {
            const t = new Date(r.starts_at);
            const k = toKey(r);
            return {
              id: r.id,
              time: format(t, "HH:mm", { locale: pt }),
              subject: r.subject?.name ?? "—",
              student: r.profile?.full_name || r.profile?.username || "—",
              type: counts[k] > 1 ? "Grupo" : "Individual",
              status: r.status as TodayClass["status"],
            };
          });

          if (alive) setTodayClasses(mapped);
        }

        // 5) mensagens pendentes (placeholder, 0). Substitui por tabela específica se existir.
        if (alive) setPendingMessages(0);
      } catch (e) {
        console.error("[ProfessorDashboard] load error:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ───────────── Notify (Edge Function) – usa supabase.functions.invoke
  const handleNotify = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("daily-reminders", {
        method: "POST",
        body: { force: 1 },
      });
      if (error) {
        console.error("❌ daily-reminders error:", error);
        alert("Falhou enviar notificação. Vê a consola.");
        return;
      }
      console.log("✅ Notificação enviada:", data);
      alert("Notificação enviada!");
    } catch (err) {
      console.error("💥 Erro ao chamar função:", err);
      alert("Erro de rede ao chamar a função.");
    }
  };

  // ───────────── Stats cards (dinâmicos)
  const stats = useMemo(() => ([
    {
      title: "Total de Alunos",
      value: loading ? "…" : String(studentsCount),
      change: "", // se quiseres delta, calcula aqui
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Aulas Hoje",
      value: loading ? "…" : String(todayClasses.length),
      change: todayClasses.filter(a => a.status === "scheduled").length ? `${todayClasses.filter(a => a.status === "scheduled").length} pendentes` : "",
      icon: Calendar,
      color: "text-green-600",
    },
    {
      title: "Materiais Criados",
      value: loading ? "…" : String(materialsCount),
      change: "", // ex: +5 esta semana (se quiseres calcular)
      icon: BookOpen,
      color: "text-purple-600",
    },
    {
      title: "Mensagens",
      value: String(pendingMessages),
      change: pendingMessages ? "por responder" : "sem pendentes",
      icon: MessageCircle,
      color: "text-orange-600",
    },
  ]), [loading, studentsCount, todayClasses, materialsCount, pendingMessages]);

  // ───────────── Recent activity (placeholder / podes ligar a uma tabela)
  const recentActivity = [
    { action: "Painel do Professor aberto", details: "Sessão iniciada", time: "agora", type: "class" },
  ];

  return (
    <>
      <Helmet>
        <title>Dashboard - Professor | Árvore do Conhecimento</title>
        <meta name="description" content="Visão geral das suas aulas, alunos e atividades como professor" />
      </Helmet>

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Bem-vindo de volta{authUserId ? "" : ""}. Aqui está um resumo das suas atividades.
            </p>
          </div>
          <Button onClick={handleNotify} className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificar
          </Button>
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
                {stat.change ? (
                  <p className="text-xs text-muted-foreground">
                    {stat.change}
                  </p>
                ) : (
                  <div className="h-[14px]" />
                )}
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
                {loading ? "A carregar…" : `${todayClasses.length} aulas agendadas para hoje`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayClasses.length === 0 && !loading && (
                <div className="text-sm text-muted-foreground">Sem aulas para hoje.</div>
              )}
              {todayClasses.map((classItem) => (
                <div key={classItem.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-accent/20 transition-colors">
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
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate("/professor/horarios")}
              >
                Ver todos os horários
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity (placeholder) */}
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
              <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/professor/atividade")}>
                Ver todas as atividades
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <style>
        {`
          .glass-panel {
            background: rgba(255,255,255,0.9);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          }
          .hover-lift { transition: transform .2s ease, box-shadow .2s ease; }
          .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 14px 40px rgba(0,0,0,0.12); }
        `}
      </style>
    </>
  );
}
