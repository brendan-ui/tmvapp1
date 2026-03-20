import type { AppRole } from '@/lib/brand'

export function DashboardShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <main className="ml-64 min-h-screen">
      <header className="sticky top-0 z-40 bg-cream/80 backdrop-blur-sm border-b border-gray-200 px-8 py-5">
        <h1 className="font-display text-2xl font-bold text-navy">{title}</h1>
        {subtitle && (
          <p className="font-body text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </header>
      <div className="p-8">
        {children}
      </div>
    </main>
  )
}
