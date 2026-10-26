BEGIN;
DROP FUNCTION IF EXISTS public.get_public_whatsapp_templates(text);
DROP TABLE IF EXISTS public.whatsapp_message_templates;
DROP FUNCTION IF EXISTS public.stamp_whatsapp_message_template();
COMMIT;
