-- ==========================================================================
-- RLS OPERATIONAL SECURITY (PHASE 3)
-- ==========================================================================
-- This migration implements RLS for operational tables that involve
-- public interaction (bookings, queue) and private notifications.
-- Key Challenge: Balancing Public Write Access vs Private Read Access.
-- ==========================================================================

-- 1. Table: public_bookings
ALTER TABLE public.public_bookings ENABLE ROW LEVEL SECURITY;

-- Owner: Full Access
DROP POLICY IF EXISTS "Owner can manage public_bookings" ON public.public_bookings;
CREATE POLICY "Owner can manage public_bookings"
    ON public.public_bookings
    FOR ALL
    USING (auth.uid()::text = business_id)
    WITH CHECK (auth.uid()::text = business_id);

-- Public: Insert Only (Anonymous)
DROP POLICY IF EXISTS "Public can create bookings" ON public.public_bookings;
CREATE POLICY "Public can create bookings"
    ON public.public_bookings
    FOR INSERT
    WITH CHECK (true); 
    -- We allow insert, but they can't SELECT it back without proper auth/session.
    -- The frontend should rely on the returned ID from the insert or RPC response.

-- 2. Table: queue_entries
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;

-- Owner: Full Access
DROP POLICY IF EXISTS "Owner can manage queue_entries" ON public.queue_entries;
CREATE POLICY "Owner can manage queue_entries"
    ON public.queue_entries
    FOR ALL
    USING (auth.uid()::text = business_id::text)
    WITH CHECK (auth.uid()::text = business_id::text);

-- Public: Join Queue (Insert)
DROP POLICY IF EXISTS "Public can join queue" ON public.queue_entries;
CREATE POLICY "Public can join queue"
    ON public.queue_entries
    FOR INSERT
    WITH CHECK (true);

-- Public: View Active Queue (Read Only - Sanitized)
-- This allows the public board to show "Client A is waiting".
-- If strict privacy is needed, we would remove this and only use RPC.
-- For now, consistent with "Condomínio": Public areas (lobby) are visible.
DROP POLICY IF EXISTS "Public can view active queue" ON public.queue_entries;
CREATE POLICY "Public can view active queue"
    ON public.queue_entries
    FOR SELECT
    USING (status NOT IN ('completed', 'cancelled', 'no_show'));

-- 3. Table: notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- User: View Own Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 4. Table: hair_records (History)
ALTER TABLE public.hair_records ENABLE ROW LEVEL SECURITY;

-- Owner/Professional: View Records
-- Ideally, professionals should see records of clients they serve.
-- For now, strict Owner access + Professional access if they are the author?
-- Simplification: Owner sees all.
DROP POLICY IF EXISTS "Owner can manage hair_records" ON public.hair_records;
CREATE POLICY "Owner can manage hair_records"
    ON public.hair_records
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Client: View Own Records (Future Proofing)
-- If we had client auth, we would add: USING (auth.uid() = client_id)
