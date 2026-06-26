export type UserRole = 'owner' | 'admin' | 'crew' | 'client'
export type JobStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
export type AssignmentStatus = 'pending' | 'accepted' | 'declined'
export type BookingRequestStatus = 'new' | 'reviewed' | 'converted' | 'declined'
export type AvailabilityStatus = 'available' | 'unavailable' | 'away'

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  role: UserRole
  phone: string | null
  avatar_url: string | null
  created_at: string
}

export interface CrewPreferences {
  id: string
  user_id: string
  weekly_quota: number
  max_days_away: number
  preferred_regions: string[]
  notes: string | null
  updated_at: string
}

export interface CrewRate {
  id: string
  role_type: string
  day_rate: number | null
  half_day_rate: number | null
  description: string | null
  is_public: boolean
  updated_at: string
}

export interface Job {
  id: string
  title: string
  client_name: string | null
  client_id: string | null
  location: string | null
  hotel_info: string | null
  start_date: string
  end_date: string
  status: JobStatus
  job_type: string | null
  color: string | null
  rate_per_day: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface JobAssignment {
  id: string
  job_id: string
  crew_id: string
  status: AssignmentStatus
  daily_rate: number | null
  assigned_at: string
  responded_at: string | null
  job?: Job
  crew?: Profile
}

export interface Message {
  id: string
  job_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: Profile
}

export interface TrainingRecord {
  id: string
  crew_id: string
  certification_name: string
  issuing_body: string | null
  issue_date: string | null
  expiry_date: string | null
  certificate_url: string | null
  notes: string | null
  created_at: string
  crew?: Profile
}

export interface BookingRequest {
  id: string
  client_name: string
  client_email: string
  client_phone: string | null
  company: string | null
  job_description: string
  location: string | null
  start_date: string | null
  end_date: string | null
  crew_size: number
  special_requirements: string | null
  accepted_terms: boolean
  accepted_cancellation_policy: boolean
  status: BookingRequestStatus
  created_at: string
}

export interface CrewAvailability {
  id: string
  crew_id: string
  date: string
  status: AvailabilityStatus
  notes: string | null
}

export interface HMRCEstimate {
  grossIncome: number
  personalAllowance: number
  taxableIncome: number
  incomeTax: number
  nationalInsurance: number
  totalDeductions: number
  takeHome: number
  effectiveRate: number
  taxBand: string
}
