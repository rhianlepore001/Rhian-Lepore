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
