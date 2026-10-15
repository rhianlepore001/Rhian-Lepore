# A-04 — Security headers (CSP Report-Only)

Adiciona em `vercel.json`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (+ `frame-ancestors 'none'` no CSP-RO)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restritiva
- **CSP em Report-Only** (não bloqueia; observa violações)

HSTS já vem da Vercel. `Access-Control-Allow-Origin: *` no HTML estático não é alterado aqui (mudança maior / risco de quebra).
