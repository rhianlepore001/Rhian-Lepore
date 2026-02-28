# LEI 01: Isolamento de Segurança e Vercel Edge

## MOTIVO
Garantir que chamadas ao banco de dados e uso de chaves sensíveis ocorram apenas no ambiente seguro do servidor (Node.js/Edge na Vercel), evitando vazamento de privilégios para o cliente.

## GATILHO
Ativado ao criar ou modificar componentes no Next.js App Router (arquivos em `/app`, `/components`) que interajam com o Supabase.

## RESTRIÇÕES INEGOCIÁVEIS

### Proibição de Service Role no Client Components
Nunca utilize a `SUPABASE_SERVICE_ROLE_KEY` em arquivos marcados com `"use client"`. O service role deve ser restrito a Server Actions, Route Handlers ou Server Components estritos.

### Zero Direct Client Supabase Writes para Dados Críticos
Operações de escrita (insert, update, delete) não devem ser feitas diretamente pelo cliente Supabase do lado do navegador se envolverem lógica de negócios complexa ou validações severas. Prefira sempre **Server Actions** do Next.js para mutações de dados.

### Uso Correto do @supabase/ssr
Em projetos Next.js App Router, usar exclusivamente o pacote `@supabase/ssr` para criação de clientes Supabase (`createServerClient` e `createBrowserClient`).

## EXEMPLO ERRADO
```typescript
// app/components/AdminPanel.tsx
"use client"
import { createClient } from '@supabase/supabase-js'

// VAZAMENTO DE PRIVILÉGIO NO CLIENTE!
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
)

export function AdminPanel() {
  const deleteUser = async (id: string) => {
    await supabase.from('users').delete().eq('id', id)
  }
}
```

## EXEMPLO CORRETO
```typescript
// app/actions/admin.ts
"use server"
import { createClient } from '@supabase/supabase-js'

export async function deleteUserAction(id: string) {
  // Executado de forma segura no servidor Vercel
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Adicione validação de admin aqui antes de deletar!
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw new Error("Falha ao deletar")
}

// app/components/AdminPanel.tsx
"use client"
import { deleteUserAction } from '@/app/actions/admin'

export function AdminPanel() {
  return (
    <button onClick={() => deleteUserAction('123')}>Deletar</button>
  )
}
```
