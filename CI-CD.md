# CI-CD.md

Guia de CI/CD e deploy do AGENX.

---

## Pipeline de CI — GitHub Actions

**Arquivo**: `.github/workflows/ci.yml`

### Trigger
- Push em `main`, `develop`, `ux-teste`
- Pull Request em `main`

### Steps (em ordem)
```
1. npm ci                  — instalação limpa
2. npm run lint            — ESLint strict (max-warnings 0)
3. npm run typecheck       — TypeScript check
4. npm test -- --run       — Vitest (sem watch)
5. npm run test:coverage   — relatório de cobertura
```

**Nota**: Não há step de build no CI — o build é feito pelo Vercel no deploy.

---

## Deploy — Vercel

**Arquivo**: `vercel.json`

### Configuração
- SPA rewrite: toda rota → `index.html`
- HashRouter lida com roteamento no client
- Build command: `npm run build` (padrão Vite)
- Output: `dist/`

### Ambientes
| Ambiente | Branch | URL |
|---|---|---|
| Produção | `main` | (configurada no Vercel) |
| Preview | PRs | gerada automaticamente pelo Vercel |

### Como fazer deploy
1. Faça push para `main` — Vercel faz deploy automático
2. Ou abra PR — Vercel cria preview deploy

---

## Backup do Supabase

**Script**: `scripts/backup-supabase.js`
**Comando**: `npm run backup`

- Não integrado ao CI — rodar manualmente quando necessário
- **Recomendado**: rodar antes de migrations destrutivas

---

## Migrations

### Como criar migration
1. Criar arquivo em `supabase/migrations/` com prefixo de data: `YYYYMMDD_descricao.sql`
2. Testar com usuário real (RLS pode quebrar silenciosamente)
3. Verificar se a migration não conflita com policies existentes

### Cuidados com migrations
- **Nunca** desabilitar RLS sem entender o impacto
- **Sempre** testar policies com usuário autenticado E anônimo
- **Sempre** documentar `SECURITY DEFINER` no comentário da migration
- Projeto tem 91+ migrations — histórico instável de RLS
- Ver `DEBUGGING.md` para problemas recorrentes com RLS

---

## Ausências / melhorias futuras

| Item | Status | Prioridade |
|---|---|---|
| Preview deploy para PRs | Configurado via Vercel | — |
| Step de build no CI | Ausente (Vercel faz) | baixa |
| Verificação de tipos do Supabase no CI | Ausente | média |
| Seed/migration automática no CI | Ausente | baixa |
| Backup integrado ao CI | Ausente | média |
| Staging environment | Ausente | baixa |
