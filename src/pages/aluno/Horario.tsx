// file: src/pages/Horario.tsx
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Timetable, { Lesson } from "@/components/Timetable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const canonical = () => `${window.location.origin}/aluno/horario`;

const wdMap = { 1:"Seg",2:"Ter",3:"Qua",4:"Qui",5:"Sex",6:"Sáb",7:"Dom" } as const;

export default function Horario() {
  const [tab, setTab] = useState<"semanal"|"agendadas">("semanal");
  const [loading, setLoading] = useState(true);
  const [recurring, setRecurring] = useState<any[]>([]);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [err, setErr] = useState<string|null>(null);

  const activeProfileId = localStorage.getItem("activeProfileId");

  const fetchAll = async () => {
    setLoading(true); setErr(null);
    try {
      // padrões
      const { data: r, error: re } = await supabase
        .from("recurring_lessons")
        .select("*")
        .eq("profile_id", activeProfileId)
        .order("weekday, start_time");
      if (re) throw re;
      setRecurring(r || []);

      // agendadas (mês corrente ± 2 semanas para amortecer)
      const now = new Date();
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1 - 14));
      const to   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()+1, 14));
      const { data: s, error: se } = await supabase
        .from("scheduled_lessons")
        .select("*")
        .eq("profile_id", activeProfileId)
        .gte("starts_at", from.toISOString())
        .lt("starts_at", to.toISOString())
        .order("starts_at");
      if (se) throw se;
      setScheduled(s || []);
    } catch (e:any) {
      setErr(e?.message ?? "Falha a carregar horário.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [activeProfileId]);

  const weeklyLessons: Lesson[] = useMemo(() => {
    return recurring.map((p) => {
      const start = String(p.start_time).slice(0,5);
      const endDate = new Date(`1970-01-01T${String(p.start_time)}Z`);
      const end = new Date(endDate.getTime() + p.duration_min*60000).toISOString().slice(11,16);
      return {
        day: wdMap[p.weekday as 1|2|3|4|5|6|7],
        start, end,
        subject: p.subject_id ? "Disciplina" : "Explicação",
        teacher: p.teacher || undefined,
        room: p.room || undefined
      } as Lesson;
    });
  }, [recurring]);

  const canCancel = (starts_at: string) => {
    const diffH = (new Date(starts_at).getTime() - Date.now()) / 36e5;
    return diffH >= 24;
  };

  const cancelLesson = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("cancel-lesson", {
        method: "POST",
        body: { lesson_id: id },
      });
      if (error) throw error;
      await fetchAll();
    } catch (e:any) {
      setErr(e?.message ?? "Não foi possível cancelar.");
    }
  };

  return (
    <div>
      <Helmet>
        <title>Área do Aluno | Horário - Árvore do Conhecimento</title>
        <meta name="description" content="Consulte o seu horário semanal e as explicações agendadas." />
        <link rel="canonical" href={canonical()} />
      </Helmet>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Horário</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchAll} disabled={loading}>
            {loading ? "A atualizar…" : "Atualizar"}
          </Button>
        </div>
      </div>

      {err && <div className="mb-4 text-sm text-destructive">{err}</div>}

      <Tabs value={tab} onValueChange={(v:any)=>setTab(v)} className="w-full">
        <TabsList>
          <TabsTrigger value="semanal">Semanal (padrões)</TabsTrigger>
          <TabsTrigger value="agendadas">Agendadas</TabsTrigger>
        </TabsList>

        <TabsContent value="semanal" className="mt-4">
          <Timetable lessons={weeklyLessons} />
        </TabsContent>

        <TabsContent value="agendadas" className="mt-4">
          <div className="grid gap-3">
            {scheduled.length === 0 && <div className="text-sm text-muted-foreground">Sem agendamentos.</div>}
            {scheduled.map((l) => (
              <div key={l.id} className="flex items-center justify-between border rounded-lg p-3">
                <div className="text-sm">
                  <div className="font-medium">
                    {new Date(l.starts_at).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}
                    {" "}—{" "}
                    {new Date(l.ends_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-xs text-muted-foreground">Estado: {l.status}</div>
                </div>
                <div className="flex items-center gap-2">
                  {l.status === 'scheduled' && canCancel(l.starts_at) && (
                    <Button variant="outline" size="sm" onClick={() => cancelLesson(l.id)}>Cancelar</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
