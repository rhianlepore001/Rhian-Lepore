# LEI 05: Hardening de Sessão

## MOTIVO
Proteção contra ataques de sessão e sequestro de cookies.

## GATILHO
Ativado ao configurar cookies, sessões, middleware de autenticação, ou lógica de login/logout.

## PADRÕES DE COOKIE

### Atributos
Todos os cookies de sessão devem obrigatoriamente ter `httpOnly: true`, `secure: true` (em prod) e `sameSite: 'lax'`.

### Expiração Dinâmica
Use a lógica de expiração controlada para diferenciar sessões curtas de sessões "lembrar-me".

### Cleanup no Middleware
Em caso de sessão inválida ou expirada, o middleware deve garantir o `cookies().delete()` para evitar estados inconsistentes.

## EXEMPLO ERRADO
```typescript
export const sessionOptions = {
  cookieName: "session",
  password: process.env.SESSION_SECRET!,
  cookieOptions: {
    secure: false,      // Funciona em HTTP!
    httpOnly: false,    // Acessível via JS (XSS)!
    sameSite: "none",   // Enviado em qualquer request!
  },
}
```

## EXEMPLO CORRETO
```typescript
export const sessionOptions = {
  cookieName: "__Host-session",
  password: process.env.SESSION_SECRET!,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  },
}

// Lógica de "lembrar-me"
export function getSessionTTL(rememberMe: boolean): number {
  return rememberMe 
    ? 60 * 60 * 24 * 30  // 30 dias
    : 60 * 60 * 24       // 1 dia
}
```

## CLEANUP NO MIDDLEWARE
```typescript
export async function middleware(request: NextRequest) {
  const session = await getIronSession(cookies(), sessionOptions)
  
  if (session.expiresAt && Date.now() > session.expiresAt) {
    session.destroy()
    cookies().delete(sessionOptions.cookieName)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```
