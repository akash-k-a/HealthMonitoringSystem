-- ====================================================================
-- Elderly Care Platform — Supabase PostgreSQL Migration 2
-- Full Platform Phased Roadmap: Phases 2, 3, 4, 5 Expansion
-- ====================================================================

-- 1. Daily Health Check-ins (Phase 2)
CREATE TABLE IF NOT EXISTS public.daily_health_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    mood TEXT NOT NULL CHECK (mood IN ('great', 'good', 'okay', 'low', 'unwell')),
    pain_level INTEGER NOT NULL CHECK (pain_level >= 0 AND pain_level <= 10),
    energy_level TEXT NOT NULL CHECK (energy_level IN ('high', 'normal', 'tired', 'exhausted')),
    sleep_quality TEXT NOT NULL CHECK (sleep_quality IN ('well_rested', 'interrupted', 'poor')),
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT unique_checkin_per_day UNIQUE (elderly_profile_id, checkin_date)
);

-- 2. Medication Inventory & Refill Tracking (Phase 2)
CREATE TABLE IF NOT EXISTS public.medication_inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID NOT NULL UNIQUE REFERENCES public.medications(id) ON DELETE CASCADE,
    current_stock INTEGER NOT NULL DEFAULT 30 CHECK (current_stock >= 0),
    unit TEXT NOT NULL DEFAULT 'tablets',
    low_stock_threshold INTEGER NOT NULL DEFAULT 7,
    reorder_quantity INTEGER NOT NULL DEFAULT 30,
    last_refilled_date DATE,
    pharmacy_name TEXT,
    pharmacy_phone TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Caregiver Shift Handoff Summaries (Phase 3)
CREATE TABLE IF NOT EXISTS public.shift_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
    outgoing_caregiver_id UUID NOT NULL REFERENCES public.user_profiles(id),
    outgoing_caregiver_name TEXT NOT NULL,
    incoming_caregiver_name TEXT,
    shift_start TIMESTAMPTZ NOT NULL,
    shift_end TIMESTAMPTZ NOT NULL,
    doses_administered_count INTEGER NOT NULL DEFAULT 0,
    pending_doses_count INTEGER NOT NULL DEFAULT 0,
    missed_doses_count INTEGER NOT NULL DEFAULT 0,
    observations_summary TEXT NOT NULL,
    concerns_or_alerts TEXT,
    refills_needed TEXT[] DEFAULT '{}',
    next_shift_actions TEXT[] DEFAULT '{}',
    is_acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. Medication Risk Flags & Verified Safety (Phase 4)
CREATE TABLE IF NOT EXISTS public.medication_risk_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    risk_type TEXT NOT NULL CHECK (risk_type IN ('duplicate_therapy', 'food_timing_conflict', 'low_adherence_risk', 'expiring_refill')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'moderate', 'high')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 5. ABDM / Ayushman Bharat Digital Health Profile (Phase 5)
CREATE TABLE IF NOT EXISTS public.abdm_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elderly_profile_id UUID NOT NULL UNIQUE REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
    abha_number TEXT NOT NULL,
    abha_address TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('verified', 'pending')),
    linked_facilities TEXT[] DEFAULT '{}',
    linked_records_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. Connected Smart Pillbox Devices (Phase 5)
CREATE TABLE IF NOT EXISTS public.smart_pillboxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elderly_profile_id UUID NOT NULL UNIQUE REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    serial_number TEXT NOT NULL UNIQUE,
    battery_percentage INTEGER NOT NULL DEFAULT 95 CHECK (battery_percentage >= 0 AND battery_percentage <= 100),
    connection_status TEXT NOT NULL DEFAULT 'connected' CHECK (connection_status IN ('connected', 'disconnected', 'syncing')),
    last_opened_time TIMESTAMPTZ,
    compartment_count INTEGER NOT NULL DEFAULT 7,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Enable RLS
ALTER TABLE public.daily_health_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abdm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_pillboxes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Circle members view health checkins" ON public.daily_health_checkins FOR ALL TO authenticated
USING (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()))
WITH CHECK (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()));

CREATE POLICY "Circle members view & manage inventories" ON public.medication_inventories FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.medications m WHERE m.id = medication_inventories.medication_id AND public.is_circle_member_for_profile(m.elderly_profile_id, auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.medications m WHERE m.id = medication_inventories.medication_id AND public.is_circle_member_for_profile(m.elderly_profile_id, auth.uid())));

CREATE POLICY "Circle members view & manage shift handoffs" ON public.shift_handoffs FOR ALL TO authenticated
USING (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()))
WITH CHECK (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()));

CREATE POLICY "Circle members view medication risk flags" ON public.medication_risk_flags FOR SELECT TO authenticated
USING (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()));

CREATE POLICY "Circle members view ABDM profile" ON public.abdm_profiles FOR ALL TO authenticated
USING (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()))
WITH CHECK (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()));

CREATE POLICY "Circle members view smart pillbox" ON public.smart_pillboxes FOR ALL TO authenticated
USING (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()))
WITH CHECK (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()));
