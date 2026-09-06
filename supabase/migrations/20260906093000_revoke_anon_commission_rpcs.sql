-- Hardening: RPCs de comissão/conclusão só para authenticated (não anon).
REVOKE ALL ON FUNCTION public.complete_appointment(UUID, TEXT, UUID, UUID, DECIMAL, DECIMAL, DECIMAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_appointment(UUID, TEXT, UUID, UUID, DECIMAL, DECIMAL, DECIMAL) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_appointment(UUID, TEXT, UUID, UUID, DECIMAL, DECIMAL, DECIMAL) TO authenticated;

REVOKE ALL ON FUNCTION public.recalculate_pending_commissions(UUID, DECIMAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_pending_commissions(UUID, DECIMAL) FROM anon;
GRANT EXECUTE ON FUNCTION public.recalculate_pending_commissions(UUID, DECIMAL) TO authenticated;
