import { createClient } from '@/lib/supabase/server'
import BookingSection from '@/components/booking/BookingSection'
import type { CrewRate } from '@/lib/types'
import { CheckCircle2, Clock, Users, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default async function PublicPage() {
  const supabase = createClient()
  const { data: rates } = await supabase
    .from('crew_rates')
    .select('*')
    .eq('is_public', true)
    .order('day_rate', { ascending: false })

  const { data: crewProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'crew')

  const crewCount = crewProfiles?.length ?? 0

  // Confirmed job periods for availability calendar (date ranges only — no client details)
  const today = new Date().toISOString().split('T')[0]
  const threeMonthsOut = new Date()
  threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3)
  const { data: confirmedJobs } = await supabase
    .from('jobs')
    .select('start_date, end_date, job_assignments(count)')
    .in('status', ['confirmed', 'in_progress'])
    .gte('end_date', today)
    .lte('start_date', threeMonthsOut.toISOString().split('T')[0])

  const busyPeriods = (confirmedJobs || []).map((j: any) => ({
    start_date: j.start_date as string,
    end_date:   j.end_date as string,
    assigned_count: (j.job_assignments as { count: number }[])?.[0]?.count ?? 0,
  }))

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#2B2B2B] border-b border-[#3D3D3D]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <img src="/logo-white.svg" alt="Book Chuck Notis" className="h-[120px] w-auto" />
          <Link href="/auth/login" className="text-sm text-white/80 hover:text-white transition-colors">
            Crew / Admin Login
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#2B2B2B] via-[#3D3D3D] to-[#E8820C] text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-[#E8820C] animate-pulse" />
              {crewCount > 0 ? `${crewCount} crew members available` : 'Professional installation crews'}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Installation Crews.<br />
              <span className="text-[#FFB347]">Booked. Sorted.</span>
            </h1>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Reliable, skilled installation teams for fit-outs, AV systems, and specialist projects
              across the UK. Check availability and request a booking in minutes.
            </p>
            <a href="#book" className="btn-primary text-base px-6 py-3 shadow-lg">
              Request a Booking
            </a>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: CheckCircle2, label: 'Fully vetted crew' },
              { icon: Clock,        label: 'Fast turnaround' },
              { icon: Users,        label: 'Teams of 1–10+' },
              { icon: ShieldCheck,  label: 'Insured & certified' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-gray-600">
                <Icon size={18} className="text-[#E8820C] flex-shrink-0" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rates */}
      {rates && rates.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-bold text-[#2B2B2B] mb-2">Day Rates</h2>
          <p className="text-gray-500 mb-8">All rates exclude VAT. Half-day rates available for &lt;4 hrs.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(rates as CrewRate[]).map(rate => (
              <div key={rate.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="text-xs font-semibold text-[#E8820C] uppercase tracking-wider mb-1">
                  {rate.role_type}
                </div>
                <div className="text-3xl font-bold text-[#2B2B2B] mb-0.5">
                  £{rate.day_rate?.toFixed(0)}
                  <span className="text-base font-normal text-gray-400">/day</span>
                </div>
                {rate.half_day_rate && (
                  <div className="text-sm text-gray-500 mb-3">
                    £{rate.half_day_rate.toFixed(0)} half-day
                  </div>
                )}
                {rate.description && (
                  <p className="text-xs text-gray-500 leading-relaxed">{rate.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Availability calendar + booking form */}
      <section id="book" className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-14">
          <BookingSection busyPeriods={busyPeriods} totalCrew={crewCount} />
        </div>
      </section>

      {/* Cancellation policy */}
      <section className="max-w-3xl mx-auto px-4 py-10">
        <div className="card p-6">
          <h3 className="font-semibold text-[#2B2B2B] mb-3 flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#E8820C]" />
            Cancellation Policy
          </h3>
          <div className="space-y-2 text-sm text-gray-600 leading-relaxed">
            <p><strong>7+ days notice:</strong> Full refund, no charge.</p>
            <p><strong>3–6 days notice:</strong> 50% of the agreed day rate will be charged per crew member.</p>
            <p><strong>Under 48 hours notice:</strong> 100% of the agreed day rate is charged per crew member.</p>
            <p><strong>No-show / on-site cancellation:</strong> Full day rate charged plus any expenses incurred (travel, hotel).</p>
            <p className="text-gray-400 text-xs mt-3">
              All bookings are subject to our standard terms and conditions. Rates quoted exclude VAT.
              Expenses (travel, accommodation) are charged at cost.
            </p>
          </div>
        </div>

        <div className="card p-6 mt-4">
          <h3 className="font-semibold text-[#2B2B2B] mb-3">Terms &amp; Conditions</h3>
          <div className="text-sm text-gray-600 space-y-2 leading-relaxed">
            <p>Book Chuck Notis acts as an agency placing freelance installation crew. All crew are self-employed and hold their own liability insurance.</p>
            <p>Clients are responsible for providing a safe working environment, adequate access, and all necessary documentation prior to the start date.</p>
            <p>Any additional hours beyond the agreed scope will be charged at the applicable hourly rate (day rate ÷ 8).</p>
            <p>Payment terms: 30 days from invoice date unless otherwise agreed.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2B2B2B] text-white/70 text-sm">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-semibold text-white">Book Chuck Notis</span>
          <span>© {new Date().getFullYear()} · All rights reserved</span>
        </div>
      </footer>
    </div>
  )
}
