import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const MIG = 'supabase/migrations/20260928160000_staff_read_service_categories.sql';
const RB = 'docs/rollbacks/20260928160000_staff_read_service_categories_rollback.sql';
const strip = (s: string) => s.replace(/--.*$/gm, '');

describe('Migration: equipe lê categorias da própria empresa (aditiva)', () => {
  it('cria só uma policy SELECT para authenticated, escopada por get_auth_company_id()', () => {
    const sql = strip(fs.readFileSync(path.join(root, MIG), 'utf8'));
    expect(sql).toMatch(/CREATE POLICY\s+"Categories: company read"\s+ON public\.service_categories\s+FOR SELECT\s+TO authenticated\s+USING \(user_id = public\.get_auth_company_id\(\)\)/i);
    // aditiva: não mexe em policies/tabelas existentes
    expect(sql).not.toMatch(/\bALTER\s+POLICY\b|\bALTER\s+TABLE\b|\bDROP\s+TABLE\b|\bGRANT\b|\bDISABLE\b/i);
    const drops = sql.match(/DROP POLICY[^;]*;/gi) ?? [];
    expect(drops.every((d) => /"Categories: company read"/.test(d))).toBe(true);
  });

  it('rollback remove só a policy nova e documenta as policies de prod', () => {
    const raw = fs.readFileSync(path.join(root, RB), 'utf8');
    const sql = strip(raw);
    expect(sql).toMatch(/DROP POLICY IF EXISTS "Categories: company read" ON public\.service_categories/);
    expect((sql.match(/DROP POLICY/gi) ?? []).length).toBe(1);
    expect(raw).toContain('"Users can view their own categories"');
    expect(raw).toContain('"Users can manage their own categories"');
  });
});
