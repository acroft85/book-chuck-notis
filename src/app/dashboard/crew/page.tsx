'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, CrewPreferences } from '@/lib/types'
import { initials } from '@/lib/utils'
import { Users, Pencil, Loader2, X, Save } from 'lucide-react'

type CrewWithPrefs = Profile & { crew_preferences?: CrewPreferences[] }

const ROLES = ['owner', 'admin', 'crew', 'client'] as const

export default function CrewPage() {
  const [crew, setCrew] = useState<CrewWithPrefs[]>([])
  const [loading, setLoading] = useState(true)
  const [editProfile, setEditProfile] = useState<CrewWithPrefs | null>(null)
  const [editRole, setEditRole] = useState<string>('crew')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*, crew_preferences(*)')
      .order('role')
      .order('full_name')
    setCrew((data as CrewWithPrefs[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveRole() {
    if (!editProfile) return
    setSaving(true)
    await supabase.from('profiles').update({ role: editRole }).eq('id', editProfile.id)
    setSaving(false)
    setEditProfile(null)
    load()
  }

  const ROLE_COLORS: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    crew: 'bg-[#FDF3E7] text-[#2B2B2B]',
    client: 'bg-gray-100 text-gray-700',
  }

  const filtered = crew.filter(c =>
    !search ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2B2B2B]">Crew &amp; Users</h1>
          <p className="text-gray-500 text-sm mt-0.5">{crew.length} total accounts</p>
        </div>
      </div>

      <div className="mb-4">
        <input
          className="input max-w-xs"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-[#E8820C]" />
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              <Users size={28} className="mx-auto mb-2 opacity-30" />
              No users found.
            </div>
          )}
          {filtered.map(member => {
            const prefs = member.crew_preferences?.[0]
            return (
              <div key={member.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-full bg-[#2B2B2B] text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {initials(member.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#2B2B2B] truncate">{member.full_name || 'No name'}</p>
                    <span className={`badge ${ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-600'}`}>
                      {member.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{member.email}</p>
                  {prefs && (
                    <p className="text-xs text-gray-400">
                      Quota: {prefs.weekly_quota}/wk · Max {prefs.max_days_away} days away/mo
                      {prefs.preferred_regions?.length > 0 && ` · ${prefs.preferred_regions.join(', ')}`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setEditProfile(member); setEditRole(member.role) }}
                  className="btn-ghost px-2.5 py-2"
                >
                  <Pencil size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit role modal */}
      {editProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="card w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#2B2B2B]">Edit Role</h2>
              <button onClick={() => setEditProfile(null)} className="btn-ghost p-2"><X size={18} /></button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#2B2B2B] text-white font-bold text-sm flex items-center justify-center">
                {initials(editProfile.full_name)}
              </div>
              <div>
                <p className="font-medium text-gray-800">{editProfile.full_name}</p>
                <p className="text-xs text-gray-400">{editProfile.email}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="label">Role</label>
              <select className="input" value={editRole} onChange={e => setEditRole(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={saveRole} disabled={saving} className="btn-primary flex-1">
                {saving && <Loader2 size={15} className="animate-spin" />}
                <Save size={15} /> Save
              </button>
              <button onClick={() => setEditProfile(null)} className="btn-outline px-4">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
