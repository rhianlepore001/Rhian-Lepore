# Fase 1 -- Auth + Onboarding

## Objetivo

Fechar o micro-cutover do bounded context Identity sem alterar banco, RLS, RPCs ou contratos externos. A fase corrigiu o principal gap do Reversa: o onboarding do owner passa a usar `onboarding_progress.is_completed` como fonte da verdade, removendo a dependencia do campo legado `profiles.tutorial_completed` para decisao de redirect.

## Escopo entregue

- Login continua via Supabase Auth com rate limit por RPC `check_login_rate_limit`.
- Falha da RPC de rate limit permanece fail-open para nao bloquear usuarios legitimos.
- Owner usa `company_id = user.id` quando o profile nao traz company_id explicito.
- Staff herda `subscription_status`, `trial_ends_at`, `user_type` e `business_name` do owner.
- Staff resolve `teamMemberId` via `team_members`.
- Redirect pos-login usa:
  - staff incompleto -> `/staff-onboarding`;
  - owner com `onboarding_progress.is_completed = false` -> `/onboarding`;
  - owner completo -> `/`.
- Erro de login agora recebe foco e scroll, evitando a sensacao de que nada aconteceu.
- Cadastro de owner cria profile como tenant proprio e inicializa `onboarding_progress`.
- Cadastro de staff cria profile vinculado ao tenant do owner e registro em `team_members`.
- `useOnboardingState` persiste e carrega progresso em `onboarding_progress`.
- Conclusao de onboarding/tutorial:
  - owner grava em `onboarding_progress`;
  - staff grava em `profiles.tutorial_completed`.

## Fora de escopo

- Nenhuma migration de banco.
- Nenhuma mudanca em RLS.
- Nenhuma mudanca em Stripe.
- Nenhuma mudanca visual ampla fora do ajuste de acessibilidade/feedback do login.
- Sem refactor para services/hooks novos alem do necessario para paridade da Fase 1.

## Testes adicionados ou reforcados

- Owner usa `onboarding_progress` como source of truth.
- Owner permanece incompleto quando `onboarding_progress.is_completed = false`, mesmo com campo legado true.
- Staff herda dados do owner.
- Rate limit indisponivel nao bloqueia login.
- Cadastro owner cria `company_id = user.id` e progresso inicial de onboarding.
- Cadastro staff usa `company_id` do owner, cria `team_members` e nao cria onboarding proprio.
- Owner conclui onboarding em `onboarding_progress`.
- Staff conclui tutorial em `profiles.tutorial_completed`.
- Erro visual de login foca e rola ate a mensagem.

## Criterios de aceite

- `npm run typecheck` deve passar.
- `npm run lint` deve passar com `--max-warnings 0`.
- `npm run build` deve passar.
- `npm test -- --run` deve passar.
- Login, registro e onboarding devem preservar owner/staff e multi-tenant por `company_id`.

## Proxima fase

Fase 2: Agenda + Checkout. O foco passa a ser atomicidade do checkout, separacao progressiva de dominio e paridade de comportamento para agendamentos.
