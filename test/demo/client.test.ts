import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { isDemoMode } from '../../lib/demo/mode';
import { createDemoClient } from '../../lib/demo/client';

beforeEach(() => { window.location.hash = '#/demo/barber/agenda'; });

describe('isolamento da simulação', () => {
  it.each(['#/demo', '#/demo/', '#/demo/beauty', '#/demo/barber/agenda', '#/demo?tour=1'])('reconhece %s', hash => {
    expect(isDemoMode(hash)).toBe(true);
  });
  it.each(['', '#/', '#/demonstracao', '#/demo-outro', '#/agenda', '#/book/demo-barbearia-corte-fino'])('exclui %s', hash => {
    expect(isDemoMode(hash)).toBe(false);
  });
  it('não cria cliente real ao importar nem ao consultar a demo', async () => {
    vi.mocked(createClient).mockClear();
    const { supabase } = await import('../../lib/supabase');
    const result = await supabase.from('services').select('*');
    expect(result.data?.length).toBeGreaterThan(0);
    expect(createClient).not.toHaveBeenCalled();
    expect(() => (supabase as any).supabaseUrl).toThrow(/simulação/i);
  });
  it('falha fechado para RPC, tabela, storage e método desconhecidos', () => {
    const client = createDemoClient();
    expect(() => client.rpc('unknown_rpc')).toThrow(/simulação/i);
    expect(() => client.from('unknown_table')).toThrow(/simulação/i);
    expect(() => (client as any).storage.from('photos').upload('x')).toThrow(/simulação/i);
    expect(() => (client.from('services') as any).unknown()).toThrow(/simulação/i);
  });
  it('isola tenants e reinicia o seed em um novo cliente', async () => {
    const first = createDemoClient();
    await first.from('clients').insert({ name: 'Só em memória' });
    expect((await first.from('clients').select('*')).data.some((c: any) => c.name === 'Só em memória')).toBe(true);
    window.location.hash = '#/demo/beauty';
    expect((await first.from('clients').select('*')).data.some((c: any) => c.name === 'Só em memória')).toBe(false);
    window.location.hash = '#/demo/barber';
    expect((await createDemoClient().from('clients').select('*')).data.some((c: any) => c.name === 'Só em memória')).toBe(false);
  });
  it('reavalia o hash em referências guardadas, sem encaminhar para produção', async () => {
    const { supabase } = await import('../../lib/supabase');
    const from = supabase.from;
    window.location.hash = '#/demo/beauty';
    expect((await from('profiles').select('*').single()).data.business_name).toBe('Studio Aurora');
  });
});

it('mantém a navegação interna e os links públicos dentro da simulação', async () => {
  const { demoPath } = await import('../../lib/demo/mode');
  expect(demoPath('/financeiro/performance?compare=1')).toBe('/demo/barber/financeiro/performance?compare=1');
  expect(demoPath('/book/simulacao-barber')).toBe('/demo/barber/book/simulacao-barber');
  expect(demoPath('/demo/barber/agenda')).toBe('/demo/barber/agenda');
});

it('encerra conexões reais ao entrar na demo por pushState', async () => {
  const { supabase, syncSupabaseMode } = await import('../../lib/supabase');
  window.location.hash = '#/agenda';
  await supabase.auth.getSession();
  const real = vi.mocked(createClient).mock.results.at(-1)?.value as any;
  real.auth.stopAutoRefresh = vi.fn();
  real.auth.startAutoRefresh = vi.fn();
  real.removeAllChannels = vi.fn();
  window.history.pushState(null, '', '/#/demo/barber');
  syncSupabaseMode();
  expect(real.auth.stopAutoRefresh).toHaveBeenCalledOnce();
  expect(real.removeAllChannels).toHaveBeenCalledOnce();
  window.history.pushState(null, '', '/#/login');
  syncSupabaseMode();
  expect(real.auth.startAutoRefresh).toHaveBeenCalledOnce();
});
