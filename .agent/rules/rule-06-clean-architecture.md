# LEI 06: Arquitetura Limpa e App Router (Next.js)

## MOTIVO
Adequar-se estritamente ao framework (Next.js App Router) e evitar "arquiteturas inventadas" baseadas em Express ou FastAPI (como `routers/`, `controllers/`) que quebram o fluxo Server Components/Client Components.

## GATILHO
Ativado ao criar nova modelagem funcional, novos domínios do sistema (ex: cobrança, agendamentos) ou responder formulários do usuário e chamadas de API.

## ESTRUTURA DE CAMADAS NO NEXT.JS

### Server Actions (Mutations)
Para operações que alteram o banco de dados e acontecem por interações do usuário (botões, submissão de formulários), o padrão obrigatório é criar **Server Actions** (`"use server"` export function) e não criar endpoints em `app/api/... ` apenas para servir um frontend Next.js.

### Server Components (Data Fetching)
A leitura de dados para renderizar a UI DEVE acontecer em React Server Components (RSC) assíncronos (`export default async function Page()`). Passe apenas o dado filtrado (Props) para os Client Components. Evite hooks de data fetching como `useEffect` no client.

### Route Handlers (APIs Externas)
As pastas `/api/...` (Route Handlers, exports HTTP GET/POST) só devem ser utilizadas quando seu sistema precisa ser chamado por máquinas externas, como um App mobile nativo ou webhooks de pagamentos (ex: Stripe).

### Lógica Core em Único Ponto (DRY)
Funções densas e reaproveitáveis de regra de negócio (ex: cálculo complexo de pagamentos) NÃO devem ficar perdidas no meio do Server Action ou Server Component. Mova para funções auxiliares puras do TS em uma pasta `/utils/` ou `/lib/`.

## EXEMPLO ERRADO
```typescript
// app/api/billing/route.ts (Criando rotas API desnecessárias estilo SPA)
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  // Lógica de cálculo pesada misturada com o parse do Request e injetando dependência forte
  const payload = await req.json()
  const discount = payload.plan === "pro" ? 0.1 : 0
  const finalPrice = payload.amount * (1 - discount)
  // ...
  return Response.json({ status: "ok" })
}

// app/page.tsx
"use client"
import { useEffect, useState } from 'react'
// Fazendo chamadas REST num client component para uma API do próprio Next.js
export default function Page() {
  const [data, setData] = useState()
  useEffect(() => { fetch('/api/data').then(res => res.json()).then(setData) }, [])
  return <div>Carregando...</div>
}
```

## EXEMPLO CORRETO
```typescript
// lib/billing/calculateDiscount.ts (Puro TypeScript - Testável, lógica isolada)
export function calculateDiscount(plan: string, amount: number) {
  const discount = plan === "pro" ? 0.1 : 0
  return amount * (1 - discount)
}

// app/actions/billing.ts (Mutations do App)
"use server"
import { createClient } from '@/utils/supabase/server'
import { calculateDiscount } from '@/lib/billing/calculateDiscount'

export async function chargeAction(amount: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const finalPrice = calculateDiscount(user.app_metadata.plan, amount)
  // ... charge logic ...
}

// app/page.tsx (Data Fetching DIRETO no Server Component)
import { createClient } from '@/utils/supabase/server'

export default async function Page() {
  // Busca direta e rápida no node server
  const supabase = createClient()
  const { data } = await supabase.from('stats').select('*')
  
  // Renderiza HTML proto com tudo carregado
  return <div>{data[0].view_count}</div>
}
```
