import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import {
  clientEditRequestSentMessage,
  formatAgendaAlteracao,
  formatAgendaOnlineRequestsTitle,
  formatAgendaPublicBookingsSummary,
  formatAgendaRequestsBanner,
  formatStaffCannotActSummary,
  formatClientEditReservedLine,
  clientEditReservedIso,
  isClientEditPending,
  CLIENT_EDIT_PENDING_STATUS_LABEL,
  SERVICE_ONLY_EDIT_SKIP_LABEL,
} from '@/utils/clientEditRequest';

describe('clientEditRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('copy exata do pedido enviado no fuso do negócio', () => {
    const msg = clientEditRequestSentMessage('2026-10-04T13:00:00.000Z', 'America/Sao_Paulo');
    expect(msg).toBe(
      'Pedido de alteração enviado. Seu horário original (dom., 04 de out. às 10:00) continua reservado até a resposta.',
    );
  });

  it('linha do horário original reservado', () => {
    expect(formatClientEditReservedLine('2026-10-04T15:00:00.000Z', 'America/Sao_Paulo')).toBe(
      'Horário original reservado: dom., 04 de out. às 12:00',
    );
  });

  it('agenda mostra de/para', () => {
    expect(formatAgendaAlteracao(
      '2026-10-04T13:00:00.000Z',
      '2026-10-04T15:00:00.000Z',
      'America/Sao_Paulo',
    )).toBe('Alteração: de 04/10 · 10:00 para 04/10 · 12:00');
  });

  it('horário reservado usa original quando pending AND is_edit', () => {
    expect(clientEditReservedIso({
      appointment_time: '2026-10-05T12:00:00.000Z',
      original_appointment_time: '2026-10-04T13:00:00.000Z',
      is_edit: true,
      status: 'pending',
    })).toBe('2026-10-04T13:00:00.000Z');
  });

  it('confirmed com is_edit stale usa o horário atual, não o original', () => {
    expect(clientEditReservedIso({
      appointment_time: '2026-10-05T12:00:00.000Z',
      original_appointment_time: '2026-10-04T13:00:00.000Z',
      is_edit: true,
      status: 'confirmed',
    })).toBe('2026-10-05T12:00:00.000Z');
    expect(isClientEditPending({ status: 'confirmed', is_edit: true })).toBe(false);
    expect(isClientEditPending({ status: 'pending', is_edit: true })).toBe(true);
  });

  it('setting tem o rótulo aprovado', () => {
    expect(SERVICE_ONLY_EDIT_SKIP_LABEL).toBe('Trocar só o serviço sem aprovação');
    expect(CLIENT_EDIT_PENDING_STATUS_LABEL).toBe('Alteração pendente');
  });

  it('banner da Agenda flexiona singular e plural', () => {
    expect(formatAgendaOnlineRequestsTitle(1)).toBe('1 solicitação online');
    expect(formatAgendaOnlineRequestsTitle(2)).toBe('2 solicitações online');
    expect(formatAgendaPublicBookingsSummary(1, 0)).toBe('1 alteração aguardando aprovação');
    expect(formatAgendaPublicBookingsSummary(2, 0)).toBe('2 alterações aguardando aprovação');
    expect(formatAgendaPublicBookingsSummary(1, 1)).toBe('1 pedido novo e 1 alteração');
    expect(formatAgendaPublicBookingsSummary(1, 2)).toBe('2 pedidos novos e 1 alteração');
    expect(formatAgendaPublicBookingsSummary(2, 1)).toBe('1 pedido novo e 2 alterações');
    expect(formatAgendaPublicBookingsSummary(0, 3)).toBe('Feitos pelo link público — aceite ou recuse.');
  });

  it('banner sem permissão: pedido para o profissional, sem aceite ou recuse', () => {
    expect(formatStaffCannotActSummary(
      [{ professional_id: 'a1' }],
      [{ id: 'a1', name: 'Aline X' }],
    )).toBe('Pedido para Aline X. Só Aline X ou o dono podem responder.');
    expect(formatStaffCannotActSummary(
      [{ professional_id: 'a1' }, { professional_id: 'a1' }],
      [{ id: 'a1', name: 'Aline X' }],
    )).toBe('Pedidos para Aline X. Só Aline X ou o dono podem responder.');
    expect(formatStaffCannotActSummary(
      [{ professional_id: 'a1' }, { professional_id: 'a2' }],
      [{ id: 'a1', name: 'Aline X' }, { id: 'a2', name: 'Yago Y' }],
    )).toBe('Pedidos para Aline X e Yago Y. Só Aline X, Yago Y ou o dono podem responder.');
    expect(formatStaffCannotActSummary(
      [{ professional_id: null }],
      [{ id: 'a1', name: 'Aline X' }],
    )).toBe('Pedido para qualquer profissional. Só o dono pode responder.');
  });

  it('contador do banner conta só o que o usuário pode aceitar', () => {
    const bookings = [
      { professional_id: 'a1', status: 'pending', is_edit: false },
      { professional_id: 'a2', status: 'pending', is_edit: false },
    ];
    const members = [{ id: 'a1', name: 'Aline X' }, { id: 'a2', name: 'Yago Y' }];
    expect(formatAgendaRequestsBanner({
      bookings,
      canActOnBooking: (b) => b.professional_id === 'a1',
      teamMembers: members,
    })).toEqual({
      title: '1 solicitação online',
      summary: 'Feitos pelo link público — aceite ou recuse.',
    });
    expect(formatAgendaRequestsBanner({
      bookings,
      canActOnBooking: () => false,
      teamMembers: members,
    })).toEqual({
      title: '2 solicitações online',
      summary: 'Pedidos para Aline X e Yago Y. Só Aline X, Yago Y ou o dono podem responder.',
    });
  });
});
