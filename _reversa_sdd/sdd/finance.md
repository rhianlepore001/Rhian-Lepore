# Financeiro (finance)

## Visão Geral
Sistema financeiro completo com visão dual (owner/staff), gestão de comissões por profissional, registro manual de receitas/despesas, taxas de maquininha, assinaturas Stripe, insights avançados e exportação CSV. Owner vê dashboard financeiro completo com tabs (Visão Geral, Insights, Comissões, Histórico); staff vê apenas seus próprios atendimentos e ganhos.

## Responsabilidades
- Registrar receitas automáticas (de appointments) e manuais
- Registrar despesas com status paid/pending
- Calcular comissões por profissional com período de acerto configurável
- Aplicar taxa de maquininha (débito/crédito) no cálculo de comissão
- Liquidar comissões em lote via RPC
- Gerar relatório detalhado de comissões por profissional
- Compartilhar resumo de comissões via WhatsApp/cópia/imagem
- Fornecer insights financeiros (projeção, taxa de retorno, horário de pico, ranking)
- Gerenciar assinaturas Stripe (planos Solo/Team, checkout, auto-provisionamento)
- Exportar transações em CSV

## Interface

### Entradas
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| type | 'revenue' \| 'expense' | Tipo de transação |
| amount | numeric | Valor |
| payment_method | 'pix' \| 'dinheiro' \| 'debito' \| 'credito' \| 'mbway' | Método de pagamento |
| professional_id | uuid | Profissional vinculado |
| description | string | Descrição manual |
| due_date | ISO datetime | Vencimento (despesas pendentes) |
| commission_rate | numeric | Taxa de comissão (%) |
| machine_fee_percent | numeric | Taxa de maquininha (%) |
| settlement_day | integer | Dia do mês para acerto (1-28) |
| price_id | string | ID do preço no Stripe |

### Saídas
| Saída | Tipo | Descrição |
|-------|------|-----------|
| FinanceStats | object | Receita, despesas, lucro, comissões pendentes |
| Transaction[] | object[] | Lista de transações |
| CommissionDue[] | object[] | Comissões pendentes por profissional |
| CommissionPayment | object | Registro de pagamento de comissão |
| Insight[] | object[] | Insights financeiros |
| MonthlyHistory | object[] | Histórico mensal (12 meses) |

## Regras de Negócio
- **R63** Owner vê tudo; staff vê apenas transações do próprio `professional_id` (`teamMemberId`). Nunca filtrar por nome. 🟢
- **R64** Staff não vê abas de Comissões, Histórico nem Insights. 🟢
- **R65** Período de comissão baseado em `business_settings.commission_settlement_day_of_month` (default: 5). Se o dia configurado não existir no mês (ex: 31 em meses com 30 dias, ou fevereiro), usar o último dia válido do mês. 🟢
- **R66** Comissão = taxa × base de cálculo; base pode descontar taxa de maquininha se `machine_fee_enabled=true`. 🟢
- **R67** Owner pode pagar comissões em lote via RPC `mark_commissions_as_paid`, que marca records e cria `commission_payments`. 🟢
- **R68** Transações manuais são INSERT diretamente em `finance_records`, sem appointment vinculado. 🟢
- **R69** Deleção de receita automática = deletar appointment vinculado. 🟢
- **R70** Despesas pendentes podem ser liquidadas via RPC `mark_expense_as_paid`. 🟢
- **R71** Taxa de maquininha: `debit_fee_percent` para débito, `credit_fee_percent` para crédito. 🟢
- **R72** Exportação CSV: formato Data, Descrição, Tipo, Valor. 🟢
- **R73** Assinatura via Stripe Checkout Session com auto-provisionamento de customer. 🟢
- **R74** Preços regionais: BR (R$34,90 Solo / R$59,90 Team) e PT (€9,90 Solo / €19,90 Team). 🟢
- **R75** Owner pode definir taxa de comissão inline ao pagar (se profissional sem taxa). 🟢
- **R76** Compartilhamento de resumo de comissão via WhatsApp/cópia/imagem (html2canvas). 🟢
- **R77** Region awareness: moeda (R$/€), métodos de pagamento (Pix/MBWay). 🟢
- **R78** Self-repair de commission records: se `finance_record_id` não existe ao editar, cria automaticamente. 🟢

## Fluxo Principal

### Visão Geral (Owner)
1. Calcula `startOfMonth` e `endOfMonth`
2. Chama RPC `get_finance_stats(p_user_id, p_start_date, p_end_date)`
3. Se owner: chama novamente com mês anterior para calcular growth%
4. Mapeia transações: tipo `revenue`/`expense`
5. Filtros client-side: `filterType` e `filterPaymentMethod`
6. Renderiza: Cards Resumo + Gráfico + Tabela

