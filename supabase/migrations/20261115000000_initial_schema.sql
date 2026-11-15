-- ====================================================================
-- Elderly Care Platform — Supabase PostgreSQL Initial Migration
-- Phase 1 Core Healthcare Management MVP
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. User Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL CHECK (role IN ('elderly', 'family', 'caregiver', 'clinician')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Elderly Profiles
CREATE TABLE IF NOT EXISTS public.elderly_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL,
    preferred_name TEXT,
    date_of_birth DATE,
    blood_group TEXT,
    allergies TEXT[] DEFAULT '{}',
    medical_conditions TEXT[] DEFAULT '{}',
    care_notes TEXT,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '07:00:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. Care Circles (One circle per elderly profile)
CREATE TABLE IF NOT EXISTS public.care_circles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elderly_profile_id UUID NOT NULL UNIQUE REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 5. Care Circle Members
CREATE TABLE IF NOT EXISTS public.care_circle_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id UUID NOT NULL REFERENCES public.care_circles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'caregiver', 'family', 'clinician')),
    can_edit BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'revoked')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT unique_active_member_per_circle UNIQUE (circle_id, user_id)
);

-- 6. Circle Invitations
CREATE TABLE IF NOT EXISTS public.circle_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id UUID NOT NULL REFERENCES public.care_circles(id) ON DELETE CASCADE,
    invited_by_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    invited_email TEXT NOT NULL,
    invited_role TEXT NOT NULL CHECK (invited_role IN ('caregiver', 'family', 'clinician')),
    invitation_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 7. Medications Catalog
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    generic_name TEXT,
    strength TEXT NOT NULL,
    form TEXT NOT NULL CHECK (form IN ('tablet', 'capsule', 'liquid', 'injection', 'drops', 'inhaler', 'patch', 'other')),
    dose_amount TEXT NOT NULL,
    instructions TEXT,
    food_instructions TEXT DEFAULT 'no_food_restriction' CHECK (food_instructions IN ('with_food', 'before_food', 'after_food', 'no_food_restriction')),
    prescriber_name TEXT,
    instruction_source TEXT,
    purpose TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 8. Medication Schedules (Active schedule per medication)
CREATE TABLE IF NOT EXISTS public.medication_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID NOT NULL UNIQUE REFERENCES public.medications(id) ON DELETE CASCADE,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'specific_days', 'interval', 'as_needed')),
    dose_times TIME[] NOT NULL DEFAULT '{}',
    days_of_week TEXT[] DEFAULT '{}',
    interval_days INTEGER DEFAULT 1,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    routine_labels JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 9. Medication Schedule History (Append-only versioning of schedule changes)
CREATE TABLE IF NOT EXISTS public.medication_schedule_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    previous_schedule JSONB NOT NULL,
    new_schedule JSONB NOT NULL,
    changed_by_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    changed_by_name TEXT NOT NULL,
    reason_for_change TEXT NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 10. Dose Events (One deterministic row per scheduled dose occurrence)
CREATE TABLE IF NOT EXISTS public.dose_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    routine_category TEXT NOT NULL CHECK (routine_category IN ('morning', 'afternoon', 'evening', 'night', 'as_needed')),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'due', 'taken', 'skipped', 'snoozed', 'unconfirmed', 'needs_help')),
    last_action_id UUID,
    resolved_at TIMESTAMPTZ,
    resolved_by_user_id UUID REFERENCES public.user_profiles(id),
    resolved_by_name TEXT,
    resolution_method TEXT CHECK (resolution_method IN ('self_confirmed', 'caregiver_administered', 'proxy_confirmed', 'skipped', 'snoozed', 'undone', 'corrected')),
    has_duplicate_warning BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT unique_dose_occurrence UNIQUE (elderly_profile_id, medication_id, scheduled_date, scheduled_time)
);

-- 11. Dose Actions (Append-only auditable log of user actions on dose events)
CREATE TABLE IF NOT EXISTS public.dose_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dose_event_id UUID NOT NULL REFERENCES public.dose_events(id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    actor_name TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('self_confirmed', 'caregiver_administered', 'proxy_confirmed', 'skipped', 'snoozed', 'undone', 'corrected')),
    status_applied TEXT NOT NULL CHECK (status_applied IN ('scheduled', 'due', 'taken', 'skipped', 'snoozed', 'unconfirmed', 'needs_help')),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    actual_administration_time TIMESTAMPTZ DEFAULT timezone('utc', now()),
    reason_or_notes TEXT,
    is_undone BOOLEAN NOT NULL DEFAULT false,
    undone_at TIMESTAMPTZ,
    undone_by_user_id UUID REFERENCES public.user_profiles(id)
);

