-- Harness para 20261007140000_agenda_block_scope (bloqueio de agenda com 3 opções).
-- Carregar DEPOIS da cadeia que reproduz prod (ver scripts/test-sql-agenda-block-scope.sh):
--   noshow_slots.harness → 20260925160000 → agenda_blocks.harness → #113 →
--   agenda_blocks_queue_settle.harness → #115 → agenda_blocks_followup.harness → #117.
-- O script confere que staff_can_manage_agenda_block, create/delete_agenda_block,
-- agenda_interval_blocked, os triggers de bloqueio e settle_queue_ticket têm o md5 de
-- pg_get_functiondef IGUAL ao de prod (lido em 2026-10-07).
-- Aqui só entram: a policy "Settings: owner update" de prod (business_settings) e os
-- dados do teste, incluindo linhas de business_settings ANTES da migration (backfill).
-- Postgres descartável. Não toca prod.

DROP POLICY IF EXISTS "Settings: owner update" ON public.business_settings;
CREATE POLICY "Settings: owner update" ON public.business_settings FOR UPDATE TO authenticated
  USING ((user_id = get_auth_company_id()) AND (get_auth_role() = 'owner'::text))
  WITH CHECK ((user_id = get_auth_company_id()) AND (get_auth_role() = 'owner'::text));

-- Negócio A (dono a0), staff s1 (P2), staff excluído s2 (login vivo), staff inativo s3.
-- Negócio B (dono b0, P_B). Negócio C (dono c0) com booleano desligado. Negócio E (dono e0,
-- staff e1) sem linha em business_settings.
INSERT INTO public.profiles (id, role, company_id, region) VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'owner', NULL, 'PT'),
  ('00000000-0000-0000-0000-0000000000a1', 'staff', '00000000-0000-0000-0000-0000000000a0', 'PT'),
  ('00000000-0000-0000-0000-0000000000a2', 'staff', '00000000-0000-0000-0000-0000000000a0', 'PT'),
  ('00000000-0000-0000-0000-0000000000a3', 'staff', '00000000-0000-0000-0000-0000000000a0', 'PT'),
  ('00000000-0000-0000-0000-0000000000b0', 'owner', NULL, 'PT'),
  ('00000000-0000-0000-0000-0000000000c0', 'owner', NULL, 'PT'),
  ('00000000-0000-0000-0000-0000000000c1', 'staff', '00000000-0000-0000-0000-0000000000c0', 'PT'),
  ('00000000-0000-0000-0000-0000000000e0', 'owner', NULL, 'PT'),
  ('00000000-0000-0000-0000-0000000000e1', 'staff', '00000000-0000-0000-0000-0000000000e0', 'PT');

INSERT INTO public.team_members (id, user_id, name, staff_user_id, active, deleted_at, is_owner) VALUES
  ('a0000000-0000-0000-0000-0000000000f0', '00000000-0000-0000-0000-0000000000a0', 'Dono A', NULL, true, NULL, true),
  ('a0000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a0', 'P1 sem login', NULL, true, NULL, false),
  ('a0000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a0', 'P2 staff', '00000000-0000-0000-0000-0000000000a1', true, NULL, false),
  ('a0000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000a0', 'Ex-staff', '00000000-0000-0000-0000-0000000000a2', false, now() - interval '20 days', false),
  ('a0000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000a0', 'Staff inativo', '00000000-0000-0000-0000-0000000000a3', false, NULL, false),
  ('a0000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000a0', 'P5 inativo sem login', NULL, false, NULL, false),
  ('b0000000-0000-0000-0000-0000000000f0', '00000000-0000-0000-0000-0000000000b0', 'Pro B', NULL, true, NULL, true),
  ('c0000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c0', 'Staff C', '00000000-0000-0000-0000-0000000000c1', true, NULL, false),
  ('e0000000-0000-0000-0000-0000000000f0', '00000000-0000-0000-0000-0000000000e0', 'Dono E', NULL, true, NULL, true),
  ('e0000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e0', 'Staff E', '00000000-0000-0000-0000-0000000000e1', true, NULL, false);

-- Linhas existentes antes da migration (como em prod: coluna antiga só).
INSERT INTO public.business_settings (user_id, timezone, staff_can_block_agenda) VALUES
  ('00000000-0000-0000-0000-0000000000a0', 'Europe/Lisbon', true),
  ('00000000-0000-0000-0000-0000000000b0', 'Europe/Lisbon', true),
  ('00000000-0000-0000-0000-0000000000c0', 'Europe/Lisbon', false);

-- ACL de prod em business_settings (anon/authenticated = arwdDxtm; RLS decide).
GRANT ALL ON TABLE public.business_settings TO anon, authenticated, service_role;
