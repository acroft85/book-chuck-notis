'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, CrewPreferences } from '@/lib/types'
import { Loader2, Save, User, Phone, Settings2, Plus, X } from 'lucide-react'

export default function PreferencesPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [prefs, setPrefs] = useState<CrewPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newRegion, setNewRegion] = useState('')

  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' })
  const [prefsForm, setPrefsForm] = useState({
    weekly_quota: 5,
    max_days_away: 30,
    preferred_regions: [] as string[],
    notes: '',
  })

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: prof }, { data: prefsData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('crew_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      ])
      setProfile(prof)
      setProfileForm({ full_name: prof?.full_name || '', phone: prof?.phone || '' })
      if (prefsData) {
        setPrefs(prefsData)
        setPrefsForm({
          weekly_quota: prefsData.weekly_quota,
          max_days_away: prefsData.max_days_away,
          preferred_regions: prefsData.preferred_regions || [],
          notes: prefsData.notes || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function saveAll(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      full_name: profileForm.full_name,
      phone: profileForm.phone,
    }).eq('id', user.id)

    if (prefs) {
      await supabase.from('crew_preferences').update({
        ...prefsForm,
        updated_at: new Date().toISOString(),
      }).eq('id', prefs.id)
    } else if (profile?.role === 'crew') {
      await supabase.from('crew_preferences').insert({
        user_id: user.id,
        ...prefsForm,
      })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function addRegion() {
    const r = newRegion.trim()
    if (r && !prefsForm.preferred_regions.includes(r)) {
      setPrefsForm(f => ({ ...f, preferred_regions: [...f.preferred_regions, r] }))
    }
    setNewRegion('')
  }

  function removeRegion(r: string) {
    setPrefsForm(f => ({ ...f, preferred_regions: f.preferred_regions.filter(x => x !== r) }))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 size={24} className="animate-spin text-[#E8820C]" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2B2B2B]">Profile &amp; Preferences</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your account and work preferences</p>
      </div>

      <form onSubmit={saveAll} className="space-y-5">
        {/* Profile */}
        <div className="card p-5">
          <h2 className="font-semibold text-[#2B2B2B] mb-4 flex items-center gap-2">
            <User size={17} className="text-[#E8820C]" /> Personal Info
          </h2>
          <div className="space-y-3">
            <div>
              <label className="label">Full Name</label>
              <input
                className="input"
                value={profileForm.full_name}
                onChange={e => setProfileForm(f => ({...f, full_name: e.target.value}))}
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={profile?.email || ''} disabled />
              <p className="text-xs text-gray-400 mt-1">Contact support to change email.</p>
            </div>
            <div>
              <label className="label flex items-center gap-1"><Phone size={13} /> Phone</label>
              <input
                className="input"
                type="tel"
                value={profileForm.phone}
                onChange={e => setProfileForm(f => ({...f, phone: e.target.value}))}
                placeholder="+44 7700 900000"
              />
            </div>
            <div>
              <label className="label">Role</label>
              <div className="input bg-gray-50 capitalize text-gray-500">{profile?.role}</div>
            </div>
          </div>
        </div>

        {/* Crew preferences (only for crew/admin/owner) */}
        {profile?.role !== 'client' && (
          <div className="card p-5">
            <h2 className="font-semibold text-[#2B2B2B] mb-4 flex items-center gap-2">
              <Settings2 size={17} className="text-[#E8820C]" /> Work Preferences
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Weekly Job Quota</label>
                  <p className="text-xs text-gray-400 mb-1.5">Max jobs per week</p>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="30"
                    value={prefsForm.weekly_quota}
                    onChange={e => setPrefsForm(f => ({...f, weekly_quota: parseInt(e.target.value) || 0}))}
                  />
                </div>
                <div>
                  <label className="label">Days Away Limit</label>
                  <p className="text-xs text-gray-400 mb-1.5">Max days away per month</p>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="31"
                    value={prefsForm.max_days_away}
                    onChange={e => setPrefsForm(f => ({...f, max_days_away: parseInt(e.target.value) || 0}))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Preferred Regions</label>
                <div className="flex gap-2 mb-2">
                  <input
                    className="input flex-1"
                    value={newRegion}
                    onChange={e => setNewRegion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRegion())}
                    placeholder="e.g. Manchester, London…"
                  />
                  <button type="button" onClick={addRegion} className="btn-outline px-3"><Plus size={16} /></button>
                </div>
                {prefsForm.preferred_regions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {prefsForm.preferred_regions.map(r => (
                      <span key={r} className="flex items-center gap-1 badge bg-[#FDF3E7] text-[#2B2B2B]">
                        {r}
                        <button type="button" onClick={() => removeRegion(r)}><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Additional Notes</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  value={prefsForm.notes}
                  onChange={e => setPrefsForm(f => ({...f, notes: e.target.value}))}
                  placeholder="Any other preferences or information for the team…"
                />
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
