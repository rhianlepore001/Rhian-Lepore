BEGIN;

CREATE OR REPLACE FUNCTION public.get_public_professional_portfolio(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', tm.id,
    'name', tm.name,
    'role', tm.role,
    'bio', tm.bio,
    'photo_url', tm.photo_url,
    'business_name', p.business_name,
    'business_slug', p.business_slug,
    'user_type', p.user_type
  )
  FROM public.team_members tm
  JOIN public.profiles p ON p.id::text = tm.user_id::text
  WHERE tm.slug = p_slug
    AND tm.active IS TRUE
    AND tm.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.get_public_professional_portfolio(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_professional_portfolio(text) TO anon, authenticated;

COMMIT;
