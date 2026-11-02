import { webcrypto } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createMetaTracker, isMetaRoute } from '@/lib/metaTracking';
import { hashMatching, splitFullName } from '@/lib/metaMatching';
import { sha256Hex } from '@/lib/sha256';
import { createMetaCapiHandler } from '../../supabase/functions/meta-capi/handler';

const flush = async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); };

describe('sha256Hex', () => {
  it.each(['', 'abc', 'person@example.com', 'josé da silva', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'á'.repeat(100)])(
    'matches crypto.subtle for %j', async input => {
      const expected = Array.from(new Uint8Array(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(input))))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      expect(sha256Hex(input)).toBe(expected);
    },
  );
});

describe('advanced matching normalization', () => {
  it('splits first and last name and drops empty tokens', () => {
    expect(splitFullName('  Maria  da Silva ')).toEqual({ first_name: 'Maria', last_name: 'Silva' });
    expect(splitFullName('Rhian')).toEqual({ first_name: 'Rhian' });
    expect(splitFullName('-- Ana')).toEqual({ first_name: 'Ana' });
    expect(splitFullName('')).toEqual({});
    expect(splitFullName(null)).toEqual({});
  });
  it('hashes every field with Meta normalization and never returns clear text', () => {
    const matching = hashMatching({
      email: ' Person@Example.COM ', phone: '+351 912 345 678', first_name: 'José', last_name: "D'Ávila",
      city: 'São Paulo', country: 'BR', external_id: 'ABC-1',
    })!;
    expect(matching).toEqual({
      em: sha256Hex('person@example.com'), ph: sha256Hex('351912345678'), fn: sha256Hex('josé'),
      ln: sha256Hex('dávila'), ct: sha256Hex('sãopaulo'), country: sha256Hex('br'), external_id: sha256Hex('abc-1'),
    });
    expect(JSON.stringify(matching)).not.toMatch(/person|jos|paulo/i);
    expect(hashMatching({})).toBeUndefined();
    expect(hashMatching(undefined)).toBeUndefined();
  });
  it('produces the same hashes in the browser and in the edge function', async () => {
    const identity = {
      email: ' Person@Example.COM ', phone: '+351 912 345 678', first_name: 'José', last_name: "D'Ávila",
      city: 'São Paulo', country: 'BR', external_id: 'ABC-1',
    };
    const origin = 'https://app.example.com';
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ events_received: 1 })));
    const handler = createMetaCapiHandler({ pixelId: '1', token: 't', allowedOrigins: [origin], fetcher, crypto: webcrypto as unknown as Crypto });
    const response = await handler(new Request('https://edge.example/meta-capi', {
      method: 'POST', headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({
        consent: true, event_name: 'OnboardingStep', event_id: '8efdc721-ff7c-4c90-9101-e053cde1f649',
        event_time: Math.floor(Date.now() / 1000), event_source_url: origin + '/#/onboarding-wizard',
        user_data: identity, custom_data: { step: 2, total_steps: 6 },
      }),
    }));
    expect(response.status).toBe(200);
    const sent = JSON.parse(fetcher.mock.calls[0][1].body).data[0];
    const browser = hashMatching(identity)!;
    expect(sent.user_data).toMatchObject({
      em: [browser.em], ph: [browser.ph], fn: [browser.fn], ln: [browser.ln], ct: [browser.ct],
      country: [browser.country], external_id: [browser.external_id],
    });
    expect(sent.custom_data).toEqual({ step: 2, total_steps: 6 });
    expect(JSON.stringify(sent)).not.toMatch(/Person|Ávila|Paulo/);
  });
});

