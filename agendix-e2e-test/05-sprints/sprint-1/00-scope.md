# Sprint 1 — P0 + Quick Wins + Regras de Domínio

**Sprint criada em**: 2026-07-06
**Status**: em andamento
**Origem**: `04-bugs-e-achados/consolidado.md` (auditoria 360° de 2026-07-05)

---

## 🎯 Objetivo da sprint

Fechar todos os P0 abertos (4), as regras de domínio bloqueantes (R-05, R-06) e os quick wins de defesa em profundidade — deixando o produto sem bloqueadores de confiança, conversão e ativação.

---

## ✅ Critérios de aceite da sprint (DoD)

- [ ] Todos os P0 listados corrigidos e verificados
- [ ] Nenhum P0 novo introduzido pelas correções
- [ ] Multi-tenant: nenhuma query nova sem `company_id`
- [ ] Typecheck, lint, test, build passando

---

## 📦 Tasks

### TASK-101: RPC transacional para deleção de transação financeira (P0-03/C5)
- **Origem**: relatorio-03-fluxo P0-03 | **Estimativa**: M
- **DoD**: migration com RPC `delete_finance_transaction` SECURITY DEFINER atômica (finance_record + appointment na mesma transação, validando tenant); `services/finance.ts` chama a RPC em vez dos 2 deletes; sem regressão em Finance.
- **Como testar**: deletar transação com appointment vinculado; ambos somem ou nenhum some.

### TASK-102: OwnerRouteGuard em /configuracoes/servicos (P0-04)
- **Origem**: relatorio-03-fluxo P0-04 | **Estimativa**: XS
- **DoD**: `App.tsx` envolve `<ServiceSettings/>` com `<OwnerRouteGuard>`; staff navegando direto é redirecionado.

### TASK-103: Eliminar interpolação dinâmica Tailwind (P0-DS01/P0-UI01/C6)
- **Origem**: relatorio-04 P0-DS01 + relatorio-01 P0-UI01 | **Estimativa**: S
- **DoD**: `ProfessionalPortfolio`, `SearchableSelect`, `ProfessionalSelector`, `MonthYearSelector`, `BusinessGalleryManager`, `UpsellSection` sem classes interpoladas; página pública `/#/book/:slug` renderiza com accent no build de produção.
- **Como testar**: `npm run build` + inspecionar CSS gerado.

### TASK-104: alert() nativo → showToast (P0-C01/C1 + P1-C01)
- **Origem**: relatorio-02 P0-C01/P1-C01 | **Estimativa**: S
- **DoD**: `ClientCRM.tsx` e `Clients.tsx` sem `alert()`; erros genéricos amigáveis via toast; `error.message` só no Logger; sucessos via `showToast(...,'success')`.

### TASK-105: Toast de rejeição com tipo correto (P1-C02)
- **Origem**: relatorio-02 P1-C02 | **Estimativa**: XS
- **DoD**: `Agenda.tsx` — "Solicitação recusada." com tipo `'info'`, não `'success'`.

### TASK-106: Filtro is_owner nas comissões (R-05)
- **Origem**: relatorio-06 R-05 | **Estimativa**: S
- **DoD**: `get_commissions_due` retorna `is_owner` (migration) OU client filtra por dado real de `team_members`; dono com `commission_rate > 0` não aparece nas comissões devidas.

### TASK-107: Constraint do onboarding 1→6 (R-06)
- **Origem**: relatorio-06 R-06 | **Estimativa**: S
- **DoD**: constraint `CHECK (current_step BETWEEN 1 AND 6)` (migration) OU passo 6 não persiste; clamp em `services/onboarding.ts` ajustado; wizard chega ao StepSuccess sem erro.

### TASK-108: Defesa em profundidade em appointments (P1-01 quick win)
- **Origem**: relatorio-03 P1-01 | **Estimativa**: XS
- **DoD**: `cancelAppointment` e `assignAppointmentProfessional` com `.eq('user_id', companyId)`.

### TASK-109: Quick wins visuais (P1-UI04, P1-UI03, P2-UI08)
- **Origem**: relatorio-01 | **Estimativa**: S
- **DoD**: botão "ASSINAR AGORA" com accent (não `bg-black`); banner de trial dismissible ou restrito ao dashboard; copy "14 dias" alinhada com config real (10 dias).

---

## 🚫 Fora do escopo

- Migração completa `isBeauty` → tokens (Sprint 3+)
- R-09 (FK companies) — precisa validação no banco vivo antes de mexer
- Consolidação BrutalCard/Button (Sprint 3+)

## ⚠️ Riscos

- RPC nova de finance → migration só adiciona, não altera dados existentes
- Constraint do onboarding → validar que não há rows com step > 6

## 📊 Métricas de saída

- P0 entregues: _/4 · P1 quick wins: _/5 · Regressões: _
