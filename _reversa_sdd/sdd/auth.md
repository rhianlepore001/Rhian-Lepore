# Autenticação e Autorização (auth)

## Visão Geral
Sistema de autenticação e autorização baseado em Supabase Auth, com suporte a múltiplos perfis (Owner/Staff), dual theme (Barber/Beauty), trial de 7 dias, rate limiting anti-brute force, flag de desenvolvedor e MFA TOTP.

## Responsabilidades
- Autenticar usuários via email/senha com proteção anti-brute force
- Registrar novos owners (com trial de 7 dias) e staff (vinculados a owner)
- Gerenciar sessão global via React Context (AuthContext)
- Implementar herança owner→staff (assinatura, tema, nome do negócio)
- Verificar permissões por papel (Owner/Staff/Dev) em rotas protegidas
- Suportar override de tema para desenvolvedor
- Gerenciar estado de onboarding/tutorial

## Interface

### Entradas
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| email | string | Email do usuário (login/registro) |
| password | string | Senha (mínimo implícito via Supabase) |
| full_name | string | Nome completo (registro) |
| business_name | string | Nome do negócio (registro owner) |
| user_type | 'barber' \| 'beauty' | Segmento do negócio |
| region | 'BR' \| 'PT' | Região para moeda/idioma |
| companyId | uuid \| null | ID do owner (registro de staff) |

### Saídas
| Saída | Tipo | Descrição |
|-------|------|-----------|
| session | Session \| null | Sessão Supabase Auth |
| profile | Profile \| null | Dados do perfil (profiles) |
| isSubscriptionActive | boolean | Computado a partir do status e trial |
| role | 'owner' \| 'staff' | Papel do usuário |
| companyId | uuid \| null | ID do owner (ou próprio ID se owner) |
| teamMemberId | uuid \| null | ID do registro em team_members (staff) |
| isDev | boolean | Flag de desenvolvedor |

## Regras de Negócio
- **R1** Todo query no banco DEVE filtrar por `company_id` (RLS). Query sem `company_id` retorna vazio silenciosamente. 🟢
- **R2** `company_id` vem SEMPRE do session Supabase via `useAuth()`, nunca de URL params ou form inputs. 🟢
- **R3** Login possui rate limiting token bucket via RPC `check_login_rate_limit`. Após excesso de tentativas, bloqueio de 1 minuto. 🟢
- **R4** Staff herda `user_type`, `business_name` e plano de assinatura do owner. A herança ocorre em chamada única para evitar flicker de tema. 🟢
- **R5** Dev é identificado por email hardcoded (`rleporesilva@gmail.com`). Dev pode alternar `user_type` via localStorage. 🟢
- **R6** Registro de staff cria automaticamente registro em `team_members` com slug gerado a partir do nome + número aleatório. 🟢
- **R7** Trial tem duração fixa de 7 dias (`Date.now() + 7 * 24 * 60 * 60 * 1000`). 🟢
- **R8** Assinatura é considerada ativa se status for `active`, `subscriber`, ou `trial` dentro do prazo. 🟢
- **R9** Staff sem owner encontrado cai em fallback: `userType` próprio, `subscriptionStatus='subscriber'`, sem trial. 🟢
- **R10** Erro na RPC de rate limiting é fail-open (não bloqueia usuário legítimo). 🟢
- **R11** Onboarding redirect verifica `business_settings.onboarding_completed` antes de redirecionar para `/`. 🟢
- **R12** Dev pode alternar `activeUserType` via `localStorage` key `rhian_lepore_dev_type`, overrideando `userType` global. 🟢

## Fluxo Principal

### Login Completo
1. Usuário preenche email/senha e clica em login
2. Sistema verifica rate limit via RPC `check_login_rate_limit(p_email)`
   - Se bloqueado: exibe erro "Muitas tentativas... aguarde 1 minuto"
   - Se falha na RPC: fail-open (não bloqueia)
