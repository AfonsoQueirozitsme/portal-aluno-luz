import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const url  = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
if (!url || !anon) throw new Error('Faltam VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY no .env')

export const supabase = createClient<Database>(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  global: {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
  },
})
