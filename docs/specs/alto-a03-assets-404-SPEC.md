# A-03 — `/assets/*` missing → 404 (não index.html)

## Antes
`rewrites: /(?:*) → /index.html` fazia chunks JS antigos voltarem HTML → `Failed to fetch dynamically imported module`.

## Depois
Rewrite SPA **exclui** prefixo `assets/`. Arquivos existentes em `/assets/*` continuam estáticos; faltantes → **404** real. Rotas HashRouter (`/#/...`) não passam por path `/assets/` e seguem no `index.html`.

## Não muda
HashRouter, API, Supabase, Stripe — só o rewrite Vercel.