3. Executa `supabase.auth.signInWithPassword({email, password})`
4. Em sucesso, `onAuthStateChange` dispara `fetchProfileData`
5. `fetchProfileData` busca perfil em `profiles` por `id`
6. Se perfil.role = 'staff':
   - Busca dados do owner por `company_id`
   - Herda `subscription_status`, `trial_ends_at`, `user_type`, `business_name`
   - Busca `team_member_id` em `team_members` por `staff_user_id`
   - Se owner não encontrado: fallback para 'subscriber' sem trial
7. Se perfil.role = 'owner': usa dados próprios
8. Seta estados globais no AuthContext
9. `Login.tsx` verifica `business_settings.onboarding_completed`
   - Se não completou: redirect `/onboarding`
   - Se completou: redirect `/`

### Registro de Novo Usuário
1. Usuário preenche formulário de registro
2. Executa `supabase.auth.signUp` com metadata (`full_name`, `business_name`)
3. Em sucesso, insere registro em `profiles`:
   - `trial_ends_at = now + 7 dias`
   - `subscription_status = 'trial'`
   - `role = 'staff'` se `companyId` presente, senão `'owner'`
   - `company_id = companyId || authData.user.id`
   - `aios_enabled = true`
4. Se `companyId` (registro de staff):
   - Insere em `team_members` vinculado ao owner (`user_id = companyId`)
   - Gera slug a partir do nome + número aleatório
   - Erro em `team_members` é logado mas não impede criação da conta
5. Retorna `{ error }` para a UI

## Fluxos Alternativos
- **[Registro de staff com falha em team_members]:** Conta é criada (auth + profile), mas staff não aparece na equipe. Erro é logado no console. Staff pode ser adicionado manualmente depois. 🟢
- **[Rate limit RPC indisponível]:** Sistema não bloqueia login (fail-open). Usuário pode tentar logar normalmente. 🟢
- **[Owner não encontrado para staff]:** Staff recebe `subscriptionStatus='subscriber'` sem trial, `userType` próprio, `businessName` vazio. Pode logar mas com funcionalidade limitada. 🟢
- **[Dev alternando user_type]:** Dev com email hardcoded pode usar `setDevUserType` para alternar entre 'barber' e 'beauty', persistido em localStorage. Override afeta todo o tema da aplicação. 🟢

## Cenários de Borda

### B1 — Staff é removido do team_members mas ainda tem conta
- **Condição:** Staff foi removido da equipe (DELETE em `team_members`), mas o perfil em `profiles` ainda existe com `role='staff'` e `company_id` do owner.
- **Comportamento:** `fetchProfileData` busca owner por `company_id`, herda dados, mas `teamMemberId` fica `null` (query em `team_members` não encontra registro).
- **Impacto:** Staff pode logar e ver dados do owner, mas não terá `teamMemberId` para operações que exigem vínculo (ex: marcação de atendimento como concluído).
- **Risco:** Médio — funcionalidade quebrada silenciosamente.

### B2 — Trial expira exatamente no momento do login
- **Condição:** `trial_ends_at` é exatamente igual a `new Date()` no momento do cálculo de `isSubscriptionActive`.
- **Comportamento:** `new Date() < parseDate(trialEndsAt)` retorna `false` (timestamp é igual ou maior). `isSubscriptionActive = false`.
- **Impacto:** Usuário é redirecionado para tela de assinatura ou vê funcionalidade bloqueada.
- **Risco:** Baixo — comportamento esperado, mas pode causar confusão se o usuário tentar logar no último minuto do trial.

### B3 — Registro com companyId inválido (owner não existe)
- **Condição:** Usuário tenta se registrar como staff com um `companyId` que não existe em `profiles`.
- **Comportamento:** `profiles` é inserido com `company_id = companyId` (FK não impede, pois `company_id` não é FK estrita). Em `fetchProfileData`, query do owner retorna vazio → fallback para 'subscriber' sem trial.
- **Impacto:** Staff loga mas não vê dados do owner (porque owner não existe). Sistema funciona de forma degradada.
- **Risco:** Baixo — requer `companyId` manual (normalmente via link de convite).

