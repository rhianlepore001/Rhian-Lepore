# Services

Services sao a camada de acesso a dados por dominio.

## Contrato

- Um arquivo por dominio: `scheduling.ts`, `finance.ts`, `queue.ts`, `catalog.ts`.
- Services nao importam React, hooks, componentes ou contextos.
- Services recebem `companyId` explicitamente para operacoes autenticadas.
- Toda query multi-tenant deve filtrar por `company_id`.
- O `companyId` vem do hook via `useAuth()`, nunca de URL, formulario ou parametro do cliente final.
- Inputs e outputs novos devem ser validados com schemas Zod em `types/<domain>.ts`.
- Services retornam dados tipados e erros controlados; UI decide como renderizar loading/error/empty.

## Formato esperado

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

import { listAppointmentsInputSchema } from '@/types/scheduling';

export async function listAppointments(
  supabase: SupabaseClient,
  input: unknown,
) {
  const parsed = listAppointmentsInputSchema.parse(input);

  return supabase
    .from('appointments')
    .select('*')
    .eq('company_id', parsed.companyId);
}
```

## Limites

- Nao criar RPCs nesta pasta; RPC e contrato de banco entram nas fases de dominio.
- Nao centralizar todos os dominios em um service unico.
- Nao esconder `company_id` dentro de helpers globais que dificultem auditoria.
