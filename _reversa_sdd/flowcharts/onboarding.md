# Fluxogramas — Módulo onboarding

> Gerado pelo Archaeologist em 2026-05-03
> Nível: Detalhado

---

## 1. Fluxo Principal — Wizard Novo (Onboarding.tsx)

```mermaid
flowchart TD
    A[Usuário acessa /onboarding] --> B[OnboardingInner mount]
    B --> C{companyId existe?}
    C -->|Não| D[Aguarda]
    C -->|Sim| E[getOnboardingProgress companyId]
    E --> F{is_completed?}
    F -->|Sim| G[markTutorialCompleted]
    G --> H[navigate / replace]
    F -->|Não| I{current_step > 1?}
    I -->|Sim| J[dispatch SET_STEP current_step]
    I -->|Não| K[Renderiza WizardEngine]
    J --> K

    K --> L[WizardEngine render step atual]
    L --> M{currentStep}
    M -->|1| N[StepWelcome]
    M -->|2| O[StepServices]

    N --> P[Usuario preenche business_name]
    P --> Q[click onNext]
    Q --> R[completeStep 1]
    R --> S[saveOnboardingStep companyId 2 1]
    S --> T[dispatch COMPLETE_STEP]
    T --> U[Avança para step 2]

    O --> V[Usuario CRUD services]
    V --> W[click onNext]
    W --> X[completeStep 2]
    X --> Y{step === TOTAL_STEPS?}
    Y -->|Sim| Z[completeOnboarding companyId]
    Z --> AA[markTutorialCompleted]
    AA --> AB[dispatch COMPLETE_WIZARD]
    AB --> AC[navigate / replace]
    Y -->|Não| AD[saveOnboardingStep companyId nextStep]
    AD --> AE[Avança para próximo step]
```

---

## 2. Fluxo — Wizard Legado (OnboardingWizard.tsx)

```mermaid
flowchart TD
    A[useOnboardingState mount] --> B[fetchProgress]
    B --> C[SELECT onboarding_step, onboarding_completed FROM business_settings]
    C --> D{onboarding_completed?}
    D -->|Sim| E[markTutorialCompleted + navigate /]
    D -->|Não| F[Clamp step: Math.min Math.max step 1 5]
    F --> G[Renderiza step atual]

    G --> H{step}
    H -->|1| I[StepBusinessInfo]
    H -->|2| J[StepServices]
    H -->|3| K[StepTeam]
    H -->|4| L[StepMonthlyGoal]
    H -->|5| M[StepSuccess]

    I --> N[goToStep 2]
    J --> O[goToStep 3]
    K --> P[goToStep 4]
    L --> Q{onSkip?}
    Q -->|Sim| R[goToStep 5]
    Q -->|Não| S[goToStep 5]
    M --> T[completeOnboarding]

    N --> U[RPC update_onboarding_step p_user_id p_step]
    U --> V[Persiste em business_settings]
```

---

## 3. Fluxo — Staff Onboarding

```mermaid
flowchart TD
    A[Staff acessa /staff-onboarding] --> B[Carrega business_name do profiles]
    B --> C[Exibe tela de boas-vindas]
    C --> D{Staff clica Acessar minha agenda}
    D --> E[handleStart]
    E --> F[markTutorialCompleted]
    F --> G[navigate /]
```

---

## 4. Fluxo — SetupCopilot (Pós-wizard)

```mermaid
flowchart TD
    A[Dashboard mount] --> B[SetupCopilot mount]
    B --> C[getSetupStatus userId]
    C --> D[Promise.all: services, team_members, clients, business_settings, profiles, appointments]
    D --> E[Calcula 6 milestones]

    E --> F{Todos completos?}
    F -->|Não| G[Exibe card com steps pendentes]
    F -->|Sim| H[UPDATE profiles SET activation_completed = true]
    H --> I[dispatchEvent system-activated]
    I --> J[ActivationBanner mostra toast 8s]
    I --> K[SetupCopilot mostra estado de sucesso]

    G --> L{Staff clica startGuide?}
    L -->|Sim| M[startGuide stepId]
    M --> N[Salva last_guided_step em onboarding_progress.step_data]
    N --> O[sessionStorage.setItem guided_mode_state]
    O --> P[WizardPointer spotlight no elemento alvo]
    P --> Q[Usuario completa ação]
    Q --> R[dispatchEvent setup-step-completed]
    R --> S[StandaloneWizardPointer mostra overlay Check]
    S --> T[Refresh milestones]
```

---

## 5. Fluxo — Redirect Guards

```mermaid
flowchart TD
    A[Login sucesso] --> B[SELECT onboarding_completed FROM business_settings]
    B --> C{onboarding_completed?}
    C -->|false| D[Navigate /onboarding]
    C -->|true| E[Continua para Dashboard]

    F[ProtectedLayout render] --> G{userType === staff?}
    G -->|Sim| H{tutorialCompleted?}
    H -->|Não| I[Navigate /staff-onboarding]
    H -->|Sim| J[Continua]

    G -->|Não owner| K{activation_completed?}
    K -->|Não| L[Navigate /onboarding]
    K -->|Sim| M[Continua para Dashboard]
```

---

## 6. Fluxo — Guided Mode (Context)

```mermaid
flowchart TD
    A[Usuario clica startGuide no SetupCopilot] --> B[GuidedModeContext.startGuide stepId]
    B --> C[Lê WIZARD_TARGETS stepId]
    C --> D[setState: activeStep, targetElementId, position, message]
    D --> E[sessionStorage.setItem guided_mode_state]
    E --> F[getOnboardingProgress companyId]
    F --> G[saveOnboardingStep companyId currentStep completedSteps last_guided_step: stepId]
    G --> H[WizardPointer renderiza spotlight no target]

    H --> I[MutationObserver aguarda elemento se necessário]
    I --> J[box-shadow 0 0 0 9999px rgba 0 0 0 0.75]
    I --> K[Tooltip com message na position]

    L[Usuario clica endGuide] --> M[setState defaultState]
    M --> N[sessionStorage.removeItem guided_mode_state]
```

---

## 7. Fluxo — Persistência (RPCs)

```mermaid
flowchart TD
    subgraph Novo Sistema
        A1[saveOnboardingStep] --> B1[RPC upsert_onboarding_progress]
        B1 --> C1[Valida company_id do chamador]
        C1 --> D1{match?}
        D1 -->|Não| E1[RAISE EXCEPTION insufficient_privilege]
        D1 -->|Sim| F1[INSERT ... ON CONFLICT company_id DO UPDATE]
        F1 --> G1[step_data merge: existing || new]
        G1 --> H1[RETURN onboarding_progress]
    end

    subgraph Sistema Legado
        A2[useOnboardingState.goToStep] --> B2[RPC update_onboarding_step]
        B2 --> C2[INSERT INTO business_settings onboarding_step onboarding_completed]
        C2 --> D2[ON CONFLICT user_id DO UPDATE]
        D2 --> E2[onboarding_step = GREATEST atual novo]
        E2 --> F2[onboarding_completed = true se p_completed ELSE mantém]
    end
```