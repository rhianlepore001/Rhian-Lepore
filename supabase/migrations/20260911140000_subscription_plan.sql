-- Plano comercial do AgendiX (Solo / Equipe), distinto do Clube dos clientes.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_plan_check
  CHECK (subscription_plan IS NULL OR subscription_plan IN ('solo', 'equipe'));

COMMENT ON COLUMN public.profiles.subscription_plan IS
  'Plano AgendiX escolhido pelo dono: solo (1 profissional) ou equipe (até 5). NULL = legado, tratado como equipe.';
