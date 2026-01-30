-- Fix RLS policies for queue_entries to allow business owners to view completed entries

-- Drop the restrictive public policy
DROP POLICY IF EXISTS "Public can view active queue" ON queue_entries;

-- Recreate it to allow public to view active queue
CREATE POLICY "Public can view active queue" ON queue_entries
    FOR SELECT
    USING (status NOT IN ('completed', 'cancelled', 'no_show'));

-- Add explicit policy for business owners to view ALL their entries including completed
DROP POLICY IF EXISTS "Business owners view all their queue" ON queue_entries;
CREATE POLICY "Business owners view all their queue" ON queue_entries
    FOR SELECT
    USING (auth.uid() = business_id);

-- Keep the management policy for INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Business owners manage their queue" ON queue_entries;
CREATE POLICY "Business owners manage their queue" ON queue_entries
    FOR INSERT
    WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Business owners update their queue" ON queue_entries
    FOR UPDATE
    USING (auth.uid() = business_id);

CREATE POLICY "Business owners delete their queue" ON queue_entries
    FOR DELETE
    USING (auth.uid() = business_id);
