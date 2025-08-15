export interface Material {
  id: string;
  title: string;
  description: string;
  subject: string;
  school_year: string;
  file_path?: string;
  mime_type?: string;
  file_size_bytes?: number;
  file_ext?: string;
  visibility?: 'private' | 'students' | 'public';
  tags?: string[];
  downloads?: number;
  upload_date?: string;
  created_at?: string;
  updated_at?: string;
}