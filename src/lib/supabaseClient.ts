// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Vite: usa SEMPRE import.meta.env + prefixo VITE_
const url  = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anon) {
  // ajuda-te a perceber logo no dev se faltam variáveis
  throw new Error('Faltam VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY no .env')
}

export const supabase = createClient<Database>(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
