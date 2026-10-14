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

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
});

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
            }
        );

        const {
            data: { user },
        } = await supabaseClient.auth.getUser();

        if (!user) {
            throw new Error("User not found");
        }

        const { priceId, successUrl, cancelUrl, mode = "subscription" } = await req.json();

        if (!priceId) {
            throw new Error("Price ID is required");
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
            throw new Error("Price ID not allowed");
        }

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
        const safeMode = "subscription";

        // 1. Check if customer exists in your database
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single();

        let customerId = profile?.stripe_customer_id;

        if (!customerId) {
            // 2. Check if customer exists in Stripe by email
            const customers = await stripe.customers.list({
                email: user.email,
                limit: 1,
            });

            if (customers.data.length > 0) {
                customerId = customers.data[0].id;
            } else {
                // 3. Create new customer
                const newCustomer = await stripe.customers.create({
                    email: user.email,
                    metadata: {
                        supabase_user_id: user.id
                    }
                });
                customerId = newCustomer.id;
            }

            // 4. Save stripe_customer_id via SECURITY DEFINER RPC (billing cols are immutable for clients)
            const { error: stripeIdError } = await supabaseClient.rpc('set_stripe_customer_id_for_caller', {
                p_customer_id: customerId,
            });
            if (stripeIdError) {
                throw stripeIdError;
            }
        }

        // 5. Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: safeMode,
            automatic_payment_methods: {
                enabled: true,
            },
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
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
