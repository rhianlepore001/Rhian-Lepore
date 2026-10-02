import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
const MIGRATION = 'supabase/migrations/20261002120000_agenda_blocks.sql';

describe('migration 20261002120000_agenda_blocks (contrato)', () => {
  const sql = read(MIGRATION);

  it('cria tabela sem motivo e com intervalo', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.agenda_blocks/);
    expect(sql).toMatch(/starts_at\s+timestamptz NOT NULL/);
    expect(sql).toMatch(/ends_at\s+timestamptz NOT NULL/);
    expect(sql).toMatch(/CONSTRAINT agenda_blocks_interval_chk CHECK \(ends_at > starts_at\)/);
    expect(sql).not.toMatch(/\breason\b|\bmotivo\b|\bapproval\b/);
  });

  it('flag default true', () => {
    expect(sql).toMatch(/staff_can_block_agenda boolean NOT NULL DEFAULT true/);
  });

  it('helper e RPCs SECURITY DEFINER; mutação não é GRANT de INSERT autenticado', () => {
    expect(sql).toMatch(/agenda_interval_blocked/);
    expect(sql).toMatch(/create_agenda_block/);
    expect(sql).toMatch(/delete_agenda_block/);
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.agenda_blocks FROM PUBLIC, anon/);
    expect(sql).toMatch(/GRANT SELECT ON TABLE public\.agenda_blocks TO authenticated/);
  });

  it('slots, busy e create_secure_booking consultam o helper', () => {
    expect(sql.match(/agenda_interval_blocked/g)?.length ?? 0).toBeGreaterThan(5);
    expect(sql).toMatch(/code', 'agenda_blocked'/);
    expect(sql).toMatch(/enforce_agenda_block_on_appointments/);
  });

  it('conflitos não cancelam', () => {
    expect(sql).toMatch(/p_acknowledge_conflicts/);
    expect(sql).not.toMatch(/UPDATE public\.appointments SET status = 'Cancelled'/);
  });
});

describe('Agenda — pontos de entrada de bloqueio', () => {
  const agenda = read('pages/Agenda.tsx');
  it('o + da agenda abre escolha em vez do wizard direto', () => {
    expect(agenda).toMatch(/AgendaCreateChoice/);
    expect(agenda).toMatch(/setShowCreateChoice/);
    expect(agenda).toMatch(/AgendaBlockForm/);
    expect(agenda).toMatch(/AgendaBlockDetails/);
    expect(agenda).toMatch(/onEmptySlotClick=\{openEmptySlot\}/);
  });

  it('deep-link ?block=true abre o formulário de bloqueio', () => {
    expect(agenda).toMatch(/searchParams\.get\('block'\)/);
    expect(agenda).toMatch(/canOpenBlockFromPlus/);
  });
});

describe('Equipe — card Bloqueios e toggle', () => {
  const team = read('pages/settings/TeamSettings.tsx');
  it('card da equipe lista bloqueios e o toggle fica nas permissões', () => {
    expect(team).toMatch(/TeamMemberBlocksSection/);
    expect(team).toMatch(/StaffAppointmentPermissionSection/);
    expect(read('components/settings/StaffAppointmentPermissionSection.tsx'))
      .toMatch(/Colaboradores podem bloquear a própria agenda/);
  });
});

describe('Wizard e edição recusam horário bloqueado', () => {
  it('wizard esconde slots bloqueados e mapeia o erro', () => {
    const wizard = read('components/AppointmentWizard.tsx');
    expect(wizard).toMatch(/useAgendaBlocks/);
    expect(wizard).toMatch(/AGENDA_BLOCKED_MESSAGE|agenda_blocked/);
  });

  it('editar agendamento trata agenda_blocked', () => {
    const edit = read('components/AppointmentEditModal.tsx');
    expect(edit).toMatch(/isAgendaBlockedError|AGENDA_BLOCKED_MESSAGE/);
  });
});
