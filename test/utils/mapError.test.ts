import { describe, it, expect } from 'vitest';
import { mapError, formatUserFacingError, isEmailTakenError } from '../../utils/mapError';
import { messageForBookingAcceptError } from '../../utils/agendaBlockPermission';

describe('mapError', () => {
  it('usa o fallback PT-BR quando o código é desconhecido', () => {
    const out = mapError(new Error('boom'), 'Algo deu errado. Tente de novo.');
    expect(out.message).toBe('Algo deu errado. Tente de novo.');
    expect(out.code).toMatch(/^#/);
  });

  it('traduz códigos de Postgres conhecidos (23505 unique violation)', () => {
    const out = mapError({ code: '23505', message: 'duplicate key' }, 'fallback');
    expect(out.message).toContain('já existe');
    expect(out.code).toBe('#23505');
  });

  it('traduz auth expirada por status HTTP 401', () => {
    const out = mapError({ status: 401 }, 'fallback');
    expect(out.message).toContain('sessão expirou');
  });

  it('traduz falha de rede por TypeError do fetch', () => {
    const out = mapError(
      { name: 'TypeError', message: 'Failed to fetch' },
      'fallback'
    );
    expect(out.message).toContain('conexão');
  });

  it('nunca expõe a mensagem técnica original como copy', () => {
    const out = mapError(new Error('Postgres ERROR: relation does not exist'), 'fallback');
    expect(out.message).toBe('fallback');
    expect(out.message).not.toContain('Postgres');
  });

  it('formatUserFacingError combina message + code', () => {
    const out = mapError({ code: '23505' }, 'fallback');
    const formatted = formatUserFacingError(out);
    expect(formatted).toContain(out.message);
    expect(formatted).toContain('#23505');
  });

  it('traduz slot_unavailable para copy de horário ocupado', () => {
    const out = mapError({ message: 'slot_unavailable' }, 'fallback');
    expect(out.message).toContain('horário acabou de ser ocupado');
    expect(out.code).toBe('#slotunav');
  });

  it('traduz e-mail já cadastrado no Auth (user_already_exists)', () => {
    const out = mapError(
      { code: 'user_already_exists', message: 'User already registered' },
      'Não foi possível criar a conta.'
    );
    expect(out.message).toContain('e-mail já tem conta');
    expect(out.message).not.toContain('User already');
    expect(out.code).toBe('#useralre');
    expect(formatUserFacingError(out)).toBe(out.message);
    expect(formatUserFacingError(out)).not.toContain('#useralre');
  });

  it('reconhece email_exists e a mensagem already registered', () => {
    expect(mapError({ code: 'email_exists' }, 'fallback').message).toContain('já tem conta');
    expect(
      mapError({ message: 'User already registered' }, 'Não foi possível criar a conta.').message
    ).toContain('já tem conta');
    expect(isEmailTakenError({ code: 'user_already_exists' })).toBe(true);
    expect(isEmailTakenError({ message: 'User already registered' })).toBe(true);
    expect(isEmailTakenError({ code: 'invalid_login' })).toBe(false);
  });

  it('traduz professional_blocked para M1 com o nome do profissional', () => {
    const out = mapError({
      code: 'P0001',
      hint: 'professional_blocked',
      message: 'Horário bloqueado na agenda de Diego. Para agendar, remova o bloqueio primeiro.',
    }, 'fallback');
    expect(out.message).toBe('Horário bloqueado na agenda de Diego. Para agendar, remova o bloqueio primeiro.');
    expect(mapError({ code: 'agenda_blocked', message: 'agenda_blocked' }, 'fallback').message)
      .toBe('Horário bloqueado na agenda de profissional. Para agendar, remova o bloqueio primeiro.');
    const fromTrigger = mapError(
      { code: 'P0001', message: 'Este horário está bloqueado. Remova o bloqueio para agendar.' },
      'fallback',
    );
    expect(fromTrigger.message).toContain('remova o bloqueio primeiro');
    expect(fromTrigger.message).not.toContain('permissão');
  });

  it('M2 é a mensagem do aceite, separada do M1', () => {
    expect(messageForBookingAcceptError({
      message: 'Horário bloqueado na agenda de Bruna. Para agendar, remova o bloqueio primeiro.',
    })).toBe('Não foi possível aceitar: o horário deste pedido está bloqueado na agenda de Bruna. Recuse o pedido ou remova o bloqueio.');
    expect(messageForBookingAcceptError({ message: 'slot_unavailable' })).toBeNull();
  });
});
