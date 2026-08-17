export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://whgnczmorqmhwdvmgtwt.supabase.co'

export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ25jem1vcnFtaHdkdm1ndHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTE3MTYsImV4cCI6MjEwMjU2NzcxNn0.GenTCUGdLzxiyW9TtI8740WsmIg9_TUy1x0j6itPAdI'

export function supabaseHeaders(token?: string) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  }
}
