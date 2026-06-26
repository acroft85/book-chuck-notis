'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Job, JobAssignment, Profile } from '@/lib/types'
import { JOB_STATUS_STYLES, getJobColor } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { Plus, Search, Filter, MapPin, Calendar, Hotel, ChevronRight, Loader2 } from 'lucide-react'
import JobForm from '@/components/jobs/JobForm'
import { useSearchParams } from 'next/navigation'

type JobWithAssignments = Job & { job_assignments: JobAssignment[] }

export default function JobsPage() {
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<JobWithAssignments[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') || 'all')
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1')
  const [editJob, setEditJob] = useState<Job | null>(null)

  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    const isAdmin = prof?.role === 'owner' || prof?.role === 'admin'

    let query
    if (isAdmin) {
      query = supabase
        .from('jobs')
        .select('*, job_assignments(*)')
        .order('start_date', { ascending: false })
    } else {
      // Crew: get jobs they are assigned to
      const { data: assigned } = await supabase
        .from('job_assignments')
        .select('job_id')
        .eq('crew_id', user.id)
      const jobIds = assigned?.map(a => a.job_id) || []
      if (jobIds.length === 0) { setJobs([]); setLoading(false); return }
      query = supabase
        .from('jobs')
        .select('*, job_assignments(*)')
        .in('id', jobIds)
        .order('start_date', { ascending: false })
    }

    const { data } = await query
    setJobs((data as JobWithAssignments[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = jobs.filter(j => {
    const matchStatus = statusFilter === 'all' || j.status === statusFilter
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.location?.toLowerCase().includes(search.toLowerCase()) ||
      j.client_name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const isAdmin = profile?.role === 'owner' || profile?.role === 'admin'

  const myAssignmentStatus = (j: JobWithAssignments) => {
    if (!profile) return null
    return j.job_assignments?.find(a => a.crew_id === profile.id)?.status
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2B2B2B]">Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} job{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditJob(null); setShowForm(true) }} className="btn-primary">
            <Plus size={16} /> New Job
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search jobs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-[#E8820C]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Briefcase size={32} className="mx-auto mb-2 opacity-30" />
          <p>No jobs found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(job => {
            const color = getJobColor(job.id)
            const statusStyle = JOB_STATUS_STYLES[job.status]
            const assignStatus = myAssignmentStatus(job)

            return (
              <Link
                key={job.id}
                href={`/dashboard/jobs/${job.id}`}
                className="card flex items-center gap-3 px-4 py-3.5 hover:shadow-md transition-shadow group"
              >
                {/* Color stripe */}
                <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: color.border }} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-[#2B2B2B] truncate">{job.title}</span>
                    <span className={`badge ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
                    {assignStatus === 'pending' && (
                      <span className="badge bg-yellow-100 text-yellow-800">Action needed</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {format(parseISO(job.start_date), 'd MMM')}
                      {job.end_date !== job.start_date && ` — ${format(parseISO(job.end_date), 'd MMM yyyy')}`}
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {job.location}
                      </span>
                    )}
                    {job.hotel_info && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Hotel size={12} />
                        Hotel booked
                      </span>
                    )}
                    {isAdmin && job.job_assignments?.length > 0 && (
                      <span>{job.job_assignments.length} crew assigned</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0 group-hover:text-[#E8820C] transition-colors" />
              </Link>
            )
          })}
        </div>
      )}

      {/* Job form modal */}
      {(showForm || editJob) && isAdmin && (
        <JobForm
          job={editJob}
          onClose={() => { setShowForm(false); setEditJob(null) }}
          onSaved={() => { setShowForm(false); setEditJob(null); load() }}
        />
      )}
    </div>
  )
}

function Briefcase({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  )
}
