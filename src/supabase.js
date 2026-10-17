import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const configured = Boolean(url && key)

export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-key', {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

// Call a Postgres function; throws a readable Error on failure.
export async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(error.message)
  return data
}

// Await a table query builder; throws a readable Error on failure.
export async function query(builder) {
  const { data, error } = await builder
  if (error) throw new Error(error.message)
  return data
}
