-- Add slug to team_members for individual professional links
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- Create public_clients table for persistent client sessions
CREATE TABLE IF NOT EXISTS public_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    photo_url TEXT,
    google_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_booking_at TIMESTAMPTZ,
    UNIQUE(business_id, phone)
);

-- Enable RLS
ALTER TABLE public_clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public_clients

-- Allow public access to insert (registration)
CREATE POLICY "Public can register as client" ON public_clients
    FOR INSERT
    WITH CHECK (true);

-- Allow public to select their own data (based on phone/email match - simulated via application logic or local storage token usually)
-- Since we are using a "public" app context without real Supabase Auth for clients (yet), 
-- we will allow SELECT based on business_id for now, 
-- but in a real protected scenario we would use a session token system.
-- For this MVP/SaaS model where RLS is strictly for Business Owners vs Public:
-- Business Owners can view all their public_clients.
-- Public anonymously ... this is tricky with RLS if not authenticated.
-- We will allow SELECT for anon for now to facilitate the "check if exists" flow, 
-- but usually you'd want a secure RPC for "check_client_exists".

CREATE POLICY "Business owners can view their public clients" ON public_clients
    FOR ALL
    USING (auth.uid() = business_id);

-- Ideally we use a secure function to lookup client by phone without exposing the table
CREATE OR REPLACE FUNCTION get_public_client_by_phone(
    p_business_id UUID,
    p_phone TEXT
) RETURNS TABLE (
    id UUID,
    name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    photo_url TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name, c.email, c.phone, c.photo_url
    FROM public_clients c
    WHERE c.business_id = p_business_id AND c.phone = p_phone;
END;
$$;
