// file: src/pages/Aluno/Dashboard.tsx
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CalendarDays, Clock, ArrowRight } from "lucide-react";
import studentHero from "@/assets/student-hero.jpg";
import GlowCursor from "@/components/GlowCursor";
import { Link } from "react-router-dom";

type AnyRow = Record<string, any>;

type NormalizedLesson = {
  id: string;
  profile_id?: string;
  subject_id?: string | null;
  subject?: string | null;
  startISO: string; // sempre ISO válido
  endISO: string;   // sempre ISO válido (se não existir, deduzido por duração 60min)
  status?: string | null;
};

const canonical = () => `${window.location.origin}/aluno`;

/** Helpers de formato **/
function formatPtDate(dtISO: string) {
  const dt = new Date(dtISO);
  const dia = dt.toLocaleDateString("pt-PT", { weekday: "long" });
  const data = dt.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
  return { dia: capitalize(dia), data: data.replace(".", "") };
}
function formatTime(dtISO: string) {
  const dt = new Date(dtISO);
  return dt.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}
function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function getWeekBounds(date = new Date()) {
  // Semana a começar na segunda
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0=Mon ... 6=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  sunday.setMilliseconds(-1);

  return { start: monday, end: sunday };
}

/** Normalizador super tolerante aos nomes das colunas */
function toISO(x: any): string | null {
  if (!x) return null;
  if (typeof x === "string") {
    // já é ISO? ou algo parseável
    const t = Date.parse(x);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  if (x instanceof Date) return x.toISOString();
  return null;
}

function combineDateTime(dateStr?: string | null, timeStr?: string | null): string | null {
  if (!dateStr || !timeStr) return null;
  // Aceita "2025-08-20" + "17:30" (ou "17:30:00")
  const iso = new Date(`${dateStr}T${timeStr}`).toISOString();
  return iso;
}

function addMinutesISO(iso: string, minutes = 60): string {
  const t = new Date(iso).getTime();
  return new Date(t + minutes * 60 * 1000).toISOString();
}

function normalizeLesson(row: AnyRow): NormalizedLesson | null {
  const id = String(row.id ?? "");
  if (!id) return null;

  // tenta detetar start
  // prioridades:
  // 1) starts_at / start_at / start / begin_at
  // 2) date + start_time
  // 3) date_start + time_start
  // 4) start_datetime
  const startCandidates = [
    row.starts_at,
    row.start_at,
    row.start,
    row.begin_at,
    row.start_datetime,
  ].map(toISO).filter(Boolean) as string[];

  let startISO = startCandidates[0] ?? null;
  if (!startISO) {
    const combo1 = combineDateTime(row.date, row.start_time);
    const combo2 = combineDateTime(row.date_start, row.time_start);
    startISO = combo1 ?? combo2 ?? null;
  }
  if (!startISO) return null; // sem início não há aula

  // tenta detetar end
  const endCandidates = [
    row.ends_at,
    row.end_at,
    row.end,
    row.finish_at,
    row.end_datetime,
  ].map(toISO).filter(Boolean) as string[];

  let endISO = endCandidates[0] ?? null;
  if (!endISO) {
    // tentar com date + end_time
    const comboE1 = combineDateTime(row.date, row.end_time);
    const comboE2 = combineDateTime(row.date_end, row.time_end);
    endISO = comboE1 ?? comboE2 ?? null;
  }

  // se ainda não existir, deduzir por duração_minutos / duration_minutes / duration
  if (!endISO) {
    const dur =
      Number(row.duration_minutes ?? row.dur_minutes ?? row.duration ?? 60) || 60;
    endISO = addMinutesISO(startISO, dur);
  }

  return {
    id,
    profile_id: row.profile_id ?? null,
    subject_id: row.subject_id ?? null,
    subject: (row.subjects && row.subjects.name) || row.subject || null,
    startISO,
    endISO,
    status: row.status ?? null,
  };
}

export default function Dashboard() {
  const [nomeAluno, setNomeAluno] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [nextLesson, setNextLesson] = useState<NormalizedLesson | null>(null);
  const [weeklyTargetHours] = useState<number>(8);
  const [weeklyDoneHours, setWeeklyDoneHours] = useState<number>(0);

  const progressoPct = useMemo(() => {
    if (weeklyTargetHours <= 0) return 0;
    const pct = (weeklyDoneHours / weeklyTargetHours) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }, [weeklyDoneHours, weeklyTargetHours]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Sessão
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        // Nome (perfil + recente)
        if (user) {
          const { data: prof, error: profErr } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("auth_user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!profErr && prof?.full_name) setNomeAluno(prof.full_name);
        }

        const profileId = localStorage.getItem("active_profile_id");
        if (!profileId) {
          setLoading(false);
          return;
        }

        // 1) Carrega scheduled_lessons sem usar colunas desconhecidas (select * e filtra no cliente)
        const { data: rows, error: rowsErr } = await supabase
          .from("scheduled_lessons")
          .select("*")
          .eq("profile_id", profileId)
          .limit(2000); // ajusta se precisares

        if (rowsErr) {
          console.warn("[Dashboard] Erro a carregar scheduled_lessons:", rowsErr.message);
          setNextLesson(null);
          setWeeklyDoneHours(0);
          setLoading(false);
          return;
        }

        // 2) Normaliza linhas em cliente
        const normalized: NormalizedLesson[] = (rows ?? [])
          .map(normalizeLesson)
          .filter(Boolean) as NormalizedLesson[];

        // 3) Se houver subject_id mas não veio o nome, vamos buscar subjects de uma vez
        const needSubjects = normalized.filter(l => !l.subject && l.subject_id).map(l => String(l.subject_id));
        const uniqueSubjectIds = Array.from(new Set(needSubjects));
        let subjectMap: Record<string, string> = {};
        if (uniqueSubjectIds.length > 0) {
          const { data: subs, error: subsErr } = await supabase
            .from("subjects")
            .select("id,name")
            .in("id", uniqueSubjectIds);

          if (!subsErr && subs) {
            subjectMap = subs.reduce((acc, s) => {
              acc[String(s.id)] = s.name as string;
              return acc;
            }, {} as Record<string, string>);
          }
        }
        const withSubjectNames = normalized.map(l => ({
          ...l,
          subject: l.subject ?? (l.subject_id ? subjectMap[String(l.subject_id)] ?? null : null),
        }));

        // 4) Próxima aula futura (status aceitável se existir; se não houver status, ignora filtro)
        const now = Date.now();
        const allowedStatuses = new Set(["scheduled", "confirmed"]); // ajusta se usas outros
        const future = withSubjectNames
          .filter(l => {
            const startMs = Date.parse(l.startISO);
            if (Number.isNaN(startMs) || startMs <= now) return false;
            return l.status ? allowedStatuses.has(String(l.status)) : true;
          })
          .sort((a, b) => Date.parse(a.startISO) - Date.parse(b.startISO));

        setNextLesson(future[0] ?? null);

        // 5) Progresso semanal (completed/attended se existir, caso contrário conta todas as já decorridas)
        const { start, end } = getWeekBounds(new Date());
        const weekLessons = withSubjectNames.filter(l => {
          const t = Date.parse(l.startISO);
          return t >= start.getTime() && t <= end.getTime();
        });

        const doneStatuses = new Set(["completed", "attended", "done"]);
        const accounted = weekLessons.filter(l => (l.status ? doneStatuses.has(String(l.status)) : true));

        const hours = accounted.reduce((acc, l) => {
          const s = Date.parse(l.startISO);
          const e = Date.parse(l.endISO);
          if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return acc;
          return acc + (e - s) / (1000 * 60 * 60);
        }, 0);

        setWeeklyDoneHours(Number(hours.toFixed(2)));
      } catch (e) {
        console.warn("[Dashboard] Falhou a carregar dados:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const proximo = nextLesson
    ? {
        disciplina: nextLesson.subject || "Explicação",
        ...formatPtDate(nextLesson.startISO),
        hora: formatTime(nextLesson.startISO),
      }
    : null;

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
              <Button asChild variant="hero" disabled={loading}>
                <Link to="/aluno/horario" className="inline-flex items-center">
                  Ver horário completo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" disabled={loading}>
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
            {loading ? (
              <div className="h-16 grid place-items-center text-sm text-muted-foreground">A carregar…</div>
            ) : proximo ? (
              <>
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
                  <Link to="/aluno/horario">Ver detalhes</Link>
                </Button>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Sem aulas agendadas.</div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Progresso semanal</CardTitle>
            <CardDescription>Horas de estudo concluídas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-16 grid place-items-center text-sm text-muted-foreground">A calcular…</div>
            ) : (
              <>
                <div className="mb-2 text-sm">
                  {weeklyDoneHours} / {weeklyTargetHours} horas
                </div>
                <Progress value={progressoPct} />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Atalhos</CardTitle>
            <CardDescription>Acesso rápido</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline" disabled={loading}>
              <Link to="/aluno/mensagens">Mensagens</Link>
            </Button>
            <Button asChild variant="outline" disabled={loading}>
              <Link to="/aluno/pagamentos">Pagamentos</Link>
            </Button>
            <Button asChild variant="outline" disabled={loading}>
              <Link to="/aluno/perfil">Perfil</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
