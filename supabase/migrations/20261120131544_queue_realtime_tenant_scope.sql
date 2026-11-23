BEGIN;

DROP POLICY IF EXISTS "Queue topics are readable" ON realtime.messages;

CREATE POLICY "Queue topics are readable"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND realtime.topic() = 'queue:' || (SELECT public.get_auth_company_id())
);

COMMIT;
