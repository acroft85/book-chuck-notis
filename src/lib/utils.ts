import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const JOB_COLORS = [
  { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8', hex: '#3B82F6' },
  { bg: '#FFF7ED', border: '#F97316', text: '#C2410C', hex: '#F97316' },
  { bg: '#F5F3FF', border: '#8B5CF6', text: '#5B21B6', hex: '#8B5CF6' },
  { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', hex: '#F59E0B' },
  { bg: '#FDF2F8', border: '#EC4899', text: '#9D174D', hex: '#EC4899' },
  { bg: '#ECFEFF', border: '#06B6D4', text: '#155E75', hex: '#06B6D4' },
  { bg: '#F0FDF4', border: '#22C55E', text: '#14532D', hex: '#22C55E' },
  { bg: '#FFF1F2', border: '#F43F5E', text: '#881337', hex: '#F43F5E' },
]

export function getJobColor(jobId: string) {
  let hash = 0
  for (let i = 0; i < jobId.length; i++) {
    hash = jobId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return JOB_COLORS[Math.abs(hash) % JOB_COLORS.length]
}

export const JOB_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:     { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  confirmed:   { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Confirmed' },
  in_progress: { bg: 'bg-teal-100',   text: 'text-teal-800',   label: 'In Progress' },
  completed:   { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Completed' },
  cancelled:   { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Cancelled' },
}

export const ASSIGNMENT_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Awaiting Response' },
  accepted: { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Accepted' },
  declined: { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Declined' },
}

export const JOB_TYPES = [
  'Installation',
  'Fit-Out',
  'AV / Technical',
  'Survey',
  'Service & Maintenance',
  'Strip Out',
  'Training',
  'Other',
]

export function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

export function pluralise(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}
