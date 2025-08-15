import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Plus, Upload, FileText, Image as ImageIcon, Video, Download, Eye, MoreVertical, Filter, Grid3X3, List,
} from "lucide-react";
import { useMaterials, uploadMaterial, getSignedUrl, registerDownload } from "@/hooks/useMaterials";
import type { Material } from "@/types/materials";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

// ————————————————————————————————————————
// Modal: Criar Material (AIO: ficheiro + metadados)
// ————————————————————————————————————————
function CreateMaterialModal({ onCreated }: { onCreated: (m: Material) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState<'Matemática'|'Física'|'Química'|'Outros'>("Outros");
  const [schoolYear, setSchoolYear] = useState<'10º ano'|'11º ano'|'12º ano'>("10º ano");
  const [visibility, setVisibility] = useState<'private'|'students'|'public'>("students");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Escolhe um ficheiro.");
    try {
      setPending(true);
      const mat = await uploadMaterial({
        file,
        title: title || file.name.replace(/\.[^.]+$/, ''),
        description,
        subject,
        school_year: schoolYear,
        visibility,
      });
      toast.success("Material criado com sucesso.");
      onCreated(mat as any);
      setOpen(false);
      // reset
      setFile(null); setTitle(""); setDescription(""); setSubject("Outros"); setSchoolYear("10º ano"); setVisibility("students");
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
                  <SelectItem value="Matemática">Matemática</SelectItem>
                  <SelectItem value="Física">Física</SelectItem>
                  <SelectItem value="Química">Química</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano</Label>
              <Select value={schoolYear} onValueChange={(v:any)=>setSchoolYear(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10º ano">10º ano</SelectItem>
                  <SelectItem value="11º ano">11º ano</SelectItem>
                  <SelectItem value="12º ano">12º ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visibilidade</Label>
              <Select value={visibility} onValueChange={(v:any)=>setVisibility(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Privado</SelectItem>
                  <SelectItem value="students">Alunos</SelectItem>
                  <SelectItem value="public">Público</SelectItem>
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

// ————————————————————————————————————————
// Modal: Criar Quiz (MCQ)
// ————————————————————————————————————————
function CreateQuizModal({ onCreated }: { onCreated: (quiz: any) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState<'Matemática'|'Física'|'Química'|'Outros'>("Outros");
  const [schoolYear, setSchoolYear] = useState<'10º ano'|'11º ano'|'12º ano'>("10º ano");
  const [questions, setQuestions] = useState<{ statement: string; options: { label: 'A'|'B'|'C'|'D'; text: string; is_correct: boolean }[] }[]>([
    { statement: "", options: [
      { label: 'A', text: "", is_correct: true },
      { label: 'B', text: "", is_correct: false },
      { label: 'C', text: "", is_correct: false },
      { label: 'D', text: "", is_correct: false },
    ]}
  ]);

  function addQuestion() {
    setQuestions(prev => [...prev, { statement: "", options: [
      { label: 'A', text: "", is_correct: true },
      { label: 'B', text: "", is_correct: false },
      { label: 'C', text: "", is_correct: false },
      { label: 'D', text: "", is_correct: false },
    ] }]);
  }
  function setCorrect(qi: number, label: 'A'|'B'|'C'|'D') {
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
      // Cria quiz
      const { data: quiz, error: qErr } = await supabase
        .from('quizzes')
        .insert({ title, description, subject, school_year: schoolYear })
        .select('*').single();
      if (qErr) throw qErr;
      // Perguntas
      const rowsQ = questions.map((q, idx) => ({ quiz_id: quiz.id, order_index: idx+1, statement: q.statement }));
      const { data: savedQ, error: qsErr } = await supabase
        .from('quiz_questions')
        .insert(rowsQ)
        .select('*');
      if (qsErr) throw qsErr;
      // Opções
      const opts:any[] = [];
      savedQ.forEach((sq: any, i: number) => {
        questions[i].options.forEach(o => opts.push({ question_id: sq.id, label: o.label, text: o.text, is_correct: o.is_correct }));
      });
      const { error: oErr } = await supabase.from('quiz_options').insert(opts);
      if (oErr) throw oErr;

      toast.success('Quiz criado.');
      onCreated(quiz);
      setOpen(false);
      setTitle(""); setDescription(""); setSubject("Outros"); setSchoolYear("10º ano"); setQuestions([{ statement: "", options: [
        { label:'A', text:"", is_correct:true },
        { label:'B', text:"", is_correct:false },
        { label:'C', text:"", is_correct:false },
        { label:'D', text:"", is_correct:false },
      ] }]);
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao criar quiz.');
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
                  <SelectItem value="10º ano">10º ano</SelectItem>
                  <SelectItem value="11º ano">11º ano</SelectItem>
                  <SelectItem value="12º ano">12º ano</SelectItem>
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
                  <SelectItem value="Matemática">Matemática</SelectItem>
                  <SelectItem value="Física">Física</SelectItem>
                  <SelectItem value="Química">Química</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
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
                        if (i!==qi) return qq; const options = qq.options.map((oo, idx)=> idx===oi ? { ...oo, text: val } : oo); return { ...qq, options };
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

// ————————————————————————————————————————
// Modal: Editar Material (metadados)
// ————————————————————————————————————————
function EditMaterialModal({ open, onOpenChange, material, onUpdated }:{
  open: boolean; onOpenChange: (v:boolean)=>void; material: Material | null; onUpdated: (m: Material)=>void;
}) {
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState(material?.title ?? "");
  const [description, setDescription] = useState(material?.description ?? "");
  const [subject, setSubject] = useState<'Matemática'|'Física'|'Química'|'Outros'>(material?.subject ?? 'Outros');
  const [schoolYear, setSchoolYear] = useState<'10º ano'|'11º ano'|'12º ano'>(material?.school_year ?? '10º ano');
  const [visibility, setVisibility] = useState<'private'|'students'|'public'>(material?.visibility ?? 'students');

  React.useEffect(()=>{
    setTitle(material?.title ?? "");
    setDescription(material?.description ?? "");
    setSubject((material?.subject as any) ?? 'Outros');
    setSchoolYear((material?.school_year as any) ?? '10º ano');
    setVisibility((material?.visibility as any) ?? 'students');
  }, [material]);

  async function handleSave() {
    if (!material) return;
    try {
      setPending(true);
      const { data, error } = await supabase
        .from('materials')
        .update({ title, description, subject, school_year: schoolYear, visibility })
        .eq('id', material.id)
        .select('*')
        .single();
      if (error) throw error;
      toast.success('Material atualizado.');
      onUpdated(data as any);
      onOpenChange(false);
    } catch (e:any) {
      toast.error(e.message ?? 'Erro ao atualizar.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>Editar Material</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e)=>setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e)=>setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Disciplina</Label>
              <Select value={subject} onValueChange={(v:any)=>setSubject(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Matemática">Matemática</SelectItem>
                  <SelectItem value="Física">Física</SelectItem>
                  <SelectItem value="Química">Química</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano</Label>
              <Select value={schoolYear} onValueChange={(v:any)=>setSchoolYear(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10º ano">10º ano</SelectItem>
                  <SelectItem value="11º ano">11º ano</SelectItem>
                  <SelectItem value="12º ano">12º ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visibilidade</Label>
              <Select value={visibility} onValueChange={(v:any)=>setVisibility(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Privado</SelectItem>
                  <SelectItem value="students">Alunos</SelectItem>
                  <SelectItem value="public">Público</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={pending}>{pending ? 'A guardar…' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ————————————————————————————————————————
// Modal: Enviar a aluno (cria homework + assignments)
// ————————————————————————————————————————
function SendToStudentModal({ open, onOpenChange, item }:{
  open: boolean; onOpenChange: (v:boolean)=>void; item: { kind: 'material'|'quiz'; id: string; title: string } | null;
}) {
  const [students, setStudents] = useState<{ id:string; name:string|null; email:string|null }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [due, setDue] = useState("");

  React.useEffect(()=>{
    if (!open) return;
    (async ()=>{
      // Ajusta para a tua tabela de perfis
      const { data } = await supabase.from('profiles').select('id, full_name, email').eq('role','student');
      setStudents((data ?? []).map((u:any)=>({ id:u.id, name:u.full_name, email:u.email })));
    })();
  }, [open]);

  function toggle(id:string){ setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]); }

  async function handleSend(){
    if (!item) return;
    if (selected.length===0) return toast.error('Seleciona pelo menos um aluno.');
    try {
      // Cria homework
      const payload:any = { title: item.title, description: item.kind==='quiz' ? 'Responder ao quiz' : 'Ver/estudar o material', due_at: due ? new Date(due).toISOString() : null };
      if (item.kind==='quiz') payload.type='quiz', payload.quiz_id=item.id; else payload.type='material', payload.material_id=item.id;
      const { data: hw, error: hErr } = await supabase.from('homeworks').insert(payload).select('*').single();
      if (hErr) throw hErr;
      // Atribuições
      const rows = selected.map(sid => ({ homework_id: hw.id, student_id: sid }));
      const { error: aErr } = await supabase.from('homework_assignments').insert(rows);
      if (aErr) throw aErr;
      toast.success('Atribuído com sucesso.');
      onOpenChange(false);
      setSelected([]); setDue("");
    } catch (e:any) {
      toast.error(e.message ?? 'Falha ao atribuir.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Enviar a aluno</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Data limite (opcional)</Label>
            <Input type="datetime-local" value={due} onChange={(e)=>setDue(e.target.value)} />
          </div>
          <div className="max-h-64 overflow-y-auto border rounded-lg p-2">
            {students.map(s => (
              <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-accent/30 rounded">
                <input type="checkbox" checked={selected.includes(s.id)} onChange={()=>toggle(s.id)} />
                <span className="text-sm">{s.name ?? s.email}</span>
              </label>
            ))}
            {students.length===0 && <div className="text-sm text-muted-foreground">Sem alunos.</div>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSend}>Enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ————————————————————————————————————————
// Página principal
// ————————————————————————————————————————
export default function ProfessorMateriais() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");

  const { materials, stats, loading, error, filters, setFilters, setMaterials } = useMaterials({
    q: "",
    subject: "Todas",
    schoolYear: "Todos",
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editMaterial, setEditMaterial] = useState<Material|null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendItem, setSendItem] = useState<{ kind: 'material'|'quiz'; id: string; title: string } | null>(null);

  const filteredMaterials = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter(m =>
      m.title.toLowerCase().includes(q) ||
      (m.description ?? "").toLowerCase().includes(q) ||
      m.subject.toLowerCase().includes(q)
    );
  }, [materials, searchTerm]);

  const getTypeColor = (m: Material) => {
    const type = (m.file_ext ?? '').toUpperCase();
    switch (type) {
      case "PDF": return "bg-red-100 text-red-700 border-red-200";
      case "MP4": return "bg-purple-100 text-purple-700 border-purple-200";
      case "PNG":
      case "JPG":
      case "JPEG": return "bg-green-100 text-green-700 border-green-200";
      case "HTML": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const iconByExt = (m: Material) => {
    const ext = (m.file_ext ?? '').toLowerCase();
    if (ext === 'mp4' || m.mime_type.startsWith('video/')) return Video;
    if (['png','jpg','jpeg','webp','gif'].includes(ext) || m.mime_type.startsWith('image/')) return ImageIcon;
    return FileText;
  };

  async function handleView(m: Material) {
    try {
      const url = await getSignedUrl(m.file_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast.error("Não foi possível abrir o ficheiro.");
    }
  }

  async function handleDownload(m: Material) {
    try {
      await registerDownload(m.id);
      const url = await getSignedUrl(m.file_path);
      const a = document.createElement('a');
      a.href = url; a.download = `${m.title}.${m.file_ext ?? ''}`; document.body.appendChild(a); a.click(); a.remove();
      setMaterials(prev => prev.map(x => x.id === m.id ? { ...x, downloads: (x.downloads ?? 0) + 1 } : x));
    } catch {
      toast.error("Falha a descarregar o ficheiro.");
    }
  }

  async function handleDeleteMaterial(id: string) {
    if (!confirm('Apagar este material?')) return;
    const { error: delErr } = await supabase.from('materials').delete().eq('id', id);
    if (delErr) return toast.error(delErr.message);
    setMaterials(prev => prev.filter(m => m.id !== id));
    toast.success('Material apagado.');
  }

  function openEdit(m: Material) { setEditMaterial(m); setEditOpen(true); }
  function openSendForMaterial(m: Material) { setSendItem({ kind:'material', id: m.id, title: m.title }); setSendOpen(true); }

  const MaterialCard = ({ material }: { material: Material }) => {
    const IconComponent = iconByExt(material);
    return (
      <Card className="glass-panel hover-lift cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <IconComponent className={`h-6 w-6 ${material.mime_type.startsWith('video/') ? 'text-purple-600' : material.mime_type.startsWith('image/') ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">
                  {material.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-xs ${getTypeColor(material)}`}>
                    {(material.file_ext ?? '').toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {(material.file_size_bytes/1024/1024).toFixed(1)} MB
                  </span>
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
                <DropdownMenuItem className="flex items-center gap-2" onClick={() => handleView(material)}>
                  <Eye className="h-4 w-4" /> Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2" onClick={() => handleDownload(material)}>
                  <Download className="h-4 w-4" /> Descarregar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEdit(material)}>Editar</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMaterial(material.id)}>Apagar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openSendForMaterial(material)}>Enviar a aluno</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{material.description ?? 'Sem descrição'}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>{material.subject}</span>
              <span>{material.school_year}</span>
              <span className="uppercase">{material.visibility}</span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              <span>{material.downloads ?? 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Helmet>
        <title>Materiais - Professor | Centro de Explicações</title>
        <meta name="description" content="Gerir e partilhar materiais educativos com os teus alunos" />
      </Helmet>

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Materiais</h1>
            <p className="text-muted-foreground">Gerir e partilhar materiais educativos com os teus alunos</p>
          </div>
          <div className="flex gap-2">
            <CreateQuizModal onCreated={() => { /* opcional: feedback */ }} />
            <CreateMaterialModal onCreated={(m)=> setMaterials(prev=>[m, ...prev])} />
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar materiais por título, disciplina ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setFilters({ ...filters, q: searchTerm })}>
              <Filter className="h-4 w-4 mr-2" /> Filtros
            </Button>
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                  <p className="text-sm text-muted-foreground">Total Materiais</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Download className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.totalDownloads}</div>
                  <p className="text-sm text-muted-foreground">Total Downloads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Video className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.videos}</div>
                  <p className="text-sm text-muted-foreground">Vídeos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Upload className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.thisMonth}</div>
                  <p className="text-sm text-muted-foreground">Este Mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs por disciplina */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" onClick={() => setFilters(f => ({ ...f, subject: 'Todas' }))}>Todos</TabsTrigger>
            <TabsTrigger value="math" onClick={() => setFilters(f => ({ ...f, subject: 'Matemática' }))}>Matemática</TabsTrigger>
            <TabsTrigger value="physics" onClick={() => setFilters(f => ({ ...f, subject: 'Física' }))}>Física</TabsTrigger>
            <TabsTrigger value="chemistry" onClick={() => setFilters(f => ({ ...f, subject: 'Química' }))}>Química</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <Card className="glass-panel"><CardContent className="p-6">A carregar…</CardContent></Card>
            ) : error ? (
              <Card className="glass-panel"><CardContent className="p-6 text-destructive">{error}</CardContent></Card>
            ) : viewMode === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMaterials.map((material) => (
                  <MaterialCard key={material.id} material={material} />
                ))}
              </div>
            ) : (
              <Card className="glass-panel">
                <CardContent className="p-0">
                  <div className="space-y-2">
                    {filteredMaterials.map((material, index) => (
                      <div
                        key={material.id}
                        className={`flex items-center justify-between p-4 hover:bg-accent/20 transition-colors ${index !== filteredMaterials.length - 1 ? 'border-b border-border/40' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          {React.createElement(iconByExt(material), { className: `h-8 w-8 ${material.mime_type.startsWith('video/') ? 'text-purple-600' : material.mime_type.startsWith('image/') ? 'text-green-600' : 'text-red-600'}` })}
                          <div>
                            <p className="font-medium text-foreground">{material.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={`text-xs ${getTypeColor(material)}`}>
                                {(material.file_ext ?? '').toUpperCase()}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {material.subject} • {material.school_year} • {(material.file_size_bytes/1024/1024).toFixed(1)} MB
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{material.downloads ?? 0} downloads</p>
                            <p className="text-xs text-muted-foreground">{new Date(material.upload_date).toLocaleDateString('pt-PT')}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(material)}>Visualizar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(material)}>Descarregar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(material)}>Editar</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMaterial(material.id)}>Apagar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openSendForMaterial(material)}>Enviar a aluno</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="math"><p className="text-muted-foreground">Materiais de Matemática</p></TabsContent>
          <TabsContent value="physics"><p className="text-muted-foreground">Materiais de Física</p></TabsContent>
          <TabsContent value="chemistry"><p className="text-muted-foreground">Materiais de Química</p></TabsContent>
        </Tabs>
      </div>

      {/* Modais auxiliares */}
      <EditMaterialModal
        open={editOpen}
        onOpenChange={setEditOpen}
        material={editMaterial}
        onUpdated={(m)=> setMaterials(prev => prev.map(x => x.id===m.id ? m : x))}
      />
      <SendToStudentModal open={sendOpen} onOpenChange={setSendOpen} item={sendItem} />
    </>
  );
}
