'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Job, Profile } from '@/lib/types'
import { JOB_TYPES, getJobColor } from '@/lib/utils'
import { X, Loader2, Hotel } from 'lucide-react'

interface Props {
  job?: Job | null
  onClose: () => void
  onSaved: () => void
}

const DEFAULT_COLORS = ['#3B82F6','#F97316','#8B5CF6','#F59E0B','#EC4899','#06B6D4','#22C55E','#F43F5E']

export default function JobForm({ job, onClose, onSaved }: Props) {
  const [crewList, setCrewList] = useState<Profile[]>([])
  const [selectedCrew, setSelectedCrew] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: job?.title || '',
    client_name: job?.client_name || '',
    location: job?.location || '',
    hotel_info: job?.hotel_info || '',
    start_date: job?.start_date || '',
    end_date: job?.end_date || '',
    status: job?.status || 'pending',
    job_type: job?.job_type || '',
    color: job?.color || DEFAULT_COLORS[0],
    rate_per_day: job?.rate_per_day?.toString() || '',
    notes: job?.notes || '',
  })

  const supabase = createClient()

  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'crew').order('full_name')
      .then(({ data }) => setCrewList(data || []))

    if (job) {
      supabase.from('job_assignments').select('crew_id').eq('job_id', job.id)
        .then(({ data }) => setSelectedCrew(data?.map(a => a.crew_id) || []))
    }
  }, [])

  function toggleCrew(id: string) {
    setSelectedCrew(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const payload = {
        ...form,
        rate_per_day: form.rate_per_day ? parseFloat(form.rate_per_day) : null,
        updated_at: new Date().toISOString(),
      }

      let jobId = job?.id
      if (job) {
        const { error } = await supabase.from('jobs').update(payload).eq('id', job.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('jobs').insert({ ...payload, created_by: user?.id }).select('id').single()
        if (error) throw error
        jobId = data.id
      }

      // Sync crew assignments
      if (jobId) {
        const { data: existing } = await supabase.from('job_assignments').select('crew_id').eq('job_id', jobId)
        const existingIds = existing?.map(a => a.crew_id) || []

        const toAdd = selectedCrew.filter(id => !existingIds.includes(id))
        const toRemove = existingIds.filter(id => !selectedCrew.includes(id))

        if (toAdd.length > 0) {
          await supabase.from('job_assignments').insert(
            toAdd.map(crew_id => ({ job_id: jobId!, crew_id, status: 'pending' }))
          )
        }
        if (toRemove.length > 0) {
          await supabase.from('job_assignments').delete().eq('job_id', jobId).in('crew_id', toRemove)
        }
      }

      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-bold text-[#2B2B2B]">{job ? 'Edit Job' : 'New Job'}</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Job Title *</label>
              <input className="input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required placeholder="e.g. Retail Fit-Out – Manchester Arndale" />
            </div>

            <div>
              <label className="label">Client Name</label>
              <input className="input" value={form.client_name} onChange={e => setForm(f => ({...f, client_name: e.target.value}))} placeholder="ABC Interiors Ltd" />
            </div>

            <div>
              <label className="label">Job Type</label>
              <select className="input" value={form.job_type} onChange={e => setForm(f => ({...f, job_type: e.target.value}))}>
                <option value="">Select type…</option>
                {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Start Date *</label>
              <input className="input" type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} required />
            </div>

            <div>
              <label className="label">End Date *</label>
              <input className="input" type="date" value={form.end_date} min={form.start_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} required />
            </div>

            <div>
              <label className="label">Location</label>
              <input className="input" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="City or full address" />
            </div>

            <div>
              <label className="label">Day Rate (£)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.rate_per_day} onChange={e => setForm(f => ({...f, rate_per_day: e.target.value}))} placeholder="280.00" />
            </div>

            <div className="sm:col-span-2">
              <label className="label flex items-center gap-1.5"><Hotel size={14} /> Hotel Info</label>
              <input className="input" value={form.hotel_info} onChange={e => setForm(f => ({...f, hotel_info: e.target.value}))} placeholder="Holiday Inn, Deansgate. Booking ref: #12345" />
            </div>

            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value as any}))}>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="label">Schedule Colour</label>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({...f, color: c}))}
                    className="w-7 h-7 rounded-full transition-transform"
                    style={{
                      backgroundColor: c,
                      outline: form.color === c ? `3px solid ${c}` : 'none',
                      outlineOffset: '2px',
                      transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea className="input resize-none" rows={3} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Any additional details…" />
            </div>
          </div>

          {/* Crew assignment */}
          {crewList.length > 0 && (
            <div>
              <label className="label">Assign Crew</label>
              <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                {crewList.map(c => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedCrew.includes(c.id)}
                      onChange={() => toggleCrew(c.id)}
                      className="rounded border-gray-300 text-[#E8820C] focus:ring-[#E8820C]"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.full_name}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {job ? 'Save Changes' : 'Create Job'}
            </button>
            <button type="button" onClick={onClose} className="btn-outline px-5">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
