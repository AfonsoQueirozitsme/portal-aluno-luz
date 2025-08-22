// file: src/pages/Aluno/Materiais.tsx
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  PlayCircle,
  Presentation,
  Download,
  ExternalLink,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";

type UIItem = {
  id: string;
  kind: "material" | "quiz";
  title: string;
  description?: string | null;
  subject?: string | null;
  level?: string | null;
  url?: string | null;
  recommended?: boolean;
  quizId?: string | null;
  materialId?: string | null;
  assignmentId?: string | null;
  assignmentStatus?: string | null;   // ← novo
  assignedAt?: string | null;         // ← novo
};

const canonical = () => `${window.location.origin}/aluno/materiais`;

export default function Materiais() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<UIItem[]>([]);

  // Filtros
  const [fDisciplina, setFDisciplina] = useState("");
  const [fAno, setFAno] = useState("");
  const [fTitulo, setFTitulo] = useState("");

  // listas para selects
  const disciplinas = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.subject).filter(Boolean))) as string[];
  }, [items]);
  const anos = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.level).filter(Boolean))) as string[];
  }, [items]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
  
        // 1) user
        const { data: { user }, error: uErr } = await supabase.auth.getUser();
        if (uErr) throw uErr;
        if (!user) {
          setErr("Sessão inválida. Por favor, faz login novamente.");
          setLoading(false);
          return;
        }
  
        // 2) assignments recomendados (com status)
        const { data: hwRows } = await supabase
          .from("homework_assignments")
          .select(`
            id, status, assigned_at,
            homeworks (
              id, title, description, type, due_at, material_id, quiz_id,
              materials:material_id ( id, title, description, subject, school_year, file_path, mime_type, file_ext ),
              quizzes:quiz_id ( id, title, description )
            )
          `)
          .eq("student_id", user.id)
          .order("assigned_at", { ascending: false });
  
        const recommended: UIItem[] = (hwRows ?? [])
          .map((row: any) => {
            const hw = row?.homeworks;
            if (!hw) return null;
  
            if (hw.materials) {
              const m = hw.materials;
              return {
                id: `m:${m.id}`,
                kind: "material",
                title: m.title ?? hw.title ?? "Material",
                description: m.description ?? hw.description ?? null,
                subject: m.subject ?? null,
                level: m.school_year ?? null,
                url: m.file_path ?? null,
                recommended: true,
                materialId: m.id,
                assignmentId: row.id,
                assignmentStatus: row.status ?? null,
                assignedAt: row.assigned_at ?? null,
              } as UIItem;
            }
            if (hw.quizzes?.id) {
              const q = hw.quizzes;
              return {
                id: `q:${q.id}`,
                kind: "quiz",
                title: q.title ?? hw.title ?? "Quiz",
                description: q.description ?? hw.description ?? null,
                subject: q.subject ?? null,
                level: q.school_year ?? null,
                recommended: true,
                quizId: q.id,
                assignmentId: row.id,
                assignmentStatus: row.status ?? null,
                assignedAt: row.assigned_at ?? null,
              } as UIItem;
            }
            return null;
          })
          .filter(Boolean) as UIItem[];
  
        // 3) TODOS os materiais que o aluno pode ver (RLS-friendly):
        //    - visíveis a alunos (visibility='students') OU
        //    - criados por este utilizador
        const { data: mats, error: mErr } = await supabase
          .from("materials")
          .select("id, title, description, subject, school_year, file_path, mime_type, file_ext, upload_date, visibility, created_by")
          .or(`visibility.eq.students,created_by.eq.${user.id}`)
          .order("upload_date", { ascending: false })
          .limit(1000);
  
        if (mErr) throw mErr;
  
        const allMaterials: UIItem[] = (mats ?? []).map((m: any) => ({
          id: `m:${m.id}`,
          kind: "material",
          title: m.title,
          description: m.description ?? null,
          subject: m.subject ?? null,
          level: m.school_year ?? null,
          url: m.file_path ?? null,
          recommended: false,
          materialId: m.id,
        }));
  
        // 4) MERGE (dedupe por id)
        const merged = new Map<string, UIItem>();
        for (const it of allMaterials) merged.set(it.id, it);
        for (const it of recommended) {
          const prev = merged.get(it.id);
          merged.set(it.id, { ...(prev ?? it), ...it, recommended: true });
        }
        // inclui quizzes recomendados
        for (const it of recommended.filter((r) => r.kind === "quiz")) merged.set(it.id, it);
  
        // 5) ORDENAR:
        //    rank 0: recomendados não concluídos
        //    rank 1: não recomendados
        //    rank 2: recomendados concluídos → fim
        const arr = Array.from(merged.values());
        arr.sort((a, b) => {
          const rank = (x: UIItem) => {
            const rec = !!x.assignmentId;
            const done = (x.assignmentStatus || "").toLowerCase() === "completed";
            if (rec && !done) return 0;
            if (!rec) return 1;
            return 2;
          };
          const ra = rank(a), rb = rank(b);
          if (ra !== rb) return ra - rb;
          if (ra === 0 || ra === 2) {
            const ta = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
            const tb = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
            return tb - ta;
          }
          return (a.title || "").localeCompare(b.title || "", "pt");
        });
  
        setItems(arr);
      } catch (e: any) {
        console.warn("[Materiais] Falha a carregar:", e?.message ?? e);
        setErr("Não foi possível carregar os materiais.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  
  // Filtros
  const filtered = useMemo(() => {
    return items.filter((i) => {
      const okDisc = fDisciplina ? (i.subject ?? "") === fDisciplina : true;
      const okAno = fAno ? (i.level ?? "") === fAno : true;
      const okTitulo = fTitulo ? (i.title ?? "").toLowerCase().includes(fTitulo.toLowerCase()) : true;
      return okDisc && okAno && okTitulo;
    });
  }, [items, fDisciplina, fAno, fTitulo]);

  const handleOpen = (it: UIItem) => {
    if (it.kind === "quiz" && it.quizId) {
      const qs = it.assignmentId ? `?assignmentId=${it.assignmentId}` : "";
      navigate(`/aluno/quiz/${it.quizId}${qs}`);
      return;
    }
    if (it.kind === "material" && it.materialId) {
      const qs = it.assignmentId ? `?assignmentId=${it.assignmentId}` : "";
      navigate(`/aluno/materiais/${it.materialId}${qs}`);
    }
  };

  // ── animações
  const listVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.05 },
    },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22 } },
  };

  return (
    <div>
      <Helmet>
        <title>Área do Aluno | Materiais - Árvore do Conhecimento</title>
        <meta name="description" content="Descarregue materiais, faça quizzes e acompanhe os recursos recomendados para si." />
        <link rel="canonical" href={canonical()} />
      </Helmet>

      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-2xl font-bold mb-6 text-primary">Materiais de Estudo</h1>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-wrap gap-3 mb-6 items-center"
        >
          <select className="border rounded px-3 py-2 text-sm" value={fDisciplina} onChange={(e) => setFDisciplina(e.target.value)}>
            <option value="">Todas as disciplinas</option>
            {disciplinas.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select className="border rounded px-3 py-2 text-sm" value={fAno} onChange={(e) => setFAno(e.target.value)}>
            <option value="">Todos os níveis</option>
            {anos.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          <input
            type="text"
            className="border rounded px-3 py-2 text-sm"
            placeholder="Pesquisar por título..."
            value={fTitulo}
            onChange={(e) => setFTitulo(e.target.value)}
          />
        </motion.div>

        {err && <div className="mb-4 text-sm text-destructive">{err}</div>}

        {loading ? (
          <div className="grid place-items-center h-40 text-sm text-muted-foreground">A carregar materiais…</div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="grid md:grid-cols-2 gap-6"
            >
              {filtered.map((it) => {
                const isRec = !!it.assignmentId;
                const isCompleted = (it.assignmentStatus || "").toLowerCase() === "completed";
                return (
                  <motion.div key={it.id} variants={cardVariants} whileHover={{ y: -3, scale: 1.01 }}>
                    <div
                      className={[
                        "relative bg-card rounded-xl shadow p-6 border",
                        isRec && !isCompleted ? "border-primary/30 ring-1 ring-primary/10" : "border-border",
                        isCompleted ? "opacity-80" : "",
                      ].join(" ")}
                    >
                      {/* Badges no topo */}
                      <div className="absolute -top-2 left-4 flex gap-2">
                        {isRec && !isCompleted && <Badge className="text-xs">Recomendado</Badge>}
                        {isRec && isCompleted && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Concluído
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mb-2">
                        {iconFor(it)}
                        <span className="font-semibold text-lg">{it.title}</span>
                      </div>

                      {it.description && <div className="text-muted-foreground mb-2">{it.description}</div>}

                      <div className="flex flex-wrap gap-2 mt-1">
                        {it.subject && <span className="text-xs bg-muted px-2 py-1 rounded">{it.subject}</span>}
                        {it.level && <span className="text-xs bg-muted px-2 py-1 rounded">{it.level}</span>}
                      </div>

                      <Button
                        variant={isRec && !isCompleted ? "default" : "outline"}
                        className="w-full mt-3"
                        onClick={() => handleOpen(it)}
                      >
                        {it.kind === "quiz" ? (
                          <>
                            <HelpCircle className="w-4 h-4 mr-2" />
                            Fazer Quiz
                          </>
                        ) : it.url ? (
                          <>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Abrir
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4 mr-2" />
                            Consultar Material
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}

              {/* vazio */}
              {!loading && filtered.length === 0 && (
                <motion.div
                  className="col-span-full text-sm text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  Não há materiais a mostrar com os filtros atuais.
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <style>
        {`
          .animate-fade-in { animation: fadeIn .5s cubic-bezier(.4,0,.2,1); }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px);}
            to { opacity: 1; transform: translateY(0);}
          }
        `}
      </style>
    </div>
  );
}

/** Ícone consoante o tipo detetado */
function iconFor(it: UIItem) {
  if (it.kind === "quiz") return <HelpCircle className="w-6 h-6 text-primary" />;
  if (it.url?.toLowerCase().endsWith(".ppt") || it.url?.toLowerCase().endsWith(".pptx"))
    return <Presentation className="w-6 h-6 text-primary" />;
  if (it.url?.toLowerCase().includes("youtube") || it.url?.toLowerCase().includes("embed"))
    return <PlayCircle className="w-6 h-6 text-primary" />;
  if (it.url?.toLowerCase().endsWith(".pdf"))
    return <FileText className="w-6 h-6 text-primary" />;
  if (it.url?.toLowerCase().match(/\.(zip|rar|7z)$/))
    return <Download className="w-6 h-6 text-primary" />;
  return <FileText className="w-6 h-6 text-primary" />;
}

/** Deduza o “kind” a partir de fields do material */
function inferKindFromMaterial(_: any): UIItem["kind"] {
  return "material";
}
