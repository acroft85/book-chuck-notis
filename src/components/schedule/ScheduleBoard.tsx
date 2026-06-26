'use client'

import { useState, useEffect, useCallback } from 'react'
import { startOfWeek, addDays, format, isWithinInterval, parseISO, isSameDay, isToday } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Job, JobAssignment } from '@/lib/types'
import { getJobColor, initials } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import Link from 'next/link'

type AssignmentWithJob = JobAssignment & { job: Job }

export default function ScheduleBoard({ currentUser }: { currentUser: Profile }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [crew, setCrew] = useState<Profile[]>([])
  const [assignments, setAssignments] = useState<AssignmentWithJob[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCell, setSelectedCell] = useState<AssignmentWithJob | null>(null)

  const isAdminOrOwner = currentUser.role === 'owner' || currentUser.role === 'admin'
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd = weekDays[6]

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)

    const crewQ = isAdminOrOwner
      ? supabase.from('profiles').select('*').eq('role', 'crew').order('full_name')
      : supabase.from('profiles').select('*').eq('id', currentUser.id)

    const [{ data: crewData }, { data: assignData }] = await Promise.all([
      crewQ,
      supabase
        .from('job_assignments')
        .select('*, job:jobs(*)')
        .neq('status', 'declined'),
    ])

    if (crewData) setCrew(crewData)
    if (assignData) {
      const filtered = (assignData as AssignmentWithJob[]).filter(a => {
        if (!a.job) return false
        const s = parseISO(a.job.start_date)
        const e = parseISO(a.job.end_date)
        return s <= weekEnd && e >= weekStart
      })
      setAssignments(filtered)
    }
    setLoading(false)
  }, [weekStart, weekEnd, isAdminOrOwner, currentUser.id])

  useEffect(() => { fetchData() }, [fetchData])

  function getAssignmentForCrewOnDay(crewId: string, day: Date): AssignmentWithJob | undefined {
    return assignments.find(a => {
      if (a.crew_id !== crewId || !a.job) return false
      return isWithinInterval(day, {
        start: parseISO(a.job.start_date),
        end: parseISO(a.job.end_date),
      })
    })
  }

  // Check if it's the first day of this assignment in the current week view
  function isFirstDayInView(a: AssignmentWithJob, day: Date): boolean {
    const jobStart = parseISO(a.job.start_date)
    return isSameDay(day, jobStart) || isSameDay(day, weekStart)
  }

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekStart(d => addDays(d, -7))}
          className="btn-outline px-3 py-2"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#2B2B2B]">
            {format(weekStart, 'dd MMM')} — {format(weekEnd, 'dd MMM yyyy')}
          </p>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="text-xs text-[#E8820C] hover:underline"
          >
            Today
          </button>
        </div>
        <button
          onClick={() => setWeekStart(d => addDays(d, 7))}
          className="btn-outline px-3 py-2"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">
          <Calendar size={24} className="animate-pulse" />
        </div>
      ) : crew.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No crew members found.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <div style={{ minWidth: 540 }}>
            {/* Header row */}
            <div className="grid mb-1" style={{ gridTemplateColumns: '120px repeat(7, 1fr)' }}>
              <div />
              {weekDays.map(day => (
                <div
                  key={day.toISOString()}
                  className={`text-center py-2 rounded-lg mx-0.5 text-xs font-medium ${
                    isToday(day)
                      ? 'bg-[#E8820C] text-white'
                      : 'text-gray-500'
                  }`}
                >
                  <div>{format(day, 'EEE')}</div>
                  <div className="text-base font-bold">{format(day, 'd')}</div>
                </div>
              ))}
            </div>

            {/* Crew rows */}
            {crew.map(member => (
              <div
                key={member.id}
                className="grid mb-1 group"
                style={{ gridTemplateColumns: '120px repeat(7, 1fr)' }}
              >
                {/* Crew name */}
                <div className="flex items-center gap-2 pr-2">
                  <div className="w-7 h-7 rounded-full bg-[#2B2B2B] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {initials(member.full_name)}
                  </div>
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {member.full_name?.split(' ')[0] || 'Crew'}
                  </span>
                </div>

                {/* Day cells */}
                {weekDays.map(day => {
                  const a = getAssignmentForCrewOnDay(member.id, day)
                  const color = a ? getJobColor(a.job_id) : null
                  const showLabel = a && isFirstDayInView(a, day)

                  return (
                    <div
                      key={day.toISOString()}
                      className="schedule-cell mx-0.5 rounded cursor-pointer"
                      style={{
                        backgroundColor: color ? color.bg : isToday(day) ? '#F0FDF4' : '#F9FAFB',
                        borderLeft: color ? `3px solid ${color.border}` : isToday(day) ? '3px solid #bbf7d0' : '3px solid transparent',
                        opacity: a?.status === 'pending' ? 0.65 : 1,
                      }}
                      onClick={() => setSelectedCell(a || null)}
                      title={a ? `${a.job.title}${a.status === 'pending' ? ' (pending)' : ''}` : ''}
                    >
                      {showLabel && (
                        <div
                          className="px-1.5 py-1 text-xs font-semibold truncate"
                          style={{ color: color?.text }}
                        >
                          {a!.job.title.length > 10 ? a!.job.title.slice(0, 8) + '…' : a!.job.title}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ border: '3px solid #86EFAC', backgroundColor: '#F0FDF4' }} />
                Today
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm opacity-60" style={{ border: '3px solid #3B82F6', backgroundColor: '#EFF6FF' }} />
                Pending acceptance
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ border: '3px solid #3B82F6', backgroundColor: '#EFF6FF' }} />
                Confirmed job
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Selected cell detail */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={() => setSelectedCell(null)}>
          <div className="card p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: getJobColor(selectedCell.job_id).text }}
            >
              {selectedCell.job.job_type || 'Job'}
            </div>
            <h3 className="text-lg font-bold text-[#2B2B2B] mb-1">{selectedCell.job.title}</h3>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <p>{format(parseISO(selectedCell.job.start_date), 'd MMM')} — {format(parseISO(selectedCell.job.end_date), 'd MMM yyyy')}</p>
              {selectedCell.job.location && <p>{selectedCell.job.location}</p>}
              {selectedCell.job.hotel_info && <p className="text-amber-600">Hotel: {selectedCell.job.hotel_info}</p>}
              <p className="capitalize">Status: {selectedCell.status}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/dashboard/jobs/${selectedCell.job_id}`} className="btn-primary flex-1 text-center">
                View Job
              </Link>
              <button onClick={() => setSelectedCell(null)} className="btn-outline px-4">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