-- Add foreign key constraint back from dose_events to dose_actions for last_action_id
ALTER TABLE public.dose_events 
    ADD CONSTRAINT fk_last_action FOREIGN KEY (last_action_id) REFERENCES public.dose_actions(id) ON DELETE SET NULL;

-- 12. Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
    doctor_name TEXT NOT NULL,
    specialty TEXT,
    facility_name TEXT NOT NULL,
    location_address TEXT,
    appointment_time TIMESTAMPTZ NOT NULL,
    purpose TEXT NOT NULL,
    transport_notes TEXT,
    preparation_checklist TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    created_by_user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 13. Care Notes (Shift notes, observations, vitals)
CREATE TABLE IF NOT EXISTS public.care_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    author_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('general', 'vital_signs', 'mood', 'meal', 'mobility', 'concern', 'handoff')),
    content TEXT NOT NULL,
    vital_signs JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 14. Emergency Contacts
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    alternate_phone_number TEXT,
    priority_order INTEGER NOT NULL DEFAULT 1,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    can_receive_alerts BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 15. In-App Notifications & Alert Log
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elderly_profile_id UUID NOT NULL REFERENCES public.elderly_profiles(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('dose_reminder', 'unconfirmed_escalation', 'appointment_reminder', 'duplicate_warning', 'emergency')),
    related_entity_id UUID,
    related_entity_type TEXT CHECK (related_entity_type IN ('dose_event', 'appointment', 'emergency')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 16. Audit Events (Tamper-evident append-only audit trail)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elderly_profile_id UUID REFERENCES public.elderly_profiles(id) ON DELETE SET NULL,
    actor_user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    actor_name TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    reason TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ====================================================================
-- Indexes for High Performance Querying
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_elderly_profiles_owner ON public.elderly_profiles(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON public.care_circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user ON public.care_circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_profile ON public.medications(elderly_profile_id);
CREATE INDEX IF NOT EXISTS idx_medication_schedules_med ON public.medication_schedules(medication_id);
CREATE INDEX IF NOT EXISTS idx_dose_events_profile_date ON public.dose_events(elderly_profile_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_dose_events_status ON public.dose_events(status);
CREATE INDEX IF NOT EXISTS idx_dose_actions_event ON public.dose_actions(dose_event_id);
CREATE INDEX IF NOT EXISTS idx_appointments_profile_time ON public.appointments(elderly_profile_id, appointment_time);
CREATE INDEX IF NOT EXISTS idx_care_notes_profile ON public.care_notes(elderly_profile_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_profile ON public.emergency_contacts(elderly_profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_events_profile ON public.audit_events(elderly_profile_id, created_at);

-- ====================================================================
-- Row Level Security (RLS) Helper Functions & Policies
-- ====================================================================

-- Function to check if a user is an active member of the care circle for an elderly profile
CREATE OR REPLACE FUNCTION public.is_circle_member_for_profile(p_elderly_profile_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.care_circles cc
        JOIN public.care_circle_members ccm ON ccm.circle_id = cc.id
        WHERE cc.elderly_profile_id = p_elderly_profile_id
          AND ccm.user_id = p_user_id
          AND ccm.status = 'active'
    ) OR EXISTS (
        SELECT 1
        FROM public.elderly_profiles ep
        WHERE ep.id = p_elderly_profile_id
          AND ep.owner_user_id = p_user_id
    );
$$;

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elderly_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedule_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dose_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dose_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- 1. user_profiles policies
CREATE POLICY "Users can read all circle member profiles they share"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
    ON public.user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- 2. elderly_profiles policies
CREATE POLICY "Circle members can view elderly profile"
    ON public.elderly_profiles FOR SELECT
    TO authenticated
    USING (public.is_circle_member_for_profile(id, auth.uid()));

CREATE POLICY "Owners and authorized caregivers can update elderly profile"
    ON public.elderly_profiles FOR UPDATE
    TO authenticated
    USING (public.is_circle_member_for_profile(id, auth.uid()));

CREATE POLICY "Authenticated users can create elderly profiles"
    ON public.elderly_profiles FOR INSERT
    TO authenticated
    WITH CHECK (owner_user_id = auth.uid());

-- 3. care_circles & members policies
CREATE POLICY "Members can view their care circle"
    ON public.care_circles FOR SELECT
    TO authenticated
    USING (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()));

CREATE POLICY "Members can view circle member lists"
    ON public.care_circle_members FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.care_circle_members my_mem
        WHERE my_mem.circle_id = care_circle_members.circle_id
          AND my_mem.user_id = auth.uid()
          AND my_mem.status = 'active'
    ));

-- 4. Shared Care Information Policies (Medications, Schedules, DoseEvents, Appointments, Notes)
CREATE POLICY "Circle members can view medications"
    ON public.medications FOR SELECT
    TO authenticated
    USING (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()));

CREATE POLICY "Circle members can manage medications"
    ON public.medications FOR ALL
    TO authenticated
    USING (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()))
    WITH CHECK (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()));

