BEGIN;

CREATE OR REPLACE FUNCTION public.log_error(
    p_message TEXT,
    p_stack TEXT DEFAULT NULL,
    p_component_stack TEXT DEFAULT NULL,
    p_severity VARCHAR DEFAULT 'error',
    p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO system_errors (
        error_message,
        stack_trace,
        component_stack,
        severity,
        context,
        user_id
    ) VALUES (
        p_message,
        p_stack,
        p_component_stack,
        p_severity,
        p_context,
        auth.uid()
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

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

DROP FUNCTION IF EXISTS public.sanitize_system_error_context(jsonb, boolean);

DROP POLICY IF EXISTS system_errors_server_only ON public.system_errors;

COMMIT;
