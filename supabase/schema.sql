-- ==============================================================================
-- HOMESTAY MANAGER - SUPABASE POSTGRESQL COMPLETE DATABASE SCHEMA & RLS
-- ==============================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- Required for daterange exclusion constraint

-- 2. Custom Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'owner', 'manager');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('booked', 'checked_in', 'checked_out', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_source AS ENUM ('walk-in', 'phone', 'online');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'card', 'bank');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE expense_category AS ENUM ('electricity', 'cleaning', 'staff', 'maintenance', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- (Optional) If you want to reset and recreate everything completely fresh from scratch:
/*
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.guests CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.manager_homestays CASCADE;
DROP TABLE IF EXISTS public.homestays CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
*/

-- ==============================================================================
-- 3. TABLES DEFINITION
-- ==============================================================================

-- Profiles: extends auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'manager',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Homestays
CREATE TABLE IF NOT EXISTS public.homestays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rooms in Homestays
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    homestay_id UUID NOT NULL REFERENCES public.homestays(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    default_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Manager Homestay assignments (many-to-many)
-- If a manager is listed here, they are restricted to these homestays.
CREATE TABLE IF NOT EXISTS public.manager_homestays (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    homestay_id UUID NOT NULL REFERENCES public.homestays(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, homestay_id)
);

-- Guests
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    id_proof_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON public.guests(phone);

-- Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE RESTRICT,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    num_guests INTEGER NOT NULL DEFAULT 1 CHECK (num_guests > 0),
    rate_per_night NUMERIC(10,2) NOT NULL CHECK (rate_per_night >= 0),
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    status booking_status NOT NULL DEFAULT 'booked',
    source booking_source NOT NULL DEFAULT 'phone',
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_dates CHECK (check_out > check_in)
);

-- EXCLUSION CONSTRAINT to prevent double bookings
-- Notice: daterange(check_in, check_out, '[)') treats check_out day as free for next guest!
-- Ignored for cancelled bookings.
DO $$ BEGIN
    ALTER TABLE public.bookings
    ADD CONSTRAINT no_overlapping_bookings
    EXCLUDE USING gist (
        room_id WITH =,
        daterange(check_in, check_out, '[)') WITH &&
    )
    WHERE (status <> 'cancelled');
EXCEPTION
    WHEN duplicate_table THEN null;
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_room_status ON public.bookings(room_id, status);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    method payment_method NOT NULL DEFAULT 'cash',
    paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    homestay_id UUID NOT NULL REFERENCES public.homestays(id) ON DELETE CASCADE,
    category expense_category NOT NULL DEFAULT 'other',
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    spent_on DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_homestay_date ON public.expenses(homestay_id, spent_on);

-- Activity Log
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- ==============================================================================
-- 4. HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Helper: Get current user's role from profiles table (Security Definer)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_role public.user_role;
BEGIN
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid() AND active = true;
    
    RETURN v_role;
END;
$$;

-- Helper: Check if a user (or manager) has access to a specific homestay
CREATE OR REPLACE FUNCTION public.can_access_homestay(h_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_role public.user_role;
    v_assigned_count INT;
BEGIN
    v_role := public.get_my_role();
    
    -- super_admin and owner can access all homestays
    IF v_role IN ('super_admin', 'owner') THEN
        RETURN true;
    END IF;

    -- manager: check if restricted by manager_homestays
    IF v_role = 'manager' THEN
        SELECT COUNT(*) INTO v_assigned_count
        FROM public.manager_homestays
        WHERE user_id = auth.uid();

        -- If not explicitly assigned to specific homestays, can access all
        IF v_assigned_count = 0 THEN
            RETURN true;
        END IF;

        -- If assigned, check if this specific homestay is assigned
        RETURN EXISTS (
            SELECT 1 FROM public.manager_homestays
            WHERE user_id = auth.uid() AND homestay_id = h_id
        );
    END IF;

    RETURN false;
END;
$$;

-- Helper trigger for automatic profile creation when user is created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_full_name TEXT;
    v_role public.user_role;
BEGIN
    -- Safely extract full_name with fallbacks (prevents null constraint violation)
    v_full_name := COALESCE(
        NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(split_part(new.email, '@', 1)), ''),
        'User'
    );

    -- Safely determine role (never crashes on invalid enum cast)
    IF new.raw_user_meta_data->>'role' = 'super_admin' THEN
        v_role := 'super_admin'::public.user_role;
    ELSIF new.raw_user_meta_data->>'role' = 'owner' THEN
        v_role := 'owner'::public.user_role;
    ELSE
        v_role := 'manager'::public.user_role;
    END IF;

    -- Upsert into public.profiles
    INSERT INTO public.profiles (id, email, full_name, role, active)
    VALUES (
        new.id,
        new.email,
        v_full_name,
        v_role,
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Prevent rolling back auth.users creation if profile insertion encounters an unexpected issue
        RAISE WARNING 'handle_new_user trigger exception: %', SQLERRM;
        RETURN new;
END;
$$;

-- Trigger to hook into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger function for Activity Log
CREATE OR REPLACE FUNCTION public.log_activity_trigger()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_record_id TEXT;
    v_details JSONB;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_record_id := OLD.id::TEXT;
        v_details := to_jsonb(OLD);
        INSERT INTO public.activity_log(user_id, action, table_name, record_id, details)
        VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, v_record_id, v_details);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_record_id := NEW.id::TEXT;
        v_details := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
        INSERT INTO public.activity_log(user_id, action, table_name, record_id, details)
        VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, v_record_id, v_details);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        v_record_id := NEW.id::TEXT;
        v_details := to_jsonb(NEW);
        INSERT INTO public.activity_log(user_id, action, table_name, record_id, details)
        VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, v_record_id, v_details);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Attach Activity Log triggers
