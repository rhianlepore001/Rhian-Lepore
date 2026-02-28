# LEI 13: Isolamento de Ambientes de Deploy (Vercel Env)

## MOTIVO
A AWS, Vercel ou outras plataformas lidam com as etapas Preview, Development e Production. Garantir que as variáveis de desenvolvimento nunca sejam importadas em ambiente Vercel Production previne vazamento cross-env e bugs catastróficos.

## GATILHO
Ativado ao criar arquivos config, clientes que busquem URL do banco, STRIPE_KEYS, webhooks.

## SEGREGAÇÃO OBRIGATÓRIA

### Supabase URL e Chaves
Nunca commite chaves de projetos de banco reais para Github.
O projeto Vercel deverá possuir ambientes configurados para as variáveis.

### Validação Fortificada (TypeScript)
TypeScript não sabe tipar e exigir a presença rigorosa do `process.env`.
Recomenda-se utilizar as bibliotecas de Schema validation (`Zod` via `@t3-oss/env-nextjs` por exemplo) se um env file for denso. Alternativamente, criar checagens vigorosas de runtime e throw Errors em startup caso itens chaves como Supabase URls não existam.

## PROIBIÇÕES
- Hardcode de `http://localhost:3000` absoluto como base URL no código para Fetch em rotas API. Isso impede previews na Vercel e chamadas de domínio finais de funcionarem.
- Uso de prefixos estáticos como `DEV_DATABASE_URL` no código fonte final.

## MODO CORRETO E DINÂMICO
A Vercel injeta nativamente `VERCEL_URL` (host da preview deployada branch per branch) e o Next.js lida dinamicamente com as variações dos arquivos `.env.local`, `.env.development`, `.env.production`. O código fonte só precisa pedir o nome genérico da flag. O build system de deploy resolverá qual é o apropriado.

```typescript
// /lib/utils/getBaseUrl.ts
export function getBaseUrl() {
  if (typeof window !== "undefined") return "" // No Client side: chamadas relativas /api/route são relativas a base da URL

  // Backend Vercel Deployado (Preview Branches / Production Deploy)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Fallback dev system local npm run dev
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
}

// Uso para webhooks, redirecionamentos absolutos:
const urlCallback = `${getBaseUrl()}/auth/callback` 

// /lib/config/env.ts - VALIDACÃO CRÍTICA (Simples)
export const ENV = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  STRIPE_KEY: process.env.STRIPE_SECRET_KEY,
}

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase configuration in environments variables")
}
```
