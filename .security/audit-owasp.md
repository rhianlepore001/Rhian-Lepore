# Auditoria OWASP Top 10 — AgendiX

**Data:** 2026-06-13  
**Escopo:** `pages/`, `hooks/`, `services/`, `supabase/functions/`, `components/`, migrations SQL relevantes  
**Método:** Revisão estática de código (sem pentest dinâmico, sem `npm audit`)

---

## Resumo por severidade

| Severidade | Qtd | Principais riscos |
|---|---:|---|
| **CRÍTICO** | 0 | — |
| **ALTO** | 12 | Edge function sem auth + service role; open redirect no checkout; convite staff sem token; storage sem isolamento; RPC anon; chaves no cliente |
| **MÉDIO** | 9 | CORS `*`; rate limit fail-open; deletes sem tenant; filtro PostgREST; HTML em e-mail; guards só no frontend |
| **BAIXO** | 4 | `innerHTML` estático; logs no browser; dev mode local |
| **INFORMATIVO** | 6 | Itens verificados e não encontrados (ver seção final) |

---

## A01 — Broken Access Control

### ALTO-001: Edge Function `send-appointment-reminder` sem autenticação do caller

- **Evidência:** `supabase/functions/send-appointment-reminder/index.ts:21-30`
- **Trecho:** cria cliente com `SUPABASE_SERVICE_ROLE_KEY` e processa requisição sem validar `Authorization`, cron secret ou API key.
- **Impacto:** Qualquer caller que conheça a URL da function pode disparar leitura em massa de `bookings` (service role bypassa RLS) e envio de e-mails via Resend.
- **Remediação:** Exigir header secreto (`CRON_SECRET`), desabilitar invocação HTTP pública, ou restringir a `supabase functions deploy` com `verify_jwt = true` + role de serviço interno.

### ALTO-002: Convite de staff sem token assinado — `company` na URL

- **Evidência:** `pages/Register.tsx:31-32,89`; `contexts/AuthContext.tsx:304-337`
- **Trecho:** `companyIdFromUrl = searchParams.get('company')` é repassado a `register({ companyId })`, que grava `role: 'staff'` e `company_id: data.companyId`, e insere em `team_members` com `user_id: data.companyId`.
- **Impacto:** Link `/#/register?company={uuid}` permite que qualquer pessoa se registre como staff de qualquer empresa (se RLS/trigger permitir escrita). Não há validação de convite, expiração ou assinatura HMAC.
- **Remediação:** Convite via RPC `SECURITY DEFINER` com token único/expirável; nunca confiar em UUID na URL sem verificação server-side.

### ALTO-003: `get_client_profile` — possível IDOR por UUID na rota

- **Evidência:** `pages/ClientCRM.tsx:20,57-59`; updates em `pages/ClientCRM.tsx:109-114,189-197,220-224`
- **Trecho:** `useParams().id` vai direto para `.rpc('get_client_profile', { p_client_id: id })`. Mutations usam `.eq('user_id', user.id)` em vez de `companyId`.
- **Impacto:** Se a RPC não validar tenant internamente (definição **não encontrada** em `supabase/migrations/`), usuário autenticado pode ler/editar cliente de outra empresa pelo UUID. Staff usa `user.id` (staff UUID) ≠ `companyId` (owner UUID) → updates podem falhar silenciosamente ou, com RLS fraca, vazar dados.
- **Remediação:** Auditar RPC no banco; no frontend usar `companyId` de `useAuth()`; filtrar `.eq('user_id', companyId)`.

### ALTO-004: Staff com acesso total a `finance_records` (RLS intra-tenant)

- **Evidência:** `supabase/migrations/20260307_us015b_multi_user_rls.sql:168-178`
- **Trecho:** política `Finance: company isolation` usa `user_id = get_auth_company_id()` para ALL — staff da mesma empresa vê/edita todos os registros financeiros.
- **Impacto:** Quebra de segregação owner/staff em dados sensíveis (comissões, receita total).
- **Remediação:** Políticas separadas SELECT/INSERT/UPDATE por `get_auth_role()`; RPCs com filtro por `professional_id`.

### ALTO-005: Rota `/financeiro` sem `OwnerRouteGuard`

- **Evidência:** `App.tsx:183` (compare com `App.tsx:184-185` que usam guard)
- **Impacto:** Staff acessa UI financeira completa; combinado com ALTO-004, exposição de PII/financeiro.
- **Remediação:** Envolver `<Finance />` em `<OwnerRouteGuard>` ou filtrar no backend.

### ALTO-006: `create_secure_booking` executável por `anon`

