// file: src/pages/professor/Materiais.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Search, Plus, Upload, FileText, Image as ImageIcon, Video, Download, Eye, MoreVertical,
  Filter, Grid3X3, List, Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Schema-aligned Types
type MaterialRow = {
  id: string;
  title: string;
  description: string | null;
  subject: "Matemática" | "Física" | "Química" | "Outros"; // subject_enum
  school_year: "10º ano" | "11º ano" | "12º ano";
  file_path: string;          // path dentro do bucket `materials`
  mime_type: string;
  file_size_bytes: number;
  file_ext: string | null;
  downloads: number;
  upload_date: string;        // timestamptz
  created_by: string;         // auth.users
  visibility: "private" | "students" | "public"; // visibility_enum
  tags: string[] | null;
};

type QuizRow = {
  id: string;
  title: string;
  description: string | null;
  subject: "Matemática" | "Física" | "Química" | "Outros";
  school_year: "10º ano" | "11º ano" | "12º ano";
  created_by: string;
  created_at: string;
  updated_at: string;
};

type NewQuestion = {
  statement: string;
  options: { label: "A" | "B" | "C" | "D"; text: string; is_correct: boolean }[];
};

type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  url: string | null;
  created_at: string;
  updated_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
const BUCKET = "materials";
const subjectOptions = ["Matemática", "Física", "Química", "Outros"] as const;
const yearOptions = ["10º ano", "11º ano", "12º ano"] as const;
const visibilityOptions = ["private", "students", "public"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Preview Dialog

function CreateResourceModal({ onCreated }: { onCreated: (r: ResourceRow) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("link");
  const [url, setUrl] = useState("");

  async function handleCreate() {
    if (!title.trim()) return toast.error("Título obrigatório");
    try {
      const { data, error } = await supabase
        .from("resources")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          type,
          url: url.trim() || null,
        } as any)
        .select("*")
        .single();
      if (error) throw error;
      onCreated(data as ResourceRow);
      toast.success("Recurso criado!");
      setOpen(false);
      setTitle(""); setDescription(""); setType("link"); setUrl("");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar recurso.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" /> Criar Recurso
      </Button>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>Novo Recurso</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e)=>setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e)=>setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v)=>setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
                <SelectItem value="artigo">Artigo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>URL</Label>
            <Input value={url} onChange={(e)=>setUrl(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreate}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function MaterialPreviewDialog({
  open, onOpenChange, material,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  material: MaterialRow | null;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadUrl(m: MaterialRow) {
    setLoading(true);
    setSignedUrl(null);
    try {
      const { data, error } = await supabase
        .storage
        .from(BUCKET)
        .createSignedUrl(m.file_path, 60 * 60);
      if (error || !data?.signedUrl) throw error || new Error("Falha a gerar URL.");
      setSignedUrl(data.signedUrl);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível abrir o ficheiro.");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && material) loadUrl(material);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, material?.id]);

  const ext = (material?.file_ext || "").toLowerCase();
  const isImg = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  const isVideo = ["mp4", "webm", "mov"].includes(ext);
  const isPdf = ext === "pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            {material?.title || "Pré-visualização"}
          </DialogTitle>
        </DialogHeader>

        {!material ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Sem material.</div>
        ) : loading ? (
          <div className="py-16 grid place-items-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !signedUrl ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Não foi possível gerar link.</div>
        ) : (
          <div className="space-y-3">
            {isImg && <img src={signedUrl} alt={material.title} className="w-full rounded-lg border" />}
            {isVideo && (
              <video controls className="w-full rounded-lg border">
                <source src={signedUrl} />
              </video>
            )}
            {isPdf && (
              <iframe
                src={signedUrl}
                title={material.title}
                className="w-full h-[70vh] border rounded-lg"
              />
            )}
            {!isImg && !isVideo && !isPdf && (
              <div className="rounded-lg border p-4 bg-accent/10 text-sm">
                Tipo de ficheiro não pré-visualizável. Usa o botão <b>Descarregar</b>.
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => window.open(signedUrl, "_blank")}>
                <Download className="h-4 w-4 mr-2" />
                Abrir em nova aba
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Material (schema real)
function CreateMaterialModal({ onCreated }: { onCreated: (m: MaterialRow) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState<(typeof subjectOptions)[number]>("Outros");
  const [schoolYear, setSchoolYear] = useState<(typeof yearOptions)[number]>("10º ano");
  const [visibility, setVisibility] = useState<(typeof visibilityOptions)[number]>("students");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Escolhe um ficheiro.");

    try {
      setPending(true);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id as string | undefined;

      const safeTitle = title.trim() || file.name.replace(/\.[^.]+$/, "");
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const mime = file.type || "application/octet-stream";
      const size = file.size;
      const filePath = `${userId || "anon"}/${Date.now()}_${file.name}`;

      // 1) Upload para bucket 'materials'
      const up = await supabase.storage.from(BUCKET).upload(filePath, file, { upsert: false, contentType: mime });
      if (up.error) throw up.error;

      // 2) Insert na tabela 'materials' (schema real)
      const payload = {
        title: safeTitle,
        description: description.trim() || null,
        subject,                       // subject_enum
        school_year: schoolYear,
        file_path: filePath,           // path relativo no bucket
        mime_type: mime,
        file_size_bytes: size,
        file_ext: ext,
        visibility,                    // visibility_enum
        created_by: userId,            // auth.users
        tags: [],                      // default
      };

      const ins = await supabase.from("materials").insert(payload as any).select("*").single();
      if (ins.error) throw ins.error;

      onCreated(ins.data as MaterialRow);
      toast.success("Material criado com sucesso.");
      setOpen(false);

      // reset
      setFile(null); setTitle(""); setDescription("");
      setSubject("Outros"); setSchoolYear("10º ano"); setVisibility("students");
    } catch (err: any) {
      toast.error(err.message ?? "Falha ao criar material.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} className="bg-gradient-hero hover:opacity-90">
        <Plus className="h-4 w-4 mr-2" /> Criar Material
      </Button>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>Novo Material</DialogTitle></DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label>Ficheiro</Label>
            <Input type="file" onChange={(e)=>setFile(e.target.files?.[0] ?? null)} required />
          </div>
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Título do material" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Breve descrição" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Disciplina</Label>
              <Select value={subject} onValueChange={(v:any)=>setSubject(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {subjectOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano</Label>
              <Select value={schoolYear} onValueChange={(v:any)=>setSchoolYear(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visibilidade</Label>
              <Select value={visibility} onValueChange={(v:any)=>setVisibility(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {visibilityOptions.map(v => <SelectItem key={v} value={v}>{v === "students" ? "Alunos" : v === "public" ? "Público" : "Privado"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>{pending ? 'A criar…' : 'Criar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Quiz (quizzes + quiz_questions + quiz_options)
function CreateQuizModal({ onCreated }: { onCreated: (quiz: QuizRow) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState<(typeof subjectOptions)[number]>("Outros");
  const [schoolYear, setSchoolYear] = useState<(typeof yearOptions)[number]>("10º ano");
  const [questions, setQuestions] = useState<NewQuestion[]>([
    { statement: "", options: [
      { label: "A", text: "", is_correct: true },
      { label: "B", text: "", is_correct: false },
      { label: "C", text: "", is_correct: false },
      { label: "D", text: "", is_correct: false },
    ]},
  ]);

  function addQuestion() {
    setQuestions(prev => [...prev, { statement: "", options: [
      { label: "A", text: "", is_correct: true },
      { label: "B", text: "", is_correct: false },
      { label: "C", text: "", is_correct: false },
      { label: "D", text: "", is_correct: false },
    ] }]);
  }

  function setCorrect(qi: number, label: "A"|"B"|"C"|"D") {
    setQuestions(prev => prev.map((q, i) => i!==qi ? q : ({
      ...q, options: q.options.map(o => ({ ...o, is_correct: o.label === label }))
    })));
  }

  async function handleCreate() {
    if (!title.trim()) return toast.error("Título obrigatório.");
    if (questions.some(q => !q.statement.trim() || q.options.some(o => !o.text.trim()))) {
      return toast.error("Preenche todas as perguntas e opções.");
    }

    try {
      setPending(true);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id as string | undefined;

      // 1) cria quiz
      const { data: qz, error: qErr } = await supabase
        .from("quizzes")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          subject,
          school_year: schoolYear,
          created_by: userId,
        } as any)
        .select("*")
        .single();
      if (qErr || !qz) throw qErr || new Error("Falha ao criar quiz.");

      // 2) cria perguntas + opções (em série simples)
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { data: qq, error: qqErr } = await supabase
          .from("quiz_questions")
          .insert({
            quiz_id: qz.id,
            order_index: i + 1,
            statement: q.statement.trim(),
          } as any)
          .select("*")
          .single();
        if (qqErr || !qq) throw qqErr || new Error("Falha ao criar pergunta.");

        for (const opt of q.options) {
          const { error: opErr } = await supabase
            .from("quiz_options")
            .insert({
              question_id: qq.id,
              label: opt.label,
              text: opt.text.trim(),
              is_correct: !!opt.is_correct,
            } as any);
          if (opErr) throw opErr;
        }
      }

      toast.success("Quiz criado.");
      onCreated(qz as QuizRow);
      setOpen(false);
      // reset
      setTitle("");
      setDescription("");
      setSubject("Outros");
      setSchoolYear("10º ano");
      setQuestions([{ statement: "", options: [
        { label: "A", text: "", is_correct: true },
        { label: "B", text: "", is_correct: false },
        { label: "C", text: "", is_correct: false },
        { label: "D", text: "", is_correct: false },
      ] }]);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar quiz (confere as tabelas `quizzes`, `quiz_questions`, `quiz_options`).");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" /> Criar Quiz
      </Button>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Novo Quiz</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e)=>setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Ano</Label>
              <Select value={schoolYear} onValueChange={(v:any)=>setSchoolYear(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Disciplina</Label>
              <Select value={subject} onValueChange={(v:any)=>setSubject(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {subjectOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e)=>setDescription(e.target.value)} />
            </div>
          </div>

          {questions.map((q, qi) => (
            <div key={qi} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label>Pergunta {qi+1}</Label>
                <span className="text-xs text-muted-foreground">Seleciona 1 correta</span>
              </div>
              <Input placeholder="Enunciado" value={q.statement} onChange={(e)=>{
                const val = e.target.value; setQuestions(prev => prev.map((qq, i)=> i===qi ? { ...qq, statement: val } : qq));
              }} />
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((o, oi) => (
                  <div key={oi} className={`flex items-center gap-2 rounded-lg border p-2 ${o.is_correct ? 'ring-2 ring-primary' : ''}`}>
                    <Button type="button" variant={o.is_correct ? 'default' : 'outline'} size="sm" onClick={()=>setCorrect(qi, o.label)}>
                      {o.label}
                    </Button>
                    <Input placeholder={`Opção ${o.label}`} value={o.text} onChange={(e)=>{
                      const val = e.target.value; setQuestions(prev => prev.map((qq, i)=> {
                        if (i!==qi) return qq;
                        const options = qq.options.map((oo, idx)=> idx===oi ? { ...oo, text: val } : oo);
                        return { ...qq, options };
                      }));
                    }} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Button type="button" variant="ghost" onClick={addQuestion}>+ Adicionar Pergunta</Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={pending}>{pending ? 'A criar…' : 'Criar Quiz'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
export default function ProfessorMateriais() {
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [mLoading, setMLoading] = useState(true);
  const [mErr, setMErr] = useState<string | null>(null);

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [qLoading, setQLoading] = useState(true);
  const [qErr, setQErr] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMat, setPreviewMat] = useState<MaterialRow | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'materials' | 'quizzes' | 'resources'>('materials');


// ── Resources state
const [resources, setResources] = useState<ResourceRow[]>([]);
const [rLoading, setRLoading] = useState(true);
const [rErr, setRErr] = useState<string | null>(null);

async function loadResources() {
  setRLoading(true); setRErr(null);
  try {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setResources((data ?? []) as ResourceRow[]);
  } catch (e: any) {
    setRErr(e?.message ?? "Erro a carregar recursos.");
  } finally {
    setRLoading(false);
  }
}

  // Fetch materiais (schema real)
  async function loadMaterials() {
    setMLoading(true); setMErr(null);
    try {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .order("upload_date", { ascending: false });
      if (error) throw error;
      setMaterials((data ?? []) as MaterialRow[]);
    } catch (e: any) {
      setMErr(e?.message ?? "Erro a carregar materiais (confere a tabela `materials`).");
    } finally {
      setMLoading(false);
    }
  }

  // Fetch quizzes
  async function loadQuizzes() {
    setQLoading(true); setQErr(null);
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setQuizzes((data ?? []) as QuizRow[]);
    } catch (e: any) {
      setQErr(e?.message ?? "Erro a carregar quizzes (`quizzes`).");
    } finally {
      setQLoading(false);
    }
  }

  useEffect(() => {
    loadMaterials();
    loadQuizzes();
    loadResources(); // 👈

  }, []);

  const filteredMaterials = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return materials.filter(m =>
      (m.title || "").toLowerCase().includes(q) ||
      (m.subject || "").toLowerCase().includes(q)
    );
  }, [materials, searchTerm]);

  const filteredQuizzes = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return quizzes.filter(x =>
      (x.title || "").toLowerCase().includes(q) ||
      (x.subject || "").toLowerCase().includes(q)
    );
  }, [quizzes, searchTerm]);

  const getFileIcon = (ext?: string | null) => {
    const e = (ext || "").toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(e)) return <ImageIcon className="h-6 w-6" />;
    if (['mp4', 'webm', 'mov'].includes(e)) return <Video className="h-6 w-6" />;
    return <FileText className="h-6 w-6" />;
  };

  async function handlePreview(m: MaterialRow) {
    setPreviewMat(m);
    setPreviewOpen(true);
  }

  async function handleDownload(m: MaterialRow) {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(m.file_path, 60 * 60);
      if (error || !data?.signedUrl) throw error || new Error("Falha a gerar URL.");
      window.open(data.signedUrl, "_blank");

      // incrementa downloads
      await supabase.from("materials").update({ downloads: (m.downloads || 0) + 1 }).eq("id", m.id);
      setMaterials(prev => prev.map(x => x.id === m.id ? { ...x, downloads: (m.downloads || 0) + 1 } : x));
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível descarregar.");
    }
  }

  return (
    <>
      <Helmet>
        <title>Materiais - Professor | Árvore do Conhecimento</title>
        <meta name="description" content="Gerir materiais didáticos e recursos educativos" />
      </Helmet>

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Materiais</h1>
            <p className="text-muted-foreground">Gerir materiais didáticos e recursos educativos</p>
          </div>
          <div className="flex gap-2">
            <CreateQuizModal onCreated={(quiz) => setQuizzes(prev => [quiz, ...prev])} />
            <CreateMaterialModal onCreated={(material) => setMaterials(prev => [material, ...prev])} />
          </div>
        </div>

        {/* Search / View */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar materiais..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
            <div className="flex border rounded-lg p-1">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList>
            <TabsTrigger value="materials">Ficheiros ({materials.length})</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes ({quizzes.length})</TabsTrigger>
            <TabsTrigger value="resources">Recursos ({resources.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="resources" className="space-y-4">
  {rErr && <Card><CardContent>{rErr}</CardContent></Card>}
  {rLoading ? (
    <div className="py-20 grid place-items-center"><Loader2 className="animate-spin" /></div>
  ) : resources.length === 0 ? (
    <Card className="text-center py-12">
      <CardContent>
        <p className="mb-3">Nenhum recurso encontrado</p>
        <CreateResourceModal onCreated={(r)=>setResources(prev=>[r,...prev])}/>
      </CardContent>
    </Card>
  ) : (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {resources.map(r=>(
        <Card key={r.id} className="glass-panel hover-lift">
          <CardHeader><CardTitle>{r.title}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">{r.description || "Sem descrição"}</p>
            {r.url && <a href={r.url} target="_blank" className="text-primary underline text-sm">Abrir recurso</a>}
            <div className="text-xs text-muted-foreground mt-2">
              {new Date(r.created_at).toLocaleDateString("pt-PT")}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )}
</TabsContent>


          {/* MATERIAIS */}
          <TabsContent value="materials" className="space-y-4">
            {mErr && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-destructive">Erro a carregar materiais</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{mErr}</CardContent>
              </Card>
            )}

            {mLoading ? (
              <div className="py-20 grid place-items-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : filteredMaterials.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Nenhum material encontrado</p>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? 'Tenta uma pesquisa diferente' : 'Começa por adicionar o teu primeiro material'}
                  </p>
                  {!searchTerm && <CreateMaterialModal onCreated={(material) => setMaterials(prev => [material, ...prev])} />}
                </CardContent>
              </Card>
            ) : (
              <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>
                {filteredMaterials.map((m) => (
                  <Card key={m.id} className="glass-panel hover-lift group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            {getFileIcon(m.file_ext)}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base line-clamp-1">{m.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">{m.subject}</Badge>
                              <Badge variant="outline" className="text-xs">{m.school_year}</Badge>
                              <Badge variant="outline" className="text-xs">
                                {m.visibility === "public" ? "Público" : m.visibility === "students" ? "Alunos" : "Privado"}
                              </Badge>
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
                            <DropdownMenuItem onClick={() => handlePreview(m)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(m)}>
                              <Download className="h-4 w-4 mr-2" />
                              Descarregar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {m.description || 'Sem descrição'}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{m.downloads ?? 0} downloads</span>
                        <span>{new Date(m.upload_date).toLocaleDateString('pt-PT')}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* QUIZZES */}
          <TabsContent value="quizzes" className="space-y-4">
            {qErr && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-destructive">Erro a carregar quizzes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{qErr}</CardContent>
              </Card>
            )}

            {qLoading ? (
              <div className="py-20 grid place-items-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Nenhum quiz encontrado</p>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? 'Tenta uma pesquisa diferente' : 'Começa por criar o teu primeiro quiz'}
                  </p>
                  {!searchTerm && <CreateQuizModal onCreated={(quiz) => setQuizzes(prev => [quiz, ...prev])} />}
                </CardContent>
              </Card>
            ) : (
              <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>
                {filteredQuizzes.map((quiz) => (
                  <Card key={quiz.id} className="glass-panel hover-lift group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                            <FileText className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base line-clamp-1">{quiz.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">{quiz.subject}</Badge>
                              <Badge variant="outline" className="text-xs">{quiz.school_year}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {quiz.description || 'Sem descrição'}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>perguntas: via quiz_questions</span>
                        <span>{new Date(quiz.created_at).toLocaleDateString('pt-PT')}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview dialog */}
      <MaterialPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        material={previewMat}
      />

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
