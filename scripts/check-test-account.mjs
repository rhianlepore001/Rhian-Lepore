import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
);

const email = process.env.AGENDIX_TEST_EMAIL;
const password = process.env.AGENDIX_TEST_PASSWORD;

console.log('email_set:', !!email);
console.log('password_set:', !!password);

const { data, error } = await supabase.auth.signInWithPassword({ email, password });

if (error) {
  console.log('LOGIN_FAIL:', error.message);
  process.exit(1);
}

const user = data.user;
console.log('user_id:', user.id);
console.log('user_email:', user.email);

const { data: profile } = await supabase
  .from('profiles')
  .select('id, business_slug, business_name, business_type')
  .eq('id', user.id)
  .single();

console.log('profile:', JSON.stringify(profile));

const companyId = profile?.id ?? user.id;

const { data: hours } = await supabase
  .from('business_settings')
  .select('business_hours, public_booking_enabled')
  .eq('user_id', companyId)
  .maybeSingle();

console.log('has_business_hours:', !!hours?.business_hours);
console.log('public_booking_enabled:', hours?.public_booking_enabled);

const { count: teamCount } = await supabase
  .from('team_members')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', companyId)
  .eq('active', true);

console.log('active_team_members:', teamCount);

const now = new Date();
const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);

const { data: todayApts, count: todayCount } = await supabase
  .from('appointments')
  .select('id, appointment_time, duration_minutes, status', { count: 'exact' })
  .eq('user_id', companyId)
  .gte('appointment_time', todayStart.toISOString())
  .lte('appointment_time', todayEnd.toISOString())
  .in('status', ['Confirmed', 'Completed']);

console.log('today_count:', todayCount);
if (todayApts && todayApts.length > 0) {
  console.log('sample_apt:', JSON.stringify(todayApts[0]));
}

await supabase.auth.signOut();
console.log('OK');
