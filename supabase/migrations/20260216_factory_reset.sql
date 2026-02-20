-- ==========================================================================
-- FACTORY RESET & SECURITY HARDENING
-- ==========================================================================
-- 1. TRUNCATE all operational data (Nuclear Option for corrupted data).
-- 2. Preserve only auth.users and profiles structure (but maybe clear profiles too?).
--    User requested: "resete todas as contas que houverm".
--    INTERPRETATION: Delete even the profiles to force fresh start, 
--    but usually we can't delete auth.users from SQL easily without admin API.
--    We will clear public.profiles which cascades to everything else.
-- 3. Enable Email Confirmation via Database Setting (if possible) or Trigger.
-- ==========================================================================

-- 1. NUCLEAR CLEANUP (Cascades to all related tables due to FKs)
-- This deletes all business data, settings, services, clients, appointments, etc.
TRUNCATE TABLE public.profiles CASCADE;

-- 2. Clean up any orphaned records in tables that might not have strict FKs (just in case)
TRUNCATE TABLE public.finance_records CASCADE;
TRUNCATE TABLE public.appointments CASCADE;
TRUNCATE TABLE public.services CASCADE;
TRUNCATE TABLE public.clients CASCADE;
TRUNCATE TABLE public.team_members CASCADE;
TRUNCATE TABLE public.business_settings CASCADE;

-- 3. SECURITY: Enforce Email Confirmation
-- We can't change Supabase Auth Config via SQL (needs Dashboard).
-- BUT we can enforce a rule: Users cannot insert into profiles unless email_confirmed_at is set.
-- OR easier: A Trigger that checks auth.users on insert? 
-- Actually, the best way to "Activate Email Confirmation" via SQL is usually not possible directly
-- as it's a project setting. 
-- However, we can create a repressive Policy that prevents unconfirmed users from doing anything.

-- Policy: "Unconfirmed users cannot do anything"
-- We apply this to profiles. If you don't have a profile, you can't use the app.
-- And you can only create a profile if your email is confirmed.

CREATE OR REPLACE FUNCTION public.check_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the user's email is confirmed in auth.users
    -- Note: This requires access to auth.users which might be restricted.
    -- If we can't read auth.users, this will fail.
    -- Security Definer functions can read it.
    
    IF (SELECT email_confirmed_at FROM auth.users WHERE id = NEW.id) IS NULL THEN
        RAISE EXCEPTION 'Email not confirmed. Please check your inbox.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profile creation
DROP TRIGGER IF EXISTS ensure_email_confirmed ON public.profiles;
CREATE TRIGGER ensure_email_confirmed
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_email_confirmed();

-- 4. Re-seed essential data if needed (None, fresh start)
