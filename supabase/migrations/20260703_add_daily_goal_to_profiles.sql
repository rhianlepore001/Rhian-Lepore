-- Meta de faturamento diária (opcional). NULL = não configurada → Dashboard mostra estado vazio.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_goal numeric;

COMMENT ON COLUMN public.profiles.daily_goal IS 'Meta de faturamento diária definida manualmente pelo dono (Ajustes). NULL quando não configurada.';
