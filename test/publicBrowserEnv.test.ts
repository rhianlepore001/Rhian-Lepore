import { describe, expect, it } from 'vitest';
import { publicBrowserDefines } from '../scripts/publicBrowserEnv';

describe('variáveis públicas do build', () => {
  it('projeta apenas a configuração pública usada pelo aplicativo', () => {
    expect(publicBrowserDefines({
      VITE_SUPABASE_URL: 'https://example.invalid',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_fixture',
      VITE_STRIPE_PRICE_SOLO_BRL: 'price_fixture',
      VITE_META_PIXEL_ID: '1234',
      VITE_GEMINI_API_KEY: 'gemini-fixture',
      VITE_OPENROUTER_API_KEY: 'openrouter-fixture',
      VITE_SUPABASE_SERVICE_ROLE_KEY: 'service-role-fixture',
      GEMINI_API_KEY: 'gemini-server-fixture',
    })).toEqual({
      'import.meta.env.VITE_SUPABASE_URL': '"https://example.invalid"',
      'import.meta.env.VITE_SUPABASE_ANON_KEY': '"sb_publishable_fixture"',
      'import.meta.env.VITE_STRIPE_PRICE_SOLO_BRL': '"price_fixture"',
      'import.meta.env.VITE_META_PIXEL_ID': '"1234"',
    });
  });

  it('recusa chaves de servidor configuradas como chave pública', () => {
    const fixtureJwt = (role: string) => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
    expect(() => publicBrowserDefines({ VITE_SUPABASE_ANON_KEY: 'sb_secret_fixture' })).toThrow('requer a chave publicável');
    expect(() => publicBrowserDefines({ VITE_SUPABASE_ANON_KEY: fixtureJwt('service_role') })).toThrow('requer a chave publicável');
    expect(publicBrowserDefines({ VITE_SUPABASE_ANON_KEY: fixtureJwt('anon') })).toHaveProperty(['import.meta.env.VITE_SUPABASE_ANON_KEY']);
  });
});
