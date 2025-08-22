import { useState, useEffect } from 'react';
import type { Material } from '@/types/materials';

type Filters = {
  q?: string;
  subject?: string;
  schoolYear?: string;
};

const mockMaterials: Material[] = [
  {
    id: '1',
    title: 'Exercícios de Álgebra',
    description: 'Exercícios práticos de álgebra para o 11º ano',
    subject: 'Matemática',
    school_year: '11º ano',
    file_ext: 'pdf',
    downloads: 45,
    upload_date: '2024-01-15',
    visibility: 'students'
  },
  {
    id: '2',
    title: 'Teoria da Física Quântica',
    description: 'Introdução aos conceitos básicos da física quântica',
    subject: 'Física',
    school_year: '12º ano',
    file_ext: 'mp4',
    downloads: 23,
    upload_date: '2024-01-16',
    visibility: 'students'
  },
];

export function useMaterials(initialFilters?: Filters) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters ?? {});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let filteredMaterials = mockMaterials;
      
      if (filters.subject && filters.subject !== 'Todas') {
        filteredMaterials = filteredMaterials.filter(m => m.subject === filters.subject);
      }
      if (filters.schoolYear && filters.schoolYear !== 'Todos') {
        filteredMaterials = filteredMaterials.filter(m => m.school_year === filters.schoolYear);
      }
      if (filters.q && filters.q.trim()) {
        const q = filters.q.trim().toLowerCase();
        filteredMaterials = filteredMaterials.filter(m => 
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.subject.toLowerCase().includes(q)
        );
      }
      
      setMaterials(filteredMaterials);
      setLoading(false);
    };

    load();
  }, [filters]);

  const stats = {
    total: materials.length,
    totalDownloads: materials.reduce((s, m) => s + (m.downloads ?? 0), 0),
    videos: materials.filter(m => (m.file_ext ?? '').toLowerCase() === 'mp4').length,
    thisMonth: materials.filter(m => (m.upload_date ?? '').startsWith('2024-01')).length
  };

  return { materials, stats, loading, error, filters, setFilters, setMaterials };
}

export const uploadMaterial = async (data: any) => {
  // Mock implementation
  return { id: Date.now().toString(), title: data.title, ...data };
};

export const getSignedUrl = async (path: string) => {
  // Mock implementation
  return `https://example.com/${path}`;
};

export const registerDownload = async (materialId: string) => {
  // Mock implementation
  console.log('Download registered for:', materialId);
};