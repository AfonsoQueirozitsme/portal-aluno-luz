// file: src/pages/Professor/AlunoRelatorio.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue
} from "@/components/ui/select";
import {
  ArrowLeft, Mail, Phone, MapPin, User, CreditCard, Save, Undo2,
  Plus, Trash2, Calendar as CalIcon, Clock, RefreshCcw, X, Users, Tag, Check
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

/* =======================
   CONSTANTES / HELPERS
   ======================= */

const NATIONALITIES = [
  { code: "PT", label: "🇵🇹 Portugal" },
  { code: "BR", label: "🇧🇷 Brasil" },
  { code: "ES", label: "🇪🇸 Espanha" },
  { code: "FR", label: "🇫🇷 França" },
  { code: "GB", label: "🇬🇧 Reino Unido" },
  { code: "US", label: "🇺🇸 Estados Unidos" },
  { code: "AO", label: "🇦🇴 Angola" },
  { code: "MZ", label: "🇲🇿 Moçambique" },
  { code: "CV", label: "🇨🇻 Cabo Verde" },
  { code: "IT", label: "🇮🇹 Itália" },
];

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];

const ROOMS = ["Sala 1", "Sala 2", "Sala 3", "Sala 4"]; // podes aumentar
const ROOM_CAPACITY = 6; // capacidade por sala (ajusta)

