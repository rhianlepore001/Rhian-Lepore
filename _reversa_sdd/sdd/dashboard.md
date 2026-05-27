# Dashboard (dashboard)

## Visão Geral
Dashboard principal do sistema com visão dual (owner vs staff). Para owners: exibe saudação personalizada, receita do dia, agenda de hoje, meta mensal, saúde do negócio (Financial Doctor), oportunidades de ação, setup copilot, campanhas AIOS, smart rebooking, tour guiado e banners contextuais. Para staff: exibe widget "Meu Dia" com agendamentos do profissional e card de ganhos. Inclui sistema de data maturity progressivo.

## Responsabilidades
- Exibir visão condicional baseada no papel (owner/staff)
- Buscar estatísticas consolidadas via RPC `get_dashboard_stats`
- Buscar ações sugeridas via RPC `get_dashboard_actions`
- Gerenciar meta mensal (upsert em `goal_settings`)
- Calcular health score do negócio (Financial Doctor)
- Sugerir reagendamentos preditivos (Smart Rebooking)
- Guiar setup progressivo pós-wizard (SetupCopilot)
- Executar tour guiado contextual (driver.js)
- Exibir banners contextuais (comissões, atendimentos não concluídos)
- Widget "Meu Dia" para staff com 1-touch complete

## Interface

### Entradas
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| user_id | uuid | ID do usuário (owner ou staff) |
| monthly_goal | numeric | Meta mensal de faturamento |
| month | integer | Mês (0-11) |
| year | integer | Ano |

### Saídas
| Saída | Tipo | Descrição |
|-------|------|-----------|
| DashboardStats | object | Estatísticas consolidadas |
| ActionItem[] | object[] | Oportunidades do dia |
| GoalSetting | object | Meta do mês atual |
| HealthScore | number | Score 0-100 |
| Insight[] | object[] | Insights do Financial Doctor |
| RebookingSuggestion[] | object[] | Sugestões de reagendamento |
| SetupStatus | object | Progresso do setup |
| DataMaturity | object | Score e badge |

## Regras de Negócio
- **R53** Visão dual: owner vê dashboard completo; staff vê apenas "Meu Dia" + ganhos. 🟢
- **R54** Meta mensal: `goal_settings.monthly_goal ?? profile.monthly_goal ?? 15000`. 🟢
- **R55** Data Maturity Score progressivo: < 25 "Início", < 50 "Aprendizado", < 75 "Crescimento", ≥ 75 "Maduro". Fórmula confirmada na RPC `get_dashboard_stats` (migration `20260321_clarify_dashboard_revenue.sql`):
  - até 20 pontos por total de agendamentos: `appointments_total >= 10 ? 20 : appointments_total * 2`
  - até 20 pontos por agendamentos no mês: `appointments_this_month >= 5 ? 20 : appointments_this_month * 4`
  - 20 pontos se houver pelo menos 1 agendamento concluído no mês
  - 20 pontos se houver public bookings
  - até 20 pontos por idade da conta: `account_days_old >= 30 ? 20 : account_days_old`
  - Score final limitado a 100. 🟢
- **R56** Financial Doctor: score base 50, ajustado por crescimento, retorno, churn, meta, volume. Clamp [0, 100]. Se maturity < 30: retorna 0. 🟢
- **R57** Smart Rebooking: calcula cadência média entre visitas. Se daysUntil ≤ 5: urgency 'now'/'soon'/'upcoming'. 🟢
- **R58** SetupCopilot: 6 milestones (services, team, clients, hours, profile, booking, appointment). Auto-completa ao clicar. 🟢
- **R59** Banner de comissões: exibido 1 dia antes do `commission_settlement_day_of_month`. 🟢
- **R60** Banner de atendimentos não concluídos: exibido após 20h se houver appointments do dia ≠ Completed/Cancelled. 🟢
- **R61** Staff marca atendimento como concluído com 1 toque (optimistic update). 🟢
- **R62** Tour guiado auto-inicia no dashboard se `tour_completed` não estiver em localStorage. 🟢

## Fluxo Principal

### Busca de Dados do Dashboard
1. `useEffect` on `[user]`:
   a. Busca profile (`business_slug`, `monthly_goal`) e `goal_settings` (mês atual)
   b. Effective goal = `goal_settings.monthly_goal ?? profile.monthly_goal ?? 15000`
   c. Busca próximos 5 appointments (Confirmed, future)
   d. Paralelo:
      - RPC `get_dashboard_stats` → stats
      - RPC `get_dashboard_actions` → action items
      - Query appointments Completed do dia → todayRevenue
