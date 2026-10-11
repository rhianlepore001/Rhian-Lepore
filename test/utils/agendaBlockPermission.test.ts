import { describe, expect, it } from 'vitest';
import {
  AGENDA_BLOCKED_MESSAGE,
  DEFAULT_STAFF_CAN_BLOCK_AGENDA,
  agendaBlockBandLabel,
  canCreateAgendaBlock,
  canManageAgendaBlock,
  canPickAgendaBlockProfessional,
  DEFAULT_STAFF_AGENDA_BLOCK_SCOPE,
  isAgendaBlockedError,
  messageForAgendaBlockResultCode,
  normalizeStaffCanBlockAgenda,
  resolveStaffAgendaBlockScope,
  STAFF_AGENDA_BLOCK_SCOPE_OPTIONS,
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

  it('dono sempre cria e remove, em qualquer profissional e qualquer opção', () => {
    for (const scope of ['none', 'own', 'all'] as const) {
      expect(canCreateAgendaBlock({ role: 'owner', scope, teamMemberId: null, professionalId: OTHER })).toBe(true);
      expect(canManageAgendaBlock({ role: 'owner', scope, teamMemberId: null, professionalId: OTHER })).toBe(true);
      expect(canPickAgendaBlockProfessional({ role: 'owner', scope })).toBe(true);
    }
  });

  it('own (= booleano ligado de antes): staff só na própria coluna', () => {
    expect(canCreateAgendaBlock({ role: 'staff', scope: 'own', teamMemberId: SELF, professionalId: SELF })).toBe(true);
    expect(canManageAgendaBlock({ role: 'staff', scope: 'own', teamMemberId: SELF, professionalId: SELF })).toBe(true);
    expect(canCreateAgendaBlock({ role: 'staff', scope: 'own', teamMemberId: SELF, professionalId: OTHER })).toBe(false);
    expect(canManageAgendaBlock({ role: 'staff', scope: 'own', teamMemberId: SELF, professionalId: OTHER })).toBe(false);
    expect(canCreateAgendaBlock({ role: 'staff', scope: 'own', teamMemberId: SELF })).toBe(true);
    expect(canPickAgendaBlockProfessional({ role: 'staff', scope: 'own' })).toBe(false);
  });

  it('none (= booleano desligado): staff não cria nem remove, nem na própria', () => {
    expect(canCreateAgendaBlock({ role: 'staff', scope: 'none', teamMemberId: SELF, professionalId: SELF })).toBe(false);
    expect(canManageAgendaBlock({ role: 'staff', scope: 'none', teamMemberId: SELF, professionalId: SELF })).toBe(false);
    expect(canCreateAgendaBlock({ role: 'staff', scope: 'none', teamMemberId: SELF })).toBe(false);
    expect(canPickAgendaBlockProfessional({ role: 'staff', scope: 'none' })).toBe(false);
  });

  it('all: staff cria e remove em qualquer coluna e escolhe o profissional', () => {
    expect(canCreateAgendaBlock({ role: 'staff', scope: 'all', teamMemberId: SELF, professionalId: OTHER })).toBe(true);
    expect(canManageAgendaBlock({ role: 'staff', scope: 'all', teamMemberId: SELF, professionalId: OTHER })).toBe(true);
    expect(canCreateAgendaBlock({ role: 'staff', scope: 'all', teamMemberId: SELF })).toBe(true);
    expect(canPickAgendaBlockProfessional({ role: 'staff', scope: 'all' })).toBe(true);
  });

  it('staff sem teamMemberId (login órfão) não cria nem remove em nenhuma opção', () => {
    for (const scope of ['none', 'own', 'all'] as const) {
      expect(canCreateAgendaBlock({ role: 'staff', scope, teamMemberId: null })).toBe(false);
      expect(canManageAgendaBlock({ role: 'staff', scope, teamMemberId: null, professionalId: OTHER })).toBe(false);
    }
  });

  it('rótulo da faixa: Bloqueado se pode gerir; Agenda bloqueada se staff sem permissão', () => {
    expect(agendaBlockBandLabel({ role: 'owner', scope: 'none', teamMemberId: null, professionalId: SELF })).toBe('Bloqueado');
    expect(agendaBlockBandLabel({ role: 'staff', scope: 'own', teamMemberId: SELF, professionalId: SELF })).toBe('Bloqueado');
    expect(agendaBlockBandLabel({ role: 'staff', scope: 'none', teamMemberId: SELF, professionalId: SELF })).toBe('Agenda bloqueada');
    expect(agendaBlockBandLabel({ role: 'staff', scope: 'own', teamMemberId: SELF, professionalId: OTHER })).toBe('Agenda bloqueada');
    expect(agendaBlockBandLabel({ role: 'staff', scope: 'all', teamMemberId: SELF, professionalId: OTHER })).toBe('Bloqueado');
  });

  it('scope efetivo: coluna nova vence; sem ela vale o booleano antigo; padrão = own', () => {
    expect(DEFAULT_STAFF_AGENDA_BLOCK_SCOPE).toBe('own');
    expect(resolveStaffAgendaBlockScope({ staff_agenda_block_scope: 'all', staff_can_block_agenda: true })).toBe('all');
    expect(resolveStaffAgendaBlockScope({ staff_agenda_block_scope: 'none', staff_can_block_agenda: true })).toBe('none');
    expect(resolveStaffAgendaBlockScope({ staff_can_block_agenda: false })).toBe('none');
    expect(resolveStaffAgendaBlockScope({ staff_can_block_agenda: true })).toBe('own');
    expect(resolveStaffAgendaBlockScope({ staff_agenda_block_scope: 'tudo', staff_can_block_agenda: false })).toBe('none');
    expect(resolveStaffAgendaBlockScope({ staff_agenda_block_scope: 'tudo' })).toBe('own');
    expect(resolveStaffAgendaBlockScope(null)).toBe('own');
    expect(resolveStaffAgendaBlockScope(undefined)).toBe('own');
  });

  it('opções do card em pt-BR, na ordem none/own/all', () => {
    expect(STAFF_AGENDA_BLOCK_SCOPE_OPTIONS.map((o) => [o.value, o.label])).toEqual([
      ['none', 'Não podem bloquear'],
      ['own', 'Podem bloquear a própria agenda'],
      ['all', 'Podem bloquear todas'],
    ]);
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
