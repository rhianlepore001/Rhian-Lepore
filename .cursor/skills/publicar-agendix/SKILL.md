---
name: publicar-agendix
description: >-
  Publica um PR do AgendiX no fluxo dos PRs #197, #202 e #206: checks, backup
  fora do repo, migration em produção só com OK, verify, rollback se falhar,
  squash merge com --match-head-commit, version.json e smoke só leitura.
---

# Publicar o AgendiX

Use esta skill quando o Rhian pedir para aplicar o banco, publicar, mesclar ou colocar no ar. O runbook completo é `docs/runbooks/publicacao.md`. Acessos (só nomes): `docs/runbooks/acessos.md`.

## Sem OK explícito, pare antes

- Aplicar SQL no banco de produção
- Marcar o PR como pronto e mesclar

Se o verify falhar: rollback, conferir, **parar**, avisar. Não publique o app.

## Sequência

1. **Checks e `main`**
   - `gh pr checks <N>` e `git fetch origin main`
   - Obrigatório verde: **Lint, Typecheck & Tests**
   - Também verdes quando couber: **Meta consent (393px and 1280px)**, **WhatsApp RLS and rollback**, **WhatsApp mobile and desktop**
   - Vermelho aceitável: comentário de preview da Vercel, se for só comentário; flake antigo de Playwright no Ubuntu 24.04 (PRs #198/#199, e só se for instalação de browser, depois de um relance). Nunca ignore Lint/Typecheck/Tests vermelho.
   - Se `origin/main` andou, atualize o PR e teste de novo. Não mescle por cima.

2. **Backup fora do repositório**
   - Pasta tipo `~/agendix-secrets/backups/pr<N>_<AAAAMMDD>/` (no box do Bob: `/workspace/secrets/backups/`).
   - Copie migration, rollback e verify. Escreva `MANIFEST.txt` e `TIME.txt` (fuso Europe/Lisbon).
   - Grave as versões já aplicadas em `supabase_migrations.schema_migrations` e o `pg_get_functiondef` completo das funções atingidas (no rollback, como no #206).
   - Se a migration mexer em linhas, exporte essas linhas para a pasta de backup. O rollback precisa ser suficiente para restaurar.
   - Capture via Supabase MCP ou Management API com `SUPABASE_ACCESS_TOKEN`. `npm run backup` não serve.
   - Nunca commite o backup nem imprima segredos.

3. **Aplicar (só com OK, só o SQL deste PR)**
   - Prefira o MCP `apply_migration` (ou a CLI `supabase`), que registra a versão em `supabase_migrations.schema_migrations`.
   - Se usar o script, lembre: ele só executa o SQL.

   ```bash
   node scripts/apply_migration_remote.mjs caminho/da/migration.sql
   ```

   - Depois do script, registre e confira a linha em `supabase_migrations.schema_migrations`. Sem isso, uma CLI futura pode reaplicar a mesma migration. Projeto: `lcqwrngscsziysyfhpfj` (`SUPABASE_PROJECT_ID` no script).

4. **Verify**
   - Rode o script de verify em produção. Tem que passar inteiro, inclusive a versão registrada.
   - Não aceite só HTTP 200: leia o resultado. O verify deve dar erro (`RAISE EXCEPTION` ou código diferente de zero) quando falhar.
   - Falhou: aplique o rollback, confirme, atualize o manifesto, **pare**.

5. **Ready + squash merge (só com OK)**

   ```bash
   gh pr ready <N>
   gh pr merge <N> --squash --match-head-commit <SHA_DO_HEAD>
   ```

   Se o match falhar, pare.

6. **Vercel e versão**
   - Espere o deploy.
   - `curl -sS https://www.agendixstudio.com/version.json`
   - O campo `version` deve começar com os 8 primeiros caracteres do SHA que entrou em `main`.
   - Registre SHA, `version` e horário (Europe/Lisbon).

7. **Smoke só leitura**
   - Abrir o app, conferir a tela. Sem criar dono, sem mensagem a terceiros, sem cartão, sem apagar dado.

## Lembretes

- Prints 390px (barbearia escuro, salão claro) e crítica visual nota >8 já devem ter acontecido antes desta skill, quando a mudança é de UI.
- Um PR por vez, que era rascunho até este momento.
- Repo público: nenhum segredo no PR, no manifesto versionado ou no chat.
