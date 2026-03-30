# 🔧 QA FIX REQUEST — EPIC-004 Stories 406-410

**Solicitado por:** @qa (Quinn)
**Data:** 2026-03-30
**Prioridade:** BLOCKER (P1) + HIGH (P2)
**Esforço Estimado:** 4-5h

---

## 📌 Resumo Executivo

Durante a revisão QA das stories US-0406 até US-0410 (completadas em antigravity), foram identificadas **8 issues** que bloqueiam o merge:

- **3 BLOCKERS (P1)** — Impede QA gate passar
- **3 HIGH (P2)** — Funcionalidade incompleta
- **2 OPTIONAL (P3)** — Melhorias

**Status Atual:**
- ✅ US-0406 (SetupCopilot guided mode): **PASS** → Pronto
- ✅ US-0407 (Retomada de sessão): **PASS** → Pronto
- 🚨 US-0408 (Completion detection): **FAIL** → 3 event dispatchers faltando
- 🚨 US-0409 (Activation Event): **FAIL** → 3 funcionalidades bloqueadas
- 🟡 US-0410 (Animações): **CONCERNS** → 3 ACs incompletos

---

## 🚨 BLOCKER Issues (US-0408: Completion Detection)

### Issue #1: ServiceSettings.tsx NÃO dispara event 'services'

**Arquivo:** `pages/settings/ServiceSettings.tsx`
**Problema:** Após salvar/criar um serviço, o evento `setup-step-completed` não é disparado, bloqueando a animação de sucesso no WizardPointer.

**AC Bloqueado:** US-0408 AC1

**Solução:**

Localizar a função `handleSaveService()` ou equivalent e adicionar o dispatcher após sucesso:

```typescript
// pages/settings/ServiceSettings.tsx

// Encontre esta função (aproximadamente na seção onde salva o serviço):
const handleSaveService = async (serviceData: any) => {
    if (!user) return;
    try {
        // ... seu código de salvar em Supabase ...

        await supabase.from('services').insert({
            user_id: user.id,
            name: serviceData.name,
            price: serviceData.price,
            // ... outros campos ...
        });

        // ✅ ADICIONE ESTA LINHA:
        window.dispatchEvent(new CustomEvent('setup-step-completed', {
            detail: { stepId: 'services' }
        }));

        fetchData(); // recarrega lista
    } catch (error) {
        console.error('Error saving service:', error);
        alert('Erro ao salvar serviço.');
    }
};
```

**Verificação:**
- [ ] Arquivo atualizado com `dispatchEvent`
- [ ] Event está **dentro** do try block (antes do erro)
- [ ] `stepId: 'services'` é exatamente este valor
- [ ] Testar: salvar um serviço → check aparece no WizardPointer

---

### Issue #2: TeamSettings.tsx NÃO dispara event 'team'

**Arquivo:** `pages/settings/TeamSettings.tsx`
**Problema:** Após adicionar um membro de equipe, o evento `setup-step-completed` não é disparado.

**AC Bloqueado:** US-0408 AC1

**Solução:**

Localizar o handler de salvar membro e adicionar:

```typescript
// pages/settings/TeamSettings.tsx

const handleSaveTeamMember = async (memberData: any) => {
    if (!user) return;
    try {
        // ... seu código de salvar membro ...

        await supabase.from('team_members').insert({
            user_id: user.id,
            name: memberData.name,
            // ... outros campos ...
        });

        // ✅ ADICIONE ESTA LINHA:
        window.dispatchEvent(new CustomEvent('setup-step-completed', {
            detail: { stepId: 'team' }
        }));

        fetchData(); // recarrega lista
    } catch (error) {
        console.error('Error saving team member:', error);
    }
};
```

**Verificação:**
- [ ] Arquivo atualizado com `dispatchEvent`
- [ ] Event está **dentro** do try block
- [ ] `stepId: 'team'` é exatamente este valor
- [ ] Testar: adicionar membro → check aparece

---

### Issue #3: Agenda.tsx NÃO dispara event 'appointment'

