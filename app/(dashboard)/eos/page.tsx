import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/get-profile'
import { DashboardShell } from '@/components/dashboard-shell'
import { EosTabs } from './eos-tabs'

export default async function EosPage() {
  const supabase = await createClient()
  const profile = await getProfile()
  const userId = profile?.id

  // Fetch all EOS data with owner names via join
  const [
    { data: scorecards },
    { data: rocks },
    { data: todos },
    { data: issues },
  ] = await Promise.all([
    supabase
      .from('eos_scorecards')
      .select('*, profiles!eos_scorecards_owner_id_fkey(full_name)')
      .order('week_of', { ascending: false })
      .limit(50),
    supabase
      .from('eos_rocks')
      .select('*, profiles!eos_rocks_owner_id_fkey(full_name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('eos_todos')
      .select('*, profiles!eos_todos_owner_id_fkey(full_name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('eos_issues')
      .select('*, profiles!eos_issues_created_by_fkey(full_name)')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false }),
  ])

  // Flatten the joined owner name
  const flattenOwner = (rows: any[] | null, fkField = 'profiles') =>
    (rows ?? []).map((r) => ({
      ...r,
      owner_name: r[fkField]?.full_name ?? null,
    }))

  return (
    <DashboardShell title="EOS Tracker" subtitle="Entrepreneurial Operating System — Scorecards, Rocks, To-Dos, Issues">
      <EosTabs
        scorecards={flattenOwner(scorecards)}
        rocks={flattenOwner(rocks)}
        todos={flattenOwner(todos)}
        issues={flattenOwner(issues)}
        userId={userId ?? ''}
        userRole={profile?.role ?? 'viewer'}
      />
    </DashboardShell>
  )
}
