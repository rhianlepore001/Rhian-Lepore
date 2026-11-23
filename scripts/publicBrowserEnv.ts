const PUBLIC_BROWSER_VARIABLES = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_META_PIXEL_ID',
  'VITE_DEV_EMAIL',
  'VITE_STRIPE_PRICE_SOLO_BRL',
  'VITE_STRIPE_PRICE_TEAM_BRL',
  'VITE_STRIPE_PRICE_SOLO_EUR',
  'VITE_STRIPE_PRICE_TEAM_EUR',
];

function readJwtRole(key: string): unknown {
  const segments = key.split('.');
  if (segments.length !== 3) return undefined;
  try {
    return JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'))?.role;
  } catch {
    return undefined;
  }
}

export function publicBrowserDefines(environment: Record<string, string>) {
  const supabaseKey = environment.VITE_SUPABASE_ANON_KEY?.trim();
  const role = supabaseKey ? readJwtRole(supabaseKey) : undefined;
  if (supabaseKey?.startsWith('sb_secret_') || (role !== undefined && role !== 'anon')) {
    throw new Error('VITE_SUPABASE_ANON_KEY requer a chave publicável ou a chave anon do Supabase.');
  }

  return Object.fromEntries(PUBLIC_BROWSER_VARIABLES
    .filter((name) => environment[name] !== undefined)
    .map((name) => [`import.meta.env.${name}`, JSON.stringify(environment[name])]));
}
