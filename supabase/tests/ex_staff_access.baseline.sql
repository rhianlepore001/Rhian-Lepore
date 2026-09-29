-- Captura o acesso de cada usuário ANTES da migration (estado de prod).
BEGIN;
INSERT INTO public._baseline VALUES
  ('a0', public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000a0')),
  ('b0', public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000b0')),
  ('c0', public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000c0')),
  ('a1', public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000a1')),
  ('a2', public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000a2')),
  ('a7', public._fingerprint('authenticated', '00000000-0000-0000-0000-0000000000a7')),
  ('anon', public._fingerprint('anon', NULL)),
  ('policies', (SELECT count(*)::text FROM pg_policies WHERE schemaname = 'public'));
COMMIT;
