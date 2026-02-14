# LEI 01: Isolamento de Segurança Smith

## MOTIVO
Impedir o erro histórico de expor chaves sensíveis ou permitir que o frontend ignore a camada de lógica do backend.

## GATILHO
Ativado ao criar ou modificar arquivos em `/app`, `/components`, ou qualquer código client-side que interaja com Supabase ou banco de dados.

## RESTRIÇÕES INEGOCIÁVEIS

### Proibição de Service Role no Front
Nunca, sob qualquer pretexto, utilize a `SUPABASE_SERVICE_ROLE_KEY` em arquivos dentro de `/app` ou `/components`.

### Zero Supabase Direct Writing
O frontend não deve realizar operações de escrita (insert, update, delete) diretamente via cliente Supabase do lado do cliente. Toda alteração de estado deve passar por uma rota de API (`/api/*`) que valide a sessão.

### Headers de Segurança
Toda nova rota ou middleware deve manter os headers de CSP e Anti-Clickjacking (frame-ancestors 'none' para admin, '*' apenas para /embed).

## PADRÃO DE AUTENTICAÇÃO
Use sempre `getIronSession` com AES-256-GCM para verificar a identidade do usuário no Next.js.

## EXEMPLO ERRADO
```typescript
// app/components/AdminPanel.tsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // VAZAMENTO DE PRIVILÉGIO!
)

export function AdminPanel() {
  const deleteUser = async (id: string) => {
    await supabase.from('users').delete().eq('id', id) // Escrita direta!
  }
}
```

## EXEMPLO CORRETO
```typescript
// app/components/AdminPanel.tsx
export function AdminPanel() {
  const deleteUser = async (id: string) => {
    await fetch('/api/admin/users', {
      method: 'DELETE',
      body: JSON.stringify({ userId: id }),
      credentials: 'include'
    })
  }
}

// app/api/admin/users/route.ts
import { getIronSession } from 'iron-session'

export async function DELETE(req: Request) {
  const session = await getIronSession(cookies(), sessionOptions)
  
  if (!session.user?.isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  // ... delete logic seguro no servidor
}
```
