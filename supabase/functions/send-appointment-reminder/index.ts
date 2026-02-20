import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface Booking {
    id: string;
    start_time: string;
    customer_name: string; // Joined from clients
    customer_email: string; // Joined from clients or metadata
    service_name: string; // Joined from services
    business_name: string; // Joined from business_profiles
    business_theme: string; // Joined from business_settings or metadata
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

        // 1. Get appointments for tomorrow (start of day to end of day)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const startOfDay = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString();

        // Query bookings that are confirmed and haven't had a reminder sent
        // Note: This assumes we have a way to track reminders sent, e.g., a 'reminder_sent' bool or log table.
        // For MVP, we might just query all and assume the cron only runs once/day for this specific range,
        // OR filter by a flag if added. Let's assume standard 'bookings' table structure + joins.
        // Since complex joins are hard via partial types, we might use an RPC or careful select using implicit foreign keys if setup.
        // Let's try a direct select assuming standard schema.

        const { data: bookings, error: bookingError } = await supabaseClient
            .from("bookings")
            .select(`
        id,
        start_time,
        status,
        clients (name, email),
        services (name, price),
        business_profiles (business_name),
        business_settings:business_id (enable_email_reminders)
      `)
            .eq("status", "confirmed")
            .eq("business_settings.enable_email_reminders", true) // Only send if enabled
            .gte("start_time", startOfDay)
            .lte("start_time", endOfDay);
        // .is("reminder_sent_at", null) // Ideal if we add this column

        if (bookingError) throw bookingError;

        if (!bookings || bookings.length === 0) {
            return new Response(
                JSON.stringify({ message: "No bookings specifically for tomorrow to remind." }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const results = [];

        for (const booking of bookings) {
            const clientEmail = (booking.clients as any)?.email;
            const clientName = (booking.clients as any)?.name || "Cliente";
            const serviceName = (booking.services as any)?.name || "Serviço";
            const businessName = (booking.business_profiles as any)?.business_name || "Barbearia/Salão";
            const date = new Date(booking.start_time);
            const timeString = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

            if (clientEmail) {
                // Simple HTML Template
                const html = `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
            <h2>Olá, ${clientName}!</h2>
            <p>Lembrete do seu agendamento em <strong>${businessName}</strong>.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Serviço:</strong> ${serviceName}</p>
              <p><strong>Data:</strong> Amanhã, ${date.toLocaleDateString("pt-BR")}</p>
              <p><strong>Horário:</strong> ${timeString}</p>
            </div>
            <p>Se precisar reagendar, entre em contato conosco ou use o link de agendamento.</p>
            <p style="color: #666; font-size: 12px; margin-top: 40px;">Enviado via Barber/Beauty OS</p>
          </div>
        `;

                const { data, error } = await resend.emails.send({
                    from: "Lembretes <nao-responda@seudominio.com>", // User needs to configure domain
                    to: [clientEmail],
                    subject: `Lembrete: Seu agendamento amanhã às ${timeString}`,
                    html: html,
                });

                if (error) {
                    console.error(`Error sending to ${clientEmail}:`, error);
                    results.push({ id: booking.id, status: 'failed', error });
                } else {
                    // Mark as sent (optional: update database)
                    // await supabaseClient.from('bookings').update({ reminder_sent_at: new Date() }).eq('id', booking.id);
                    results.push({ id: booking.id, status: 'sent', data });
                }
            } else {
                results.push({ id: booking.id, status: 'skipped_no_email' });
            }
        }

        return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
