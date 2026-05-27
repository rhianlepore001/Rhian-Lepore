# Fluxograma — Módulo finance

> Gerado pelo Archaeologist em 2026-05-03
> Nível de documentação: **Detalhado**

---

## Fluxo Principal — Finance (Owner)

```mermaid
flowchart TD
    A[Owner acessa /financeiro] --> B[fetchFinanceData]
    B --> C{Mês/Ano selecionado}
    C --> D[RPC: get_finance_stats]
    D --> E[Dados do mês atual]
    E --> F[Mês anterior? get_finance_stats again]
    F --> G[Calcular growth%]
    G --> H[Atualizar summary + transactions]
    H --> I{Tab ativa?}
    
    I -->|Overview| J[Render: Cards Resumo + Gráfico + Tabela]
    I -->|Insights| K[FinanceInsights: Projeção, Retorno, Pico, Rankings]
    I -->|Commissions| L[CommissionsManagement]
    I -->|History| M[MonthlyHistory: Últimos 12 meses]
    
    J --> J1[Card Receita]
    J --> J2[Card Despesas Pagas]
    J --> J3[Card Lucro Líquido + Margem%]
    J --> J4[Card Atendimentos + Ticket Médio]
    J --> J5[Receita por Método: Pix/MBWay/Dinheiro/Cartão]
    J --> J6[AreaChart Entradas/Saídas]
    J --> J7[Tabela Transações Recentes]
```

---

## Fluxo Principal — Finance (Staff)

```mermaid
flowchart TD
    A[Staff acessa /financeiro] --> B[fetchFinanceData]
    B --> C[Query com company_id do owner]
    C --> D[Filtrar apenas transações do próprio fullName]
    D --> E[Resumo: Meu Giro + Atendimentos]
    E --> F[Tab única: Meu Financeiro]
```

---

## Fluxo — Gestão de Comissões

```mermaid
flowchart TD
    A[Tab Comissões] --> B[fetchCommissionsDue]
    B --> C[RPC: get_commissions_due]
    C --> D[Buscar CPF em team_members]
    D --> E[Filtrar is_owner === false]
    E --> F[Exibir cards por profissional]
    
    F --> G{Ação do owner}
    G -->|Pagar| H{Profissional tem commission_rate?}
    H -->|Não| I[Prompt inline: definir taxa%]
    I --> J[Salvar em team_members.commission_rate]
    J --> K[Recalcular pending comissões]
    K --> L[Abrir Modal de Pagamento]
    H -->|Sim| L
    
    L --> M[calcCommissionPeriod: calcular início/fim]
    M --> N[calculateAmountForDates: somar commission_value pendentes]
    N --> O[Confirmar pagamento]
    O --> P[RPC: mark_commissions_as_paid]
    P --> Q[Atualizar comissões]
    
    G -->|Serviços| R[ProfessionalCommissionDetails]
    R --> S[Query: appointments + finance_records]
    S --> T[Editar comissão inline]
    T --> U{Tem finance_record_id?}
    U -->|Sim| V[RPC: update_commission_record]
    U -->|Não| W[Auto-repair: INSERT em finance_records]
    
    G -->|Relatório| X[CommissionDetailReport]
    X --> Y[Query: finance_records + appointments.machine_fee]
    Y --> Z[Calcular: base = price - machine_fee_amount]
    Z --> AA[Calcular: commission = base × rate%]
    
    G -->|Histórico| AB[CommissionPaymentHistory]
    AB --> AC[Query: commission_payments where status=paid]
```

---

## Fluxo — Comissão com Maquininha

```mermaid
flowchart TD
    A[Appointment Completed com pagamento cartão] --> B[Finança: commission_detail_report]
    B --> C{machine_fee_enabled?}
    C -->|Sim| D[commission_base = price × 1 - machine_fee_percent / 100]
    C -->|Não| E[commission_base = price]
    D --> F[commission_value = commission_base × commission_rate / 100]
    E --> F
    F --> G[Gravar em finance_records]
```

---

## Fluxo — Nova Transação Manual

```mermaid
flowchart TD
    A[Botão Nova Transação] --> B[Buscar dropdowns: services, clients, team_members]
    B --> C{Tipo?}
    C -->|Receita| D[Tipo=revenue, payment_method=Dinheiro, commission_paid=true]
    C -->|Despesa| E{Status?}
    E -->|Pago| F[commission_paid=true, commission_paid_at=now]
    E -->|Pendente| G[commission_paid=false, due_date preenchido]
    D --> H[INSERT em finance_records]
    F --> H
    G --> H
    H --> I[fetchFinanceData refresh]
```

---

## Fluxo — Deletar Transação

```mermaid
flowchart TD
    A[Deletar transação] --> B[Buscar em finance_records por id]
    B --> C{Encontrado em finance_records?}
    C -->|Sim| D{Tem appointment_id?}
    D -->|Sim| E[Deletar appointment vinculado]
    D -->|Não| F[Não deletar appointment]
    E --> G[Deletar finance_record]
    F --> G
    C -->|Não| H[Buscar em appointments por id]
    H --> I{Encontrado em appointments?}
    I -->|Sim| J[Deletar appointment]
    I -->|Não| K[Alertar: já foi excluída]
    G --> L[Refresh]
    J --> L
```

---

## Fluxo — Assinatura Stripe

```mermaid
flowchart TD
    A[User clica em Assinar] --> B[SubscriptionSettings.handleSubscribe]
    B --> C[supabase.functions.invoke create-checkout-session]
    C --> D[Edge Function: verifica STRIPE_SECRET_KEY]
    D --> E[Auth: getUser]
    E --> F{profiles.stripe_customer_id existe?}
    F -->|Não| G[Buscar customer por email no Stripe]
    G --> H{Encontrado?}
    H -->|Sim| I[Usar customer existente]
    H -->|Não| J[Criar novo customer no Stripe]
    I --> K[Salvar stripe_customer_id no profile]
    J --> K
    F -->|Sim| K
    K --> L[stripe.checkout.sessions.create]
    L --> M[Retornar URL do checkout]
    M --> N[Redirecionar usuário]
```

---

## Fluxo — Período de Acerto (calcCommissionPeriod)

```mermaid
flowchart TD
    A[calcCommissionPeriod settlementDay] --> B{Hoje > settlementDay?}
    B -->|Sim| C[Período: settlementDay+1 do mês passado até settlementDay deste mês]
    B -->|Não| D[Período: settlementDay+1 de 2 meses atrás até settlementDay do mês passado]
    C --> E[Retornar start, end, label]
    D --> E
```

---

## Fluxo — Insights Financeiros

```mermaid
flowchart TD
    A[Tab Insights] --> B[FinanceInsights component]
    B --> C[Projeção Mensal: se dia > 15, revenue/dia × diasNoMês]
    B --> D[Taxa de Retorno: clientes com >1 transação / total únicos × 100]
    B --> E[Horário de Pico: hora com mais transações de receita]
    B --> F[Ranking Profissionais: receita agrupada por professionalName]
    B --> G[Top 5 Serviços: receita agrupada por serviceName]
    B --> H[Breakdown por Forma de Pagamento: pix/mbway, dinheiro, cartão]
    B --> I[Visão Anual: BarChart 12 meses com toggle despesas]
    B --> J[Melhor/pior mês, média mensal]
```