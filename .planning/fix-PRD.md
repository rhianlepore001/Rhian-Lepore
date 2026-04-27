Aqui está o conteúdo completo do PRD:

---

# PRD — AGENX UI Revamp & Finance Insights

## Context
Sessão de revisão visual iniciada pelo owner do produto. Objetivo: elevar a qualidade do UI/UX em mobile (barbeiro usa celular), corrigir inconsistências de design system, eliminar redundâncias, e adicionar uma seção de insights financeiros. Duas mudanças já foram implementadas e commitadas nessa sessão.

---

## Status dos Itens

### ✅ JÁ IMPLEMENTADOS

#### ✅ A — Settings background semi-transparente
**Arquivo:** `components/SettingsLayout.tsx`
**O que foi feito:** Container raiz mudou de `bg-neutral-950` / `bg-beauty-dark` sólidos para `bg-black/50` / `bg-beauty-dark/50`. Sidebar de `/95` para `/80`. Mobile header de sólido para `/75`.
**Por quê:** O `BrutalBackground` (arte decorativa fixa, z-index 0) estava sendo completamente coberto pelo container sólido das configurações. Agora o background art vaza sutilmente entre os cards em todas as 11 seções.

#### ✅ B — Bug fix: CheckoutModal fallback resiliente
**Arquivo:** `components/CheckoutModal.tsx`
**O que foi feito:** Adicionado fallback na função `handleConfirm`. Se o UPDATE completo falhar com erro de coluna ausente (code `42703`), tenta UPDATE mínimo com apenas `payment_method` e `price`.
**Por quê:** A migration `20260413_checkout_fields.sql` que adiciona `received_by`, `machine_fee_applied` e `machine_fee_percent` à tabela `appointments` não foi aplicada em produção. O UPDATE falhava silenciosamente com "Erro ao concluir atendimento".

---

## 🔴 PENDENTES — Por ordem de prioridade

### 1 — TabNav: Segmented Control (todas as páginas)
**Arquivo principal:** `pages/Finance.tsx` linhas 498–533. Mesmo padrão está em outras páginas.
**Problema:** Botões com `bg-neutral-800` quadrados, `font-mono uppercase`, zero border-radius — aspecto "anos 90".
**Implementação:**
- Criar componente reutilizável `components/TabNav.tsx`
- Props: `tabs: {id, label, icon}[]`, `activeTab`, `onChange`
- Container: `bg-neutral-900/60 rounded-full p-1` (segmented control)
- Ativo: `${accentBg} text-black rounded-full px-4 py-1.5 transition-all duration-200`
- Inativo: `text-neutral-400 hover:text-white hover:bg-white/5 rounded-full px-4 py-1.5`
- Ícones: `w-3.5 h-3.5`
- Aplicar em: Finance.tsx (tabs visão geral/histórico/comissões)

### 2 — Modal Agendamento: Cards de Serviço + Step Indicator
**Arquivo:** `components/appointment/ServiceList.tsx`, `components/AppointmentWizard.tsx`
**Problema:** Cards inativos `bg-brutal-card border-black` = preto sobre preto. Headers de categoria soltos. Step indicator "Passo 2/4" é só texto.
**Implementação:**
- **Cards inativos:** `bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:border-white/20`
- **Cards selecionados:** manter tratamento atual ✓
- **Headers de categoria:** adicionar `border-l-2 border-accent-gold/50 pl-3`
- **Step indicator:** 4 círculos conectados por linha fina. Preenchido = concluído, ring = atual, neutro = futuro

### 3 — Modal Detalhes do Agendamento
**Arquivo:** `pages/Agenda.tsx` linhas 1693–1849
**Problema:** Header `bg-white text-black` fragmenta o modal dark. Badge sem semântica. Hierarquia de botões invertida.
**Implementação:**
- **Header:** remover `bg-white`, usar `border-b border-white/10`
- **Badge status pill semântico:** Confirmado=gold, Concluído=green, Cancelado=red
- **Avatar:** `ring-2 ring-accent-gold/40`
- **Telefone:** inline com ícone, sem tag background
- **Botões:** Cancelar (ghost red) esquerda | Editar (dark) + Fechar (gold primário) direita

