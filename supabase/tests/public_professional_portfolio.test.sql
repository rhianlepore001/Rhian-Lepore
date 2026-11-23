CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE portfolio_test_outside;
GRANT USAGE ON SCHEMA public TO anon, authenticated, portfolio_test_outside;

CREATE TABLE public.profiles (
  id text PRIMARY KEY,
  business_name text,
  business_slug text,
  user_type text,
  email text
);

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY,
  user_id text REFERENCES public.profiles(id),
  slug text UNIQUE,
  name text,
  role text,
  bio text,
  photo_url text,
  active boolean,
  deleted_at timestamptz,
  commission_rate numeric
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profiles, public.team_members TO anon, authenticated;

INSERT INTO public.profiles VALUES
  ('tenant-a', 'Salão A', 'salao-a', 'beauty', 'interno-a@example.invalid'),
  ('tenant-b', 'Barbearia B', 'barbearia-b', 'barber', 'interno-b@example.invalid');

INSERT INTO public.team_members VALUES
  ('10000000-0000-4000-8000-000000000001', 'tenant-a', 'joana', 'Joana', 'Cabeleireira', 'Especialista', NULL, true, NULL, 40),
  ('10000000-0000-4000-8000-000000000002', 'tenant-b', 'pedro', 'Pedro', 'Barbeiro', NULL, NULL, true, NULL, 50),
  ('10000000-0000-4000-8000-000000000003', 'tenant-a', 'inativa', 'Inativa', NULL, NULL, NULL, false, NULL, 30),
  ('10000000-0000-4000-8000-000000000004', 'tenant-a', 'removida', 'Removida', NULL, NULL, NULL, true, now(), 30);

\ir ../migrations/20261120131356_public_professional_portfolio.sql

SET ROLE anon;

DO $$
DECLARE
  v_portfolio jsonb := public.get_public_professional_portfolio('joana');
BEGIN
  IF v_portfolio IS DISTINCT FROM jsonb_build_object(
    'id', '10000000-0000-4000-8000-000000000001',
    'name', 'Joana',
    'role', 'Cabeleireira',
    'bio', 'Especialista',
    'photo_url', NULL,
    'business_name', 'Salão A',
    'business_slug', 'salao-a',
    'user_type', 'beauty'
  ) THEN
    RAISE EXCEPTION 'unexpected public portfolio fields: %', v_portfolio;
  END IF;

  IF public.get_public_professional_portfolio('pedro')->>'business_slug' IS DISTINCT FROM 'barbearia-b' THEN
    RAISE EXCEPTION 'portfolio must resolve its own business';
  END IF;

  IF public.get_public_professional_portfolio('não-existe') IS NOT NULL
    OR public.get_public_professional_portfolio('inativa') IS NOT NULL
    OR public.get_public_professional_portfolio('removida') IS NOT NULL THEN
    RAISE EXCEPTION 'unavailable portfolio must return null';
  END IF;

  IF EXISTS (SELECT FROM public.profiles) OR EXISTS (SELECT FROM public.team_members) THEN
    RAISE EXCEPTION 'anonymous direct reads must return no rows';
  END IF;
END;
$$;

RESET ROLE;

DO $$
BEGIN
  IF NOT has_function_privilege('authenticated', 'public.get_public_professional_portfolio(text)', 'EXECUTE')
    OR has_function_privilege('portfolio_test_outside', 'public.get_public_professional_portfolio(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'unexpected portfolio execute grants';
  END IF;
END;
$$;

\ir ../../docs/rollbacks/20261120131356_public_professional_portfolio.rollback.sql

DO $$
BEGIN
  IF to_regprocedure('public.get_public_professional_portfolio(text)') IS NOT NULL THEN
    RAISE EXCEPTION 'portfolio rollback must remove the function';
  END IF;
END;
$$;