2. `fetchGoalHistory`: para cada um dos últimos 6 meses, chama `get_finance_stats`

### Widget Meu Dia (Staff)
1. Busca appointments do dia filtrados por `professional_id`
2. Calcula resumo: completed, pending, dailyEarnings
3. `markAsCompleted`: optimistic update + UPDATE `appointments.status='Completed'`

### Financial Doctor
1. Base: 50 pontos
2. + até 20 por crescimento semanal
3. + até 15 por taxa de retorno
4. - risco de churn
5. + até 15 por progresso na meta
6. + até 5 por volume
7. Clamp [0, 100]
8. Se `dataMaturityScore < 30`: retorna 0

### Smart Rebooking
1. Busca appointments Confirmed/Completed/Done com join clients
2. Agrupa por `client_id`, calcula visits e totalSpent
3. Para cada cliente com ≥2 visitas:
   - `avgCadence = média de dias entre visitas`
   - `daysSinceLastVisit`
   - `daysUntilSuggested = avgCadence - daysSinceLastVisit`
4. Se `daysUntil <= 5`: classifica urgency
5. Ordena: agora > em breve > próximamente

## Fluxos Alternativos
- **[Meta mensal não definida]:** Usa default 15000. 🟢
- **[get_dashboard_actions falha]:** Não-fatal, exibe lista vazia. 🟢
- **[Staff sem appointments]:** Exibe "Nenhum atendimento hoje". 🟢
- **[Tour já completado]:** Não inicia. 🟢

## Cenários de Borda

### B1 — Data Maturity abaixo de 30 esconde Financial Doctor
- **Condição:** Conta nova com < 5 agendamentos.
- **Comportamento:** Financial Doctor retorna score 0 e não exibe dados.
- **Impacto:** Owner não vê insights até ter dados suficientes.
- **Risco:** Baixo — comportamento intencional.

### B2 — Staff marca como completed mas RPC falha
- **Condição:** Staff clica "Concluir", optimistic update exibe Completed, mas UPDATE falha.
- **Comportamento:** Estado reverte para anterior. Toast de erro.
- **Impacto:** Staff pode achar que concluiu, mas não persistiu.
- **Risco:** Baixo — reverte visualmente.

## Dependências
- `lib/supabase.ts` — cliente Supabase
- `contexts/AuthContext.tsx` — `useAuth`
- `hooks/useDashboardData.ts` — dados consolidados
- `hooks/useMeuDiaData.ts` — widget staff
- `hooks/useSmartRebooking.ts` — reagendamento
- `hooks/useFinancialDoctor.ts` — health score
- `hooks/useAppTour.ts` — tour guiado
- `recharts` — gráficos

## Critérios de Aceitação

```gherkin
# Cenário 1: Owner vê dashboard completo
Dado que um owner loga
Quando acessa o dashboard
Então vê receita do dia, meta mensal, ações, saúde do negócio

# Cenário 2: Staff vê Meu Dia
Dado que um staff loga
Quando acessa o dashboard
Então vê apenas agendamentos do dia e ganhos
E pode marcar como concluído com 1 toque

# Cenário 3: SetupCopilot
Dado que o owner completou onboarding
Mas não tem serviços cadastrados
Quando acessa o dashboard
Então vê SetupCopilot com milestone "services" pendente
```

## Prioridade

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Visão dual | Must | Core do produto |
| Meta mensal | Must | Motivação do owner |
| Meu Dia (staff) | Must | Principal ferramenta do staff |
| Financial Doctor | Should | Insights valiosos |
| Smart Rebooking | Could | Otimização |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `pages/Dashboard.tsx` | `Dashboard` | 🟢 |
| `hooks/useDashboardData.ts` | `useDashboardData` | 🟢 |
| `hooks/useMeuDiaData.ts` | `useMeuDiaData` | 🟢 |
| `hooks/useSmartRebooking.ts` | `useSmartRebooking` | 🟢 |
| `hooks/useFinancialDoctor.ts` | `useFinancialDoctor` | 🟢 |

---

*Gerado pelo Reversa Writer em 2026-05-06. Nível: Detalhado.*