describe('Meta remarketing events', () => {
  const setup = (consent = true) => {
    let allowed = consent;
    const pixel = vi.fn();
    const send = vi.fn().mockResolvedValue(undefined);
    const tracker = createMetaTracker({
      pixelId: '123', pixel, send, hasConsent: () => allowed, once: new Set<string>(),
      waitForFbp: async () => undefined,
    });
    return { tracker, pixel, send, revoke: () => { allowed = false; }, grant: () => { allowed = true; } };
  };
  const names = (s: ReturnType<typeof setup>) => s.send.mock.calls.map(([event]) => event.event_name);

  it('keeps the public customer routes out of scope', () => {
    for (const path of ['/book/x', '/queue/x', '/queue-status/1', '/pro/x', '/minha-area/x', '/clube/x', '/club-demo', '/onboarding-wizard']) {
      expect(isMetaRoute(path, '', false)).toBe(false);
    }
  });

  it('sends ViewContent with the page niche once, with the same event_id in Pixel and CAPI', async () => {
    const s = setup();
    s.tracker.pageView('/login', '', false);
    expect(s.tracker.viewContent('beauty')).toBe(true);
    expect(s.tracker.viewContent('beauty')).toBe(true);
    s.tracker.viewContent('barber');
    await flush();
    const events = s.send.mock.calls.map(([event]) => event).filter(event => event.event_name === 'ViewContent');
    expect(events.map(event => event.custom_data)).toEqual([
      { content_category: 'beauty', content_name: 'landing' }, { content_category: 'barber', content_name: 'landing' },
    ]);
    expect(s.pixel).toHaveBeenCalledWith('ViewContent', events[0].event_id, { custom: events[0].custom_data });
    expect(events[0].event_source_url).toMatch(/#\/login$/);
  });

  it('rejects free-text or unsafe parameters instead of forwarding them', async () => {
    const s = setup();
    s.tracker.pageView('/login', '', false);
    s.tracker.viewContent('Rua Tal, 12 (cliente João)');
    s.tracker.ctaClick('free_trial_gateway', 'a@b.com');
    await flush();
    const events = s.send.mock.calls.map(([event]) => event);
    expect(events.find(event => event.event_name === 'ViewContent')?.custom_data).toEqual({ content_name: 'landing' });
    expect(events.find(event => event.event_name === 'CTAClick')?.custom_data).toEqual({ cta_id: 'free_trial_gateway', content_name: 'landing' });
  });

  it('sends scroll, dwell time and CTA once per visit and only on the landing', async () => {
    const s = setup();
    s.tracker.pageView('/login', '', false);
    expect(s.tracker.landingEngagement('Scroll75', 'barber')).toBe(true);
    s.tracker.landingEngagement('Scroll75', 'barber');
    s.tracker.landingEngagement('TimeOnPage30s');
    s.tracker.landingEngagement('TimeOnPage30s');
    s.tracker.ctaClick('free_trial_gateway');
    s.tracker.ctaClick('free_trial_gateway');
    s.tracker.ctaClick('free_trial_login', 'barber');
    await flush();
    expect(names(s)).toEqual(['PageView', 'Scroll75', 'TimeOnPage30s', 'CTAClick', 'CTAClick']);
    s.send.mockClear();
    for (const path of ['/register', '/termos', '/privacidade', '/agenda']) {
      s.tracker.pageView(path, '', path === '/agenda');
      expect(s.tracker.landingEngagement('Scroll75')).toBe(false);
      expect(s.tracker.ctaClick('x')).toBe(false);
      expect(s.tracker.viewContent('barber')).toBe(false);
    }
  });

  it('sends StartRegistration once per visit and only on /register', async () => {
    const s = setup();
    s.tracker.pageView('/login', '', false);
    expect(s.tracker.startRegistration('barber')).toBe(false);
    s.tracker.pageView('/register', '?type=beauty', false);
    expect(s.tracker.startRegistration('beauty')).toBe(true);
    s.tracker.startRegistration('beauty');
    await flush();
    const start = s.send.mock.calls.map(([event]) => event).filter(event => event.event_name === 'StartRegistration');
    expect(start).toHaveLength(1);
    expect(start[0].custom_data).toEqual({ content_name: 'register', content_category: 'beauty' });
    expect(start[0].event_source_url).toMatch(/#\/register$/);
  });

  it('does not send StartRegistration on a staff invite link', () => {
    const s = setup();
    s.tracker.pageView('/register', '?company=owner&member=staff', false);
    expect(s.tracker.startRegistration('barber')).toBe(false);
    expect(s.send).not.toHaveBeenCalled();
  });

  it('sends OnboardingStep per step only on the onboarding route for a signed-in user', async () => {
    const s = setup();
    const identity = { email: 'a@example.com', external_id: 'user-1', first_name: 'Ana', country: 'br' };
    s.tracker.pageView('/agenda', '', true);
    expect(s.tracker.onboardingStep(1, 6, identity)).toBe(false);
    s.tracker.pageView('/onboarding-wizard', '', true);
    expect(s.tracker.onboardingStep(1, 6, identity)).toBe(true);
    s.tracker.onboardingStep(1, 6, identity);
    s.tracker.onboardingStep(2, 6, identity);
    expect(s.tracker.onboardingStep(0, 6, identity)).toBe(false);
    await flush();
    expect(names(s)).toEqual(['OnboardingStep', 'OnboardingStep']);
    const [first] = s.send.mock.calls.map(([event]) => event);
    expect(first.custom_data).toEqual({ step: 1, total_steps: 6, content_name: 'onboarding' });
    expect(first.user_data).toMatchObject({ email: 'a@example.com', external_id: 'user-1', first_name: 'Ana', country: 'br' });
    expect(first.event_source_url).toMatch(/#\/onboarding-wizard$/);
    expect(s.pixel).toHaveBeenCalledWith('OnboardingStep', first.event_id, {
      custom: first.custom_data, matching: hashMatching(identity),
    });
  });

  it('does not send OnboardingStep for a signed-out visitor', () => {
    const s = setup();
    s.tracker.pageView('/onboarding-wizard', '', false);
    expect(s.tracker.onboardingStep(1, 6)).toBe(false);
    expect(s.send).not.toHaveBeenCalled();
  });

  it('sends nothing without consent and does not mark the event as sent', async () => {
    const s = setup(false);
    s.tracker.pageView('/login', '', false);
    expect(s.tracker.viewContent('barber')).toBe(false);
    expect(s.tracker.landingEngagement('Scroll75')).toBe(false);
    s.grant();
    s.tracker.pageView('/login', '', false);
    expect(s.tracker.viewContent('barber')).toBe(true);
    await flush();
    expect(names(s)).toContain('ViewContent');
    s.revoke();
    expect(s.tracker.ctaClick('x')).toBe(false);
  });
});

describe('meta-capi remarketing allow-list', () => {
  const origin = 'https://app.example.com';
  const payload = (event_name: string, hash: string, extra: Record<string, unknown> = {}) => ({
    consent: true, event_name, event_id: '8efdc721-ff7c-4c90-9101-e053cde1f649',
    event_time: Math.floor(Date.now() / 1000), event_source_url: origin + '/' + hash, ...extra,
  });
  const run = async (body: unknown) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ events_received: 1 })));
    const handler = createMetaCapiHandler({ pixelId: '1', token: 't', allowedOrigins: [origin], fetcher, crypto: webcrypto as unknown as Crypto });
    const response = await handler(new Request('https://edge.example/meta-capi', {
      method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body),
    }));
    return { status: response.status, fetcher };
  };

  it.each([
    ['ViewContent', '#/login'], ['CTAClick', '#/login'], ['Scroll75', '#/login'], ['TimeOnPage30s', '#/login'],
    ['StartRegistration', '#/register'], ['OnboardingStep', '#/onboarding-wizard'], ['PageView', '#/privacidade'],
  ])('accepts %s from %s', async (name, hash) => {
    expect((await run(payload(name, hash, { custom_data: { content_category: 'barber', step: 1 } }))).status).toBe(200);
  });

  it.each([
    ['ViewContent', '#/register'], ['CTAClick', '#/termos'], ['Scroll75', '#/register'],
    ['StartRegistration', '#/login'], ['OnboardingStep', '#/login'], ['OnboardingStep', '#/agenda'],
    ['ViewContent', '#/book/demo'], ['PageView', '#/onboarding-wizard'], ['Lead', '#/onboarding-wizard'],
    ['Purchase', '#/login'], ['InitiateCheckout', '#/register'],
  ])('rejects %s from %s', async (name, hash) => {
    const result = await run(payload(name, hash));
    expect(result.status).toBe(400);
    expect(result.fetcher).not.toHaveBeenCalled();
  });

  it.each([
    { custom_data: { content_category: 'Rua do João' } }, { custom_data: { email: 'a@b.co' } },
    { custom_data: { step: 0 } }, { custom_data: { step: 1.5 } }, { custom_data: { step: '1' } }, { custom_data: [] },
    { user_data: { first_name: '--' } }, { user_data: { first_name: 'x'.repeat(101) } },
    { user_data: { country: 'BRA' } }, { user_data: { city: 42 } }, { user_data: { zip: '1000' } },
  ])('rejects malformed custom_data/user_data %j', async extra => {
    const result = await run(payload('ViewContent', '#/login', extra));
    expect(result.status).toBe(400);
    expect(result.fetcher).not.toHaveBeenCalled();
  });
});