- **Evidência:** `supabase/migrations/20260218_add_payment_method.sql:10-130`
- **Trecho:** `SECURITY DEFINER` + `GRANT EXECUTE ... TO authenticated, anon`.
- **Impacto:** Criação de bookings em nome de qualquer `p_business_id` sem autenticação — spam, ocupação de slots, abuso de agenda pública.
- **Remediação:** Validar origem (rate limit, captcha, token de sessão pública); restringir parâmetros; logging de abuso.

### MÉDIO-001: Delete de histórico sem filtro de tenant em `finance_records`

- **Evidência:** `pages/Agenda.tsx:529-533`
- **Trecho:** `finance_records.delete().eq('appointment_id', appointmentId)` sem `.eq('user_id', effectiveUserId)`; appointment delete usa `user.id` em vez de `companyId`.
- **Impacto:** Depende de RLS; se policy falhar, delete cross-tenant. Staff owner-id mismatch impede delete legítimo ou causa comportamento inconsistente.
- **Remediação:** Usar `effectiveUserId` / `companyId` em todas as queries; preferir RPC atômica com ownership check.

### MÉDIO-002: `OwnerRouteGuard` apenas no cliente

- **Evidência:** `App.tsx:117-127`
- **Impacto:** Bypass via chamada direta à API Supabase (PostgREST/RPC) ignora guards React.
- **Remediação:** Toda autorização sensível deve estar em RLS/RPC (defense in depth).

### MÉDIO-003: Storage `client_photos` — upload/delete por qualquer autenticado

- **Evidência:** `supabase/migrations/20260218_client_crm_enhancements.sql:39-46`
- **Trecho:** `INSERT/UPDATE/DELETE` com `auth.role() = 'authenticated'` sem checagem de pasta/`company_id`.
- **Impacto:** Usuário autenticado de tenant A pode sobrescrever/apagar fotos de tenant B se conhecer o path.
- **Remediação:** Política com `(storage.foldername(name))[1] = auth.uid()::text` ou `get_auth_company_id()`.

### MÉDIO-004: `public_bookings` — INSERT anônimo sem validação (`WITH CHECK (true)`)

- **Evidência:** `supabase/migrations/20260129_consolidate_rls_final.sql:168-172`
- **Impacto:** Spam de reservas, DoS de agenda, dados falsos.
- **Remediação:** Rate limit, honeypot, validação de `business_id` ativo, política mais restritiva.

---

## A02 — Cryptographic Failures / Secrets

### ALTO-007: Credenciais Supabase hardcoded como fallback

- **Evidência:** `lib/supabase.ts:3-7`
- **Trecho:** URL e `VITE_SUPABASE_ANON_KEY` embutidos no bundle quando env ausente.
- **Impacto:** Chave anon pública no repositório; facilita abuso de API se RLS tiver falhas.
- **Remediação:** Remover fallback; falhar build se env ausente.

### ALTO-008: Chave Stripe publishable hardcoded

- **Evidência:** `pages/settings/SubscriptionSettings.tsx:15`
- **Impacto:** Chave de teste exposta no código-fonte; risco de uso indevido em ambientes errados.
- **Remediação:** Somente `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY`, sem fallback.

### ALTO-009: API keys de IA no cliente (`VITE_*`)

- **Evidência:** `lib/openrouter.ts:4-5`; `hooks/useAIAssistant.ts:8-9`; `hooks/useContentCalendar.ts:6-7`; `lib/gemini.ts:213-217`
- **Impacto:** `VITE_OPENROUTER_API_KEY` e `VITE_GEMINI_API_KEY` ficam no bundle — extração e abuso de quota/custo.
- **Remediação:** Proxy server-side (Edge Function) com rate limit por `company_id`.

---

## A03 — Injection

### MÉDIO-005: Filtro PostgREST `.or()` com telefone não sanitizado

- **Evidência:** `pages/Agenda.tsx:561-567`; `services/publicBooking.ts:20-27`
- **Trecho:** `orFilter = \`phone.eq.${rawPhone},phone.eq.${formattedPhoneBR}...\`` interpolado em `.or(orFilter)`.
- **Impacto:** Caracteres especiais na entrada (vírgula, parênteses) podem alterar semântica do filtro PostgREST (filter injection).
- **Remediação:** Busca por dígitos normalizados via RPC ou `.filter()` com parâmetros escapados; validar regex `^\d+$`.

### MÉDIO-006: HTML de e-mail com dados do banco sem escape

- **Evidência:** `supabase/functions/send-appointment-reminder/index.ts:85-97`
- **Trecho:** `${clientName}`, `${businessName}`, `${serviceName}` interpolados em template HTML.
- **Impacto:** Se nomes contiverem HTML/JS, injeção no corpo do e-mail (phishing interno / XSS no cliente de e-mail).
- **Remediação:** Escape HTML (`encodeURIComponent` entity encoding) antes de interpolar.

