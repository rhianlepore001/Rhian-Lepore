import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
    collectAllowedOrigins,
    isAllowedCheckoutMode,
    isAllowedReturnUrl,
} from "./allowlist.ts";
import {
    CHECKOUT_STRIPE_API_VERSION,
    buildCheckoutSessionParams,
    checkoutTrialEnd,
    configuredPriceIds,
    resolveCheckoutCustomer,
    isAgendixPlanId,
    isPlanCurrency,
    priceEnvKey,
    resolvePlanPriceId,
    type AgendixPlanId,
    type PlanCurrency,
} from "../_shared/billing.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

const envGet = (k: string) => Deno.env.get(k);

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "method_not_allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
        });
    }

    try {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) {
            throw new Error("Stripe key missing");
        }
        const stripe = new Stripe(stripeKey, {
            apiVersion: "2023-10-16",
            httpClient: Stripe.createFetchHttpClient(),
        });

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
        );

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new HttpError(401, "User not found");

        const body = await req.json();
        const { successUrl, cancelUrl, mode = "subscription" } = body ?? {};

        // Plan → price is resolved server-side from config (STRIPE_PRICE_<PLAN>_<CUR>).
        // Legacy clients that still send `priceId` are accepted only when it is one of
        // the configured prices (mapped back to its plan); nothing is hard-coded here.
        let planId: AgendixPlanId | null = isAgendixPlanId(body?.planId) ? body.planId : null;
        let currency: PlanCurrency | null = isPlanCurrency(body?.currency) ? body.currency : null;
        if ((!planId || !currency) && typeof body?.priceId === "string") {
            const legacy = configuredPriceIds(envGet).get(body.priceId);
            if (legacy) {
                planId = legacy.planId;
                currency = legacy.currency;
            }
        }
        if (!planId || !currency) throw new HttpError(400, "Plan not allowed");

        const priceId = resolvePlanPriceId(planId, currency, envGet);
        if (!priceId) {
            console.error(`Missing/invalid secret ${priceEnvKey(planId, currency)}`);
            throw new Error("Plan price not configured");
        }

        const allowedOrigins = collectAllowedOrigins(Deno.env.get("CHECKOUT_ALLOWED_ORIGINS"));
        if (!isAllowedReturnUrl(successUrl, allowedOrigins)) throw new HttpError(400, "successUrl not allowed");
        if (!isAllowedReturnUrl(cancelUrl, allowedOrigins)) throw new HttpError(400, "cancelUrl not allowed");
        if (!isAllowedCheckoutMode(mode)) throw new HttpError(400, "Checkout mode not allowed");

        const { data: profile, error: profileError } = await supabaseClient
            .from("profiles")
            .select("role, stripe_customer_id, subscription_status, trial_ends_at")
            .eq("id", user.id)
            .maybeSingle();
        if (profileError) throw profileError;
        if (profile?.role !== "owner") throw new HttpError(403, "Owner access required");

        const customerId = await resolveCheckoutCustomer(
            profile.stripe_customer_id,
            user.email ?? "",
            user.id,
            {
                retrieve: async (id) => {
                    const customer = await stripe.customers.retrieve(id);
                    return customer.deleted ? null : customer;
                },
                listByEmail: async (email) => (await stripe.customers.list({ email, limit: 100 })).data,
                create: (email, uid, idempotencyKey) => stripe.customers.create(
                    { email, metadata: { supabase_user_id: uid } },
                    { idempotencyKey },
                ),
            },
        );
        const trialEnd = checkoutTrialEnd(profile.subscription_status, profile.trial_ends_at);
        const params = buildCheckoutSessionParams({
            customerId,
            userId: user.id,
            planId,
            currency,
            priceId,
            successUrl,
            cancelUrl,
            trialEnd,
        });

        // adaptive_pricing exige a API 2024-11-20+; só esta chamada usa essa versão.
        const session = await stripe.checkout.sessions.create(
            params as unknown as Stripe.Checkout.SessionCreateParams,
            { apiVersion: CHECKOUT_STRIPE_API_VERSION },
        );

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        if (!(error instanceof HttpError || error instanceof SyntaxError)) console.error("checkout_failed");
        const status = error instanceof HttpError ? error.status : error instanceof SyntaxError ? 400 : 500;
        const message = error instanceof HttpError ? error.message : status === 400 ? "Invalid JSON" : "Checkout unavailable";
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status,
        });
    }
});
