import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildRecoveryRedirectUrl,
  captureRecoveryCallback,
  classifyRecoveryError,
  parseRecoveryCallback,
  takeRecoveryCallback,
  __setPendingRecoveryCallback,
} from '@/utils/authRecoveryLink';

const ORIGIN = 'https://www.agendixstudio.com';

describe('buildRecoveryRedirectUrl', () => {
  it('volta para a raiz do domínio atual com marcador e sem fragmento', () => {
    expect(buildRecoveryRedirectUrl(ORIGIN)).toBe('https://www.agendixstudio.com/?fluxo=nova-senha');
    expect(buildRecoveryRedirectUrl('http://localhost:3000/')).toBe('http://localhost:3000/?fluxo=nova-senha');
  });

  it('nunca aponta para o domínio antigo', () => {
    expect(buildRecoveryRedirectUrl(ORIGIN)).not.toMatch(/promptdeelite/);
  });
});

describe('parseRecoveryCallback', () => {
  it('fluxo implícito: tokens no fragmento (#access_token=…&type=recovery)', () => {
    const cb = parseRecoveryCallback(`${ORIGIN}/?fluxo=nova-senha#access_token=AT&expires_in=3600&refresh_token=RT&token_type=bearer&type=recovery`);
    expect(cb).toEqual({ kind: 'implicit', accessToken: 'AT', refreshToken: 'RT' });
  });

  it('fluxo implícito sem marcador (link antigo que caiu no Site URL)', () => {
    const cb = parseRecoveryCallback(`${ORIGIN}/#access_token=AT&refresh_token=RT&type=recovery`);
    expect(cb.kind).toBe('implicit');
  });

  it('formato legado com rota no hash (#/update-password?access_token=…)', () => {
    const cb = parseRecoveryCallback(`${ORIGIN}/#/update-password?access_token=AT&refresh_token=RT&type=recovery`);
    expect(cb).toEqual({ kind: 'implicit', accessToken: 'AT', refreshToken: 'RT' });
  });

  it('PKCE: ?code= com o marcador', () => {
    expect(parseRecoveryCallback(`${ORIGIN}/?fluxo=nova-senha&code=abc-123`)).toEqual({ kind: 'pkce', code: 'abc-123' });
  });

  it('token_hash (template com {{ .TokenHash }})', () => {
    expect(parseRecoveryCallback(`${ORIGIN}/?token_hash=th_1&type=recovery`)).toEqual({ kind: 'token_hash', tokenHash: 'th_1' });
  });

  it('link expirado: erro no fragmento vira reason=expired', () => {
    const cb = parseRecoveryCallback(
      `${ORIGIN}/?fluxo=nova-senha#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`,
    );
    expect(cb).toEqual({ kind: 'error', reason: 'expired', code: 'otp_expired' });
  });

  it('erro PKCE na query também é reconhecido', () => {
    const cb = parseRecoveryCallback(`${ORIGIN}/?fluxo=nova-senha&error=invalid_request&error_description=bad+code`);
    expect(cb).toEqual({ kind: 'error', reason: 'invalid', code: 'invalid_request' });
  });

  it('não intercepta confirmação de cadastro (type=signup) nem rotas normais', () => {
    expect(parseRecoveryCallback(`${ORIGIN}/#access_token=AT&refresh_token=RT&type=signup`).kind).toBe('none');
    expect(parseRecoveryCallback(`${ORIGIN}/#error=access_denied&error_code=otp_expired`).kind).toBe('none');
    expect(parseRecoveryCallback(`${ORIGIN}/#/agenda`).kind).toBe('none');
    expect(parseRecoveryCallback(`${ORIGIN}/#/update-password`).kind).toBe('none');
    expect(parseRecoveryCallback('not a url').kind).toBe('none');
  });
});

describe('classifyRecoveryError', () => {
  it('distingue expirado de inválido', () => {
    expect(classifyRecoveryError('otp_expired', null)).toBe('expired');
    expect(classifyRecoveryError(null, 'Email link is invalid or has expired')).toBe('expired');
    expect(classifyRecoveryError('access_denied', 'something else')).toBe('invalid');
  });
});

describe('captureRecoveryCallback / takeRecoveryCallback', () => {
  beforeEach(() => __setPendingRecoveryCallback(null));

  function fakeWindow(href: string) {
    const url = new URL(href);
    const calls: string[] = [];
    return {
      calls,
      win: {
        location: { href, pathname: url.pathname, hash: url.hash } as unknown as Location,
        history: { replaceState: (_s: unknown, _t: string, u: string) => calls.push(u) } as unknown as History,
      },
    };
  }

  it('limpa tokens da URL e entrega o callback uma única vez', () => {
    const { win, calls } = fakeWindow(`${ORIGIN}/?fluxo=nova-senha#access_token=AT&refresh_token=RT&type=recovery`);
    const cb = captureRecoveryCallback(win);
    expect(cb.kind).toBe('implicit');
    expect(calls).toEqual(['/#/update-password']);
    expect(takeRecoveryCallback().kind).toBe('implicit');
    expect(takeRecoveryCallback().kind).toBe('none');
  });

  it('não mexe na URL quando não é retorno de recuperação', () => {
    const { win, calls } = fakeWindow(`${ORIGIN}/#/login`);
    expect(captureRecoveryCallback(win).kind).toBe('none');
    expect(calls).toEqual([]);
    expect(takeRecoveryCallback().kind).toBe('none');
  });

  it('sem window (SSR/teste) é no-op', () => {
    expect(captureRecoveryCallback(undefined).kind).toBe('none');
  });
});
