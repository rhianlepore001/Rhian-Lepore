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

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

class CheckoutError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
            status: 405,
        });
    }

    try {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!stripeKey || !serviceKey) {
            throw new CheckoutError(503, "Checkout temporarily unavailable");
        }

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        const {
            data: { user }, error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            throw new CheckoutError(401, "Authentication required");
        }

        const body = await req.json().catch(() => null);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new CheckoutError(400, "Invalid checkout request");
        }
        const { priceId, successUrl, cancelUrl, mode = "subscription" } = body;

        if (!priceId) {
            throw new CheckoutError(400, "Price ID is required");
        }

        const allowedPrices = collectAllowedPriceIds([
            Deno.env.get("STRIPE_PRICE_SOLO_BRL"),
            Deno.env.get("STRIPE_PRICE_TEAM_BRL"),
            Deno.env.get("STRIPE_PRICE_SOLO_EUR"),
            Deno.env.get("STRIPE_PRICE_TEAM_EUR"),
            Deno.env.get("VITE_STRIPE_PRICE_SOLO_BRL"),
            Deno.env.get("VITE_STRIPE_PRICE_TEAM_BRL"),
            Deno.env.get("VITE_STRIPE_PRICE_SOLO_EUR"),
            Deno.env.get("VITE_STRIPE_PRICE_TEAM_EUR"),
        ]);
        if (!isAllowedPriceId(priceId, allowedPrices)) {
            throw new CheckoutError(400, "Price ID not allowed");
        }

        const allowedOrigins = collectAllowedOrigins(Deno.env.get("CHECKOUT_ALLOWED_ORIGINS"));
        if (!isAllowedReturnUrl(successUrl, allowedOrigins)) {
            throw new CheckoutError(400, "successUrl not allowed");
        }
        if (!isAllowedReturnUrl(cancelUrl, allowedOrigins)) {
            throw new CheckoutError(400, "cancelUrl not allowed");
        }
        if (!isAllowedCheckoutMode(mode)) {
            throw new CheckoutError(400, "Checkout mode not allowed");
        }
        const safeMode = "subscription";

        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id, role, company_id, stripe_customer_id')
            .eq('id', user.id)
            .single();

        if (profileError) {
            throw new CheckoutError(500, "Unable to verify billing profile");
        }
        if (!profile || profile.id !== user.id || profile.role !== 'owner'
            || (profile.company_id?.trim() || profile.id) !== profile.id) {
            throw new CheckoutError(403, "Owner account required");
        }

        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
        let customerId = profile?.stripe_customer_id;

        if (customerId) {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer.deleted || customer.metadata?.supabase_user_id !== user.id) {
                throw new CheckoutError(409, "Customer ownership could not be verified");
            }
        } else {
            const newCustomer = await stripe.customers.create({
                email: user.email,
                metadata: { supabase_user_id: user.id },
            }, { idempotencyKey: `agendix-customer-${user.id}` });
            customerId = newCustomer.id;

            const backend = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey, {
                auth: { persistSession: false, autoRefreshToken: false },
            });
            const { data: boundCustomer, error: stripeIdError } = await backend.rpc('set_stripe_customer_id_for_user', {
                p_user_id: user.id,
                p_customer_id: customerId,
            });
            if (stripeIdError || boundCustomer !== customerId) {
                throw new CheckoutError(500, "Unable to bind billing customer");
            }
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
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
            },
        });

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        const status = error instanceof CheckoutError ? error.status : 500;
        const message = error instanceof CheckoutError ? error.message : "Unable to create checkout";
        console.error("Checkout request failed", { status });
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status,
        });
    }
});
