export type LandingEventName =
  | 'landing_view'
  | 'niche_selected'
  | 'niche_switched'
  | 'cta_click'
  | 'scroll_depth'
  | 'demo_video_play';

export type LandingEventProperties = Record<string, string | number | boolean | null | undefined>;

interface LandingAnalyticsPayload {
  event: LandingEventName;
  properties: LandingEventProperties;
  timestamp: string;
}

export function trackLandingEvent(event: LandingEventName, properties: LandingEventProperties = {}): void {
  try {
    const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
    if (!endpoint) return;

    const payload: LandingAnalyticsPayload = {
      event,
      properties,
      timestamp: new Date().toISOString(),
    };
    const body = JSON.stringify(payload);

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const sent = navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      if (sent) return;
    }

    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Analytics nunca pode bloquear a experiência pública.
  }
}