### Gestão de Comissões
1. Chama RPC `get_commissions_due(p_user_id)`
2. Busca CPF em `team_members`
3. Filtra `is_owner === false`
4. Exibe cards por profissional: saldo, faturação, liquidado, serviços pendentes
5. Owner clica "Pagar":
   - Se profissional sem `commission_rate`: prompt inline para definir%
   - Calcula período de acerto (`calcCommissionPeriod`)
   - Soma `commission_value` pendentes no período
   - Confirma pagamento
   - RPC `mark_commissions_as_paid`

### Nova Transação Manual
1. Botão "Nova Transação"
2. Seleciona tipo (Receita/Despesa)
3. Se despesa: status (Pago/Pendente)
4. Preenche valor, método, descrição
5. INSERT em `finance_records`
6. Refresh

### Assinatura Stripe
1. Owner clica "Assinar"
2. Edge Function `create-checkout-session`
3. Verifica `STRIPE_SECRET_KEY`, autentica usuário
4. Se `profiles.stripe_customer_id` não existe: busca/cria no Stripe
5. Salva `stripe_customer_id` no profile
6. Cria `stripe.checkout.sessions.create`
7. Redireciona para URL do checkout

## Fluxos Alternativos
- **[Deletar transação automática]:** Deleta `finance_record` + `appointment` vinculado. 🟢
- **[Deletar transação manual]:** Deleta apenas `finance_record`. 🟢
- **[Editar comissão inline sem finance_record]:** Auto-repair: INSERT em `finance_records`. 🟢
- **[Staff acessa /financeiro]:** Vê apenas "Meu Financeiro" filtrado por `professional_id` (`teamMemberId`). Nunca por nome. 🟢

## Notas de Escopo Validadas

- **Comissão com múltiplos profissionais:** Não é suportado hoje. O modelo atual considera 1 profissional principal por agendamento via `appointments.professional_id`. A comissão é calculada para esse profissional sobre o valor/base do agendamento. Para múltiplos profissionais no mesmo atendimento, seria necessário modelar serviços por profissional (ex: tabela `appointment_services`).

## Cenários de Borda

### B1 — Comissão com maquininha habilitada
- **Condição:** `machine_fee_enabled=true`, pagamento em cartão.
- **Comportamento:** `commission_base = price - (price × machine_fee_percent / 100)`.
- **Impacto:** Comissão é menor do que seria sem taxa.
- **Risco:** Baixo — comportamento intencional.

### B2 — Período de acerto em dia inexistente no mês
- **Condição:** `settlement_day = 31` mas o mês atual tem 30 dias (ou fevereiro).
- **Comportamento:** Deve usar o último dia válido do mês (dia 30, 28 ou 29). Essa regra evita pular acertos para o mês seguinte.
- **Impacto:** Garante que o acerto ocorra sempre no mês corrente.
- **Risco:** Baixo — comportamento a ser implementado na lógica de cálculo de período.

### B3 — Deletar finance_record de appointment já deletado
- **Condição:** Owner deleta `finance_record`, mas `appointment` já foi deletado.
- **Comportamento:** Tentativa de deletar appointment falha silenciosamente.
- **Impacto:** `finance_record` é deletado, mas não há erro.
- **Risco:** Baixo — graceful failure.

## Dependências
- `lib/supabase.ts` — cliente Supabase
- `contexts/AuthContext.tsx` — `useAuth`
- `hooks/useSubscription.ts` — status de assinatura
- `recharts` — gráficos
- `@stripe/stripe-js` — Stripe
- `html2canvas` — exportação de imagem

## Critérios de Aceitação

```gherkin
# Cenário 1: Registrar despesa pendente
Dado que o owner está na aba Visão Geral
Quando clica em "Nova Transação" e seleciona "Despesa Pendente"
E preenche valor e vencimento
Então o sistema cria finance_record com status "pending"

# Cenário 2: Pagar comissões em lote
Dado que existem comissões pendentes para 2 profissionais
Quando o owner clica em "Pagar Comissões"
E confirma o pagamento
Então o sistema marca records como commission_paid=true
E cria registros em commission_payments

# Cenário 3: Assinatura Stripe
Dado que o owner seleciona plano Equipe
Quando clica em "Assinar"
Então o sistema redireciona para checkout do Stripe
E após pagamento, subscription_status muda para "active"
```

## Prioridade

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Registrar transações | Must | Core financeiro |
| Comissões | Must | Gestão de equipe |
| Assinatura Stripe | Must | Monetização |
| Insights | Should | Valor agregado |
| Exportação CSV | Could | Conveniência |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `pages/Finance.tsx` | `Finance`, `fetchFinanceData` | 🟢 |
| `components/CommissionsManagement.tsx` | `fetchCommissionsDue`, `handlePayCommissions` | 🟢 |
| `components/CommissionDetailReport.tsx` | `fetchRecords` | 🟢 |
| `components/ProfessionalCommissionDetails.tsx` | `handleUpdateCommission` | 🟢 |
| `pages/settings/SubscriptionSettings.tsx` | `handleSubscribe` | 🟢 |
| `supabase/functions/create-checkout-session/index.ts` | Edge Function | 🟢 |

---

*Gerado pelo Reversa Writer em 2026-05-06. Nível: Detalhado.*
