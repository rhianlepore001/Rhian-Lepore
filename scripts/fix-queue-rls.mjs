import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment or hardcode temporarily
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_KEY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixQueueRLS() {
    console.log('🔧 Fixing queue_entries RLS policies...');

    const sql = `
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
  `;

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }

    console.log('✅ RLS policies updated successfully!');
    console.log('Now business owners can view completed queue entries.');
}

fixQueueRLS();
