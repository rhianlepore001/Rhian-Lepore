import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createReminderJobHandler, escapeReminderHtml } from "./handler.ts";

interface ReminderBooking {
    id: string;
    start_time: string;
    clients: { name: string | null; email: string | null } | null;
    services: { name: string | null } | null;
    business_profiles: { business_name: string | null } | null;
    business_settings: { enable_email_reminders: boolean | null } | null;
}

serve(createReminderJobHandler(Deno.env.get("REMINDER_JOB_SECRET"), async () => {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("REMINDER_FROM_EMAIL");
    if (!url || !key || !resendKey || !from) throw new Error("Reminder configuration missing");
    const supabaseClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfDay = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString();

    const { data: bookings, error } = await supabaseClient
        .from("bookings")
        .select(`
            id,
            start_time,
            clients (name, email),
            services (name),
            business_profiles (business_name),
            business_settings:business_id (enable_email_reminders)
        `)
        .eq("status", "confirmed")
        .eq("business_settings.enable_email_reminders", true)
        .gte("start_time", startOfDay)
        .lte("start_time", endOfDay)
        .returns<ReminderBooking[]>();
    if (error) throw error;

    const result = { sent: 0, failed: 0, skipped: 0 };
    for (const booking of bookings ?? []) {
        const email = booking.clients?.email;
        if (!email || booking.business_settings?.enable_email_reminders !== true) {
            result.skipped++;
            continue;
        }

        const clientName = escapeReminderHtml(booking.clients?.name || "Cliente");
        const serviceName = escapeReminderHtml(booking.services?.name || "Serviço");
        const businessName = escapeReminderHtml(booking.business_profiles?.business_name || "Barbearia/Salão");
        const date = new Date(booking.start_time);
        const timeString = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Olá, ${clientName}!</h2>
            <p>Lembrete do seu agendamento em <strong>${businessName}</strong>.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Serviço:</strong> ${serviceName}</p>
              <p><strong>Data:</strong> Amanhã, ${date.toLocaleDateString("pt-BR")}</p>
              <p><strong>Horário:</strong> ${timeString}</p>
            </div>
            <p>Se precisar reagendar, entre em contato conosco ou use o link de agendamento.</p>
            <p style="color: #666; font-size: 12px; margin-top: 40px;">Enviado via AgendiX</p>
          </div>`;

        try {
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${resendKey}`,
                    "Content-Type": "application/json",
                    "Idempotency-Key": `appointment-reminder/${booking.id}/${date.toISOString()}`,
                },
                body: JSON.stringify({ from, to: [email], subject: `Lembrete: Seu agendamento amanhã às ${timeString}`, html }),
                signal: AbortSignal.timeout(5000),
            });
            await response.body?.cancel();
            if (response.ok) result.sent++;
            else result.failed++;
        } catch {
            result.failed++;
        }
    }
    return result;
}));
