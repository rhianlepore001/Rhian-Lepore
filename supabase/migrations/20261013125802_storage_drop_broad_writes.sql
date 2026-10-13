-- =============================================================================
-- A-02: remove writes amplas em marketing_images + Authenticated Delete
-- Spec: docs/specs/alto-a02-marketing-delete-scope-SPEC.md
-- Rollback: docs/rollbacks/20261013125802_storage_drop_broad_writes.rollback.sql
--
-- ANTES (prod 2026-10-13):
--   Authenticated upload/update/delete marketing images → qualquer authenticated
--   "Authenticated Delete" em logos|covers|team_photos|service_images sem pasta
--     (OR amplia as policies por pasta já existentes)
--
-- AGORA:
--   DROP das 3 write policies de marketing_images (SELECT público permanece).
--   DROP "Authenticated Delete".
--   Mantém policies folder-scoped já em prod:
--     user_upload/update/delete_{logo,cover,avatar}
--     Auth Manage Own Folder Team Photos
--     Users Manage Own Service Images
--
-- Front: nenhum uso de marketing_images em components/pages/services.
-- logos/covers/team/service já usam `${user.id|companyId}/…`.
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated upload marketing images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update marketing images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete marketing images" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
