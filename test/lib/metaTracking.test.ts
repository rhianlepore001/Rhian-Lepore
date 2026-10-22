import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMetaTracker, isMetaRoute } from '@/lib/metaTracking';
import { CONSENT_KEY, readConsent, saveConsent } from '@/lib/marketingConsent';

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
      pixelId, pixel, send, hasConsent: () => consent,
      waitForFbp: pollFbp ? undefined : async () => undefined,
    });
    return { tracker, pixel, send, accept: () => { consent = true; }, reject: () => { consent = false; } };
  };
  it.each(['/book/demo', '/queue/demo', '/pro/demo', '/minha-area/demo', '/clube/demo', '/', '/agenda', '/onboarding-wizard', '/staff-onboarding'])('excludes %s', path => {
    expect(isMetaRoute(path, '', false)).toBe(false);
  });
  it('excludes authenticated visitors and staff invites', () => {
    expect(isMetaRoute('/login', '', true)).toBe(false);
    expect(isMetaRoute('/register', '?company=owner&member=staff', false)).toBe(false);
    expect(isMetaRoute('/register', '?type=beauty', false)).toBe(true);
  });
  it.each([
    ['/login', '?token=secret'], ['/register', '?access_token=secret'],
    ['/register', '?type=beauty&token=secret'], ['/register', '?next=/book/private'],
  ])('rejects sensitive or unknown query parameters on %s%s', (path, search) => {
    expect(isMetaRoute(path, search, false)).toBe(false);
  });
  it.each(['/book/private', '/minha-area/private', '/agenda', '/login'])('drops a captured registration after leaving for %s', async path => {
    const s = setup(); s.accept();
    s.tracker.pageView('/register', '', false);
    await flushSends();
    const context = s.tracker.captureRegistration();
    s.tracker.pageView(path, '', path === '/agenda');
    s.pixel.mockClear(); s.send.mockClear();
    s.tracker.lead();
    s.tracker.completeRegistration(context, { email: 'person@example.com' });
    expect(s.pixel).not.toHaveBeenCalled();
    expect(s.send).not.toHaveBeenCalled();
  });
  it('does not load or send anything without consent or a pixel ID', () => {
    for (const id of ['', '123']) {
      const s = setup(id);
      s.tracker.pageView('/login', '', false);
      s.tracker.lead();
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
  it('deduplicates StrictMode and uses the same ID for browser and server', async () => {
    const s = setup(); s.accept();
    s.tracker.pageView('/login', '', false);
    s.tracker.pageView('/login', '', false);
    s.tracker.pageView('/register', '?type=beauty', false);
    s.tracker.lead(); s.tracker.lead();
    await flushSends();
    expect(s.send.mock.calls.map(([event]) => event.event_name)).toEqual(['PageView', 'PageView', 'Lead']);
    const lead = s.send.mock.calls[2][0];
    expect(s.pixel).toHaveBeenCalledWith('Lead', lead.event_id);
    expect(lead.event_source_url).not.toContain('type=');
  });
  it('stops after refusal and does not replay earlier events on acceptance', async () => {
    const s = setup();
    s.tracker.pageView('/register', '', false); s.tracker.lead();
    s.accept(); s.tracker.pageView('/register', '', false); s.tracker.lead();
    await flushSends();
    const context = s.tracker.captureRegistration();
    s.reject(); s.tracker.completeRegistration(context, { email: 'a@example.com' });
    s.tracker.pageView('/login', '', false);
    expect(s.send.mock.calls.map(([event]) => event.event_name)).toEqual(['PageView', 'Lead']);
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
