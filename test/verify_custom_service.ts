/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load env vars
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCustomService() {
    console.log('--- Testing Custom Service Booking ---');

    // 1. Get a business, professional and client
    const { data: business } = await supabase.from('user_profiles').select('id').eq('role', 'business_owner').limit(1).single();
    if (!business) throw new Error('No business found');

    const { data: pro } = await supabase.from('user_profiles').select('id').eq('role', 'professional').limit(1).single();
    // If no pro, use business as pro
    const proId = pro?.id || business.id;

    const { data: clients } = await supabase.from('clients').select('id, name, phone, email').limit(1);
    if (!clients || clients.length === 0) throw new Error('No clients found');
    const client = clients[0];

    console.log(`Business: ${business.id}`);
    console.log(`Pro: ${proId}`);
    console.log(`Client: ${client.name} (${client.id})`);

    // 2. Define booking details
    // Use a time in the future to avoid collisions with existing recent tests
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(14, 0, 0, 0);

    const customServiceName = "Corte Teste Automatizado";
    const customPrice = 123.45;

    // 3. Call RPC
    console.log('Calling create_secure_booking...');
    const { data, error } = await supabase.rpc('create_secure_booking', {
        p_business_id: business.id,
        p_professional_id: proId,
        p_customer_name: client.name,
        p_customer_phone: client.phone,
        p_customer_email: client.email,
        p_appointment_time: tomorrow.toISOString(),
        p_service_ids: [], // No standard services
        p_total_price: customPrice,
        p_duration_min: 45,
        p_status: 'Confirmed',
        p_client_id: client.id,
        p_notes: 'Test note',
        p_custom_service_name: customServiceName
    });

    if (error) {
        console.error('RPC Error:', error);
        process.exit(1);
    }

    console.log('RPC Result:', data);

    if (!data.success) {
        console.error('Booking failed:', data.message);
        process.exit(1);
    }

    const bookingId = data.booking_id;
    console.log(`Booking created with ID: ${bookingId}`);

    // 4. Verify insertion
    console.log('Verifying appointment record...');
    const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', bookingId)
        .single();

    if (fetchError) {
        console.error('Fetch Error:', fetchError);
        process.exit(1);
    }

    console.log('Appointment Record:', appointment);

    if (appointment.service !== customServiceName) {
        console.error(`Mismatch! Expected service '${customServiceName}', got '${appointment.service}'`);
        // Note: If logic appends, it might be different. But we sent empty p_service_ids.
    } else {
        console.log('SUCCESS: Service name matches!');
    }

    if (Math.abs(appointment.price - customPrice) > 0.01) {
        console.error(`Mismatch! Expected price ${customPrice}, got ${appointment.price}`);
    } else {
        console.log('SUCCESS: Price matches!');
    }

    // Clean up
    console.log('Cleaning up...');
    await supabase.from('appointments').delete().eq('id', bookingId);
    console.log('Done.');
}

testCustomService().catch(console.error);
