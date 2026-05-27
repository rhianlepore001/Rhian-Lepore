# Permissões e Papéis (RBAC) — agendix

> Gerado pelo Detective em 2026-05-06
> Nível de confiança: 🟢 Confirmado | 🟡 Inferido | 🔴 Lacuna

---

## Papéis Identificados

| Papel | Definição | Origem no Código |
|-------|-----------|------------------|
| **Owner** | Dono do estabelecimento. Acesso total. | `profiles.role = 'owner'` |
| **Staff** | Profissional vinculado a um owner. Acesso restrito. | `profiles.role = 'staff'` |
| **Dev** | Desenvolvedor (`rleporesilva@gmail.com`). Acesso a rotas de auditoria. | `session.user.email === 'rleporesilva@gmail.com'` |

---

## Matriz de Permissões

### Rotas (Frontend)

| Rota | Owner | Staff | Dev | Guard |
|------|:-----:|:-----:|:---:|-------|
| `/` (Dashboard) | ✅ | ✅ | ✅ | ProtectedLayout |
| `/agenda` | ✅ | ✅ | ✅ | ProtectedLayout |
| `/clientes` | ✅ | ✅ | ✅ | ProtectedLayout |
| `/clientes/:id` | ✅ | ✅ | ✅ | ProtectedLayout |
| `/meus-insights` | ❌ | ✅ | ✅ | ProtectedLayout |
| `/fila` | ✅ | ❌ | ✅ | OwnerRouteGuard |
| `/financeiro` | ✅ | ❌ | ✅ | OwnerRouteGuard |
| `/marketing` | ✅ | ❌ | ✅ | OwnerRouteGuard |
| `/insights` | ✅ | ❌ | ✅ | OwnerRouteGuard |
| `/configuracoes/geral` | ✅ | ❌ | ✅ | OwnerRouteGuard |
| `/configuracoes/agendamento` | ✅ | ❌ | ✅ | OwnerRouteGuard |
| `/configuracoes/equipe` | ✅ | ❌ | ✅ | OwnerRouteGuard |
| `/configuracoes/servicos` | ✅ | ✅ | ✅ | ProtectedLayout |
| `/configuracoes/comissoes` | ✅ | ❌ | ✅ | OwnerRouteGuard |
| `/configuracoes/assinatura` | ✅ | ❌ | ✅ | OwnerRouteGuard |
| `/configuracoes/seguranca` | ✅ | ❌ | ✅ | OwnerRouteGuard |
| `/configuracoes/auditoria` | ❌ | ❌ | ✅ | DevRouteGuard |
| `/configuracoes/lixeira` | ❌ | ❌ | ✅ | DevRouteGuard |
| `/configuracoes/erros` | ❌ | ❌ | ✅ | DevRouteGuard |
| `/configuracoes/notificacoes` | ✅ | ❌ | ✅ | OwnerRouteGuard |
| `/onboarding` | ✅ | ❌ | ✅ | RequireAuth |
| `/staff-onboarding` | ❌ | ✅ | ✅ | RequireAuth |
| `/book/:slug` | — | — | — | Pública |
| `/queue/:slug` | — | — | — | Pública |
| `/minha-area/:slug` | — | — | — | Pública |
| `/pro/:slug` | — | — | — | Pública |

### Dados (Backend / RLS)

| Recurso | Owner | Staff | Regra |
|---------|:-----:|:-----:|-------|
| `appointments` (ler) | Todos da empresa | Apenas atribuídos a si | `user_id = company_id` ou `professional_id = teamMemberId` |
| `appointments` (criar/editar) | ✅ | ✅ (restrito) | `user_id = auth.uid()` |
| `clients` | Todos da empresa | Todos da empresa | `user_id = company_id` |
| `finance_records` | Todos | Apenas próprios | `user_id = company_id` (staff filtra no frontend) |
| `services` | ✅ | ✅ (ver apenas) | `user_id = company_id` |
| `team_members` | ✅ | ❌ (ver apenas) | `user_id = company_id` |
| `business_settings` | ✅ | ❌ | `user_id = auth.uid()` |
| `profiles` | Próprio | Próprio | `id = auth.uid()` |
| `queue_entries` | ✅ | ❌ | `business_id = auth.uid()` |
| `public_bookings` | ✅ | ❌ | `business_id = auth.uid()` |
| `audit_logs` | ❌ | ❌ | Dev apenas (via RLS?) |
| `system_errors` | ❌ | ❌ | Dev apenas |
| `goal_settings` | Próprio | Próprio | `user_id = auth.uid()` |

---

## Regras de Herança

| # | Regra | Confiança |
|---|-------|-----------|
| 1 | Staff herda `subscription_status`, `trial_ends_at`, `user_type`, `business_name` do owner. | 🟢 |
| 2 | Staff herda `company_id` do owner (`profiles.company_id`). | 🟢 |
| 3 | Staff acessa dados da empresa usando `effectiveUserId = companyId ?? user.id`. | 🟢 |
| 4 | Staff filtra agendamentos por `professional_id = teamMemberId` (não por `user_id`). | 🟢 |
| 5 | Owner vê dados de todos os profissionais da empresa. | 🟢 |

---

## Componentes de Guarda

### OwnerRouteGuard
```
IF authenticated AND role === 'owner' → permitir
ELSE IF role === 'staff' → redirecionar para '/' com toast "Acesso restrito ao dono da barbearia"
ELSE → redirecionar para /login
```

### DevRouteGuard
```
IF authenticated AND isDev === true → permitir
ELSE → redirecionar para /configuracoes
```

### ProtectedLayout
```
IF NOT authenticated → /login
IF NOT tutorial_completed AND role === 'staff' → /staff-onboarding
IF NOT tutorial_completed → /onboarding
ELSE → renderizar Layout com Sidebar
```

---

## Restrições por Papel

### Staff não pode:
- Acessar `/financeiro`, `/marketing`, `/insights`, `/fila`
- Acessar configurações (exceto `/configuracoes/servicos`)
- Cancelar agendamentos já finalizados (D-07)
- Ver comissões de outros profissionais
- Ver dados de assinatura (herda do owner)

### Staff pode:
- Ver agenda própria (`/agenda` filtrada)
- Ver clientes da empresa
- Marcar atendimentos como concluídos (1 toque)
- Ver "Meus Insights" (`/meus-insights`)
- Criar agendamentos (com restrições)

### Dev pode:
- Acessar todas as rotas
- Alternar `user_type` via localStorage
- Ver auditoria, lixeira e logs de erro
- Acessar configurações de desenvolvimento

---

## Lacunas de Permissão 🔴

| # | Lacuna | Risco |
|---|--------|-------|
| L1 | Não há verificação de permissão no nível de API para algumas ações (ex: staff poderia teoricamente chamar RPCs sem filtro no backend). | Médio |
| L2 | `isDev` é determinado por email hardcoded — não é escalável nem seguro para múltiplos desenvolvedores. | Baixo |
| L3 | Não há role intermediária (ex: "manager" com acesso a financeiro mas não a configurações). | Baixo |
| L4 | RLS de `audit_logs` e `system_errors` não foi verificada diretamente no código (presumida como dev-only). | Médio |

---

*Fim do documento de permissões.*
