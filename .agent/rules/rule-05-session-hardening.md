# LEI 05: Hardening de Sessão (Supabase Auth em Next.js)

## MOTIVO
O Supabase SSR usa cookies para manter a sessão do usuário autêntica entre cliente e servidor (App Router). Configurações incorretas abrem brechas para sequestro de sessão e ataques CSRF em Vercel deployments.

## GATILHO
Ativado ao criar middleware, login, logout, manipulação de cookies, ou qualquer customização de fluxo de `@supabase/ssr`.

## PADRÕES DE COOKIE NO NEXT.JS

### O pacote `@supabase/ssr`
Todas as funções de cliente (Server e Browser) devem ser criadas através dos métodos utilitários do `@supabase/ssr` para que o Supabase gerencie os atributos de segurança dos cookies nativamente (`SameSite`, `Secure`, `HttpOnly`). **Evite implementar lógica manual de parse de cookies JWT.**

### O Supabase Auth Middleware
Uma das peças cruciais no Next.js App Router é o `middleware.ts`. O middleware tem a responsabilidade de *atualizar a sessão* para evitar a deslogagem silenciosa de usuários inativos (o Auth token refresh via `supabase.auth.getUser()`).

### Sessão Expirada e Redirects Seguros
Em páginas protegidas (`layout.tsx` interno ou `page.tsx` privado) e no `middleware.ts`, uma requisição ao Supabase deve ocorrer para checar se a sessão/usuário ainda existe (`const { data: { user } } = await supabase.auth.getUser()`). Caso contrário, o redirecionamento `/login` é mandatório. Lembre-se, NUNCA use `getSession()` para autorização, apenas `getUser()`.

## EXEMPLO ERRADO
```typescript
// app/actions/auth.ts
import { cookies } from 'next/headers'

// VULNERÁVEL: Criando cookies com segurança fraca e lógica caseira
export async function unsafeLogin(token: string) {
  cookies().set('my-auth-cookie', token, {
    secure: false, // Inseguro!
    httpOnly: false, // Permite acesso via JS!
    sameSite: "none", 
  })
}

// app/protected/page.tsx
export default async function ProtectedPage() {
  const supabase = createClient()
  // ERRADO: getSession é puramente baseado em cache local do cookie, fácil de forjar ou ler token expirado localmente.
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  return <div>Protegido</div>
}
```

## EXEMPLO CORRETO
```typescript
// middleware.ts
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Apenas delega para o utilitário seguro que usa @supabase/ssr
  return await updateSession(request)
}

// app/protected/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const supabase = createClient()
  
  // SEGURO: A API bate no servidor do Auth para validar a criptografia real do token
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <div>Bem-vindo, {user.email}</div>
}
```
