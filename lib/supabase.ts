import { createClient } from '@supabase/supabase-js';
import { captureRecoveryCallback } from '../utils/authRecoveryLink';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        'Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. ' +
        'Configure-as no arquivo .env.local.'
    );
}

// Antes do createClient: o supabase-js lê a URL ao iniciar e o HashRouter não
// entende `#access_token=…`. O link de redefinição vira `/#/update-password`.
captureRecoveryCallback();

export const supabase = createClient(supabaseUrl!, supabaseKey!);
