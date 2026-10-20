export const FALLBACK_STRIPE_PRICE_IDS = [
  "price_1UHfuLPUPmLLh2qEjVZ7g0hA",
  "price_1UHfuMPUPmLLh2qEBQdKfGNv",
  "price_1UHfuNPUPmLLh2qEUiuYaUyN",
  "price_1UHfuNPUPmLLh2qEaolUiKUI",
] as const;

/** Live Price IDs currently inlined on www.agendixstudio.com (Vercel VITE_STRIPE_PRICE_*). */
export const PRODUCTION_STRIPE_PRICE_IDS = [
  "price_1UHgTEBoBv5fVrkrYEFLfgBs", // Solo BRL
  "price_1UHgTFBoBv5fVrkr1pimlz7G", // Team BRL
  "price_1UHgTGBoBv5fVrkr4GO9Qa2x", // Solo EUR
  "price_1UHgTGBoBv5fVrkrY2JCGvs5", // Team EUR
] as const;

export const DEFAULT_CHECKOUT_ORIGINS = [
  "https://www.agendixstudio.com",
  "https://agendixstudio.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
] as const;

export function collectAllowedPriceIds(extra: Array<string | undefined | null> = []): Set<string> {
  const ids = new Set<string>([...FALLBACK_STRIPE_PRICE_IDS, ...PRODUCTION_STRIPE_PRICE_IDS]);
  for (const raw of extra) {
    if (typeof raw === "string" && raw.trim().startsWith("price_")) {
      ids.add(raw.trim());
    }
  }
  return ids;
}

export function isAllowedPriceId(priceId: unknown, allowed: Set<string>): boolean {
  return typeof priceId === "string" && allowed.has(priceId);
}

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
  return false;
}

export function isAllowedCheckoutMode(mode: unknown): boolean {
  return mode === "subscription" || mode === undefined || mode === null || mode === "";
}
