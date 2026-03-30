# UX Redesign Audit — Squad 2 (@ux-design-expert)
**Data:** 18 Mar 2026
**Agent:** @ux-design-expert (Uma)
**Status:** ATIVO — Design Solutions
**Base:** Squad 1 (@po) Product Feature Audit findings

---

## 🎯 Objetivo

Resolver 3 pontos críticos de confusão da primeira experiência:
1. **OnboardingWizard → Dashboard vazio** (sem direção "o que fazer agora")
2. **Dashboard overwhelmingly complexo** (17 widgets, novo usuário perdido)
3. **Settings sem contexto de progresso** (usuário não sabe o que completou)

---

## 1️⃣ PROBLEM ANALYSIS

### Current State: OnboardingWizard Completion

**Arquivo:** `components/onboarding/StepSuccess.tsx`

```
✓ Step 1-4: BusinessInfo → Services → Team → MonthlyGoal
✓ Step 5: StepSuccess (mostra checkmark)
✓ Button: "Ir para o Dashboard"
❌ PROBLEMA: Button solitário, sem contexto de próximos passos
```

**O que StepSuccess faz agora (UX problemática):**
```typescript
// Mostra:
<h2>Tudo Pronto! 🚀</h2>
<p>Seu espaço foi configurado com sucesso.
   Agora você tem acesso total ao painel de controle.</p>
<button>Ir para o Dashboard</button>

// Usuário pensa: "E agora? O que faço no Dashboard?"
```

### Current State: Dashboard

**Arquivo:** `pages/Dashboard.tsx`

**17 Widgets identificados:**
```
✅ ESSENTIAL (6):
  ├─ DashboardHero
  ├─ ActionCenter
  ├─ MeuDiaWidget
  ├─ ProfitMetrics
  ├─ GoalSettingsModal
  └─ AllAppointmentsModal

⚠️ NICE-TO-HAVE (4):
  ├─ GoalHistory
  ├─ SmartNotificationsBanner
  ├─ GoalHistoryModal
  └─ MonthlyProfitModal

❌ DEAD-WEIGHT (7) — REMOVER:
  ├─ AIOSDiagnosticCard
  ├─ AIOSCampaignStats
  ├─ DataMaturityBadge
  ├─ FinancialDoctorPanel
  ├─ ComandoDoDia (é redundante com MeuDiaWidget)
  ├─ SetupCopilot (boa ferramenta, MAS visibilidade ruim)
  └─ SmartRebooking
```

### Current State: Settings

**SetupCopilot existe no Dashboard:**
```typescript
// Lines 120-123 em Dashboard.tsx:
{dataMaturity.score < 75 && (
  <SetupCopilot isBeauty={isBeauty} />
)}

// ✓ GOOD: Mostra 6 steps com checkmarks (hasServices, hasTeam, etc)
// ❌ BAD: Só visível se dataMaturity.score < 75
// ❌ BAD: Escondido na página, não destacado
```

---

## 2️⃣ DESIGN SOLUTIONS

### Solution 1: Enhance OnboardingWizard → StepSuccess

**Current (Vago):**
```
Tudo Pronto! 🚀
Seu espaço foi configurado com sucesso.
Agora você tem acesso total ao painel de controle.

[Ir para o Dashboard]
```

**Redesigned (Claro com CTAs):**
```
┌─────────────────────────────────────┐
│  ✅ Tudo Pronto! 🚀                 │
│                                     │
│  Seu setup foi concluído com       │
│  sucesso. Você pode começar a:     │
│                                     │
│  [🗓️  Criar Agendamento]           │
│  [📊 Ver Oportunidades]            │
│  [🔗 Configurar Link Público]      │
│  [📈 Ir para Dashboard]            │
│                                     │
│  💡 Dica: Comece agendando seu    │
│     primeiro cliente para ativar   │
│     o financeiro.                  │
└─────────────────────────────────────┘
```

