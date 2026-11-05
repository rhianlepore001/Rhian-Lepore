import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
    collectAllowedOrigins,
    isAllowedCheckoutMode,
    isAllowedReturnUrl,
} from "./allowlist.ts";
import {
    checkoutTrialEnd,
    configuredPriceIds,
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

    try {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) {
            throw new HttpError(500, "Server configuration error: Stripe key missing");
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
            throw new HttpError(500, "Server configuration error: plan price not configured");
        }

        const allowedOrigins = collectAllowedOrigins(Deno.env.get("CHECKOUT_ALLOWED_ORIGINS"));
        if (!isAllowedReturnUrl(successUrl, allowedOrigins)) throw new HttpError(400, "successUrl not allowed");
        if (!isAllowedReturnUrl(cancelUrl, allowedOrigins)) throw new HttpError(400, "cancelUrl not allowed");
        if (!isAllowedCheckoutMode(mode)) throw new HttpError(400, "Checkout mode not allowed");

        const { data: profile } = await supabaseClient
            .from("profiles")
            .select("stripe_customer_id, subscription_status, trial_ends_at")
            .eq("id", user.id)
            .single();

        let customerId = profile?.stripe_customer_id;
        if (!customerId) {
            const customers = await stripe.customers.list({ email: user.email, limit: 1 });
            if (customers.data.length > 0) {
                customerId = customers.data[0].id;
            } else {
                const newCustomer = await stripe.customers.create({
                    email: user.email,
                    metadata: { supabase_user_id: user.id },
                });
                customerId = newCustomer.id;
            }
            const { error: stripeIdError } = await supabaseClient.rpc("set_stripe_customer_id_for_caller", {
                p_customer_id: customerId,
            });
            if (stripeIdError) throw stripeIdError;
        }

        const metadata = { supabase_user_id: user.id, plan_id: planId, currency };
        const trialEnd = checkoutTrialEnd(profile?.subscription_status, profile?.trial_ends_at);

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            client_reference_id: user.id,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: "subscription",
            success_url: successUrl,
            cancel_url: cancelUrl,
            allow_promotion_codes: true,
            metadata,
            subscription_data: {
                metadata,
                ...(trialEnd ? { trial_end: trialEnd } : {}),
            },
        });

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        console.error("Error:", error);
        const status = error instanceof HttpError ? error.status : 400;
        const message = error instanceof Error ? error.message : "Unexpected error";
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status,
        });
    }
});