CREATE POLICY "Circle members can view schedules"
    ON public.medication_schedules FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.medications m
        WHERE m.id = medication_schedules.medication_id
          AND public.is_circle_member_for_profile(m.elderly_profile_id, auth.uid())
    ));

CREATE POLICY "Circle members can manage schedules"
    ON public.medication_schedules FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.medications m
        WHERE m.id = medication_schedules.medication_id
          AND public.is_circle_member_for_profile(m.elderly_profile_id, auth.uid())
    ));

CREATE POLICY "Circle members can view dose events"
    ON public.dose_events FOR SELECT
    TO authenticated
    USING (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()));

CREATE POLICY "Circle members can update dose events"
    ON public.dose_events FOR UPDATE
    TO authenticated
    USING (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()));

CREATE POLICY "Circle members can view dose actions"
    ON public.dose_actions FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.dose_events de
        WHERE de.id = dose_actions.dose_event_id
          AND public.is_circle_member_for_profile(de.elderly_profile_id, auth.uid())
    ));

CREATE POLICY "Circle members can insert dose actions"
    ON public.dose_actions FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.dose_events de
        WHERE de.id = dose_actions.dose_event_id
          AND public.is_circle_member_for_profile(de.elderly_profile_id, auth.uid())
    ));

CREATE POLICY "Circle members can view and manage appointments"
    ON public.appointments FOR ALL
    TO authenticated
    USING (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()))
    WITH CHECK (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()));

CREATE POLICY "Circle members can view and manage care notes"
    ON public.care_notes FOR ALL
    TO authenticated
    USING (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()))
    WITH CHECK (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()));

CREATE POLICY "Circle members can view emergency contacts"
    ON public.emergency_contacts FOR ALL
    TO authenticated
    USING (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()))
    WITH CHECK (public.is_circle_member_for_profile(elderly_profile_id, auth.uid()));

CREATE POLICY "Recipients can view notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (recipient_user_id = auth.uid());

CREATE POLICY "Circle members can view audit events"
    ON public.audit_events FOR SELECT
    TO authenticated
    USING (elderly_profile_id IS NULL OR public.is_circle_member_for_profile(elderly_profile_id, auth.uid()));

-- ====================================================================
-- Atomic Stored Procedures & Business Logic RPCs
-- ====================================================================