const isUUID = (v: string) => /^[0-9a-fA-F-]{36}$/.test(v);
const pad = (n: number) => n.toString().padStart(2, "0");
const ymOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const toLocal = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" }) : "—";
const within24h = (iso: string) => new Date(iso).getTime() - Date.now() < 24 * 60 * 60 * 1000;
const monthRange = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(Date.UTC(y, (m - 1), 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { start, end };
};
const timeStrToHM = (s: string) => {
  const [hh, mm] = s.split(":").map(Number);
  return { hh, mm };
};
const setDateTimeUTC = (d: Date, hh: number, mm: number) => {
  const dt = new Date(d);
  dt.setUTCHours(hh, mm, 0, 0);
  return dt;
};

/* Pill helpers (estilo bonito) */
const Pill = ({ children, tone = "default", title }: { children: any; tone?: "default" | "success" | "warn" | "danger" | "info" | "brand"; title?: string }) => {
  const tones: Record<string, string> = {
    default: "bg-muted text-foreground",
    success: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    warn: "bg-amber-100 text-amber-800 border border-amber-300",
    danger: "bg-red-100 text-red-800 border border-red-300",
    info: "bg-sky-100 text-sky-800 border border-sky-300",
    brand: "bg-primary/10 text-primary border border-primary/30",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${tones[tone]} whitespace-nowrap`}
      style={{ lineHeight: 1 }}
    >
      {children}
    </span>
  );
};

type ScheduledLessonRow = {
  id: string;
  profile_id: string;
  subject_id: string | null;
  starts_at: string;   // ISO
  ends_at: string;     // ISO
  status: "scheduled" | "cancelled" | "completed" | "no_show";
  room?: string | null;
  subject?: { name: string } | null;
  recurring?: { teacher: string | null } | null;
};

type ProfileLite = { id: string; full_name: string | null; phone: string | null };

/* =======================
   COMPONENTE
   ======================= */

export default function AlunoRelatorio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canonical = useMemo(() => `${window.location.origin}/professor/alunos/${id ?? ""}`, [id]);

  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);

  const [draft, setDraft] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);

  // Recorrentes
  const [recurring, setRecurring] = useState<any[]>([]);
  const [recAdd, setRecAdd] = useState<{ weekday: number | ""; start_time: string; duration_min: number | ""; subject_id: string | ""; teacher: string; room: string; }>({
    weekday: "",
    start_time: "18:00",
    duration_min: 60,
    subject_id: "",
    teacher: "",
    room: "",
  });
  const [recSaving, setRecSaving] = useState(false);

  // Agendadas (mês)
  const [ym, setYm] = useState(() => ymOf(new Date()));
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [schedAdd, setSchedAdd] = useState<{ date: string; time: string; duration_min: number | ""; subject_id: string | ""; teacher: string }>({
    date: "", time: "18:00", duration_min: 60, subject_id: "", teacher: ""
  });
  const [schedSaving, setSchedSaving] = useState(false);
  const [genSaving, setGenSaving] = useState(false);

  // Para apresentar tamanho do grupo e professor (via recurring)
  const [recMapById, setRecMapById] = useState<Map<string, any>>(new Map());

  // Loader
  const Spinner = () => (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 rounded-full animate-[spin_1.1s_linear_infinite]" style={{
          backgroundImage: "var(--gradient-hero)",
          WebkitMask: "radial-gradient(farthest-side, transparent 58%, #000 60%)",
          mask: "radial-gradient(farthest-side, transparent 58%, #000 60%)",
          filter: "drop-shadow(0 10px 30px rgba(0,0,0,.25))",
        }} />
        <div className="absolute inset-3 rounded-full animate-[spin_1.3s_linear_infinite_reverse] opacity-70" style={{
          backgroundImage: "var(--gradient-hero)",
          WebkitMask: "radial-gradient(farthest-side, transparent 72%, #000 74%)",
          mask: "radial-gradient(farthest-side, transparent 72%, #000 74%)",
        }} />
        <div className="absolute inset-0 animate-[spin_2.2s_linear_infinite]">
          <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-md" style={{ transform: "translate(-50%, -50%) translateY(-40px)" }} />
        </div>
      </div>
    </div>
  );

  /* ========= Fetch Profile (robusto) ========= */

  async function fetchProfileByAny(idOrUser: string) {
    // 1) profiles.id
    if (isUUID(idOrUser)) {
      const { data } = await supabase.from("profiles").select("*").eq("id", idOrUser).maybeSingle();
      if (data) return data;
    }
    // 2) profiles.auth_user_id
    if (isUUID(idOrUser)) {
      const { data } = await supabase.from("profiles").select("*").eq("auth_user_id", idOrUser).limit(1);
      if (data && data[0]) return data[0];
    }
    // 3) profiles.username
    {
      const { data } = await supabase.from("profiles").select("*").eq("username", idOrUser).limit(1);
      if (data && data[0]) return data[0];
    }
    // 4) users.id -> email -> profiles.email
    if (isUUID(idOrUser)) {
      const { data: u } = await supabase.from("users").select("email").eq("id", idOrUser).maybeSingle();
      if (u?.email) {
        const { data: p } = await supabase.from("profiles").select("*").eq("email", u.email).limit(1);
        if (p && p[0]) return p[0];
      }
    }
    return null;
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) {
        setErr("Aluno inválido (identificador em falta).");
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr(null);

      const { data: sess } = await supabase.auth.getSession();
      const userId = sess?.session?.user?.id ?? null;
      setAuthUserId(userId);

      const p = await fetchProfileByAny(id);
      if (!alive) return;

      if (!p) {
        setErr("Perfil não encontrado.");
        setLoading(false);
        return;
      }
      setProfile(p);

      setDraft({
        full_name: p.full_name ?? "",
        username: p.username ?? "",
        email: p.email ?? "",
        phone: p.phone ?? "",
        year: (p as any).year ?? null,
        gender: p.gender ?? null,
        date_of_birth: (p as any).date_of_birth ?? "",
        nationality: p.nationality ?? "",
        institution: p.institution ?? "",
        level: p.level ?? null,
        special_needs: p.special_needs ?? "",
        notes: p.notes ?? "",
        tax_number: p.tax_number ?? "",
        address: p.address ?? "",
        postal_code: p.postal_code ?? "",
        city: p.city ?? "",
        saldo: p.saldo ?? 0,
        horas: p.horas ?? 0,
        privacy_share_email: p.privacy_share_email ?? false,
        privacy_share_phone: p.privacy_share_phone ?? false,
        privacy_newsletter: p.privacy_newsletter ?? false,
        privacy_statistics: p.privacy_statistics ?? true,
        allow_pospago: p.allow_pospago ?? false,
        wants_receipt: p.wants_receipt ?? false,
      });

      const { data: subj } = await supabase.from("subjects").select("id, name").order("name", { ascending: true });
      if (alive && subj) setSubjects(subj as any[]);

      const { data: rec } = await supabase
        .from("recurring_lessons")
        .select("*")
        .eq("profile_id", p.id)
        .order("weekday", { ascending: true })
        .order("start_time", { ascending: true });
      if (alive && rec) setRecurring(rec as any[]);

      await reloadScheduled(p.id, ym);
      setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!profile?.id) return;
    reloadScheduled(profile.id, ym);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ym, profile?.id]);

  async function reloadScheduled(profileId: string, ymStr: string) {
    const { start, end } = monthRange(ymStr);

    // buscar agendadas no mês
    const { data: sched, error: eS } = await supabase
      .from("scheduled_lessons")
      .select("*")
      .eq("profile_id", profileId)
      .gte("starts_at", start.toISOString())
      .lte("starts_at", end.toISOString())
      .order("starts_at", { ascending: true });

    if (eS) {
      setErr("Erro a carregar explicações agendadas.");
      setScheduled([]);
      setRecMapById(new Map());
      return;
    }

    setScheduled(sched || []);

    // buscar recurrences ligadas (para sabermos teacher)
    const recIds = Array.from(new Set((sched || []).map(s => s.source_recurring_id).filter(Boolean)));
    if (recIds.length) {
      const { data: recs } = await supabase.from("recurring_lessons").select("*").in("id", recIds);
      setRecMapById(new Map((recs || []).map((r: any) => [r.id, r])));
    } else {
      setRecMapById(new Map());
    }
  }

  /* ========= Guardar profile ========= */

  const setF = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }));

  const handleReset = () => {
    if (!profile) return;
    setDraft({
      full_name: profile.full_name ?? "",
      username: profile.username ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      year: (profile as any).year ?? null,
      gender: profile.gender ?? null,
      date_of_birth: (profile as any).date_of_birth ?? "",
      nationality: profile.nationality ?? "",
      institution: profile.institution ?? "",
      level: profile.level ?? null,
      special_needs: profile.special_needs ?? "",
      notes: profile.notes ?? "",
      tax_number: profile.tax_number ?? "",
      address: profile.address ?? "",
      postal_code: profile.postal_code ?? "",
      city: profile.city ?? "",
      saldo: profile.saldo ?? 0,
      horas: profile.horas ?? 0,
      privacy_share_email: profile.privacy_share_email ?? false,
      privacy_share_phone: profile.privacy_share_phone ?? false,
      privacy_newsletter: profile.privacy_newsletter ?? false,
      privacy_statistics: profile.privacy_statistics ?? true,
      allow_pospago: profile.allow_pospago ?? false,
      wants_receipt: profile.wants_receipt ?? false,
    });
    setSaveMsg(null);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveMsg(null);
    setErr(null);
    try {
      if (!draft.username || String(draft.username).trim().length === 0)
        throw new Error("O username é obrigatório.");

      if (draft.username !== profile.username) {
        const { data: exists } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", draft.username)
          .neq("id", profile.id)
          .limit(1);
        if (exists && exists.length) throw new Error("Esse username já existe.");
      }

      const payload: any = {
        full_name: draft.full_name || null,
        username: draft.username,
        email: draft.email || null,
        phone: draft.phone || null,
        year: draft.year ?? null,
        gender: draft.gender ?? null,
        date_of_birth: draft.date_of_birth || null,
        nationality: draft.nationality || null,
        institution: draft.institution || null,
        level: draft.level ?? null,
        special_needs: draft.special_needs || null,
        notes: draft.notes || null,
        tax_number: draft.tax_number || null,
        address: draft.address || null,
        postal_code: draft.postal_code || null,
        city: draft.city || null,
        saldo: draft.saldo !== "" ? Number(draft.saldo) : 0,
        horas: draft.horas !== "" ? Number(draft.horas) : 0,
        privacy_share_email: !!draft.privacy_share_email,
        privacy_share_phone: !!draft.privacy_share_phone,
        privacy_newsletter: !!draft.privacy_newsletter,
        privacy_statistics: !!draft.privacy_statistics,
        allow_pospago: !!draft.allow_pospago,
        wants_receipt: !!draft.wants_receipt,
        updated_at: new Date().toISOString(),
      };

      const { error: upErr } = await supabase.from("profiles").update(payload).eq("id", profile.id);
      if (upErr) throw upErr;

      const { data: p2, error: e2 } = await supabase.from("profiles").select("*").eq("id", profile.id).maybeSingle();
      if (e2 || !p2) throw e2 || new Error("Falha ao recarregar perfil.");
      setProfile(p2);
      setSaveMsg("Dados guardados com sucesso.");
    } catch (e: any) {
      setErr(e?.message ?? "Não foi possível guardar os dados.");
    } finally {
      setSaving(false);
    }
  };

  /* ========= Lógica de SALA (auto) =========
     - Agrupa por (starts_at + subject_id + teacher)
     - Se já existir grupo nessa hora com o mesmo professor/discip, usa a mesma sala
     - Caso contrário, escolhe a primeira sala com ocupação < ROOM_CAPACITY
     - Se a coluna `room` não existir em scheduled_lessons, ignoramos o write (catch) */

  type ExistingAtTime = { id: string; room?: string | null; subject_id?: string | null; source_recurring_id?: string | null; status?: string }[];

  async function chooseRoomFor(startsAtISO: string, subjectId: string | null, teacher?: string | null) {
    // buscar aulas nesta hora (todas as profiles)
    const { data: atTime } = await supabase
      .from("scheduled_lessons")
      .select("id, room, subject_id, source_recurring_id, status")
      .eq("starts_at", startsAtISO)
      .eq("status", "scheduled");

    // tentar agrupar pela mesma disciplina+professor numa sala existente
    if (atTime && atTime.length) {
      const recIds = Array.from(new Set(atTime.map(x => x.source_recurring_id).filter(Boolean))) as string[];
      let recsById = new Map<string, any>();
      if (recIds.length) {
        const { data: recs } = await supabase.from("recurring_lessons").select("id, teacher").in("id", recIds);
        recsById = new Map((recs || []).map((r: any) => [r.id, r]));
      }

      if (teacher) {
        const sameGroup = atTime.find(x =>
          x.subject_id === subjectId &&
          ((x.source_recurring_id && recsById.get(x.source_recurring_id)?.teacher) ? (recsById.get(x.source_recurring_id)?.teacher === teacher) : false) &&
          x.room
        );
        if (sameGroup?.room) return sameGroup.room;
      }

      // sem professor (ou sem match): tenta agrupar só pela disciplina
      const sameSubj = atTime.find(x => x.subject_id === subjectId && x.room);
      if (sameSubj?.room) return sameSubj.room;

      // caso contrário, escolhe 1ª sala com lotação disponível
      const occ: Record<string, number> = {};
      for (const r of ROOMS) occ[r] = 0;
      for (const s of atTime) {
        if (s.room && ROOMS.includes(s.room)) occ[s.room] = (occ[s.room] || 0) + 1;
      }
      const free = ROOMS.find(r => (occ[r] || 0) < ROOM_CAPACITY);
      if (free) return free;
    }

    // se não havia nada nessa hora, usa a primeira
    return ROOMS[0];
  }

  /* ========= Recorrentes ========= */

  const addRecurring = async () => {
    if (!authUserId || !profile) return;
    if (!recAdd.weekday || !recAdd.start_time || !recAdd.duration_min) {
      setErr("Preenche dia da semana, hora e duração.");
      return;
    }
    setRecSaving(true);
    setErr(null);
    try {
      const payload: any = {
        owner_auth_user_id: authUserId,
        profile_id: profile.id,
        subject_id: recAdd.subject_id || null,
        weekday: Number(recAdd.weekday),
        start_time: recAdd.start_time, // "HH:MM"
        duration_min: Number(recAdd.duration_min),
        teacher: recAdd.teacher || null,
        room: recAdd.room || null, // opcional; não fixa a sala (a sala final é decidida ao agendar)
      };
      const { error } = await supabase.from("recurring_lessons").insert(payload);
      if (error) throw error;

      const { data: rec } = await supabase
        .from("recurring_lessons")
        .select("*")
        .eq("profile_id", profile.id)
        .order("weekday", { ascending: true })
        .order("start_time", { ascending: true });
      setRecurring(rec || []);

      setRecAdd({ weekday: "", start_time: "18:00", duration_min: 60, subject_id: "", teacher: "", room: "" });
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao criar recorrente.");
    } finally {
      setRecSaving(false);
    }
  };

  const removeRecurring = async (recId: string) => {
    const ok = confirm("Remover esta recorrência?");
    if (!ok) return;
    const { error } = await supabase.from("recurring_lessons").delete().eq("id", recId);
    if (error) {
      setErr("Não foi possível remover a recorrência.");
      return;
    }
    setRecurring((cur) => cur.filter((r) => r.id !== recId));
  };

  /* ========= Agendar (pontual), Cancelar, Gerar mês ========= */

  const addScheduled = async () => {
    if (!authUserId || !profile) return;
    if (!schedAdd.date || !schedAdd.time || !schedAdd.duration_min) {
      setErr("Preenche data, hora e duração.");
      return;
    }
    setSchedSaving(true);
    setErr(null);
    try {
      const { hh, mm } = timeStrToHM(schedAdd.time);
      const base = new Date(schedAdd.date + "T00:00:00Z");
      const start = setDateTimeUTC(base, hh, mm);
      const end = new Date(start.getTime() + Number(schedAdd.duration_min) * 60 * 1000);

      // sala automática (considera subject + teacher opcional)
      const chosenRoom = await chooseRoomFor(start.toISOString(), schedAdd.subject_id || null, schedAdd.teacher || null);

      const payload: any = {
        owner_auth_user_id: authUserId,
        profile_id: profile.id,
        subject_id: schedAdd.subject_id || null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        status: "scheduled",
      };

      // tentar guardar room se existir a coluna
      try {
        payload.room = chosenRoom;
      } catch {}

      const { error } = await supabase.from("scheduled_lessons").insert(payload);
      if (error) throw error;

      await reloadScheduled(profile.id, ym);
      setSchedAdd({ date: "", time: "18:00", duration_min: 60, subject_id: "", teacher: "" });
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao agendar a explicação.");
    } finally {
      setSchedSaving(false);
    }
  };

  const cancelScheduled = async (lesson: any) => {
    if (!lesson?.id) return;
    if (within24h(lesson.starts_at)) {
      alert("Só é possível cancelar com 24h de antecedência.");
      return;
    }
    const ok = confirm("Cancelar esta explicação?");
    if (!ok) return;
    const { error } = await supabase
      .from("scheduled_lessons")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("id", lesson.id);
    if (error) {
      setErr("Não foi possível cancelar.");
      return;
    }
    await reloadScheduled(profile.id, ym);
  };

  const generateMonthFromRecurring = async () => {
    if (!authUserId || !profile) return;
    if (recurring.length === 0) {
      alert("Não há recorrências para gerar.");
      return;
    }
    setGenSaving(true);
    setErr(null);
    try {
      const { start, end } = monthRange(ym);

      // já existentes no mês (para não duplicar e para ocupação/salas)
      const { data: existing } = await supabase
        .from("scheduled_lessons")
        .select("id, room, starts_at, subject_id, source_recurring_id, status")
        .gte("starts_at", start.toISOString())
        .lte("starts_at", end.toISOString());

      const existingByTime: Record<string, ExistingAtTime> = {};
      (existing || []).forEach((s) => {
        const key = new Date(s.starts_at).toISOString();
        existingByTime[key] = existingByTime[key] || [];
        existingByTime[key].push(s as any);
      });

      // construir dias do mês
      const days: Date[] = [];
      for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
        days.push(new Date(d));
      }

      const inserts: any[] = [];

      for (const rec of recurring) {
        const { hh, mm } = timeStrToHM(rec.start_time);
        for (const d of days) {
          const dow = ((d.getUTCDay() + 6) % 7) + 1; // JS 0..6 -> ISO 1..7
          if (dow !== Number(rec.weekday)) continue;

          const startAt = setDateTimeUTC(d, hh, mm);
          const endAt = new Date(startAt.getTime() + rec.duration_min * 60 * 1000);
          const key = startAt.toISOString();

          // se já existir para este aluno à mesma hora, ignora
          const alreadyForThisProfile =
            (existing || []).some((e) => e.profile_id === profile.id && new Date(e.starts_at).toISOString() === key);
          if (alreadyForThisProfile) continue;

          // sala automática olhando para existentes nessa hora (todas as profiles)
          const chosenRoom = await (async () => {
            const atTime = existingByTime[key] || [];
            // tenta agrupar por disciplina + professor
            if (atTime.length) {
              const recIds = Array.from(new Set(atTime.map(x => x.source_recurring_id).filter(Boolean))) as string[];
              let recsById = new Map<string, any>();
              if (recIds.length) {
                const { data: recs } = await supabase.from("recurring_lessons").select("id, teacher").in("id", recIds);
                recsById = new Map((recs || []).map((r: any) => [r.id, r]));
              }
              // tentar usar sala de um grupo já aberto (mesma disciplina + professor)
              const same = atTime.find(x =>
                x.subject_id === rec.subject_id &&
                ((x.source_recurring_id && recsById.get(x.source_recurring_id)?.teacher) ? (recsById.get(x.source_recurring_id)?.teacher === rec.teacher) : false) &&
                x.room
              );
              if (same?.room) return same.room;

              // caso sem professor/sem match: tenta sala com capacidade
              const occ: Record<string, number> = {};
              for (const r of ROOMS) occ[r] = 0;
              for (const s of atTime) {
                if (s.room && ROOMS.includes(s.room)) occ[s.room] = (occ[s.room] || 0) + 1;
              }
              const free = ROOMS.find(r => (occ[r] || 0) < ROOM_CAPACITY);
              if (free) return free;
            }
            return ROOMS[0];
          })();

          const payload: any = {
            owner_auth_user_id: authUserId,
            profile_id: profile.id,
            subject_id: rec.subject_id || null,
            starts_at: key,
            ends_at: endAt.toISOString(),
            source_recurring_id: rec.id,
            status: "scheduled",
          };
          try { payload.room = chosenRoom; } catch {}

          inserts.push(payload);
          // incrementa a ocupação localmente para a próxima iteração
          existingByTime[key] = existingByTime[key] || [];
          existingByTime[key].push({ id: "temp", room: chosenRoom, subject_id: rec.subject_id, source_recurring_id: rec.id, status: "scheduled" } as any);
        }
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from("scheduled_lessons").insert(inserts);
        if (error) throw error;
      }

      await reloadScheduled(profile.id, ym);
      alert(`Gerado: ${inserts.length} aula(s) a partir das recorrentes para ${ym}.`);
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao gerar o mês a partir das recorrentes.");
    } finally {
      setGenSaving(false);
    }
  };

  /* ========= RENDER ========= */

  if (loading) return <Spinner />;

  if (err) {
    return (
      <div className="p-6 space-y-4">
        <Helmet>
          <title>Relatório do Aluno</title>
          <link rel="canonical" href={canonical} />
        </Helmet>
        <Button asChild variant="ghost">
          <Link to="/professor/alunos"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar aos alunos</Link>
        </Button>
        <Card className="glass-panel">
          <CardContent className="p-6 text-destructive text-sm">{err}</CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) return null;

  const encarregado = {
    email: profile.email || "—",
    phone: profile.phone || "—",
    tax_number: profile.tax_number || "—",
    address: profile.address || "—",
    postal_code: profile.postal_code || "—",
    city: profile.city || "—",
    wants_receipt: profile.wants_receipt,
  };

  // mapa de grupos por (starts_at + room)
  const groupKey = (s: any) => `${new Date(s.starts_at).toISOString()}|${s.room || "-"}`;
  const groupCounts = scheduled.reduce<Record<string, number>>((acc, s) => {
    const k = groupKey(s);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <Helmet>
        <title>Relatório do Aluno — {profile.full_name || profile.username}</title>
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="flex items-center justify-between">
        <Button asChild variant="ghost">
          <Link to="/professor/alunos"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link>
        </Button>
        <div className="text-xs text-muted-foreground">
          Criado em: {toLocal(profile.created_at)} • Atualizado: {toLocal(profile.updated_at)}
        </div>
      </div>

      {/* Cabeçalho */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">{profile.full_name || profile.username}</span>
            <Pill tone="brand"><User className="h-3.5 w-3.5" /> @{profile.username}</Pill>
            {profile.year && <Pill tone="info">{profile.year}º ano</Pill>}
            {profile.city && <Pill><MapPin className="h-3.5 w-3.5" /> {profile.city}</Pill>}
          </CardTitle>
          <CardDescription>Resumo do aluno e dados do encarregado de educação</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{encarregado.email}</span>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{encarregado.phone}</span>
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              <Pill tone="default"><CreditCard className="h-3.5 w-3.5" /> NIF: {encarregado.tax_number}</Pill>
              {profile.nationality && <Pill tone="default"><Tag className="h-3.5 w-3.5" /> {profile.nationality}</Pill>}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>
                {encarregado.address}{encarregado.address ? ", " : ""}
                {encarregado.postal_code}{encarregado.postal_code ? " " : ""}
                {encarregado.city}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editar Profile */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Dados do Aluno</CardTitle>
          <CardDescription>Atualiza as informações do aluno e preferências</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {saveMsg && <div className="text-sm text-emerald-600">{saveMsg}</div>}
          {err && <div className="text-sm text-destructive">{err}</div>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Nome completo</label>
              <Input value={draft.full_name} onChange={(e) => setF("full_name", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Username *</label>
              <Input value={draft.username} onChange={(e) => setF("username", e.target.value)} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <Input value={draft.email} onChange={(e) => setF("email", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Telefone</label>
              <Input value={draft.phone ?? ""} onChange={(e) => setF("phone", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ano</label>
              <Input
                type="number" min={1} max={13}
                value={draft.year ?? ""}
                onChange={(e) => setF("year", e.target.value ? Number(e.target.value) : null)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Género</label>
              <Select value={draft.gender ?? ""} onValueChange={(v) => setF("gender", v || null)}>
                <SelectTrigger><SelectValue placeholder="Seleciona" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="other">Outro / Prefere não dizer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Data de Nascimento</label>
              <Input
                type="date"
                value={draft.date_of_birth ?? ""}
                onChange={(e) => setF("date_of_birth", e.target.value || null)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Nacionalidade</label>
              <Select
                value={draft.nationality ?? ""}
                onValueChange={(v) => setF("nationality", v || null)}
              >
                <SelectTrigger><SelectValue placeholder="Seleciona nacionalidade" /></SelectTrigger>
                <SelectContent>
                  {NATIONALITIES.map((n) => (
                    <SelectItem key={n.code} value={n.code}>{n.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Instituição de Ensino</label>
              <Input value={draft.institution ?? ""} onChange={(e) => setF("institution", e.target.value)} />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs text-muted-foreground">Necessidades Especiais</label>
              <Textarea
                placeholder="Ex.: Dislexia, DDAH, etc."
                value={draft.special_needs ?? ""}
                onChange={(e) => setF("special_needs", e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs text-muted-foreground">Notas / Outras Informações</label>
              <Textarea
                placeholder="Notas internas, preferências, observações…"
                value={draft.notes ?? ""}
                onChange={(e) => setF("notes", e.target.value)}
              />
            </div>

            {/* Contacto / Faturação */}
            <div>
              <label className="text-xs text-muted-foreground">NIF</label>
              <Input value={draft.tax_number ?? ""} onChange={(e) => setF("tax_number", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Morada</label>
              <Input value={draft.address ?? ""} onChange={(e) => setF("address", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Código Postal</label>
              <Input value={draft.postal_code ?? ""} onChange={(e) => setF("postal_code", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cidade</label>
              <Input value={draft.city ?? ""} onChange={(e) => setF("city", e.target.value)} />
            </div>

            {/* Finanças simples */}
            <div>
              <label className="text-xs text-muted-foreground">Saldo (€)</label>
              <Input type="number" step="0.01" value={draft.saldo ?? ""} onChange={(e) => setF("saldo", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Horas</label>
              <Input type="number" step="0.5" value={draft.horas ?? ""} onChange={(e) => setF("horas", e.target.value)} />
            </div>

            {/* Switches */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              <label className="flex items-center justify-between rounded-full border px-3 py-2">
                <span className="text-sm">Partilhar email</span>
                <Switch checked={!!draft.privacy_share_email} onCheckedChange={(v) => setF("privacy_share_email", v)} />
              </label>
              <label className="flex items-center justify-between rounded-full border px-3 py-2">
                <span className="text-sm">Partilhar telefone</span>
                <Switch checked={!!draft.privacy_share_phone} onCheckedChange={(v) => setF("privacy_share_phone", v)} />
              </label>
              <label className="flex items-center justify-between rounded-full border px-3 py-2">
                <span className="text-sm">Newsletter</span>
                <Switch checked={!!draft.privacy_newsletter} onCheckedChange={(v) => setF("privacy_newsletter", v)} />
              </label>
              <label className="flex items-center justify-between rounded-full border px-3 py-2">
                <span className="text-sm">Partilhar estatísticas</span>
                <Switch checked={!!draft.privacy_statistics} onCheckedChange={(v) => setF("privacy_statistics", v)} />
              </label>
              <label className="flex items-center justify-between rounded-full border px-3 py-2">
                <span className="text-sm">Permitir pós-pago</span>
                <Switch checked={!!draft.allow_pospago} onCheckedChange={(v) => setF("allow_pospago", v)} />
              </label>
              <label className="flex items-center justify-between rounded-full border px-3 py-2">
                <span className="text-sm">Pretende recibo/fatura</span>
                <Switch checked={!!draft.wants_receipt} onCheckedChange={(v) => setF("wants_receipt", v)} />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleReset}>
              <Undo2 className="h-4 w-4 mr-2" /> Repor
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "A guardar…" : "Guardar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recorrentes */}
      <Card className="glass-panel">
        <CardHeader className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalIcon className="h-5 w-5 text-primary" />
              Aulas Recorrentes (semanais)
            </CardTitle>
            <CardDescription>Padrões que geram as agendadas do mês</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {recurring.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem recorrências definidas.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dia</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Sala (sugerida)</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurring.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Pill tone="default">{WEEKDAYS.find(w => w.value === r.weekday)?.label || r.weekday}</Pill></TableCell>
                    <TableCell><Pill tone="brand">{r.start_time}</Pill></TableCell>
                    <TableCell><Pill tone="info">{r.duration_min} min</Pill></TableCell>
                    <TableCell>
                      <Pill tone="default">
                        {subjects.find(s => s.id === r.subject_id)?.name || "—"}
                      </Pill>
                    </TableCell>
                    <TableCell><Pill tone="default">{r.teacher || "—"}</Pill></TableCell>
                    <TableCell><Pill tone="default">{r.room || "—"}</Pill></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeRecurring(r.id)} title="Remover">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Adicionar recorrente */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 border rounded-xl p-3">
            <div>
              <label className="text-xs text-muted-foreground">Dia</label>
              <Select
                value={recAdd.weekday ? String(recAdd.weekday) : ""}
                onValueChange={(v) => setRecAdd((d) => ({ ...d, weekday: v ? Number(v) : "" }))}
              >
                <SelectTrigger><SelectValue placeholder="Seleciona" /></SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((w) => (<SelectItem key={w.value} value={String(w.value)}>{w.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Hora</label>
              <Input type="time" value={recAdd.start_time} onChange={(e) => setRecAdd((d) => ({ ...d, start_time: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Duração (min)</label>
              <Input type="number" value={recAdd.duration_min} onChange={(e) => setRecAdd((d) => ({ ...d, duration_min: e.target.value ? Number(e.target.value) : "" }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Disciplina</label>
              <Select
                value={recAdd.subject_id || ""}
                onValueChange={(v) => setRecAdd((d) => ({ ...d, subject_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="(Opcional)" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Professor</label>
              <Input value={recAdd.teacher} onChange={(e) => setRecAdd((d) => ({ ...d, teacher: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Sala (sugestão)</label>
              <Input value={recAdd.room} onChange={(e) => setRecAdd((d) => ({ ...d, room: e.target.value }))} placeholder="ex.: 2" />
            </div>
            <div className="md:col-span-7 flex justify-end">
              <Button onClick={addRecurring} disabled={recSaving}>
                <Plus className="h-4 w-4 mr-2" />
                {recSaving ? "A adicionar…" : "Adicionar recorrente"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agendadas (mês) */}
      <Card className="glass-panel">
        <CardHeader className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Aulas Agendadas — {ym}
            </CardTitle>
            <CardDescription>Explicações pontuais e geradas pelas recorrentes</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input type="month" value={ym} onChange={(e) => setYm(e.target.value)} className="w-[160px]" />
            <Button variant="outline" onClick={() => reloadScheduled(profile.id, ym)}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Recarregar
            </Button>
            <Button onClick={generateMonthFromRecurring} disabled={genSaving || recurring.length === 0}>
              <CalIcon className="h-4 w-4 mr-2" />
              {genSaving ? "A gerar…" : "Gerar mês pelas recorrentes"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {scheduled.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem aulas agendadas para {ym}.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Sala</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduled.map((s) => {
                  const d = new Date(s.starts_at);
                  const ds = d.toLocaleDateString("pt-PT");
                  const ts = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
                  const subjName = subjects.find(ss => ss.id === s.subject_id)?.name || "—";
                  const teacher = s.source_recurring_id ? (recMapById.get(s.source_recurring_id)?.teacher ?? "—") : "—";
                  const k = groupKey(s);
                  const size = groupCounts[k] || 1;
                  const canCancel = s.status !== "canceled" && !within24h(s.starts_at);

                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex gap-2 items-center">
                          <Pill tone="default">{ds}</Pill>
                          <Pill tone="brand">{ts}</Pill>
                        </div>
                      </TableCell>
                      <TableCell><Pill tone="info">{subjName}</Pill></TableCell>
                      <TableCell><Pill tone="default">{teacher}</Pill></TableCell>
                      <TableCell>
                        <Pill tone={size > 1 ? "success" : "default"} title={`${size} aluno(s) neste grupo`}>
                          <Users className="h-3.5 w-3.5" /> {size}
                        </Pill>
                      </TableCell>
                      <TableCell>
                        <Pill tone="default">{s.room || "—"}</Pill>
                      </TableCell>
                      <TableCell>
                        <Pill
                          tone={
                            s.status === "canceled" ? "danger" :
                            s.status === "scheduled" ? "brand" : "default"
                          }
                        >
                          {s.status}
                        </Pill>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => cancelScheduled(s)}
                            disabled={!canCancel}
                            title={canCancel ? "Cancelar" : "Não é possível cancelar (<24h ou já cancelada)"}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Agendar pontual (com professor opcional para melhor agrupamento) */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 border rounded-xl p-3">
            <div>
              <label className="text-xs text-muted-foreground">Data</label>
              <Input type="date" value={schedAdd.date} onChange={(e) => setSchedAdd((d) => ({ ...d, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Hora</label>
              <Input type="time" value={schedAdd.time} onChange={(e) => setSchedAdd((d) => ({ ...d, time: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Duração (min)</label>
              <Input type="number" value={schedAdd.duration_min} onChange={(e) => setSchedAdd((d) => ({ ...d, duration_min: e.target.value ? Number(e.target.value) : "" }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Disciplina</label>
              <Select
                value={schedAdd.subject_id || ""}
                onValueChange={(v) => setSchedAdd((d) => ({ ...d, subject_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="(Opcional)" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Professor (opcional)</label>
              <Input value={schedAdd.teacher} onChange={(e) => setSchedAdd((d) => ({ ...d, teacher: e.target.value }))} placeholder="Usado para agrupar" />
            </div>
            <div className="flex items-end justify-end">
              <Button onClick={addScheduled} disabled={schedSaving}>
                <Plus className="h-4 w-4 mr-2" />
                {schedSaving ? "A agendar…" : "Agendar pontual"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <style>
        {`
          .glass-panel {
            background: rgba(255,255,255,0.92);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            border: 1px solid rgba(0,0,0,0.06);
          }
        `}
      </style>
    </div>
  );
}
