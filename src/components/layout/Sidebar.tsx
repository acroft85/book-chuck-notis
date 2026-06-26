'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { cn, initials } from '@/lib/utils'
import {
  CalendarDays, Briefcase, MessageSquare, PoundSterling,
  GraduationCap, Settings2, Users, Inbox, LogOut, Home,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',             label: 'Overview',       icon: Home,           roles: ['owner','admin','crew','client'] },
  { href: '/dashboard/schedule',    label: 'Schedule',       icon: CalendarDays,   roles: ['owner','admin','crew'] },
  { href: '/dashboard/jobs',        label: 'Jobs',           icon: Briefcase,      roles: ['owner','admin','crew','client'] },
  { href: '/dashboard/earnings',    label: 'Earnings',       icon: PoundSterling,  roles: ['owner','admin','crew'] },
  { href: '/dashboard/training',    label: 'Training',       icon: GraduationCap,  roles: ['owner','admin','crew'] },
  { href: '/dashboard/preferences', label: 'Preferences',   icon: Settings2,      roles: ['owner','admin','crew'] },
  { href: '/dashboard/crew',        label: 'Crew',           icon: Users,          roles: ['owner','admin'] },
  { href: '/dashboard/clients',     label: 'Bookings',       icon: Inbox,          roles: ['owner','admin'] },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(profile.role))

  return (
    <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-[#2B2B2B] z-40">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-white/10">
        <img src="/logo-white.svg" alt="Book Chuck Notis" className="h-8 w-auto" />
        <p className="text-white/40 text-xs mt-0.5 uppercase tracking-wider">{profile.role}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/10">
        <Link href="/dashboard/preferences" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/8 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-[#E8820C] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials(profile.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{profile.full_name || 'User'}</p>
            <p className="text-white/40 text-xs truncate">{profile.email}</p>
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-colors mt-1"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
