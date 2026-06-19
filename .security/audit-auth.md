# Auditoria de Autenticação e Autorização — AgendiX

**Data:** 2026-06-13  
**Auditor:** security-auth-auditor (pipeline LionClaw)  
**Escopo:** `AuthContext`, rotas (`App.tsx`), login/registro/recuperação de senha, guards, rate limit de login, superfícies JWT/sessão.

**Nota de estrutura:** `OwnerRouteGuard`, `DevRouteGuard` e `ProtectedLayout` **não existem** como arquivos em `components/` — estão definidos inline em `App.tsx` (linhas 58–128).

---

## Resumo executivo

| Severidade | Quantidade |
|------------|------------|
| CRÍTICA    | 1 |
| ALTA       | 4 |
| MÉDIA      | 7 |
| BAIXA      | 3 |
| INFORMATIVA| 2 |

**Pontos positivos verificados:**
- RPC `check_login_rate_limit` implementada em migration (`20260214_rate_limiting.sql`).
- `OwnerRouteGuard` aplicado na maior parte das rotas de configuração e marketing.
- `DevRouteGuard` protege rotas de auditoria/lixeira/logs/UI preview.
- Política RLS bloqueia INSERT direto em `profiles` por usuários autenticados (`Profiles: users cant insert`).
- Validação de senha forte em registro e update (`utils/passwordValidation.ts`).

---

## Findings

### CRÍTICA: Credenciais Supabase hardcoded no cliente com fallback automático

**Severidade:** CRÍTICA  
**Arquivo(s):** `lib/supabase.ts`

**Trecho:**
```3:8:lib/supabase.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lcqwrngscsziysyfhpfj.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('⚠️ Usando credenciais de fallback do Supabase...');
}
```

**Impacto:** O projeto Supabase de produção e a chave `anon` ficam embutidos no bundle quando variáveis de ambiente não estão definidas. Facilita abuso de APIs públicas (auth, RPCs `anon`, edge functions) contra o tenant real; dificulta rotação de chaves e auditoria de ambientes.

**Solução:** Remover fallbacks hardcoded; falhar o build ou o bootstrap se `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` estiverem ausentes. Usar `.env` local e secrets no CI/deploy.

**Esforço:** Baixo (1–2 h).

---

### ALTA: Convite de staff sem token — `company` na URL define tenant e role

**Severidade:** ALTA  
**Arquivo(s):** `pages/Register.tsx`, `contexts/AuthContext.tsx`

**Trecho:**
```31:32:pages/Register.tsx
  const companyIdFromUrl = searchParams.get('company');
  const isInvitedStaff = !!companyIdFromUrl;
```

```81:90:pages/Register.tsx
    const { error } = await register({
      ...
      companyId: companyIdFromUrl || undefined
    });
```

```304:306:contexts/AuthContext.tsx
              role: data.companyId ? 'staff' : 'owner',
              company_id: data.companyId || authData.user.id,
```

**Impacto:** Qualquer pessoa que conheça (ou adivinhe) o UUID do owner pode registrar-se como `staff` da empresa via `/#/register?company={ownerUserId}` sem token de convite, expiração ou aprovação do dono. Escalonamento de privilégio dentro do tenant (acesso a agenda, clientes, financeiro filtrado no UI, etc.).

**Solução:** Convites com token único/expirável (tabela `staff_invites`), validação server-side (`SECURITY DEFINER`) antes de `signUp`; link `?invite={token}` em vez de `company={uuid}`.

**Esforço:** Médio (1–2 dias).

---

### ALTA: Rota `/financeiro` sem `OwnerRouteGuard` — staff acessa módulo financeiro

**Severidade:** ALTA  
**Arquivo(s):** `App.tsx`

**Trecho:**
```183:183:App.tsx
          <Route path="/financeiro" element={<Finance />} />
```

Comparar com rotas protegidas:
```184:185:App.tsx
          <Route path="/marketing" element={<OwnerRouteGuard><Marketing /></OwnerRouteGuard>} />
          <Route path="/insights" element={<OwnerRouteGuard><Reports /></OwnerRouteGuard>} />
```

**Impacto:** Usuários `staff` alcançam a página financeira. O frontend filtra parte dos dados (`pages/Finance.tsx`), mas RLS em `finance_records` usa isolamento por empresa (`user_id = get_auth_company_id()`), permitindo leitura de registros financeiros da empresa via API direta, não apenas a visão filtrada do UI.

