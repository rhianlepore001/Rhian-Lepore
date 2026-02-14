
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

// Create a client with the anon key
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runSecurityCheck() {
    console.log('🔒 Starting Security Verification Scan...');

    // 1. Check Public Access to Protected Tables (Should fail or return empty)
    console.log('\n1️⃣  Testing Public Access (Unauthenticated)');
    const protectedTables = ['appointments', 'clients', 'financial_records'];

    for (const table of protectedTables) {
        const { data, error } = await supabase.from(table).select('*').limit(5);

        if (error) {
            console.log(`✅ [${table}] Access denied or error: ${error.message} (Expected)`);
        } else if (data && data.length > 0) {
            console.error(`❌ [${table}] Public access ALLOWED! Found ${data.length} records. (CRITICAL FAIL)`);
        } else {
            console.log(`✅ [${table}] No data returned (Expected for RLS enabled)`);
        }
    }

    // 2. Check RLS Policies Existence (Requires Service Role - skipping, inferring from behavior above)

    // 3. RPC Security Check
    console.log('\n2️⃣  Testing RPC Security');
    // Attempt to call get_dashboard_stats without a user context (should fail or return empty if properly secured)

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_stats', { p_user_id: '00000000-0000-0000-0000-000000000000' });

    if (rpcError) {
        console.log(`✅ [get_dashboard_stats] Call failed or denied: ${rpcError.message}`);
    } else {
        console.log(`ℹ️ [get_dashboard_stats] Returned:`, rpcData);
        if (rpcData && (rpcData.total_profit > 0 || rpcData.current_month_revenue > 0)) {
            console.warn(`⚠️ [get_dashboard_stats] Returned data for dummy UUID. Check logic!`);
        } else {
            console.log(`✅ [get_dashboard_stats] Returned empty/zero stats for dummy UUID.`);
        }
    }

    console.log('\n🏁 Scan Complete.');
}

runSecurityCheck();
