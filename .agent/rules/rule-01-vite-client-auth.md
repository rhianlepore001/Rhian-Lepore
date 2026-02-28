# LEI 01: Autenticação e Sessão com Supabase Auth (Vite SPA)

## MOTIVO
Este projeto é uma **SPA Vite** — não existe servidor próprio, middleware.ts ou Server Actions.
A autenticação é gerenciada 100% pelo **Supabase Auth no client-side** via `@supabase/supabase-js`.
Padrões de iron-session, X-User-Id proxy ou `@supabase/ssr` são PROIBIDOS aqui — não existem nessa stack.

## GATILHO
Ativado ao criar componentes de login, proteger rotas, fazer queries ao Supabase, ou manipular sessão.

## PADRÕES OBRIGATÓRIOS

### Verificação de Sessão
Use SEMPRE `supabase.auth.getUser()` para confirmar identidade em operações sensíveis.
`getSession()` retorna o cache local (pode estar desatualizado) — **use apenas para leitura de dados do perfil**, nunca para autorizar ações.

```typescript
// ✅ CORRETO — Verificação real de identidade
const { data: { user }, error } = await supabase.auth.getUser()
if (!user || error) {
  navigate('/login')
  return
}
```

### Proteção de Rotas (React Router DOM)
Crie um componente `ProtectedRoute` que use o estado da sessão via Context ou hook dedicado.
Nunca interprete a rota como "protegida" apenas por ela existir dentro do app logado.

```typescript
// ✅ CORRETO
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

### Tokens NUNCA no localStorage
O Supabase armazena tokens automaticamente em `localStorage` via seu SDK — isso é aceitável.
O que é PROIBIDO é manipular manualmente o token JWT: nunca leia, copie, logue ou passe `session.access_token` para outra lógica no frontend.

```typescript
// ❌ ERRADO — Acessar o token raw para qualquer finalidade
const session = await supabase.auth.getSession()
console.log(session.data.session?.access_token) // PROIBIDO

// ✅ CORRETO — Apenas use o cliente Supabase que já injeta o token automaticamente
const { data } = await supabase.from('profiles').select('*').eq('id', user.id)
```

### Dados Sensíveis NUNCA no Console
```typescript
// ❌ ERRADO
console.log('Usuário logado:', user) // Expõe email, IDs, metadata
console.log('Sessão:', session)      // Expõe access_token

// ✅ CORRETO — Log apenas do necessário para debug
console.log('Usuário autenticado:', user?.id)
```

### Logout Seguro
Sempre use `supabase.auth.signOut()` para encerrar a sessão — limpa localStorage + invalida token no servidor Supabase.
```typescript
const handleLogout = async () => {
  await supabase.auth.signOut()
  navigate('/login')
}
```