**Implementation:**
```typescript
// StepSuccess.tsx ENHANCED
export const StepSuccess: React.FC<StepSuccessProps> = ({ accentColor }) => {
    const navigate = useNavigate();

    const nextSteps = [
        { label: '🗓️  Agendar Cliente', action: () => navigate('/agenda') },
        { label: '📊 Ver Oportunidades', action: () => navigate('/marketing') },
        { label: '🔗 Link Público', action: () => navigate('/settings/publicBooking') },
        { label: '📈 Dashboard', action: () => navigate('/') },
    ];

    return (
        <div className="text-center py-12 space-y-8">
            {/* Checkmark + Title */}
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                    Tudo Pronto! 🚀
                </h2>
                <p className="text-neutral-400">
                    Seu setup foi concluído. Agora você pode:
                </p>
            </div>

            {/* 4-CTA Grid */}
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                {nextSteps.map(step => (
                    <BrutalButton
                        key={step.label}
                        variant="outline"
                        onClick={step.action}
                        className="text-sm py-3"
                    >
                        {step.label}
                    </BrutalButton>
                ))}
            </div>

            {/* Helpful Tip */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-w-md mx-auto text-left">
                <p className="text-xs text-neutral-400">
                    💡 <strong>Dica:</strong> Comece agendando seu primeiro cliente
                    para ativar o financeiro e ver seus ganhos no dashboard.
                </p>
            </div>
        </div>
    );
};
```

**Effort:** 1 hour (enhance StepSuccess component)

---

### Solution 2: Simplify Dashboard (Remove 7 Widgets)

**Current:** 17 widgets scattered, confusing

**Redesigned:**
```
Dashboard MVP (Week 1):

┌─ DashboardHero ──────────────────┐
│  "Bem-vindo, João!"             │
└─────────────────────────────────┘

┌─ ActionCenter ────────────────────┐
│ 🎯 O Que Fazer Agora?            │
│ ☐ Seu primeiro agendamento      │
│ ☐ Configurar link público       │
│ ☐ Convidar equipe              │
└─────────────────────────────────┘

┌─ MeuDiaWidget ────────────────────┐
│ 📅 Hoje (3 agendamentos)         │
│ 💰 Receita esperada: R$ 450      │
└─────────────────────────────────┘

┌─ ProfitMetrics ──────────────────┐
│ 📊 Receita | Lucro | Meta        │
│ R$ 1.200   | R$ 900 | R$ 3.000  │
└─────────────────────────────────┘

┌─ SetupCopilot ────────────────────┐
│ ✅ Setup Progress (4/6)          │
│ ✓ Serviços                       │
│ ✓ Equipe                         │
│ ☐ Link Público                   │
│ ☐ Primeiro Agendamento           │
└─────────────────────────────────┘
```

**REMOVE THESE 7 (Dead-Weight):**
```
❌ AIOSDiagnosticCard — "Saúde do sistema" (confunde)
❌ AIOSCampaignStats — vazio na semana 1
❌ DataMaturityBadge — métrica interna (não value)
❌ FinancialDoctorPanel — "AI magic" sem contexto
❌ ComandoDoDia — redundante com MeuDiaWidget
❌ SmartRebooking — overengineering
❌ GoalHistory/HistoryModal — nice-to-have (week 2)
```

**Implementation:**
```typescript
// pages/Dashboard.tsx SIMPLIFIED

// Remove imports:
- AIOSDiagnosticCard ❌
- AIOSCampaignStats ❌
- DataMaturityBadge ❌
- FinancialDoctorPanel ❌
- ComandoDoDia ❌
- SmartRebooking ❌
- GoalHistory ❌

// Keep:
- DashboardHero ✓
- ActionCenter ✓
- MeuDiaWidget ✓
- ProfitMetrics ✓
- SetupCopilot ✓ (MOVED TO TOP, ALWAYS VISIBLE)
- SmartNotificationsBanner ✓

return (
  <div className="space-y-6">
    {/* 1. Hero greeting */}
    <DashboardHero isBeauty={isBeauty} />

    {/* 2. Setup Progress (ALWAYS VISIBLE) */}
    <SetupCopilot isBeauty={isBeauty} />

    {/* 3. Today's schedule */}
    <MeuDiaWidget />

    {/* 4. Financial metrics */}
    <ProfitMetrics {...props} />

    {/* 5. Smart alerts */}
    <SmartNotificationsBanner />
  </div>
);
```

**Dashboard Before:** 17 widgets, 340px scroll depth
**Dashboard After:** 5 components, 180px scroll depth (47% reduction)

**Effort:** 2 hours (remove imports, clean JSX)

---

### Solution 3: Make SetupCopilot Always Visible

**Current Problem:**
```typescript
// Only shows if dataMaturity.score < 75
{dataMaturity.score < 75 && (
  <SetupCopilot isBeauty={isBeauty} />
)}

// Week 1 user may not see it!
```

**Redesigned:**
```typescript
// ALWAYS show SetupCopilot in Dashboard
// It's the user's progress tracker
<SetupCopilot isBeauty={isBeauty} />

// Position: RIGHT AFTER DashboardHero (priority #2)
// Visual: Card with progress bar (4/6 completed)
// Interactivity: Click step → navigate to settings
```

