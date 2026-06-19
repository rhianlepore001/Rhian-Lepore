import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();
config({ path: '.env.local' });

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('Missing Supabase env vars for validation');
  process.exit(1);
}

const anon = createClient(url, anonKey);
const admin = createClient(url, serviceKey);

const checks = [];

function pass(name, detail = '') {
  checks.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  checks.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

function skip(name, detail = '') {
  checks.push({ name, ok: true, skipped: true, detail });
  console.log(`SKIP  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function rpcExists(name, args) {
  const { error } = await anon.rpc(name, args);
  if (!error) return true;
  const msg = error.message || '';
  if (msg.includes('Could not find the function') || error.code === 'PGRST202') return false;
  return true;
}

// RPCs deployed
const rpcChecks = [
  ['get_public_profile_by_slug', { p_slug: '__nonexistent_slug__' }],
  ['get_public_services_catalog', { p_business_id: '00000000-0000-0000-0000-000000000000' }],
  ['get_public_booking_by_id', {
    p_booking_id: '00000000-0000-0000-0000-000000000000',
    p_business_id: '00000000-0000-0000-0000-000000000000',
    p_phone: '00000000000',
  }],
  ['get_queue_entry_public', {
    p_entry_id: '00000000-0000-0000-0000-000000000000',
    p_phone: '00000000000',
  }],
];

for (const [name, args] of rpcChecks) {
  const exists = await rpcExists(name, args);
  if (exists) pass(`rpc ${name} available`);
  else fail(`rpc ${name} available`);
}

// anon blocked on direct SELECT
for (const table of ['public_bookings', 'queue_entries', 'services', 'profiles']) {
  const { data, error } = await anon.from(table).select('*').limit(1);
  if (error) pass(`anon blocked SELECT ${table}`, error.code || error.message);
  else if (!data || data.length === 0) pass(`anon SELECT ${table} returns empty`, 'no rows visible');
  else fail(`anon SELECT ${table}`, `returned ${data.length} row(s)`);
}

// mirror_public_client_to_crm not callable by anon
{
  const { error } = await anon.rpc('mirror_public_client_to_crm', {
    p_business_id: '00000000-0000-0000-0000-000000000000',
    p_name: 'test',
    p_phone: '00000000000',
    p_email: null,
    p_photo_url: null,
  });
  const msg = error?.message || '';
  if (
    error &&
    (msg.includes('permission denied') ||
      msg.includes('Could not find the function') ||
      error.code === '42501' ||
      error.code === 'PGRST202')
  ) {
    pass('mirror_public_client_to_crm blocked for anon', error.code || msg);
  } else {
    fail('mirror_public_client_to_crm blocked for anon', msg || 'rpc succeeded');
  }
}

// booking RPC phone proof
const { data: bookings } = await admin.from('public_bookings').select('id,business_id,customer_phone').limit(1);
const sample = bookings?.[0];
if (sample?.id) {
  const { data: wrongPhone, error: rpcErr } = await anon.rpc('get_public_booking_by_id', {
    p_booking_id: sample.id,
    p_business_id: sample.business_id,
    p_phone: '00000000000',
  });
  if (!rpcErr && (!wrongPhone || wrongPhone.length === 0)) {
    pass('get_public_booking_by_id rejects wrong phone');
  } else {
    fail('get_public_booking_by_id rejects wrong phone', JSON.stringify({ rpcErr, wrongPhone }));
  }

  const { data: rightPhone, error: rightErr } = await anon.rpc('get_public_booking_by_id', {
    p_booking_id: sample.id,
    p_business_id: sample.business_id,
    p_phone: sample.customer_phone,
  });
  if (!rightErr && rightPhone?.length === 1) pass('get_public_booking_by_id accepts matching phone');
  else fail('get_public_booking_by_id accepts matching phone', rightErr?.message || JSON.stringify(rightPhone));
} else {
  skip('booking RPC phone proof', 'no public_bookings row in database');
}

// catalog slug RPC
const { data: profileJsonNull, error: slugNullErr } = await anon.rpc('get_public_profile_by_slug', {
  p_slug: '__nonexistent_slug__',
});
if (!slugNullErr && (profileJsonNull === null || profileJsonNull === undefined)) {
  pass('get_public_profile_by_slug returns null for unknown slug');
} else {
  fail('get_public_profile_by_slug returns null for unknown slug', slugNullErr?.message || JSON.stringify(profileJsonNull));
}

const { data: profiles } = await admin
  .from('profiles')
  .select('business_slug')
  .not('business_slug', 'is', null)
  .neq('business_slug', '')
  .limit(1);
const slug = profiles?.[0]?.business_slug;
if (slug) {
  const { data: profileJson, error: slugErr } = await anon.rpc('get_public_profile_by_slug', { p_slug: slug });
  if (!slugErr && profileJson?.business_slug === slug) pass('get_public_profile_by_slug returns tenant profile');
  else fail('get_public_profile_by_slug returns tenant profile', slugErr?.message || JSON.stringify(profileJson));
} else {
  skip('get_public_profile_by_slug live slug', 'no business_slug in database');
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\nValidation: ${checks.length - failed}/${checks.length} passed`);
process.exit(failed > 0 ? 1 : 0);
