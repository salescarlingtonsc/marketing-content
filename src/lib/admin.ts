import { supabase } from './supabase'

export interface Profile {
  id: string
  email: string | null
  role: string
  status: string
  created_at: string
}

export async function getMyProfile(): Promise<Profile | null> {
  const { data: u } = await supabase.auth.getUser()
  const uid = u.user?.id
  if (!uid) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,role,status,created_at')
    .eq('id', uid)
    .maybeSingle()
  if (error) throw error
  return (data as Profile) ?? null
}

// Owner-only (RLS enforces). Lists everyone for approve/reject.
export async function listUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,role,status,created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Profile[]
}

export async function setUserStatus(id: string, status: 'approved' | 'rejected') {
  const { error } = await supabase.from('profiles').update({ status }).eq('id', id)
  if (error) throw error
}