### INFORMATIVO: SQL injection clássico no app

- **Status:** **Não encontrado** em `pages/`, `hooks/`, `services/` — queries via Supabase client/RPC parametrizados.
- **Nota:** Risco residual em RPCs `SECURITY DEFINER` mal escritas (fora do escopo de linha-a-linha nesta auditoria).

---

## A04 — Insecure Design

### ALTO-010: Privilégio de desenvolvedor por e-mail hardcoded

- **Evidência:** `contexts/AuthContext.tsx:172`
- **Trecho:** `setIsDev(session.user.email === 'rleporesilva@gmail.com')`.
- **Impacto:** Conta com esse e-mail ganha rotas dev (`App.tsx:108-113`, `components/SettingsLayout.tsx:23`) — autorização fora do modelo role/RLS.
- **Remediação:** Flag `is_dev` no banco, controlada por admin; remover e-mail hardcoded.

### ALTO-011: Registro duplo de perfil (trigger + insert cliente) vs RLS INSERT bloqueado

- **Evidência:** `contexts/AuthContext.tsx:291-308`; `supabase/migrations/20260320_us0302_remove_permissive_rls_policy.sql:44-47`; `supabase/migrations/20260218_reset_and_setup.sql:42-63`
- **Impacto:** `handle_new_user` cria perfil owner default; client tenta `INSERT` com `WITH CHECK (false)` — fluxo de staff/owner pode ficar inconsistente (role/company_id errados), superfície para bypass se política mudar.
- **Remediação:** Um único caminho: trigger `SECURITY DEFINER` que aplica metadados de convite validado.

### MÉDIO-007: RPCs `SECURITY DEFINER` com validação parcial de ownership

- **Evidência:** `supabase/migrations/20260318_add_rpc_ownership_checks.sql:256-260` (lista RPCs ainda sem check, incl. `get_finance_stats`, `get_available_slots`, `create_secure_booking`)
- **Impacto:** Defense inconsistente — alguns RPCs validam JWT `company_id`, outros não.
- **Remediação:** Auditar cada RPC com `GRANT EXECUTE`; aplicar `validate_company_access()`.

---

## A05 — Security Misconfiguration

### ALTO-012: CORS `Access-Control-Allow-Origin: *` nas Edge Functions

- **Evidência:** `supabase/functions/create-checkout-session/index.ts:9-12`; `supabase/functions/send-appointment-reminder/index.ts:5-9`
- **Impacto:** Qualquer site pode invocar as functions do browser (com JWT roubado ou endpoints sem auth).
- **Remediação:** Allowlist de origens (`https://app.agendix...`, localhost dev).

### MÉDIO-008: Bucket `client_photos` público

- **Evidência:** `supabase/migrations/20260218_client_crm_enhancements.sql:31-37`
- **Impacto:** URLs de fotos de clientes acessíveis sem auth — vazamento de PII se paths forem adivinháveis.
- **Remediação:** Bucket privado + signed URLs com TTL curto.

### MÉDIO-009: `create-checkout-session` aceita `priceId` arbitrário

- **Evidência:** `supabase/functions/create-checkout-session/index.ts:43-47,86-92`
- **Impacto:** Usuário autenticado pode enviar `priceId` de plano mais barato que o UI exibe (UI em `pages/settings/SubscriptionSettings.tsx:76-86` envia priceId, mas server não valida allowlist).
- **Remediação:** Allowlist server-side de price IDs por região/plano.

---

## A07 — Identification and Authentication Failures

### ALTO-013: Rate limit de login com fail-open

- **Evidência:** `contexts/AuthContext.tsx:201-208`
- **Trecho:** `catch` em `check_login_rate_limit` → `// Fail open` → login prossegue.
- **Impacto:** Se RPC falhar (rede, migration ausente), brute-force não é bloqueado.
- **Remediação:** Fail-closed ou fallback local com backoff; alertar em monitoramento.

### MÉDIO-010: `get_company_for_invite` referenciado mas migration ausente no repo

- **Evidência:** `pages/Register.tsx:50-51` — RPC `get_company_for_invite` **não encontrado** em `supabase/migrations/`
- **Impacto:** Comportamento de segurança do convite não auditável offline; pode expor metadados de empresas por UUID.
- **Remediação:** Versionar RPC no repo; restringir a dados mínimos (nome, tipo) sem PII.

---

## A10 — SSRF (Edge Functions)

### ALTO-014: Open Redirect via `successUrl` / `cancelUrl` no checkout

