import { describe, expect, it } from 'vitest';
import { isQueueIdentityPhoneValid, nationalPhoneDigits } from '@/utils/queueIdentity';

describe('queueIdentity', () => {
  it('conta so o nacional depois do DDI', () => {
    expect(nationalPhoneDigits('+351927688674', 'PT')).toBe('927688674');
    expect(nationalPhoneDigits('+5511988887777', 'BR')).toBe('11988887777');
  });

  it('valida WhatsApp PT com 9 digitos nacionais', () => {
    expect(isQueueIdentityPhoneValid('+351927688674', 'PT')).toBe(true);
    expect(isQueueIdentityPhoneValid('+35192768', 'PT')).toBe(false);
  });
});
