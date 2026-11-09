/**
 * A-06: allowlist for Stripe checkout return URLs and mode.
 * Price IDs are no longer allowlisted here: they come exclusively from the
 * STRIPE_PRICE_{SOLO,TEAM}_{BRL,EUR} secrets (see ../_shared/billing.ts).
 * Client mirror: utils/checkoutAllowlist.ts.
 */
export const DEFAULT_CHECKOUT_ORIGINS = [
  "https://www.agendixstudio.com",
  "https://agendixstudio.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
] as const;

export function collectAllowedOrigins(extraCsv?: string | null): Set<string> {
  const origins = new Set<string>(DEFAULT_CHECKOUT_ORIGINS);
  if (typeof extraCsv === "string" && extraCsv.trim()) {
    for (const part of extraCsv.split(",")) {
      const o = part.trim().replace(/\/$/, "");
      if (o.startsWith("http://") || o.startsWith("https://")) origins.add(o);
    }
  }
  return origins;
}

export function isAllowedReturnUrl(url: unknown, allowedOrigins: Set<string>): boolean {
  if (typeof url !== "string" || !url.trim()) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (allowedOrigins.has(parsed.origin)) return true;
  if (
    parsed.protocol === "https:" &&
    parsed.origin.endsWith(".vercel.app") &&
    parsed.origin.includes("rhian-lepore")
  ) {
    return true;
  }
  return false;
}

export function isAllowedCheckoutMode(mode: unknown): boolean {
  return mode === "subscription" || mode === undefined || mode === null || mode === "";
}
