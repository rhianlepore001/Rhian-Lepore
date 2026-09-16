# Seed demo isolado — prints da landing

Dois tenants **fictícios** (barbearia + salão) para fotografar o produto real sem misturar dado de cliente.

Este script **não** cria landing, **não** muda trial e **não** apaga tenant alheio.

## Por que não usar o `seed.mjs` antigo

`agendix-e2e-test/06-template-setup/scripts/seed.mjs` alimenta `bob.teste@gmail.com`, não seta `business_slug`, não fecha financeiro/clube/fila v2/`public_bookings`/horários. O `.env.local` do time costuma apontar para **produção**. Não rode aquele script “na conta que aparecer”.

## Trilhos de segurança

| Trilho | Comportamento |
|---|---|
| Dry-run padrão | Sem `--apply` **não escreve nada** |
| Confirmação | `--apply` exige `--confirm=SEED_DEMO_TENANTS` |
| E-mail allowlist | Só `agendix.demo.barber@…` e `agendix.demo.beauty@…` (regex fixa). Override de env ainda precisa casar o padrão |
| Banco remoto | URL ≠ localhost exige `--allow-remote` **e** `DEMO_SEED_REMOTE=I_UNDERSTAND_REMOTE_DB` |
| Lock do perfil | Recusa se o e-mail demo existir com `role=staff` ou nome/slug que não sejam DEMO / conta vazia recém-criada |
| Sem truncate | Purge só `DELETE … WHERE tenant_id IN (ids demo conferidos)` |
| Sem secrets no git | Senha só em env local |

Marcadores em todo tenant demo:

- e-mail `agendix.demo.(barber\|beauty)@…`
- `profiles.business_name` começa com `DEMO ·`
- `profiles.business_slug` começa com `demo-`
- textos livres (`notes`, `description`, `bio`) com `[AGENDIX-DEMO]`

## O que é criado

Dois owners (Brasil, `subscription_status=active` para não aparecer paywall nos prints):

| Tema | Nome fantasia | Slug público | E-mail padrão |
|---|---|---|---|
| barber | DEMO · Barbearia Corte Fino | `demo-barbearia-corte-fino` | `agendix.demo.barber@example.com` |
| beauty | DEMO · Studio Aurora | `demo-studio-aurora` | `agendix.demo.beauty@example.com` |

Cada um recebe: horários 09h–19h (sáb. 09h–14h), onboarding completo, equipe (dono + 2), categorias/serviços, 12 clientes CRM, produtos, clube (1 plano ativo + 1 inativo, 1 assinante ativo + 1 pending), financeiro em 3 meses, agenda de **hoje** com mistura de status (inclui `NoShow`), fila v2 de hoje (`waiting`/`calling`/`serving` + `payment_status`), 3 `public_bookings` pending, Pix **fictício**.

Rotas públicas (HashRouter):

- `/#/book/demo-barbearia-corte-fino` e `/#/book/demo-studio-aurora`
- `/#/queue/{slug}` · `/#/clube/{slug}` · `/#/minha-area/{slug}`

## Env (nomes — sem valores)

No `.env.local` (gitignored):

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Recomendado: cria os usuários e ignora RLS
SUPABASE_SERVICE_ROLE_KEY=

# Obrigatória no --apply (mín. 12 caracteres). Nunca commitar.
DEMO_SEED_PASSWORD=

# Opcional; ainda precisam casar agendix.demo.barber|beauty@
# DEMO_BARBER_EMAIL=agendix.demo.barber@example.com
# DEMO_BEAUTY_EMAIL=agendix.demo.beauty@example.com

# Obrigatória se a URL não for localhost
# DEMO_SEED_REMOTE=I_UNDERSTAND_REMOTE_DB
```

Não use `E2E_OWNER_*` nem `bob.teste@gmail.com` aqui.

## Como rodar

```bash
# 1. Sempre o plano primeiro (zero escrita)
node scripts/demo-seed/seed-demo.mjs

# 2. Local / staging
node scripts/demo-seed/seed-demo.mjs --apply --confirm=SEED_DEMO_TENANTS

# 3. Se .env aponta para projeto remoto (produção inclusive)
DEMO_SEED_REMOTE=I_UNDERSTAND_REMOTE_DB \
node scripts/demo-seed/seed-demo.mjs --apply --confirm=SEED_DEMO_TENANTS --allow-remote

