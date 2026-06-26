'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

const BLANK = {
  client_name: '',
  client_email: '',
  client_phone: '',
  company: '',
  job_description: '',
  location: '',
  start_date: '',
  end_date: '',
  crew_size: '1',
  special_requirements: '',
  accepted_terms: false,
  accepted_cancellation_policy: false,
}

export default function BookingForm() {
  const [form, setForm] = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.accepted_terms || !form.accepted_cancellation_policy) {
      setError('Please accept both the Terms & Conditions and the Cancellation Policy to proceed.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('booking_requests').insert({
      client_name: form.client_name,
      client_email: form.client_email,
      client_phone: form.client_phone || null,
      company: form.company || null,
      job_description: form.job_description,
      location: form.location || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      crew_size: parseInt(form.crew_size) || 1,
      special_requirements: form.special_requirements || null,
      accepted_terms: true,
      accepted_cancellation_policy: true,
    })

    if (error) {
      setError(error.message)
      setSubmitting(false)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="card p-10 text-center">
        <CheckCircle2 size={48} className="text-[#E8820C] mx-auto mb-4" />
        <h3 className="text-xl font-bold text-[#2B2B2B] mb-2">Request Received!</h3>
        <p className="text-gray-500 mb-6 leading-relaxed">
          Thanks for getting in touch. We&apos;ll review your request and get back to you
          within one working day.
        </p>
        <button
          onClick={() => { setForm(BLANK); setSubmitted(false) }}
          className="btn-outline"
        >
          Submit Another Request
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      {/* Contact */}
      <div>
        <h3 className="font-semibold text-[#2B2B2B] text-sm mb-3 pb-2 border-b border-gray-100">
          Contact Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input
                className="input"
                value={form.client_name}
                onChange={e => setForm(f => ({...f, client_name: e.target.value}))}
                required
                placeholder="Jane Smith"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="label">Company</label>
              <input
                className="input"
                value={form.company}
                onChange={e => setForm(f => ({...f, company: e.target.value}))}
                placeholder="ABC Interiors Ltd"
                autoComplete="organization"
              />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              className="input"
              type="email"
              value={form.client_email}
              onChange={e => setForm(f => ({...f, client_email: e.target.value}))}
              required
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              type="tel"
              value={form.client_phone}
              onChange={e => setForm(f => ({...f, client_phone: e.target.value}))}
              placeholder="+44 7700 900000"
              autoComplete="tel"
            />
          </div>
        </div>
      </div>

      {/* Job details */}
      <div>
        <h3 className="font-semibold text-[#2B2B2B] text-sm mb-3 pb-2 border-b border-gray-100">
          Job Details
        </h3>
        <div className="space-y-4">
          <div>
            <label className="label">Job Description *</label>
            <textarea
              className="input resize-none"
              rows={4}
              value={form.job_description}
              onChange={e => setForm(f => ({...f, job_description: e.target.value}))}
              required
              placeholder="Describe the work required — scope, materials, specifications, access requirements…"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Location</label>
              <input
                className="input"
                value={form.location}
                onChange={e => setForm(f => ({...f, location: e.target.value}))}
                placeholder="City or postcode"
              />
            </div>
            <div>
              <label className="label">Crew Size Needed</label>
              <input
                className="input"
                type="number"
                min="1"
                max="50"
                value={form.crew_size}
                onChange={e => setForm(f => ({...f, crew_size: e.target.value}))}
              />
            </div>
            <div>
              <label className="label">Start Date</label>
              <input
                className="input"
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({...f, start_date: e.target.value}))}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                className="input"
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({...f, end_date: e.target.value}))}
                min={form.start_date || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <div>
            <label className="label">Special Requirements</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.special_requirements}
              onChange={e => setForm(f => ({...f, special_requirements: e.target.value}))}
              placeholder="Qualifications required, site induction details, specific certifications needed…"
            />
          </div>
        </div>
      </div>

      {/* Acceptance */}
      <div className="space-y-3 pt-1">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={form.accepted_terms}
            onChange={e => setForm(f => ({...f, accepted_terms: e.target.checked}))}
            className="mt-0.5 rounded border-gray-300 text-[#E8820C] focus:ring-[#E8820C]"
          />
          <span className="text-sm text-gray-600 leading-relaxed">
            I have read and agree to the{' '}
            <a href="#book" className="text-[#E8820C] hover:underline font-medium">
              Terms &amp; Conditions
            </a>
            . *
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={form.accepted_cancellation_policy}
            onChange={e => setForm(f => ({...f, accepted_cancellation_policy: e.target.checked}))}
            className="mt-0.5 rounded border-gray-300 text-[#E8820C] focus:ring-[#E8820C]"
          />
          <span className="text-sm text-gray-600 leading-relaxed">
            I have read and agree to the{' '}
            <a href="#book" className="text-[#E8820C] hover:underline font-medium">
              Cancellation Policy
            </a>
            . *
          </span>
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !form.accepted_terms || !form.accepted_cancellation_policy}
        className="btn-primary w-full text-base py-3"
      >
        {submitting && <Loader2 size={18} className="animate-spin" />}
        Submit Booking Request
      </button>

      <p className="text-xs text-gray-400 text-center">
        We&apos;ll respond within one working day. No payment taken at this stage.
      </p>
    </form>
  )
}
