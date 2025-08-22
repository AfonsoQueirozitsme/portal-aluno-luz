// file: src/pages/professor/Horarios.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Timetable, { Lesson as TTLesson } from "@/components/Timetable";

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Building2,
  User as UserIcon,
  LayoutGrid,
  GraduationCap,
  Check,
  X,
  AlertTriangle,
  Save,
  RefreshCw,
  Send,
  ClipboardList,
  Plus,
  Bell,
  FileText,
  CreditCard,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// ─────────────────────────────────────────────────────────────────────────────
// Types (DB)

type Sched = {
  id: string;
  owner_auth_user_id: string;
  profile_id: string;
  subject_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string; // enum no DB (ex.: 'scheduled' | 'cancelled' | 'no_show' | 'show' …)
  room?: string | null;
  source_recurring_id?: string | null;
};

type Rec = { id: string; teacher: string | null };
type Subject = { id: string; name: string };
type Profile = { id: string; full_name: string | null; auth_user_id: string; horas?: number | null };
type Homework = { id: string; title: string };
type TeacherUser = { id: string; full_name: string | null };

type ViewKey = "institucional" | "pessoal" | "salas" | "professores";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers

const PT_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const PT_DAYS_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
const SHORT_TO_INDEX: Record<string, number> = { Seg: 1, Ter: 2, Qua: 3, Qui: 4, Sex: 5, Sáb: 6, Dom: 0 };

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // segunda
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfWeek(date: Date) {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setDate(s.getDate() + 7);
  e.setHours(0, 0, 0, 0);
  return e;
}
function fmtDatePT(d: Date) {
  return d.toLocaleDateString("pt-PT");
}
function toISO(d: Date) {
  return d.toISOString();
}
function dayAbbrFromISO(iso: string): "Seg" | "Ter" | "Qua" | "Qui" | "Sex" | "Sáb" | "Dom" {
  const d = new Date(iso);
  return PT_DAYS[d.getDay()] as any;
}
function timeHHMM(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}
function addMinutes(iso: string, minutes: number) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}
function isoFromLocalDT(value: string) {
  if (!value) return null;
  const d = new Date(value);
  return d.toISOString();
}
function Empty({ text = "Sem registos para mostrar." }: { text?: string }) {
  return (
    <div className="w-full rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProfessorHorarios() {
  // Semana
  const [anchor, setAnchor] = useState<Date>(startOfWeek(new Date()));
  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const weekEnd = useMemo(() => endOfWeek(anchor), [anchor]);
  const rangeLabel = `${fmtDatePT(weekStart)} — ${fmtDatePT(new Date(weekEnd.getTime() - 1))}`;

  // Vista
  const [view, setView] = useState<ViewKey>("pessoal");

  // Dados
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<Sched[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Map<string, string>>(new Map());
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, string>>(new Map());
  const [profilesAuthMap, setProfilesAuthMap] = useState<Map<string, string>>(new Map());

  const [teachersMap, setTeachersMap] = useState<Map<string, string>>(new Map());
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Modal ação (ver/editar)
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Sched | null>(null);
  const [actLoading, setActLoading] = useState(false);
  const [actErr, setActErr] = useState<string | null>(null);
  const [notifyStudent, setNotifyStudent] = useState(true);
  const [notifySMS, setNotifySMS] = useState(true);
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<string | null>(null);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [rescheduleDT, setRescheduleDT] = useState<string>("");
  const [rescheduleDuration, setRescheduleDuration] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Modal criar (slot vazio)
  const [openCreate, setOpenCreate] = useState(false);
  const [createDay, setCreateDay] = useState<"Seg" | "Ter" | "Qua" | "Qui" | "Sex" | "Sáb" | "Dom" | null>(null);
  const [createTime, setCreateTime] = useState<string>("");
  const [createSubjectId, setCreateSubjectId] = useState<string>("");
  const [createProfileId, setCreateProfileId] = useState<string>("");
  const [createTeacherId, setCreateTeacherId] = useState<string>("");
  const [createDuration, setCreateDuration] = useState<number>(60);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  // TPCs recomendados (para a sessão ativa) + picker
type RecommendedTPC = {
  assignment_id: string;
  status: string;
  assigned_at: string;
  title: string;
  kind: "homework" | "material" | "quiz";
  subject?: string | null;
  grade?: number | null;
};

const [recommendedTPCs, setRecommendedTPCs] = useState<RecommendedTPC[]>([]);
const [tpcPickerOpen, setTpcPickerOpen] = useState(false);

// filtros do picker
const [tpcSearch, setTpcSearch] = useState("");
const [tpcFilterKind, setTpcFilterKind] = useState<"all" | "material" | "quiz" | "homework">("all");

  // user + teachers + subjects + students + homeworks
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!alive) return;
      const uid = auth.user?.id ?? null;
      setUserId(uid);

      // subjects
      const { data: subs } = await supabase.from("subjects").select("id, name").order("name");
      if (alive) {
        setSubjects((subs ?? []) as Subject[]);
        setSubjectsMap(new Map(((subs ?? []) as Subject[]).map((s) => [s.id, s.name])));
      }

      // students (profiles level 0)
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, auth_user_id, horas")
        .eq("level", 0)
        .order("full_name");
      if (alive) {
        const arr = (profs ?? []) as Profile[];
        setProfiles(arr);
        const pMap = new Map<string, string>();
        const pAuth = new Map<string, string>();
        arr.forEach((p) => {
          pMap.set(p.id, p.full_name || "—");
          pAuth.set(p.id, p.auth_user_id);
        });
        setProfilesMap(pMap);
        setProfilesAuthMap(pAuth);
      }

      // teachers (users com role=teacher → usa profiles como nome)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");
      const teacherUserIds = (roles ?? []).map((r: any) => r.user_id);
      if (teacherUserIds.length) {
        const { data: tprofiles } = await supabase
          .from("profiles")
          .select("auth_user_id, full_name")
          .in("auth_user_id", teacherUserIds);
        const ts = (tprofiles ?? []).map((p: any) => ({ id: p.auth_user_id, full_name: p.full_name })) as TeacherUser[];
        setTeachers(ts);
      }

      // homeworks do professor
      if (uid) {
        const { data: hw } = await supabase
          .from("homeworks")
          .select("id, title")
          .eq("created_by", uid)
          .order("created_at", { ascending: false });
        setHomeworks((hw ?? []) as Homework[]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Carregar semana (scheduled_lessons + professores por recorrência)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!userId && view === "pessoal") return;

      setLoading(true);
      setErr(null);

      const from = toISO(weekStart);
      const to = toISO(weekEnd);

      // scheduled_lessons (com fallback sem room)
      let sched: Sched[] = [];
      try {
        const base = supabase
          .from("scheduled_lessons")
          .select("id, owner_auth_user_id, profile_id, subject_id, starts_at, ends_at, status, room, source_recurring_id")
          .gte("starts_at", from)
          .lt("starts_at", to)
          .order("starts_at", { ascending: true });
        const { data, error } = view === "pessoal" && userId ? await base.eq("owner_auth_user_id", userId) : await base;
        if (error) throw error;
        sched = (data ?? []) as any;
      } catch (e: any) {
        const msg = String(e?.message ?? "").toLowerCase();
        if (msg.includes("column") && msg.includes("room")) {
          const base = supabase
            .from("scheduled_lessons")
            .select("id, owner_auth_user_id, profile_id, subject_id, starts_at, ends_at, status, source_recurring_id")
            .gte("starts_at", from)
            .lt("starts_at", to)
            .order("starts_at", { ascending: true });
          const { data, error } = view === "pessoal" && userId ? await base.eq("owner_auth_user_id", userId) : await base;
          if (error) throw error;
          sched = (data ?? []).map((r: any) => ({ ...r, room: null })) as any;
        } else {
          setErr("Erro a carregar aulas agendadas.");
          setLoading(false);
          return;
        }
      }

      // professores (via recorrência)
      const recIds = Array.from(new Set(sched.map((r) => r.source_recurring_id).filter(Boolean))) as string[];
      let tMap = new Map<string, string>();
      if (recIds.length) {
        const { data: recs } = await supabase
          .from("recurring_lessons")
          .select("id, teacher")
          .in("id", recIds);
        tMap = new Map(((recs ?? []) as Rec[]).map((r) => [r.id, r.teacher || "—"]));
      }

      setRows(sched);
      setTeachersMap(tMap);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [weekStart, weekEnd, view, userId]);

  // ───────── Timetable lessons (com meta: id da lesson)
  const timetableLessons: TTLesson[] = useMemo(() => {
    return rows.map((r) => ({
      id: r.id,
      day: dayAbbrFromISO(r.starts_at),
      start: new Date(r.starts_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
      end: new Date(r.ends_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
      subject: subjectsMap.get(r.subject_id || "") || "—",
      teacher: r.source_recurring_id ? (teachersMap.get(r.source_recurring_id || "") || "—") : "—",
      room: r.room || undefined,
      meta: { scheduledId: r.id },
    }));
  }, [rows, subjectsMap, teachersMap]);

  // Estatísticas simples
  const stats = useMemo(() => {
    const total = rows.length;
    const key = (r: Sched) => `${r.subject_id || ""}|${r.starts_at}|${r.source_recurring_id || ""}`;
    const counts = new Map<string, number>();
    rows.forEach((r) => counts.set(key(r), (counts.get(key(r)) || 0) + 1));
    const groups = Array.from(counts.values()).filter((n) => n > 1).length;
    const individuals = total - groups;
    const totalHours = rows.reduce((acc, r) => {
      const mins = (new Date(r.ends_at).getTime() - new Date(r.starts_at).getTime()) / 60000;
      return acc + mins / 60;
    }, 0);
    return {
      total,
      groupClasses: groups,
      individualClasses: Math.max(individuals, 0),
      totalHours: Math.round(totalHours * 10) / 10,
    };
  }, [rows]);

  const byRoom = useMemo(() => {
    const map = new Map<string, Sched[]>();
    rows.forEach((r) => {
      const k = (r.room || "—").trim();
      map.set(k, [...(map.get(k) || []), r]);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt"));
  }, [rows]);

  const byTeacher = useMemo(() => {
    const map = new Map<string, Sched[]>();
    rows.forEach((r) => {
      const teacher = (r.source_recurring_id && teachersMap.get(r.source_recurring_id)) || "—";
      map.set(teacher, [...(map.get(teacher) || []), r]);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt"));
  }, [rows, teachersMap]);

  // ───────── Helpers de estado seguro (enum-safe)
  async function setLessonStatusEnumSafe(id: string, desired: string): Promise<string | null> {
    // alguns projetos têm 'no_show' outros 'show'; alguns não têm 'completed'
    const attempts: string[] =
      desired === "no_show" ? ["no_show", "show"] :
      desired === "completed" ? [] : // não existe no teu enum → não tenta
      [desired];

    for (const st of attempts) {
      const { error } = await supabase.from("scheduled_lessons").update({ status: st }).eq("id", id);
      if (!error) return st;
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("invalid input value for enum")) continue; // tenta próximo
      throw error; // erro real
    }
    return null; // nenhum aceite
  }

  // ───────── Helpers notificações / sala
  async function tryNotify(kind: string, payload: any) {
    try {
      await supabase.functions.invoke("notify-lesson-change", {
        method: "POST",
        body: { kind, channels: { email: notifyStudent, sms: notifySMS }, ...payload },
      });
    } catch { /* ignorar */ }
  }
  async function tryAutoAssignRoom(lessonId: string) {
    try {
      await supabase.functions.invoke("auto-assign-room", { method: "POST", body: { lessonId } });
    } catch { /* ignorar */ }
  }

  // ───────── Modal abrir
  function openLessonById(id: string) {
    const l = rows.find((x) => x.id === id);
    if (!l) return;
    setActive(l);
    setActErr(null);
    setSelectedHomeworkId(null);
    setNotifyStudent(true);
    setNotifySMS(true);
    setCancelReason("");
    const startLocal = l.starts_at.slice(0, 16).replace("Z", "");
    setRescheduleDT(startLocal);
    setRescheduleDuration(
      Math.max(15, Math.round(((new Date(l.ends_at).getTime() - new Date(l.starts_at).getTime()) / 60000)))
    );
    setOpen(true);
  }


  
  const [tpcReload, setTpcReload] = useState(0);

  // Efeito que carrega os TPCs recomendados para a sessão ativa
  useEffect(() => {
    (async () => {
      if (!active) { setRecommendedTPCs([]); return; }
      const studentAuth = profilesAuthMap.get(active.profile_id);
      if (!studentAuth) { setRecommendedTPCs([]); return; }
  
      const { data, error } = await supabase
        .from("homework_assignments")
        .select(`
          id, status, assigned_at,
          homeworks (
            id, title, description, type, created_by,
            material_id, quiz_id,
            materials:material_id (id, title, subject),
            quizzes:quiz_id (id, title, subject)
          ),
          submissions:homework_submissions (grade)
        `)
        .eq("student_id", studentAuth)
        .order("assigned_at", { ascending: false });
  
      if (error) { setRecommendedTPCs([]); return; }
  
      const mine = (data ?? []).filter((row: any) => (row?.homeworks?.created_by ?? null) === userId);
      const mapped = mine.map((row: any) => {
        const hw = row.homeworks;
        let kind: "homework" | "material" | "quiz" = "homework";
        let title = hw?.title ?? "TPC";
        let subject = null as string | null;
  
        if (hw?.materials) { kind = "material"; title = hw.materials.title ?? title; subject = hw.materials.subject ?? null; }
        else if (hw?.quizzes) { kind = "quiz"; title = hw.quizzes.title ?? title; subject = hw.quizzes.subject ?? null; }
  
        return {
          assignment_id: row.id,
          status: row.status,
          assigned_at: row.assigned_at,
          title,
          kind,
          subject,
          grade: row.submissions?.[0]?.grade ?? null,
        } as RecommendedTPC;
      });
  
      setRecommendedTPCs(mapped);
    })();
  }, [active, userId, profilesAuthMap, supabase, tpcReload]);
  
  // ───────── Ações modal
  async function actionCancel() {
    if (!active) return;
    setActLoading(true);
    setActErr(null);
    try {
      const applied = await setLessonStatusEnumSafe(active.id, "cancelled");
      // se enum não suportar 'cancelled', mantemos estado
      if (notifyStudent) await tryNotify("cancelled", { lessonId: active.id, reason: cancelReason });
      setRows((r) => r.map((x) => (x.id === active.id ? { ...x, status: applied ?? x.status } : x)));
      setOpen(false);
    } catch (e: any) {
      setActErr(e?.message ?? "Falha a cancelar.");
    } finally {
      setActLoading(false);
    }
  }

  async function actionMarkNoShow() {
    if (!active) return;
    setActLoading(true);
    setActErr(null);
    try {
      const applied = await setLessonStatusEnumSafe(active.id, "no_show");
      if (notifyStudent) await tryNotify("no_show", { lessonId: active.id });
      setRows((r) => r.map((x) => (x.id === active.id ? { ...x, status: applied ?? x.status } : x)));
      setOpen(false);
    } catch (e: any) {
      setActErr(e?.message ?? "Falha ao marcar no-show.");
    } finally {
      setActLoading(false);
    }
  }

  // “Concluída”: como o teu enum não tem 'completed', não tocamos no status; apenas notificamos.
  async function actionMarkCompleted() {
    if (!active) return;
    setActLoading(true);
    setActErr(null);
    try {
      // opcional: notificar
      await tryNotify("completed", { lessonId: active.id });
      // UI: só fechamos; status mantém-se
      setOpen(false);
    } catch (e: any) {
      setActErr("O esquema não suporta 'completed'. Estado manteve-se.");
    } finally {
      setActLoading(false);
    }
  }


// Tipos e estado do picker TPC
type TpcOption =
  | { kind: "material"; id: string; title: string }
  | { kind: "quiz"; id: string; title: string }
  | { kind: "homework"; id: string; title: string };

const [tpcOptions, setTpcOptions] = useState<TpcOption[]>([]);

useEffect(() => {
  (async () => {
    const opts: TpcOption[] = [];

    // TPCs (homeworks) existentes do professor
    if (userId) {
      const { data: hw } = await supabase
        .from("homeworks")
        .select("id,title")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });
      (hw ?? []).forEach((h: any) => opts.push({ kind: "homework", id: h.id, title: h.title }));
    }

    // Materiais
    {
      const { data: mats } = await supabase
        .from("materials")
        .select("id,title")
        .order("upload_date", { ascending: false })
        .limit(200);
      (mats ?? []).forEach((m: any) => opts.push({ kind: "material", id: m.id, title: m.title }));
    }

    // Quizzes
    {
      const { data: qz } = await supabase
        .from("quizzes")
        .select("id,title")
        .order("created_at", { ascending: false })
        .limit(200);
      (qz ?? []).forEach((q: any) => opts.push({ kind: "quiz", id: q.id, title: q.title }));
    }

    setTpcOptions(opts);
  })();
}, [userId, supabase]);

  async function actionReschedule() {
    if (!active) return;
    if (!rescheduleDT) {
      setActErr("Escolhe nova data/hora.");
      return;
    }
    setActLoading(true);
    setActErr(null);
    try {
      const newStartIso = isoFromLocalDT(rescheduleDT)!;
      const durMin = rescheduleDuration ?? ((new Date(active.ends_at).getTime() - new Date(active.starts_at).getTime()) / 60000);
      const newEndIso = addMinutes(newStartIso, durMin);

      // atualizar horas e repor status sempre “scheduled”
      const { error: upErr } = await supabase
        .from("scheduled_lessons")
        .update({ starts_at: newStartIso, ends_at: newEndIso, room: null, status: "scheduled" })
        .eq("id", active.id);
      if (upErr) {
        // fallback caso enum seja diferente
        await supabase.from("scheduled_lessons").update({ starts_at: newStartIso, ends_at: newEndIso, room: null }).eq("id", active.id);
        await setLessonStatusEnumSafe(active.id, "scheduled");
      }

      await tryAutoAssignRoom(active.id);
      if (notifyStudent) await tryNotify("rescheduled", { lessonId: active.id, starts_at: newStartIso, ends_at: newEndIso });

      setRows((r) =>
        r.map((x) =>
          x.id === active.id
            ? { ...x, starts_at: newStartIso, ends_at: newEndIso, room: null, status: "scheduled" }
            : x
        )
      );
      setOpen(false);
    } catch (e: any) {
      setActErr(e?.message ?? "Falha ao reagendar.");
    } finally {
      setActLoading(false);
    }
  }

  // Reembolso = CANCELAR + creditar 1h no perfil (profiles.horas += 1)
  async function actionRefundCreditHour() {
    if (!active) return;
    setActLoading(true);
    setActErr(null);
    try {
      // 1) cancelar (enum-safe)
      const applied = await setLessonStatusEnumSafe(active.id, "cancelled");

      // 2) creditar +1 hora ao perfil
      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("id, horas")
        .eq("id", active.profile_id)
        .single();
      if (pErr) throw pErr;
      const newHoras = (Number(prof?.horas ?? 0) || 0) + 1;
      const { error: uErr } = await supabase.from("profiles").update({ horas: newHoras }).eq("id", active.profile_id);
      if (uErr) throw uErr;

      // 3) notificar
      await tryNotify("refunded_hour", { lessonId: active.id, credited_hours: 1 });

      setRows((r) => r.map((x) => (x.id === active.id ? { ...x, status: applied ?? x.status } : x)));
      setOpen(false);
    } catch (e: any) {
      setActErr(e?.message ?? "Não foi possível processar o reembolso.");
    } finally {
      setActLoading(false);
    }
  }

  async function actionAssignHomework({
    preserveMainModal = false,
    homeworkId,
  }: { preserveMainModal?: boolean; homeworkId?: string } = {}) {
    if (!active) return;
  
    const finalHomeworkId = homeworkId ?? selectedHomeworkId;
    if (!finalHomeworkId) {
      setActErr("Escolhe um TPC.");
      return;
    }
  
    setActLoading(true);
    setActErr(null);
    try {
      const studentAuth = profilesAuthMap.get(active.profile_id);
      if (!studentAuth) throw new Error("Aluno sem auth_user_id.");
  
      await supabase.from("homework_assignments").insert({
        homework_id: finalHomeworkId,
        student_id: studentAuth,
        status: "assigned",
      } as any);
  
      await tryNotify("homework_assigned", {
        lessonId: active.id,
        homework_id: finalHomeworkId,
        student_auth_id: studentAuth,
      });
  
      if (!preserveMainModal) setOpen(false);
    } catch (e: any) {
      setActErr(e?.message ?? "Falha a atribuir TPC.");
    } finally {
      setActLoading(false);
    }
  }
  

  // ───────── Criar a partir de slot vazio
  type TimetableDay = TTLesson["day"];
  function isoFromDayAndTime(dayShort: TimetableDay, timeHHMM: string) {
    const base = new Date(weekStart);
    const desiredDayIdx = SHORT_TO_INDEX[dayShort];
    const curIdx = base.getDay();
    const delta = (desiredDayIdx + 7 - curIdx) % 7;
    base.setDate(base.getDate() + delta);
    const [h, m] = timeHHMM.split(":").map(Number);
    base.setHours(h, m || 0, 0, 0);
    return base.toISOString();
  }

  function onEmptySlot(day: TTLesson["day"], time: string) {
    setCreateDay(day);
    setCreateTime(time);
    setCreateErr(null);
    setOpenCreate(true);
  }

  async function createLesson() {
    if (!createDay || !createTime) return;
    setCreateLoading(true);
    setCreateErr(null);
    try {
      if (!createSubjectId) throw new Error("Escolhe a disciplina.");
      if (!createProfileId) throw new Error("Escolhe o aluno.");
      const owner = view === "pessoal" ? userId : createTeacherId || userId;
      if (!owner) throw new Error("Sem professor associado.");

      const startIso = isoFromDayAndTime(createDay, createTime);
      const endIso = addMinutes(startIso, createDuration);

      const { data, error } = await supabase
        .from("scheduled_lessons")
        .insert({
          owner_auth_user_id: owner,
          profile_id: createProfileId,
          subject_id: createSubjectId,
          starts_at: startIso,
          ends_at: endIso,
          status: "scheduled",
        } as any)
        .select("id, owner_auth_user_id, profile_id, subject_id, starts_at, ends_at, status, room, source_recurring_id")
        .single();
      if (error) throw error;

      // auto-assign room
      try { await supabase.functions.invoke("auto-assign-room", { method: "POST", body: { lessonId: data.id } }); } catch {}

      // otimista
      setRows((r) => [...r, data as Sched].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
      setOpenCreate(false);
    } catch (e: any) {
      setCreateErr(e?.message ?? "Falha a criar sessão.");
    } finally {
      setCreateLoading(false);
    }
  }


  // adiciona esta função dentro do componente
async function handleAssignFromOption(o: TpcOption) {
  try {
    setActErr(null);
    setActLoading(true);

    // 1) Determinar/garantir um homework_id válido
    let homeworkId: string | null = null;

    if (o.kind === "homework") {
      homeworkId = o.id;
    } else {
      if (!userId) throw new Error("Sem utilizador autenticado.");

      // tenta encontrar se já existe um homework para este recurso
      const resourceField = o.kind === "material" ? "material_id" : "quiz_id";
      const { data: existing } = await supabase
        .from("homeworks")
        .select("id")
        .eq(resourceField, o.id)
        .eq("created_by", userId)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        homeworkId = existing.id;
      } else {
        // cria um novo homework ‘wrapper’ para o material/quiz
        const insertPayload: any = {
          title: o.title,
          created_by: userId,
          type: o.kind, // se a tua coluna 'type' for enum compatível
        };
        if (o.kind === "material") insertPayload.material_id = o.id;
        if (o.kind === "quiz") insertPayload.quiz_id = o.id;

        const { data: created, error: hwErr } = await supabase
          .from("homeworks")
          .insert(insertPayload)
          .select("id")
          .single();
        if (hwErr) throw hwErr;
        homeworkId = created.id;
      }
    }

    if (!homeworkId) throw new Error("Falha a obter homework_id.");

    // 2) Atribuir ao aluno desta sessão (sem fechar o modal principal)
    await actionAssignHomework({ preserveMainModal: true, homeworkId });

    // 3) refrescar a lista recomendada e fechar só o picker
    setTpcReload((x) => x + 1);
    setTpcPickerOpen(false);
  } catch (e: any) {
    setActErr(e?.message ?? "Falha a atribuir TPC.");
  } finally {
    setActLoading(false);
  }
}


  // Para saber se a sessão ativa é “grupo”: mesma disciplina + hora + prof.
  const isActiveGroup = useMemo(() => {
    if (!active) return false;
    const k = (r: Sched) => `${r.subject_id || ""}|${r.starts_at}|${r.source_recurring_id || ""}`;
    const targetKey = k(active);
    return rows.filter((r) => k(r) === targetKey).length > 1;
  }, [active, rows]);

  // ───────── Render
  return (
    <>
      <Helmet>
        <title>Horários - Professor | Árvore do Conhecimento</title>
        <meta name="description" content="Quatro vistas: institucional, pessoal, por salas e por professores" />
      </Helmet>

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Horários</h1>
            <p className="text-muted-foreground">Vê e organiza as tuas aulas por diferentes vistas.</p>
          </div>

          {/* Semana selector */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setAnchor(new Date(weekStart.getTime() - 24 * 3600 * 1000))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Badge variant="secondary" className="rounded-full px-3 py-1">{rangeLabel}</Badge>
            <Button variant="outline" size="icon" onClick={() => setAnchor(new Date(weekEnd.getTime()))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Total de Aulas" icon={<Calendar className="h-4 w-4 text-primary" />} value={String(stats.total)} desc="Na semana selecionada" />
          <StatCard title="Individuais" icon={<Users className="h-4 w-4 text-blue-600" />} value={String(stats.individualClasses)} desc="Heurística por agrupamento" />
          <StatCard title="Grupos" icon={<LayoutGrid className="h-4 w-4 text-purple-600" />} value={String(stats.groupClasses)} desc="Mesmo horário+prof+disciplina" />
          <StatCard title="Horas Semanais" icon={<Clock className="h-4 w-4 text-green-600" />} value={`${stats.totalHours}h`} desc="Soma das durações" />
        </div>

        {/* Tabs 4 vistas */}
        <Tabs value={view} onValueChange={(v) => setView(v as ViewKey)} className="w-full">
          <TabsList className="flex flex-wrap gap-2">
            <TabsTrigger value="institucional" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Institucional
            </TabsTrigger>
            <TabsTrigger value="pessoal" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" /> Pessoal
            </TabsTrigger>
            <TabsTrigger value="salas" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" /> Por Salas
            </TabsTrigger>
            <TabsTrigger value="professores" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> Por Professores
            </TabsTrigger>
          </TabsList>

          {/* Institucional */}
          <TabsContent value="institucional" className="mt-4 space-y-4">
            <Card className="glass-panel">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Vista Institucional
                  </CardTitle>
                  <CardDescription>Todas as aulas da instituição (semana atual)</CardDescription>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => { setOpenCreate(true); setCreateDay("Seg"); setCreateTime("15:00"); }}>
                  <Plus className="h-4 w-4" /> Nova sessão
                </Button>
              </CardHeader>
              <CardContent>
                <Legend />
                {rows.length === 0 ? <Empty /> : (
                  <Timetable
                    lessons={timetableLessons}
                    onLessonClick={(l) => l.meta?.scheduledId && openLessonById(l.meta.scheduledId)}
                    onEmptySlotClick={onEmptySlot}
                  />
                )}
              </CardContent>
            </Card>

            <GroupList
              title="Por Salas"
              groups={byRoom}
              subjectsMap={subjectsMap}
              teachersMap={teachersMap}
              profilesMap={profilesMap}
              onOpen={openLessonById}
            />
          </TabsContent>

          {/* Pessoal */}
          <TabsContent value="pessoal" className="mt-4 space-y-4">
            <Card className="glass-panel">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-primary" />
                    Vista Pessoal
                  </CardTitle>
                  <CardDescription>Aulas atribuídas a mim (semana atual)</CardDescription>
                </div>
                <Button variant="outline" className="gap-2" onClick={() => { setOpenCreate(true); setCreateDay("Seg"); setCreateTime("15:00"); }}>
                  <Plus className="h-4 w-4" /> Nova sessão
                </Button>
              </CardHeader>
              <CardContent>
                <Legend />
                {rows.length === 0 ? <Empty /> : (
                  <Timetable
                    lessons={timetableLessons}
                    onLessonClick={(l) => l.meta?.scheduledId && openLessonById(l.meta.scheduledId)}
                    onEmptySlotClick={onEmptySlot}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Por Salas */}
          <TabsContent value="salas" className="mt-4 space-y-4">
            <GroupList
              title="Vista por Salas"
              groups={byRoom}
              subjectsMap={subjectsMap}
              teachersMap={teachersMap}
              profilesMap={profilesMap}
              onOpen={openLessonById}
            />
          </TabsContent>

          {/* Por Professores */}
          <TabsContent value="professores" className="mt-4 space-y-4">
            <GroupList
              title="Vista por Professores"
              groups={byTeacher}
              subjectsMap={subjectsMap}
              teachersMap={teachersMap}
              profilesMap={profilesMap}
              onOpen={openLessonById}
            />
          </TabsContent>
        </Tabs>

        {loading && <div className="text-sm text-muted-foreground">A carregar…</div>}
        {err && <div className="text-sm text-destructive">{err}</div>}
      </div>

      {/* MODAL AÇÕES (scrollable + tabs internos MAIS COMPLETO) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Gestão da explicação
            </DialogTitle>
            <DialogDescription>Operações rápidas sobre a sessão.</DialogDescription>
          </DialogHeader>

          {!active ? (
            <div className="py-10"><Empty text="Sem sessão selecionada." /></div>
          ) : (
            <div className="space-y-4">
              {/* Cabeçalho resumo com pills */}
              <div className="rounded-xl border p-3 bg-white flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="text-sm font-semibold">{subjectsMap.get(active.subject_id || "") || "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {PT_DAYS_LONG[new Date(active.starts_at).getDay()]},{" "}
                    {timeHHMM(active.starts_at)} — {timeHHMM(active.ends_at)} •{" "}
                    {(active.source_recurring_id && teachersMap.get(active.source_recurring_id)) || "—"} •{" "}
                    {profilesMap.get(active.profile_id) || "—"} • {active.room || "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <GroupPill isGroup={isActiveGroup} />
                  <StatusPill status={active.status} />
                </div>
              </div>

              {/* Ações rápidas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button variant="outline" className="w-full" onClick={actionMarkCompleted}>
                  <Check className="h-4 w-4 mr-2" /> Concluída
                </Button>
                <Button variant="outline" className="w-full" onClick={actionMarkNoShow}>
                  <AlertTriangle className="h-4 w-4 mr-2" /> No-show
                </Button>
                <Button variant="outline" className="w-full" onClick={() => tryNotify("reminder_now", { lessonId: active.id })}>
                  <Bell className="h-4 w-4 mr-2" /> Enviar lembrete
                </Button>
                <Button variant="destructive" className="w-full" onClick={actionCancel}>
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
              </div>

              {/* Tabs detalhadas */}
              <Tabs defaultValue="resumo" className="w-full">
                <TabsList className="flex flex-wrap gap-2 mb-2">
                  <TabsTrigger value="resumo">Resumo</TabsTrigger>
                  <TabsTrigger value="tpc">TPC</TabsTrigger>
                  <TabsTrigger value="estado">Estado</TabsTrigger>
                  <TabsTrigger value="reagendar">Reagendar</TabsTrigger>
                  <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                </TabsList>

                {/* Resumo extra */}
                <TabsContent value="resumo" className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground mb-1">Aluno</div>
                      <div className="text-sm font-medium">{profilesMap.get(active.profile_id) || "—"}</div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground mb-1">Professor</div>
                      <div className="text-sm font-medium">
                        {(active.source_recurring_id && teachersMap.get(active.source_recurring_id)) || "—"}
                      </div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground mb-1">Disciplina</div>
                      <div className="text-sm font-medium">{subjectsMap.get(active.subject_id || "") || "—"}</div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-muted-foreground mb-1">Sala</div>
                      <div className="text-sm font-medium">{active.room || "—"}</div>
                    </div>
                  </div>
                </TabsContent>

                {/* TPC */}
                <TabsContent value="tpc" className="space-y-4">
  <div className="text-sm font-medium flex items-center gap-2">
    <FileText className="h-4 w-4" /> TPCs desta sessão
  </div>

  {/* Recomendados (já atribuídos ao aluno desta sessão) */}
  {recommendedTPCs.length === 0 ? (
    <div className="rounded-xl border p-3 text-sm text-muted-foreground">
      Sem TPCs atribuídos para este aluno por ti.
    </div>
  ) : (
    <div className="space-y-2">
      {recommendedTPCs.map((t) => (
        <div key={t.assignment_id} className="flex items-center justify-between rounded-lg border p-3 bg-white">
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {t.title} {t.subject ? <span className="opacity-60">• {t.subject}</span> : null}
            </span>
            <span className="text-xs opacity-70">
              {t.kind === "material" ? "Material" : t.kind === "quiz" ? "Quiz" : "TPC"} • {new Date(t.assigned_at).toLocaleString("pt-PT")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {typeof t.grade === "number" ? (
              <Badge variant="secondary" className="rounded-full">{t.grade}%</Badge>
            ) : (
              <Badge variant="outline" className="rounded-full">Sem nota</Badge>
            )}
            <StatusPill status={t.status} />
          </div>
        </div>
      ))}
    </div>
  )}

  {/* Ações gerais */}
  <div className="flex items-center gap-3 pt-1">
    <Button onClick={() => setTpcPickerOpen(true)}>
      <Plus className="h-4 w-4 mr-2" />
      Adicionar TPC
    </Button>
    <div className="flex items-center gap-3 ml-auto">
      <div className="flex items-center gap-2">
        <Switch checked={notifyStudent} onCheckedChange={setNotifyStudent} />
        <span className="text-xs text-muted-foreground">Notificar por email</span>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={notifySMS} onCheckedChange={setNotifySMS} />
        <span className="text-xs text-muted-foreground">Notificar por SMS</span>
      </div>
    </div>
  </div>
</TabsContent>

                {/* Estado */}
                <TabsContent value="estado" className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={actionMarkCompleted} disabled={actLoading}>
                      <Check className="h-4 w-4 mr-2" />
                      Marcar concluída
                    </Button>
                    <Button variant="outline" onClick={actionMarkNoShow} disabled={actLoading}>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Marcar no-show
                    </Button>
                  </div>

                  <div className="pt-4 space-y-2">
                    <div className="text-sm font-medium">Cancelar sessão</div>
                    <Textarea
                      placeholder="Motivo do cancelamento (opcional)"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch checked={notifyStudent} onCheckedChange={setNotifyStudent} />
                        <span className="text-xs text-muted-foreground">Notificar por email</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={notifySMS} onCheckedChange={setNotifySMS} />
                        <span className="text-xs text-muted-foreground">Notificar por SMS</span>
                      </div>
                    </div>
                    <Button variant="destructive" onClick={actionCancel} disabled={actLoading}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </TabsContent>

                {/* Reagendar */}
                <TabsContent value="reagendar" className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                    <Label className="text-xs text-muted-foreground sm:col-span-1">Nova data/hora</Label>
                    <Input
                      className="sm:col-span-2"
                      type="datetime-local"
                      value={rescheduleDT}
                      onChange={(e) => setRescheduleDT(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                    <Label className="text-xs text-muted-foreground sm:col-span-1">Duração (min)</Label>
                    <Select
                      value={String(rescheduleDuration ?? "")}
                      onValueChange={(v) => setRescheduleDuration(Number(v))}
                    >
                      <SelectTrigger className="sm:col-span-2">
                        <SelectValue placeholder="Seleciona" />
                      </SelectTrigger>
                      <SelectContent>
                        {[30, 45, 60, 90, 120].map((d) => (
                          <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={notifyStudent} onCheckedChange={setNotifyStudent} />
                      <span className="text-xs text-muted-foreground">Notificar por email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={notifySMS} onCheckedChange={setNotifySMS} />
                      <span className="text-xs text-muted-foreground">Notificar por SMS</span>
                    </div>
                  </div>
                  <Button onClick={actionReschedule} disabled={actLoading}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reagendar (repõe “Agendada”)
                  </Button>
                </TabsContent>

                {/* Financeiro */}
                <TabsContent value="financeiro" className="space-y-3">
                  <div className="rounded-xl border p-3 bg-white">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Processar reembolso
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Isto **cancela** a sessão e **credita 1 hora** na conta do aluno.
                    </div>
                  </div>
                  <Button variant="outline" onClick={actionRefundCreditHour} disabled={actLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    Reembolsar e creditar 1h
                  </Button>
                </TabsContent>
              </Tabs>

              {actErr && <div className="text-sm text-destructive mt-2">{actErr}</div>}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

         {/* MODAL PICKER DE TPCs (não fecha o modal principal) */}
<Dialog open={tpcPickerOpen} onOpenChange={setTpcPickerOpen}>
  <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Escolher TPC</DialogTitle>
      <DialogDescription>Filtra, pesquisa e adiciona materiais/quizzes ou reutiliza TPCs.</DialogDescription>
    </DialogHeader>

    {/* Barras de filtro/pesquisa */}
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex-1">
        <Input
          placeholder="Pesquisar por título..."
          value={tpcSearch}
          onChange={(e) => setTpcSearch(e.target.value)}
        />
      </div>
      <Select value={tpcFilterKind} onValueChange={(v) => setTpcFilterKind(v as any)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="material">Materiais</SelectItem>
          <SelectItem value="quiz">Quizzes</SelectItem>
          <SelectItem value="homework">TPCs existentes</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Grid de cards */}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3">
      {tpcOptions
        .filter(o => tpcFilterKind === "all" ? true : o.kind === tpcFilterKind)
        .filter(o => tpcSearch ? o.title.toLowerCase().includes(tpcSearch.toLowerCase()) : true)
        .map((o) => (
          <div key={`${o.kind}-${o.id}`} className="rounded-xl border p-4 bg-white flex flex-col justify-between">
            <div>
              <div className="text-xs uppercase opacity-60 mb-1">
                {o.kind === "material" ? "Material" : o.kind === "quiz" ? "Quiz" : "TPC existente"}
              </div>
              <div className="font-medium">{o.title}</div>
            </div>
            <div className="pt-3">
            <Button
  className="w-full"
  onClick={() => handleAssignFromOption(o)}
>
  <Send className="h-4 w-4 mr-2" />
  Atribuir
</Button>

            </div>
          </div>
        ))}
    </div>

    <DialogFooter>
      <Button variant="ghost" onClick={() => setTpcPickerOpen(false)}>Fechar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

                 
      {/* MODAL CRIAR (slot vazio) */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nova explicação
            </DialogTitle>
            <DialogDescription>Agendar sessão rapidamente a partir do slot.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Dia</Label>
                <Input value={createDay ?? ""} readOnly />
              </div>
              <div>
                <Label className="text-xs">Hora</Label>
                <Input value={createTime} readOnly />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Disciplina</Label>
                <Select value={createSubjectId} onValueChange={setCreateSubjectId}>
                  <SelectTrigger><SelectValue placeholder="Seleciona disciplina" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Aluno</Label>
                <Select value={createProfileId} onValueChange={setCreateProfileId}>
                  <SelectTrigger><SelectValue placeholder="Seleciona aluno" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name || "—"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Professor: só aparece na vista institucional (pode escolher qualquer) */}
            {view === "institucional" && (
              <div>
                <Label className="text-xs">Professor</Label>
                <Select value={createTeacherId} onValueChange={setCreateTeacherId}>
                  <SelectTrigger><SelectValue placeholder="Seleciona professor" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.full_name || t.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Duração (min)</Label>
                <Select value={String(createDuration)} onValueChange={(v) => setCreateDuration(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Escolhe" /></SelectTrigger>
                  <SelectContent>
                    {[30, 45, 60, 90].map((d) => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {createErr && <div className="text-sm text-destructive">{createErr}</div>}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button onClick={createLesson} disabled={createLoading}>
              <Save className="h-4 w-4 mr-2" />
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        .glass-panel {
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
        }
        .hover-lift { transition: transform .2s ease, box-shadow .2s ease; }
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 14px 40px rgba(0,0,0,0.12); }
      `}</style>
    </>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// UI sub-components

function StatCard({ title, icon, value, desc }: { title: string; icon: React.ReactNode; value: string; desc: string }) {
  return (
    <Card className="glass-panel hover-lift">
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <CardDescription>{desc}</CardDescription>
      </CardContent>
    </Card>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs bg-blue-50 border-blue-200 text-blue-700">
        <span className="h-2 w-2 rounded-full bg-blue-500" /> Individual
      </span>
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs bg-purple-50 border-purple-200 text-purple-700">
        <span className="h-2 w-2 rounded-full bg-purple-500" /> Grupo (mesma disciplina+hora+professor)
      </span>
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs bg-amber-50 border-amber-200 text-amber-700">
        <span className="h-2 w-2 rounded-full bg-amber-500" /> Estado
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    scheduled: { label: "Agendada", cls: "bg-amber-50 border-amber-200 text-amber-700" },
    completed: { label: "Concluída", cls: "bg-emerald-50 border-emerald-200 text-emerald-700" }, // apenas UI
    cancelled: { label: "Cancelada", cls: "bg-rose-50 border-rose-200 text-rose-700" },
    no_show:  { label: "No-show",  cls: "bg-zinc-50 border-zinc-200 text-zinc-700" },
    show:     { label: "No-show",  cls: "bg-zinc-50 border-zinc-200 text-zinc-700" }, // alguns esquemas usam 'show'
  };
  const it = map[status] || { label: status, cls: "bg-zinc-50 border-zinc-200 text-zinc-700" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] ${it.cls}`}>
      <Check className="h-3 w-3 opacity-70" />
      {it.label}
    </span>
  );
}

function GroupPill({ isGroup }: { isGroup: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] ${
      isGroup ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-blue-50 border-blue-200 text-blue-700"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isGroup ? "bg-purple-500" : "bg-blue-500"}`} />
      {isGroup ? "Grupo" : "Individual"}
    </span>
  );
}

function GroupList({
  title,
  groups,
  subjectsMap,
  teachersMap,
  profilesMap,
  onOpen,
}: {
  title: string;
  groups: [string, Sched[]][];
  subjectsMap: Map<string, string>;
  teachersMap: Map<string, string>;
  profilesMap: Map<string, string>;
  onOpen: (id: string) => void;
}) {
  return (
    
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>Aulas agrupadas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.length === 0 && <Empty text="Sem dados nesta vista." />}
        {groups.map(([label, list]) => {
          const ordered = [...list].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
          const mkKey = (r: Sched) => `${r.subject_id || ""}|${r.starts_at}|${r.source_recurring_id || ""}`;
          const counts = new Map<string, number>();
          ordered.forEach((r) => counts.set(mkKey(r), (counts.get(mkKey(r)) || 0) + 1));

          return (
            <div key={label} className="rounded-xl border p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{label}</div>
                <Badge variant="outline">{ordered.length} aulas</Badge>
              </div>
              <div className="space-y-2">
                {ordered.map((r) => {
                  const subj = subjectsMap.get(r.subject_id || "") || "—";
                  const teacher = r.source_recurring_id ? (teachersMap.get(r.source_recurring_id) || "—") : "—";
                  const student = profilesMap.get(r.profile_id) || "—";
                  const isGroup = (counts.get(mkKey(r)) || 0) > 1;

                  return (
                    <button
                      key={r.id}
                      onClick={() => onOpen(r.id)}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 w-full text-left hover:bg-primary/5 transition"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs opacity-70">
                          {PT_DAYS_LONG[new Date(r.starts_at).getDay()]}, {timeHHMM(r.starts_at)} — {timeHHMM(r.ends_at)}
                        </span>
                        <span className="text-sm font-medium">{subj} • {student}</span>
                        <span className="text-xs opacity-80">{teacher} • {r.room || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GroupPill isGroup={isGroup} />
                        <StatusPill status={r.status} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );

          
        })}
      </CardContent>
    </Card>
  );
}
