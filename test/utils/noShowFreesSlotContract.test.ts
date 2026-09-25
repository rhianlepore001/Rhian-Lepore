import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guarda estático do item 5 (falta libera horário). A lógica SQL em si é
 * testada no harness Postgres local (scripts/test-sql-noshow-slots.sh);
 * aqui garantimos que migration, rollback e a Agenda não percam o contrato.
 */
const root = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
const MIGRATION = 'supabase/migrations/20260925160000_noshow_frees_slot.sql';
const ROLLBACK = 'docs/rollbacks/20260925160000_noshow_frees_slot_rollback.sql';

function fnBody(sql: string, name: string): string {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  expect(start, `${name} ausente`).toBeGreaterThanOrEqual(0);
  // corpo termina no segundo $function$ (fim do dollar-quote)
  const open = sql.indexOf('$function$', start);
  const close = sql.indexOf('$function$', open + 10);
  expect(open, `${name} sem $function$`).toBeGreaterThan(start);
  return sql.slice(start, close + 10);
}

describe('migration 20260925160000_noshow_frees_slot', () => {
  const sql = read(MIGRATION);

  it.each(['get_available_slots', 'public_booking_slot_busy', 'create_secure_booking'])(
    '%s: NoShow e Cancelled não ocupam; pedido confirmado liberado pelo auxiliar',
    (name) => {
      const body = fnBody(sql, name);
      expect(body).toMatch(/NOT IN \('Cancelled', 'NoShow'\)/);
      expect(body).not.toMatch(/status != 'Cancelled'|IS DISTINCT FROM 'Cancelled'/);
      expect(body).toMatch(/pb\.status = 'confirmed' AND public\.confirmed_booking_slot_released\(/);
      expect(body).toMatch(/SECURITY DEFINER/);
    },
  );

  it('só CREATE OR REPLACE (mesmas assinaturas) e nenhuma alteração de dados', () => {
    expect(sql).not.toMatch(/\bDROP\s+FUNCTION\b/i);
    expect(sql).not.toMatch(/^(UPDATE|DELETE|INSERT|ALTER TABLE|TRUNCATE)\b/im);
    expect(sql).toContain(
      'get_available_slots(p_business_id uuid, p_date date, p_professional_id uuid DEFAULT NULL::uuid, p_duration_min integer DEFAULT 30, p_is_professional boolean DEFAULT false)',
    );
    expect(sql).toContain(
      'public_booking_slot_busy(p_business_id text, p_appointment_time timestamp with time zone, p_duration_minutes integer, p_professional_id uuid DEFAULT NULL::uuid)',
    );
  });

  it('auxiliar não é exposto para anon/authenticated', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.confirmed_booking_slot_released\([^)]*\) FROM anon;/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.confirmed_booking_slot_released\([^)]*\) FROM authenticated;/);
  });
});

describe('rollback 20260925160000', () => {
  const sql = read(ROLLBACK);
  it('restaura as definições de prod (só Cancelled liberava) e remove o auxiliar', () => {
    for (const name of ['get_available_slots', 'public_booking_slot_busy', 'create_secure_booking']) {
      const body = fnBody(sql, name);
      expect(body).not.toMatch(/NoShow/);
      expect(body).not.toMatch(/confirmed_booking_slot_released/);
    }
    expect(sql).toMatch(/DROP FUNCTION IF EXISTS public\.confirmed_booking_slot_released\(text, timestamp with time zone, uuid\);/);
  });
});

describe('Agenda — histórico inclui faltas', () => {
  it('consulta do histórico traz NoShow junto com concluídos/cancelados', () => {
    const src = read('pages/Agenda.tsx');
    expect(src).toMatch(/\.in\('status', \['Completed', 'Cancelled', 'NoShow'\]\)/);
  });
});
