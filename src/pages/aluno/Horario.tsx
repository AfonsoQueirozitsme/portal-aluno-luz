// file: src/pages/Horario.tsx
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Timetable, { Lesson } from "@/components/Timetable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Clock,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  DoorOpen,
  MapPin,
  Printer,
} from "lucide-react";

const canonical = () => `${window.location.origin}/aluno/horario`;
const wdMap = { 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb", 7: "Dom" } as const;

// ---------------- Helpers de estado ----------------
type LessonStatus = "agendada" | "confirmada" | "terminada" | "cancelada" | "noshow";

function normalizeStatus(raw: string | null | undefined): LessonStatus {
  const s = String(raw ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  if (s === "agendada" || s === "scheduled" || s === "pending" || s === "booked") return "agendada";
  if (s === "confirmada" || s === "confirmed" || s === "paid") return "confirmada";
  if (s === "terminada" || s === "completed" || s === "done") return "terminada";
  if (s === "cancelada" || s === "canceled" || s === "cancelled") return "cancelada";
  if (s === "noshow" || s === "noshowed" || s === "noattendance" || s === "noshowup" || s === "noshowup") return "noshow";
  if (s === "noshow" || s === "noshow" || s === "noshow") return "noshow"; // redundância defensiva
  if (s === "noshow" || s === "noshow" || s === "no-show") return "noshow";
  if (s === "noshow" || s === "no_show") return "noshow";
  // fallback
  return "agendada";
}

type Sched = {
  id: string;
  profile_id: string;
  starts_at: string;
  ends_at: string;
  status: string; // ← pode vir qualquer string da BD; normalizamos depois
  subject_id?: string | null;
  teacher?: string | null;
  room?: string | null;
};

export default function Horario() {
  const [tab, setTab] = useState<"semanal" | "agendadas">("semanal");
  const [loading, setLoading] = useState(true);
  const [recurring, setRecurring] = useState<any[]>([]);
  const [scheduled, setScheduled] = useState<Sched[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // confirmar cancelamento
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Sched | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const activeProfileId = localStorage.getItem("activeProfileId");

  const fetchAll = async () => {
    if (!activeProfileId) {
      setErr("Escolhe um perfil para veres o horário.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const { data: r, error: re } = await supabase
        .from("recurring_lessons")
        .select("*")
        .eq("profile_id", activeProfileId)
        .order("weekday, start_time");
      if (re) throw re;
      setRecurring(r || []);

      const now = new Date();
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1 - 14));
      const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 14));
      const { data: s, error: se } = await supabase
        .from("scheduled_lessons")
        .select("*")
        .eq("profile_id", activeProfileId)
        .gte("starts_at", from.toISOString())
        .lt("starts_at", to.toISOString())
        .order("starts_at");
      if (se) throw se;
      setScheduled((s || []) as Sched[]);
      setLastUpdated(new Date());
    } catch (e: any) {
      setErr(e?.message ?? "Falha a carregar horário.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [activeProfileId]);

  // Helpers UI
  const weeklyLessons: Lesson[] = useMemo(() => {
    // filtra só 2ª a 6ª
    const weekdaysOnly = (recurring || []).filter((p) => Number(p.weekday) >= 1 && Number(p.weekday) <= 5);
    return weekdaysOnly.map((p) => {
      const start = String(p.start_time).slice(0, 5);
      const endDate = new Date(`1970-01-01T${String(p.start_time)}Z`);
      const end = new Date(endDate.getTime() + p.duration_min * 60000).toISOString().slice(11, 16);
      return {
        day: wdMap[p.weekday as 1 | 2 | 3 | 4 | 5], // só 1..5
        start,
        end,
        subject: p.subject_id ? "Disciplina" : "Explicação",
        teacher: p.teacher || undefined,
        room: p.room || undefined,
      } as Lesson;
    });
  }, [recurring]);

  const canCancel = (starts_at: string, rawStatus: string) => {
    const status = normalizeStatus(rawStatus);
    const diffH = (new Date(starts_at).getTime() - Date.now()) / 36e5;
    const openStatus = status === "agendada" || status === "confirmada";
    return openStatus && diffH >= 24;
  };

  const openConfirmCancel = (lesson: Sched) => {
    setCancelTarget(lesson);
    setConfirmOpen(true);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      setCancelling(true);
      const { error } = await supabase.functions.invoke("cancel-lesson", {
        method: "POST",
        body: { lesson_id: cancelTarget.id },
      });
      if (error) throw error;
      setScheduled((arr) => arr.map((l) => (l.id === cancelTarget.id ? { ...l, status: "cancelada" } : l)));
      setConfirmOpen(false);
      setCancelTarget(null);
    } catch (e: any) {
      setErr(e?.message ?? "Não foi possível cancelar.");
    } finally {
      setCancelling(false);
    }
  };

  const formatDateHeader = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long" });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

  const minutesBetween = (aISO: string, bISO: string) =>
    Math.max(0, Math.round((new Date(bISO).getTime() - new Date(aISO).getTime()) / 60000));

  const relTime = (startISO: string) => {
    const diff = Math.round((new Date(startISO).getTime() - Date.now()) / 60000);
    if (diff <= -1) return "já começou";
    if (diff < 60) return `em ${diff} min`;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m ? `em ${h}h ${m}m` : `em ${h}h`;
  };

  // próxima sessão: só estados ativos (agendada/confirmada)
  const nextLesson = useMemo(() => {
    const now = Date.now();
    return [...scheduled]
      .filter((l) => {
        const s = normalizeStatus(l.status);
        return (s === "agendada" || s === "confirmada") && new Date(l.starts_at).getTime() > now;
      })
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
  }, [scheduled]);

  // agrupar agendadas por dia
  const grouped = useMemo(() => {
    const map = new Map<string, Sched[]>();
    for (const l of scheduled) {
      const key = new Date(l.starts_at).toISOString().slice(0, 10);
      map.set(key, [...(map.get(key) || []), l]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [scheduled]);

  const countWeekly = recurring.filter((p) => Number(p.weekday) >= 1 && Number(p.weekday) <= 5).length;
  const countSched = scheduled.filter((s) => {
    const st = normalizeStatus(s.status);
    return st === "agendada" || st === "confirmada";
  }).length;

  const handlePrint = () => window.print();

  // UI
  return (
    <div className="space-y-4">
      <Helmet>
        <title>Área do Aluno | Horário - Árvore do Conhecimento</title>
        <meta name="description" content="Consulta o teu horário semanal e as explicações agendadas." />
        <link rel="canonical" href={canonical()} />
      </Helmet>

      {/* Header */}
      <div className="flex items-center justify-between print:mb-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Horário</h1>
          <div className="text-xs text-muted-foreground mt-0.5">
            {lastUpdated ? (
              <>Última atualização: {lastUpdated.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</>
            ) : (
              <>—</>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={fetchAll} disabled={loading}>
            <RotateCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "A atualizar…" : "Atualizar"}
          </Button>
        </div>
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm print:hidden">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-destructive">Ocorreu um problema</div>
            <div className="text-destructive/90">{err}</div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Destaque: Próxima aula */}
      <AnimatePresence>
        {!loading && nextLesson && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border bg-background shadow-sm print:hidden"
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-primary" />
              <div className="font-medium">Próxima aula</div>
              <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {relTime(nextLesson.starts_at)}
              </div>
            </div>
            <div className="mt-2 text-sm">
              <div className="font-semibold">
                {new Date(nextLesson.starts_at).toLocaleDateString("pt-PT", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                })}{" "}
                · {formatTime(nextLesson.starts_at)} — {formatTime(nextLesson.ends_at)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                {nextLesson.teacher ? (
                  <span className="inline-flex items-center gap-1">
                    <DoorOpen className="w-3.5 h-3.5" />
                    {nextLesson.teacher}
                  </span>
                ) : null}
                {nextLesson.room ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {nextLesson.room}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {minutesBetween(nextLesson.starts_at, nextLesson.ends_at)} min
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Separadores */}
      <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="w-full">
        <TabsList className="grid grid-cols-2 w-fit print:hidden">
          <TabsTrigger value="semanal">Semanal{countWeekly ? ` (${countWeekly})` : ""}</TabsTrigger>
          <TabsTrigger value="agendadas">Agendadas{countSched ? ` (${countSched})` : ""}</TabsTrigger>
        </TabsList>

        {/* SEMANAL */}
        <TabsContent value="semanal" className="mt-4 space-y-3">
          {loading ? (
            <SkeletonTimetable />
          ) : countWeekly === 0 ? (
            <EmptyState
              icon={<CalendarDays className="w-6 h-6" />}
              title="Sem padrões definidos"
              subtitle="Pede aos teus explicadores para configurarem as sessões recorrentes."
            />
          ) : (
            <>
              {/* Calendário mais pequeno e sem fim de semana */}
              <div className="rounded-xl border bg-background p-3">
                <div className="origin-top-left scale-[0.9] sm:scale-[0.95] print:scale-100">
                  <Timetable lessons={weeklyLessons} />
                </div>
              </div>

              <div className="text-xs text-muted-foreground print:hidden">
                <div className="inline-flex items-center gap-1">Legenda:</div>{" "}
                <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                  Explicação / Disciplina
                </span>
                <span className="mx-2">·</span>
                <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]">
                  <Clock className="w-3 h-3" />
                  Hora local
                </span>
              </div>
            </>
          )}
        </TabsContent>

        {/* AGENDADAS */}
        <TabsContent value="agendadas" className="mt-4">
          {loading ? (
            <SkeletonList />
          ) : scheduled.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="w-6 h-6" />}
              title="Sem agendamentos"
              subtitle="Quando marcares uma explicação, ela aparece aqui."
            />
          ) : (
            <div className="space-y-6">
              {grouped.map(([day, lessons]) => (
                <div key={day} className="space-y-2">
                  <div className="text-sm font-semibold text-primary capitalize">{formatDateHeader(day)}</div>
                  <div className="grid gap-2">
                    {lessons.map((l) => {
                      const isCancellable = canCancel(l.starts_at, l.status);
                      const duration = minutesBetween(l.starts_at, l.ends_at);
                      const ns = normalizeStatus(l.status);
                      return (
                        <motion.div
                          key={l.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-between rounded-lg border bg-background p-3 hover:shadow-sm transition-shadow"
                        >
                          <div className="text-sm">
                            <div className="font-medium flex items-center gap-2">
                              <span>
                                {formatTime(l.starts_at)} — {formatTime(l.ends_at)}
                              </span>
                              <StatusBadge status={ns} />
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-3">
                              {l.teacher ? (
                                <span className="inline-flex items-center gap-1">
                                  <DoorOpen className="w-3.5 h-3.5" />
                                  {l.teacher}
                                </span>
                              ) : null}
                              {l.room ? (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {l.room}
                                </span>
                              ) : null}
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {duration} min
                              </span>
                              {(ns === "agendada" || ns === "confirmada") && (
                                <span className="inline-flex items-center gap-1 text-xs text-foreground/70">
                                  ( {relTime(l.starts_at)} )
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 print:hidden">
                            {isCancellable && (
                              <Button variant="outline" size="sm" onClick={() => openConfirmCancel(l)}>
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmar cancelamento */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Confirmar cancelamento</DialogTitle>
            <DialogDescription className="text-sm">
              Só podes cancelar com 24h de antecedência. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm space-y-2">
            {cancelTarget ? (
              <>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span className="font-medium capitalize">{formatDateHeader(cancelTarget.starts_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>
                    {formatTime(cancelTarget.starts_at)} — {formatTime(cancelTarget.ends_at)} (
                    {minutesBetween(cancelTarget.starts_at, cancelTarget.ends_at)} min)
                  </span>
                </div>
              </>
            ) : null}
            <Separator className="my-2" />
            {!cancelTarget || canCancel(cancelTarget.starts_at, cancelTarget.status) ? (
              <div className="flex items-center gap-2 text-emerald-600 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                Podes cancelar esta sessão.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive text-xs">
                <XCircle className="w-4 h-4" />
                Já não é possível cancelar (menos de 24h).
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={confirmCancel}
              disabled={!cancelTarget || !canCancel(cancelTarget.starts_at, cancelTarget.status) || cancelling}
              variant="destructive"
            >
              {cancelling ? "A cancelar…" : "Cancelar sessão"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Subcomponentes UI ---------- */
function StatusBadge({ status }: { status: LessonStatus }) {
  const cfg: Record<LessonStatus, { cls: string; icon: JSX.Element; label: string }> = {
    agendada: {
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: <Clock className="w-3.5 h-3.5" />,
      label: "Agendada (por pagar)",
    },
    confirmada: {
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      label: "Confirmada (paga)",
    },
    terminada: {
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      label: "Terminada",
    },
    cancelada: {
      cls: "bg-rose-50 text-rose-700 border-rose-200",
      icon: <XCircle className="w-3.5 h-3.5" />,
      label: "Cancelada",
    },
    noshow: {
      cls: "bg-orange-50 text-orange-700 border-orange-200",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      label: "Não compareceu",
    },
  };

  // fallback super seguro
  const key: LessonStatus = status ?? "agendada";
  const conf = cfg[key] ?? cfg["agendada"];

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border ${conf.cls}`} title={conf.label}>
      {conf.icon}
      {conf.label}
    </span>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border bg-background p-8 text-center">
      <div className="mb-2 text-muted-foreground">{icon}</div>
      <div className="font-medium">{title}</div>
      {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
    </div>
  );
}

function SkeletonTimetable() {
  // versão 2ª–6ª (5 colunas)
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="h-4 w-40 bg-muted rounded mb-4" />
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, c) => (
          <div key={c} className="space-y-2">
            {Array.from({ length: 4 }).map((_, r) => (
              <div key={r} className="h-6 bg-muted rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-56 bg-muted rounded" />
          <div className="grid gap-2">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="h-16 rounded-lg border bg-background" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
