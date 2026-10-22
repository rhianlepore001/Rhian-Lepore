import { describe, expect, it } from 'vitest';
import { formatNational, isValidPhone, toE164 } from '@/utils/phoneCountry';

describe('phone country helpers', () => {
  it('preserves Brazilian mobile and landline formatting', () => {
    expect(toE164('11987654321', 'BR')).toBe('+5511987654321');
    expect(formatNational('+5511987654321', 'BR')).toBe('(11) 98765-4321');
    expect(toE164('1132654321', 'BR')).toBe('+551132654321');
    expect(formatNational('+551132654321', 'BR')).toBe('(11) 3265-4321');
    expect(isValidPhone('+551132654321', 'BR')).toBe(true);
  });

  it('normalizes and formats Portuguese numbers', () => {
    expect(toE164('912345678', 'PT')).toBe('+351912345678');
    expect(formatNational('+351912345678', 'PT')).toBe('912 345 678');
    expect(isValidPhone('+351912345678', 'PT')).toBe(true);
  });

  it('strips pasted and repeated dial codes', () => {
    expect(toE164('+351 912 345 678', 'PT')).toBe('+351912345678');
    expect(toE164('5511987654321', 'BR')).toBe('+5511987654321');
    expect(toE164('+55 55 11 98765 4321', 'BR')).toBe('+5511987654321');
  });

  it('caps input at the national maximum and the E.164 limit', () => {
    expect(toE164('119876543219999', 'BR')).toBe('+5511987654321');
    expect(toE164('912345678999', 'PT')).toBe('+351912345678');
    expect(isValidPhone('+3519123456789', 'PT')).toBe(false);
  });
});
