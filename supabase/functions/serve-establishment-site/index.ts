import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createServeEstablishmentSiteHandler } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const client = createClient(supabaseUrl, anonKey);

const handler = createServeEstablishmentSiteHandler({
  async readPublishedFile(path) {
    const { data, error } = await client.storage.from('published-sites').download(path);
    if (error || !data) return null;
    return await data.text();
  },
});

Deno.serve(handler);
