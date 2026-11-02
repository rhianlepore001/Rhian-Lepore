import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Meta browser adapter privacy', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_META_PIXEL_ID', '123');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    localStorage.setItem('agendix:marketing-consent:v1', JSON.stringify({
      choice: 'accepted', savedAt: Date.now(), version: 1,
    }));
    window.history.replaceState(null, '', '/#/register');
  });
  afterEach(() => {
    document.getElementById('agendix-meta-pixel')?.remove();
    delete window.fbq;
    delete window._fbq;
    window.history.replaceState(null, '', '/');
    document.cookie = '_fbp=; Max-Age=0; path=/';
    document.cookie = '_fbc=; Max-Age=0; path=/';
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('disables automatic history tracking before inserting the script or initializing the pixel', async () => {
    document.cookie = '_fbp=fb.1.1234567890.1234567890; path=/';
    const snapshots: unknown[] = [];
    const append = document.head.appendChild.bind(document.head);
    vi.spyOn(document.head, 'appendChild').mockImplementation(node => {
      if (node instanceof HTMLScriptElement && node.id === 'agendix-meta-pixel') {
        snapshots.push({
          disablePushState: (window.fbq as unknown as Record<string, unknown>)?.disablePushState,
          allowDuplicatePageViews: (window.fbq as unknown as Record<string, unknown>)?.allowDuplicatePageViews,
          initialized: window.fbq?.queue.some(args => args[0] === 'init'),
        });
      }
      return append(node);
    });
    const { metaTracker, setMetaScope } = await import('@/lib/metaTracking');
    setMetaScope(true);
    metaTracker.pageView('/register', '', false);
    expect(snapshots).toEqual([{ disablePushState: true, allowDuplicatePageViews: true, initialized: true }]);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(options?.body))).toEqual(expect.objectContaining({
      event_name: 'PageView', event_source_url: window.location.origin + '/#/register',
    }));
  });

  it('allows only attribution query parameters and keeps them out of the Pixel source URL', async () => {
    window.history.replaceState(null, '', '/?fbclid=IwAR_click-123&utm_source=meta&utm_medium=paid&utm_campaign=spring&utm_content=ad1&utm_term=hair#/login');
    document.cookie = '_fbp=fb.1.1234567890.1234567890; path=/';
    const { currentMetaSource, metaTracker, setMetaScope } = await import('@/lib/metaTracking');
    expect(currentMetaSource()).toBe(window.location.origin + '/#/login');
    setMetaScope(true);
    metaTracker.pageView('/login', '', false);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(options?.body)).event_source_url).toBe(window.location.origin + '/#/login');
  });

  it.each([
    '/?fbclid=click&token=secret#/login',
    '/?access_token=secret#/register',
    '/?fluxo=nova-senha&code=pkce#/login',
    '/?token_hash=abc&type=recovery#/login',
    '/#/login?email=person@example.com',
    '/#/login#access_token=secret&type=recovery',
    '/#/register?type=beauty&refresh_token=secret',
  ])('rejects sensitive parameters in %s', async url => {
    window.history.replaceState(null, '', url);
    const { currentMetaSource } = await import('@/lib/metaTracking');
    expect(currentMetaSource()).toBeNull();
  });

  it.each([
    ['/?unknown=value#/register', '/#/register'],
    ['/?utm_id=1&ad_id=2&campaign_id=3&adset_id=4&placement=Feed&site_source_name=fb&ref=x&gclid=g&fbclid=IwAR1#/login', '/#/login'],
    ['/#/register?type=beauty&utm_id=1', '/#/register'],
    ['/#/termos', '/#/termos'],
    ['/?fbclid=abc#/privacidade', '/#/privacidade'],
  ])('accepts harmless unknown parameters in %s and strips them from the source URL', async (url, expected) => {
    window.history.replaceState(null, '', url);
    const { currentMetaSource } = await import('@/lib/metaTracking');
    expect(currentMetaSource()).toBe(window.location.origin + expected);
  });

  it('sends PageView through the adapter on each public hash route with a sanitized URL', async () => {
    window.history.replaceState(null, '', '/?utm_id=1&ad_id=2&fbclid=IwAR_x#/login');
    document.cookie = '_fbp=fb.1.1234567890.1234567890; path=/';
    const { metaTracker, setMetaScope } = await import('@/lib/metaTracking');
    setMetaScope(true);
    metaTracker.pageView('/login', '', false);
    window.history.replaceState(null, '', '/?utm_id=1&ad_id=2&fbclid=IwAR_x#/termos');
    setMetaScope(true);
    metaTracker.pageView('/termos', '', false);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const urls = vi.mocked(fetch).mock.calls.map(([, options]) => JSON.parse(String(options?.body)).event_source_url);
    expect(urls).toEqual([window.location.origin + '/#/login', window.location.origin + '/#/termos']);
  });

  it.each(['/#/book/private?token=secret', '/#/minha-area/private?token=secret', '/#/agenda', '/#/register?token=secret'])(
    'discards pending events in place and ignores all late events at %s', async url => {
      const { metaTracker, setMetaScope } = await import('@/lib/metaTracking');
      setMetaScope(true);
      metaTracker.pageView('/register', '', false);
      const context = metaTracker.captureRegistration();
      const queue = window.fbq!;
      const heldQueue = queue.queue;
      window.history.replaceState(null, '', url);
      setMetaScope(false);
      const calls = vi.fn();
      queue.callMethod = calls;
      vi.mocked(fetch).mockClear();
      queue('trackSingle', '123', 'PageView', {}, { eventID: 'late-event' });
      metaTracker.completeRegistration(context, { email: 'person@example.com' });
      expect(heldQueue).toHaveLength(0);
      expect(queue.queue).toHaveLength(0);
      expect(calls.mock.calls.filter(args => String(args[0]).startsWith('track'))).toHaveLength(0);
      await vi.waitFor(() => expect(fetch).toHaveBeenCalled(), { timeout: 1500 });
      const events = vi.mocked(fetch).mock.calls.map(([, options]) => JSON.parse(String(options?.body)));
      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({
          event_name: 'PageView',
          event_source_url: window.location.origin + '/#/register',
        }),
      ]));
      expect(events.every(event => !/book|private|minha-area|token/.test(event.event_source_url))).toBe(true);
      expect(events.every(event => event.user_data?.fbp === undefined)).toBe(true);
    },
  );

  it.each(['/#/book/private?token=secret', '/#/minha-area/private', '/#/register?token=secret', '/?token=secret#/login'])(
    'does not load the script or send an event when the actual document URL is %s', async url => {
      window.history.replaceState(null, '', url);
      const { metaTracker, setMetaScope } = await import('@/lib/metaTracking');
      setMetaScope(true);
      metaTracker.pageView('/register', '', false);
      const context = metaTracker.captureRegistration();
      metaTracker.lead(context, { email: 'person@example.com' });
      metaTracker.completeRegistration(context, { email: 'person@example.com' });
      expect(document.getElementById('agendix-meta-pixel')).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it('loads the Pixel for an OnboardingStep only on the onboarding route, with hashed matching', async () => {
    window.history.replaceState(null, '', '/#/onboarding-wizard');
    document.cookie = '_fbp=fb.1.1234567890.1234567890; path=/';
    const { metaTracker, setMetaScope } = await import('@/lib/metaTracking');
    setMetaScope(false);
    expect(document.getElementById('agendix-meta-pixel')).toBeNull();
    metaTracker.pageView('/onboarding-wizard', '', true);
    expect(metaTracker.onboardingStep(2, 6, { email: 'Person@Example.com', external_id: 'user-1', country: 'br' })).toBe(true);
    const queue = window.fbq!.queue;
    const init = queue.find(args => args[0] === 'init');
    expect(init?.[2]).toEqual(expect.objectContaining({ em: expect.stringMatching(/^[0-9a-f]{64}$/) }));
    expect(JSON.stringify(queue)).not.toContain('Person@Example.com');
    expect(queue.some(args => args[0] === 'trackSingle' && args[2] === 'PageView')).toBe(false);
    expect(queue.some(args => args[0] === 'trackSingleCustom' && args[2] === 'OnboardingStep')).toBe(true);
    expect(queue.filter(args => args[0] === 'consent').map(args => args[1])).not.toContain('revoke');
    expect(window.fbq?.callMethod).toBeUndefined(); // revoke só corre via callMethod do fbevents.js real (coberto no e2e)
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body).toEqual(expect.objectContaining({
      event_name: 'OnboardingStep', event_source_url: window.location.origin + '/#/onboarding-wizard',
      custom_data: { step: 2, total_steps: 6, content_name: 'onboarding' },
    }));
  });

  it('never sends marketing events from other authenticated or client-facing routes', async () => {
    const { metaTracker, setMetaScope } = await import('@/lib/metaTracking');
    for (const url of ['/#/agenda', '/#/book/demo', '/#/queue/demo']) {
      window.history.replaceState(null, '', url);
      setMetaScope(false);
      metaTracker.pageView(url.slice(2), '', url === '/#/agenda');
      expect(metaTracker.onboardingStep(1, 6, { email: 'person@example.com' })).toBe(false);
      expect(metaTracker.viewContent('barber')).toBe(false);
      expect(metaTracker.startRegistration('barber')).toBe(false);
    }
    expect(document.getElementById('agendix-meta-pixel')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends ViewContent as a standard event and CTAClick as a custom event on the landing', async () => {
    window.history.replaceState(null, '', '/#/login');
    document.cookie = '_fbp=fb.1.1234567890.1234567890; path=/';
    const { metaTracker, setMetaScope } = await import('@/lib/metaTracking');
    setMetaScope(true);
    metaTracker.pageView('/login', '', false);
    metaTracker.viewContent('beauty');
    metaTracker.ctaClick('free_trial_gateway');
    const queue = window.fbq!.queue;
    expect(queue.some(args => args[0] === 'trackSingle' && args[2] === 'ViewContent'
      && (args[3] as Record<string, unknown>).content_category === 'beauty')).toBe(true);
    expect(queue.some(args => args[0] === 'trackSingleCustom' && args[2] === 'CTAClick')).toBe(true);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  });
});
