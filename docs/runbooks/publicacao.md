# Runbook de publicação do AgendiX

Este é o fluxo usado nos PRs #197, #202 e #206. Siga na ordem. Se qualquer etapa obrigatória falhar, **pare** e avise o Rhian. Não improvise atalho.

A skill operacional está em `.cursor/skills/publicar-agendix/SKILL.md`.

## O que precisa do OK do Rhian

Peça e espere o OK explícito, neste chat, antes de:

1. aplicar migration (ou qualquer SQL) no banco de produção
2. marcar o PR como pronto e fazer o merge

Backup, testes locais, atualizar o rascunho do PR e montar o plano **não** precisam de um segundo OK, se o Rhian já pediu para preparar a publicação. Aplicar, mesclar e o app ir para o ar, sim.

## Pré-requisitos

- Um único PR, ainda em rascunho, com a mudança.
- Rollback em `docs/rollbacks/` e script de verify, ambos testados em PostgreSQL 17 isolado, quando houver SQL.
- `npm run typecheck`, `npm run lint`, `npm run build` e `npm test` verdes na branch.
- Se a mudança é de interface: prints 390px, barbearia escuro e salão claro, crítica visual com nota maior que 8.
- Variáveis de publicação cadastradas (veja `docs/runbooks/acessos.md`): no mínimo `SUPABASE_ACCESS_TOKEN` se houver SQL. Nunca imprima os valores.

Produção:

- App: https://www.agendixstudio.com
- `version.json`: https://www.agendixstudio.com/version.json
- Projeto Supabase: `lcqwrngscsziysyfhpfj`

## 1. Conferir os checks e o `main`

```bash
gh pr checks <N>
git fetch origin main
git log -1 --oneline origin/main
```

O SHA de `origin/main` precisa ser o mesmo que era a base do PR (ou o PR precisa ser atualizado em cima do `main` atual, com testes de novo). Se o `main` andou, não mescle por cima.

### O que precisa estar verde

Obrigatório, sempre:

- **Lint, Typecheck & Tests** (workflow `CI`)

Também devem estar verdes quando o PR toca nessas áreas (e, na dúvida, cobre todos):

- **Meta consent (393px and 1280px)** (workflow `CI`)
- **WhatsApp RLS and rollback** e **WhatsApp mobile and desktop** (workflow `WhatsApp templates`)

### Qual vermelho é aceitável

