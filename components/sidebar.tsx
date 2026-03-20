'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { AppRole } from '@/lib/brand'
import { ROLE_PERMISSIONS } from '@/lib/brand'

const NAV_ITEMS = [
  { key: 'revenue', label: 'Revenue', href: '/revenue', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'cash', label: 'Cash & AR', href: '/cash', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { key: 'pipeline', label: 'Pipeline', href: '/pipeline', icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' },
  { key: 'profitability', label: 'Profitability', href: '/profitability', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { key: 'eos', label: 'EOS', href: '/eos', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
]

export function Sidebar({ role, userName }: { role: AppRole; userName: string | null }) {
  const pathname = usePathname()
  const allowed = ROLE_PERMISSIONS[role].tabs

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-navy flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <h1 className="font-display text-xl font-bold text-white">TMV OS</h1>
        <p className="font-body text-xs text-gold mt-1">Operating System</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.filter((item) => allowed.includes(item.key)).map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-body text-sm transition-colors ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
            <span className="font-body text-xs font-semibold text-gold">
              {userName ? userName.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm text-white truncate">{userName ?? 'Team Member'}</p>
            <p className="font-body text-xs text-white/40 capitalize">{role}</p>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="mt-3 w-full px-3 py-1.5 rounded-lg font-body text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors text-left"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
