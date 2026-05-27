# Flowchart — supabase-backend

> Gerado pelo Archaeologist em 2026-05-04
> Nível: Detalhado

---

## 1. RLS Evolution — 5 Fases

```mermaid
flowchart TD
    subgraph F1[Fase 1: user-isolation]
        A1[USING user_id = auth.uid] --> B1[Problema: staff sem acesso]
    end
    subgraph F2[Fase 2: owner-only]
        A2[ owner-only para settings/finance] --> B2[Problema: staff não vê nada]
    end
    subgraph F3[Fase 3: public access]
        A3[anon INSERT para bookings/queue] --> B3[Problema: sem multi-tenant]
    end
    subgraph F4[Fase 4: strict financial]
        A4[Finance records owner-only] --> B4[Problema: staff não vê comissões]
    end
    subgraph F5[Fase 5: company-isolation ← ATUAL]
        A5[USING company_id = get_auth_company_id] --> B5[Staff vê dados da empresa]
        A5 --> C5[get_auth_role → owner/staff/dev]
    end
    F1 --> F2 --> F3 --> F4 --> F5
```

## 2. Stripe Checkout (Edge Function)

```mermaid
flowchart TD
    A[POST /create-checkout-session] --> B{Auth header?}
    B -->|Não| C[Error: User not found]
    B -->|Sim| D[supabase.auth.getUser]
    D --> E[Busca stripe_customer_id em profiles]
    E --> F{Customer ID?}
    F -->|Não| G[Busca por email no Stripe]
    G --> H{Encontrado?}
    H -->|Sim| I[Usa customer existente]
    H -->|Não| J[Cria novo customer no Stripe]
    J --> K[Salva stripe_customer_id em profiles]
    I --> L[Cria Checkout Session]
    F -->|Sim| L
    L --> M[stripe.checkout.sessions.create]
    M --> N[Retorna: url: session.url]
```

## 3. Appointment Reminder (Edge Function)

```mermaid
flowchart TD
    A[Cron → send-appointment-reminder] --> B[Busca bookings confirmados para amanhã]
    B --> C[Filtra: enable_email_reminders = true]
    C --> D{Bookings encontrados?}
    D -->|Não| E[Retorna: No bookings to remind]
    D -->|Sim| F[Para cada booking]
    F --> G[Extrai: clientEmail, clientName, serviceName, businessName]
    G --> H{Tem email?}
    H -->|Não| I[Skipped: no email]
    H -->|Sim| J[Gera HTML template]
    J --> K[resend.emails.send]
    K --> L{Sucesso?}
    L -->|Não| M[Status: failed]
    L -->|Sim| N[Status: sent]
    M & N & I --> O[Retorna: results[]]
```

## 4. Rate Limiting Token Bucket

```mermaid
flowchart TD
    A[check_login_rate_limit email] --> B{Registro existe?}
    B -->|Não| C[INSERT attempt_count = 1]
    C --> D[allowed: true]
    B -->|Sim| E{attempt_count >= 5?}
    E -->|Não| F[INCREMENT attempt_count]
    F --> D
    E -->|Sim| G{last_attempt < NOW - 1min?}
    G -->|Sim| H[RESET: attempt_count = 1]
    H --> D
    G -->|Não| I[allowed: false, 'Muitas tentativas']
```

## 5. Secure Booking Flow (create_secure_booking)

```mermaid
flowchart TD
    A[create_secure_booking p_data] --> B[LOCK appointments WHERE professional_id + date]
    B --> C{Horário disponível?}
    C -->|Não| D[RAISE EXCEPTION: Horário não disponível]
    C -->|Sim| E[INSERT INTO appointments]
    E --> F[INSERT INTO finance_records]
    F --> G[Mirror public_client → CRM se necessário]
    G --> H[Retorna booking data]
```

## 6. Finance Stats Evolution (5 versões)

```mermaid
flowchart TD
    V1[v1: UUID params] --> V2[v2: TEXT params + AIOS]
    V2 --> V3[v3: COALESCE safety + NULLIF TRIM]
    V3 --> V4[v4: get_dashboard_stats + data maturity + financial doctor]
    V4 --> V5[v5: clarify revenue — completed vs scheduled pipeline]
```

## 7. Dashboard Actions Pipeline

```mermaid
flowchart TD
    A[get_dashboard_actions] --> B[Comissões pendentes]
    A --> C[Bookings não confirmados]
    A --> D[Clientes em risco — churn]
    A --> E[Progresso da meta mensal]
    A --> F[Calendário de conteúdo]
    B & C & D & E & F --> G[Ordena por prioridade]
    G --> H[Retorna recommended_actions[]]
```