DROP TRIGGER IF EXISTS audit_bookings ON public.bookings;
CREATE TRIGGER audit_bookings
    AFTER INSERT OR UPDATE OR DELETE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger();

DROP TRIGGER IF EXISTS audit_payments ON public.payments;
CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger();

DROP TRIGGER IF EXISTS audit_expenses ON public.expenses;
CREATE TRIGGER audit_expenses
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger();

DROP TRIGGER IF EXISTS audit_rooms ON public.rooms;
CREATE TRIGGER audit_rooms
    AFTER INSERT OR UPDATE OR DELETE ON public.rooms
    FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger();

DROP TRIGGER IF EXISTS audit_homestays ON public.homestays;
CREATE TRIGGER audit_homestays
    AFTER INSERT OR UPDATE OR DELETE ON public.homestays
    FOR EACH ROW EXECUTE FUNCTION public.log_activity_trigger();

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homestays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_homestays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
CREATE POLICY "users_read_own_profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

DROP POLICY IF EXISTS "super_admin_manage_profiles" ON public.profiles;
CREATE POLICY "super_admin_manage_profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (public.get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "owners_read_profiles" ON public.profiles;
CREATE POLICY "owners_read_profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.get_my_role() = 'owner');

DROP POLICY IF EXISTS "managers_read_profiles" ON public.profiles;
CREATE POLICY "managers_read_profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.get_my_role() = 'manager');

DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------------------------
-- HOMESTAYS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_owner_homestays" ON public.homestays;
CREATE POLICY "admin_owner_homestays" ON public.homestays
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('super_admin', 'owner'));

DROP POLICY IF EXISTS "manager_view_homestays" ON public.homestays;
CREATE POLICY "manager_view_homestays" ON public.homestays
    FOR SELECT TO authenticated
    USING (public.get_my_role() = 'manager' AND public.can_access_homestay(id));

-- ------------------------------------------------------------------------------
-- ROOMS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_owner_rooms" ON public.rooms;
CREATE POLICY "admin_owner_rooms" ON public.rooms
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('super_admin', 'owner'));

DROP POLICY IF EXISTS "manager_view_rooms" ON public.rooms;
CREATE POLICY "manager_view_rooms" ON public.rooms
    FOR SELECT TO authenticated
    USING (public.get_my_role() = 'manager' AND public.can_access_homestay(homestay_id));

-- ------------------------------------------------------------------------------
-- MANAGER_HOMESTAYS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "super_admin_manage_assignments" ON public.manager_homestays;
CREATE POLICY "super_admin_manage_assignments" ON public.manager_homestays
    FOR ALL TO authenticated
    USING (public.get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "owner_view_assignments" ON public.manager_homestays;
CREATE POLICY "owner_view_assignments" ON public.manager_homestays
    FOR SELECT TO authenticated
    USING (public.get_my_role() = 'owner');

DROP POLICY IF EXISTS "manager_view_own_assignments" ON public.manager_homestays;
CREATE POLICY "manager_view_own_assignments" ON public.manager_homestays
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- GUESTS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_manage_guests" ON public.guests;
CREATE POLICY "authenticated_manage_guests" ON public.guests
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('super_admin', 'owner', 'manager'));

-- ------------------------------------------------------------------------------
-- BOOKINGS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_owner_bookings" ON public.bookings;
CREATE POLICY "admin_owner_bookings" ON public.bookings
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('super_admin', 'owner'));

