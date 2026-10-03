import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getOwnerAcceptWhatsAppText } from '@/utils/publicBookingCopy';

describe('getOwnerAcceptWhatsAppText — PR-1 fuso do negócio', () => {
  const originalTz = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = 'America/Sao_Paulo';
  });

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  const base = {
    isBeauty: false,
    customerName: 'João',
    businessName: 'Barbearia São João ✂️',
    appointmentTime: '2026-09-08T14:13:00+00:00',
    serviceNames: 'Corte',
    priceLabel: '50,00',
    currencySymbol: '€',
    establishmentFallback: 'Barbearia',
  };

  it('hora sai no fuso do negócio (Lisboa 15:13), não no do processo (São Paulo 11:13)', () => {
    const text = getOwnerAcceptWhatsAppText({
      ...base,
      timeZone: 'Europe/Lisbon',
    });
    expect(text).toContain('15:13');
    expect(text).not.toContain('11:13');
    expect(text).toContain('Barbearia São João ✂️');
  });

  it('Manaus (UTC−4) mostra 10:13 para o mesmo instante', () => {
    const text = getOwnerAcceptWhatsAppText({
      ...base,
      isBeauty: true,
      timeZone: 'America/Manaus',
    });
    expect(text).toContain('10:13');
    expect(text).not.toContain('15:13');
  });
});
