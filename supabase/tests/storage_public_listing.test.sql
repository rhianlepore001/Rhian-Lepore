BEGIN;

SET LOCAL ROLE anon;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id <> 'bug-screenshots') THEN
    RAISE EXCEPTION 'Anonymous access exposed asset metadata';
  END IF;
END;
$$;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
SET LOCAL test.company_id = '10000000-0000-4000-8000-000000000001';
SET LOCAL test.company_role = 'owner';
DO $$
BEGIN
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'product_images') <> 1
    OR EXISTS (SELECT 1 FROM storage.objects WHERE name LIKE '10000000-0000-4000-8000-000000000002/%')
    OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'bug-screenshots') THEN
    RAISE EXCEPTION 'Owner access did not respect the asset scope';
  END IF;
END;
$$;

SET LOCAL request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
SET LOCAL test.company_role = 'staff';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id IN ('product_images', 'client_photos'))
    OR (SELECT count(*) FROM storage.objects WHERE bucket_id = 'service_images') <> 1 THEN
    RAISE EXCEPTION 'Staff asset access is broader than its company service images';
  END IF;
END;
$$;

ROLLBACK;