**Solução:** Envolver `<Finance />` com `OwnerRouteGuard` (alinhado a `_reversa_sdd/permissions.md`). Restringir RLS/RPCs de finance para staff se a regra de negócio exige apenas comissões próprias.

**Esforço:** Baixo no frontend (30 min); médio se endurecer RLS/RPCs.

---

### ALTA: Rate limit de login falha em modo “fail-open”

**Severidade:** ALTA  
**Arquivo(s):** `contexts/AuthContext.tsx`

**Trecho:**
```199:209:contexts/AuthContext.tsx
    try {
      const { data: allowed } = await supabase.rpc('check_login_rate_limit', { p_email: email });
      if (allowed === false) {
        return { error: { message: 'Muitas tentativas de login...' } };
      }
    } catch (err) {
      console.error('Erro ao verificar rate limit:', err);
      // Fail open to avoid blocking legitimate users on system error
    }
```

**Impacto:** Se o RPC falha (permissão, rede, função ausente no ambiente), o login segue sem limitação — brute force por email continua possível contra `signInWithPassword`.

**Solução:** Fail-closed em produção (bloquear ou degradar com mensagem genérica); monitorar falhas do RPC; garantir `GRANT EXECUTE` para `anon` no `check_login_rate_limit`.

**Esforço:** Baixo (2–4 h).

---

### ALTA: `check_login_rate_limit` sem `GRANT EXECUTE` explícito nas migrations

**Severidade:** ALTA  
**Arquivo(s):** `supabase/migrations/20260214_rate_limiting.sql`

**Trecho:**
```82:90:supabase/migrations/20260214_rate_limiting.sql
CREATE OR REPLACE FUNCTION check_login_rate_limit(p_email TEXT)
...
    RETURN check_rate_limit('login:' || p_email, 5, 60);
```

**Impacto:** A migration define a função mas **não** inclui `GRANT EXECUTE ON FUNCTION check_login_rate_limit(TEXT) TO anon` (outras RPCs no projeto declaram GRANT explicitamente). O login chama o RPC **antes** de autenticar (`AuthContext.login`). Sem permissão para `anon`, a chamada falha e o código faz fail-open (finding anterior). Rate limiting pode ser ineficaz em produção.

**Solução:** Adicionar migration com `GRANT EXECUTE ... TO anon` (e revisar se `authenticated` também precisa). Validar em staging que `allowed === false` após 5 tentativas.

**Esforço:** Baixo (1 h + deploy migration).

---

### MÉDIA: Flag `isDev` baseada em email hardcoded — controle de acesso frágil

**Severidade:** MÉDIA  
**Arquivo(s):** `contexts/AuthContext.tsx`, `App.tsx`

**Trecho:**
```172:172:contexts/AuthContext.tsx
        setIsDev(session.user.email === 'rleporesilva@gmail.com');
```

```107:113:App.tsx
const DevRouteGuard = ({ children }: { children: React.ReactElement }) => {
  const { isDev, isAuthenticated, loading } = useAuth();
  ...
  if (!isDev) return <Navigate to="/configuracoes" replace />;
```

**Impacto:** Rotas de auditoria, lixeira, logs de sistema e UI preview dependem de comparação de email no cliente. Comprometimento dessa conta Supabase = acesso dev no frontend. Não escala; email exposto em docs/testes do repositório.

**Solução:** Coluna `profiles.is_dev` ou role `admin` com checagem também no backend/RLS para `audit_logs` e `system_errors`.

**Esforço:** Médio (4–8 h).

---

### MÉDIA: `resetPasswordForEmail` com `redirectTo` incompleto

**Severidade:** MÉDIA  
**Arquivo(s):** `pages/ForgotPassword.tsx`, `App.tsx`

**Trecho:**
```23:25:pages/ForgotPassword.tsx
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });
```

Redirecionamento depende de efeito em `App.tsx`:
```132:138:App.tsx
    if (hash.includes('access_token') && hash.includes('type=recovery')) {
      const tokenPart = hash.substring(hash.indexOf('access_token'));
      window.location.hash = '/update-password?' + tokenPart;
    }
```

**Impacto:** Se `redirectTo` não estiver na allowlist do Supabase ou o link não carregar o hash esperado, recuperação falha ou usuário cai em rota errada. `redirectTo` só com `origin` é frágil em HashRouter (`/#/update-password`).

**Solução:** `redirectTo: `${window.location.origin}/#/update-password`` e registrar URL exata no dashboard Supabase.

**Esforço:** Baixo (1 h).

---

### MÉDIA: Tokens de recuperação JWT expostos no hash da URL

