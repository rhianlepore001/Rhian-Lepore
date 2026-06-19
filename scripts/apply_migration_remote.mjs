import { readFileSync } from 'node:fs';
import { config } from 'dotenv';

config();
config({ path: '.env.local' });

const sqlFile = process.argv[2];
const token = String(process.env.SUPABASE_ACCESS_TOKEN || '')
  .trim()
  .replace(/^\uFEFF/, '')
  .replace(/[^\x20-\x7E]/g, '');
const projectRef = process.env.SUPABASE_PROJECT_ID || 'lcqwrngscsziysyfhpfj';

if (!sqlFile) {
  console.error('Usage: node scripts/apply_migration_remote.mjs <sql-file>');
  process.exit(1);
}

if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN is missing in .env');
  process.exit(1);
}

const sql = readFileSync(sqlFile, 'utf8');

const resp = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  }
);

const text = await resp.text();
if (!resp.ok) {
  console.error(`Migration failed (${resp.status})`);
  console.error(text);
  process.exit(1);
}

console.log('Migration applied successfully');
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}
