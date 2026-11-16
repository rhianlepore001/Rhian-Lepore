# Acessos e contas de teste (sem segredos)

Este arquivo lista **nomes** de variáveis, para que servem, e quais contas existem. **Não coloque senhas, tokens nem chaves aqui.** Os valores ficam no `.env.local` do computador (já no `.gitignore`) e nos Secrets dos Cloud Agents do Cursor.

O passo a passo para cadastrar os valores está no final. Um arquivo de handoff com os pares prontos para colar é gerado **fora do git**, no ambiente do Bob; nunca o commite.

## Contas de teste (descrição, sem senha)

Estas contas já aparecem no repositório público (comentários de teste, seeds e `.Agent/playwright-test-accounts.md`). Use-as só para teste e prints. Nunca crie conta de dono nova.

| Papel | E-mail conhecido no repo | Variáveis | Uso |
|-------|--------------------------|-----------|-----|
| Gestor (dono de teste) | `bob.teste@gmail.com` (também escrito `Bob.teste@gmail.com`) | `E2E_OWNER_EMAIL`, `E2E_OWNER_PASS` | Agenda, Financeiro, Configurações, captura visual, fluxos de dono |
| Colaborador de teste | `Bob.funcionario@gmail.com` | `E2E_STAFF_EMAIL`, `E2E_STAFF_PASS` | Agenda do colaborador, Insights, permissões. Se o e-mail vier truncado como `.co`, corrija para `.com` |
| Colaborador auxiliar (scripts de auditoria visual) | `bob.teste.colab@gmail.com` | usar as vars de staff se for a mesma função | scripts como `scripts/fila-visual-audit.mjs` |
| Demo barbearia (seed de prints da landing) | `agendix.demo.barber@example.com` | `DEMO_BARBER_EMAIL`, `DEMO_SEED_PASSWORD` | Só scripts `scripts/demo-seed/`. Ver `docs/demo-seed.md` |
| Demo salão | `agendix.demo.beauty@example.com` | `DEMO_BEAUTY_EMAIL`, `DEMO_SEED_PASSWORD` | Idem |
| Modo auditoria / dev no frontend | o e-mail cadastrado em `VITE_DEV_EMAIL` | `VITE_DEV_EMAIL` | Ajustes → Auditoria, Lixeira, Preview UI, seletor de tema no header. Sem este valor no build, ninguém vê essas telas |
| Conta citada no ciclo de receita (legado) | `claude.teste@gmail.com` | não use como padrão | Aparece em `e2e/ciclo-de-receita.spec.ts`. Esse spec **escreve no banco** e não deve rodar contra produção |

Aliases legados da conta gestor: `AGENDIX_TEST_EMAIL` e `AGENDIX_TEST_PASSWORD` (mesma conta de `E2E_OWNER_*`).

O nome `E2E_OWNER_PASSWORD` / `E2E_STAFF_PASSWORD` **não** é o que o código lê hoje. O código e os specs usam `E2E_OWNER_PASS` e `E2E_STAFF_PASS`. Pode cadastrar os dois nomes com o mesmo valor, se quiser, mas o obrigatório é o sufixo `_PASS`.

## Variáveis

Preencha no `.env.local` e nos Secrets. Deixe em branco neste arquivo.

### App local (Vite)

| Nome | Para que serve |
|------|----------------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase. Obrigatória para o app e para scripts. |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima (vai para o bundle). Obrigatória para o app. |
| `VITE_DEV_EMAIL` | E-mail que destrava o modo auditoria no frontend. Também precisa estar na Vercel (Production e Preview), porque `VITE_*` entra no build. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Chave pública do Stripe (test mode no desenvolvimento). |
| `VITE_META_PIXEL_ID` | ID público do Pixel; vazio desliga Pixel e CAPI no app. |
| `VITE_OPENROUTER_API_KEY` / `VITE_GEMINI_API_KEY` | IA; `VITE_*` vai para o bundle. Não é necessário para publicar o Core. |
| `E2E_BASE_URL` | Base dos testes Playwright. Padrão: `http://localhost:3000`. Nunca aponte specs perigosos para produção. |

### Contas E2E

| Nome | Para que serve |
|------|----------------|
| `E2E_OWNER_EMAIL` / `E2E_OWNER_PASS` | Login do dono de teste. |
| `E2E_STAFF_EMAIL` / `E2E_STAFF_PASS` | Login do colaborador de teste. |
| `AGENDIX_TEST_EMAIL` / `AGENDIX_TEST_PASSWORD` | Alias legado da conta gestor. |
| `DEMO_BARBER_EMAIL` / `DEMO_BEAUTY_EMAIL` / `DEMO_SEED_PASSWORD` | Seed demo. `DEMO_SEED_REMOTE=I_UNDERSTAND_REMOTE_DB` só quando o script de seed/purge for de propósito contra o remoto, e com OK. |

