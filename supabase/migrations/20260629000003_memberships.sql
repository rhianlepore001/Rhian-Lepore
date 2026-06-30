-- Clube de Assinatura MVP1: planos + assinaturas + pagamentos + config Pix

-- 1. Tabela de planos
CREATE TABLE IF NOT EXISTS public.membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    service_ids UUID[] NOT NULL DEFAULT '{}',
    usage_limit_per_month INTEGER,
    badge_color TEXT NOT NULL DEFAULT 'gold' CHECK (badge_color IN ('gold', 'silver', 'bronze')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_plans_user_id ON public.membership_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON public.membership_plans(user_id, active);

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_plans_tenant_isolation" ON public.membership_plans;
CREATE POLICY "membership_plans_tenant_isolation" ON public.membership_plans
    FOR ALL
    USING (user_id = public.get_auth_company_id())
    WITH CHECK (user_id = public.get_auth_company_id());

-- 2. Tabela de assinaturas de clientes
CREATE TABLE IF NOT EXISTS public.client_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    client_id UUID NOT NULL,
    plan_id UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'overdue', 'cancelled')),
    payment_method TEXT CHECK (payment_method IN ('pix', 'cash', 'card', 'in_person')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    next_billing_at TIMESTAMPTZ,
    last_paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_memberships_user_id ON public.client_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_client_memberships_client ON public.client_memberships(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_client_memberships_status ON public.client_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_client_memberships_billing ON public.client_memberships(user_id, next_billing_at);

ALTER TABLE public.client_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_memberships_tenant_isolation" ON public.client_memberships;
CREATE POLICY "client_memberships_tenant_isolation" ON public.client_memberships
    FOR ALL
    USING (user_id = public.get_auth_company_id())
    WITH CHECK (user_id = public.get_auth_company_id());

-- 3. Tabela de histórico de pagamentos
CREATE TABLE IF NOT EXISTS public.membership_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    membership_id UUID NOT NULL REFERENCES public.client_memberships(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    method TEXT NOT NULL CHECK (method IN ('pix', 'cash', 'card')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    paid_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_payments_membership ON public.membership_payments(user_id, membership_id);
CREATE INDEX IF NOT EXISTS idx_membership_payments_status ON public.membership_payments(user_id, status);

ALTER TABLE public.membership_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_payments_tenant_isolation" ON public.membership_payments;
CREATE POLICY "membership_payments_tenant_isolation" ON public.membership_payments
    FOR ALL
    USING (user_id = public.get_auth_company_id())
    WITH CHECK (user_id = public.get_auth_company_id());

-- 4. Constraint: cliente não pode ter 2 memberships ativas
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_membership_per_client
    ON public.client_memberships(user_id, client_id)
    WHERE status IN ('pending', 'active');

-- 5. Campos Pix em business_settings
ALTER TABLE public.business_settings
    ADD COLUMN IF NOT EXISTS pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'phone', 'email', 'random')),
    ADD COLUMN IF NOT EXISTS pix_key_value TEXT,
    ADD COLUMN IF NOT EXISTS pix_holder_name TEXT,
    ADD COLUMN IF NOT EXISTS pix_merchant_city TEXT DEFAULT 'SAO PAULO';
