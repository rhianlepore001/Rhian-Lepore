-- =============================================================================
-- A-01: client_photos — isolamento por pasta do auth.uid()
-- Spec: docs/specs/alto-a01-client-photos-isolation-SPEC.md
-- Rollback: docs/rollbacks/20261013123000_client_photos_tenant_isolation.rollback.sql
--
-- ANTES (prod 2026-10-13):
--   "Authenticated users manage client_photos" ALL TO public
--     USING/CHECK (bucket_id='client_photos' AND auth.role()='authenticated')
--   -> qualquer authenticated sobrescreve/apaga fotos de outro tenant.
--   Front CRM: `${authUser.id}/${ts}.ext` (Clients.tsx)
--   Front booking público: path plano `public_${businessId}_${ts}.ext`
--     (anon já falha no INSERT; catch segue sem foto)
--
-- AGORA (menor mudança):
--   1. DROP da policy ALL ampla.
--   2. INSERT/UPDATE/DELETE autenticados só se
--      (storage.foldername(name))[1] = auth.uid()::text
--   3. Mantém SELECT público (URLs em booking/CRM).
--   4. Front publicBooking passa a `${businessId}/public_${ts}.ext`
--      (só funciona se o uploader for o dono autenticado; anon continua
--      falhando com graceful degrade — igual ao comportamento efetivo atual).
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users manage client_photos" ON storage.objects;

DROP POLICY IF EXISTS "client_photos_insert_own_folder" ON storage.objects;
CREATE POLICY "client_photos_insert_own_folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client_photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "client_photos_update_own_folder" ON storage.objects;
CREATE POLICY "client_photos_update_own_folder"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'client_photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'client_photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "client_photos_delete_own_folder" ON storage.objects;
CREATE POLICY "client_photos_delete_own_folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'client_photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read permanece (já existe "Public read access for client_photos").
