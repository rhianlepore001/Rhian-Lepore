-- Keep the login limiter available while restricting arbitrary bucket access
-- and maintenance to trusted backend functions/jobs.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.rate_limits TO service_role;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer)
  TO service_role;
ALTER FUNCTION public.check_rate_limit(text, integer, integer)
  SET search_path = pg_catalog, public, pg_temp;

REVOKE ALL ON FUNCTION public.cleanup_rate_limits()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;
ALTER FUNCTION public.cleanup_rate_limits()
  SET search_path = pg_catalog, public, pg_temp;

REVOKE ALL ON FUNCTION public.check_login_rate_limit(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_login_rate_limit(text)
  TO anon, authenticated, service_role;
ALTER FUNCTION public.check_login_rate_limit(text)
  SET search_path = pg_catalog, public, pg_temp;