**Severidade:** MÉDIA  
**Arquivo(s):** `pages/UpdatePassword.tsx`, `App.tsx`

**Trecho:**
```37:44:pages/UpdatePassword.tsx
                if (fullHash.includes('?')) {
                    const queryPart = fullHash.substring(fullHash.indexOf('?') + 1);
                    const queryParams = new URLSearchParams(queryPart);
                    accessToken = queryParams.get('access_token');
                    refreshToken = queryParams.get('refresh_token');
                    type = queryParams.get('type');
```

```56:59:pages/UpdatePassword.tsx
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
```

**Impacto:** Tokens de sessão transitam no fragmento da URL (histórico do browser, screenshots, extensões, possível leakage via Referer em recursos subsequentes). Vetor clássico em fluxos OAuth/recovery com hash routing.

**Solução:** Preferir fluxo PKCE do Supabase com redirect que processa tokens imediatamente; limpar hash antes de qualquer navegação externa; considerar `exchangeCodeForSession` quando disponível.

**Esforço:** Médio (4–8 h).

---

### MÉDIA: `UpdatePassword` permite troca de senha com sessão existente sem provar senha atual

**Severidade:** MÉDIA  
**Arquivo(s):** `pages/UpdatePassword.tsx`

**Trecho:**
```21:27:pages/UpdatePassword.tsx
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    // Session already exists, we're good
                    setInitializing(false);
                    return;
                }
```

```101:103:pages/UpdatePassword.tsx
            const { error } = await supabase.auth.updateUser({
                password: password
            });
```

**Impacto:** Usuário já autenticado (sessão hijackada, XSS, dispositivo compartilhado) pode alterar senha em `/#/update-password` sem confirmar senha atual nem fluxo recovery.

**Solução:** Exigir `type=recovery` ou senha atual para usuários com sessão normal; separar “alterar senha” (settings) de “recovery”.

**Esforço:** Baixo–médio (2–4 h).

---

### MÉDIA: Registro tenta INSERT em `profiles` bloqueado por RLS

**Severidade:** MÉDIA  
**Arquivo(s):** `contexts/AuthContext.tsx`, `supabase/migrations/20260320_us0302_remove_permissive_rls_policy.sql`

**Trecho (cliente):**
```291:310:contexts/AuthContext.tsx
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ ... role, company_id, ... }]);
        if (profileError) return { error: profileError };
```

**Trecho (RLS):**
```44:47:supabase/migrations/20260320_us0302_remove_permissive_rls_policy.sql
CREATE POLICY "Profiles: users cant insert"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (false);
```

**Impacto:** Registro depende do trigger `handle_new_user` (SECURITY DEFINER) para criar perfil básico; o INSERT do cliente falha sempre para usuários autenticados. Risco: usuário auth criado com perfil incompleto (role/company errados) se trigger não replica metadados de staff; estado inconsistente e possível bypass se trigger e cliente divergem.

**Solução:** Remover INSERT client-side; estender `handle_new_user` ou RPC `complete_registration` SECURITY DEFINER com validação de convite.

**Esforço:** Médio (1 dia).

---

### MÉDIA: RPC `get_company_for_invite` referenciada no frontend mas ausente nas migrations do repositório

**Severidade:** MÉDIA  
**Arquivo(s):** `pages/Register.tsx`

**Trecho:**
```50:51:pages/Register.tsx
    supabase
      .rpc('get_company_for_invite', { p_company_id: companyIdFromUrl })
```

**Impacto:** Não há definição SQL em `supabase/migrations/` (grep no repositório: zero matches). Se existir só em produção, o repositório não audita validações da RPC (enumeração de empresas, leak de `business_name`). Se não existir, fluxo de convite quebra silenciosamente.

**Solução:** Adicionar migration com RPC, `GRANT` apenas `anon`/`authenticated`, validação de convite, sem expor dados sensíveis por UUID arbitrário.

**Esforço:** Médio (4–8 h).

---

### MÉDIA: CORS permissivo (`*`) em Edge Functions com auth

**Severidade:** MÉDIA  
**Arquivo(s):** `supabase/functions/create-checkout-session/index.ts` (padrão similar em `send-appointment-reminder`)

**Trecho:**
```9:12:supabase/functions/create-checkout-session/index.ts
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

**Impacto:** `Access-Control-Allow-Origin: *` com endpoints que aceitam `Authorization` facilita chamadas cross-origin de origens maliciosas se o atacante obtém JWT (XSS, leak). Não é bypass de auth sozinho, mas amplia superfície CSRF-like em integrações browser.

**Solução:** Restringir origin à lista de domínios do app (`https://app.agendix...`); validar JWT no function.

