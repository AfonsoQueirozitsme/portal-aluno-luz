// hooks/useMaterials.ts
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Material } from '@/types/materials';

type Filters = {
  q?: string;
  subject?: string;         // 'Matemática' | 'Física' | 'Química' | 'Outros' | 'Todas'
  schoolYear?: string;      // '10º ano' | '11º ano' | '12º ano' | 'Todos'
};

export function useMaterials(initialFilters?: Filters) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters ?? {});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('materials')
        .select('*')
        .order('upload_date', { ascending: false });

      if (filters.subject && filters.subject !== 'Todas') {
        query = query.eq('subject', filters.subject);
      }
      if (filters.schoolYear && filters.schoolYear !== 'Todos') {
        query = query.eq('school_year', filters.schoolYear);
      }
      if (filters.q && filters.q.trim()) {
        // pesquisa simples (title/description/subject)
        const q = filters.q.trim();
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,subject.eq.${q}`);
      }

      const { data, error } = await query;
      if (error) {
        setError(error.message);
      } else {
        setMaterials((data ?? []) as Material[]);
      }
      setLoading(false);
    };

    load();
  }, [filters]);

  const stats = useMemo(() => {
    const total = materials.length;
    const totalDownloads = materials.reduce((s, m) => s + (m.downloads ?? 0), 0);
    const videos = materials.filter(m => (m.file_ext ?? '').toLowerCase() === 'mp4').length;
    // Exemplo “este mês”: conta por upload_date
    const now = new Date();
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
    const thisMonth = materials.filter(m => (m.upload_date ?? '').startsWith(ym)).length;
    return { total, totalDownloads, videos, thisMonth };
  }, [materials]);

  return { materials, stats, loading, error, filters, setFilters, setMaterials };
}

export async function uploadMaterial(params: {
  file: File;
  title: string;
  description?: string;
  subject: 'Matemática'|'Física'|'Química'|'Outros';
  school_year: '10º ano'|'11º ano'|'12º ano';
  visibility?: 'private'|'students'|'public';
  tags?: string[];
}) {
  // 1) user é opcional enquanto tiveres RLS off; se quiseres, podes não exigir
  const { data: { user } } = await supabase.auth.getUser();

  const ext = params.file.name.split('.').pop()?.toLowerCase() ?? 'bin';

  // ⚠️ NÃO coloques "materials/" no início: esse é o nome do bucket.
  // O object name deve ser só a "pasta" e o ficheiro.
  const objectPath = `${user?.id ?? 'anon'}/${crypto.randomUUID()}.${ext}`;

  // 2) Upload para o bucket "materials"
  const { error: upErr } = await supabase.storage
    .from('materials')
    .upload(objectPath, params.file, {
      cacheControl: '3600',
      upsert: true,                // evita 409 se repetires o nome
      contentType: params.file.type || undefined,
    });

  if (upErr) throw upErr;

  // 3) Inserir registo na tabela
  const { data, error } = await supabase
    .from('materials')
    .insert({
      title: params.title,
      description: params.description ?? null,
      subject: params.subject,
      school_year: params.school_year,
      // guarda só o object name (sem o nome do bucket)
      file_path: objectPath,
      mime_type: params.file.type,
      file_size_bytes: params.file.size,
      file_ext: ext,
      visibility: params.visibility ?? 'students',
      tags: params.tags ?? [],
      // created_by é preenchido por trigger ou ignorado com RLS off
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Material;
}


export async function getSignedUrl(file_path: string) {
  const { data, error } = await supabase
    .storage
    .from('materials')
    .createSignedUrl(file_path, 60);
  if (error) throw error;
  return data.signedUrl;
}


export async function registerDownload(materialId: string) {
  const { error } = await supabase.rpc('increment_material_download', { p_id: materialId });
  if (error) throw error;
}
