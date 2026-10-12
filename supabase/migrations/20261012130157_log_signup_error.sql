-- Log de erros inesperados no cadastro (convite de colaborador e dono).
-- Data: 2026-09-25
-- NÃO APLICADA. Aplicar só após review do dono.
--
-- Contexto: quem está no cadastro é anônimo e public.log_error exige
-- authenticated (anon recebe "permission denied for function log_error"), então
-- falhas inesperadas do cadastro nunca chegavam em system_errors. Esta função:
--   * é aditiva (não altera nenhuma função/tabela existente);
--   * aceita só um objeto jsonb pequeno (payload > 4 KB é reduzido a campos-chave);
--   * tem limite global de 30 registros/minuto para não virar vetor de flood anônimo;
--   * grava sempre com error_message fixo 'signup_unexpected_error'.
-- O front chama log_signup_error e, se ela não existir (antes do deploy da
-- migration), cai para log_error (funciona quando já há sessão). Compatível
-- nos dois sentidos. Rollback: supabase/rollbacks/20260925130000_log_signup_error.rollback.sql

CREATE OR REPLACE FUNCTION public.log_signup_error(p_details jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_details jsonb;
BEGIN
  IF p_details IS NULL OR jsonb_typeof(p_details) <> 'object' THEN
    RETURN NULL;
  END IF;

  IF octet_length(p_details::text) > 4096 THEN
    v_details := jsonb_build_object(
      'truncated', true,
      'ref', left(p_details->>'ref', 16),
      'flow', left(p_details->>'flow', 32),
      'error_code', left(p_details->>'error_code', 64),
      'error_status', left(p_details->>'error_status', 8),
      'error_message', left(p_details->>'error_message', 500)
    );
  ELSE
    v_details := p_details;
  END IF;

  IF (
    SELECT count(*)
    FROM public.system_errors
    WHERE error_message = 'signup_unexpected_error'
      AND created_at > now() - interval '1 minute'
  ) >= 30 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.system_errors (error_message, severity, context, user_id)
  VALUES (
    'signup_unexpected_error',
    'error',
    v_details || jsonb_build_object('source', 'log_signup_error'),
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_signup_error(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_signup_error(jsonb) TO anon, authenticated;

COMMENT ON FUNCTION public.log_signup_error(jsonb) IS
  'Registra erro inesperado do cadastro (anon permitido, payload limitado, 30/min). Ver migration 20260925130000.';
