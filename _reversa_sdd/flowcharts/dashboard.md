# Flowcharts — dashboard

> Gerado pelo Archaeologist em 2026-05-03
> Nível de documentação: **Detalhado**

---

## Fluxo Principal: Renderização do Dashboard

```mermaid
flowchart TD
    A[Dashboard.mount] --> B{role === 'staff'?}
    B -->|Sim| C[MeuDiaWidget + StaffEarningsCard]
    B -->|Não| D[DashboardHero]
    D --> E[SmartNotificationsBanner]
    E --> F{commissionBannerDismissed?}
    F -->|Não| G{véspera do pagamento de comissões?}
    G -->|Sim| H[Banner: Amanhã é dia de pagar comissões]
    G -->|Não| I{unfinishedBannerDismissed E após 20h E count > 0?}
    F -->|Sim| I
    H --> I
    I -->|Sim| J[Banner: atendimentos não concluídos]
    I -->|Não| K[SetupCopilot]
    J --> K
    K --> L{alerts.length > 0?}
    L -->|Sim| M[Card: Avisos do Sistema]
    L -->|Não| N[ProfitMetrics — Receita do Dia]
    M --> N
    N --> O[Agenda de Hoje — próximos 5 appointments]
    O --> P[ActionCenter — oportunidades do dia]
    P --> Q[Grid: Meta Mensal + BusinessHealthCard]
    Q --> R[Modais lazy-loaded]
```

---

## Fluxo: useDashboardData — Busca de Dados

```mermaid
flowchart TD
    A[user disponível] --> B[Buscar profile + goal_settings em paralelo]
    B --> C[Effective goal = goal_settings ?? profile ?? 15000]
    C --> D[Buscar próximos 5 appointments Confirmed]
    D --> E[Em paralelo:]
    E --> F[RPC get_dashboard_stats]
    E --> G[RPC get_dashboard_actions non-fatal]
    E --> H[Query appointments Completed hoje → todayRevenue]
    F --> I[Popula: profit, revenue, growth, maturity, doctor]
    G --> J[Popula: actionItems]
    H --> K[Adiciona todayRevenue a profitMetrics]
    I --> L[Em paralelo: fetchGoalHistory]
    L --> M[6 meses: get_finance_stats + goal_settings]
    M --> N[Popula: goalHistory com percentage e success]
```

---

## Fluxo: Financial Doctor — Score e Insights

```mermaid
flowchart TD
    A[calculateHealthScore] --> B{dataMaturityScore < 30?}
    B -->|Sim| C[Retorna 0]
    B -->|Não| D[Base = 50]
    D --> E[+0 a +20: weeklyGrowth]
    E --> F[+0 a +15: repeatClientRate]
    F --> G[-0 a -15: churnRiskCount]
    G --> H[+0 a +15: goalProgress]
    H --> I[+0 a +5: completedThisMonth]
    I --> J[Clamp 0-100]

    K[generateInsights] --> L{churnRisk >= 2 E maturity >= 25?}
    L -->|Sim| M[Insight: risk — clientes sumidos]
    K --> N{weeklyGrowth > 5 E account >= 14d?}
    N -->|Sim| O[Insight: achievement — crescendo]
    K --> P{goalProgress >= 100%?}
    P -->|Sim| Q[Insight: achievement — meta batida]
    K --> R{repeatClientRate < 20% E >= 10 appointments?}
    R -->|Sim| S[Insight: opportunity — poucos voltando]
    K --> T[Ordena por impacto, limita a 5]
```

---

## Fluxo: Smart Rebooking — Cadência Preditiva

```mermaid
flowchart TD
    A[Buscar appointments Completed/Confirmed/Done com clients] --> B[Agrupar por client_id]
    B --> C{visits >= 2?}
    C -->|Não| D[Ignorar — sem cadência]
    C -->|Sim| E[Calcular avgCadence: média dos intervalos entre visitas]
    E --> F[daysSince = hoje - última visita]
    F --> G[daysUntil = avgCadence - daysSince]
    G --> H{daysUntil <= 5?}
    H -->|Não| D
    H -->|Sim| I{daysUntil <= -5?}
    I -->|Sim| J[Urgência: NOW]
    I -->|Não| K{daysUntil <= 0?}
    K -->|Sim| L[Urgência: SOON]
    K -->|Não| M[Urgência: UPCOMING]
    J --> N[Adicionar à lista de sugestões]
    L --> N
    M --> N
    N --> O[Ordenar: NOW > SOON > UPCOMING, depois por daysUntil]
    O --> P[Limitar e exibir com botão WhatsApp]
```

---

## Fluxo: Setup Copilot — Progresso

```mermaid
flowchart TD
    A[SetupCopilot.mount] --> B[getSetupStatus userId]
    B --> C[Verificar 6 steps:]
    C --> D[hasServices: existe service para o user?]
    C --> E[hasTeam: existe team_member para o user?]
    C --> F[hasClients: existe client para o user?]
    C --> G[hasBusinessHours: business_hours configurado?]
    C --> H[hasBookingSlug: business_slug configurado OU localStorage flag?]
    C --> I[hasAppointments: existe appointment para o user?]
    D --> J[Calcular percentage = completedCount / 6 * 100]
    J --> K{allDone E !isActivated?}
    K -->|Sim| L[UPDATE profiles SET setup_completed=true, activation_completed=true]
    K -->|Não| M[Exibir steps com próximos qualificados]
    M --> N{resumeStepId existe?}
    N -->|Sim| O[Banner: Continuar de onde parou]
    N -->| Não| P[Exibir card de progresso normalmente]
```

---

## Fluxo: MeuDiaWidget — Staff

```mermaid
flowchart TD
    A[MeuDiaWidget.mount] --> B[fetchTodayAppointments]
    B --> C[Query appointments com professional_id filtrado]
    C --> D[Mapear para MeuDiaAppointment]
    D --> E[Calcular summary: completed, pending, dailyEarnings]
    E --> F[Renderizar lista com QuickActionItem]
    F --> G{Appointment status = Confirmed?}
    G -->|Sim| H[Botão Concluir 1-touch]
    G -->|Não| I{Status = Completed?}
    I -->|Sim| J[Estilo riscado + ícone check]
    I -->|Não| K[Estilo padrão com dot amarelo]
    H --> L[markAsCompleted]
    L --> M[Optimistic: status → Completed]
    M --> N[UPDATE appointments SET status=Completed]
    N -->|Erro| O[Reverter estado anterior]
    N -->|Sucesso| P[Re-fetch totais]
```

---

## Fluxo: Banners Contextuais

```mermaid
flowchart TD
    A[Dashboard.mount] --> B{role !== staff?}
    B -->|Staff| C[Não exibe banners]
    B -->|Owner| D{commission_settlement_day_of_month existe?}
    D -->|Sim| E{Hoje === settlementDay - 1?}
    E -->|Sim| F[Banner amarelo: Amanhã é dia de pagar comissões]
    D -->|Não| G[Sem banner de comissões]
    E -->|Não| G
    F --> H{Horário >= 20h?}
    G --> H
    H -->|Não| I[Sem banner de não concluídos]
    H -->|Sim| J[Query: appointments hoje NÃO Completed NÃO Cancelled]
    J --> K{count > 0?}
    K -->|Sim| L[Banner laranja: N atendimentos não confirmados]
    K -->|Não| I
```