import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STAFF_APPOINTMENT_EDIT_SCOPE,
  STAFF_APPOINTMENT_EDIT_SCOPE_OPTIONS,
  canEditAppointment,
  isStaffEditForbiddenError,
  normalizeStaffAppointmentEditScope,
  staffEditBlockedMessage,
} from '@/utils/staffAppointmentPermission';

const SELF = 'member-self';
const OTHER = 'member-other';

describe('permissão da equipe para editar agendamentos', () => {
  it('padrão é "none" (comportamento de hoje), inclusive sem coluna ou valor inesperado', () => {
    expect(DEFAULT_STAFF_APPOINTMENT_EDIT_SCOPE).toBe('none');
    expect(normalizeStaffAppointmentEditScope(undefined)).toBe('none');
    expect(normalizeStaffAppointmentEditScope(null)).toBe('none');
    expect(normalizeStaffAppointmentEditScope('everything')).toBe('none');
    expect(normalizeStaffAppointmentEditScope('own')).toBe('own');
    expect(normalizeStaffAppointmentEditScope('all')).toBe('all');
  });

  it.each(['none', 'own', 'all'] as const)('dono sempre pode (nível %s)', (scope) => {
    expect(canEditAppointment({ role: 'owner', scope, teamMemberId: null, professionalId: OTHER })).toBe(true);
    expect(canEditAppointment({ role: 'owner', scope, teamMemberId: null, professionalId: null })).toBe(true);
  });

  it('none: colaborador não edita nem os próprios', () => {
    expect(canEditAppointment({ role: 'staff', scope: 'none', teamMemberId: SELF, professionalId: SELF })).toBe(false);
    expect(canEditAppointment({ role: 'staff', scope: 'none', teamMemberId: SELF, professionalId: OTHER })).toBe(false);
  });

  it('own: só quando ele é o profissional', () => {
    expect(canEditAppointment({ role: 'staff', scope: 'own', teamMemberId: SELF, professionalId: SELF })).toBe(true);
    expect(canEditAppointment({ role: 'staff', scope: 'own', teamMemberId: SELF, professionalId: OTHER })).toBe(false);
    expect(canEditAppointment({ role: 'staff', scope: 'own', teamMemberId: SELF, professionalId: null })).toBe(false);
    expect(canEditAppointment({ role: 'staff', scope: 'own', teamMemberId: null, professionalId: null })).toBe(false);
  });

  it('all: qualquer agendamento', () => {
    expect(canEditAppointment({ role: 'staff', scope: 'all', teamMemberId: SELF, professionalId: OTHER })).toBe(true);
    expect(canEditAppointment({ role: 'staff', scope: 'all', teamMemberId: null, professionalId: null })).toBe(true);
  });

  it('mensagens curtas em pt-BR para o colaborador bloqueado', () => {
    expect(staffEditBlockedMessage('none')).toMatch(/reservados ao dono/);
    expect(staffEditBlockedMessage('own')).toMatch(/seus próprios agendamentos/);
  });

  it('três opções na ordem none/own/all com textos claros', () => {
    expect(STAFF_APPOINTMENT_EDIT_SCOPE_OPTIONS.map((o) => o.value)).toEqual(['none', 'own', 'all']);
    for (const o of STAFF_APPOINTMENT_EDIT_SCOPE_OPTIONS) {
      expect(o.label.length).toBeGreaterThan(3);
      expect(o.description).toMatch(/agendamento/);
    }
  });

  it('reconhece o erro da trigger do banco', () => {
    expect(isStaffEditForbiddenError({ code: '42501', message: 'staff_appointment_edit_forbidden' })).toBe(true);
    expect(isStaffEditForbiddenError({ code: '42501', message: 'permission denied for table appointments' })).toBe(false);
    expect(isStaffEditForbiddenError(null)).toBe(false);
  });
});
