-- ==========================================================================
-- RLS CORE SECURITY (PHASE 2)
-- ==========================================================================
-- This migration implements strict Row Level Security (RLS) for the core
-- business tables. It ensures that data is completely isolated between tenants.
-- "Condomínio Fechado" Policy: Only the owner (auth.uid()) can see/edit.
-- ==========================================================================

-- 1. Table: business_settings
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage business_settings" ON public.business_settings;

CREATE POLICY "Owner can manage business_settings"
    ON public.business_settings
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 2. Table: business_galleries
ALTER TABLE public.business_galleries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage business_galleries" ON public.business_galleries;

CREATE POLICY "Owner can manage business_galleries"
    ON public.business_galleries
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- ALLOW PUBLIC READ for galleries (so customers can see photos on booking page)
DROP POLICY IF EXISTS "Public can view active gallery images" ON public.business_galleries;

CREATE POLICY "Public can view active gallery images"
    ON public.business_galleries
    FOR SELECT
    USING (is_active = true);

-- 3. Table: marketing_assets
ALTER TABLE public.marketing_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage marketing_assets" ON public.marketing_assets;

CREATE POLICY "Owner can manage marketing_assets"
    ON public.marketing_assets
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 4. Table: campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage campaigns" ON public.campaigns;

CREATE POLICY "Owner can manage campaigns"
    ON public.campaigns
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- 5. Table: team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage team_members" ON public.team_members;

CREATE POLICY "Owner can manage team_members"
    ON public.team_members
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Allow professionals to see THEMSELVES (if they log in differently later, good practice)
-- But primarily, public needs to see ACTIVE team members for booking
DROP POLICY IF EXISTS "Public can view active team members" ON public.team_members;

CREATE POLICY "Public can view active team members"
    ON public.team_members
    FOR SELECT
    USING (active = true);
