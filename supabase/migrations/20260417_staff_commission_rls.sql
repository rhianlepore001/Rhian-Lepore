-- ==========================================================================
-- RLS: Staff pode ver APENAS suas próprias comissões em finance_records
-- Usado pelo StaffEarningsCard no dashboard do colaborador
-- ==========================================================================

DROP POLICY IF EXISTS "Staff can view own commissions" ON public.finance_records;

CREATE POLICY "Staff can view own commissions"
    ON public.finance_records
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.id = professional_id
              AND tm.staff_user_id = auth.uid()
        )
    );
