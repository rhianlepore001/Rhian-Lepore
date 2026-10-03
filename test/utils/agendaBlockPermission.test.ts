import { describe, expect, it } from 'vitest';
import {
  AGENDA_BLOCKED_MESSAGE,
  DEFAULT_STAFF_CAN_BLOCK_AGENDA,
  agendaBlockBandLabel,
  canCreateAgendaBlock,
  canManageAgendaBlock,
  isAgendaBlockedError,
  messageForAgendaBlockResultCode,
  normalizeStaffCanBlockAgenda,
} from '@/utils/agendaBlockPermission';

const SELF = 'member-self';
const OTHER = 'member-other';

describe('permissão para bloquear agenda', () => {
  it('padrão é ligado, inclusive sem coluna ou valor inesperado', () => {
    expect(DEFAULT_STAFF_CAN_BLOCK_AGENDA).toBe(true);
    expect(normalizeStaffCanBlockAgenda(undefined)).toBe(true);
    expect(normalizeStaffCanBlockAgenda(null)).toBe(true);
    expect(normalizeStaffCanBlockAgenda('maybe')).toBe(true);
    expect(normalizeStaffCanBlockAgenda(true)).toBe(true);
    expect(normalizeStaffCanBlockAgenda(false)).toBe(false);
    expect(normalizeStaffCanBlockAgenda('false')).toBe(false);
  });

  it('dono sempre cria e remove, em qualquer profissional, flag ligada ou não', () => {
    expect(canCreateAgendaBlock({ role: 'owner', staffCanBlock: false, teamMemberId: null, professionalId: OTHER })).toBe(true);
    expect(canManageAgendaBlock({ role: 'owner', staffCanBlock: false, teamMemberId: null, professionalId: OTHER })).toBe(true);
  });

  it('staff com flag ligada só na própria coluna', () => {
    expect(canCreateAgendaBlock({ role: 'staff', staffCanBlock: true, teamMemberId: SELF, professionalId: SELF })).toBe(true);
    expect(canManageAgendaBlock({ role: 'staff', staffCanBlock: true, teamMemberId: SELF, professionalId: SELF })).toBe(true);
    expect(canCreateAgendaBlock({ role: 'staff', staffCanBlock: true, teamMemberId: SELF, professionalId: OTHER })).toBe(false);
    expect(canManageAgendaBlock({ role: 'staff', staffCanBlock: true, teamMemberId: SELF, professionalId: OTHER })).toBe(false);
  });

  it('staff com flag desligada não cria nem remove, nem na própria', () => {
    expect(canCreateAgendaBlock({ role: 'staff', staffCanBlock: false, teamMemberId: SELF, professionalId: SELF })).toBe(false);
    expect(canManageAgendaBlock({ role: 'staff', staffCanBlock: false, teamMemberId: SELF, professionalId: SELF })).toBe(false);
  });

  it('staff sem teamMemberId não cria', () => {
    expect(canCreateAgendaBlock({ role: 'staff', staffCanBlock: true, teamMemberId: null })).toBe(false);
  });

  it('rótulo da faixa: Bloqueado se pode gerir; Agenda bloqueada se staff sem permissão', () => {
    expect(agendaBlockBandLabel({ role: 'owner', staffCanBlock: true, teamMemberId: null, professionalId: SELF })).toBe('Bloqueado');
    expect(agendaBlockBandLabel({ role: 'staff', staffCanBlock: true, teamMemberId: SELF, professionalId: SELF })).toBe('Bloqueado');
    expect(agendaBlockBandLabel({ role: 'staff', staffCanBlock: false, teamMemberId: SELF, professionalId: SELF })).toBe('Agenda bloqueada');
    expect(agendaBlockBandLabel({ role: 'staff', staffCanBlock: true, teamMemberId: SELF, professionalId: OTHER })).toBe('Agenda bloqueada');
  });

  it('reconhece o erro do banco', () => {
    expect(isAgendaBlockedError({ message: 'agenda_blocked' })).toBe(true);
    expect(isAgendaBlockedError({ message: AGENDA_BLOCKED_MESSAGE })).toBe(true);
    expect(isAgendaBlockedError({ code: 'agenda_blocked' })).toBe(true);
    expect(isAgendaBlockedError({ message: 'horario ocupado' })).toBe(false);
    expect(isAgendaBlockedError(null)).toBe(false);
  });

  it('traduz códigos de RPC de bloqueio', () => {
    expect(messageForAgendaBlockResultCode('overlap')).toMatch(/Já existe um bloqueio/);
    expect(messageForAgendaBlockResultCode('forbidden')).toBe('Você não tem permissão para bloquear esta agenda.');
    expect(messageForAgendaBlockResultCode('invalid_interval')).toBe('O fim do bloqueio precisa ser depois do início.');
    expect(messageForAgendaBlockResultCode('block_too_long')).toBe('Um bloqueio pode ter no máximo 366 dias.');
    expect(messageForAgendaBlockResultCode('block_starts_in_past')).toBe('Este bloqueio já terminou e fica só no histórico.');
    expect(messageForAgendaBlockResultCode('block_start_adjusted')).toBe('O início do bloqueio já passou. Ajustamos para agora — confira e confirme de novo.');
    expect(messageForAgendaBlockResultCode('block_finished')).toBe('Este bloqueio já terminou e fica só no histórico.');
    expect(messageForAgendaBlockResultCode('block_conflicts_changed')).toBe('Entrou um novo atendimento nesse período. Revise a lista e confirme de novo.');
    expect(messageForAgendaBlockResultCode('unavailable')).toMatch(/não está disponível/);
  });
});
