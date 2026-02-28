# LEI 02: Variáveis de Ambiente no Vite (import.meta.env)

## MOTIVO
No Vite, o sistema de env é radicalmente diferente do Next.js.
- Prefixo de exposição pública: **`VITE_`** (não `NEXT_PUBLIC_`)
- Acesso: **`import.meta.env.VITE_*`** (não `process.env`)
- Tudo sem prefixo `VITE_` fica **invisível no browser** — mas também não existe no runtime do cliente.
  
Confundir esses padrões leva a: variáveis `undefined` em prod, ou pior — chaves secretas expostas no bundle JS.

## GATILHO
Ativado ao criar/usar variáveis de ambiente, integrar com Supabase, Stripe, Gemini ou qualquer API externa.

## REGRAS INEGOCIÁVEIS

### Prefixos Corretos
| Tipo | Prefixo | Acesso | Exposto no Bundle? |
|------|---------|--------|-------------------|
| URL pública do Supabase | `VITE_SUPABASE_URL` | `import.meta.env.VITE_SUPABASE_URL` | ✅ Sim (esperado) |
| Anon Key do Supabase | `VITE_SUPABASE_ANON_KEY` | `import.meta.env.VITE_SUPABASE_ANON_KEY` | ✅ Sim (esperado, é pública) |
| Chave pública do Stripe | `VITE_STRIPE_PUBLIC_KEY` | `import.meta.env.VITE_STRIPE_PUBLIC_KEY` | ✅ Sim (esperado) |
| Service Role Key | ❌ NUNCA no frontend | — | ☠️ Nunca expor |
| Chave secreta do Stripe | ❌ NUNCA no frontend | — | ☠️ Nunca expor |
| Chave do Gemini API | ❌ NUNCA no frontend sem proxy | — | ☠️ Nunca expor |

> ⚠️ **A Supabase Service Role ignora o RLS** — se vazar no bundle, qualquer usuário pode acessar todos os dados de todos.

### Chaves Secretas (Gemini, Stripe Secret)
Como este projeto é Vite SPA sem backend próprio, chaves secretas devem ser chamadas via:
1. **Supabase Edge Functions** (preferido) — a Edge Function recebe o request autenticado e chama a API externa.
2. **Proxy externo controlado** — nunca diretamente no código React.

```typescript
// ❌ ERRADO — Chave secreta no frontend
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_KEY)

// ✅ CORRETO — Chama uma Edge Function que detém a chave
const { data, error } = await supabase.functions.invoke('generate-response', {
  body: { prompt: userInput }
})
```

### Validação de Env na Inicialização
Crie um arquivo `src/lib/env.ts` que valide as variáveis críticas ao iniciar o app.
Detecta problemas em desenvolvimento antes de chegar em produção.

```typescript
// src/lib/env.ts
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const

for (const key of requiredEnvVars) {
  if (!import.meta.env[key]) {
    throw new Error(`[Config] Variável de ambiente obrigatória não encontrada: ${key}`)
  }
}

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  stripePublicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
}
```

### .env.example OBRIGATÓRIO
O arquivo `.env.example` DEVE existir na raiz do projeto com TODAS as variáveis (sem valores reais).
```bash
# .env.example
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_STRIPE_PUBLIC_KEY=pk_live_...
```

### .env NUNCA no Git
```bash
# .gitignore — OBRIGATÓRIO ter
.env
.env.local
.env.production
```
