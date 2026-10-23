import { describe, expect, it } from 'vitest';
import * as frontend from '../../utils/checkoutAllowlist';
import * as edge from '../../supabase/functions/create-checkout-session/allowlist';

describe.each([['frontend', frontend], ['edge', edge]] as const)('%s checkout origins', (_, api) => {
  it.each([
    'https://rhian-lepore-attacker.vercel.app/#/phishing',
    'https://rhian-lepore.attacker.vercel.app/',
    'https://attacker-rhian-lepore.vercel.app/',
    'https://www.agendixstudio.com.attacker.invalid/',
    'https://www.agendixstudio.com@attacker.invalid/',
    'javascript:alert(1)',
    'data:text/html,hello',
  ])('rejects unconfigured origin %s', (url) => {
    expect(api.isAllowedReturnUrl(url, api.collectAllowedOrigins())).toBe(false);
  });

  it('permits production, local development and an explicitly configured preview', () => {
    const preview = 'https://agendix-preview-fixture.vercel.app';
    const origins = api.collectAllowedOrigins(preview);
    for (const url of [
      'https://www.agendixstudio.com/#/?session_id={CHECKOUT_SESSION_ID}',
      'https://agendixstudio.com/#/',
      'http://localhost:3000/#/',
      `${preview}/#/configuracoes/assinatura`,
    ]) expect(api.isAllowedReturnUrl(url, origins)).toBe(true);
  });
});
