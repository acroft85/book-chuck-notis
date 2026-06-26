'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Home, CalendarDays, Briefcase, PoundSterling, Users } from 'lucide-react'

interface MobileNavItem { href: string; label: string; icon: React.ElementType; roles: string[] }

const MOBILE_NAV: MobileNavItem[] = [
  { href: '/dashboard',          label: 'Home',     icon: Home,           roles: ['owner','admin','crew','client'] },
  { href: '/dashboard/schedule', label: 'Schedule', icon: CalendarDays,   roles: ['owner','admin','crew'] },
  { href: '/dashboard/jobs',     label: 'Jobs',     icon: Briefcase,      roles: ['owner','admin','crew','client'] },
  { href: '/dashboard/earnings', label: 'Earnings', icon: PoundSterling,  roles: ['owner','admin','crew'] },
  { href: '/dashboard/crew',     label: 'Crew',     icon: Users,          roles: ['owner','admin'] },
]

export default function MobileNav({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const items = MOBILE_NAV.filter(i => i.roles.includes(profile.role))

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-[#2B2B2B] border-t border-white/10 z-40 safe-area-pb">
      <div className="flex">
        {items.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                active ? 'text-white' : 'text-white/50 hover:text-white/80'
              )}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
