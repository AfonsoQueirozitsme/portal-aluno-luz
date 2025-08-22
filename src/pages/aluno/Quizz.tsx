import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import {
  CheckCircle2,
  Circle,
  Flame,
  HelpCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trophy,
  PartyPopper,
  XCircle,
  Sparkles,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Tipos
type QType = "single" | "multi" | "truefalse";
type QuizQuestion = {
  id: string;
  type: QType;
  prompt: string;
  options: string[];
  correctIndices: number[];
  points: number;
};
type Quiz = { id: string; title: string; description?: string | null };

// ─────────────────────────────────────────────────────────────

export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const assignmentIdFromQuery = search.get("assignmentId") || null;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number | number[] | null>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // passo atual + estado da pergunta atual
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(false); // já confirmou?
  const [shake, setShake] = useState(false);       // anim. erro
  const [streak, setStreak] = useState(0);
  const atEnd = step >= questions.length;

  // resultado final
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const navigate = useNavigate();

  const canonical = useMemo(
    () => `${window.location.origin}/aluno/quiz/${id}`,
    [id]
  );

  // ─────────────────────────────────────────────────────────────
  // Carga de dados
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // Quiz
        const { data: q, error: qErr } = await supabase
          .from("quizzes")
          .select("id, title, description")
          .eq("id", id)
          .single();
        if (qErr) throw qErr;
        setQuiz(q as Quiz);

        // Perguntas
        const { data: qs, error: qsErr } = await supabase
          .from("quiz_questions")
          .select("id, statement, order_index")
          .eq("quiz_id", id)
          .order("order_index", { ascending: true });
        if (qsErr) throw qsErr;

        const qids = (qs ?? []).map((r: any) => r.id);

        // Opções
        const { data: opts, error: oErr } = await supabase
          .from("quiz_options")
          .select("question_id, text, is_correct")
          .in("question_id", qids);
        if (oErr) throw oErr;

        // Normalizar
        const grouped = new Map<string, { text: string; is_correct: boolean }[]>();
        (opts ?? []).forEach((o: any) =>
          grouped.set(o.question_id, [...(grouped.get(o.question_id) || []), { text: o.text, is_correct: !!o.is_correct }])
        );

        const normalized: QuizQuestion[] = (qs ?? []).map((r: any) => {
          const list = grouped.get(r.id) || [];
          const options = list.map((x) => x.text);
          const correctIndices = list.map((x, i) => (x.is_correct ? i : -1)).filter((i) => i >= 0);

          // inferir tipo
          const lower = options.map((t) => (t || "").trim().toLowerCase());
          let type: QType = "single";
          if (correctIndices.length > 1) type = "multi";
          if (
            options.length === 2 &&
            ((lower.includes("verdadeiro") && lower.includes("falso")) ||
              (lower.includes("true") && lower.includes("false")))
          ) {
            type = "truefalse";
          }

          return { id: r.id, type, prompt: r.statement, options, correctIndices, points: 1 };
        });

        setQuestions(normalized);
        setStep(0);
        setAnswers({});
        setRevealed(false);
        setStreak(0);
      } catch (e: any) {
        setErr(e?.message ?? "Falha a carregar o quiz.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ─────────────────────────────────────────────────────────────
  // Auxiliares
  const progressPercent = useMemo(() => {
    if (!questions.length) return 0;
    // estilo Duolingo: progresso por ecrã
    return Math.round((Math.min(step, questions.length) / questions.length) * 100);
  }, [step, questions]);

  function setAnswer(qid: string, value: any) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  function isCorrect(q: QuizQuestion, given: any) {
    if (given == null) return false;
    if (q.type === "single" || q.type === "truefalse") {
      return Number(given) === Number(q.correctIndices[0] ?? -999);
    }
    const g = Array.isArray(given) ? [...given].map(Number).sort() : [];
    const a = [...q.correctIndices].sort();
    return JSON.stringify(a) === JSON.stringify(g);
  }

  function gradeAll(): { pct: number; details: any } {
    let pts = 0;
    const perQ = questions.map((q) => {
      const given = answers[q.id];
      const ok = isCorrect(q, given);
      if (ok) pts += q.points ?? 1;
      return {
        question_id: q.id,
        correct: ok,
        given,
        correct_indices: q.correctIndices,
        points: q.points ?? 1,
      };
    });
    const total = questions.reduce((a, q) => a + (q.points ?? 1), 0) || 1;
    const pct = Math.round((pts / total) * 100);
    return { pct, details: { questions: perQ } };
  }

  const confetti = useCallback(async (power: "mini" | "final" = "mini") => {
    try {
      const c = (await import("canvas-confetti")).default;
      if (power === "mini") {
        c({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
      } else {
        const duration = 1800;
        const end = Date.now() + duration;
        (function frame() {
          c({ particleCount: 6, spread: 70, origin: { y: 0.6 } });
          if (Date.now() < end) requestAnimationFrame(frame);
        })();
      }
    } catch {
      // fallback emoji quick burst
      const el = document.createElement("div");
      el.style.position = "fixed";
      el.style.inset = "0";
      el.style.pointerEvents = "none";
      el.style.zIndex = "9999";
      document.body.appendChild(el);
      const N = power === "final" ? 80 : 32;
      for (let i = 0; i < N; i++) {
        const s = document.createElement("div");
        s.textContent = "🎉";
        s.style.position = "absolute";
        s.style.left = Math.random() * 100 + "%";
        s.style.top = "-10px";
        s.style.fontSize = 14 + Math.random() * (power === "final" ? 32 : 18) + "px";
        s.style.transition = "transform 1.2s ease, opacity 1.2s ease";
        el.appendChild(s);
        requestAnimationFrame(() => {
          s.style.transform = `translate(${(Math.random() - 0.5) * 240}px, ${window.innerHeight + 40}px) rotate(${(Math.random() - 0.5) * 240}deg)`;
          s.style.opacity = "0";
        });
      }
      setTimeout(() => document.body.removeChild(el), 1400);
    }
  }, []);

  // confirmar resposta (estilo Duolingo: mostra certo/errado, streak, botão “Continuar”)
  function confirmAnswer() {
    const q = questions[step];
    const given = answers[q.id];

    // nada selecionado → tremor suave no cartão
    if (given == null || (Array.isArray(given) && given.length === 0)) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }

    const ok = isCorrect(q, given);
    setRevealed(true);
    if (ok) {
      confetti("mini");
      setStreak((s) => Math.min(s + 1, 999));
    } else {
      setStreak(0);
    }
  }

  async function goNext() {
    if (!revealed) {
      confirmAnswer();
      return;
    }
    // avança
    const nxt = step + 1;
    setStep(nxt);
    setRevealed(false);
    if (nxt >= questions.length) {
      // terminou → guardar
      await finishAndSave();
    }
  }

  async function goPrev() {
    if (step === 0) return;
    setStep(step - 1);
    setRevealed(false);
  }

  async function finishAndSave() {
    const { pct, details } = gradeAll();
    setScore(pct);
    setSaving(true);
    try {
      // Descobrir assignmentId
      let assignmentId = assignmentIdFromQuery;
      if (!assignmentId) {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (userId) {
          const { data: row } = await supabase
            .from("homework_assignments")
            .select(`id, homeworks!inner(quiz_id)`)
            .eq("student_id", userId)
            .eq("homeworks.quiz_id", id)
            .order("assigned_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (row?.id) assignmentId = row.id as string;
        }
      }
  
      if (assignmentId) {
        // evita upsert em coluna não-única
        const { data: existing } = await supabase
          .from("homework_submissions")
          .select("id")
          .eq("assignment_id", assignmentId)
          .limit(1)
          .maybeSingle();
  
        if (existing?.id) {
          await supabase
            .from("homework_submissions")
            .update({ grade: pct, details })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("homework_submissions")
            .insert({ assignment_id: assignmentId, grade: pct, details } as any);
        }
  
        // 👇 marcar assignment como CONCLUÍDO
        await supabase
          .from("homework_assignments")
          .update({ status: "completed" })
          .eq("id", assignmentId);
      }
  
      // Confetti/efeitos visuais aqui se quiseres
  
      // Voltar aos materiais (ligeiro delay só para o utilizador ver o resultado)
      setTimeout(() => navigate("/aluno/materiais", { replace: true }), 2000);
    } catch (e) {
      console.warn("Falha ao guardar submissão:", e);
    } finally {
      setSaving(false);
    }
  }
  
  // atalhos: ← / →
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key.toLowerCase() === "enter") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, revealed, answers, questions]);

  // “tiers” para mensagem final
  function tier(pct: number | null) {
    if (pct == null) return { title: "Terminado!", color: "text-primary" };
    if (pct >= 90) return { title: "Excelente!", color: "text-emerald-600" };
    if (pct >= 75) return { title: "Muito Bom!", color: "text-green-600" };
    if (pct >= 60) return { title: "Bom trabalho!", color: "text-blue-600" };
    if (pct >= 40) return { title: "Continua a praticar!", color: "text-amber-600" };
    return { title: "Não desistas!", color: "text-rose-600" };
  }

  // ─────────────────────────────────────────────────────────────
  // UI
  return (
    <div className="min-h-[100dvh] relative overflow-hidden">
      {/* BG gradiente estilo “app learning” */}
      <div className="absolute -top-24 -right-24 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-30 bg-indigo-200" />
      <div className="absolute -bottom-24 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-30 bg-emerald-200" />

      <Helmet>
        <title>{quiz?.title ? `${quiz.title} | Quiz` : "Quiz"}</title>
        <meta name="description" content={quiz?.description ?? "Quiz interativo"} />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="max-w-xl mx-auto p-4">
        {/* Top bar: título + progresso + streak */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            <span className="font-semibold">{quiz?.title ?? "Quiz"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className={`w-5 h-5 ${streak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
            <span className="text-sm">{streak}</span>
          </div>
        </div>
        <Progress value={progressPercent} />

        {loading ? (
          <div className="h-48 grid place-items-center text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="ml-2">A carregar…</span>
          </div>
        ) : err ? (
          <div className="text-sm text-destructive mt-4">{err}</div>
        ) : !quiz ? (
          <div className="text-sm text-muted-foreground mt-4">Quiz não encontrado.</div>
        ) : (
          <Card className="glass-panel mt-4">
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {atEnd ? "Resultados" : `Pergunta ${Math.min(step + 1, questions.length)} de ${questions.length}`}
                </CardTitle>
                {!atEnd && (
                  <Badge variant="secondary">
                    {step + 1}/{questions.length}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <AnimatePresence mode="wait">
                {/* ECRÃ DE PERGUNTAS */}
                {!atEnd ? (
                  <motion.div
                    key={`q-${step}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.22 }}
                    className="relative"
                  >
                    <motion.div
                      animate={shake ? { x: [0, -6, 6, -4, 4, -2, 2, 0] } : {}}
                      transition={{ duration: 0.45, ease: "easeInOut" }}
                      className="rounded-2xl border p-4 bg-white/80"
                    >
                      <div className="font-medium text-base">{questions[step]?.prompt}</div>

                      {/* Opções */}
                      <div className="mt-3 space-y-2">
                        {questions[step]?.options.map((opt, i) => {
                          const q = questions[step];
                          const qid = q.id;
                          const given = answers[qid];
                          const isMulti = q.type === "multi";

                          const selected = isMulti
                            ? Array.isArray(given) && (given as number[]).includes(i)
                            : Number(given) === i;

                          const correctNow = revealed && q.correctIndices.includes(i);
                          const wrongNow = revealed && selected && !q.correctIndices.includes(i);

                          return (
                            <motion.button
                              key={i}
                              type="button"
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => {
                                if (!revealed) {
                                  if (isMulti) {
                                    const cur = Array.isArray(given) ? new Set<number>(given as number[]) : new Set<number>();
                                    cur.has(i) ? cur.delete(i) : cur.add(i);
                                    setAnswer(qid, Array.from(cur.values()).sort());
                                  } else {
                                    setAnswer(qid, i);
                                  }
                                }
                              }}
                              className={[
                                "w-full text-left px-3 py-2 rounded-xl border transition flex items-center gap-2",
                                selected && !revealed && "border-primary bg-primary/5",
                                !selected && !revealed && "hover:bg-primary/5",
                                correctNow && "border-emerald-400 bg-emerald-50",
                                wrongNow && "border-rose-400 bg-rose-50",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {/* Estado do chip */}
                              {revealed ? (
                                correctNow ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : wrongNow ? (
                                  <XCircle className="w-4 h-4 text-rose-500" />
                                ) : (
                                  <Circle className="w-4 h-4 opacity-30" />
                                )
                              ) : selected ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Circle className="w-4 h-4 opacity-30" />
                              )}
                              <span>{opt}</span>
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Barra de ações estilo Duolingo */}
                      <div className="mt-4 flex items-center justify-between">
                        <Button variant="ghost" onClick={goPrev} disabled={step === 0}>
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Anterior
                        </Button>

                        {!revealed ? (
                          <Button onClick={confirmAnswer}>
                            Verificar
                            <Sparkles className="w-4 h-4 ml-1" />
                          </Button>
                        ) : (
                          <Button onClick={goNext}>
                            Continuar
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                ) : (
                  // ECRÃ FINAL
                  <motion.div
                    key="final"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.28 }}
                    className="text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-3xl font-bold mb-2">
                      <Trophy className="w-8 h-8 text-amber-500" />
                      <span className={tier(score).color}>{tier(score).title}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xl mb-3">
                      <PartyPopper className="w-6 h-6" />
                      <span>
                        A tua nota: <span className="font-semibold">{score ?? "--"}%</span>
                      </span>
                    </div>

                    <div className="max-w-md mx-auto text-muted-foreground mb-6">
                      {score != null && score >= 90 && "Dominas o tema. Fantástico! 🏆"}
                      {score != null && score >= 75 && score < 90 && "Ótima prestação — estás quase lá! 💪"}
                      {score != null && score >= 60 && score < 75 && "Bom! Continua a praticar. 🚀"}
                      {score != null && score >= 40 && score < 60 && "Estás no caminho certo. Revê e tenta outra vez. 🔁"}
                      {score != null && score < 40 && "Cada tentativa é progresso. Não desistas! 🌱"}
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <Button onClick={() => { setStep(0); setRevealed(false); setScore(null); }}>
                        Refazer
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* guardar de novo se quiser, após final */}
              {atEnd && (
                <div className="flex items-center justify-center mt-4">
                  <Button onClick={finishAndSave} variant="outline" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Guardar resultado
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <style>{`
        .glass-panel{background:rgba(255,255,255,.9);backdrop-filter:blur(10px);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08)}
      `}</style>
    </div>
  );
}
