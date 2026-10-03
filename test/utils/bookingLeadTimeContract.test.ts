import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
const MIGRATION = 'supabase/migrations/20261003152759_public_booking_lead_time.sql';
const ROLLBACK = 'docs/rollbacks/20261003152759_public_booking_lead_time_rollback.sql';

const FORBIDDEN = [
  'CREATE OR REPLACE FUNCTION public.get_available_slots(',
  'CREATE OR REPLACE FUNCTION public.create_public_booking(',
  'CREATE OR REPLACE FUNCTION public.create_secure_booking(',
  'CREATE OR REPLACE FUNCTION public.enforce_agenda_block_on_appointments(',
];

describe('migration 20261003152759_public_booking_lead_time (contrato)', () => {
  const sql = read(MIGRATION);

  it('é aditiva: trigger + v2 + helper, sem reescrever as 4 funções protegidas', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.get_available_slots_v2\(/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.enforce_lead_time_on_public_bookings\(/);
    expect(sql).toMatch(/CREATE TRIGGER enforce_lead_time_on_public_bookings/);
    expect(sql).toMatch(/profiles\.booking_lead_time_hours/);
    expect(sql).toMatch(/lead_time_violation/);
    expect(sql).toMatch(/business_timezone/);
    expect(sql).toMatch(/p_is_professional/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_available_slots_v2/);
    expect(sql).toMatch(/get_full_dates_v2/);
    expect(sql).toMatch(/booking_lead_time_hours_range/);
    expect(sql).toMatch(/auth\.uid\(\)::text = NEW\.business_id/);
    expect(sql).toMatch(/tm\.staff_user_id = auth\.uid\(\)/);
    expect(sql).toMatch(/tm\.deleted_at IS NULL/);
    expect(sql).toMatch(/p_end_date := LEAST/);
    expect(sql).toMatch(/COALESCE\(NEW\.status, 'pending'\)/);
    expect(sql).toMatch(/UPDATE OF appointment_time, status/);
    for (const needle of FORBIDDEN) {
      expect(sql).not.toContain(needle);
    }
    expect(sql).not.toMatch(/\bDROP FUNCTION public\.get_available_slots\b/);
    expect(sql).not.toMatch(/DROP TRIGGER IF EXISTS enforce_agenda_block/);
  });

  it('documenta business_settings.lead_time_hours como não usada', () => {
    expect(sql).toMatch(/Não usada/);
    expect(sql).toMatch(/lead_time_hours/);
  });

  it('rollback só remove v2/trigger/helper', () => {
    const rollback = read(ROLLBACK);
    expect(rollback).toMatch(/DROP TRIGGER IF EXISTS enforce_lead_time_on_public_bookings/);
    expect(rollback).toMatch(/DROP FUNCTION IF EXISTS public\.get_available_slots_v2/);
    expect(rollback).toMatch(/DROP FUNCTION IF EXISTS public\.get_full_dates_v2/);
    expect(rollback).toMatch(/DROP FUNCTION IF EXISTS public\.enforce_lead_time_on_public_bookings/);
    expect(rollback).toMatch(/DROP CONSTRAINT IF EXISTS booking_lead_time_hours_range/);
    expect(rollback).not.toMatch(/DROP COLUMN/);
    for (const needle of FORBIDDEN) {
      expect(rollback).not.toContain(needle);
    }
  });
});
