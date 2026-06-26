-- ============================================================
-- Book Chuck Notis — Supabase Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- Profiles (auto-created on auth.users insert via trigger)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'crew' CHECK (role IN ('owner', 'admin', 'crew', 'client')),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crew preferences
CREATE TABLE IF NOT EXISTS crew_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  weekly_quota INTEGER NOT NULL DEFAULT 5,
  max_days_away INTEGER NOT NULL DEFAULT 30,
  preferred_regions TEXT[] DEFAULT '{}',
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crew rates (publicly visible on booking page)
CREATE TABLE IF NOT EXISTS crew_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_type TEXT NOT NULL,
  day_rate NUMERIC(10,2),
  half_day_rate NUMERIC(10,2),
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  client_name TEXT,
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  location TEXT,
  hotel_info TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled')),
  job_type TEXT,
  color TEXT,
  rate_per_day NUMERIC(10,2),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Job assignments (crew → job)
CREATE TABLE IF NOT EXISTS job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  crew_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  daily_rate NUMERIC(10,2),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(job_id, crew_id)
);

-- Job channel messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Training / certifications
CREATE TABLE IF NOT EXISTS training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  certification_name TEXT NOT NULL,
  issuing_body TEXT,
  issue_date DATE,
  expiry_date DATE,
  certificate_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Public booking requests
CREATE TABLE IF NOT EXISTS booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  company TEXT,
  job_description TEXT NOT NULL,
  location TEXT,
  start_date DATE,
  end_date DATE,
  crew_size INTEGER NOT NULL DEFAULT 1,
  special_requirements TEXT,
  accepted_terms BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_cancellation_policy BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','converted','declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crew availability overrides
CREATE TABLE IF NOT EXISTS crew_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'unavailable' CHECK (status IN ('available','unavailable','away')),
  notes TEXT,
  UNIQUE(crew_id, date)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_job_assignments_crew ON job_assignments(crew_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_job ON job_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_messages_job ON messages(job_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_training_crew ON training_records(crew_id);
CREATE INDEX IF NOT EXISTS idx_jobs_dates ON jobs(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_crew_availability_date ON crew_availability(crew_id, date);

-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'crew')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_availability ENABLE ROW LEVEL SECURITY;

-- Helper: get the caller's role
CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

-- Profiles
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
  USING (get_user_role(auth.uid()) IN ('owner','admin'));

-- Crew preferences
CREATE POLICY "prefs_select_own" ON crew_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "prefs_select_admin" ON crew_preferences FOR SELECT
  USING (get_user_role(auth.uid()) IN ('owner','admin'));
CREATE POLICY "prefs_insert_own" ON crew_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prefs_update_own" ON crew_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Crew rates (public read)
CREATE POLICY "rates_public_read" ON crew_rates FOR SELECT USING (is_public = TRUE);
CREATE POLICY "rates_admin_read" ON crew_rates FOR SELECT
  USING (get_user_role(auth.uid()) IN ('owner','admin'));
CREATE POLICY "rates_admin_write" ON crew_rates FOR ALL
  USING (get_user_role(auth.uid()) IN ('owner','admin'));

-- Jobs
CREATE POLICY "jobs_admin_all" ON jobs FOR ALL
  USING (get_user_role(auth.uid()) IN ('owner','admin'));
CREATE POLICY "jobs_crew_assigned" ON jobs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM job_assignments WHERE job_id = id AND crew_id = auth.uid()
  ));
CREATE POLICY "jobs_client_own" ON jobs FOR SELECT
  USING (client_id = auth.uid());

-- Job assignments
CREATE POLICY "assignments_admin_all" ON job_assignments FOR ALL
  USING (get_user_role(auth.uid()) IN ('owner','admin'));
CREATE POLICY "assignments_crew_select" ON job_assignments FOR SELECT
  USING (crew_id = auth.uid());
CREATE POLICY "assignments_crew_respond" ON job_assignments FOR UPDATE
  USING (crew_id = auth.uid());

-- Messages (only assigned crew + admin/owner)
CREATE POLICY "messages_admin_all" ON messages FOR ALL
  USING (get_user_role(auth.uid()) IN ('owner','admin'));
CREATE POLICY "messages_assigned_select" ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM job_assignments WHERE job_id = messages.job_id AND crew_id = auth.uid()
  ));
CREATE POLICY "messages_assigned_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM job_assignments WHERE job_id = messages.job_id AND crew_id = auth.uid()
    )
  );

-- Training records
CREATE POLICY "training_admin_all" ON training_records FOR ALL
  USING (get_user_role(auth.uid()) IN ('owner','admin'));
CREATE POLICY "training_own_select" ON training_records FOR SELECT
  USING (crew_id = auth.uid());
CREATE POLICY "training_own_insert" ON training_records FOR INSERT
  WITH CHECK (crew_id = auth.uid());
CREATE POLICY "training_own_update" ON training_records FOR UPDATE
  USING (crew_id = auth.uid());

-- Booking requests (public insert, admin read)
CREATE POLICY "booking_public_insert" ON booking_requests FOR INSERT
  WITH CHECK (accepted_terms = TRUE AND accepted_cancellation_policy = TRUE);
CREATE POLICY "booking_admin_all" ON booking_requests FOR ALL
  USING (get_user_role(auth.uid()) IN ('owner','admin'));

-- Crew availability
CREATE POLICY "avail_admin_read" ON crew_availability FOR SELECT
  USING (get_user_role(auth.uid()) IN ('owner','admin'));
CREATE POLICY "avail_own" ON crew_availability FOR ALL
  USING (crew_id = auth.uid());
CREATE POLICY "avail_public_read" ON crew_availability FOR SELECT USING (true);

-- ============================================================
-- Seed: default crew rates
-- ============================================================
INSERT INTO crew_rates (role_type, day_rate, half_day_rate, description, is_public) VALUES
  ('Lead Installer', 350.00, 195.00, 'Experienced lead with full site responsibility', TRUE),
  ('Installer', 280.00, 155.00, 'Qualified installer for standard fit-outs', TRUE),
  ('Assistant', 200.00, 115.00, 'Support role, assisting lead installer', TRUE),
  ('Specialist / AV', 420.00, 235.00, 'AV systems and technical specialist', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Enable realtime for messages
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE job_assignments;
