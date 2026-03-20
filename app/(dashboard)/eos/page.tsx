import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/get-profile'
import { DashboardShell } from '@/components/dashboard-shell'
import { Card } from '@/components/card'
import { EosTabs } from './eos-tabs'

export default async function EosPage() {
  const supabase = await createClient()
  const profile = await getProfile()
  const userId = profile?.id

  // Fetch all EOS data
  const [
    { data: scorecards },
    { data: rocks },
    { data: todos },
    { data: issues },
  ] = await Promise.all([
    supabase
      .from('eos_scorecards')
      .select('*')
      .order('week_of', { ascending: false })
      .limit(50),
    supabase
      .from('eos_rocks')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('eos_todos')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('eos_issues')
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false }),
  ])

  return (
    <DashboardShell title="EOS Tracker" subtitle="Entrepreneurial Operating System — Scorecards, Rocks, To-Dos, Issues">
      <EosTabs
        scorecards={scorecards ?? []}
        rocks={rocks ?? []}
        todos={todos ?? []}
        issues={issues ?? []}
        userId={userId ?? ''}
        userRole={profile?.role ?? 'viewer'}
      />
    </DashboardShell>
  )
}
