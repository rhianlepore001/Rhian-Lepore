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
    type ProfileMatch,
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

async function findProfileId(sb: SupabaseClient, m: ProfileMatch): Promise<string | null> {
    const { data, error } = await sb.from("profiles").select("id").eq(m.by, m.value).limit(1).maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
}

serve(async (req) => {
    if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!secret) {
        console.error("STRIPE_WEBHOOK_SECRET missing");
        return json(500, { error: "misconfigured" });
    }

    const payload = await req.text();
    const ok = await verifyStripeSignature(payload, req.headers.get("stripe-signature"), secret);
    if (!ok) return json(400, { error: "invalid_signature" });

    let event: StripeEventLike;
    try {
        event = JSON.parse(payload);
    } catch {
        return json(400, { error: "invalid_payload" });
    }

    const sb = serviceClient();

    // Idempotency: claim the event id first; duplicates are acknowledged with 200.
    const { error: claimError } = await sb.from("stripe_webhook_events").insert({
        event_id: event.id,
        event_type: event.type,
        livemode: event.livemode ?? null,
    });
    if (claimError) {
        if (claimError.code === "23505") return json(200, { received: true, duplicate: true });
        console.error("claim failed", claimError.message);
        return json(500, { error: "claim_failed" });
    }

    try {
        const prices = configuredPriceIds((k) => Deno.env.get(k));
        const update = billingUpdateFromEvent(event, (id) => prices.get(id)?.planId ?? null);
        if (update.kind === "ignore") return json(200, { received: true, result: update.reason });

        let profileId: string | null = null;
        for (const m of [update.match, ...update.fallbackMatches]) {
            profileId = await findProfileId(sb, m);
            if (profileId) break;
        }
        if (!profileId) {
            console.warn("profile_not_found", event.id, event.type);
            return json(200, { received: true, result: "profile_not_found" });
        }

        // Only apply if this event is not older than the last one applied (out-of-order safety).
        const { data: updated, error } = await sb
            .from("profiles")
            .update({ ...update.patch, stripe_billing_event_at: update.eventAt, updated_at: new Date().toISOString() })
            .eq("id", profileId)
            .or(`stripe_billing_event_at.is.null,stripe_billing_event_at.lte.${update.eventAt}`)
            .select("id");
        if (error) throw error;
        return json(200, { received: true, result: updated?.length ? "ok" : "stale_event" });
    } catch (err) {
        console.error("handler_failed", event.id, err instanceof Error ? err.message : err);
        // Release the claim so Stripe's retry can reprocess.
        await sb.from("stripe_webhook_events").delete().eq("event_id", event.id);
        return json(500, { error: "handler_failed" });
    }
});
