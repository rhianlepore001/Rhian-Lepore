import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Stripe-compatible webhook signature verification (Node).
 * Edge function uses stripe.webhooks.constructEvent; this mirrors the scheme for unit tests.
 */
export function computeStripeSignature(payload: string, secret: string, timestampSec: number): string {
  const signed = `${timestampSec}.${payload}`;
  return createHmac('sha256', secret).update(signed, 'utf8').digest('hex');
}

export function buildStripeSignatureHeader(payload: string, secret: string, timestampSec?: number): string {
  const t = timestampSec ?? Math.floor(Date.now() / 1000);
  const v1 = computeStripeSignature(payload, secret, t);
  return `t=${t},v1=${v1}`;
}

export function verifyStripeSignature(
  payload: string,
  header: string | null | undefined,
  secret: string,
  toleranceSec = 300,
  nowSec = Math.floor(Date.now() / 1000),
): { ok: true; timestamp: number } | { ok: false; reason: string } {
  if (!header || !secret) {
    return { ok: false, reason: 'missing_header_or_secret' };
  }
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, ...rest] = p.trim().split('=');
      return [k, rest.join('=')];
    }),
  ) as Record<string, string>;
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!Number.isFinite(t) || !v1) {
    return { ok: false, reason: 'malformed_header' };
  }
  if (Math.abs(nowSec - t) > toleranceSec) {
    return { ok: false, reason: 'timestamp_outside_tolerance' };
  }
  const expected = computeStripeSignature(payload, secret, t);
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(v1, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: 'bad_signature' };
    }
  } catch {
    return { ok: false, reason: 'bad_signature' };
  }
  return { ok: true, timestamp: t };
}
