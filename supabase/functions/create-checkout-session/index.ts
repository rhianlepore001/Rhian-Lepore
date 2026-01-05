
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

        // 1. Check if customer exists in your database or Stripe
        // For simplicity, we search customer by email in Stripe or create a new one
        // In a real app, you should store stripe_customer_id in your users table
        const customers = await stripe.customers.list({
            email: user.email,
            limit: 1,
        });

        let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

        if (!customerId) {
            // Create new customer
            const newCustomer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    supabase_user_id: user.id
                }
            });
            customerId = newCustomer.id;
        }

        // 2. Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: mode,
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
        // Keep only critical error logging
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
