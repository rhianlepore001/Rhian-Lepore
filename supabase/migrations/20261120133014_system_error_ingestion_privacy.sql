BEGIN;

DROP POLICY IF EXISTS system_errors_server_only ON public.system_errors;

CREATE POLICY system_errors_server_only
ON public.system_errors
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.sanitize_system_error_context(p_context jsonb, p_signup boolean)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  WITH fields AS (
    SELECT p_context->>'route' AS route,
           p_context->>'ref' AS ref,
           p_context->>'flow' AS flow,
           p_context->>'error_name' AS error_name,
           p_context->>'error_code' AS error_code,
           p_context->>'error_status' AS error_status
  )
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'route', CASE WHEN NOT p_signup THEN
      CASE WHEN route IN (
        '/', '/agenda', '/book', '/clientes', '/clube', '/configuracoes', '/demo', '/demo-preview',
        '/fila', '/financeiro', '/forgot-password', '/insights', '/landing', '/login',
        '/meus-insights', '/minha-area', '/onboarding', '/onboarding-wizard', '/pro',
        '/produtos', '/queue', '/queue-status', '/register', '/resultados-por-hora',
        '/staff-onboarding', '/update-password'
      ) THEN route ELSE 'other' END END,
    'ref', CASE WHEN p_signup AND ref ~ '^[A-HJ-NP-Z2-9]{6}$' THEN ref END,
    'flow', CASE WHEN p_signup AND flow IN ('staff_invite', 'owner') THEN flow END,
    'error_name', CASE WHEN error_name IN (
      'Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'AbortError',
      'AuthApiError', 'AuthRetryableFetchError', 'AuthSessionMissingError'
    ) THEN error_name END,
    'error_code', CASE WHEN error_code IN (
      'P0001', '22P02', '23502', '23503', '23505', '23514', '40001', '42501',
      '42703', '42P01', '55P03', '57014', 'XX000', 'PGRST116', 'PGRST202',
      'unexpected_failure', 'unexpected_error'
    ) THEN error_code END,
    'error_status', CASE
      WHEN jsonb_typeof(p_context->'error_status') = 'number' AND error_status ~ '^(0|[45][0-9]{2})$'
      THEN error_status::integer
    END
  ))
  FROM fields;
$$;

REVOKE ALL ON FUNCTION public.sanitize_system_error_context(jsonb, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_error(
    p_message text,
    p_stack text DEFAULT NULL,
    p_component_stack text DEFAULT NULL,
    p_severity varchar DEFAULT 'error',
    p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
  v_user_id uuid := auth.uid();
  v_signup boolean := COALESCE(
    p_message = 'signup_unexpected_error' OR starts_with(p_message, 'signup_unexpected_error '), false
  );
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('agendix:system-error:' || v_user_id::text, 0));
  IF (
    SELECT count(*)
    FROM public.system_errors
    WHERE user_id = v_user_id AND created_at > now() - interval '1 minute'
  ) >= 30 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.system_errors (error_message, severity, context, user_id)
  VALUES (
    CASE WHEN v_signup THEN 'signup_unexpected_error' ELSE 'client_error' END,
    CASE WHEN p_severity IN ('info', 'warning', 'error', 'critical') THEN p_severity ELSE 'error' END,
    public.sanitize_system_error_context(p_context, v_signup),
    v_user_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_signup_error(p_details jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_details IS NULL OR jsonb_typeof(p_details) <> 'object' THEN
    RETURN NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('agendix:signup-telemetry', 0));
  IF (
    SELECT count(*)
    FROM public.system_errors
    WHERE error_message = 'signup_unexpected_error'
      AND context->>'source' = 'log_signup_error'
      AND created_at > now() - interval '1 minute'
  ) >= 30 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.system_errors (error_message, severity, context, user_id)
  VALUES (
    'signup_unexpected_error',
    'error',
    public.sanitize_system_error_context(p_details, true) || jsonb_build_object('source', 'log_signup_error'),
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMIT;
