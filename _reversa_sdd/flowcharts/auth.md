# Fluxogramas — Módulo: auth

> Gerado pelo Archaeologist em 2026-05-03
> Nível: Detalhado

---

## Fluxo: Login Completo

```mermaid
flowchart TD
    A[Usuário preenche email/senha] --> B{Rate Limit RPC}
    B -->|Bloqueado| C[Exibe erro: aguarde 1 minuto]
    B -->|Permitido| D[Supabase signInWithPassword]
    D -->|Erro| E[Exibe erro de credenciais]
    D -->|Sucesso| F[AuthStateChange dispara]
    F --> G[fetchProfileData]
    G --> H{Role = staff?}
    H -->|Sim| I[Busca dados do owner]
    H -->|Não| J[Usa dados próprios]
    I --> K[Busca team_member_id]
    J --> L[Seta estados globais]
    K --> L
    L --> M[Login.tsx verifica onboarding]
    M -->|Não completado| N[Redirect /onboarding]
    M -->|Completado| O[Redirect /]
```

---

## Fluxo: Registro de Novo Usuário

```mermaid
flowchart TD
    A[Usuário preenche formulário] --> B[Supabase auth.signUp]
    B -->|Erro| C[Retorna erro]
    B -->|Sucesso| D[Insert em profiles]
    D -->|Erro| E[Retorna erro]
    D -->|Sucesso| F{Tem companyId?}
    F -->|Sim| G[Insert em team_members]
    F -->|Não| H[Retorna sucesso]
    G -->|Erro| I[Loga erro, não bloqueia]
    G -->|Sucesso| H
```

---

## Fluxo: Logout

```mermaid
flowchart TD
    A[Usuário clica logout] --> B[supabase.auth.signOut]
    B --> C[Reseta todos os estados]
    C --> D[userType='barber', role='owner', etc.]
    D --> E[Unsubscribe auth listener]
```

---

## Fluxo: Verificação de Assinatura Ativa

```mermaid
flowchart TD
    A[isSubscriptionActive] --> B{status = active?}
    B -->|Sim| C[Retorna true]
    B -->|Não| D{status = subscriber?}
    D -->|Sim| C
    D -->|Não| E{status = trial?}
    E -->|Não| F[Retorna false]
    E -->|Sim| G{trialEndsAt existe?}
    G -->|Não| F
    G -->|Sim| H{now < trialEndsAt?}
    H -->|Sim| C
    H -->|Não| F
```

---

## Fluxo: fetchProfileData

```mermaid
flowchart TD
    A[Recebe userId] --> B[Query profiles by id]
    B -->|Não encontrado / erro| C[Loga erro, retorna]
    B -->|Encontrado| D{profile.role = staff?}
    D -->|Não| E[Seta dados do próprio perfil]
    E --> F[subscriptionStatus = profile.subscription_status]
    E --> G[trialEndsAt = profile.trial_ends_at]
    D -->|Sim| H[Query owner profile by company_id]
    H -->|Encontrado| I[Herda subscription, userType, businessName]
    H -->|Não encontrado| J[Fallback: userType próprio, status='subscriber']
    I --> K[Query team_members by staff_user_id]
    J --> K
    K --> L[Seta teamMemberId]
```