**Arquivo:** `pages/Agenda.tsx`
**Problema:** Após criar um agendamento, o evento `setup-step-completed` não é disparado. **Deve ser apenas no PRIMEIRO agendamento.**

**AC Bloqueado:** US-0408 AC1

**Solução:**

Encontre o handler de criação de agendamento (procure por `handleCreateAppointment` ou `handleSaveAppointment`):

```typescript
// pages/Agenda.tsx

const handleCreateAppointment = async (appointmentData: any) => {
    if (!user) return;
    try {
        // Antes de salvar, contar agendamentos existentes
        const { count: existingCount } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        // Salvar novo agendamento
        const { error } = await supabase.from('appointments').insert({
            user_id: user.id,
            client_id: appointmentData.client_id,
            // ... outros campos ...
        });

        if (error) throw error;

        // ✅ ADICIONE ISTO (apenas se for o PRIMEIRO):
        if ((existingCount ?? 0) === 0) {
            // É o primeiro agendamento!
            window.dispatchEvent(new CustomEvent('setup-step-completed', {
                detail: { stepId: 'appointment' }
            }));
        }

        setShowNewAppointmentModal(false);
        fetchAppointments(); // recarrega
    } catch (error) {
        console.error('Error creating appointment:', error);
    }
};
```

**Verificação:**
- [ ] Arquivo atualizado com lógica de "primeiro agendamento"
- [ ] Event disparado **apenas uma vez** (quando count === 0)
- [ ] `stepId: 'appointment'` é exatamente este valor
- [ ] Testar em conta nova: criar 1º agendamento → check aparece → criar 2º → nenhum check

---

## 🚨 BLOCKER Issues (US-0409: Activation Event)

### Issue #4: Agenda.tsx NÃO dispara event 'system-activated'

**Arquivo:** `pages/Agenda.tsx`
**Problema:** Quando o primeiro agendamento é criado, deve disparar `'system-activated'` para exibir a ActivationBanner de celebração.

**AC Bloqueado:** US-0409 AC1, AC3

**Solução:**