### 4 — Agenda Header: Botões Responsivos
**Arquivo:** `pages/Agenda.tsx` linhas 1119–1148
**Problema:** 3 botões com labels longos causam scroll horizontal em mobile.
**Implementação:** Labels ocultos no mobile via `hidden md:inline`. "Novo Agendamento" oculto em mobile (FAB cobre).

### 5 — Settings Mobile Nav: Gradient Fade
**Arquivo:** `components/SettingsLayout.tsx` linhas 123–147
**Problema:** 11 abas sem indicador visual de mais itens.
**Implementação:** Gradiente fade na borda direita + pílulas inativas de `opacity-60` para `opacity-80`

### 6 — FinancialSettings: Mover Toggle + Limpar Espaço
**Arquivos:** `pages/settings/FinancialSettings.tsx`, `pages/settings/CommissionsSettings.tsx`
**Implementação:** Commitar remoção dos campos % (já feita localmente). Mover card "Taxa de Maquininha" para CommissionsSettings. FinancialSettings redireciona para Comissões.

### 7 — Auditoria/Erros/Lixeira: Acesso Restrito Dev
**Arquivo:** `components/SettingsLayout.tsx`, `App.tsx`
**Implementação:**
```ts
const DEV_EMAIL = 'rleporesilva@gmail.com';
const isDevAccount = user?.email === DEV_EMAIL;
const DEV_ONLY_PATHS = ['/configuracoes/auditoria', '/configuracoes/erros', '/configuracoes/lixeira'];
```
Filtrar do menu + proteger rotas no App.tsx

### 8 — Finance Métricas: Remover "Comissões Pendentes"
**Arquivo:** `pages/Finance.tsx`
**Implementação:** Remover card `commissionsPending`. Grid `grid-cols-1 md:grid-cols-3`.

### 9 — Modal Edição Agendamento: Layout Responsivo
**Implementação:** `grid grid-cols-2` → `grid grid-cols-1 sm:grid-cols-2` nos campos Data/Horário e Preço/Desconto

### 10 — Formulário Cadastro Cliente: Design System
**Problema:** Inputs preto puro, file input nativo, botões NOVO/RECENTE/ANTIGO fora do padrão.
**Implementação:** Inputs padronizados, file input customizado com BrutalButton, botões com TabNav

### 11 — Finance: Remover "Clientes para Recuperar"
**Arquivo:** `pages/Finance.tsx`
**Implementação:** Remover import ChurnRadar + hook useAIOSDiagnostic + bloco JSX

### 12 — Finance Insights: Nova Aba com Gráficos
**Arquivo:** `pages/Finance.tsx` + novo `components/FinanceInsights.tsx`
**Zero novas queries** — reutiliza `monthlyHistory`, `summary.revenueByMethod`, `transactions`
**Seções:**
- [A] KPI Strip: Receita | Despesas | Lucro + % delta vs mês anterior
- [B] Breakdown por forma de pagamento com % do total
- [C] Top 5 Serviços por Receita — PieChart donut (recharts)
- [D] Visão Anual — BarChart 12 meses + Melhor/Pior Mês + Ganho Médio + toggle despesas

---

## Arquivos Críticos

| Arquivo | Itens |
|---|---|
| `components/TabNav.tsx` | NOVO — item 1 |
| `pages/Finance.tsx` | Itens 1, 8, 11, 12 |
| `components/FinanceInsights.tsx` | NOVO — item 12 |
| `components/appointment/ServiceList.tsx` | Item 2 |
| `components/AppointmentWizard.tsx` | Item 2 |
| `pages/Agenda.tsx` | Itens 3, 4, 9 |
| `components/SettingsLayout.tsx` | Itens 5, 7 |
| `pages/settings/FinancialSettings.tsx` | Item 6 |
| `pages/settings/CommissionsSettings.tsx` | Item 6 |
| `App.tsx` | Item 7 |

## Verificação Pós-Implementação
1. Mobile Chrome: Finance, Agenda, Settings — zero scroll horizontal
2. TabNav em todas as páginas afetadas
3. Modal detalhes: header dark + hierarquia botões
4. `/configuracoes/auditoria` com conta non-dev → redireciona
5. Finance Insights com dados reais — gráficos renderizando
6. Remoção de "Clientes para Recuperar" e "Comissões Pendentes"
7. Checkout de agendamento → sem erro de banco