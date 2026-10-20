export function redactPrivateBookingTokens(value: string): string {
  return value
    .replace(/([?&#](?:token|management_token|p_token)=)[^&#\s"'<>)]*/gi, '$1[redacted]')
    .replace(/\b[a-f0-9]{64}\b/gi, '[redacted]');
}

export function redactPrivateBookingDiagnostic(value: unknown, depth = 0): any {
  if (typeof value === 'string') return redactPrivateBookingTokens(value);
  if (value == null || typeof value !== 'object') return value;
  if (depth > 6) return '[omitted]';
  if (value instanceof Error) return {
    name: value.name,
    message: redactPrivateBookingTokens(value.message),
    stack: value.stack ? redactPrivateBookingTokens(value.stack) : null,
  };
  if (Array.isArray(value)) return value.map(item => redactPrivateBookingDiagnostic(item, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    /^(?:token|management_token|managementToken|p_token)$/i.test(key)
      ? '[redacted]'
      : redactPrivateBookingDiagnostic(item, depth + 1),
  ]));
}
