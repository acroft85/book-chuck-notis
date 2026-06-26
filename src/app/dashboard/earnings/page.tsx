'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { JobAssignment, Job, Profile } from '@/lib/types'
import { calculateHMRC, formatCurrency } from '@/lib/hmrc'
import { differenceInDays, parseISO, format, getYear } from 'date-fns'
import { PoundSterling, TrendingUp, Calculator, Info, ChevronDown, Loader2 } from 'lucide-react'
import TaxEstimate from '@/components/earnings/TaxEstimate'

type EarningEntry = JobAssignment & { job: Job }

export default function EarningsPage() {
  const [entries, setEntries] = useState<EarningEntry[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCrew, setSelectedCrew] = useState<string>('')
  const [crewList, setCrewList] = useState<Profile[]>([])
  const [taxYear, setTaxYear] = useState(() => {
    const now = new Date()
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  })

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const isAdmin = prof?.role === 'owner' || prof?.role === 'admin'

      if (isAdmin) {
        const { data: crew } = await supabase.from('profiles').select('*').eq('role', 'crew').order('full_name')
        setCrewList(crew || [])
        setSelectedCrew(user.id)
      }

      const targetId = isAdmin ? user.id : user.id
      const { data } = await supabase
        .from('job_assignments')
        .select('*, job:jobs(*)')
        .eq('crew_id', isAdmin && selectedCrew ? selectedCrew : user.id)
        .eq('status', 'accepted')

      setEntries((data as EarningEntry[])?.filter(e => e.job) || [])
      setLoading(false)
    }
    load()
  }, [selectedCrew])

  // Filter by tax year (Apr 6 – Apr 5)
  const taxYearStart = new Date(taxYear, 3, 6) // Apr 6
  const taxYearEnd = new Date(taxYear + 1, 3, 5) // Apr 5 next year

  const inTaxYear = entries.filter(e => {
    const d = parseISO(e.job.start_date)
    return d >= taxYearStart && d <= taxYearEnd
  })

  function calcJobEarnings(e: EarningEntry): number {
    const days = Math.max(1, differenceInDays(parseISO(e.job.end_date), parseISO(e.job.start_date)) + 1)
    return (e.daily_rate || 0) * days
  }

  const grossIncome = inTaxYear
    .filter(e => e.job.status === 'completed')
    .reduce((sum, e) => sum + calcJobEarnings(e), 0)

  const pendingIncome = inTaxYear
    .filter(e => e.job.status !== 'completed' && e.job.status !== 'cancelled')
    .reduce((sum, e) => sum + calcJobEarnings(e), 0)

  const hmrc = calculateHMRC(grossIncome)

  const isAdmin = profile?.role === 'owner' || profile?.role === 'admin'

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2B2B2B]">Earnings</h1>
          <p className="text-gray-500 text-sm mt-0.5">UK HMRC tax estimates included</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && crewList.length > 0 && (
            <select
              className="input w-auto"
              value={selectedCrew}
              onChange={e => setSelectedCrew(e.target.value)}
            >
              {crewList.map(c => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          )}
          <select
            className="input w-auto"
            value={taxYear}
            onChange={e => setTaxYear(Number(e.target.value))}
          >
            {[2025, 2024, 2023].map(y => (
              <option key={y} value={y}>{y}/{y+1} tax year</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-[#E8820C]" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="card p-4">
              <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <PoundSterling size={12} /> Gross Income (completed)
              </div>
              <div className="text-2xl font-bold text-[#2B2B2B]">{formatCurrency(grossIncome)}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <TrendingUp size={12} /> Pending / Upcoming
              </div>
              <div className="text-2xl font-bold text-[#E8820C]">{formatCurrency(pendingIncome)}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Calculator size={12} /> Est. Take-Home
              </div>
              <div className="text-2xl font-bold text-[#2B2B2B]">{formatCurrency(hmrc.takeHome)}</div>
            </div>
          </div>

          {/* HMRC estimate */}
          <div className="mb-6">
            <TaxEstimate estimate={hmrc} taxYear={taxYear} />
          </div>

          {/* Job breakdown */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-[#2B2B2B] text-sm">
                Job Breakdown — {taxYear}/{taxYear + 1} Tax Year
              </h2>
              <p className="text-xs text-gray-400">6 Apr {taxYear} — 5 Apr {taxYear + 1}</p>
            </div>
            {inTaxYear.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No jobs in this tax year.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {inTaxYear.map(e => {
                  const earnings = calcJobEarnings(e)
                  const days = Math.max(1, differenceInDays(parseISO(e.job.end_date), parseISO(e.job.start_date)) + 1)
                  const isCompleted = e.job.status === 'completed'
                  return (
                    <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isCompleted ? 'bg-green-400' : 'bg-yellow-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{e.job.title}</p>
                        <p className="text-xs text-gray-400">
                          {format(parseISO(e.job.start_date), 'd MMM yyyy')} · {days} day{days !== 1 ? 's' : ''} · {formatCurrency(e.daily_rate || 0)}/day
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isCompleted ? 'text-[#2B2B2B]' : 'text-yellow-600'}`}>
                          {formatCurrency(earnings)}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{e.job.status}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
