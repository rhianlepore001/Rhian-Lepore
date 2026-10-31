import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ATTRIBUTION_KEY,
  buildSignupAttributionPayload,
  captureFirstTouch,
  clearAttribution,
  saveSignupAttribution,
} from '../../lib/signupAttribution';
import { CONSENT_KEY } from '../../lib/marketingConsent';

function visit(url: string, referrer = '') {
  window.history.replaceState({}, '', url);
  Object.defineProperty(document, 'referrer', { value: referrer, configurable: true });
}
const stored = () => JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || 'null');
const consent = (choice: 'accepted' | 'rejected') =>
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: 1, choice, savedAt: Date.now() }));

describe('captura da origem do cadastro (primeiro contato)', () => {
  beforeEach(() => {
    localStorage.clear();
    visit('/', '');
  });

  it('guarda UTMs, fbclid, site de origem e página de entrada na primeira visita', () => {
    visit('/?utm_source=instagram&utm_medium=paid&utm_campaign=lancamento&utm_content=reels1&utm_term=barbearia&fbclid=IwAR_abc-123#/register', 'https://l.instagram.com/path?token=secreto#frag');
    captureFirstTouch();
    expect(stored()).toMatchObject({
      utm_source: 'instagram', utm_medium: 'paid', utm_campaign: 'lancamento', utm_content: 'reels1', utm_term: 'barbearia',
      fbclid: 'IwAR_abc-123', referrer: 'https://l.instagram.com/path', landing_path: '/register',
    });
  });

  it('lê UTMs que vêm depois do # (rotas do app)', () => {
    visit('/#/register?utm_source=google&utm_medium=cpc');
    captureFirstTouch();
    expect(stored()).toMatchObject({ utm_source: 'google', utm_medium: 'cpc', landing_path: '/register' });
  });

  it('NÃO sobrescreve: uma segunda visita com outras UTMs mantém a primeira', () => {
    visit('/?utm_source=instagram#/login');
    captureFirstTouch();
    visit('/?utm_source=google#/register');
    captureFirstTouch();
    expect(stored().utm_source).toBe('instagram');
    expect(stored().landing_path).toBe('/login');
  });

  it('visita direta também é registrada (sem UTMs), para sabermos que veio sem campanha', () => {
    visit('/#/login');
    captureFirstTouch();
    expect(stored()).toMatchObject({ landing_path: '/login' });
    expect(stored().utm_source).toBeUndefined();
  });

  it('ignora referrer do próprio site', () => {
    visit('/#/login', window.location.origin + '/qualquer');
    captureFirstTouch();
    expect(stored().referrer).toBeUndefined();
  });

  it('só registra páginas públicas de aquisição (nunca agendamento público, convite, área do cliente)', () => {
    for (const hash of ['#/book/salao-x', '#/queue/abc', '#/minha-area', '#/clube/x', '#/dashboard', '#/staff-invite?token=1']) {
      localStorage.clear();
      visit('/?utm_source=x' + hash);
      captureFirstTouch();
      expect(stored(), hash).toBeNull();
    }
  });

  it('nunca guarda a query da página de entrada (podem existir convites/tokens)', () => {
    visit('/#/register?invite=SEGREDO&utm_source=a');
    captureFirstTouch();
    expect(JSON.stringify(stored())).not.toContain('SEGREDO');
  });

  it('limpa e limita valores (tamanho, caracteres de controle e marcação)', () => {
    visit('/?utm_source=' + encodeURIComponent('a'.repeat(300)) + '&utm_campaign=' + encodeURIComponent('<b>x</b>\u0000\n') + '&fbclid=' + encodeURIComponent('ruim valor!') + '#/login');
    captureFirstTouch();
    expect(stored().utm_source).toHaveLength(100);
    expect(stored().utm_campaign).toBe('bx/b');
    expect(stored().fbclid).toBeUndefined();
  });

  it('não quebra se o armazenamento do navegador estiver bloqueado', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    visit('/?utm_source=x#/login');
    expect(() => captureFirstTouch()).not.toThrow();
    spy.mockRestore();
  });

  it('não altera a URL (o Pixel da Meta lê fbclid dela) nem o consentimento', () => {
    visit('/?fbclid=abc123&utm_source=x#/register');
    const before = window.location.href;
    const replace = vi.spyOn(window.history, 'replaceState');
    consent('rejected');
    const consentBefore = localStorage.getItem(CONSENT_KEY);
    captureFirstTouch();
    expect(window.location.href).toBe(before);
    expect(replace).not.toHaveBeenCalled();
    expect(localStorage.getItem(CONSENT_KEY)).toBe(consentBefore);
    replace.mockRestore();
  });

  it('descarta registro antigo (mais de 90 dias) e captura de novo', () => {
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({ v: 1, capturedAt: Date.now() - 91 * 86400000, utm_source: 'velho' }));
    visit('/?utm_source=novo#/register');
    captureFirstTouch();
    expect(stored().utm_source).toBe('novo');
  });

  it('registro corrompido é ignorado', () => {
    localStorage.setItem(ATTRIBUTION_KEY, '{nao-e-json');
    visit('/?utm_source=ok#/register');
    expect(() => captureFirstTouch()).not.toThrow();
    expect(stored().utm_source).toBe('ok');
  });
});

describe('envio no cadastro', () => {
  beforeEach(() => { localStorage.clear(); visit('/?utm_source=ig&fbclid=abc#/register', 'https://l.instagram.com/'); });

  it('fbclid só vai ao servidor com consentimento de marketing aceito', () => {
    captureFirstTouch();
    consent('rejected');
    expect(buildSignupAttributionPayload()).not.toHaveProperty('p_fbclid', 'abc');
    expect(buildSignupAttributionPayload()?.p_fbclid).toBeNull();
    consent('accepted');
    expect(buildSignupAttributionPayload()?.p_fbclid).toBe('abc');
  });

  it('monta o pacote com UTMs, origem, entrada e navegador', () => {
    captureFirstTouch();
    const p = buildSignupAttributionPayload()!;
    expect(p).toMatchObject({ p_utm_source: 'ig', p_referrer: 'https://l.instagram.com/', p_landing_path: '/register' });
    expect(typeof p.p_user_agent === 'string' || p.p_user_agent === null).toBe(true);
    expect(p.p_user_agent === null || p.p_user_agent.length <= 300).toBe(true);
  });

  it('sem registro guardado, não há o que enviar', () => {
    expect(buildSignupAttributionPayload()).toBeNull();
  });

  it('salva via função do servidor e limpa o registro local', async () => {
    captureFirstTouch();
    const rpc = vi.fn().mockResolvedValue({ data: 'saved', error: null });
    await saveSignupAttribution({ rpc });
    expect(rpc).toHaveBeenCalledWith('save_signup_attribution', expect.objectContaining({ p_utm_source: 'ig' }));
    expect(stored()).toBeNull();
  });

  it('falha ao salvar nunca derruba o cadastro e mantém o registro para nova tentativa', async () => {
    captureFirstTouch();
    await expect(saveSignupAttribution({ rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'x' } }) })).resolves.toBeUndefined();
    expect(stored()).not.toBeNull();
    await expect(saveSignupAttribution({ rpc: vi.fn().mockRejectedValue(new Error('rede')) })).resolves.toBeUndefined();
    expect(stored()).not.toBeNull();
  });

  it('sem registro, nem chama o servidor', async () => {
    const rpc = vi.fn();
    await saveSignupAttribution({ rpc });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('clearAttribution remove o registro', () => {
    captureFirstTouch();
    clearAttribution();
    expect(stored()).toBeNull();
  });
});
