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
            'Content-Length': Buffer.byteLength(payload) // Correção para lidar melhor com bytes em utf-8
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
                        console.log(`${COLOR_YELLOW}  (vazio)${COLOR_RESET}`);
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

const uid = '0739ce71-6e41-47fa-9b02-10ac669d2d91';

// 1. Finance records desse user com datas
runSql("Finance records do user (ultimos 10)", `
SELECT id, type, status, commission_paid, commission_value, revenue,
       created_at, barber_name, service_name, description, appointment_id
FROM finance_records
WHERE user_id = '${uid}'
ORDER BY created_at DESC
LIMIT 10;
`);

// 2. Appointments desse user com datas
runSql("Appointments Completed do user", `
SELECT id, status, price, appointment_time, service, professional_id, payment_method
FROM appointments
WHERE user_id = '${uid}' AND status = 'Completed'
ORDER BY appointment_time DESC
LIMIT 10;
`);

// 3. Finance records do user em Marco 2026 especificamente
runSql("Finance records em Marco 2026", `
SELECT id, type, status, commission_value, revenue, created_at
FROM finance_records
WHERE user_id = '${uid}'
  AND created_at >= '2026-03-01'::timestamp
  AND created_at <= '2026-03-31 23:59:59'::timestamp
ORDER BY created_at DESC;
`);

// 4. Testar com TODOS os users
runSql("Teste RPC para TODOS os users", `
SELECT user_id,
  (get_finance_stats(user_id, '2026-01-01', '2026-03-31'))::json->>'revenue' as revenue,
  (get_finance_stats(user_id, '2026-01-01', '2026-03-31'))::json->>'pendingExpenses' as pending,
  (get_finance_stats(user_id, '2026-01-01', '2026-03-31'))::json->>'commissions_pending' as commissions
FROM (SELECT DISTINCT user_id FROM finance_records) u;
`);
