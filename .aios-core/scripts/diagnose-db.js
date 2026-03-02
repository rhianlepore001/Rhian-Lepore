const https = require('https');

// Lê variáveis de ambiente ou usa fallback temporário para testes
const token = process.env.SUPABASE_TOKEN || 'sbp_02d0fa71fc41fd65ed9363e4175c05888e4c6963';
const proj = process.env.SUPABASE_PROJECT_REF || 'lcqwrngscsziysyfhpfj';

const COLOR_CYAN = '\x1b[36m';
const COLOR_GREEN = '\x1b[32m';
const COLOR_RED = '\x1b[31m';
const COLOR_YELLOW = '\x1b[33m';
const COLOR_RESET = '\x1b[0m';

/**
 * Execute a SQL query via Supabase REST API
 * @param {string} label Label print function
 * @param {string} sql raw SQL query
 */
function runSql(label, sql) {
    const payload = JSON.stringify({ query: sql });

    const options = {
        hostname: 'api.supabase.com',
        port: 443,
        path: `/v1/projects/${proj}/database/query`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': payload.length
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);

        res.on('end', () => {
            console.log(`\n${COLOR_CYAN}=== ${label} ===${COLOR_RESET}`);

            try {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const parsed = JSON.parse(data);

                    if (Array.isArray(parsed) && parsed.length > 0) {
                        parsed.forEach(row => console.log(JSON.stringify(row)));
                    } else if (parsed && !Array.isArray(parsed)) {
                        console.log(JSON.stringify(parsed));
                    } else {
                        console.log(`${COLOR_YELLOW}  (sem resultado)${COLOR_RESET}`);
                    }
                } else {
                    console.error(`${COLOR_RED}HTTP Error ${res.statusCode}: ${data}${COLOR_RESET}`);
                }
            } catch (e) {
                console.error(`${COLOR_RED}Error parsing JSON: ${e.message}${COLOR_RESET}`);
                console.error(data);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`\n${COLOR_CYAN}=== ${label} === ERRO:${COLOR_RESET}`);
        console.error(`${COLOR_RED}${e.message}${COLOR_RESET}`);
    });

    req.write(payload);
    req.end();
}

// 1. Listar TODAS as versoes de get_finance_stats
runSql("1. Versoes de get_finance_stats", `
SELECT p.proname, p.oid::regprocedure::text AS full_signature, p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'get_finance_stats';
`);

// 2. Listar TODAS as versoes de mark_expense_as_paid
runSql("2. Versoes de mark_expense_as_paid", `
SELECT p.proname, p.oid::regprocedure::text AS full_signature
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'mark_expense_as_paid';
`);

// 3. Listar TODAS as versoes de get_monthly_finance_history
runSql("3. Versoes de get_monthly_finance_history", `
SELECT p.proname, p.oid::regprocedure::text AS full_signature
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'get_monthly_finance_history';
`);

// 4. Verificar dados existentes
runSql("4. Appointments Completed", "SELECT COUNT(*) as total FROM appointments WHERE status = 'Completed';");
runSql("5. Finance Records (por tipo)", "SELECT type, status, COUNT(*) as total FROM finance_records GROUP BY type, status ORDER BY type, status;");

// 6. Testar RPC diretamente (pegar um user_id real)
runSql("6. User IDs ativos", `
SELECT DISTINCT user_id, COUNT(*) as records
FROM finance_records
GROUP BY user_id
ORDER BY records DESC
LIMIT 5;
`);

setTimeout(() => {
    console.log(`\n${COLOR_GREEN}=== FASE 1 COMPLETA ===${COLOR_RESET}`);
}, 5000); // aguarda os callbacks async
