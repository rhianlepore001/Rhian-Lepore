import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
    billingPatchFromSubscription,
    isHandledStripeEventType,
    mapStripeSubscriptionStatus,
    matchFromCheckoutSession,
    matchFromInvoice,
    matchFromSubscription,
    type ProfileBillingPatch,
    type ProfileMatch,
} from "./billing.ts";
import { planIdFromPriceId } from "./planPrices.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
});

function serviceClient(): SupabaseClient {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!url || !key) throw new Error("Server configuration error: Supabase service role missing");
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

async function claimEvent(
    sb: SupabaseClient,
    event: Stripe.Event,
): Promise<"new" | "duplicate"> {
    const { error } = await sb.from("stripe_webhook_events").insert({
        event_id: event.id,
        event_type: event.type,
        livemode: event.livemode,
    });
    if (error) {
        // unique_violation → already processed
        if (error.code === "23505") return "duplicate";
        throw error;
    }
    return "new";
}

async function findProfileId(
    sb: SupabaseClient,
    match: ProfileMatch,
): Promise<string | null> {
    if (match.by === "client_reference_id" || match.by === "metadata_user") {
        const { data } = await sb.from("profiles").select("id").eq("id", match.value).maybeSingle();
        return data?.id ?? null;
    }
    if (match.by === "stripe_customer_id") {
        const { data } = await sb
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", match.value)
            .maybeSingle();
        return data?.id ?? null;
    }
    if (match.by === "stripe_subscription_id") {
        const { data } = await sb
            .from("profiles")
            .select("id")
            .eq("stripe_subscription_id", match.value)
            .maybeSingle();
        return data?.id ?? null;
    }
    return null;
}

async function applyBillingPatch(
    sb: SupabaseClient,
    profileId: string,
    patch: ProfileBillingPatch,
): Promise<void> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.subscription_status !== undefined) row.subscription_status = patch.subscription_status;
    if (patch.subscription_plan !== undefined) row.subscription_plan = patch.subscription_plan;
    if (patch.stripe_customer_id !== undefined) row.stripe_customer_id = patch.stripe_customer_id;
    if (patch.stripe_subscription_id !== undefined) {
        row.stripe_subscription_id = patch.stripe_subscription_id;
    }
    if (patch.subscription_current_period_end !== undefined) {
        row.subscription_current_period_end = patch.subscription_current_period_end;
    }
    const { error } = await sb.from("profiles").update(row).eq("id", profileId);
    if (error) throw error;
}

async function handleEvent(sb: SupabaseClient, event: Stripe.Event): Promise<string> {
    if (!isHandledStripeEventType(event.type)) {
        return "ignored";
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode && session.mode !== "subscription") {
            return "ignored_non_subscription";
        }
        const match = matchFromCheckoutSession(session);
        if (!match) return "no_match";
        const profileId = await findProfileId(sb, match);
        if (!profileId) return "profile_not_found";

        const patch: ProfileBillingPatch = {};
        const customer = typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        if (customer?.startsWith("cus_")) patch.stripe_customer_id = customer;
        const subId = typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subId?.startsWith("sub_")) patch.stripe_subscription_id = subId;
        const planMeta = session.metadata?.plan_id;
        if (planMeta === "solo" || planMeta === "team") patch.subscription_plan = planMeta;
        // Payment completed → active (subscription.* events refine status/period)
        if (session.payment_status === "paid" || session.status === "complete") {
            patch.subscription_status = "active";
        }
        await applyBillingPatch(sb, profileId, patch);
        return "ok";
    }

    if (
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
    ) {
        const sub = event.data.object as Stripe.Subscription;
        if (event.type === "customer.subscription.deleted") {
            // Force canceled mapping even if Stripe status lags
            (sub as { status: string }).status = "canceled";
        }
        const match = matchFromSubscription(sub);
        if (!match) return "no_match";
        const profileId = await findProfileId(sb, match);
        if (!profileId) return "profile_not_found";
        const patch = billingPatchFromSubscription(sub, planIdFromPriceId);
        await applyBillingPatch(sb, profileId, patch);
        return "ok";
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
        const invoice = event.data.object as Stripe.Invoice;
        const match = matchFromInvoice(invoice);
        if (!match) return "no_match";
        const profileId = await findProfileId(sb, match);
        if (!profileId) return "profile_not_found";

        const patch: ProfileBillingPatch = {};
        const customer = typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        if (customer?.startsWith("cus_")) patch.stripe_customer_id = customer;
        const subId = typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;
        if (subId?.startsWith("sub_")) patch.stripe_subscription_id = subId;

        if (event.type === "invoice.paid") {
            patch.subscription_status = "active";
            if (typeof invoice.lines?.data?.[0]?.period?.end === "number") {
                patch.subscription_current_period_end = new Date(
                    invoice.lines.data[0].period.end * 1000,
                ).toISOString();
            }
        } else {
            patch.subscription_status = mapStripeSubscriptionStatus("past_due") ?? "past_due";
        }
        await applyBillingPatch(sb, profileId, patch);
        return "ok";
    }

    return "ignored";
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { status: 200 });
    }
    if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET missing");
        return new Response(JSON.stringify({ error: "misconfigured" }), { status: 500 });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
        return new Response(JSON.stringify({ error: "missing_signature" }), { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        console.error("Webhook signature verification failed", err instanceof Error ? err.message : err);
        return new Response(JSON.stringify({ error: "invalid_signature" }), { status: 400 });
    }

    try {
        const sb = serviceClient();
        const claim = await claimEvent(sb, event);
        if (claim === "duplicate") {
            return new Response(JSON.stringify({ received: true, duplicate: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }
        const result = await handleEvent(sb, event);
        return new Response(JSON.stringify({ received: true, result }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("Webhook handler error", err);
        // Return 500 so Stripe retries; idempotency row may already exist — delete on failure?
        // If we claimed then failed, leave row so we don't double-apply partial state inconsistently.
        // Prefer: delete claim on failure so Stripe retry can re-process.
        try {
            const sb = serviceClient();
            await sb.from("stripe_webhook_events").delete().eq("event_id", event.id);
        } catch {
            /* ignore */
        }
        return new Response(JSON.stringify({ error: "handler_failed" }), { status: 500 });
    }
});