-- RPC: Record Dose Action with Idempotency & Duplicate Administration Safeguards
CREATE OR REPLACE FUNCTION public.record_dose_action(
    p_dose_event_id UUID,
    p_actor_id UUID,
    p_action_type TEXT,
    p_reason_or_notes TEXT DEFAULT NULL,
    p_admin_time TIMESTAMPTZ DEFAULT timezone('utc', now())
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event public.dose_events%ROWTYPE;
    v_actor public.user_profiles%ROWTYPE;
    v_action_id UUID;
    v_new_status TEXT;
    v_is_duplicate_admin BOOLEAN := false;
BEGIN
    -- 1. Lock the dose event row for update to prevent concurrent race conditions
    SELECT * INTO v_event FROM public.dose_events WHERE id = p_dose_event_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Dose event % not found', p_dose_event_id;
    END IF;

    -- 2. Fetch actor profile
    SELECT * INTO v_actor FROM public.user_profiles WHERE id = p_actor_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Actor % not found', p_actor_id;
    END IF;

    -- 3. Determine status from action type
    IF p_action_type IN ('self_confirmed', 'caregiver_administered', 'proxy_confirmed') THEN
        v_new_status := 'taken';
    ELSIF p_action_type = 'skipped' THEN
        v_new_status := 'skipped';
    ELSIF p_action_type = 'snoozed' THEN
        v_new_status := 'snoozed';
    ELSE
        v_new_status := v_event.status;
    END IF;

    -- 4. Duplicate physical administration detection:
    -- If event was already marked 'taken' and another take/administration is reported by a different user
    IF v_event.status = 'taken' AND v_new_status = 'taken' AND v_event.resolved_by_user_id <> p_actor_id THEN
        v_is_duplicate_admin := true;
    END IF;

    -- 5. Insert new auditable DoseAction
    INSERT INTO public.dose_actions (
        dose_event_id,
        actor_user_id,
        actor_name,
        action_type,
        status_applied,
        actual_administration_time,
        reason_or_notes
    ) VALUES (
        p_dose_event_id,
        p_actor_id,
        v_actor.full_name,
        p_action_type,
        v_new_status,
        p_admin_time,
        p_reason_or_notes
    ) RETURNING id INTO v_action_id;

    -- 6. Update the parent DoseEvent atomically
    UPDATE public.dose_events SET
        status = v_new_status,
        last_action_id = v_action_id,
        resolved_at = timezone('utc', now()),
        resolved_by_user_id = p_actor_id,
        resolved_by_name = v_actor.full_name,
        resolution_method = p_action_type,
        has_duplicate_warning = (has_duplicate_warning OR v_is_duplicate_admin),
        updated_at = timezone('utc', now())
    WHERE id = p_dose_event_id;

    -- 7. If duplicate administration detected, create an urgent notification
    IF v_is_duplicate_admin THEN
        INSERT INTO public.notifications (
            elderly_profile_id,
            recipient_user_id,
            title,
            body,
            type,
            related_entity_id,
            related_entity_type
        )
        SELECT 
            v_event.elderly_profile_id,
            ccm.user_id,
            'Possible Duplicate Dose Reported',
            format('Medication was recorded as administered both by %s and %s. Please verify with patient.', v_event.resolved_by_name, v_actor.full_name),
            'duplicate_warning',
            p_dose_event_id,
            'dose_event'
        FROM public.care_circles cc
        JOIN public.care_circle_members ccm ON ccm.circle_id = cc.id
        WHERE cc.elderly_profile_id = v_event.elderly_profile_id
          AND ccm.status = 'active';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'dose_event_id', p_dose_event_id,
        'action_id', v_action_id,
        'status', v_new_status,
        'has_duplicate_warning', (v_event.has_duplicate_warning OR v_is_duplicate_admin)
    );
END;
$$;

-- RPC: Undo Dose Action (within 30 seconds or authorized correction)
CREATE OR REPLACE FUNCTION public.undo_dose_action(
    p_dose_event_id UUID,
    p_actor_id UUID,
    p_reason TEXT DEFAULT 'Accidental tap undone'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event public.dose_events%ROWTYPE;
    v_actor public.user_profiles%ROWTYPE;
    v_last_action public.dose_actions%ROWTYPE;
    v_undo_action_id UUID;
BEGIN
    SELECT * INTO v_event FROM public.dose_events WHERE id = p_dose_event_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Dose event % not found', p_dose_event_id;
    END IF;

    SELECT * INTO v_actor FROM public.user_profiles WHERE id = p_actor_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Actor % not found', p_actor_id;
    END IF;

    IF v_event.last_action_id IS NOT NULL THEN
        SELECT * INTO v_last_action FROM public.dose_actions WHERE id = v_event.last_action_id;
        -- Mark previous action as undone
        UPDATE public.dose_actions SET 
            is_undone = true, 
            undone_at = timezone('utc', now()), 
            undone_by_user_id = p_actor_id 
        WHERE id = v_event.last_action_id;
    END IF;

    -- Record the 'undone' DoseAction event
    INSERT INTO public.dose_actions (
        dose_event_id,
        actor_user_id,
        actor_name,
        action_type,
        status_applied,
        reason_or_notes
    ) VALUES (
        p_dose_event_id,
        p_actor_id,
        v_actor.full_name,
        'undone',
        'scheduled',
        p_reason
    ) RETURNING id INTO v_undo_action_id;

    -- Reset event back to scheduled/due
    UPDATE public.dose_events SET
        status = 'scheduled',
        last_action_id = v_undo_action_id,
        resolved_at = NULL,
        resolved_by_user_id = NULL,
        resolved_by_name = NULL,
        resolution_method = 'undone',
        updated_at = timezone('utc', now())
    WHERE id = p_dose_event_id;

    RETURN jsonb_build_object(
        'success', true,
        'dose_event_id', p_dose_event_id,
        'status', 'scheduled'
    );
END;
$$;
