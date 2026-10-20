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
  const setup = (pixelId = '123') => {
    let consent = false;
    const pixel = vi.fn();
    const send = vi.fn().mockResolvedValue(undefined);
    const tracker = createMetaTracker({ pixelId, pixel, send, hasConsent: () => consent });
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
  it('deduplicates StrictMode and uses the same ID for browser and server', () => {
    const s = setup(); s.accept();
    s.tracker.pageView('/login', '', false);
    s.tracker.pageView('/login', '', false);
    s.tracker.pageView('/register', '?type=beauty', false);
    s.tracker.lead(); s.tracker.lead();
    expect(s.send.mock.calls.map(([event]) => event.event_name)).toEqual(['PageView', 'PageView', 'Lead']);
    const lead = s.send.mock.calls[2][0];
    expect(s.pixel).toHaveBeenCalledWith('Lead', lead.event_id);
    expect(lead.event_source_url).not.toContain('type=');
  });
  it('stops after refusal and does not replay earlier events on acceptance', () => {
    const s = setup();
    s.tracker.pageView('/register', '', false); s.tracker.lead();
    s.accept(); s.tracker.pageView('/register', '', false); s.tracker.lead();
    const context = s.tracker.captureRegistration();
    s.reject(); s.tracker.completeRegistration(context, { email: 'a@example.com' });
    s.tracker.pageView('/login', '', false);
    expect(s.send.mock.calls.map(([event]) => event.event_name)).toEqual(['PageView', 'Lead']);
  });
  it('captures consent at submission and completes once after backend success even if auth state changed', () => {
    const s = setup(); s.accept();
    s.tracker.pageView('/register', '', false);
    const context = s.tracker.captureRegistration();
    s.tracker.pageView('/register', '', true);
    s.tracker.completeRegistration(context, { email: 'a@example.com', phone: '+351 912 345 678' });
    s.tracker.completeRegistration(context, { email: 'a@example.com' });
    expect(s.send.mock.calls.filter(([event]) => event.event_name === 'CompleteRegistration')).toHaveLength(1);
    expect(s.send.mock.calls.at(-1)[0].event_source_url).toMatch(/#\/register$/);
    expect(s.tracker.captureRegistration()).toBe(null);
  });
});
