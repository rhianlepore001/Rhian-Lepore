-- ==========================================================================
-- SECURITY CLEANUP (PHASE 5)
-- ==========================================================================
-- Addressing residual findings from Security Linter.
-- 1. Apply RLS to missed table: content_calendar
-- 2. Force update search_path on persistent vulnerable functions
-- ==========================================================================

-- 1. Table: content_calendar
ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage content_calendar" ON public.content_calendar;
CREATE POLICY "Owner can manage content_calendar"
    ON public.content_calendar
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 2. Force Search Path Update (Alternative Syntax to Ensure Application)
-- Sometimes SET search_path on CREATE OR REPLACE isn't picked up by linter cache immediately,
-- or needs an explicit ALTER FUNCTION.

ALTER FUNCTION public.get_dashboard_insights(UUID, TIMESTAMP, TIMESTAMP) SET search_path = public;
ALTER FUNCTION public.create_secure_booking(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT[], NUMERIC, INTEGER, TEXT, UUID, TEXT) SET search_path = public;

-- Also checking get_queue_position and get_available_slots just in case
ALTER FUNCTION public.get_queue_position(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.get_available_slots(UUID, DATE, UUID, INTEGER) SET search_path = public;
