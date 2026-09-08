import { describe, expect, it } from 'vitest';
import {
  buildQueueClosePayload,
  buildQueueSettlePayload,
  sumQueueTicketTotal,
} from '@/utils/queueTicketPayload';

describe('queueTicketPayload', () => {
  it('settle lança serviço + extras; produto fica só na venda própria (sem duplicar receita)', () => {
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
      finalPrice: 70,
      professionalId: 'pro-1',
      paymentMethod: 'cash',
    });
  });

  it('já pago com extras cobra só os extras com o método informado', () => {
    const settle = buildQueueSettlePayload({
      entryId: 'q-4',
      baseServiceName: 'Corte',
      basePrice: 40,
      extraServices: [{ name: 'Sobrancelha', price: 15 }],
      alreadyPaid: false,
      paymentMethod: 'cash',
    });
    expect(settle.finalPrice).toBe(55);
    expect(settle.paymentMethod).toBe('cash');
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
    expect(buildQueueClosePayload('q-2')).toEqual({ entryId: 'q-2', items: [] });
    expect(buildQueueClosePayload('q-3', {
      extraServices: [{ id: 's-1', name: 'Barba', price: 35 }],
      productLines: [{ id: 'p-1', name: 'Pomada', price: 20 }],
    })).toEqual({
      entryId: 'q-3',
      items: [
        { kind: 'service', id: 's-1', name: 'Barba', price: 35 },
        { kind: 'product', id: 'p-1', name: 'Pomada', price: 20 },
      ],
    });
  });
});
