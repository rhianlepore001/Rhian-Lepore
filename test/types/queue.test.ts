import { describe, expect, it } from 'vitest';
import {
  joinQueueInputSchema,
  queueEntrySchema,
  queuePublicBoardSchema,
  queueSettingsSchema,
} from '@/types/queue';

describe('queue types v2', () => {
  it('aceita entry legado sem campos novos', () => {
    const parsed = queueEntrySchema.parse({
      id: 'q-1',
      business_id: 'b-1',
      client_name: 'João',
      client_phone: '11999999999',
      status: 'waiting',
      joined_at: '2026-09-06T10:00:00.000Z',
    });
    expect(parsed.payment_status).toBeUndefined();
  });

  it('aceita join com método de pagamento', () => {
    const parsed = joinQueueInputSchema.parse({
      businessId: 'b-1',
      clientName: 'Maria',
      clientPhone: '11988887777',
      serviceId: 'svc-1',
      paymentMethod: 'pix',
    });
    expect(parsed.paymentMethod).toBe('pix');
  });

  it('board público rejeita telefone', () => {
    expect('client_phone' in queuePublicBoardSchema.shape).toBe(false);
    const parsed = queuePublicBoardSchema.parse({
      entryId: 'q-1',
      status: 'waiting',
      paymentStatus: 'awaiting_confirmation',
      serviceName: 'Corte',
      position: 2,
      etaMinutes: 25,
      people: [{ position: 1, firstName: 'João', isYou: false }],
      settings: { allowLeave: true, lateMinutes: 10 },
      calledAt: null,
    });
    expect(parsed.people[0].firstName).toBe('João');
  });

  it('settings rejeita modo inválido e atraso fora da faixa', () => {
    expect(() => queueSettingsSchema.parse({
      queueMode: 'hybrid',
      allowLeave: true,
      lateMinutes: 10,
    })).toThrow();
    expect(() => queueSettingsSchema.parse({
      queueMode: 'shared',
      allowLeave: true,
      lateMinutes: 0,
    })).toThrow();
  });
});