Na mesma função onde você adiciona `'setup-step-completed'` (Issue #3), também adicione:

```typescript
// pages/Agenda.tsx (na mesma função handleCreateAppointment)

if ((existingCount ?? 0) === 0) {
    // É o primeiro agendamento!

    // Disparar completion do step
    window.dispatchEvent(new CustomEvent('setup-step-completed', {
        detail: { stepId: 'appointment' }
    }));

    // ✅ ADICIONE TAMBÉM ISTO:
    // Disparar celebração de ativação (com delay para não conflitar)
    setTimeout(() => {
        window.dispatchEvent(new Event('system-activated'));
    }, 500);
}
```

**Verificação:**
- [ ] Ambos os eventos disparados
- [ ] `'system-activated'` tem delay de ~500ms
- [ ] Testar: criar 1º agendamento → check aparece → 500ms depois → ActivationBanner aparece

---

### Issue #5: SetupCopilot.tsx NÃO sincroniza ativação com evento

**Arquivo:** `components/dashboard/SetupCopilot.tsx`
**Problema:** Quando `allDone` se torna true (100% completo), deveria disparar `'system-activated'` event para ativar a celebração. Atualmente apenas atualiza o Supabase localmente.

**AC Bloqueado:** US-0409 AC3

**Solução:**

Localizar este useEffect (aproximadamente linha 171-176):

```typescript
// components/dashboard/SetupCopilot.tsx (ANTES)
useEffect(() => {
    if (allDone && user?.id && !checks.isActivated) {
        supabase.from('profiles').update({
            setup_completed: true,
            activation_completed: true,
            activated_at: new Date().toISOString()
        }).eq('id', user.id);
        setChecks(prev => ({ ...prev, isActivated: true }));
    }
}, [allDone, user?.id, checks.isActivated]);
```

**Refatorar para:**

```typescript
// components/dashboard/SetupCopilot.tsx (DEPOIS)
useEffect(() => {
    if (allDone && user?.id && !checks.isActivated) {
        // Atualizar Supabase
        supabase.from('profiles').update({
            setup_completed: true,
            activation_completed: true,
            activated_at: new Date().toISOString()
        }).eq('id', user.id);

        setChecks(prev => ({ ...prev, isActivated: true }));

        // ✅ ADICIONE ISTO:
        // Disparar celebração após 500ms para animação suave
        setTimeout(() => {
            window.dispatchEvent(new Event('system-activated'));
        }, 500);
    }
}, [allDone, user?.id, checks.isActivated]);
```

**Verificação:**
- [ ] Event disparado após `setChecks()`
- [ ] Delay de ~500ms para não conflitar com animações
- [ ] Testar: completar todos os steps → ActivationBanner aparece

---

### Issue #6: SetupCopilot.tsx FALTA lógica de 7 dias (OPTIONAL)

**Arquivo:** `components/dashboard/SetupCopilot.tsx`
**Problema:** AC8 de US-0409 exige que SetupCopilot desapareça automaticamente após 7 dias da ativação. Atualmente não há verificação de data.

**AC Bloqueado:** US-0409 AC8 (OPTIONAL)

**Solução:**

No useEffect que verifica o status (aproximadamente linha 50-112), adicione lógica de 7 dias:

```typescript
// components/dashboard/SetupCopilot.tsx (dentro do useEffect de checkSetupProgress)

const checkSetupProgress = async () => {
    if (!user) return;
    try {
        const status = await getSetupStatus(user.id);
        setChecks(status);

        if (companyId) {
            const progress = await getOnboardingProgress(companyId);
            const stepData = progress?.step_data ?? {};

            // ✅ ADICIONE ISTO:
            // Verificar se passou 7 dias desde ativação
            if (status.isActivated) {
                const activatedAt = new Date(profile?.activated_at ?? new Date());
                const sevenDaysAgo = new Date(activatedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

                if (new Date() > sevenDaysAgo) {
                    // Passou 7 dias — ocultar SetupCopilot
                    setDismissed(true);
                    return; // Sair cedo
                }
            }

            // ... resto do código ...
```

**Verificação:**
- [ ] Lógica calcula corretamente 7 dias
- [ ] SetupCopilot se oculta automaticamente após 7 dias
- [ ] Pode ser testado modificando `activated_at` no Supabase

---

## 🟡 HIGH Issues (US-0410: Animações)

### Issue #7: WizardPointer.tsx FALTA animação de entrada

**Arquivo:** `components/onboarding/WizardPointer.tsx`
**Problema:** AC1 exige fade-in + scale 0.8→1.0 em 200ms ease-out ao entrar, mas o componente não tem animação de entrada explícita.

**AC Bloqueado:** US-0410 AC1

**Solução:**

Encontre o render do WizardPointer e adicione className com animação:

```tsx
// components/onboarding/WizardPointer.tsx

// Procure pelo elemento raiz do pointer (provavelmente um div com style posicionado)
// Adicione className:

<div
    className="animate-in fade-in zoom-in-95 duration-200 ease-out"
    style={{
        // ... seus estilos de posicionamento ...
    }}
>
    {/* conteúdo do pointer */}
</div>
```

**Ou crie um keyframe customizado em `index.css`:**

```css
/* index.css */

@keyframes pointer-enter {
    from {
        opacity: 0;
        transform: scale(0.8);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.animate-pointer-enter {
    animation: pointer-enter 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

**Verificação:**
- [ ] Animação aparece ao ativar guided mode
- [ ] Duração é ~200ms
- [ ] Scale vai de 0.8 para 1.0
- [ ] Easing é ease-out

---

### Issue #8: App.tsx NÃO detecta low-end devices

**Arquivo:** `App.tsx`
**Problema:** AC6 exige detecção de dispositivos com CPU limitada (`navigator.hardwareConcurrency <= 4`) e aplicação de classe `low-end-device` para desativar animações.

**AC Bloqueado:** US-0410 AC6

**Solução:**

Adicione este useEffect no componente App (no topo, antes de retornar JSX):

```typescript
// App.tsx

export function App() {
    // ... outros hooks ...

    // ✅ ADICIONE ISTO:
    useEffect(() => {
        // Detectar dispositivos low-end
        const hardwareConcurrency = navigator.hardwareConcurrency ?? 4;

        if (hardwareConcurrency <= 4) {
            document.documentElement.classList.add('low-end-device');
        }
    }, []);

    return (
        // ... seu JSX ...
    );
}
```

**Depois, em `index.css`, adicione as regras:**

```css
/* index.css */

.low-end-device [class*="wizard-pointer-bounce"],
.low-end-device [class*="wizard-pulse"] {
    animation: none !important;
    opacity: 0.85;
}

.low-end-device .animate-check-complete {
    animation-duration: 100ms !important;
}
```

**Verificação:**
- [ ] Classe adicionada ao `<html>` em dispositivos com ≤4 CPUs
- [ ] Animações de bounce/pulse desativadas em low-end
- [ ] Duração de check-complete reduzida

---

### Issue #9: CSS FALTA `prefers-reduced-motion`

**Arquivo:** `index.css` (ou seu arquivo global de estilos Tailwind)
**Problema:** AC5 exige que quando `prefers-reduced-motion: reduce` está ativo, as animações de bounce/pulse sejam desativadas.

**AC Bloqueado:** US-0410 AC5

**Solução:**

Adicione em `index.css`:

```css
/* index.css */

@media (prefers-reduced-motion: reduce) {
    /* Desativar animações infinitas */
    [class*="wizard-pointer-bounce"],
    [class*="wizard-pulse"],
    .animate-bounce {
        animation: none !important;
        opacity: 0.9;
    }

    /* Reduzir duração de todas as transições */
    .animate-check-complete {
        animation-duration: 50ms !important;
    }

    .animate-in {
        animation-duration: 50ms !important;
    }

    /* Remover efeitos de movimento */
    .slide-in-from-top-4,
    .slide-in-from-bottom-4,
    .slide-in-from-top-2,
    .slide-in-from-bottom-6 {
        animation: none !important;
        opacity: 1;
    }
}
```

**Verificação:**
- [ ] CSS adicionado a arquivo global
- [ ] Testar em macOS: System Preferences → Accessibility → Display → Reduce motion
- [ ] Animações devem ser estáticas ou muito rápidas

---

## 📋 Checklist de Implementação

### Priority 1 (BLOCKER) — US-0408
- [ ] **Issue #1:** ServiceSettings.tsx dispara 'services'
- [ ] **Issue #2:** TeamSettings.tsx dispara 'team'
- [ ] **Issue #3:** Agenda.tsx dispara 'appointment' (primeiro apenas)

### Priority 2 (BLOCKER) — US-0409
- [ ] **Issue #4:** Agenda.tsx dispara 'system-activated'
- [ ] **Issue #5:** SetupCopilot sincroniza com evento
- [ ] **Issue #6:** SetupCopilot lógica de 7 dias (OPTIONAL)

### Priority 3 (HIGH) — US-0410
- [ ] **Issue #7:** WizardPointer animação de entrada
- [ ] **Issue #8:** App.tsx detecção low-end device
- [ ] **Issue #9:** CSS `prefers-reduced-motion`

---

## ✅ Testes Recomendados

Após implementar as correções, execute:

```bash
# Code quality
npm run lint
npm run typecheck

# Visual testing (em browser)
# 1. Novo usuário → onboarding → primeiro serviço → check aparece
# 2. Continuar wizard em setups restantes → checks aparecem
# 3. Completar todos steps → banner "Sistema Ativado!" aparece
# 4. Recarregar após 7 dias → SetupCopilot desaparece
# 5. Mobile com prefers-reduced-motion → sem animações
```

---

## 📞 Contato

**Revisor QA:** @qa (Quinn)
**Bloqueado por:** Implementação de 9 issues
**Status:** Aguardando PR com correções

Após implementar, abra um PR com referência a este documento para re-review.

