import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCurrency } from '@/lib/hmrc'
import { JOB_STATUS_STYLES } from '@/lib/utils'
import { Briefcase, CalendarDays, PoundSterling, Bell, ChevronRight } from 'lucide-react'
import { format, parseISO, isAfter, subDays } from 'date-fns'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isAdmin = profile?.role === 'owner' || profile?.role === 'admin'

  // My pending assignments
  const { data: pendingAssignments } = await supabase
    .from('job_assignments')
    .select('*, job:jobs(*)')
    .eq('crew_id', user.id)
    .eq('status', 'pending')
    .order('assigned_at', { ascending: false })
    .limit(5)

  // Upcoming jobs (next 14 days)
  const today = new Date().toISOString().split('T')[0]
  const twoWeeksOut = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]

  const assignmentsQuery = isAdmin
    ? supabase.from('jobs').select('*, job_assignments(count)').gte('start_date', today).lte('start_date', twoWeeksOut).neq('status', 'cancelled').order('start_date').limit(5)
    : supabase.from('job_assignments').select('*, job:jobs(*)').eq('crew_id', user.id).eq('status', 'accepted').gte('job.start_date', today).order('job(start_date)').limit(5)

  const { data: upcomingData } = await assignmentsQuery

  // Earnings this month (crew only)
  let monthEarnings = 0
  if (!isAdmin) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const { data: monthAssignments } = await supabase
      .from('job_assignments')
      .select('daily_rate, job:jobs(start_date, end_date, status)')
      .eq('crew_id', user.id)
      .eq('status', 'accepted')

    if (monthAssignments) {
      monthEarnings = monthAssignments
        .filter((a: any) => a.job?.status === 'completed' && a.job?.start_date >= startOfMonth)
        .reduce((sum: number, a: any) => {
          const days = a.job ? Math.max(1, Math.ceil((new Date(a.job.end_date).getTime() - new Date(a.job.start_date).getTime()) / 86400000) + 1) : 1
          return sum + (a.daily_rate || 0) * days
        }, 0)
    }
  }

  // Admin: new booking requests
  let newBookings = 0
  if (isAdmin) {
    const { count } = await supabase.from('booking_requests').select('*', { count: 'exact', head: true }).eq('status', 'new')
    newBookings = count || 0
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2B2B2B]">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <Bell size={14} className="text-[#E8820C]" />
            Awaiting Response
          </div>
          <div className="text-3xl font-bold text-[#2B2B2B]">{pendingAssignments?.length ?? 0}</div>
          <Link href="/dashboard/jobs?filter=pending" className="text-xs text-[#E8820C] hover:underline mt-1 block">View all →</Link>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
            <CalendarDays size={14} className="text-[#E8820C]" />
            Upcoming (14 days)
          </div>
          <div className="text-3xl font-bold text-[#2B2B2B]">{upcomingData?.length ?? 0}</div>
          <Link href="/dashboard/schedule" className="text-xs text-[#E8820C] hover:underline mt-1 block">View schedule →</Link>
        </div>

        {isAdmin ? (
          <div className="card p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
              <Briefcase size={14} className="text-[#E8820C]" />
              New Booking Requests
            </div>
            <div className="text-3xl font-bold text-[#2B2B2B]">{newBookings}</div>
            <Link href="/dashboard/clients" className="text-xs text-[#E8820C] hover:underline mt-1 block">View requests →</Link>
          </div>
        ) : (
          <div className="card p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
              <PoundSterling size={14} className="text-[#E8820C]" />
              Earnings This Month
            </div>
            <div className="text-3xl font-bold text-[#2B2B2B]">{formatCurrency(monthEarnings)}</div>
            <Link href="/dashboard/earnings" className="text-xs text-[#E8820C] hover:underline mt-1 block">Full report →</Link>
          </div>
        )}
      </div>

      {/* Pending actions */}
      {pendingAssignments && pendingAssignments.length > 0 && (
        <div className="card mb-4">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-[#2B2B2B] text-sm">Action Required</h2>
            <Link href="/dashboard/jobs?filter=pending" className="text-xs text-[#E8820C] hover:underline">See all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(pendingAssignments as any[]).map(a => (
              <Link key={a.id} href={`/dashboard/jobs/${a.job_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.job?.title}</p>
                  <p className="text-xs text-gray-500">{a.job?.start_date ? format(parseISO(a.job.start_date), 'd MMM') : ''} · {a.job?.location}</p>
                </div>
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { href: '/dashboard/schedule', label: 'View Schedule', icon: CalendarDays },
          { href: '/dashboard/jobs',     label: 'All Jobs',      icon: Briefcase },
          { href: '/dashboard/earnings', label: 'Earnings',      icon: PoundSterling },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            <Icon size={20} className="text-[#E8820C]" />
            <span className="text-sm font-medium text-[#2B2B2B]">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
