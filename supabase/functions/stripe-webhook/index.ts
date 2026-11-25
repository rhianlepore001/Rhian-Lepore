/**
 * stripe-webhook — Stripe → profiles billing sync.
 * Deploy with verify_jwt = false (Stripe does not send a Supabase JWT); auth is
 * the Stripe-Signature header verified against STRIPE_WEBHOOK_SECRET.
 * Idempotent: event ids claimed in public.stripe_webhook_events; out-of-order
 * events ignored via profiles.stripe_billing_event_at.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
    billingUpdateFromEvent,
    configuredPriceIds,
    type StripeEventLike,
} from "../_shared/billing.ts";
import { verifyStripeSignature } from "../_shared/stripeSignature.ts";

const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function serviceClient(): SupabaseClient {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!url || !key) throw new Error("Supabase service role missing");
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isStripeEvent(event: unknown): event is StripeEventLike & { livemode: boolean } {
    if (!event || typeof event !== "object") return false;
    const value = event as Partial<StripeEventLike>;
    return typeof value.id === "string" && /^evt_[A-Za-z0-9_]+$/.test(value.id)
        && typeof value.type === "string" && value.type.length > 0 && value.type.length <= 128
        && typeof value.livemode === "boolean"
        && typeof value.created === "number" && Number.isSafeInteger(value.created)
        && value.created > 0 && value.created < 8_640_000_000_000
        && !!value.data?.object && typeof value.data.object === "object" && !Array.isArray(value.data.object);
}

serve(async (req) => {
    if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!secret) {
        console.error("STRIPE_WEBHOOK_SECRET missing");
        return json(500, { error: "misconfigured" });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) return json(400, { error: "invalid_signature" });
    const payload = await req.text();
    const ok = await verifyStripeSignature(payload, signature, secret);
    if (!ok) return json(400, { error: "invalid_signature" });

    let event: unknown;
    try {
        event = JSON.parse(payload);
    } catch {
        return json(400, { error: "invalid_payload" });
    }
    if (!isStripeEvent(event)) return json(400, { error: "invalid_payload" });

    try {
        const prices = configuredPriceIds((k) => Deno.env.get(k));
        const update = billingUpdateFromEvent(event, (id) => prices.get(id)?.planId ?? null);
        if (update.kind === "ignore") return json(200, { received: true, result: update.reason });

        const matches = [update.match, ...update.fallbackMatches];
        const { data: result, error } = await serviceClient().rpc("apply_stripe_billing_event", {
            p_event_id: event.id,
            p_event_type: event.type,
            p_livemode: event.livemode,
            p_event_at: update.eventAt,
            p_profile_id: matches.find((match) => match.by === "id")?.value ?? null,
            p_subscription_id: matches.find((match) => match.by === "stripe_subscription_id")?.value ?? null,
            p_patch: update.patch,
        });
        if (error) throw error;
        if (result === "duplicate") return json(200, { received: true, duplicate: true });
        if (result === "profile_not_found" || result === "profile_conflict") console.warn(result, event.id);
        return json(200, { received: true, result });
    } catch {
        console.error("handler_failed", event.id);
        return json(500, { error: "handler_failed" });
    }
});
