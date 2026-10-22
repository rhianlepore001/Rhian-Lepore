export interface PhoneCountryConfig {
  dialCode: string;
  nationalLength: { min: number; max: number };
  formatter: (digits: string) => string;
  placeholder: string;
  flag: string;
}

function formatBrazilian(digits: string): string {
  if (digits.length > 10) {
    return digits.replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
  }
  if (digits.length > 5) {
    return digits.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  }
  if (digits.length > 2) {
    return digits.replace(/^(\d\d)(\d{0,5}).*/, '($1) $2');
  }
  return digits;
}

function formatPortuguese(digits: string): string {
  if (digits.length > 6) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3}).*/, '$1 $2 $3');
  }
  if (digits.length > 3) {
    return digits.replace(/^(\d{3})(\d{3})(\d{0,3}).*/, '$1 $2 $3');
  }
  return digits;
}

export const PHONE_COUNTRIES = {
  BR: {
    dialCode: '55',
    nationalLength: { min: 10, max: 11 },
    formatter: formatBrazilian,
    placeholder: '(99) 99999-9999',
    flag: '🇧🇷',
  },
  PT: {
    dialCode: '351',
    nationalLength: { min: 9, max: 9 },
    formatter: formatPortuguese,
    placeholder: '999 999 999',
    flag: '🇵🇹',
  },
} satisfies Record<string, PhoneCountryConfig>;

export type PhoneCountry = keyof typeof PHONE_COUNTRIES;

function nationalDigits(input: string, country: PhoneCountry): string {
  const config = PHONE_COUNTRIES[country];
  let digits = input.replace(/\D/g, '');
  const hasExplicitDialCode = input.trim().startsWith('+' + config.dialCode);
  if (hasExplicitDialCode) digits = digits.slice(config.dialCode.length);

  while (digits.startsWith(config.dialCode) && digits.length > config.nationalLength.max) {
    digits = digits.slice(config.dialCode.length);
  }
  return digits;
}

export function toE164(input: string, country: PhoneCountry): string {
  const config = PHONE_COUNTRIES[country];
  let digits = input.replace(/\D/g, '');
  const hasExplicitDialCode = input.trim().startsWith('+' + config.dialCode);
  if (hasExplicitDialCode) digits = digits.slice(config.dialCode.length);

  while (digits.startsWith(config.dialCode) && digits.length > config.dialCode.length) {
    digits = digits.slice(config.dialCode.length);
  }

  const maxNationalDigits = Math.min(config.nationalLength.max, 15 - config.dialCode.length);
  digits = digits.slice(0, maxNationalDigits);
  return digits ? `+${config.dialCode}${digits}` : '';
}

export function formatNational(value: string, country: PhoneCountry): string {
  const config = PHONE_COUNTRIES[country];
  const digits = nationalDigits(value, country).slice(0, config.nationalLength.max);
  return config.formatter(digits);
}

export function isValidPhone(value: string, country: PhoneCountry): boolean {
  const config = PHONE_COUNTRIES[country];
  const digits = nationalDigits(value, country);
  return digits.length >= config.nationalLength.min
    && digits.length <= config.nationalLength.max
    && digits.length + config.dialCode.length <= 15;
}

export function getPhoneCountry(value: string): PhoneCountry | undefined {
  const digits = value.replace(/\D/g, '');
  return (Object.keys(PHONE_COUNTRIES) as PhoneCountry[]).find(country => {
    const config = PHONE_COUNTRIES[country];
    return value.trim().startsWith('+' + config.dialCode)
      || (digits.startsWith(config.dialCode) && digits.length > config.nationalLength.max);
  });
}

export function getNationalDigits(value: string, country: PhoneCountry): string {
  return nationalDigits(value, country);
}
