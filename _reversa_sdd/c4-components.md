# Diagrama C4 — Componentes (Nível 3)

> agendix (Beauty OS / AgendiX)
> Gerado pelo Architect em 2026-05-06
> Nível de confiança: 🟢 Confirmado | 🟡 Inferido | 🔴 Lacuna

---

## Container: SPA React (Frontend)

```mermaid
flowchart TB
    subgraph App["App.tsx"]
        Router["Router<br/>(HashRouter)"]
        Suspense["Suspense<br/>(Lazy Loading)"]
        Guards["Route Guards<br/>(ProtectedLayout, OwnerRouteGuard, DevRouteGuard)"]
    end

    subgraph Contexts["Contextos React"]
        AuthCtx["AuthContext<br/>(session, profile, subscription)"]
        UICtx["UIContext<br/>(modals, toasts, loading)"]
        PublicClientCtx["PublicClientContext<br/>(client session, auth via phone)"]
        GuidedModeCtx["GuidedModeContext<br/>(onboarding spotlight)"]
        WizardCtx["WizardContext<br/>(onboarding wizard state)"]
    end

    subgraph Pages["Páginas (Lazy Loaded)"]
        Dashboard["Dashboard"]
        Agenda["Agenda"]
        PublicBooking["PublicBooking"]
        QueueMgmt["QueueManagement"]
        QueueJoin["QueueJoin"]
        QueueStatus["QueueStatus"]
        Clients["Clients / ClientCRM"]
        ClientArea["ClientArea"]
        Finance["Finance"]
        Marketing["Marketing"]
        Settings["Settings (10 sub-pages)"]
        Onboarding["OnboardingWizard"]
        StaffOnboarding["StaffOnboarding"]
        Login["Login / Register / ForgotPassword"]
    end

    subgraph Components["Componentes Reutilizáveis"]
        BrutalCard["BrutalCard / BrutalButton"]
        PhoneInput["PhoneInput"]
        SearchableSelect["SearchableSelect"]
        CalendarPicker["CalendarPicker"]
        TimeGrid["TimeGrid"]
        ProfessionalSelector["ProfessionalSelector"]
        WizardPointer["WizardPointer (spotlight)"]
    end

    subgraph Hooks["Custom Hooks"]
        useDashboard["useDashboardData"]
        useMeuDia["useMeuDiaData"]
        useSmartRebooking["useSmartRebooking"]
        useFinancialDoctor["useFinancialDoctor"]
        useAIOS["useAIOSDiagnostic"]
        useSemanticMemory["useSemanticMemory"]
        useAppTour["useAppTour (driver.js)"]
        use2FA["use2FA"]
    end

    subgraph Libs["Bibliotecas Cliente"]
        SupabaseClient["lib/supabase.ts"]
        GeminiClient["lib/gemini.ts"]
        OpenRouterClient["lib/openrouter.ts"]
        StripeClient["lib/stripe.ts"]
    end

    Router --> Guards
    Guards --> Suspense
    Suspense --> Pages

    Pages --> Contexts
    Pages --> Components
    Pages --> Hooks
    Hooks --> Contexts
    Hooks --> Libs
    Pages --> Libs

    style AuthCtx fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style Dashboard fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style SupabaseClient fill:#fff3e0,stroke:#e65100,stroke-width:2px
```

---

### Componentes do Frontend

| Componente | Tecnologia | Responsabilidade |
|------------|------------|------------------|
| **Router** | react-router-dom (HashRouter) | Roteamento client-side, lazy loading de páginas |
| **ProtectedLayout** | React component | Verifica autenticação e redireciona para login/onboarding |
| **OwnerRouteGuard** | React component | Bloqueia rotas restritas a staff; redireciona para dashboard |
| **DevRouteGuard** | React component | Bloqueia rotas de auditoria/erros/lixeira para não-devs |
| **AuthContext** | React Context | Estado global de autenticação: sessão, perfil, assinatura, trial, role |
| **UIContext** | React Context | Estado global de UI: modais, toasts, loading states |
| **PublicClientContext** | React Context | Sessão do cliente público: login via telefone, registro, espelhamento CRM |
| **WizardContext** | React Context | Estado do onboarding wizard (novo): step atual, dados por step |
| **GuidedModeContext** | React Context | Gerenciamento do modo guiado pós-wizard: spotlight, progresso |
| **Dashboard** | React page (lazy) | Visão dual owner/staff: métricas, ações, setup copilot, AIOS |
| **Agenda** | React page (lazy) | CRUD de agendamentos, aceite de bookings, checkout, calendário |
| **PublicBooking** | React page (lazy) | Fluxo conversacional de reserva pública: serviços, data, profissional |
| **QueueManagement** | React page (lazy) | Gestão da fila digital pelo owner: chamar, atender, finalizar |
| **Finance** | React page (lazy) | Controle financeiro, comissões, relatórios, assinaturas |
| **Settings** | React page (lazy) | Hub de configurações com 10 sub-páginas e RBAC |
| **useDashboardData** | Custom Hook | Fetch consolidado de estatísticas, metas, ações, maturidade de dados |
| **useSmartRebooking** | Custom Hook | Cálculo de cadência preditiva para sugerir reagendamentos |
| **useFinancialDoctor** | Custom Hook | Cálculo de health score e geração de insights contextuais |
| **useAIOSDiagnostic** | Custom Hook | Diagnóstico de churn: clientes em risco, receita recuperável |
| **useSemanticMemory** | Custom Hook | Geração de embeddings e busca por similaridade (RAG) |
| **lib/supabase.ts** | Cliente TS | Singleton do cliente Supabase com interceptors e configuração de auth |
| **lib/gemini.ts** | Cliente TS | Wrapper para Google Generative AI (embeddings e text generation) |
| **lib/openrouter.ts** | Cliente TS | Wrapper para OpenRouter API (chat completions) |

