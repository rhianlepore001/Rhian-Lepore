BEGIN;

DROP POLICY IF EXISTS "Queue topics are readable" ON realtime.messages;

CREATE POLICY "Queue topics are readable"
ON realtime.messages
FOR SELECT
TO anon, authenticated
USING (realtime.topic() LIKE 'queue:%' AND realtime.messages.extension = 'broadcast');

COMMIT;
