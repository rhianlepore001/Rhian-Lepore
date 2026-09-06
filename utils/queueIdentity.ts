import type { Region } from '@/utils/formatters';
import { minClientPhoneDigits } from '@/lib/club-payment';

export function nationalPhoneDigits(phone: string, region: Region): string {
  const digits = phone.replace(/\D/g, '');
  const country = region === 'PT' ? '351' : '55';
  if (digits.startsWith(country) && digits.length > country.length) {
    return digits.slice(country.length);
  }
  return digits;
}

export function isQueueIdentityPhoneValid(phone: string, region: Region): boolean {
  return nationalPhoneDigits(phone, region).length >= minClientPhoneDigits(region);
}
