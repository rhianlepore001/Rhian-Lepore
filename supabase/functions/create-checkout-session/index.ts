import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
    collectAllowedOrigins,
    collectAllowedPriceIds,
    isAllowedCheckoutMode,
    isAllowedPriceId,
    isAllowedReturnUrl,
} from "./allowlist.ts";
import {
    isAgendixPlanId,
    isPlanCurrency,
    planIdFromPriceId,
    regionToPlanCurrency,
    isStripeTestModeKey,
    resolvePlanPriceId,
    type AgendixPlanId,
    type PlanCurrency,
} from "./planPrices.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function envGet(key: string): string | undefined {
    const v = Deno.env.get(key);
    return v == null || v === "" ? undefined : v;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) {
            throw new Error("Server configuration error: Stripe key missing");
        }

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            },
        );

        const {
            data: { user },
        } = await supabaseClient.auth.getUser();

        if (!user) {
            throw new Error("User not found");
        }

        const body = await req.json();
        const {
            priceId: clientPriceId,
            planId: clientPlanId,
            currency: clientCurrency,
            region: clientRegion,
            successUrl,
            cancelUrl,
            mode = "subscription",
        } = body ?? {};

        const allowedOrigins = collectAllowedOrigins(Deno.env.get("CHECKOUT_ALLOWED_ORIGINS"));
        if (!isAllowedReturnUrl(successUrl, allowedOrigins)) {
            throw new Error("successUrl not allowed");
        }
        if (!isAllowedReturnUrl(cancelUrl, allowedOrigins)) {
            throw new Error("cancelUrl not allowed");
        }
        if (!isAllowedCheckoutMode(mode)) {
            throw new Error("Checkout mode not allowed");
        }
        const safeMode = "subscription" as const;
        const preferTestmode = isStripeTestModeKey(stripeKey);

        const allowedPrices = collectAllowedPriceIds([
            Deno.env.get("STRIPE_PRICE_SOLO_BRL"),
            Deno.env.get("STRIPE_PRICE_TEAM_BRL"),
            Deno.env.get("STRIPE_PRICE_SOLO_EUR"),
            Deno.env.get("STRIPE_PRICE_TEAM_EUR"),
            Deno.env.get("VITE_STRIPE_PRICE_SOLO_BRL"),
            Deno.env.get("VITE_STRIPE_PRICE_TEAM_BRL"),
            Deno.env.get("VITE_STRIPE_PRICE_SOLO_EUR"),
            Deno.env.get("VITE_STRIPE_PRICE_TEAM_EUR"),
            Deno.env.get("VITE_STRIPE_PRICE_SOLO_EU"),
            Deno.env.get("VITE_STRIPE_PRICE_TEAM_EU"),
        ]);

        // Resolve price from server-side plan config; never trust an arbitrary client price.
        let planId: AgendixPlanId | null = isAgendixPlanId(clientPlanId) ? clientPlanId : null;
        let currency: PlanCurrency | null = isPlanCurrency(clientCurrency)
            ? clientCurrency
            : null;
        if (!currency && typeof clientRegion === "string") {
            currency = regionToPlanCurrency(clientRegion);
        }

        const EUR_PRICE_IDS = new Set([
            "price_1UHgTGBoBv5fVrkr4GO9Qa2x",
            "price_1UHgTGBoBv5fVrkrY2JCGvs5",
            "price_1UHfuNPUPmLLh2qEUiuYaUyN",
            "price_1UHfuNPUPmLLh2qEaolUiKUI",
        ]);

        let priceId: string | null = null;
        if (planId) {
            if (!currency) currency = "BRL";
            priceId = resolvePlanPriceId(planId, currency, envGet, preferTestmode);
        } else if (typeof clientPriceId === "string" && clientPriceId.startsWith("price_")) {
            // Legacy: client sends priceId — map to plan and re-resolve from server env (do not trust raw id).
            if (!isAllowedPriceId(clientPriceId, allowedPrices)) {
                throw new Error("Price ID not allowed");
            }
            planId = planIdFromPriceId(clientPriceId);
            if (!planId) {
                throw new Error("Price ID not allowed");
            }
            if (!currency) {
                currency = EUR_PRICE_IDS.has(clientPriceId) ? "EUR" : "BRL";
            }
            priceId = resolvePlanPriceId(planId, currency, envGet, preferTestmode);
        } else {
            throw new Error("planId or priceId is required");
        }

        if (!isAllowedPriceId(priceId, allowedPrices)) {
            throw new Error("Price ID not allowed");
        }

        const { data: profile } = await supabaseClient
            .from("profiles")
            .select("stripe_customer_id")
            .eq("id", user.id)
            .single();

        let customerId = profile?.stripe_customer_id as string | undefined;

        if (!customerId) {
            const customers = await stripe.customers.list({
                email: user.email,
                limit: 1,
            });

            if (customers.data.length > 0) {
                customerId = customers.data[0].id;
            } else {
                const newCustomer = await stripe.customers.create({
                    email: user.email,
                    metadata: {
                        supabase_user_id: user.id,
                    },
                });
                customerId = newCustomer.id;
            }

            const { error: stripeIdError } = await supabaseClient.rpc(
                "set_stripe_customer_id_for_caller",
                { p_customer_id: customerId },
            );
            if (stripeIdError) {
                throw stripeIdError;
            }
        }

        // Checkout Sessions: omit PaymentIntents-only options; omit payment_method_types for Dashboard dynamic PMs (Stripe best practices).
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            client_reference_id: user.id,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: safeMode,
            success_url: successUrl,
            cancel_url: cancelUrl,
            allow_promotion_codes: true,
            metadata: {
                supabase_user_id: user.id,
                plan_id: planId ?? "",
                currency: currency ?? "",
            },
            subscription_data: {
                metadata: {
                    supabase_user_id: user.id,
                    plan_id: planId ?? "",
                },
            },
        });

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        console.error("Error:", error);
        const message = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