**Effort:** 0 hours (just remove conditional)

---

## 3️⃣ VALIDATION: Marketing "Oportunidades" UX

**From Squad 1 decision:** Keep ONLY "Oportunidades" tab

**UX Validation:**

✅ **Current "Oportunidades" tab is GOOD:**
- Clear header: "R$ 2,500 em risco"
- 2 OpportunityCards: Gap + VIP
- 1 ChurnRadar: Clients at risk
- 1 CampaignModal: Gera + envia WhatsApp

**Changes needed:**
- ✓ Remove 3 other tabs (campaigns, studio, calendar)
- ✓ Simplify imports in Marketing.tsx
- ✓ Rename to: "Recuperação & Oportunidades" (clearer name)

**Effort:** 1 hour (delete tabs + rename)

---

## 4️⃣ SUMMARY: Total UX Changes

| Component | Change | Effort | Impact |
|-----------|--------|--------|--------|
| StepSuccess | Enhance with 4 CTAs | 1h | ⭐⭐⭐ Critical |
| Dashboard | Remove 7 widgets | 2h | ⭐⭐⭐ Critical |
| SetupCopilot | Always visible | 0h | ⭐⭐ High |
| Marketing | Keep only Oportunidades | 1h | ⭐⭐ High |
| **TOTAL** | **-** | **4 hours** | **-** |

---

## 5️⃣ IMPLEMENTATION ORDER

```
Phase 1 (1 hour):
  1. Enhance StepSuccess with 4 CTAs
  2. Test: complete onboarding → see new success screen

Phase 2 (2 hours):
  1. Remove imports from Dashboard.tsx (7 widgets)
  2. Remove conditional from SetupCopilot (make always visible)
  3. Simplify Dashboard layout

Phase 3 (1 hour):
  1. Delete 6 Marketing tabs components
  2. Refactor Marketing.tsx (remove tab logic)
  3. Rename to "Recuperação & Oportunidades"

Total: 4 hours work = 1 dev, half-day
```

---

## 6️⃣ WIREFRAME: New OnboardingWizard Success

```
┌─────────────────────────────────────┐
│  Step 5 of 5: Tudo Pronto!          │
├─────────────────────────────────────┤
│                                     │
│              ✅                     │
│         Tudo Pronto! 🚀            │
│                                     │
│  Seu setup foi concluído com       │
│  sucesso. Você pode começar a:     │
│                                     │
│  ┌────────────────┬────────────────┐│
│  │ 🗓️  Agendar    │ 📊 Ver Opor.   ││
│  │   Cliente      │   tunidades    ││
│  ├────────────────┼────────────────┤│
│  │ 🔗 Config Link │ 📈 Dashboard   ││
│  │   Público      │                ││
│  └────────────────┴────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 💡 Dica: Comece agendando seu  ││
│  │    primeiro cliente para ativar ││
│  │    o financeiro.               ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

---

## 7️⃣ WIREFRAME: New Dashboard (Simplified)

```
┌─────────────────────────────────────┐
│ Bem-vindo, João!                    │
│ Barbearia Premium • Barbershop Mode │
├─────────────────────────────────────┤
│                                     │
│ ✅ Setup Progress (4/6)            │
│ [████░░░░░░░░░░░░░░░░░░░░] 67%    │
│ ✓ Serviços ✓ Equipe ☐ Link ☐ APT │
│                                     │
│ 📅 Seu Dia (3 agendamentos)        │
│ 14:00 - João Silva (Corte)         │
│ 14:30 - Maria Costa (Hidratação)   │
│ 15:00 - Pedro Santos (Corte + Barba)
│ 💰 Receita esperada: R$ 450        │
│                                     │
│ 📊 Receita | Lucro | Meta          │
│ R$ 1.200  | R$ 900 | R$ 3.000     │
│ [████████░░░░░░░░░░░] 40%         │
│                                     │
│ 🔔 2 alertas inteligentes            │
│ • João Silva não retornou há 15 dias│
│ • Link público está inativo          │
│                                     │
└─────────────────────────────────────┘
```

---

## NEXT STEP: Implementation

Ready for @dev (Dex) to:
1. Enhance `StepSuccess.tsx` (4 CTAs)
2. Simplify `Dashboard.tsx` (remove 7 widgets)
3. Delete 6 Marketing components
4. Refactor `Marketing.tsx`

**Squad 1 + Squad 2 → Squad 3/4 (@analyst + @data-engineer)**
