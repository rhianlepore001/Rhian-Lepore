# AgenX — Source Tree & Arquivos Críticos

## Estrutura Principal

```
c:\Users\User\Downloads\Rhian-Lepore-main\
├── App.tsx                          ← Roteamento principal (HashRouter)
├── main.tsx                         ← Entry point
├── index.css                        ← CSS global + variáveis de tema
│
├── pages/                           ← Páginas (lazy-loaded)
│   ├── Dashboard.tsx                ← Dashboard do owner/staff
│   ├── Agenda.tsx                   ← Calendário de agendamentos
│   ├── Finance.tsx                  ← Módulo financeiro
│   ├── Marketing.tsx                ← Marketing e campanhas
│   ├── ClientCRM.tsx                ← Gestão de clientes
│   ├── Insights.tsx                 ← Relatórios e analytics
│   ├── OnboardingWizard.tsx         ← Wizard de onboarding (5 steps)
│   ├── PublicBooking.tsx            ← Página pública de agendamento
│   ├── QueueJoin.tsx                ← Fila digital (entrada)
│   ├── QueueStatus.tsx              ← Status da fila
│   └── settings/
│       ├── GeneralSettings.tsx      ← Nome, endereço, logo, horários
│       ├── PublicBookingSettings.tsx ← Configurações do booking público
│       ├── TeamSettings.tsx         ← Gestão de equipe
│       ├── ServiceSettings.tsx      ← Catálogo de serviços
│       ├── CommissionsSettings.tsx  ← Comissões
│       └── SubscriptionSettings.tsx ← Assinatura do AgenX
│
├── components/
│   ├── Layout.tsx                   ← Layout principal (sidebar + header)
│   ├── Sidebar.tsx                  ← Navegação lateral
│   ├── BottomMobileNav.tsx          ← Navegação mobile inferior
│   ├── BrutalCard.tsx               ← Card principal do design system
│   ├── BrutalButton.tsx             ← Botão principal do design system
│   ├── SkeletonLoader.tsx           ← Loading states
│   ├── SmartNotifications.tsx       ← Banner de notificações inteligentes
│   │
│   ├── dashboard/
│   │   ├── DashboardHero.tsx        ← Hero com greeting e quick actions
│   │   ├── ProfitMetrics.tsx        ← Gráficos de receita
│   │   ├── FinancialDoctorPanel.tsx ← Análise financeira com IA
│   │   ├── ActionCenter.tsx         ← Centro de ações recomendadas
│   │   ├── MeuDiaWidget.tsx         ← Agenda do dia (staff)
│   │   ├── ChurnRadar.tsx           ← Clientes inativos (sendo substituído)
│   │   ├── AIOSCampaignStats.tsx    ← Stats de campanhas
│   │   └── DataMaturityBadge.tsx    ← Score de maturidade dos dados
│   │
│   ├── marketing/
│   │   ├── InstagramIdeas.tsx       ← Ideias de posts (OpenRouter)
│   │   ├── WhatsAppCampaign.tsx     ← Campanhas WhatsApp
│   │   ├── ContentCalendar.tsx      ← Calendário de conteúdo
│   │   └── PhotoStudio.tsx          ← Edição de fotos
│   │
│   └── onboarding/
│       ├── StepBusinessInfo.tsx
│       ├── StepServices.tsx
│       ├── StepTeam.tsx
│       ├── StepMonthlyGoal.tsx
│       └── StepSuccess.tsx
│
├── contexts/
│   ├── AuthContext.tsx              ← Auth + user + companyId + role
│   ├── AlertsContext.tsx            ← Toasts e notificações
│   ├── UIContext.tsx                ← Estado da sidebar
│   └── PublicClientContext.tsx      ← Booking público
│
├── hooks/
│   ├── useDashboardData.ts          ← Dados do dashboard (appointments, revenue, goal)
│   ├── useAIOSDiagnostic.ts         ← Diagnóstico de negócio com IA
│   ├── useSubscription.ts           ← Status da assinatura
│   ├── useMarketingOpportunities.ts ← Oportunidades de marketing
│   └── useAppTour.ts                ← Tour do app
│
├── lib/
│   ├── supabase.ts                  ← Client Supabase inicializado
│   ├── gemini.ts                    ← Google Generative AI client
│   ├── openrouter.ts                ← OpenRouter client (Instagram Ideas)
│   └── auditLogs.ts                 ← Logging de auditoria
│
├── utils/
│   ├── formatters.ts                ← formatCurrency, formatNumber
│   ├── date.ts                      ← formatDate, differenceInDays, addDays
│   ├── Logger.ts                    ← logger.info/error/warn
│   ├── tierSystem.ts                ← Lógica de planos/tiers
│   └── aiosCopywriter.ts            ← Geração de mensagens com IA
│
├── supabase/
│   ├── functions/                   ← Edge Functions (server-side)
│   │   └── send-appointment-reminder/
│   └── migrations/                  ← SQL migrations (numerados)
│
└── squads/
    ├── agenx-core/          ← ESTE SQUAD (contexto base)
    ├── human-thinking/      ← Análise cognitiva e reviews
    └── human-tester/        ← Testes de UX
```

## Tabela de Substituições de Copy (OBRIGATÓRIO)

| Jargão técnico (NUNCA usar) | Linguagem humana (SEMPRE usar) |
|-----------------------------|-------------------------------|
| AIOS Command | Seu painel |
| Data Maturity Score / X% | Seu negócio está X% organizado |
| ChurnRadar | Clientes para reconquistar |
| FinancialDoctorPanel | Como está seu mês |
| Action Center | O que fazer agora |
| System Operational | Tudo funcionando |
| Próximos Atendimentos | Agenda de hoje |
| Churn Rate | Clientes que não voltaram |
| Ticket Médio | Valor médio por atendimento |
| Receita Recorrente | Quanto você ganha por mês |
| Taxa de Ocupação | Quanto da agenda está preenchida |
| LTV | Valor total que o cliente já gastou |
| Reativação | Trazer o cliente de volta |
| Fluxo de Caixa | Entradas e saídas de dinheiro |
| ROI | Retorno do investimento |

## Tabelas Supabase Principais

| Tabela | Descrição | Filtro obrigatório |
|--------|-----------|-------------------|
| `companies` | Dados do negócio/tenant | `id` |
| `profiles` | Usuários e donos | `company_id` |
| `appointments` | Agendamentos | `company_id` |
| `services` | Serviços oferecidos | `company_id` |
| `transactions` | Receitas e despesas | `company_id` |
| `clients` | Clientes do negócio | `company_id` |
| `business_settings` | Configurações do negócio | `company_id` |
| `team_members` | Equipe | `company_id` |

## Rotas da Aplicação

```
/               → Dashboard
/agenda         → Agenda
/fila           → Fila Digital
/clientes       → CRM de Clientes
/financeiro     → Módulo Financeiro
/marketing      → Marketing
/insights       → Insights/Relatórios
/configuracoes  → Ajustes (Settings)
  /configuracoes/geral
  /configuracoes/agendamento
  /configuracoes/equipe
  /configuracoes/servicos
  /configuracoes/comissoes
  /configuracoes/assinatura

/onboarding     → Wizard de Onboarding
/book/:slug     → Booking Público (unauthenticated)
/queue/:slug    → Fila Digital Pública
/login          → Login
/register       → Cadastro
```
