import { beforeEach, describe, expect, it, vi } from 'vitest';
import { areMetaParamsSafe, buildFbc, createMetaTracker, isMetaRoute } from '@/lib/metaTracking';
import { CONSENT_KEY, readConsent, saveConsent } from '@/lib/marketingConsent';
import { hashMatching } from '@/lib/metaMatching';

describe('marketing consent', () => {
  beforeEach(() => localStorage.clear());
  it('defaults to no consent and remembers either choice', () => {
    expect(readConsent()).toBe(null);
    saveConsent('rejected');
    expect(readConsent()).toBe('rejected');
    saveConsent('accepted');
    expect(readConsent()).toBe('accepted');
  });
  it('fails closed for corrupt, expired or unavailable storage', () => {
    localStorage.setItem(CONSENT_KEY, '{');
    expect(readConsent()).toBe(null);
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice: 'accepted', savedAt: 0, version: 1 }));
    expect(readConsent()).toBe(null);
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readConsent()).toBe(null);
    spy.mockRestore();
  });
});

describe('Meta tracking', () => {
  const flushSends = async () => {
    for (let index = 0; index < 5; index += 1) await Promise.resolve();
  };
  const setup = (pixelId = '123', pollFbp = false) => {
    let consent = false;
    const pixel = vi.fn();
    const send = vi.fn().mockResolvedValue(undefined);
    const tracker = createMetaTracker({
      pixelId, pixel, send, hasConsent: () => consent, once: new Set<string>(),
      waitForFbp: pollFbp ? undefined : async () => undefined,
    });
    return { tracker, pixel, send, accept: () => { consent = true; }, reject: () => { consent = false; } };
  };
  it.each(['/book/demo', '/queue/demo', '/queue-status/1', '/pro/demo', '/minha-area/demo', '/clube/demo', '/', '/agenda', '/clientes/1', '/onboarding-wizard', '/staff-onboarding', '/update-password', '/forgot-password'])('excludes %s', path => {
    expect(isMetaRoute(path, '', false)).toBe(false);
  });
  it.each(['/login', '/register', '/termos', '/privacidade'])('includes public acquisition route %s', path => {
    expect(isMetaRoute(path, '', false)).toBe(true);
    expect(isMetaRoute(path, '', true)).toBe(false);
  });
  it('excludes authenticated visitors and staff invites', () => {
    expect(isMetaRoute('/login', '', true)).toBe(false);
    expect(isMetaRoute('/register', '?company=owner&member=staff', false)).toBe(false);
    expect(isMetaRoute('/register', '?type=beauty', false)).toBe(true);
  });
  it.each([
    ['/login', '?token=secret'], ['/register', '?access_token=secret'],
    ['/register', '?type=beauty&token=secret'], ['/register', '?next=/book/private'],
    ['/login', '?type=recovery'], ['/register', '?type=beauty&type=barber'],
    ['/login', '?code=pkce'], ['/login', '?token_hash=abc'], ['/login', '?fluxo=nova-senha'],
    ['/login', '?refresh_token=abc'], ['/login', '?error=access_denied&error_code=otp_expired'],
    ['/register', '?email=person@example.com'], ['/login', '?utm_content=person@example.com'],
    ['/login', '?ref=/book/private'], ['/login', '?x=eyJhbGciOi.payload.sig'],
    ['/login', '?x=' + 'a'.repeat(201)],
  ])('rejects sensitive query parameters on %s%s', (path, search) => {
    expect(isMetaRoute(path, search, false)).toBe(false);
  });
  it.each([
    '?utm_id=123', '?ad_id=1&campaign_id=2&adset_id=3', '?placement=Instagram_Feed&site_source_name=ig',
    '?gclid=abc', '?ref=newsletter', '?utm_source=meta&utm_medium=paid&utm_campaign=x&utm_content=y&utm_term=z&fbclid=IwAR_1-2',
    '?campaign_name=promo%20verao&hsa_acc=1', '?promo_code=VERAO',
  ])('does not disable tracking for unknown but harmless params %s', search => {
    expect(areMetaParamsSafe(search)).toBe(true);
    expect(isMetaRoute('/login', search, false)).toBe(true);
  });
  it('keeps the register-only barber/beauty type rule', () => {
    expect(areMetaParamsSafe('type=barber')).toBe(true);
    expect(areMetaParamsSafe('?type=beauty&utm_id=1')).toBe(true);
    expect(areMetaParamsSafe('?type=signup')).toBe(false);
  });
  it('builds fbc only from a safe fbclid', () => {
    expect(buildFbc('IwAR_click-1.2', 1700000000000)).toBe('fb.1.1700000000000.IwAR_click-1.2');
    expect(buildFbc('bad value')).toBeUndefined();
    expect(buildFbc('')).toBeUndefined();
    expect(buildFbc(null)).toBeUndefined();
    expect(buildFbc('a'.repeat(300))).toBeUndefined();
  });
  it.each(['/book/private', '/minha-area/private', '/agenda', '/login'])('drops a captured registration after leaving for %s', async path => {
    const s = setup(); s.accept();
    s.tracker.pageView('/register', '', false);
    await flushSends();
    const context = s.tracker.captureRegistration();
    s.tracker.pageView(path, '', path === '/agenda');
    s.pixel.mockClear(); s.send.mockClear();
    s.tracker.lead(context, { email: 'person@example.com' });
    s.tracker.completeRegistration(context, { email: 'person@example.com' });
    expect(s.pixel).not.toHaveBeenCalled();
    expect(s.send).not.toHaveBeenCalled();
  });
  it('does not load or send anything without consent or a pixel ID', () => {
    for (const id of ['', '123']) {
      const s = setup(id);
      s.tracker.pageView('/login', '', false);
      s.tracker.lead(s.tracker.captureRegistration());
      expect(s.pixel).not.toHaveBeenCalled();
      expect(s.send).not.toHaveBeenCalled();
      s.accept();
      if (!id) {
        s.tracker.pageView('/register', '', false);
        expect(s.pixel).not.toHaveBeenCalled();
        expect(s.send).not.toHaveBeenCalled();
      }
    }
  });
  it('includes Meta cookies in server events only after consent', async () => {
    document.cookie = '_fbp=fb.1.1234567890.1234567890; path=/';
    document.cookie = '_fbc=fb.1.1234567890.click_123; path=/';
    try {
      const s = setup();
      s.tracker.pageView('/login', '', false);
      expect(s.send).not.toHaveBeenCalled();

      s.accept();
      s.tracker.pageView('/login', '', false);
      await flushSends();
      expect(s.send.mock.calls[0][0].user_data).toMatchObject({
        fbp: 'fb.1.1234567890.1234567890',
        fbc: 'fb.1.1234567890.click_123',
      });
    } finally {
      document.cookie = '_fbp=; Max-Age=0; path=/';
      document.cookie = '_fbc=; Max-Age=0; path=/';
    }
  });
  it('creates fbc from fbclid when the fbc cookie is absent', async () => {
    window.history.replaceState(null, '', '/?fbclid=IwAR_click-123#/login');
    try {
      const s = setup(); s.accept();
      s.tracker.pageView('/login', '', false);
      await flushSends();
      expect(s.send.mock.calls[0][0].user_data?.fbc).toMatch(/^fb\.1\.\d+\.IwAR_click-123$/);
    } finally {
      window.history.replaceState(null, '', '/');
    }
  });
  it('sends one PageView per route change on every public route and dedups StrictMode', async () => {
    const s = setup(); s.accept();
    s.tracker.pageView('/login', '', false);
    s.tracker.pageView('/login', '', false);
    s.tracker.pageView('/register', '?type=beauty', false);
    s.tracker.pageView('/register', '?type=barber', false);
    s.tracker.pageView('/termos', '', false);
    s.tracker.pageView('/privacidade', '', false);
    s.tracker.pageView('/login', '', false);
    s.tracker.pageView('/agenda', '', true);
    s.tracker.pageView('/book/demo', '', false);
    s.tracker.pageView('/update-password', '?access_token=x', false);
    await flushSends();
    const events = s.send.mock.calls.map(([event]) => event);
    expect(events.map(event => event.event_name)).toEqual(Array(5).fill('PageView'));
    expect(events.map(event => event.event_source_url.split('#')[1])).toEqual(['/login', '/register', '/termos', '/privacidade', '/login']);
    expect(events.every(event => !event.event_source_url.includes('?'))).toBe(true);
    expect(new Set(events.map(event => event.event_id)).size).toBe(5);
    events.forEach(event => expect(s.pixel).toHaveBeenCalledWith('PageView', event.event_id));
  });
  it('does not emit Lead on page view, on submit or without a captured registration', async () => {
    const s = setup(); s.accept();
    s.tracker.pageView('/register', '', false);
    s.tracker.lead(null, { email: 'a@example.com' });
    await flushSends();
    expect(s.send.mock.calls.map(([event]) => event.event_name)).toEqual(['PageView']);
  });
  it('emits Lead once after account creation, with its own ID, identity and no double count', async () => {
    const s = setup(); s.accept();
    s.tracker.pageView('/register', '', false);
    const context = s.tracker.captureRegistration();
    expect(s.pixel).toHaveBeenCalledTimes(1);
    const identity = { email: 'a@example.com', external_id: 'user-1' };
    s.tracker.lead(context, identity);
    s.tracker.lead(context, identity);
    s.tracker.completeRegistration(context, identity);
    s.tracker.completeRegistration(context, identity);
    // nova tentativa na mesma visita (novo contexto) não repete o Lead
    s.tracker.lead(s.tracker.captureRegistration(), identity);
    await flushSends();
    const events = s.send.mock.calls.map(([event]) => event);
    expect(events.map(event => event.event_name)).toEqual(['PageView', 'Lead', 'CompleteRegistration']);
    const [, lead, complete] = events;
    expect(lead.user_data).toMatchObject(identity);
    expect(lead.event_id).not.toBe(complete.event_id);
    expect(lead.event_source_url).toMatch(/#\/register$/);
    // O Pixel recebe o mesmo event_id, mais o Advanced Matching já em hash (nunca o e-mail puro).
    expect(s.pixel).toHaveBeenCalledWith('Lead', lead.event_id, { matching: hashMatching(identity) });
    expect(s.pixel).toHaveBeenCalledWith('CompleteRegistration', complete.event_id, { matching: hashMatching(identity) });
    expect(JSON.stringify(s.pixel.mock.calls)).not.toContain('a@example.com');
  });
  it('drops Lead if consent is withdrawn before the account is created', async () => {
    const s = setup(); s.accept();
    s.tracker.pageView('/register', '', false);
    const context = s.tracker.captureRegistration();
    await flushSends();
    s.reject();
    s.tracker.lead(context, { email: 'a@example.com' });
    await flushSends();
    expect(s.send.mock.calls.map(([event]) => event.event_name)).toEqual(['PageView']);
  });
  it('stops after refusal and does not replay earlier events on acceptance', async () => {
    const s = setup();
    s.tracker.pageView('/register', '', false);
    s.accept(); s.tracker.pageView('/register', '', false);
    await flushSends();
    const context = s.tracker.captureRegistration();
    s.reject(); s.tracker.lead(context); s.tracker.completeRegistration(context, { email: 'a@example.com' });
    s.tracker.pageView('/login', '', false);
    expect(s.send.mock.calls.map(([event]) => event.event_name)).toEqual(['PageView']);
  });
  it('captures consent at submission and completes once after backend success even if auth state changed', async () => {
    const s = setup(); s.accept();
    s.tracker.pageView('/register', '', false);
    const context = s.tracker.captureRegistration();
    s.tracker.pageView('/register', '', true);
    s.tracker.completeRegistration(context, { email: 'a@example.com', phone: '+351 912 345 678' });
    s.tracker.completeRegistration(context, { email: 'a@example.com' });
    await flushSends();
    expect(s.send.mock.calls.filter(([event]) => event.event_name === 'CompleteRegistration')).toHaveLength(1);
    expect(s.send.mock.calls.at(-1)[0].event_source_url).toMatch(/#\/register$/);
    expect(s.tracker.captureRegistration()).toBe(null);
  });

  it('calls the pixel synchronously before sending the same event ID to CAPI', async () => {
    const s = setup(); s.accept();
    s.tracker.pageView('/login', '', false);
    expect(s.pixel).toHaveBeenCalledTimes(1);
    expect(s.send).not.toHaveBeenCalled();
    await flushSends();
    const event = s.send.mock.calls[0][0];
    expect(s.pixel).toHaveBeenCalledWith('PageView', event.event_id);
  });

  it('persists the fbc built from fbclid as a cookie and reuses it in later events', async () => {
    document.cookie = '_fbc=; Max-Age=0; path=/';
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice: 'accepted', savedAt: Date.now(), version: 1 }));
    window.history.replaceState(null, '', '/?fbclid=IwAR_persist&utm_id=9#/login');
    try {
      const s = setup(); s.accept();
      s.tracker.pageView('/login', '', false);
      s.tracker.pageView('/register', '', false);
      await flushSends();
      const [first, second] = s.send.mock.calls.map(([event]) => event.user_data?.fbc);
      expect(first).toMatch(/^fb\.1\.\d+\.IwAR_persist$/);
      expect(document.cookie).toContain('_fbc=' + first);
      expect(second).toBe(first);
    } finally {
      document.cookie = '_fbc=; Max-Age=0; path=/';
      window.history.replaceState(null, '', '/');
    }
  });
  it('does not write the fbc cookie without stored consent', async () => {
    document.cookie = '_fbc=; Max-Age=0; path=/';
    localStorage.clear();
    window.history.replaceState(null, '', '/?fbclid=IwAR_nocookie#/login');
    try {
      const s = setup(); s.accept();
      s.tracker.pageView('/login', '', false);
      await flushSends();
      expect(document.cookie).not.toContain('_fbc=');
    } finally {
      window.history.replaceState(null, '', '/');
    }
  });

  it('waits for a late fbp and re-reads fbc before sending', async () => {
    vi.useFakeTimers();
    document.cookie = '_fbp=; Max-Age=0; path=/';
    document.cookie = '_fbc=; Max-Age=0; path=/';
    window.history.replaceState(null, '', '/?fbclid=click-late#/login');
    try {
      const s = setup('123', true); s.accept();
      s.tracker.pageView('/login', '', false);
      expect(s.pixel).toHaveBeenCalledTimes(1);
      expect(s.send).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(300);
      document.cookie = '_fbp=fb.1.1234567890.1234567890; path=/';
      document.cookie = '_fbc=fb.1.1234567890.cookie_value; path=/';
      await vi.advanceTimersByTimeAsync(75);
      await flushSends();
      const event = s.send.mock.calls[0][0];
      expect(event.user_data).toMatchObject({
        fbp: 'fb.1.1234567890.1234567890',
        fbc: 'fb.1.1234567890.cookie_value',
      });
      expect(event.user_data?.fbc).not.toContain('click-late');
      expect(s.pixel).toHaveBeenCalledWith('PageView', event.event_id);
    } finally {
      vi.useRealTimers();
      document.cookie = '_fbp=; Max-Age=0; path=/';
      document.cookie = '_fbc=; Max-Age=0; path=/';
      window.history.replaceState(null, '', '/');
    }
  });

  it('sends an event authorized on its original route after navigation during the fbp wait', async () => {
    vi.useFakeTimers();
    document.cookie = '_fbp=; Max-Age=0; path=/';
    try {
      let routeAllowed = true;
      const pixel = vi.fn();
      const send = vi.fn().mockResolvedValue(undefined);
      const tracker = createMetaTracker({
        pixelId: '123', pixel, send, hasConsent: () => true,
        canSend: () => routeAllowed,
      });
      tracker.pageView('/register', '', false);
      expect(pixel).toHaveBeenCalledTimes(1);
      expect(send).not.toHaveBeenCalled();

      routeAllowed = false;
      await vi.advanceTimersByTimeAsync(1000);
      await flushSends();

      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][0]).toMatchObject({
        event_name: 'PageView',
        event_source_url: expect.stringMatching(/#\/register$/),
      });
      expect(send.mock.calls[0][0].user_data?.fbp).toBeUndefined();
    } finally {
      vi.useRealTimers();
      document.cookie = '_fbp=; Max-Age=0; path=/';
    }
  });

  it('sends without fbp after the polling timeout when no cookie appears', async () => {
    vi.useFakeTimers();
    document.cookie = '_fbp=; Max-Age=0; path=/';
    try {
      const s = setup('123', true); s.accept();
      s.tracker.pageView('/login', '', false);
      expect(s.pixel).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(999);
      expect(s.send).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await flushSends();
      expect(s.send).toHaveBeenCalledTimes(1);
      expect(s.send.mock.calls[0][0].user_data?.fbp).toBeUndefined();
    } finally {
      vi.useRealTimers();
      document.cookie = '_fbp=; Max-Age=0; path=/';
    }
  });

  it('does not send if consent is revoked while waiting for fbp', async () => {
    vi.useFakeTimers();
    document.cookie = '_fbp=; Max-Age=0; path=/';
    try {
      const s = setup('123', true); s.accept();
      s.tracker.pageView('/login', '', false);
      expect(s.pixel).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(300);
      s.reject();
      await vi.advanceTimersByTimeAsync(700);
      await flushSends();
      expect(s.send).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      document.cookie = '_fbp=; Max-Age=0; path=/';
    }
  });
});
