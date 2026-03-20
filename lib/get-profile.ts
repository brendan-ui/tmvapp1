import { createClient } from '@/lib/supabase/server'
import type { AppRole } from '@/lib/brand'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: AppRole
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return {
      id: user.id,
      email: user.email ?? '',
      full_name: null,
      role: 'viewer',
    }
  }

  return profile as Profile
}
