-- Origem do cadastro (primeiro contato). SOMENTE ADITIVA: cria 1 tabela + 1 função. Não altera nada existente.
-- Rollback: docs/rollbacks/20261031120000_signup_attribution.rollback.sql
-- Leitura: apenas service_role (painel/SQL do dono da plataforma). Clientes (anon/authenticated) não leem nem escrevem
-- na tabela; só gravam a PRÓPRIA origem, uma vez, pela função save_signup_attribution.
-- Apagar o usuário apaga a origem (ON DELETE CASCADE) — atende pedido de exclusão (LGPD).
CREATE TABLE IF NOT EXISTS public.signup_attribution (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    text,
  utm_source    text CHECK (char_length(utm_source)   <= 100),
  utm_medium    text CHECK (char_length(utm_medium)   <= 100),
  utm_campaign  text CHECK (char_length(utm_campaign) <= 100),
  utm_content   text CHECK (char_length(utm_content)  <= 100),
  utm_term      text CHECK (char_length(utm_term)     <= 100),
  fbclid        text CHECK (char_length(fbclid)       <= 256),
  referrer      text CHECK (char_length(referrer)     <= 200),
  landing_path  text CHECK (char_length(landing_path) <= 100),
  user_agent    text CHECK (char_length(user_agent)   <= 300),
  first_seen_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_attribution ENABLE ROW LEVEL SECURITY;
-- Sem nenhuma policy: RLS fechada. service_role ignora RLS (BYPASSRLS).
REVOKE ALL ON public.signup_attribution FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signup_attribution TO service_role;

COMMENT ON TABLE public.signup_attribution IS 'Origem do cadastro de donos (UTMs, site de origem, página de entrada). RLS fechada: só service_role lê.';

CREATE OR REPLACE FUNCTION public.save_signup_attribution(
  p_utm_source text DEFAULT NULL,
  p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_utm_content text DEFAULT NULL,
  p_utm_term text DEFAULT NULL,
  p_fbclid text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_landing_path text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_first_seen_at timestamptz DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_company text;
  v_rows int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 'no_session';
  END IF;

  -- Só donos (perfil criado pelo cadastro). Equipe/convidados e contas sem perfil não gravam origem.
  SELECT company_id INTO v_company FROM public.profiles WHERE id = v_uid::text AND role = 'owner';
  IF NOT FOUND THEN
    RETURN 'no_owner_profile';
  END IF;

  INSERT INTO public.signup_attribution
    (user_id, company_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
     fbclid, referrer, landing_path, user_agent, first_seen_at)
  VALUES
    (v_uid, v_company, left(p_utm_source, 100), left(p_utm_medium, 100), left(p_utm_campaign, 100),
     left(p_utm_content, 100), left(p_utm_term, 100), left(p_fbclid, 256), left(p_referrer, 200),
     left(p_landing_path, 100), left(p_user_agent, 300),
     CASE WHEN p_first_seen_at BETWEEN now() - interval '90 days' AND now() + interval '1 day' THEN p_first_seen_at END)
  ON CONFLICT (user_id) DO NOTHING; -- primeira origem vale; nunca sobrescreve

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN CASE WHEN v_rows = 1 THEN 'saved' ELSE 'exists' END;
END
$$;

REVOKE ALL ON FUNCTION public.save_signup_attribution(text, text, text, text, text, text, text, text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_signup_attribution(text, text, text, text, text, text, text, text, text, timestamptz) TO authenticated, service_role;
