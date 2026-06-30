-- Sprint D+1: Clube de Assinatura Funcional End-to-End
-- Tabela de pagamentos Pix (status pendente/pago/expirado/cancelado)
-- Simula o webhook do Banco Central / PSP até integração real.

CREATE TABLE IF NOT EXISTS public.pix_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    membership_id UUID NOT NULL REFERENCES public.client_memberships(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    br_code TEXT NOT NULL,
    txid TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
    paid_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uniq_txid_per_tenant UNIQUE (user_id, txid)
);

CREATE INDEX IF NOT EXISTS idx_pix_payments_user_id ON public.pix_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_pix_payments_membership ON public.pix_payments(user_id, membership_id);
CREATE INDEX IF NOT EXISTS idx_pix_payments_status ON public.pix_payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pix_payments_txid ON public.pix_payments(txid);

ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pix_payments_tenant_isolation" ON public.pix_payments;
CREATE POLICY "pix_payments_tenant_isolation" ON public.pix_payments
    FOR ALL
    USING (user_id = public.get_auth_company_id())
    WITH CHECK (user_id = public.get_auth_company_id());

-- Função utilitária para gerar txid único (24 chars alfanuméricos)
CREATE OR REPLACE FUNCTION public.generate_pix_txid()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..24 LOOP
        result := result || substr(chars, 1 + (random() * 35)::INTEGER, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.pix_payments IS
    'Pagamentos Pix gerados pelo sistema. status=paid requer webhook real ou simulação manual.';
COMMENT ON COLUMN public.pix_payments.txid IS
    'ID da transação Pix (24 chars alfanuméricos, formato BACEN).';
COMMENT ON COLUMN public.pix_payments.br_code IS
    'Payload BR Code (EMV) gerado pelo pix-generator.ts para o QR Code.';
