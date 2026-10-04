import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import {
  clientEditRequestSentMessage,
  formatAgendaAlteracao,
  clientEditReservedIso,
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

  it('agenda mostra de/para', () => {
    expect(formatAgendaAlteracao(
      '2026-10-04T13:00:00.000Z',
      '2026-10-04T15:00:00.000Z',
      'America/Sao_Paulo',
    )).toBe('Alteração: de 04/10 · 10:00 para 04/10 · 12:00');
  });

  it('horário reservado usa original quando is_edit', () => {
    expect(clientEditReservedIso({
      appointment_time: '2026-10-05T12:00:00.000Z',
      original_appointment_time: '2026-10-04T13:00:00.000Z',
      is_edit: true,
    })).toBe('2026-10-04T13:00:00.000Z');
  });

  it('setting tem o rótulo aprovado', () => {
    expect(SERVICE_ONLY_EDIT_SKIP_LABEL).toBe('Trocar só o serviço sem aprovação');
  });
});
