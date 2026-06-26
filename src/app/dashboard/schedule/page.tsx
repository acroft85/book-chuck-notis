import { createClient } from '@/lib/supabase/server'
import ScheduleBoard from '@/components/schedule/ScheduleBoard'
import type { Profile } from '@/lib/types'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const metadata = { title: 'Schedule' }

export default async function SchedulePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isAdmin = profile?.role === 'owner' || profile?.role === 'admin'

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2B2B2B]">Schedule</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isAdmin ? 'Full crew schedule view' : 'Your upcoming assignments'}
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/jobs?new=1" className="btn-primary">
            <Plus size={16} />
            New Job
          </Link>
        )}
      </div>

      <div className="card p-4 md:p-6">
        <ScheduleBoard currentUser={profile as Profile} />
      </div>
    </div>
  )
}
