# AgendiX

SaaS para gestão de barbearias e salões de beleza. Agenda, financeiro, colaboradores e relatórios — tudo em um lugar.

## Começando

**Pré-requisitos:** Node.js 18+

```bash
npm install
cp .env.example .env.local   # preencha com suas credenciais
npm run dev                  # http://localhost:3000
```

## Variáveis de ambiente obrigatórias

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_OPENROUTER_API_KEY=
```

## Seed demo (prints)

Tenants fictícios isolados (barber + beauty), sem misturar dado real: [`docs/demo-seed.md`](docs/demo-seed.md).

```bash
npm run seed:demo
# escrita: npm run seed:demo -- --apply --confirm=SEED_DEMO_TENANTS
```

## Comandos

```bash
npm run dev          # desenvolvimento
npm run build        # produção (saída em dist/)
npm run lint         # ESLint (falha em warnings)
npm run typecheck    # TypeScript check
npm test             # testes com Vitest
```

## Stack

- React 19 + TypeScript + Vite
- Supabase (PostgreSQL + RLS + Auth)
- Tailwind CSS
- OpenRouter (IA via Gemini Flash)
- Stripe (pagamentos)
- Vercel (deploy)