## Dependências
- `lib/supabase.ts` — cliente Supabase singleton com interceptors
- `utils/date.ts` — `parseDate` para comparação de datas
- `@supabase/supabase-js` — tipos `Session`, `User`, `AuthError`
- `react-router-dom` — `useNavigate` para redirects pós-login

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Segurança | Rate limiting token bucket no login | `AuthContext.tsx:187-205` | 🟢 |
| Segurança | Fail-open em falha de RPC de rate limit | `AuthContext.tsx:188-197` | 🟢 |
| Disponibilidade | Herança owner→staff em chamada única (anti-flicker) | `AuthContext.tsx:92-110` | 🟢 |
| Performance | Sem cache de perfil — query a cada refresh de sessão | `AuthContext.tsx:66-130` | 🟡 |

## Critérios de Aceitação

```gherkin
# Cenário 1: Login bem-sucedido de owner
Dado que o usuário é um owner com trial ativo
E preenche email e senha corretos
Quando clica em "Entrar"
Então o sistema verifica rate limit
E autentica via Supabase
E busca o perfil
E redireciona para o dashboard

# Cenário 2: Login com rate limit excedido
Dado que o usuário excedeu o limite de tentativas de login
Quando tenta logar novamente
Então o sistema exibe "Muitas tentativas... aguarde 1 minuto"
E bloqueia o login por 1 minuto

# Cenário 3: Login com credenciais inválidas
Dado que o usuário preenche email ou senha incorretos
Quando clica em "Entrar"
Então o sistema exibe erro de credenciais
E não dispara fetchProfileData

# Cenário 4: Registro de staff com companyId válido
Dado que um novo usuário acessa link de convite com companyId válido
Quando preenche o formulário de registro
Então o sistema cria conta em auth.users
E insere perfil com role='staff' e companyId do owner
E insere registro em team_members com slug gerado
E herda trial e assinatura do owner

# Cenário 5: Staff sem owner encontrado (fallback)
Dado que um staff tenta logar
E o owner vinculado em company_id não existe mais
Quando o login é bem-sucedido
Então o staff recebe subscriptionStatus='subscriber'
E não tem acesso a trial
E userType é o próprio do perfil

# Cenário 6: Dev alternando tema
Dado que o usuário logado é o dev (email hardcoded)
Quando alterna o tema via UI de dev
Então o localStorage é atualizado com o novo userType
E o tema da aplicação muda instantaneamente
E persiste entre sessões
```

## Prioridade

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Login com rate limiting | Must | Caminho crítico — todas as sessões começam aqui |
| Registro de owner com trial | Must | Caminho crítico de aquisição de usuários |
| Herança owner→staff | Must | Regra de negócio sem fallback — staff depende do owner |
| Verificação de assinatura ativa | Must | Gate de funcionalidade paga |
| Onboarding redirect | Should | Importante para ativação, mas não impede uso |
| Dev override de tema | Could | Apenas para desenvolvimento, não afeta usuários finais |
| Flag aios_enabled | Could | Feature flag, pode ser desativado sem impactar core |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `contexts/AuthContext.tsx` | `AuthProvider`, `fetchProfileData`, `login`, `register`, `logout`, `isSubscriptionActive` | 🟢 |
| `pages/Login.tsx` | `Login` (gateway de segmento, formulário, redirect pós-login) | 🟢 |
| `pages/Register.tsx` | `Register` (formulário de registro) | 🟢 |
| `pages/ForgotPassword.tsx` | `ForgotPassword` (recuperação de senha) | 🟢 |
| `pages/UpdatePassword.tsx` | `UpdatePassword` (redefinição pós-email) | 🟢 |
| `hooks/use2FA.ts` | `use2FA` (enroll, challenge, verify TOTP) | 🟢 |
| `components/security/TwoFactorSetup.tsx` | `TwoFactorSetup` (UI de configuração 2FA) | 🟢 |

---

*Gerado pelo Reversa Writer em 2026-05-06. Nível: Detalhado.*