DROP POLICY IF EXISTS "manager_select_bookings" ON public.bookings;
CREATE POLICY "manager_select_bookings" ON public.bookings
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'manager' AND
        EXISTS (
            SELECT 1 FROM public.rooms r
            WHERE r.id = bookings.room_id AND public.can_access_homestay(r.homestay_id)
        )
    );

DROP POLICY IF EXISTS "manager_insert_bookings" ON public.bookings;
CREATE POLICY "manager_insert_bookings" ON public.bookings
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_my_role() = 'manager' AND
        EXISTS (
            SELECT 1 FROM public.rooms r
            WHERE r.id = room_id AND public.can_access_homestay(r.homestay_id)
        )
    );

DROP POLICY IF EXISTS "manager_update_bookings" ON public.bookings;
CREATE POLICY "manager_update_bookings" ON public.bookings
    FOR UPDATE TO authenticated
    USING (
        public.get_my_role() = 'manager' AND
        EXISTS (
            SELECT 1 FROM public.rooms r
            WHERE r.id = bookings.room_id AND public.can_access_homestay(r.homestay_id)
        )
    )
    WITH CHECK (
        public.get_my_role() = 'manager' AND
        EXISTS (
            SELECT 1 FROM public.rooms r
            WHERE r.id = room_id AND public.can_access_homestay(r.homestay_id)
        )
    );

-- ------------------------------------------------------------------------------
-- PAYMENTS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_owner_payments" ON public.payments;
CREATE POLICY "admin_owner_payments" ON public.payments
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('super_admin', 'owner'));

DROP POLICY IF EXISTS "manager_insert_payments" ON public.payments;
CREATE POLICY "manager_insert_payments" ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_my_role() = 'manager' AND
        EXISTS (
            SELECT 1 FROM public.bookings b
            JOIN public.rooms r ON r.id = b.room_id
            WHERE b.id = booking_id AND public.can_access_homestay(r.homestay_id)
        )
    );

DROP POLICY IF EXISTS "manager_select_payments" ON public.payments;
CREATE POLICY "manager_select_payments" ON public.payments
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'manager' AND
        EXISTS (
            SELECT 1 FROM public.bookings b
            JOIN public.rooms r ON r.id = b.room_id
            WHERE b.id = payments.booking_id AND public.can_access_homestay(r.homestay_id)
        )
    );

-- ------------------------------------------------------------------------------
-- EXPENSES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_owner_expenses" ON public.expenses;
CREATE POLICY "admin_owner_expenses" ON public.expenses
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('super_admin', 'owner'));

DROP POLICY IF EXISTS "manager_insert_expenses" ON public.expenses;
CREATE POLICY "manager_insert_expenses" ON public.expenses
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_my_role() = 'manager' AND
        public.can_access_homestay(homestay_id)
    );

DROP POLICY IF EXISTS "manager_select_expenses" ON public.expenses;
CREATE POLICY "manager_select_expenses" ON public.expenses
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'manager' AND
        public.can_access_homestay(homestay_id)
    );

-- ------------------------------------------------------------------------------
-- ACTIVITY LOG POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_owner_activity_log" ON public.activity_log;
CREATE POLICY "admin_owner_activity_log" ON public.activity_log
    FOR SELECT TO authenticated
    USING (public.get_my_role() IN ('super_admin', 'owner'));

DROP POLICY IF EXISTS "system_insert_activity_log" ON public.activity_log;
CREATE POLICY "system_insert_activity_log" ON public.activity_log
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. PERMISSIONS & BACKFILL EXISTING AUTH USERS
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Backfill any existing auth.users into public.profiles
INSERT INTO public.profiles (id, email, full_name, role, active)
SELECT 
    id, 
    email, 
    COALESCE(NULLIF(TRIM(raw_user_meta_data->>'full_name'), ''), NULLIF(TRIM(split_part(email, '@', 1)), ''), 'User'),
    'manager'::public.user_role,
    true
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET 
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

-- ==============================================================================
-- 7. SQL SNIPPET TO PROMOTE INITIAL USER TO SUPER_ADMIN
-- ==============================================================================
-- Instructions:
-- 1. Create your user in Supabase Dashboard -> Authentication -> Users (Add user: email + password).
-- 2. Run the snippet below replacing 'your-email@example.com' with your actual email:

/*
UPDATE public.profiles
SET role = 'super_admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
*/

-- (Optional) If you ever need to reset/empty all data and keep only profiles:
-- TRUNCATE TABLE public.payments, public.bookings, public.guests, public.expenses, public.activity_log, public.rooms, public.manager_homestays, public.homestays CASCADE;