- **Evidência:** `supabase/functions/create-checkout-session/index.ts:43,98-99`
- **Trecho:** `success_url: successUrl, cancel_url: cancelUrl` passados do body JSON sem validação de domínio.
- **Impacto:** Phishing pós-pagamento — atacante autenticado redireciona vítima para domínio malicioso após Stripe checkout.
- **Remediação:** Validar URLs contra allowlist do app (`new URL()`, checar `hostname`).

### INFORMATIVO: SSRF clássico (fetch server-side para URL do usuário)

- **Status:** **Não encontrado** em `supabase/functions/` — nenhuma function faz `fetch()` para URL controlada pelo cliente. `create-checkout-session` repassa URLs ao Stripe, não as busca.

---

## XSS (relacionado A03)

### INFORMATIVO: `dangerouslySetInnerHTML`

- **Status:** **Não encontrado** em `pages/`, `components/`, `hooks/`, `services/`.

### BAIXO-001: `innerHTML` com CSS estático no tour

- **Evidência:** `hooks/useAppTour.ts:36`
- **Trecho:** `style.innerHTML = \`...\`` — conteúdo gerado por tema (`isBeauty`), não por input do usuário.
- **Impacto:** Baixo; risco só se `userType` for manipulável sem auth.

### BAIXO-002: Renderização React de dados de cliente (auto-escape)

- **Evidência:** `pages/ClientCRM.tsx:334,340`; `pages/Clients.tsx:294-297`
- **Status:** JSX escapa por padrão — **sem XSS direto encontrado**, desde que não haja `dangerouslySetInnerHTML` com `notes`.

### BAIXO-003: Links externos construídos a partir de dados do negócio

- **Evidência:** `components/PublicBusinessHeader.tsx:40-48`
- **Trecho:** `instagram.com/${instagramHandle}`, `wa.me/${phone}` — se `instagramHandle` contiver `javascript:` ou path traversal, risco em `href` (mitigado se React sanitiza URLs inválidas).
- **Remediação:** Validar `instagramHandle` com regex alfanumérico; normalizar phone.

---

## CSRF

### INFORMATIVO: CSRF em SPA Supabase

- **Status:** **Não aplicável / risco baixo típico** — autenticação via JWT no header `Authorization` (Supabase client), não cookies de sessão SameSite para API.
- **Evidência:** `supabase/functions/create-checkout-session/index.ts:30` usa `Authorization` header.
- **Nota:** Edge Functions ainda vulneráveis a invocação cross-origin por CORS `*` (ver ALTO-012), que é vetor relacionado mas distinto de CSRF clássico.

---

## A09 — Security Logging and Monitoring Failures

### BAIXO-004: Logs de erro no browser com detalhes

- **Evidência:** `contexts/AuthContext.tsx:140,207,262,341`; `pages/ClientCRM.tsx:96,122`
- **Impacto:** `console.error` expõe mensagens de auth/DB no DevTools em produção.
- **Remediação:** Logger com níveis; não logar stack de auth em prod.

---

## Itens não verificados nesta auditoria

| Item | Status |
|---|---|
| `npm audit` / CVEs em dependências | **Não verificado** |
| Pentest dinâmico / Burp | **Não executado** |
| Config `verify_jwt` das Edge Functions (sem `config.toml` no repo) | **Não encontrado** em `supabase/` |
| Definição SQL de `get_client_profile` | **Não encontrado** em migrations locais |
| Definição SQL de `get_company_for_invite` | **Não encontrado** em migrations locais |

---

## Matriz OWASP Top 10 (2021)

| # | Categoria | Veredito | Severidade máx |
|---|---|---|---|
| A01 | Broken Access Control | **Encontrado** | ALTO |
| A02 | Cryptographic Failures | **Encontrado** | ALTO |
| A03 | Injection | **Parcial** (filter/HTML email) | MÉDIO |
| A04 | Insecure Design | **Encontrado** | ALTO |
| A05 | Security Misconfiguration | **Encontrado** | ALTO |
| A06 | Vulnerable Components | **Não verificado** | — |
| A07 | Auth Failures | **Encontrado** | ALTO |
| A08 | Software Integrity | **Não verificado** | — |
| A09 | Logging Failures | **Parcial** | BAIXO |
| A10 | SSRF | **Parcial** (open redirect; SSRF fetch não encontrado) | ALTO |

---

## Priorização recomendada (Top 5)

1. **Proteger `send-appointment-reminder`** — auth + remover exposição service role (ALTO-001)
2. **Validar URLs e priceIds em `create-checkout-session`** (ALTO-014, MÉDIO-009)
3. **Convite staff com token assinado server-side** (ALTO-002)
4. **Isolar storage `client_photos` por tenant** (MÉDIO-003)
5. **Mover API keys de IA para Edge Function** (ALTO-009)
