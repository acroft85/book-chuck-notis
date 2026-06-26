'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TrainingRecord, Profile } from '@/lib/types'
import { format, parseISO, differenceInDays, isPast, isFuture } from 'date-fns'
import {
  GraduationCap, Plus, Pencil, Trash2, X, Loader2,
  CheckCircle2, AlertTriangle, XCircle, ExternalLink,
} from 'lucide-react'

function getCertStatus(expiry: string | null): { label: string; color: string; icon: React.ElementType } {
  if (!expiry) return { label: 'No Expiry', color: 'text-gray-400', icon: CheckCircle2 }
  const d = parseISO(expiry)
  if (isPast(d)) return { label: 'Expired', color: 'text-red-600', icon: XCircle }
  const daysLeft = differenceInDays(d, new Date())
  if (daysLeft <= 60) return { label: `Expires in ${daysLeft}d`, color: 'text-amber-600', icon: AlertTriangle }
  return { label: `Valid until ${format(d, 'd MMM yyyy')}`, color: 'text-green-600', icon: CheckCircle2 }
}

const BLANK_FORM = {
  certification_name: '',
  issuing_body: '',
  issue_date: '',
  expiry_date: '',
  certificate_url: '',
  notes: '',
}

export default function TrainingPage() {
  const [records, setRecords] = useState<TrainingRecord[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [crewList, setCrewList] = useState<Profile[]>([])
  const [selectedCrew, setSelectedCrew] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editRecord, setEditRecord] = useState<TrainingRecord | null>(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function load(crewId?: string) {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    const isAdmin = prof?.role === 'owner' || prof?.role === 'admin'
    const targetId = crewId || (isAdmin ? selectedCrew || user.id : user.id)

    if (isAdmin && crewList.length === 0) {
      const { data: crew } = await supabase.from('profiles').select('*').eq('role', 'crew').order('full_name')
      setCrewList(crew || [])
      if (!selectedCrew) setSelectedCrew(user.id)
    }

    const { data } = await supabase
      .from('training_records')
      .select('*')
      .eq('crew_id', isAdmin ? crewId || selectedCrew || user.id : user.id)
      .order('expiry_date', { ascending: true, nullsFirst: false })

    setRecords(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [selectedCrew])

  function openEdit(r: TrainingRecord) {
    setEditRecord(r)
    setForm({
      certification_name: r.certification_name,
      issuing_body: r.issuing_body || '',
      issue_date: r.issue_date || '',
      expiry_date: r.expiry_date || '',
      certificate_url: r.certificate_url || '',
      notes: r.notes || '',
    })
    setShowForm(true)
  }

  function openNew() {
    setEditRecord(null)
    setForm(BLANK_FORM)
    setShowForm(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const isAdmin = profile?.role === 'owner' || profile?.role === 'admin'
    const targetId = isAdmin ? selectedCrew || user?.id : user?.id

    const payload = {
      ...form,
      issue_date: form.issue_date || null,
      expiry_date: form.expiry_date || null,
      certificate_url: form.certificate_url || null,
      notes: form.notes || null,
    }

    if (editRecord) {
      await supabase.from('training_records').update(payload).eq('id', editRecord.id)
    } else {
      await supabase.from('training_records').insert({ ...payload, crew_id: targetId })
    }

    setSaving(false)
    setShowForm(false)
    load()
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this record?')) return
    await supabase.from('training_records').delete().eq('id', id)
    load()
  }

  const isAdmin = profile?.role === 'owner' || profile?.role === 'admin'

  const expired = records.filter(r => r.expiry_date && isPast(parseISO(r.expiry_date)))
  const expiringSoon = records.filter(r => r.expiry_date && !isPast(parseISO(r.expiry_date)) && differenceInDays(parseISO(r.expiry_date), new Date()) <= 60)
  const valid = records.filter(r => !r.expiry_date || (isFuture(parseISO(r.expiry_date)) && differenceInDays(parseISO(r.expiry_date), new Date()) > 60))

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2B2B2B]">Training &amp; Certifications</h1>
          <p className="text-gray-500 text-sm mt-0.5">{records.length} record{records.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && crewList.length > 0 && (
            <select className="input w-auto" value={selectedCrew} onChange={e => setSelectedCrew(e.target.value)}>
              {crewList.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          )}
          <button onClick={openNew} className="btn-primary">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* Alerts */}
      {expired.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <XCircle size={16} className="text-red-500" />
          <p className="text-sm text-red-700"><strong>{expired.length}</strong> certification{expired.length !== 1 ? 's' : ''} expired</p>
        </div>
      )}
      {expiringSoon.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <p className="text-sm text-amber-700"><strong>{expiringSoon.length}</strong> expiring within 60 days</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-[#E8820C]" />
        </div>
      ) : records.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <GraduationCap size={32} className="mx-auto mb-2 opacity-30" />
          <p>No certifications on record.</p>
          <button onClick={openNew} className="btn-primary mt-4">Add First Record</button>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(r => {
            const { label, color, icon: StatusIcon } = getCertStatus(r.expiry_date)
            return (
              <div key={r.id} className="card flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-lg bg-[#FDF3E7] flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={20} className="text-[#E8820C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#2B2B2B] truncate">{r.certification_name}</p>
                  <p className="text-xs text-gray-400">
                    {r.issuing_body && `${r.issuing_body} · `}
                    {r.issue_date && `Issued ${format(parseISO(r.issue_date), 'd MMM yyyy')}`}
                  </p>
                  <div className={`flex items-center gap-1 text-xs mt-0.5 ${color}`}>
                    <StatusIcon size={12} />
                    {label}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {r.certificate_url && (
                    <a href={r.certificate_url} target="_blank" rel="noopener noreferrer" className="btn-ghost px-2 py-1.5">
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button onClick={() => openEdit(r)} className="btn-ghost px-2 py-1.5"><Pencil size={14} /></button>
                  <button onClick={() => deleteRecord(r.id)} className="btn-ghost px-2 py-1.5 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-[#2B2B2B]">{editRecord ? 'Edit' : 'Add'} Certification</h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-2"><X size={18} /></button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              <div>
                <label className="label">Certification Name *</label>
                <input className="input" value={form.certification_name} onChange={e => setForm(f => ({...f, certification_name: e.target.value}))} required placeholder="IPAF 3a & 3b" />
              </div>
              <div>
                <label className="label">Issuing Body</label>
                <input className="input" value={form.issuing_body} onChange={e => setForm(f => ({...f, issuing_body: e.target.value}))} placeholder="IPAF, CSCS, etc." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Issue Date</label>
                  <input className="input" type="date" value={form.issue_date} onChange={e => setForm(f => ({...f, issue_date: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Expiry Date</label>
                  <input className="input" type="date" value={form.expiry_date} onChange={e => setForm(f => ({...f, expiry_date: e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="label">Certificate URL</label>
                <input className="input" type="url" value={form.certificate_url} onChange={e => setForm(f => ({...f, certificate_url: e.target.value}))} placeholder="https://…" />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  Save
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline px-5">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
