# Findings — Heurística UX

Auditor: ui-heuristic-auditor | Register: Impeccable `product`  
Escopo: UISurfaceMap + código | Browser: não inspecionado nesta rodada

---

### CRÍTICO-001: Dashboard owner sem hierarquia de ação primária
- **Severidade:** CRÍTICO
- **Evidência:** `pages/Dashboard.tsx:257-268` — SetupCopilot, alerts, commission banner, unfinished banner, KPI grid e MeuDia competem na mesma dobra
- **Problema:** Dono mobile-first não sabe onde olhar primeiro — tudo tem peso visual similar (cards, badges, uppercase labels)
- **Impacto:** Entre atendimentos, perde-se o "de relance" prometido no PRD; confiança cai vs. apps como Fresha/Linear
- **Fix:** Definir 1 hero action por viewport (ex.: faturamento hoje + CTA "Ver agenda") e rebaixar widgets secundários para accordion ou segunda dobra
- **Esforço:** Médio

### ALTO-002: Navegação mobile duplicada e inconsistente com desktop
- **Severidade:** ALTO
- **Evidência:** `components/BottomMobileNav.tsx` (5 itens) vs `components/Sidebar.tsx` + `constants` NAVIGATION_ITEMS (mais rotas); settings só via "Mais"
- **Problema:** IA de navegação diferente por breakpoint — Financeiro no bottom nav, Marketing/Produtos/Fila enterrados no drawer
- **Impacto:** Dono não encontra fila ou produtos em <3 toques no celular
- **Fix:** Mapear tarefas primárias (PRD) → ordem fixa no bottom nav; drawer só para secundários
- **Esforço:** Médio

### ALTO-003: Settings é ilha visual separada do app
- **Severidade:** ALTO
- **Evidência:** `components/Layout.tsx:44` — sidebar oculta em `/configuracoes`; `components/SettingsLayout.tsx` shell próprio
- **Problema:** Usuário perde contexto espacial ao entrar em configurações — parece outro produto
- **Impacto:** Abandono ao configurar serviços/equipe; sensação de app "montado"
- **Fix:** Manter header/branding consistente; sub-nav settings dentro do mesmo vocabulário visual do shell principal
- **Esforço:** Médio

### MÉDIO-004: Dashboard KPI grid genérico — todas métricas parecem iguais
- **Severidade:** MÉDIO
- **Evidência:** `pages/Dashboard.tsx:60-104` — `PremiumKpiCard` repetido com sparkline + trend badge idêntico
- **Problema:** Viola estética minimal (Nielsen) — ruído visual sem priorização semântica
- **Impacto:** Métricas importantes (lucro vs. agendamentos) não se distinguem
- **Fix:** 1 KPI hero grande + 2-3 secundários compactos; remover sparklines decorativas onde não agregam decisão
- **Esforço:** Baixo

### MÉDIO-005: Link quebrado no banner de comissões
- **Severidade:** MÉDIO
- **Evidência:** `pages/Dashboard.tsx:225` — `navigate('/finance')` mas rota real é `/financeiro` (`App.tsx:183`)
- **Problema:** CTA de fluxo crítico leva ao fallback (dashboard)
- **Impacto:** Dono no dia de pagamento não chega à tela certa — perda de confiança imediata
- **Fix:** Corrigir para `/financeiro` ou `/configuracoes/comissoes`
- **Esforço:** Baixo

### MÉDIO-006: Onboarding e app principal com fluxos cognitivos desconectados
- **Severidade:** MÉDIO
- **Evidência:** `App.tsx:155-173` — onboarding fora do ProtectedLayout; wizard vs onboarding vs staff-onboarding (3 rotas)
- **Problema:** Usuário novo passa por UIs diferentes antes de ver o dashboard unificado
- **Impacto:** Curva de aprendizado alta para persona não-técnica
- **Fix:** Unificar shell visual do onboarding com dashboard preview; reduzir rotas de setup
- **Esforço:** Alto

### BAIXO-007: Staff dashboard simplificado demais vs. owner
- **Severidade:** BAIXO
- **Evidência:** `pages/Dashboard.tsx:250-254` — staff vê só MeuDia + StaffEarningsCard
- **Problema:** OK para foco, mas falta breadcrumb/contexto ("Seus atendimentos hoje")
- **Impacto:** Staff pode não perceber valor do produto além da agenda
- **Fix:** Header contextual staff com data + contagem do dia
- **Esforço:** Baixo
