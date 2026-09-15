# Seed DEMO isolado — prints da landing

Conta **fictícia**, pensada para screenshots honestos do produto (Dashboard, Agenda, Fila, Booking público, Financeiro, Clube). **Não** é o `seed.mjs` antigo da conta `bob.teste@gmail.com`.

Não há tabela `companies`. Tenant = `profiles.id` (`auth.users.id` como texto). Colunas de isolamento misturam `user_id` / `business_id` / `company_id` — o script respeita isso.

## Segurança (leia antes)

O `.env.local` do time **costuma apontar para o Supabase de produção**. Este seed:

- só cria/altera e-mails `agendix.demo.barber@example.com` e `agendix.demo.beauty@example.com` (padrão regex; plus-addressing opcional);
- **não** apaga nem atualiza outros tenants;
- recusa `DELETE` se a lista de IDs DEMO estiver vazia;
- é **dry-run por padrão**;
- exige `DEMO_SEED_CONFIRM=WRITE_DEMO_TENANTS_ONLY` para gravar;
- se a URL for o projeto de produção conhecido, exige também `DEMO_SEED_PRODUCTION_OK=YES_THIS_IS_PRODUCTION`.

Nenhum secret vai no git. Senha só em env local.

## O que é criado (2 tenants)

| | Barbearia | Salão |
|---|---|---|
| Tema | `barber` | `beauty` |
| E-mail | `agendix.demo.barber@example.com` | `agendix.demo.beauty@example.com` |
| Negócio | Barbearia Corte Fino | Studio Luna Belle |
| Slug | `demo-barbearia-corte-fino` | `demo-studio-luna-belle` |
| Booking | `/#/book/demo-barbearia-corte-fino` | `/#/book/demo-studio-luna-belle` |

Em cada um: horários realistas, onboarding/copilot fechados, `subscription_status=active` (sem paywall/trial nos prints), equipe com slug `/#/pro/:slug`, serviços + categorias, CRM, agenda **de hoje** + passado/futuro, financeiro em **3 meses**, 1 plano de clube ativo + 1 inativo, 1 assinante `active` + 1 `pending`, fila v2 de hoje, 3 `public_bookings` `pending`, produtos de balcão, Pix **fictício** (`pix.agendix.demo.*@example.com`).

Nomes, telefones e endereços são inventados. Marcador `[AGENDIX-DEMO]` em notas internas.

## Variáveis (só nomes)

Obrigatórias para o **app** abrir (já no `.env.example`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Para o seed **gravar**:

| Variável | Função |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Preferível. Cria `auth.users` se faltar e ignora RLS. **Nunca** prefixo `VITE_`. |
| `VITE_SUPABASE_ANON_KEY` | Fallback: login de cada dono DEMO (as contas já precisam existir). |
| `DEMO_SEED_PASSWORD` | Senha dos dois donos (≥ 8). Não commitar. |
| `DEMO_SEED_CONFIRM` | Tem de ser exatamente `WRITE_DEMO_TENANTS_ONLY`. |
| `DEMO_SEED_PRODUCTION_OK` | Só produção conhecida: `YES_THIS_IS_PRODUCTION`. |
| `DEMO_SEED_DELETE_AUTH` | Só com `--delete-auth-users`: `DELETE_DEMO_AUTH_USERS`. |

Opcionais: `DEMO_SEED_EMAIL_BARBER` / `DEMO_SEED_EMAIL_BEAUTY` (ainda precisam casar o regex), `DEMO_SEED_SLUG_BARBER` / `DEMO_SEED_SLUG_BEAUTY` (precisam começar com `demo-`).

Staging inativa ou VM sem credencial: o dry-run ainda imprime o plano. Um humano roda `--apply` no ambiente certo.

## Como rodar

```bash
# 1. Plano (não escreve; funciona sem service role)
node scripts/seed-demo.mjs
# ou
npm run seed:demo

# 2. Ver se os profiles DEMO já existem no projeto da URL
node scripts/seed-demo.mjs --inspect

# 3. Só um nicho
node scripts/seed-demo.mjs --tenants barber --apply
node scripts/seed-demo.mjs --tenants beauty --apply

# 4. Os dois tenants (idempotente: apaga só dados DAQUELE tenant e recria a grade de hoje)
export DEMO_SEED_PASSWORD='…'          # local, não git
export DEMO_SEED_CONFIRM=WRITE_DEMO_TENANTS_ONLY
# se a URL for produção:
export DEMO_SEED_PRODUCTION_OK=YES_THIS_IS_PRODUCTION
node scripts/seed-demo.mjs --apply
```

Login no app: e-mail DEMO + `DEMO_SEED_PASSWORD`. Prints **sem** `VITE_DEV_EMAIL` igual ao DEMO — senão aparece chrome de dev (switcher, bug button).

Idempotência: rodar de novo no mesmo dia substitui agenda/fila/financeiro daquele tenant para “hoje” continuar preenchido. Não mexe em outros `profiles`.

O seed legado `agendix-e2e-test/06-template-setup/scripts/seed.mjs` **não** fecha slug, financeiro, clube, fila v2 nem booking público. Não use contra produção “na conta que aparecer”.

## Como identificar linhas DEMO

1. E-mail do dono casa `^agendix\.demo\.(barber|beauty)@example\.com$`
2. `business_slug` começa com `demo-`
3. SQL pronto: `scripts/demo-seed/identify.sql` (read-only)

Não use `LIKE '%demo%'` em nomes de cliente reais.

## Como apagar o tenant DEMO

Script (mesmo confirm de escrita):

```bash
export DEMO_SEED_CONFIRM=WRITE_DEMO_TENANTS_ONLY
node scripts/seed-demo.mjs --purge
# remove também o login:
export DEMO_SEED_DELETE_AUTH=DELETE_DEMO_AUTH_USERS
node scripts/seed-demo.mjs --purge --delete-auth-users
```

Sem service role, `--purge` limpa dados operacionais do dono logado e **mantém** `auth.users` / `profiles`.

SQL Editor (transação; CTE obrigatório):

```bash
# revisar
scripts/demo-seed/identify.sql
# apagar
scripts/demo-seed/purge-demo.sql
```

`purge-demo.sql` só deleta IDs que saíram do SELECT de e-mail DEMO. `auth.users` fica para o painel Auth ou `--delete-auth-users`.

## Este ambiente (cloud agent)

A VM do agente **não tem** `.env.local` com service role. O PR entrega o tooling; a execução contra o banco é de quem tem a chave. Não rode o seed “no escuro” em produção.

## Schema (vivo, set/2026)

- Sem `companies`. `onboarding_progress.company_id` é TEXT.
- `profiles.id` TEXT; `business_slug` UNIQUE.
- Agenda/CRM/serviços/financeiro/clube: `user_id`.
- Fila / public_bookings / public_clients: `business_id`.
- Produtos: `company_id` UUID.
- `finance_records.type` = `revenue` \| `expense` (valores em `revenue` / `commission_value`).
- Fila v2: `payment_status`, `ticket_status`.