- Comentário de preview da Vercel (`Vercel Preview Comments`) não bloqueia, se for só comentário. Um deploy de preview quebrado, quando o PR muda o app, precisa ser entendido antes do merge.
- O job geral de Playwright no Ubuntu 24.04 foi instável no passado (PRs #198 e #199) e **não faz parte do CI atual em `main`**. Se um check antigo com esse nome reaparecer e falhar por instalação do browser ou do runner, e não por teste do produto, relance uma vez. Se falhar de novo do mesmo jeito, registre no PR e não trate como bug do app. Não ignore um vermelho de **Lint, Typecheck & Tests**.
- Check com nome vazio ou ainda em andamento: espere terminar, ou confira no GitHub o que é, antes de mesclar.

## 2. Backup (fora do repositório)

Não commite backup, dump ou connection string.

Pasta sugerida, fora do git (no computador do Bob era `/workspace/secrets/backups/`; no computador do Rhian use um diretório local equivalente, por exemplo `~/agendix-secrets/backups/`):

```text
.../backups/pr<N>_<AAAAMMDD>/
  <migration>.sql
  <migration>_rollback.sql
  <migration>_verify.sql
  MANIFEST.txt
  TIME.txt
```

O `MANIFEST.txt` registra, no mínimo:

- número do PR e data (fuso Europe/Lisbon)
- projeto (`lcqwrngscsziysyfhpfj`)
- última versão de migration já aplicada em produção
- fingerprint ou `md5` das funções e tabelas que a mudança altera (como no #206)
- depois da aplicação: versão nova, resultado do verify, o que não podia ter mudado

Como capturar o estado (tem que dar para voltar atrás, não só anotar um hash):

- Leia as versões já aplicadas em `supabase_migrations.schema_migrations` e grave no manifesto.
- Salve o `pg_get_functiondef` completo de **todas** as funções que a migration cria ou troca. No #206 essas definições foram conferidas contra produção e ficaram no arquivo de rollback. O rollback precisa restaurar essas definições.
- Se a migration altera ou apaga linhas, exporte as linhas atingidas (consulta restrita) para a pasta de backup. Sem isso, o rollback de código pode não recuperar dado. Não imprima e não commite esse export.
- Se existir `SUPABASE_DB_URL`, faça também um dump pontual dos objetos do PR. Sem a URL, use o MCP ou a Management API com `SUPABASE_ACCESS_TOKEN`.
- Sem imprimir dados de clientes no chat, no PR ou no log.
- `npm run backup` / `scripts/backup-supabase.js` **não** serve como backup de publicação.
- O caminho de restauração é o arquivo de rollback, já testado em PostgreSQL 17 isolado **antes** de aplicar em produção.

Permissão da pasta: só o usuário local lê (por exemplo `chmod 700` no diretório).

## 3. Aplicar a migration em produção (só com OK)

Só se o PR tiver SQL, e só depois do OK.

Prefira o Supabase MCP `apply_migration` (ou a CLI oficial `supabase`), porque esse caminho **registra** a versão em `supabase_migrations.schema_migrations`. Foi o método usado em publicações anteriores (por exemplo comissões / WIP financeiro).

Se não houver MCP, use o script:

```bash
node scripts/apply_migration_remote.mjs caminho/da/migration.sql
```

Isso usa `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_ID` (o padrão no script já é o projeto de produção). Este script **só executa o SQL**. Ele não grava a versão sozinho. Depois de um apply bem-sucedido por esse caminho, registre a migration em `supabase_migrations.schema_migrations` (nome e statements iguais ao arquivo do PR) e confira que a linha apareceu, como no manifesto do #206 (`Versão no banco`). Sem esse registro, uma aplicação futura pela CLI pode achar que a migration ainda está pendente e tentar rodá-la de novo.

Aplique **só** o arquivo da migration do PR. Não rode "todas as migrations pendentes" no projeto, para não levar SQL de outro branch.

## 4. Verify obrigatório

Rode o script de verify contra produção (MCP, CLI ou, se preciso, `apply_migration_remote.mjs` no arquivo de verify).

Contrato do verify: a checagem tem que **falhar de verdade** quando algo estiver errado. Prefira SQL com `RAISE EXCEPTION` (ou um comando que saia com código diferente de zero). Não trate HTTP 200 do script de apply como sucesso: ele só diz que a consulta rodou. Leia o resultado. Se vier `FAIL`, `false` ou um count inesperado, isso é falha.

O verify precisa passar inteiro, inclusive confirmar a linha nova em `supabase_migrations.schema_migrations` quando houver SQL.

Se falhar:

1. aplique o rollback
2. rode o verify (ou uma conferência equivalente) para confirmar que o banco voltou
3. atualize o `MANIFEST.txt`
4. **pare**. Não marque o PR como pronto. Não mescle. Avise o Rhian.

## 5. PR pronto e squash merge

Só com OK de merge, e só se o verify passou (ou se o PR não tem SQL).

Confira de novo que o head do PR é o SHA que você revisou e que `origin/main` não andou.

```bash
gh pr ready <N>
gh pr merge <N> --squash --match-head-commit <SHA_DO_HEAD>
```

O `--match-head-commit` evita mesclar se alguém tiver empurrado um commit novo no meio do caminho. Se o comando recusar, pare e investigue.

## 6. Esperar a Vercel e conferir a versão

O merge em `main` dispara o deploy de produção. Espere o deploy concluir.

```bash
curl -sS https://www.agendixstudio.com/version.json
```

O campo `version` começa com os 8 primeiros caracteres do SHA do commit que acabou de entrar em `main` (formato `aaaaaaaa-xxxxxxxxxxx`, gerado no build; ver `vite.config.ts`). Se o prefixo não bater, o ar ainda está na versão antiga ou o deploy falhou. Não declare publicado.

Registre no `MANIFEST.txt` ou na conversa com o Rhian: SHA do merge, valor de `version.json`, horário em Europe/Lisbon.

## 7. Smoke só leitura

Depois do `version.json` certo, faça um smoke **só de leitura** no app de produção: abrir a home, login com conta de teste se precisar, olhar a tela mudada. Sem criar dono, sem agendar de verdade, sem mandar WhatsApp, sem cartão, sem apagar dado.

Se o smoke falhar, avise o Rhian. Reverter o app é um deploy anterior na Vercel; reverter SQL é o arquivo de rollback, de novo só com OK se a correção também mudar o banco.

## 8. Encerramento

- PR mesclado, banco conferido (se couber), `version.json` registrado.
- Nada disso entra no git além do que já estava no PR (migration, rollback, verify).
