import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/get-profile'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getProfile()

  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-cream">
      <Sidebar role={profile.role} userName={profile.full_name ?? profile.email.split('@')[0]} />
      {children}
    </div>
  )
}
