-- =============================================================================
-- Promoção de lançamento: os próximos 10 cadastros de dono ganham 30 dias de período de teste
-- (em vez de 20). Depois do 10º, volta automaticamente para 20 (padrão do handle_new_user).
-- Spec: docs/specs/trial30-promo-SPEC.md
-- Rollback: docs/rollbacks/20261012150000_signup_trial_promotion.rollback.sql
--
-- Aditivo: não altera handle_new_user, ensure_owner_profile, check_email_confirmed nem grants
-- de profiles. Um trigger BEFORE INSERT em profiles ajusta trial_ends_at só quando:
--   - é dono (role owner, company_id = id), em período de teste;
--   - o usuário de auth foi criado depois do início da promoção (órfãos antigos não contam);
--   - ainda não existe profile com esse id (ON CONFLICT do handle_new_user não consome vaga).
-- Concorrência: a vaga é tomada com UPDATE ... WHERE used < max_uses (trava a linha da promoção;
-- em READ COMMITTED a 2ª transação reavalia o WHERE depois do COMMIT da 1ª). Idempotente por
-- usuário (trial_promotion_grants.user_id é PK). Se o cadastro falhar, a vaga volta (mesma transação).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.trial_promotions (
  id text PRIMARY KEY,
  trial_days integer NOT NULL CHECK (trial_days BETWEEN 1 AND 365),
  max_uses integer NOT NULL CHECK (max_uses >= 0),
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trial_promotions_used_le_max CHECK (used <= max_uses)
);

CREATE TABLE IF NOT EXISTS public.trial_promotion_grants (
  user_id text PRIMARY KEY,
  promotion_id text NOT NULL REFERENCES public.trial_promotions(id),
  trial_days integer NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trial_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_promotion_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trial_promotions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.trial_promotion_grants FROM PUBLIC, anon, authenticated;

INSERT INTO public.trial_promotions (id, trial_days, max_uses, used, starts_at, active)
VALUES ('signup_30d_first10', 30, 10, 0, now(), true)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.apply_signup_trial_promotion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_created timestamptz;
  v_days integer;
  v_promo text;
BEGIN
  IF COALESCE(NEW.role, 'owner') <> 'owner'
     OR NEW.company_id IS DISTINCT FROM NEW.id
     OR COALESCE(NEW.subscription_status, 'trial') <> 'trial' THEN
    RETURN NEW;
  END IF;

  -- ON CONFLICT (id) DO UPDATE do handle_new_user dispara este BEFORE INSERT: não consome vaga.
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT g.trial_days INTO v_days FROM public.trial_promotion_grants g WHERE g.user_id = NEW.id;
  IF v_days IS NULL THEN
    SELECT u.created_at INTO v_created FROM auth.users u WHERE u.id::text = NEW.id;
    IF v_created IS NULL THEN
      RETURN NEW;
    END IF;

    UPDATE public.trial_promotions p
       SET used = p.used + 1
     WHERE p.id = 'signup_30d_first10'
       AND p.active
       AND p.used < p.max_uses
       AND v_created >= p.starts_at
    RETURNING p.trial_days, p.id INTO v_days, v_promo;

    IF v_days IS NULL THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.trial_promotion_grants (user_id, promotion_id, trial_days)
    VALUES (NEW.id, v_promo, v_days);
  END IF;

  NEW.trial_ends_at := now() + make_interval(days => v_days);
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_signup_trial_promotion() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS apply_signup_trial_promotion ON public.profiles;
CREATE TRIGGER apply_signup_trial_promotion
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.apply_signup_trial_promotion();

COMMENT ON FUNCTION public.apply_signup_trial_promotion() IS
  'Promoção signup_30d_first10: 30 dias de período de teste para os 10 primeiros donos cadastrados depois do deploy. Ver migration 20261012150000.';
