# Secrets Scanner — AgendiX

**Data:** 2026-06-13  
**Escopo:** `c:\Users\User\Downloads\Rhian-Lepore-main`  
**Método:** leitura de `.gitignore`, `.env.example`, `lib/openrouter.ts`, `lib/supabase.ts`, `supabase/functions/*`, `scripts/`; grep por `sk_`, `pk_`, `apikey`, `secret`, `password =`, JWT (`eyJ…`), `AIza…`, `sk-or-v1-`; verificação `git ls-files` / `git check-ignore`.

## Resumo por severidade

| Severidade | Qtd | Ação imediata |
|---|---:|---|
| **CRÍTICO** | 3 | Rotacionar chaves expostas; remover do histórico git se necessário |
| **ALTO** | 6 | Mover secrets para server-side; remover fallbacks hardcoded |
| **MÉDIO** | 4 | Corrigir convenções `VITE_*`; alinhar `.env.example` |
| **BAIXO** | 2 | Limpar artefatos locais; senhas só em testes |
| **INFO (positivo)** | 4 | Manter práticas atuais |

---

## CRÍTICO

### CRÍTICO-001 — API key TestSprite commitada no repositório

- **Arquivo(s):** `.claude/settings.json:14`
- **Evidência:**
```json
"API_KEY": "sk-user-Cg86N-_OikwKw6UqKtGbf1KXj591TgTGPAsNaISTuqRwDNr0RCA4VPb-ely2yDHePfOwblfOAfzhc89hmg3SBO4Zf3Ohjcyo2tmQZnJ0tP5kk8lryWshZZv1_256ywZ0Zro"
```
- **Git:** arquivo **rastreado** (`git ls-files .claude/settings.json` → presente). **Não** está no `.gitignore` (apenas `.claude/settings.local.json` em `.gitignore:51`).
- **Impacto:** chave de serviço externo vazada para qualquer clone do repo; abuso de quota/custo.
- **Correção:** remover chave do JSON; usar variável de ambiente ou arquivo local ignorado; rotacionar a key no TestSprite; considerar `git filter-repo` se o repo foi público.

---

### CRÍTICO-002 — Supabase URL + anon JWT hardcoded em código versionado