### Publicação e banco

| Nome | Para que serve |
|------|----------------|
| `SUPABASE_ACCESS_TOKEN` | Personal Access Token do Supabase. Serve para aplicar migration, verify e capturar backup pelo script `scripts/apply_migration_remote.mjs` ou pela CLI. **Runtime Secret.** |
| `SUPABASE_PROJECT_ID` ou `SUPABASE_PROJECT_REF` | Ref do projeto. O script de apply lê `SUPABASE_PROJECT_ID` (o padrão no código já é o de produção). `SUPABASE_PROJECT_REF` aparece no `.env.example` e no MCP. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de service role. Só scripts Node no servidor, **nunca** no bundle. Poder alto: trate como Runtime Secret e use o mínimo possível. |
| `SUPABASE_DB_URL` | Connection string do banco, se for fazer dump pontual no backup. Não use para experimentar SQL. Se não existir, use o token da Management API. |
| `SUPABASE_MCP_TOKEN` | Token do MCP Supabase, se for distinto do access token. |
| `VERCEL_TOKEN` | Consultar deploy, se precisar. O ar sobe sozinho no merge em `main`. Não é obrigatório para o fluxo padrão. |
| `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | Só se for usar a CLI da Vercel além do token. |

### Stripe de teste (nunca cartão real)

| Nome | Para que serve |
|------|----------------|
| `STRIPE_TEST_SECRET_KEY` | Secret key de **test mode**. |
| `STRIPE_TEST_WEBHOOK_SECRET` | Segredo do webhook de teste (no box do Bob também existe como arquivo local, fora do git). |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Live, só nas Edge Functions de produção (Supabase/Vercel), não no `.env.local` de dev se você estiver em test mode. |

### Outros

| Nome | Para que serve |
|------|----------------|
| `META_CAPI_TOKEN` / `META_PIXEL_ID` | Edge Function `meta-capi`. Sem prefixo `VITE_`. |
| `RESEND_API_KEY` | E-mails via Edge Functions. |
| `GITHUB_TOKEN` ou o login do `gh` | Já costuma existir no Cursor (app do GitHub). Não commitar. |

## Como cadastrar no computador (Cursor local)

1. Na raiz do repositório: `cp .env.example .env.local`
2. Preencha os valores (cole a partir do arquivo de handoff, se tiver).
3. Confirme que `.env.local` não aparece no `git status` (o `.gitignore` já cobre `.env.local`, `.env*.local` e `*.local`).
4. Não copie esse arquivo para o repositório, para o chat, nem para um PR.

Para carregar no terminal:

```bash
set -a && source .env.local && set +a
```

O Vite lê `.env.local` sozinho no `npm run dev` e no build local.

## Como cadastrar nos Cloud Agents do Cursor

Caminho oficial (documentação do Cursor, conferida em 16/11/2026):

- Dashboard: [cursor.com/dashboard/cloud-agents](https://cursor.com/dashboard/cloud-agents)
- Documentação: [Cloud Environment Setup](https://cursor.com/docs/cloud-agent/setup) e [Secrets & Network](https://cursor.com/docs/cloud-agent/security-network)

Passo a passo:

1. Abra [cursor.com/dashboard/cloud-agents](https://cursor.com/dashboard/cloud-agents).
2. Há duas formas, as duas válidas na doc atual:
   - **Secrets do time/usuário:** na página de Cloud Agents (ou na aba Secrets das configurações do Cursor), adicione cada variável.
   - **Secrets do ambiente:** abra o environment usado no repositório `rhianlepore001/Rhian-Lepore` e use a seção **Secrets** dessa página, se a credencial deve valer só nesse environment.
3. Para senhas, tokens e chaves, escolha o tipo **Runtime Secret** (na doc também aparece o nome antigo, "Redacted Secrets"). O valor entra como variável de ambiente, mas aparece como `[REDACTED]` na transcrição, nas ferramentas e nos commits. Não use o tipo "Environment Variable" para segredo.
4. URLs não secretas (por exemplo `E2E_BASE_URL=http://localhost:3000`, talvez `VITE_SUPABASE_URL`) podem ser Environment Variable, se quiser que o agente as veja. Na dúvida, Runtime Secret.
5. Secrets só valem para agentes **novos**. Se um Cloud Agent já estiver rodando, comece outro depois de cadastrar.
6. Confira se está na conta/time certos: os secrets são por workspace/time.

Não coloque `.env.local` no snapshot do environment se puder evitar. A aba Secrets é o caminho recomendado pela própria doc do Cursor.

## O que o agente deve fazer se faltar variável

- Dizer o **nome** da variável que falta.
- Não inventar valor, não pedir para colar a senha no chat se ela já puder estar nos Secrets, e não logar o valor.
