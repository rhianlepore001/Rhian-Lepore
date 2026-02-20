-- ==========================================================================
-- RLS FINANCIAL SECURITY (PHASE 4)
-- ==========================================================================
-- This migration implements STRICT RLS for financial data.
-- Data Leakage here is catastrophic, so rules are very tight.
-- Only Business Owner can see full financial history.
-- ==========================================================================

-- 1. Table: finance_records
ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;

-- Owner: Full Access
DROP POLICY IF EXISTS "Owner can manage finance_records" ON public.finance_records;
CREATE POLICY "Owner can manage finance_records"
    ON public.finance_records
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Professional: View OWN commissions?
-- For now, we keep it simple: Only Owner sees finance.
-- If professionals need a dashboard later, we add:
-- OR (auth.uid() = professional_id AND type = 'commission')

-- 2. Table: commission_payments
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

-- Owner: Full Access
DROP POLICY IF EXISTS "Owner can manage commission_payments" ON public.commission_payments;
CREATE POLICY "Owner can manage commission_payments"
    ON public.commission_payments
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 3. Cleanup: Check for any other tables without policies
-- (Added public_clients from Linter list)
ALTER TABLE public.public_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage public_clients" ON public.public_clients;
CREATE POLICY "Owner can manage public_clients"
    ON public.public_clients
    FOR ALL
    USING (auth.uid()::text = business_id::text)
    WITH CHECK (auth.uid()::text = business_id::text);

-- Public can Insert (Register)
DROP POLICY IF EXISTS "Public can register as client" ON public.public_clients;
CREATE POLICY "Public can register as client"
    ON public.public_clients
    FOR INSERT
    WITH CHECK (true);

-- 4. Secure Service Upsells (missed in Core)
ALTER TABLE public.service_upsells ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage service_upsells" ON public.service_upsells;
CREATE POLICY "Owner can manage service_upsells"
    ON public.service_upsells
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);
    
-- Public Read Upsells (Important for booking flow)
DROP POLICY IF EXISTS "Public can view upsells" ON public.service_upsells;
CREATE POLICY "Public can view upsells"
    ON public.service_upsells
    FOR SELECT
    USING (true);
