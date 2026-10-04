import { describe, expect, it } from 'vitest';
import {
  CANCEL_WINDOW_CLOSED_MESSAGE,
  CLIENT_CANCEL_CUTOFF_PRESETS,
  DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS,
  cancelCutoffPresetLabel,
  clampClientCancelCutoffHours,
  clientCancelCta,
  isCancelWindowClosedError,
  isClientCancelCutoffPreset,
  readCancelCutoffHours,
  talkToBusinessLabel,
} from '@/utils/clientCancelCutoff';

const APPT = '2026-10-04T15:00:00.000Z';

describe('clientCancelCutoff', () => {
  it('presets são 1, 2, 6, 12, 24, 48 e 0; padrão 2', () => {
    expect([...CLIENT_CANCEL_CUTOFF_PRESETS]).toEqual([1, 2, 6, 12, 24, 48, 0]);
    expect(DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS).toBe(2);
    expect(isClientCancelCutoffPreset(2)).toBe(true);
    expect(isClientCancelCutoffPreset(3)).toBe(false);
    expect(clampClientCancelCutoffHours(3)).toBe(2);
    expect(clampClientCancelCutoffHours(0)).toBe(0);
    expect(readCancelCutoffHours(0)).toBe(0);
    expect(readCancelCutoffHours(undefined)).toBe(2);
    expect(cancelCutoffPresetLabel(2)).toBe('2h');
    expect(cancelCutoffPresetLabel(0)).toBe('Não pode cancelar online');
  });

  it('pending cancela a qualquer momento antes do horário (mesmo cutoff 0 ou 1h restante)', () => {
    expect(clientCancelCta({
      status: 'pending',
      appointmentTime: APPT,
      cutoffHours: 2,
      now: '2026-10-04T14:00:00.000Z',
    })).toBe('cancel');
    expect(clientCancelCta({
      status: 'pending',
      appointmentTime: APPT,
      cutoffHours: 0,
      now: '2026-10-04T14:59:59.000Z',
    })).toBe('cancel');
  });

  it('confirmado 3h restantes com cutoff 2h → Cancelar', () => {
    expect(clientCancelCta({
      status: 'confirmed',
      appointmentTime: APPT,
      cutoffHours: 2,
      now: '2026-10-04T12:00:00.000Z',
    })).toBe('cancel');
  });

  it('confirmado 1h restante com cutoff 2h → WhatsApp', () => {
    expect(clientCancelCta({
      status: 'confirmed',
      appointmentTime: APPT,
      cutoffHours: 2,
      now: '2026-10-04T14:00:00.000Z',
    })).toBe('whatsapp');
  });

  it('limite exato: now === appointment - cutoff é permitido; 1ms depois não', () => {
    expect(clientCancelCta({
      status: 'confirmed',
      appointmentTime: APPT,
      cutoffHours: 2,
      now: '2026-10-04T13:00:00.000Z',
    })).toBe('cancel');
    expect(clientCancelCta({
      status: 'confirmed',
      appointmentTime: APPT,
      cutoffHours: 2,
      now: '2026-10-04T13:00:00.001Z',
    })).toBe('whatsapp');
  });

  it('cutoff 0 no confirmado nunca cancela online', () => {
    expect(clientCancelCta({
      status: 'confirmed',
      appointmentTime: APPT,
      cutoffHours: 0,
      now: '2026-10-04T05:00:00.000Z',
    })).toBe('whatsapp');
  });

  it('horário igual ou passado esconde o botão (pending e confirmed)', () => {
    expect(clientCancelCta({
      status: 'pending',
      appointmentTime: APPT,
      cutoffHours: 2,
      now: APPT,
    })).toBe('hidden');
    expect(clientCancelCta({
      status: 'confirmed',
      appointmentTime: APPT,
      cutoffHours: 2,
      now: '2026-10-04T15:00:00.001Z',
    })).toBe('hidden');
  });

  it('é independente de fuso: compara epoch, não relógio local', () => {
    expect(clientCancelCta({
      status: 'confirmed',
      appointmentTime: '2026-10-04T18:00:00+03:00',
      cutoffHours: 2,
      now: '2026-10-04T13:00:00.000Z',
    })).toBe('cancel');
    expect(clientCancelCta({
      status: 'confirmed',
      appointmentTime: '2026-10-04T12:00:00-03:00',
      cutoffHours: 2,
      now: '2026-10-04T14:00:00.001Z',
    })).toBe('whatsapp');
  });

  it('rótulo Falar com {negócio} e detecção do erro cancel_window_closed', () => {
    expect(talkToBusinessLabel('Barbearia São João')).toBe('Falar com Barbearia São João');
    expect(talkToBusinessLabel('  ')).toBe('Falar com o estabelecimento');
    expect(isCancelWindowClosedError({ message: 'cancel_window_closed' })).toBe(true);
    expect(isCancelWindowClosedError({ hint: 'P0001 cancel_window_closed' })).toBe(true);
    expect(isCancelWindowClosedError({ message: 'booking_not_cancellable' })).toBe(false);
    expect(CANCEL_WINDOW_CLOSED_MESSAGE).toMatch(/prazo para cancelar online/i);
  });
});