- **Arquivo(s):** `lib/supabase.ts:3-4`
- **Evidência:**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lcqwrngscsziysyfhpfj.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcXdybmdzY3N6aXlzeWZocGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MzYwNzMsImV4cCI6MjA3OTQxMjA3M30.Kpb-focSL2eny9gJkNjtDACl-J4jlGZoNPEgnTG-5Ug';
```
- **Git:** `lib/supabase.ts` **rastreado**.
- **Impacto:** projeto Supabase identificável sem `.env`; anon key embutida no bundle e no repo. RLS limita dados, mas facilita enumeração e ataques direcionados; impede rotação limpa.
- **Correção:** remover fallbacks; falhar build se env ausente; rotacionar anon key se repo compartilhado/publicado.

---

### CRÍTICO-003 — Credenciais reais em `.env` local (não versionado, risco operacional)

- **Arquivo(s):** `.env:17`, `.env:26`
- **Evidência:** chaves reais presentes (formato `AIzaSy…` linha 17; `sk-or-v1-…` linha 26).
- **Git:** `.env` **ignorado** (`.gitignore:26`).
- **Impacto:** vazamento por backup, compartilhamento de pasta, ou commit acidental futuro; chaves ativas no disco.
- **Correção:** rotacionar Gemini e OpenRouter; nunca copiar `.env` para chats/screenshots; preferir `.env.local` único com prefixos `VITE_*` alinhados ao app.

---

## ALTO

### ALTO-001 — Stripe publishable key (`pk_test_…`) hardcoded no frontend

- **Arquivo(s):** `pages/settings/SubscriptionSettings.tsx:15`
- **Evidência:**
```typescript
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51Rk3ZLPUPmLLh2qESPurB4bgAa4VqLe41OQPtQNUQTfu2A8pV8Zk7rYIBgg8SWUA9ItuYyGfGBr8cSw4YMa9tMJY004eg5XVbo');
```
- **Git:** **rastreado**.
- **Impacto:** chave de teste Stripe exposta no bundle e no git; permite uso indevido em ambiente de teste vinculado à conta.
- **Correção:** remover fallback; exigir `VITE_STRIPE_PUBLISHABLE_KEY`; rotacionar key no Stripe Dashboard se repo público.

---

### ALTO-002 — OpenRouter API key no bundle do cliente (`VITE_*`)

- **Arquivo(s):**
  - `lib/openrouter.ts:4,33,73,112`
  - `hooks/useAIAssistant.ts:9,69`
  - `hooks/useContentCalendar.ts:7,66`
- **Evidência (`lib/openrouter.ts:4,33`):**
```typescript
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
// ...
'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
```
- **Impacto:** qualquer `VITE_*` vai para o JS público; extração via DevTools → abuso de quota/custo OpenRouter.
- **Correção:** proxy via Edge Function com auth + rate limit; cliente nunca envia Bearer de OpenRouter.

---

### ALTO-003 — Gemini API key no cliente + query string visível na rede

- **Arquivo(s):**
  - `lib/gemini.ts:6,213-216,250`
  - `vite.config.ts:39-40`
- **Evidência:**
```typescript
// lib/gemini.ts:6
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
// lib/gemini.ts:250
`...generateContent?key=${apiKey}`
// vite.config.ts:39-40
'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
```
- **Impacto:** `VITE_GEMINI_API_KEY` no bundle; key também aparece na URL de request (logs de proxy, histórico de rede).
- **Correção:** chamar Gemini só server-side (Edge Function); remover `define` de `GEMINI_API_KEY` no Vite se não usado no client.

---

### ALTO-004 — OpenRouter key em `.env.local` (gitignored)

- **Arquivo(s):** `.env.local:12`
- **Evidência:** `VITE_OPENROUTER_API_KEY=sk-or-v1-…`
- **Git:** **ignorado** (`.gitignore:54` `.env*.local`).
- **Impacto:** mesma key usada no client; risco local + exposição no bundle de produção se deploy incluir env.
- **Correção:** rotacionar; migrar para backend proxy.

---

### ALTO-005 — Credenciais de login + API key em artefato TestSprite

- **Arquivo(s):** `testsprite_tests/tmp/config.json:6-8,15`
- **Evidência:**
```json
"loginUser": "rleporesilva@gmail.com",
"loginPassword": "rhianlepore789",
"envs": { "API_KEY": "sk-user-HEV3ToCTOi6ncG3qLBmU8jRsdeblRxmvZnBAB6kBNBx65S2MjFoIoonwdYQVG_G0lxT1oihWmlGVXbm0Cr2Hv416wDjT3gMmv4ULMHo3ZssSOPzxjzi76PTzma-veJ2kEh8" }
```
- **Git:** diretório `testsprite_tests/tmp/` **ignorado** (`.gitignore:94`); `config.json` **não** rastreado.
- **Impacto:** senha de conta real + API key em plaintext no disco; risco se pasta for zipada/compartilhada.
- **Correção:** trocar senha da conta; rotacionar API TestSprite; usar credenciais de teste descartáveis; nunca commitar `tmp/`.

---

### ALTO-006 — Edge Function de reminder usa `SERVICE_ROLE_KEY` (correto no env, risco se endpoint público)

- **Arquivo(s):** `supabase/functions/send-appointment-reminder/index.ts:27-30,32`
- **Evidência:**
```typescript
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
// ...
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
```
- **Impacto:** secrets **não** hardcoded (bom). Porém SERVICE_ROLE bypassa RLS — invoke HTTP público sem auth forte = escalada (ver audit-auth).
- **Correção:** restringir invoke (cron secret, JWT service); não logar env vars.

---

## MÉDIO

### MÉDIO-001 — `.env.example` desalinhado do app (prefixos errados)

- **Arquivo(s):** `.env.example:19,46-48` vs `README.md:18-20`
- **Evidência:** example usa `OPENROUTER_API_KEY`, `SUPABASE_URL` sem prefixo `VITE_`; app exige `VITE_SUPABASE_URL`, `VITE_OPENROUTER_API_KEY`.
- **Impacto:** devs podem configurar `.env` errado e depender dos fallbacks hardcoded de `lib/supabase.ts`.
- **Correção:** atualizar `.env.example` com `VITE_*` documentados; remover chaves legadas AIOX não usadas pelo AgendiX.

---

### MÉDIO-002 — Script de backup aceita `VITE_SUPABASE_SERVICE_ROLE_KEY`

- **Arquivo(s):** `scripts/backup-supabase.js:8-9,12`
- **Evidência:**
```javascript
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
```
- **Impacto:** prefixo `VITE_` sugere exposição ao client; service role nunca deve ir para bundle Vite.
- **Correção:** usar apenas `SUPABASE_SERVICE_ROLE_KEY` em scripts Node; documentar no README de ops.

---

### MÉDIO-003 — Fallback Supabase anula proteção do `.gitignore`

- **Arquivo(s):** `lib/supabase.ts:6-8`
- **Evidência:**
```typescript
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('⚠️ Usando credenciais de fallback do Supabase...');
}
```
- **Impacto:** deploy/build sem env ainda funciona com credenciais embutidas; alerta no console confirma uso de fallback.
- **Correção:** `throw` em build/prod quando env ausente.

---

### MÉDIO-004 — Stripe checkout Edge Function: secrets só via `Deno.env` (positivo com CORS `*`)

- **Arquivo(s):** `supabase/functions/create-checkout-session/index.ts:5,20-22`
- **Evidência:** `STRIPE_SECRET_KEY` apenas de `Deno.env.get` — **sem** hardcode.
- **Ressalva:** CORS `Access-Control-Allow-Origin: *` (`:9-12`) não é leak de secret, mas amplia superfície (auth separada).

---

## BAIXO

### BAIXO-001 — Senhas fictícias em testes unitários

- **Arquivo(s):** `test/contexts/AuthContext.test.tsx:189,221,254,314`
- **Evidência:** `password: 'password123'`, `password: 'Password123!'`
- **Impacto:** esperado em mocks; sem credencial real.

---

### BAIXO-002 — Placeholders em script RLS (sem secret real)

- **Arquivo(s):** `scripts/fix-queue-rls.mjs:4-5`
- **Evidência:** `'YOUR_SUPABASE_URL'`, `'YOUR_SERVICE_KEY'`
- **Impacto:** nenhum secret real; risco só se alguém substituir e commitar.

---

## INFO (positivo)

| Item | Evidência |
|---|---|
| `.env` / `.env.local` no gitignore | `.gitignore:26`, `.gitignore:54` |
| Tokens auxiliares ignorados | `.gitignore:28-29` (`access_token.txt`, `token.json`) |
| Stripe **secret** não no frontend | `create-checkout-session/index.ts:5,20` usa `Deno.env` |
| Sem log de secrets completos | grep `console.*key\|token\|secret` — só mensagens genéricas (`ForgotPassword.tsx:30`, `UpdatePassword.tsx:112`) |
| Edge Functions Resend/Stripe | secrets via `Deno.env.get`, não inline |

---

## Inventário `VITE_*` (exposição ao cliente)

| Variável | Onde | Deveria ir ao client? |
|---|---|---|
| `VITE_SUPABASE_URL` | `lib/supabase.ts:3` | Sim (público) |
| `VITE_SUPABASE_ANON_KEY` | `lib/supabase.ts:4` | Sim (público, com RLS) |
| `VITE_OPENROUTER_API_KEY` | `lib/openrouter.ts:4`, hooks | **Não** — mover para Edge Function |
| `VITE_GEMINI_API_KEY` | `lib/gemini.ts:6,213` | **Não** — mover para Edge Function |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `SubscriptionSettings.tsx:15` | Sim (publishable), mas **sem** fallback hardcoded |

---

## Arquivos lidos nesta auditoria

- `.gitignore`
- `.env.example`
- `.env` (local, gitignored)
- `.env.local` (local, gitignored)
- `lib/openrouter.ts`
- `lib/supabase.ts`
- `lib/gemini.ts`
- `vite.config.ts`
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/send-appointment-reminder/index.ts`
- `scripts/backup-supabase.js`, `scripts/fix-queue-rls.mjs`, `scripts/verify_rls.ts`
- `.claude/settings.json`
- `testsprite_tests/tmp/config.json`
- `pages/settings/SubscriptionSettings.tsx`

---

## Não encontrado (nesta rodada)

- `sk_live_` / `sk_test_` Stripe secret no frontend
- `STRIPE_SECRET_KEY` hardcoded (só env na Edge Function)
- Senhas em comentários de código de produção
- `.env` / `.env.local` rastreados por git (confirmado ignorados)
- Padrão `password = '...'` com credencial real fora de testes

---

## Prioridade de remediação

1. Rotacionar: TestSprite (`settings.json`), OpenRouter, Gemini, Stripe test pk, senha em `config.json`.
2. Remover fallbacks hardcoded: `lib/supabase.ts`, `SubscriptionSettings.tsx`.
3. Tirar `.claude/settings.json` do controle de versão ou substituir key por referência a env.
4. Proxy server-side para OpenRouter/Gemini.
5. Alinhar `.env.example` com `VITE_*` do README.
