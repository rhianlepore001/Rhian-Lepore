-- Restore the client grants introduced by 20260918180000_p0_revoke_anon_definer_execute.sql.
ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rate_limits FROM service_role;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer)
  FROM service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer)
  TO anon, authenticated;
ALTER FUNCTION public.check_rate_limit(text, integer, integer) RESET search_path;

REVOKE ALL ON FUNCTION public.cleanup_rate_limits()
  FROM PUBLIC, anon, authenticated, service_role;
ALTER FUNCTION public.cleanup_rate_limits() RESET search_path;

REVOKE ALL ON FUNCTION public.check_login_rate_limit(text)
  FROM service_role;
GRANT EXECUTE ON FUNCTION public.check_login_rate_limit(text)
  TO anon, authenticated;
ALTER FUNCTION public.check_login_rate_limit(text) RESET search_path;
