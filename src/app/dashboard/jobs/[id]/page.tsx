'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Job, JobAssignment, Message, Profile } from '@/lib/types'
import { JOB_STATUS_STYLES, ASSIGNMENT_STATUS_STYLES, getJobColor, initials } from '@/lib/utils'
import { formatCurrency } from '@/lib/hmrc'
import { format, parseISO, differenceInDays } from 'date-fns'
import {
  MapPin, Calendar, Hotel, PoundSterling, Users, MessageSquare,
  Check, X, Pencil, Loader2, Send, ChevronLeft, Trash2,
} from 'lucide-react'
import Link from 'next/link'
import JobForm from '@/components/jobs/JobForm'
import MessageChannel from '@/components/messaging/MessageChannel'

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [assignments, setAssignments] = useState<(JobAssignment & { crew: Profile })[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [myAssignment, setMyAssignment] = useState<JobAssignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [tab, setTab] = useState<'details' | 'channel'>('details')

  const supabase = createClient()

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: prof }, { data: jobData }, { data: assignData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('jobs').select('*').eq('id', id).single(),
      supabase.from('job_assignments').select('*, crew:profiles(*)').eq('job_id', id),
    ])

    setProfile(prof)
    setJob(jobData)
    setAssignments((assignData as any[]) || [])
    setMyAssignment(assignData?.find((a: any) => a.crew_id === user.id) || null)
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  async function respond(status: 'accepted' | 'declined') {
    if (!myAssignment) return
    setResponding(true)
    await supabase.from('job_assignments').update({
      status,
      responded_at: new Date().toISOString(),
    }).eq('id', myAssignment.id)
    await loadData()
    setResponding(false)
  }

  async function deleteJob() {
    if (!confirm('Delete this job? This cannot be undone.')) return
    await supabase.from('jobs').delete().eq('id', id)
    router.push('/dashboard/jobs')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 size={24} className="animate-spin text-[#E8820C]" />
    </div>
  )

  if (!job) return (
    <div className="p-6 text-center text-gray-400">Job not found.</div>
  )

  const isAdmin = profile?.role === 'owner' || profile?.role === 'admin'
  const color = getJobColor(job.id)
  const statusStyle = JOB_STATUS_STYLES[job.status]
  const days = differenceInDays(parseISO(job.end_date), parseISO(job.start_date)) + 1
  const totalValue = job.rate_per_day ? job.rate_per_day * days : null

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      {/* Back */}
      <Link href="/dashboard/jobs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#E8820C] mb-4 transition-colors">
        <ChevronLeft size={16} /> All Jobs
      </Link>

      {/* Header */}
      <div className="card mb-4 overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: color.border }} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`badge ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
                {job.job_type && <span className="badge bg-gray-100 text-gray-600">{job.job_type}</span>}
              </div>
              <h1 className="text-xl font-bold text-[#2B2B2B] mb-1">{job.title}</h1>
              {job.client_name && <p className="text-sm text-gray-500">{job.client_name}</p>}
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <button onClick={() => setShowEdit(true)} className="btn-outline px-3 py-2"><Pencil size={15} /></button>
                <button onClick={deleteJob} className="btn-danger px-3 py-2"><Trash2 size={15} /></button>
              </div>
            )}
          </div>

          {/* Key details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={15} className="text-[#E8820C]" />
              <div>
                <p className="text-xs text-gray-400">Dates</p>
                <p className="font-medium text-gray-800">{format(parseISO(job.start_date), 'd MMM')} — {format(parseISO(job.end_date), 'd MMM yyyy')}</p>
                <p className="text-xs text-gray-400">{days} day{days !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {job.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={15} className="text-[#E8820C]" />
                <div>
                  <p className="text-xs text-gray-400">Location</p>
                  <p className="font-medium text-gray-800">{job.location}</p>
                </div>
              </div>
            )}
            {job.rate_per_day && (
              <div className="flex items-center gap-2 text-sm">
                <PoundSterling size={15} className="text-[#E8820C]" />
                <div>
                  <p className="text-xs text-gray-400">Rate</p>
                  <p className="font-medium text-gray-800">{formatCurrency(job.rate_per_day)}/day</p>
                  {totalValue && <p className="text-xs text-gray-400">Total: {formatCurrency(totalValue)}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Hotel info */}
          {job.hotel_info && (
            <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <Hotel size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-0.5">Hotel / Accommodation</p>
                <p className="text-sm text-amber-800">{job.hotel_info}</p>
              </div>
            </div>
          )}

          {job.notes && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* My assignment action */}
      {myAssignment && myAssignment.status === 'pending' && (
        <div className="card p-4 mb-4 border-l-4 border-yellow-400">
          <p className="font-semibold text-gray-800 mb-1">You have been invited to this job</p>
          <p className="text-sm text-gray-500 mb-3">
            {myAssignment.daily_rate && `Rate: ${formatCurrency(myAssignment.daily_rate)}/day · `}
            Please accept or decline.
          </p>
          <div className="flex gap-3">
            <button onClick={() => respond('accepted')} disabled={responding} className="btn-primary flex-1">
              {responding ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Accept
            </button>
            <button onClick={() => respond('declined')} disabled={responding} className="btn-danger flex-1">
              {responding ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
        <button
          onClick={() => setTab('details')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${tab === 'details' ? 'bg-white text-[#2B2B2B] shadow-sm' : 'text-gray-500'}`}
        >
          <Users size={15} /> Crew ({assignments.length})
        </button>
        <button
          onClick={() => setTab('channel')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${tab === 'channel' ? 'bg-white text-[#2B2B2B] shadow-sm' : 'text-gray-500'}`}
        >
          <MessageSquare size={15} /> Channel
        </button>
      </div>

      {tab === 'details' && (
        <div className="card divide-y divide-gray-100">
          {assignments.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No crew assigned yet.</div>
          ) : (
            assignments.map(a => {
              const aStyle = ASSIGNMENT_STATUS_STYLES[a.status]
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-[#2B2B2B] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {initials(a.crew?.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{a.crew?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">
                      {a.daily_rate ? `${formatCurrency(a.daily_rate)}/day` : 'Rate TBC'}
                    </p>
                  </div>
                  <span className={`badge ${aStyle.bg} ${aStyle.text}`}>{aStyle.label}</span>
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'channel' && profile && (
        <MessageChannel jobId={id} currentUser={profile} />
      )}

      {showEdit && isAdmin && (
        <JobForm
          job={job}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); loadData() }}
        />
      )}
    </div>
  )
}
