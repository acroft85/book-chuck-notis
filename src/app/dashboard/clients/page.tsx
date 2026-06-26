'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BookingRequest } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { Inbox, Calendar, MapPin, Users, Loader2, CheckCircle2, X, Eye } from 'lucide-react'

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  new:       { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'New' },
  reviewed:  { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Reviewed' },
  converted: { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Converted' },
  declined:  { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Declined' },
}

export default function ClientsPage() {
  const [requests, setRequests] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<BookingRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState(false)

  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('booking_requests')
      .select('*')
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateStatus(id: string, status: string) {
    setUpdating(true)
    await supabase.from('booking_requests').update({ status }).eq('id', id)
    setUpdating(false)
    if (selected?.id === id) setSelected(prev => prev ? {...prev, status: status as any} : null)
    load()
  }

  const filtered = requests.filter(r => statusFilter === 'all' || r.status === statusFilter)

  const newCount = requests.filter(r => r.status === 'new').length

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2B2B2B]">Booking Requests</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {newCount > 0 && <span className="text-[#E8820C] font-semibold">{newCount} new · </span>}
            {requests.length} total
          </p>
        </div>
      </div>

      <div className="mb-4">
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="converted">Converted</option>
          <option value="declined">Declined</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-[#E8820C]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Inbox size={32} className="mx-auto mb-2 opacity-30" />
          <p>No booking requests yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(req => {
            const s = STATUS_STYLES[req.status]
            return (
              <div
                key={req.id}
                className="card px-4 py-3.5 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelected(req)}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <span className="font-semibold text-[#2B2B2B]">{req.client_name}</span>
                    {req.company && <span className="text-gray-400 text-sm"> · {req.company}</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge ${s.bg} ${s.text}`}>{s.label}</span>
                    <button onClick={e => { e.stopPropagation(); setSelected(req) }} className="btn-ghost px-2 py-1.5">
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">{req.job_description}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                  {(req.start_date || req.end_date) && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {req.start_date ? format(parseISO(req.start_date), 'd MMM yyyy') : 'TBC'}
                      {req.end_date && req.end_date !== req.start_date && ` — ${format(parseISO(req.end_date), 'd MMM yyyy')}`}
                    </span>
                  )}
                  {req.location && <span className="flex items-center gap-1"><MapPin size={11} />{req.location}</span>}
                  <span className="flex items-center gap-1"><Users size={11} />{req.crew_size} crew</span>
                  <span>{format(parseISO(req.created_at), 'd MMM, HH:mm')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={() => setSelected(null)}>
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-[#2B2B2B]">{selected.client_name}</h2>
                <span className={`badge ${STATUS_STYLES[selected.status].bg} ${STATUS_STYLES[selected.status].text} mt-1`}>
                  {STATUS_STYLES[selected.status].label}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost p-2"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Email</p>
                  <a href={`mailto:${selected.client_email}`} className="text-[#E8820C] hover:underline">{selected.client_email}</a>
                </div>
                {selected.client_phone && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                    <a href={`tel:${selected.client_phone}`} className="text-[#E8820C]">{selected.client_phone}</a>
                  </div>
                )}
                {selected.company && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Company</p>
                    <p className="text-gray-800">{selected.company}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Crew Needed</p>
                  <p className="text-gray-800">{selected.crew_size} person{selected.crew_size !== 1 ? 's' : ''}</p>
                </div>
                {(selected.start_date || selected.end_date) && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Dates</p>
                    <p className="text-gray-800">
                      {selected.start_date ? format(parseISO(selected.start_date), 'd MMM yyyy') : 'TBC'}
                      {selected.end_date && selected.end_date !== selected.start_date ? ` — ${format(parseISO(selected.end_date), 'd MMM yyyy')}` : ''}
                    </p>
                  </div>
                )}
                {selected.location && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-0.5">Location</p>
                    <p className="text-gray-800">{selected.location}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Job Description</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{selected.job_description}</p>
              </div>

              {selected.special_requirements && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Special Requirements</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selected.special_requirements}</p>
                </div>
              )}

              <div className="text-xs text-gray-400">
                Submitted {format(parseISO(selected.created_at), 'd MMM yyyy, HH:mm')}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-100">
                {selected.status !== 'reviewed' && (
                  <button disabled={updating} onClick={() => updateStatus(selected.id, 'reviewed')} className="btn-outline text-sm">
                    Mark Reviewed
                  </button>
                )}
                {selected.status !== 'converted' && (
                  <button disabled={updating} onClick={() => updateStatus(selected.id, 'converted')} className="btn-primary text-sm">
                    <CheckCircle2 size={14} /> Converted to Job
                  </button>
                )}
                {selected.status !== 'declined' && (
                  <button disabled={updating} onClick={() => updateStatus(selected.id, 'declined')} className="btn-danger text-sm">
                    <X size={14} /> Decline
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