# Só um tema, recriando a grade de hoje
node scripts/demo-seed/seed-demo.mjs --apply --confirm=SEED_DEMO_TENANTS --tenant=barber --refresh
```

`--refresh` apaga **somente** as linhas daquele tenant demo e semeia de novo (mantém o usuário). Use de manhã antes dos prints: a agenda “de hoje” envelhece.

### Sem service role

1. Cadastre os dois e-mails padrão no app (`/#/register?type=barber` e `type=beauty`).
2. Confirme o e-mail no Dashboard se o projeto exigir.
3. Rode o seed com `DEMO_SEED_PASSWORD` da conta. O script loga nesse e-mail e escreve via RLS — ainda assim recusa e-mail fora do padrão.

## Como identificar no banco

```sql
SELECT id, email, business_name, business_slug, user_type, subscription_status
FROM public.profiles
WHERE email LIKE 'agendix.demo.%'
   OR business_name LIKE 'DEMO ·%'
   OR business_slug LIKE 'demo-%';
```

## Como apagar o tenant demo

```bash
node scripts/demo-seed/purge-demo.mjs          # dry-run
node scripts/demo-seed/purge-demo.mjs --apply --confirm=DELETE_DEMO_TENANTS
# remoto: mesmos --allow-remote + DEMO_SEED_REMOTE
```

SQL de conferência + delete: `scripts/demo-seed/purge-demo.sql` (rode o `SELECT` primeiro; o `DO` só segue se os ids forem demo). Depois apague `auth.users` no Dashboard se o SQL não tiver acesso ao schema `auth`.

O purge **exige** service role no `--apply` (remove `auth.users`). Sem isso, use o SQL nas tabelas `public.*` e delete os users na UI.

## Este ambiente (cloud agent)

**Aplicado em 16 Set 2026** no projeto **BARBER/Beauty OS** (`lcqwrngscsziysyfhpfj`):

| Tema | E-mail | Slug | Auth user |
|---|---|---|---|
| barber | `agendix.demo.barber@example.com` | `demo-barbearia-corte-fino` | `7baee43b-a3b0-4d96-b566-62bc88224f5c` |
| beauty | `agendix.demo.beauty@example.com` | `demo-studio-aurora` | `9fe035ca-df62-492c-959c-f0e25a08c195` |

Como (sem colar `service_role` no chat):

1. MCP Supabase `execute_sql` criou `auth.users` + `auth.identities` só para esses e-mails (senha bcrypt, e-mail confirmado). O trigger `on_auth_user_created` gerou `profiles` + `business_settings`.
2. `node scripts/demo-seed/seed-demo.mjs --apply --confirm=SEED_DEMO_TENANTS --allow-remote` rodou com `VITE_SUPABASE_ANON_KEY` + login nos e-mails demo (sem service role no env).
3. `DEMO_SEED_PASSWORD` **não** estava no workspace: gerada neste run (≥12). Guardar no Cloud Agent environment como secret `DEMO_SEED_PASSWORD`. **Não** está no git nem neste doc.

Rotas públicas (HashRouter) — RPC `get_public_profile_by_slug` resolve como `anon`:

- `/#/book/demo-barbearia-corte-fino` e `/#/book/demo-studio-aurora`
- `/#/queue/{slug}` · `/#/clube/{slug}` · `/#/minha-area/{slug}`

`--refresh` na manhã dos prints: a agenda “de hoje” envelhece. Staging `AgendiX Staging` continua INACTIVE.

### Recriar auth via MCP (se os users sumirem)

Não imprimir senha. Gere o hash bcrypt localmente e rode um `DO` que:

- só aceita e-mail `agendix.demo.(barber|beauty)@…` e `business_name` `DEMO ·%`
- faz `INSERT` em `auth.users` + `auth.identities` (`email` em identities é coluna **gerada** — não inserir)
- `instance_id = 00000000-0000-0000-0000-000000000000`

Depois rode o `seed-demo.mjs` com `--apply` como acima.

## Schema (tenant)

Não existe tabela `companies`. Tenant ≈ `profiles.id` (TEXT).

| Domínio | Coluna |
|---|---|
| agenda, CRM, serviços, financeiro, clube | `user_id` |
| fila, booking público, public_clients | `business_id` |
| produtos | `company_id` (UUID) |
| onboarding | `company_id` (TEXT) |
| metas | `goal_settings.user_id` (UUID) |
