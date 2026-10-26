\set ON_ERROR_STOP on
CREATE FUNCTION pg_temp.as_user(p_role text, p_uid text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n int; r text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', COALESCE(p_uid, ''), true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    r := 'ok:' || n;
  EXCEPTION WHEN OTHERS THEN r := SQLSTATE;
  END;
  RESET ROLE;
  RETURN r;
END;
$$;
CREATE TEMP TABLE results (name text, ok boolean NOT NULL, got text);
GRANT ALL ON results TO PUBLIC;

INSERT INTO public.whatsapp_message_templates(business_id, message_key, body)
SELECT p.id, k, 'Privado ' || k FROM public.profiles p
CROSS JOIN unnest(ARRAY['booking_accepted','booking_confirmed','wizard_confirm','reschedule','reactivation','rebooking','queue_joined','membership_contact','client_request_confirm','client_change','client_question','client_cancel','membership_overdue','membership_pending']) k
WHERE p.role = 'owner';

INSERT INTO results SELECT 'gestor lê só seu negócio', g = 'ok:14', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a0', 'SELECT * FROM public.whatsapp_message_templates') g) s;
INSERT INTO results SELECT 'gestor não lê outro negócio', g = 'ok:0', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a0', $q$SELECT * FROM public.whatsapp_message_templates WHERE business_id = '00000000-0000-0000-0000-0000000000b0'$q$) g) s;
INSERT INTO results SELECT 'gestor edita próprio negócio', g = 'ok:1', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a0', $q$UPDATE public.whatsapp_message_templates SET body = 'Olá {cliente}', updated_by = '00000000-0000-0000-0000-0000000000b0', updated_at = '2000-01-01' WHERE message_key = 'reschedule'$q$) g) s;
INSERT INTO results SELECT 'auditoria usa usuário real e data atual', updated_by::text = '00000000-0000-0000-0000-0000000000a0' AND updated_at > '2000-01-02', updated_by::text FROM public.whatsapp_message_templates WHERE business_id = '00000000-0000-0000-0000-0000000000a0' AND message_key = 'reschedule';
INSERT INTO results SELECT 'gestor não edita outro negócio', g = 'ok:0', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a0', $q$UPDATE public.whatsapp_message_templates SET enabled = false WHERE business_id = '00000000-0000-0000-0000-0000000000b0'$q$) g) s;
INSERT INTO results SELECT 'gestor não transfere mensagem para outro negócio', g = '42501', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a0', $q$UPDATE public.whatsapp_message_templates SET business_id = '00000000-0000-0000-0000-0000000000b0' WHERE message_key = 'reschedule'$q$) g) s;
INSERT INTO results SELECT 'gestor apaga própria mensagem', g = 'ok:1', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a0', $q$DELETE FROM public.whatsapp_message_templates WHERE message_key = 'rebooking'$q$) g) s;
INSERT INTO results SELECT 'sem linha é representado pela ausência', count(*) = 0, count(*)::text FROM public.whatsapp_message_templates WHERE business_id = '00000000-0000-0000-0000-0000000000a0' AND message_key = 'rebooking';
INSERT INTO results SELECT 'gestor cria mensagem e body null é válido', g = 'ok:1', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a0', $q$INSERT INTO public.whatsapp_message_templates(business_id, message_key, body) VALUES ('00000000-0000-0000-0000-0000000000a0', 'rebooking', NULL)$q$) g) s;
INSERT INTO results SELECT 'nova linha é ativa por padrão', enabled AND body IS NULL, enabled::text FROM public.whatsapp_message_templates WHERE business_id = '00000000-0000-0000-0000-0000000000a0' AND message_key = 'rebooking';
INSERT INTO results SELECT 'gestor não cria em outro negócio', g = '42501', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a0', $q$INSERT INTO public.whatsapp_message_templates(business_id, message_key) VALUES ('00000000-0000-0000-0000-0000000000b0','rebooking')$q$) g) s;
INSERT INTO results SELECT 'gestor não apaga outro negócio', g = 'ok:0', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a0', $q$DELETE FROM public.whatsapp_message_templates WHERE business_id = '00000000-0000-0000-0000-0000000000b0'$q$) g) s;
INSERT INTO results SELECT 'profissional lê só seu negócio', g = 'ok:14', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a1', 'SELECT * FROM public.whatsapp_message_templates') g) s;
INSERT INTO results SELECT 'profissional não edita', g = 'ok:0', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a1', $q$UPDATE public.whatsapp_message_templates SET body = 'Inválido'$q$) g) s;
INSERT INTO results SELECT 'profissional não cria', g = '42501', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a1', $q$INSERT INTO public.whatsapp_message_templates(business_id,message_key) VALUES ('00000000-0000-0000-0000-0000000000a0','rebooking')$q$) g) s;
INSERT INTO results SELECT 'profissional não apaga', g = 'ok:0', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a1', 'DELETE FROM public.whatsapp_message_templates') g) s;
INSERT INTO results SELECT 'sem perfil não lê', g = 'ok:0', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000ff', 'SELECT * FROM public.whatsapp_message_templates') g) s;
INSERT INTO results SELECT 'anon não lê tabela', g = '42501', g FROM (SELECT pg_temp.as_user('anon', NULL, 'SELECT * FROM public.whatsapp_message_templates') g) s;
INSERT INTO results SELECT 'corpo vazio rejeitado', g = '23514', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a0', $q$UPDATE public.whatsapp_message_templates SET body = '' WHERE message_key = 'reschedule'$q$) g) s;
INSERT INTO results SELECT 'corpo acima de 1000 rejeitado', g = '23514', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a0', $q$UPDATE public.whatsapp_message_templates SET body = repeat('x',1001) WHERE message_key = 'reschedule'$q$) g) s;
INSERT INTO results SELECT 'corpo com 1000 caracteres aceito', g = 'ok:1', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a0', $q$UPDATE public.whatsapp_message_templates SET body = repeat('x',1000) WHERE message_key = 'reschedule'$q$) g) s;
INSERT INTO results SELECT 'chave inválida rejeitada', g = '23514', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a0', $q$UPDATE public.whatsapp_message_templates SET message_key = 'invalid' WHERE message_key = 'reschedule'$q$) g) s;
INSERT INTO results SELECT 'unicidade por negócio e chave', g = '23505', g FROM (SELECT pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a0', $q$INSERT INTO public.whatsapp_message_templates(business_id,message_key) VALUES ('00000000-0000-0000-0000-0000000000a0','reschedule')$q$) g) s;

BEGIN;
SET LOCAL ROLE anon;
INSERT INTO results SELECT 'RPC só publica seis chaves permitidas', count(*) = 6 AND bool_and(message_key IN ('client_request_confirm','client_change','client_question','client_cancel','membership_overdue','membership_pending')), count(*)::text FROM public.get_public_whatsapp_templates('negocio-a');
INSERT INTO results SELECT 'RPC não vaza dados de auditoria ou tenant', bool_and((SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(to_jsonb(t)) k) = ARRAY['body','enabled','message_key']), NULL FROM public.get_public_whatsapp_templates('negocio-a') t;
INSERT INTO results SELECT 'slug inexistente não revela dados', count(*) = 0, count(*)::text FROM public.get_public_whatsapp_templates('inexistente');
INSERT INTO results SELECT 'slug não permite injeção', count(*) = 0, count(*)::text FROM public.get_public_whatsapp_templates($q$negocio-a' OR true --$q$);
COMMIT;

UPDATE public.whatsapp_message_templates SET body = 'Somente B' WHERE business_id = '00000000-0000-0000-0000-0000000000b0';
INSERT INTO results SELECT 'RPC isola pelo slug', bool_and(body <> 'Somente B'), NULL FROM public.get_public_whatsapp_templates('negocio-a');
INSERT INTO results SELECT 'RPC definer tem search_path fixo', prosecdef AND proconfig = ARRAY['search_path=""'], proconfig::text FROM pg_proc WHERE oid = 'public.get_public_whatsapp_templates(text)'::regprocedure;
INSERT INTO results SELECT 'RPC sem EXECUTE implícito de PUBLIC', NOT EXISTS (SELECT 1 FROM aclexplode(proacl) WHERE grantee = 0 AND privilege_type = 'EXECUTE'), proacl::text FROM pg_proc WHERE oid = 'public.get_public_whatsapp_templates(text)'::regprocedure;
INSERT INTO results SELECT 'RLS está ativa', relrowsecurity, NULL FROM pg_class WHERE oid = 'public.whatsapp_message_templates'::regclass;
DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000b0';
INSERT INTO results SELECT 'FK apaga em cascata', count(*) = 0, count(*)::text FROM public.whatsapp_message_templates WHERE business_id = '00000000-0000-0000-0000-0000000000b0';

SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS status, name, got FROM results;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM results WHERE NOT ok) THEN RAISE EXCEPTION 'whatsapp_message_templates: checks falharam'; END IF;
END; $$;
