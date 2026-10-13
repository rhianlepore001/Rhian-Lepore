import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

describe('migrations de política/antecedência (contrato)', () => {
  it('client_cancel_policy_text: aditiva, só uma chave nova na RPC pública', () => {
    const sql = read('supabase/migrations/20261013200000_client_cancel_policy_text.sql');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS client_cancel_policy_text text/);
    expect(sql).toMatch(/char_length\(client_cancel_policy_text\) <= 300/);
    expect(sql).toMatch(/'client_cancel_policy_text', NULLIF\(btrim\(bs\.client_cancel_policy_text\), ''\)/);
    expect(sql).not.toMatch(/GRANT|DROP FUNCTION|DROP TABLE/);
    const rb = read('docs/rollbacks/20261013200000_client_cancel_policy_text.rollback.sql');
    expect(rb).toMatch(/DROP COLUMN IF EXISTS client_cancel_policy_text/);
    expect(rb).not.toMatch(/'client_cancel_policy_text'/);
  });

  it('booking_lead_time_minutes: função interna só service_role; corte em minutos', () => {
    const sql = read('supabase/migrations/20261013200100_booking_lead_time_minutes.sql');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS booking_lead_time_minutes integer/);
    expect(sql).toMatch(/BETWEEN 0 AND 43200/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.public_booking_lead_time_minutes\(text\) FROM PUBLIC, anon, authenticated/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.public_booking_lead_time_minutes\(text\) TO service_role/);
    expect(sql).not.toMatch(/make_interval\(hours => v_lead\)/);
    expect((sql.match(/make_interval\(mins => v_lead_min\)/g) ?? []).length).toBe(2);
    expect(sql).not.toMatch(/CREATE OR REPLACE FUNCTION public\.public_booking_lead_time_hours/);
    const rb = read('docs/rollbacks/20261013200100_booking_lead_time_minutes.rollback.sql');
    expect(rb).toMatch(/DROP FUNCTION IF EXISTS public\.public_booking_lead_time_minutes\(text\)/);
    expect(rb).toMatch(/DROP COLUMN IF EXISTS booking_lead_time_minutes/);
    expect((rb.match(/make_interval\(hours => v_lead\)/g) ?? []).length).toBe(2);
  });
});
