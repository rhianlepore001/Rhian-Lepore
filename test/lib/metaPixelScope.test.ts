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
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('disables automatic history tracking before inserting the script or initializing the pixel', async () => {
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
    '/?unknown=value#/register',
    '/?access_token=secret#/register',
  ])('rejects non-attribution query parameters in %s', async url => {
    window.history.replaceState(null, '', url);
    const { currentMetaSource } = await import('@/lib/metaTracking');
    expect(currentMetaSource()).toBeNull();
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
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each(['/#/book/private?token=secret', '/#/minha-area/private', '/#/register?token=secret', '/?token=secret#/login'])(
    'does not load the script or send an event when the actual document URL is %s', async url => {
      window.history.replaceState(null, '', url);
      const { metaTracker, setMetaScope } = await import('@/lib/metaTracking');
      setMetaScope(true);
      metaTracker.pageView('/register', '', false);
      metaTracker.lead();
      const context = metaTracker.captureRegistration();
      metaTracker.completeRegistration(context, { email: 'person@example.com' });
      expect(document.getElementById('agendix-meta-pixel')).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});
