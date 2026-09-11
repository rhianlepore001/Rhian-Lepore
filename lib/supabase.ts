import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        'Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. ' +
        'Configure-as no arquivo .env.local.'
    );
}

export const supabase = createClient(supabaseUrl!, supabaseKey!);

/** Cliente sem sessão persistida — RPCs públicas (convite) não esperam refresh de auth. */
export const supabasePublic = createClient(supabaseUrl!, supabaseKey!, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
    },
});