---

## Container: Supabase PostgreSQL (Backend)

```mermaid
flowchart TB
    subgraph Schema["Schema Principal"]
        AuthTables["auth.users<br/>(managed by GoTrue)"]
        Profiles["profiles<br/>(Owner/Staff metadata)"]
        TeamMembers["team_members<br/>(Profissionais)"]
        Clients["clients / public_clients"]
        Appointments["appointments / public_bookings"]
        Queue["queue_entries"]
        Services["services / service_categories"]
        Finance["finance_records / commission_payments"]
        Settings["business_settings / goal_settings"]
        Audit["audit_logs / system_errors"]
        AI["client_semantic_memory / ai_knowledge_base / aios_logs"]
        Onboarding["onboarding_progress"]
    end

    subgraph RLS["Row Level Security"]
        CompanyIsolation["company_isolation<br/>(get_auth_company_id)"]
        StaffRead["staff_read_restrictions"]
        DevOnly["dev_only_policies"]
    end

    subgraph Functions["Funções SQL / RPCs"]
        RPCs["50+ RPCs<br/>(SECURITY DEFINER)"]
        Triggers["Triggers<br/>(audit, auto-updates)"]
        CustomFuncs["Funções Auxiliares<br/>(get_auth_company_id, is_staff_of)"]
    end

    AuthTables --> Profiles
    Profiles --> TeamMembers
    Profiles --> Clients
    Profiles --> Appointments
    Profiles --> Queue
    Profiles --> Services
    Profiles --> Finance
    Profiles --> Settings
    Profiles --> Audit
    Profiles --> AI
    Profiles --> Onboarding

    Schema --> RLS
    Schema --> Functions

    style Profiles fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style RPCs fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style CompanyIsolation fill:#fce4ec,stroke:#c2185b,stroke-width:2px
```

---

### Componentes do Backend

| Componente | Tecnologia | Responsabilidade |
|------------|------------|------------------|
| **auth.users** | Supabase GoTrue | Tabela gerenciada: identidades, senhas, MFA factors |
| **profiles** | PostgreSQL | Metadados de usuários: role, company_id, subscription, trial, configurações |
| **team_members** | PostgreSQL | Cadastro de profissionais, comissões, slugs para portfolio público |
| **appointments** | PostgreSQL | Agendamentos confirmados/completados/cancelados |
| **public_bookings** | PostgreSQL | Reservas públicas pendentes (dual booking system) |
| **queue_entries** | PostgreSQL | Fila digital: entradas com status e timestamps |
| **clients** | PostgreSQL | Clientes do CRM com soft delete, tier de fidelidade |
| **public_clients** | PostgreSQL | Clientes que reservaram via link público |
| **finance_records** | PostgreSQL | Registro financeiro: receitas e despesas com comissões |
| **business_settings** | PostgreSQL | Configurações centralizadas do negócio (JSONB + colunas) |
| **audit_logs** | PostgreSQL | Logs de auditoria com diff campo-a-campo |
| **client_semantic_memory** | PostgreSQL (pgvector) | Memórias semânticas com embeddings 768d |
| **ai_knowledge_base** | PostgreSQL (pgvector) | Cache semântico de respostas da IA |
| **onboarding_progress** | PostgreSQL | Wizard novo: steps, dados, progresso (JSONB) |
| **RLS Policies** | PostgreSQL | 100+ policies em evolução; isolamento por company_id via `get_auth_company_id()` |
| **RPCs** | PostgreSQL (plpgsql) | 50+ funções SECURITY DEFINER para lógica crítica |
| **Triggers** | PostgreSQL | Auditoria automática em 6 tabelas; auto-updates de timestamps |
| **Edge Functions** | Deno | Stripe checkout, envio de email |

---

## Container: Supabase Storage

| Bucket | Conteúdo | Acesso |
|--------|----------|--------|
| **logos** | Logos dos estabelecimentos | Público (read), Owner (write) |
| **covers** | Fotos de capa | Público (read), Owner (write) |
| **service_images** | Imagens dos serviços | Público (read), Owner (write) |
| **team_photos** | Fotos dos profissionais | Público (read), Owner (write) |
| **client_photos** | Fotos dos clientes | Owner/Staff (read/write) |

---

*Fim do diagrama C4 Componentes.*
