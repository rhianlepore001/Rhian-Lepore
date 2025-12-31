-- Client CRM Fixes Migration
-- Run this in your Supabase SQL Editor

-- 1. Add is_active column for soft delete (if not exists)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Add notes column if not exists
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Ensure proper RLS policies for clients table
-- Drop existing policy if it exists (to recreate with proper permissions)
DROP POLICY IF EXISTS "Users manage own clients" ON clients;

-- Create comprehensive policy for clients
CREATE POLICY "Users manage own clients" ON clients
  FOR ALL USING (user_id = auth.uid());

-- 4. Fix storage policies for client_photos bucket
-- First ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('client_photos', 'client_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop and recreate storage policies to include UPDATE
DROP POLICY IF EXISTS "Public read access for client_photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client_photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client_photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client_photos" ON storage.objects;

-- Allow public read
CREATE POLICY "Public read access for client_photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'client_photos');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload client_photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'client_photos' AND auth.role() = 'authenticated');

-- Allow authenticated users to update (this is the critical one for photo updates)
CREATE POLICY "Authenticated users can update client_photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'client_photos' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete client_photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'client_photos' AND auth.role() = 'authenticated');

-- 5. Create index for faster client filtering
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clients_user_active ON clients(user_id, is_active);