**Esforço:** Baixo (2–4 h).

---

### BAIXA: Rota `/produtos` sem `OwnerRouteGuard`

**Severidade:** BAIXA  
**Arquivo(s):** `App.tsx`

**Trecho:**
```182:182:App.tsx
          <Route path="/produtos" element={<Products />} />
```

**Impacto:** Staff pode gerenciar catálogo de produtos se RLS permitir mutações em tabelas de produtos para `company_id` compartilhado. Pode ser intencional; não documentado na matriz RBAC.

**Solução:** Confirmar regra de negócio; aplicar guard ou RLS read-only para staff.

**Esforço:** Baixo (1–2 h).

---

### BAIXA: Bypass parcial em `ProtectedLayout` para `update-password` (código morto/confuso)

**Severidade:** BAIXA  
**Arquivo(s):** `App.tsx`

**Trecho:**
```65:69:App.tsx
  if (!isAuthenticated) {
    if (window.location.hash.includes('update-password')) {
      return <Outlet />;
    }
    return <Navigate to="/login" replace />;
  }
```

**Impacto:** `/update-password` já é rota pública fora de `ProtectedLayout` (linha 149). Este branch não protege rotas autenticadas adicionais, mas indica lógica de auth inconsistente — risco de regressão se rotas forem reorganizadas.

**Solução:** Remover branch redundante ou documentar; manter update-password apenas como rota pública explícita.

**Esforço:** Baixo (30 min).

---

### BAIXA: Navegação pós-registro sem garantir sessão ativa

**Severidade:** BAIXA  
**Arquivo(s):** `pages/Register.tsx`

**Trecho:**
```96:100:pages/Register.tsx
      if (isInvitedStaff) {
        navigate('/staff-onboarding');
      } else {
        navigate('/onboarding-wizard');
      }
```

**Impacto:** Se Supabase exige confirmação de email, `register` pode “suceder” sem sessão; `RequireAuth` redireciona a login, mas UX confusa; possível estado onde conta auth existe sem perfil completo.

**Solução:** Checar `session` após `signUp`; mensagem “confirme seu email” quando `session === null`.

**Esforço:** Baixo (1–2 h).

---

### INFORMATIVA: Rate limiting de login implementado no banco

**Severidade:** INFORMATIVA  
**Arquivo(s):** `supabase/migrations/20260214_rate_limiting.sql`, `contexts/AuthContext.tsx`

**Trecho:**
```88:89:supabase/migrations/20260214_rate_limiting.sql
    -- Limite: 5 tentativas por minuto por email
    RETURN check_rate_limit('login:' || p_email, 5, 60);
```

**Impacto:** Mecanismo existe (5 tentativas / 60s por email). Eficácia depende de GRANT + fail-closed no cliente (findings ALTA acima).

---

### INFORMATIVA: Rotas públicas intencionais (sem auth de usuário SaaS)

**Severidade:** INFORMATIVA  
**Arquivo(s):** `App.tsx`

**Trecho:**
```150:154:App.tsx
        <Route path="/book/:slug" element={<PublicBooking />} />
        <Route path="/queue/:slug" element={<QueueJoin />} />
        <Route path="/queue-status/:id" element={<QueueStatus />} />
        <Route path="/pro/:slug" element={<ProfessionalPortfolio />} />
        <Route path="/minha-area/:slug" element={<ClientArea />} />
```

**Impacto:** Rotas públicas por design. Segurança depende de RLS/RPCs públicos (fora do escopo desta auditoria de auth de usuário, mas relevante para IDOR).

---

## O que NÃO foi encontrado neste escopo

- Arquivos `components/OwnerRouteGuard.tsx`, `components/DevRouteGuard.tsx`, `components/ProtectedLayout.tsx` — **não existem**; lógica em `App.tsx`.
- Configuração CORS do projeto Supabase (dashboard) — não auditable via código local.
- Políticas RLS live em produção vs migrations — requer validação no Supabase dashboard.
- Confirmação de email obrigatória — depende de config Auth no Supabase (não visível no código).

---

## Priorização recomendada

1. Remover credenciais hardcoded (`lib/supabase.ts`).
2. Convites de staff com token + validação server-side.
3. `OwnerRouteGuard` em `/financeiro` + RLS finance para staff.
4. GRANT + fail-closed no rate limit de login.
5. Corrigir fluxo de registro (RLS vs INSERT client).
6. Endurecer recovery de senha (redirect, tokens no hash, sessão existente).
