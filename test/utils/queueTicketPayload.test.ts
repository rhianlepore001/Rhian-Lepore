import { describe, expect, it } from 'vitest';
import {
  buildQueueClosePayload,
  buildQueueSettlePayload,
  sumQueueTicketTotal,
} from '@/utils/queueTicketPayload';

describe('queueTicketPayload', () => {
  it('soma serviço, extras e produtos no settle', () => {
    const payload = buildQueueSettlePayload({
      entryId: 'q-1',
      baseServiceName: 'Corte',
      basePrice: 50,
      extraServices: [{ name: 'Barba', price: 20 }],
      productLines: [{ name: 'Pomada', price: 15 }],
      professionalId: 'pro-1',
      paymentMethod: 'cash',
    });
    expect(sumQueueTicketTotal({
      basePrice: 50,
      extraServices: [{ name: 'Barba', price: 20 }],
      productLines: [{ name: 'Pomada', price: 15 }],
    })).toBe(85);
    expect(payload).toEqual({
      entryId: 'q-1',
      serviceName: 'Corte + Barba',
      finalPrice: 85,
      professionalId: 'pro-1',
      paymentMethod: 'cash',
    });
  });

  it('já pago não reenvia método; close só manda o id', () => {
    const settle = buildQueueSettlePayload({
      entryId: 'q-2',
      baseServiceName: 'Corte',
      basePrice: 40,
      alreadyPaid: true,
      paymentMethod: 'pix',
    });
    expect(settle.paymentMethod).toBeNull();
    expect(buildQueueClosePayload('q-2')).toEqual({ entryId: 'q-2' });
  });
});
