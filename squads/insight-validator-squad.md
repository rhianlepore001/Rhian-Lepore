# 🔍 Insight Validator Squad — AgenX AIOS
# Squad ID: insight-validator-v1
# Versão: 1.0 | Data: 09/03/2026
# Formato: AIOS Squad 2.1

## Metadados do Squad

```yaml
squad:
  id: insight-validator-v1
  name: "Insight Validator Squad"
  description: >
    Squad especializado na frente de Relatórios e Dados do AgenX (Beauty OS).
    Não valida UX — valida qualidade dos dados apresentados: se os números
    estão certos, se os insights de IA fazem sentido de negócio e se o app
    se comporta corretamente quando os dados estão zerados.
    O problema dos relatórios é diferente de todas as outras telas — um bug
    aqui não é visual, é invisível: o dono do salão toma decisões erradas
    baseado em números errados.
  version: "1.0.0"
  domain: data-quality
  created_at: "2026-03-09"
  status: active
  author: squad-creator-agent
  target_product: "AgenX / Beauty OS — Frente de Relatórios e Dados"
  scope_pages:
    - Reports.tsx          # Página principal de insights (owner only)
    - Finance.tsx          # Dashboard financeiro
    - Dashboard.tsx        # Métricas de home (profit, churn, revenue diário)
    - ClientCRM.tsx        # Histórico e análise por cliente
  scope_components:
    - ChurnRadar.tsx
    - FinancialDoctorPanel.tsx
    - ProfitMetrics.tsx
    - AIOSCampaignStats.tsx
    - AISemanticInsights.tsx
    - MeuDiaWidget.tsx
    - GoalHistoryModal.tsx
    - MonthlyProfitModal.tsx
```

---

## Por que este Squad existe

```yaml
problem_statement:
  type: "Data Quality — não é UX"
  why_different:
    - "Um botão quebrado o usuário vê e reporta imediatamente"
    - "Um número errado o usuário acredita e toma decisão errada"
    - "Insight de IA incorreto parece certo — ninguém questiona"
    - "Empty state mal tratado parece dado zerado real — gera confusão"

  real_risks_for_agenx:
    - "Dono do salão acredita ter faturado R$5.000 quando faturou R$3.000"
    - "ChurnRadar não detecta cliente em risco — churn ocorre invisível"
    - "FinancialDoctor recomenda reduzir serviço X sem dados suficientes"
    - "Novo tenant vê gráfico vazio e acha que o app está quebrado"
    - "Comissão calculada errada — conflito com funcionário"

  data_sources_at_risk:
    supabase_tables:
      - finance_records     # Receitas e despesas — fonte do Finance.tsx
      - appointments        # Agendamentos — base de quase todos os cálculos
      - commissions         # Comissões — impacto direto na folha
      - clients             # Base para churn e CRM
      - content_calendar    # Stats de campanha marketing
    ai_sources:
      - gemini_api          # Insights do Financial Doctor e AI Assistant
      - semantic_memory     # Memória semântica de clientes (US-001)
```

---

## Agentes do Squad

### 1. 🎛️ Orchestrator Agent
```yaml
agent:
  id: insight-orchestrator
  role: "Define cenários de teste com dados reais e vazios, coordena os agentes e consolida veredicto"
  skill: data-test-orchestration
  rpc: run_insight_validation
  trigger: manual | post_deploy | weekly | data_migration
  input:
    - scope: "full" | "finance" | "reports" | "dashboard" | "crm"
    - tenant_id: uuid          # Tenant real para testar com dados reais
    - test_mode: "real_data" | "empty_data" | "edge_cases" | "all"
    - period: "today" | "week" | "month" | "year"
  output:
    - scenarios_created: number
    - agents_dispatched: list
    - data_issues_found: list
    - insight_issues_found: list
    - empty_state_issues_found: list
    - overall_verdict: "pass" | "review" | "fail"
    - report_path: string
```

**Cenários de Teste Definidos:**
```yaml
test_scenarios:
  real_data:
    scenario_A:
      name: "Tenant com 1 mês de dados"
      description: "Salão novo — poucos agendamentos, poucos clientes"
      risk: "Médias e percentuais com amostras pequenas podem enganar"
      check_for:
        - "Divisão por N pequeno não gera número absurdo"
        - "Insights de IA não extrapolam com poucos dados"
        - "ChurnRador não marca todo mundo como risco com base em 2 clientes"

    scenario_B:
      name: "Tenant com 12 meses de dados"
      description: "Salão estabelecido — dados históricos completos"
      risk: "Agregações de longo prazo podem ter erros de arredondamento acumulados"
      check_for:
        - "Total anual = soma dos 12 meses individuais"
        - "Média mensal = total anual / 12 (ou / meses com dados)"
        - "Comissão acumulada bate com a soma das comissões individuais"

    scenario_C:
      name: "Tenant com dados do mês atual incompletos"
      description: "Estamos no dia 9 — mês corrente tem só 9 dias de dados"
      risk: "Projeções e comparações de período podem ser enganosas"
      check_for:
        - "Comparativo 'vs mês anterior' deixa claro que mês atual é parcial"
        - "Projeção do FinancialDoctor é sinalizada como estimativa"
        - "Meta mensal não é calculada como já perdida com 9 dias"

  empty_data:
    scenario_D:
      name: "Tenant zero — acabou de fazer onboarding"
      description: "Sem agendamentos, sem clientes, sem transações"
      risk: "App parece quebrado ou mostra NaN/undefined/0% de forma confusa"

    scenario_E:
      name: "Tenant com dados em uma categoria, zero em outra"
      description: "Tem agendamentos mas sem despesas cadastradas"
      risk: "Margem calculada como 100% quando deveria ser inconclusiva"

    scenario_F:
      name: "Tenant sem dados no período selecionado"
      description: "Tem dados históricos mas filtrou um mês sem movimento"
      risk: "Diferente de 'sem dados' — o filtro é que está vazio"

  edge_cases:
    scenario_G:
      name: "Valores extremos"
      description: "R$0.01 de receita, ou R$50.000 em um dia, ou 0 clientes"
      risk: "Formatação, casas decimais, overflow visual"

    scenario_H:
      name: "Multi-tenant isolation check"
      description: "Verificar que dados de tenant A não aparecem em tenant B"
      risk: "Bug crítico de segurança — não é UX, é compliance"
```

**Prompt Template:**
```
Execute validação de dados do AgenX na frente: {scope}.
Modo: {test_mode}. Período: {period}.

Para cada cenário de teste:
1. Monte os dados de input (ou simule o estado)
2. Despache Data Agent → verificar cálculos exatos
3. Despache Insight Agent → verificar lógica dos insights gerados
4. Despache Empty State Agent → verificar comportamento sem dados

Consolide: o usuário vê os dados corretos? Os insights fazem sentido?
O app se comporta com dignidade quando não tem dados?
Emita veredicto: pass | review | fail com justificativa por cenário.
```

---

### 2. 🔢 Data Agent
```yaml
agent:
  id: data-agent
  role: "Verifica se os números exatos aparecem e são calculados corretamente em todas as telas de dados"
  skill: data-accuracy-validation
  rpc: validate_data_accuracy
  trigger: orchestrator_call | on_demand
  input:
    - page: string
    - component: string
    - test_scenario: object
    - expected_values: object    # Valores calculados manualmente para comparar
  output:
    - numbers_tested: number
    - discrepancies_found: list  # Valor esperado vs valor exibido
    - formatting_issues: list    # R$1000 vs R$1.000 vs 1000.00
    - calculation_bugs: list     # Fórmulas erradas detectadas
    - rounding_issues: list      # Arredondamentos incorretos
    - currency_issues: list      # Problemas de precisão em R$
    - percentage_issues: list    # % calculados incorretamente
    - verdict: "pass" | "review" | "fail"
```

**Checks por Componente:**
```yaml
data_checks:
  ProfitMetrics_tsx:
    formula: "lucro = receitas - despesas"
    edge_cases:
      - "receitas = 0, despesas = 0 → lucro = R$0,00 (não NaN, não vazio)"
      - "receitas = 500, despesas = 600 → lucro = -R$100,00 (negativo, não zero)"
      - "receitas = 1.500,75, despesas = 300,25 → lucro = R$1.200,50 (precisão decimal)"
    format_check:
      - "Valores negativos exibem sinal de menos"
      - "Valores > R$1.000 exibem separador de milhar"
      - "Casas decimais: sempre 2 (R$10,00 não R$10)"

  Finance_tsx:
    aggregations:
      - "Total do mês = soma de todas as finance_records do mês filtrado"
      - "Média diária = total / dias_com_movimento (não / dias_do_mês)"
      - "Comparativo % = (mês_atual - mês_anterior) / mês_anterior × 100"
    period_checks:
      - "Filtro 'Este mês' inclui o dia de hoje"
      - "Filtro 'Mês anterior' não inclui o mês atual"
      - "Filtro 'Ano' inclui Jan-Dez do ano corrente"

  ChurnRadar_tsx:
    formula: "cliente em risco = último agendamento > N dias (threshold configurável)"
    edge_cases:
      - "Cliente com 1 agendamento histórico e sumiu → deve aparecer como risco"
      - "Cliente com agendamento futuro marcado → NÃO deve aparecer como risco"
      - "Cliente novo (< 30 dias de cadastro) → comportamento definido?"
    percentage_check:
      - "% clientes em risco = clientes_em_risco / total_clientes × 100"
      - "0 clientes em risco → 0% (não vazio, não traço)"
      - "100 de 100 em risco → 100% (não '99%' por arredondamento)"

  commissions:
    formula: "comissão = valor_agendamento × percentual_comissão / 100"
    precision:
      - "R$150,00 × 30% = R$45,00 (não R$44,99 por float)"
      - "Comissão acumulada do mês = soma de todas as comissões individuais"
      - "Sem serviço com comissão definido → exibe R$0,00 (não NaN)"
    multi_professional:
      - "Comissão de cada profissional é calculada separadamente"
      - "Total da equipe = soma das comissões individuais"

  AIOSCampaignStats_tsx:
    metrics:
      - "Taxa de abertura WhatsApp = mensagens_abertas / mensagens_enviadas × 100"
      - "0 campanhas enviadas → todos os stats em 0 (não divisão por zero)"
      - "Campanhas do período selecionado = apenas as dentro do range de data"

  MonthlyProfitModal_tsx:
    chart_data:
      - "12 barras = 12 meses (não 11, não 13)"
      - "Meses sem dados = barra em zero (não ausentes do gráfico)"
      - "Mês atual com dados parciais = barra proporcional + sinalização"

  GoalHistoryModal_tsx:
    progress:
      - "% de meta atingida = valor_realizado / meta × 100"
      - "Valor realizado > meta → exibe > 100% (não clampa em 100%)"
      - "Meta = R$0 configurada → não exibe divisão por zero"
```

**Checklist de Formatação Monetária (Brasil):**
```yaml
currency_format_brazil:
  correct: "R$\u00a01.234,56"    # R$ + espaço + milhar com ponto + decimal com vírgula
  common_bugs:
    - "R$1234.56"                # Separador errado
    - "R$1,234.56"               # Formato americano
    - "R$ 1234"                  # Sem casas decimais
    - "1234.56"                  # Sem símbolo
    - "NaN"                      # Divisão por zero ou undefined
    - "Infinity"                  # Divisão por zero em porcentagem
    - ""                         # Vazio quando deveria ser R$0,00
  rule: "Usar Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'})"
```

**Prompt Template:**
```
Valide a precisão dos dados exibidos no AgenX para o cenário: {test_scenario}.

Para cada componente em escopo ({page}):
1. Execute os cálculos manualmente com os dados do cenário
2. Compare com os valores exibidos na tela (ou no output do componente)
3. Verifique formatação: R$ com vírgula decimal, ponto milhar, 2 casas sempre
4. Teste edge cases: 0, 1, negativo, decimal longo, valores > R$10.000

Documente cada discrepância como:
  - Esperado: {valor calculado manualmente}
  - Exibido: {valor na tela}
  - Diferença: {delta}
  - Componente: {arquivo.tsx + linha aproximada}
  - Severidade: bloqueante (número errado) | importante (formatação) | melhoria (arredondamento cosmético)
```

---

### 3. 🧠 Insight Agent
```yaml
agent:
  id: insight-agent
  role: "Avalia se os insights gerados pela IA fazem sentido de negócio real para salões e barbearias"
  skill: business-insight-validation
  rpc: validate_business_insights
  trigger: orchestrator_call | on_demand
  input:
    - insights_source: "financial_doctor" | "ai_assistant" | "churn_radar" | "marketing_ai" | "all"
    - tenant_data: object        # Dados reais do tenant para comparar com o insight
    - domain_context: object     # Contexto do negócio de salão/barbearia
  output:
    - insights_evaluated: number
    - insights_correct: list     # Insights que fazem sentido com os dados
    - insights_misleading: list  # Insights que contradizem os dados reais
    - insights_hallucinated: list # Insights sem base nos dados disponíveis
    - insights_generic: list     # Insights que não são personalizados ao tenant
    - tone_issues: list          # Insights alarmistas, vagos ou confusos
    - verdict: "pass" | "review" | "fail"
```

**Checks por Fonte de Insight:**
```yaml
insight_checks:
  FinancialDoctorPanel_tsx:
    validates:
      - "Recomendação de cortar serviço X: X é realmente o menos rentável?"
      - "Alerta de queda de receita: houve queda real no período?"
      - "Projeção de meta: baseada em histórico real ou inventada?"
      - "Sugestão de horário de pico: bate com os agendamentos do banco?"
    anti_patterns:
      - "Insight genérico que serve para qualquer salão sem personalização"
      - "Alerta dramático baseado em amostra de 3 dias"
      - "Recomendação que contradiz os dados exibidos na mesma tela"
      - "Projeção otimista sem base em histórico"
    example_bad:
      data: "Salão com R$2.000/mês nos últimos 3 meses"
      bad_insight: "Seu faturamento está crescendo consistentemente — parabéns!"
      why_bad: "3 meses iguais não é crescimento — é estabilidade"
      good_insight: "Seu faturamento está estável em R$2.000/mês. Para crescer, considere..."

  ChurnRadar_tsx:
    validates:
      - "Cliente marcado como risco realmente está sem agendamento há N dias?"
      - "Threshold de risco é coerente com o tipo de serviço? (cabelo: 45 dias, barba: 15 dias)"
      - "Cliente com agendamento futuro não aparece como risco?"
    anti_patterns:
      - "Marcar cliente novo (< 30 dias) como risco de churn"
      - "Alertar sobre churn de cliente que veio ontem"
      - "Porcentagem de risco sem contexto de tamanho da base"

  MeuDiaWidget_tsx:
    validates:
      - "Oportunidade listada tem base real nos dados do dia?"
      - "'Você tem 3 horários livres hoje' — realmente tem?"
      - "'Cliente X não vem há 60 dias' — a data é correta?"
    anti_patterns:
      - "Oportunidade que cita serviço que o salão não oferece"
      - "Sugestão para ligar para cliente que tem agendamento marcado hoje"

  AIAssistantChat_tsx:
    validates:
      - "Resposta sobre faturamento bate com Finance.tsx?"
      - "Resposta sobre clientes bate com Clients.tsx?"
      - "IA não inventa número que não existe no banco?"
    anti_patterns:
      - "Resposta confiante com dado errado"
      - "Resposta que mistura dados de tenants diferentes (multi-tenant leak)"
      - "Resposta vaga quando há dado concreto disponível"

  marketing_ai:
    validates:
      - "Ideia de post sugere serviço que o salão realmente oferece?"
      - "Campanha de reativação: os clientes listados estão realmente inativos?"
      - "Taxa de sucesso estimada tem base em dados históricos do tenant?"
    anti_patterns:
      - "Sugestão de campanha para serviço não cadastrado"
      - "Texto de reativação com nome errado do salão"
```

**Classificação de Severidade de Insight:**
```yaml
insight_severity:
  critical:
    - "Número errado apresentado como insight (faturamento, comissão)"
    - "Alerta de churn para cliente que veio ontem"
    - "Recomendação baseada em dados de outro tenant (multi-tenant bug)"
    action: "Bloquear release — insight incorreto gera decisão errada"

  important:
    - "Insight correto mas baseado em amostra insuficiente sem aviso"
    - "Projeção apresentada como certeza sem margem de erro"
    - "Insight genérico onde poderia ser personalizado"
    action: "Corrigir no próximo sprint — degrada confiança no produto"

  improvement:
    - "Insight correto mas poderia ser mais acionável"
    - "Tom poderia ser mais direto para o contexto de salão"
    - "Oportunidade de adicionar contexto ao número"
    action: "Backlog — melhoria de qualidade"
```

**Prompt Template:**
```
Avalie os seguintes insights gerados pelo AgenX para o tenant com os dados abaixo:

Dados reais do tenant:
{tenant_data}

Insights gerados pelo sistema:
{insights_generated}

Para cada insight:
1. O insight é factualmente correto com base nos dados reais?
2. A recomendação faz sentido para um salão/barbearia real?
3. O insight é personalizado ou genérico?
4. Se é uma projeção, ela tem base histórica suficiente?
5. O tom é adequado — não alarmista, não vago, não condescendente?

Classifique cada insight:
  - CORRETO: factual, personalizado, acionável
  - ENGANOSO: factualmente errado mas parece certo
  - ALUCINADO: sem base nos dados disponíveis
  - GENÉRICO: correto mas serve para qualquer negócio
  - ALARMISTA: correto mas tom inadequado

Domínio: salões de beleza e barbearias no Brasil.
Usuário alvo: dono de salão sem conhecimento técnico que confia no app para tomar decisões.
```

---

### 4. 🫙 Empty State Agent
```yaml
agent:
  id: empty-state-agent
  role: "Testa como o AgenX se comporta quando os dados estão zerados — novo tenant ou período sem movimento"
  skill: empty-state-testing
  rpc: test_empty_states
  trigger: orchestrator_call | on_demand | post_onboarding_flow
  input:
    - scope: "all" | "finance" | "reports" | "dashboard" | "crm" | "agenda"
    - empty_type: "new_tenant" | "empty_period" | "partial_data" | "all"
    - tenant_profile: "new" | "established_no_movement" | "partial"
  output:
    - empty_states_tested: number
    - render_bugs: list          # NaN, undefined, Infinity, null exibidos
    - missing_empty_states: list # Tela que deveria ter empty state mas não tem
    - confusing_empty_states: list # Empty state que parece bug
    - good_empty_states: list    # Exemplos de empty state bem feito
    - chart_behaviors: list      # Como Recharts se comporta com dados vazios
    - verdict: "pass" | "review" | "fail"
```

**Cenários de Empty State por Página:**
```yaml
empty_state_scenarios:
  Dashboard_tsx:
    new_tenant_no_data:
      components_affected:
        DashboardHero:
          expected: "Mensagem de boas-vindas + CTA para primeiro agendamento"
          bad: "Widget vazio ou erro JavaScript"

        ProfitMetrics:
          expected: "R$0,00 com mensagem contextual 'Nenhum agendamento ainda'"
          bad: "NaN | undefined | vazio | tela em branco"

        ChurnRadar:
          expected: "Empty state explicando que aparecerá após primeiro mês"
          bad: "0% de churn como se fosse informação real | gráfico vazio sem contexto"

        MeuDiaWidget:
          expected: "Sugestão de próximo passo (configurar serviços, compartilhar link)"
          bad: "Lista vazia | insight sobre 0 agendamentos que não agrega valor"

        ActionCenter:
          expected: "Ações de setup inicial — não ações de análise"
          bad: "Lista vazia | ações irrelevantes para quem não tem dados ainda"

  Finance_tsx:
    empty_period:
      components_affected:
        revenue_chart:
          expected: "Recharts exibe barras em zero com label 'Sem dados neste período'"
          bad: "Gráfico desaparece | erro de render | linha no zero sem explicação"

        expense_list:
          expected: "Empty state 'Nenhuma despesa registrada neste período' + botão para adicionar"
          bad: "Lista vazia sem contexto | mensagem de erro"

        profit_calculation:
          expected: "R$0,00 (não NaN, não vazio, não Infinity se despesas > 0 sem receita)"
          bad: "NaN | undefined | crash | -Infinity"

    partial_data_finance:
      scenario: "Tem receitas mas sem despesas cadastradas"
      expected:
        - "Margem não é calculada como 100% (seria enganoso)"
        - "FinancialDoctor avisa: 'Despesas não cadastradas — análise incompleta'"
      bad:
        - "Margem = 100% apresentada como dado real"
        - "Financial Doctor faz recomendação sem avisar sobre dados incompletos"

  Reports_tsx:
    new_tenant:
      expected:
        - "Tela explica o que os relatórios mostrarão quando houver dados"
        - "CTA contextual para começar a usar o app"
        - "Preview/mockup de como ficará quando tiver dados (opcional mas melhor)"
      bad:
        - "Tela em branco"
        - "Gráficos em zero sem explicação"
        - "Mensagem de erro"

    empty_month:
      scenario: "Salão estabelecido que não operou em um mês específico"
      expected:
        - "Dados zerados com mensagem 'Sem atividade em {mês}'"
        - "Comparativo com período anterior mostra -100%"
        - "FinancialDoctor não faz recomendação baseada em dados vazios"
      bad:
        - "Dados do mês anterior vazando para o filtro do mês selecionado"
        - "Porcentagem calculada incorretamente com base zero"

  ClientCRM_tsx:
    no_clients:
      expected:
        - "Empty state explicando a feature de CRM + CTA para adicionar cliente"
        - "Busca retorna 'Nenhum cliente encontrado' sem erro"
      bad:
        - "Lista vazia sem contexto"
        - "Crash na busca com lista vazia"

    client_no_history:
      scenario: "Cliente cadastrado sem agendamentos ainda"
      expected:
        - "Histórico vazio com mensagem contextual"
        - "Análise semântica diz 'Sem histórico ainda' não interpreta dados vazios"
      bad:
        - "AISemanticInsights tenta analisar dados que não existem"

  Agenda_tsx:
    no_appointments_today:
      expected:
        - "Dia vazio com slot disponíveis visíveis"
        - "CTA para criar primeiro agendamento"
        - "TimeGrid renderiza sem erros com array vazio"
      bad:
        - "TimeGrid quebra com array vazio"
        - "Tela em branco"
        - "Mensagem de erro"
```

**Checks Técnicos de Render com Dados Vazios:**
```yaml
technical_empty_checks:
  recharts_behavior:
    test: "Passar array [] para cada gráfico Recharts"
    components_at_risk:
      - "ChurnRadar.tsx — RadarChart com data=[]"
      - "FinancialDoctorPanel.tsx — LineChart com data=[]"
      - "MonthlyProfitModal.tsx — BarChart com data=[]"
      - "GoalHistoryModal.tsx — AreaChart com data=[]"
    expected_behavior: "Renderiza eixos vazios ou empty state — nunca crash"
    common_bug: "TypeError: Cannot read property 'x' of undefined"

  javascript_safety:
    patterns_at_risk:
      - "array.reduce() em array vazio → deve ter valor inicial"
      - "dados[0].valor quando dados é [] → undefined.valor = crash"
      - "total / count quando count = 0 → Infinity ou NaN"
      - "Math.max(...[]) → -Infinity (exibido como -∞)"
    solution: "Optional chaining (?.), nullish coalescing (??), guards de array vazio"

  typescript_guards:
    - "Props de componentes com dados opcionais devem ter default values"
    - "finance_records?.length ?? 0 (não finance_records.length)"
    - "appointments?.[0]?.created_at ?? 'Sem dados'"
```

**Prompt Template:**
```
Teste o comportamento do AgenX com dados zerados no escopo: {scope}.
Tipo de empty: {empty_type}. Perfil do tenant: {tenant_profile}.

Para cada componente no escopo:
1. Simule o cenário de dados vazios (array [], 0, null, undefined)
2. Verifique se o componente renderiza sem crash (TypeError, ReferenceError)
3. Avalie se o empty state comunica o que está acontecendo (vs. parece bug)
4. Para Recharts: verificar comportamento com data=[] explicitamente
5. Para cálculos: verificar divisão por zero, Math.max de array vazio

Classifique cada empty state:
  - BOM: renderiza, comunica, orienta o próximo passo
  - CONFUSO: renderiza mas parece bug ou dado zerado real
  - AUSENTE: deveria ter empty state mas não tem
  - QUEBRADO: crash ou NaN/undefined visível

Prioridade máxima: tela que quebra (crash) > tela que exibe NaN > tela confusa > tela sem CTA.
```

---

## Tasks do Squad

```yaml
tasks:
  - id: full-insight-validation
    name: "Validação Completa de Dados e Insights"
    agent: insight-orchestrator
    trigger: manual | weekly | post_data_migration
    scope: full
    test_mode: all
    timeout: 1200s

  - id: post-deploy-data-check
    name: "Check de Dados Pós-Deploy"
    agent: insight-orchestrator
    trigger: post_deploy
    scope: dashboard
    test_mode: real_data
    priority: critical_only
    timeout: 300s

  - id: new-tenant-empty-state-check
    name: "Validação de Empty States para Novo Tenant"
    agent: empty-state-agent
    trigger: post_onboarding | manual
    empty_type: new_tenant
    scope: all
    timeout: 600s

  - id: financial-doctor-audit
    name: "Auditoria de Insights do Financial Doctor"
    agent: insight-agent
    trigger: manual | monthly
    insights_source: financial_doctor
    timeout: 300s

  - id: data-accuracy-finance
    name: "Verificação de Precisão — Módulo Financeiro"
    agent: data-agent
    trigger: manual | post_formula_change
    page: Finance.tsx
    component: all
    timeout: 240s

  - id: churn-radar-audit
    name: "Auditoria do ChurnRadar"
    agent: data-agent + insight-agent
    trigger: manual | monthly
    components: [ChurnRadar.tsx]
    timeout: 300s

  - id: multi-tenant-data-isolation
    name: "Verificação de Isolamento Multi-Tenant nos Dados"
    agent: insight-orchestrator
    trigger: weekly | post_rls_change
    test_mode: real_data
    priority: critical
    timeout: 600s
    note: "Verificar que dados do tenant A não vazam para tenant B"
```

---

## Workflows do Squad

### Validação Completa (Semanal)
```yaml
workflow:
  id: weekly-data-validation
  name: "Validação Semanal de Dados e Insights"
  trigger: cron_weekly | manual
  estimated_duration: "2-3h"
  steps:
    1_orchestrate:
      agent: insight-orchestrator
      scope: full
      test_mode: all
    2_parallel:
      parallel: true
      depends_on: [1_orchestrate]
      agents:
        data_agent:
          scope: [Finance.tsx, Dashboard.tsx, Reports.tsx]
          test_scenarios: [A, B, C, G]
        insight_agent:
          sources: [financial_doctor, churn_radar, ai_assistant]
        empty_state_agent:
          scope: all
          empty_type: all
    3_report:
      agent: insight-orchestrator
      action: consolidate_and_report
      depends_on: [2_parallel]
      output: data-quality-report.md
```

### Check Rápido Pós-Deploy
```yaml
workflow:
  id: post-deploy-data-check
  name: "Data Quality Check Pós-Deploy"
  trigger: post_deploy
  estimated_duration: "20min"
  steps:
    1_critical_numbers:
      agent: data-agent
      pages: [Dashboard.tsx, Finance.tsx]
      test_mode: real_data
      priority: critical_only
    2_empty_state_smoke:
      agent: empty-state-agent
      scope: dashboard
      empty_type: new_tenant
    3_verdict:
      agent: insight-orchestrator
      action: emit_pass_or_fail
      depends_on: [1_critical_numbers, 2_empty_state_smoke]
```

### Auditoria de Onboarding de Novo Tenant
```yaml
workflow:
  id: new-tenant-validation
  name: "Validação de Experiência do Novo Tenant"
  trigger: post_onboarding_completed | manual
  estimated_duration: "30min"
  focus: "O que o dono de salão vê nos primeiros 10 minutos"
  steps:
    1_empty_states:
      agent: empty-state-agent
      empty_type: new_tenant
      scope: [Dashboard.tsx, Finance.tsx, Agenda.tsx, Reports.tsx]
    2_first_insight:
      agent: insight-agent
      scenario: "tenant com 0 dados"
      focus: "AI não deve fazer recomendações baseadas em nada"
    3_first_numbers:
      agent: data-agent
      scenario: "zeros e empty arrays"
      focus: "R$0,00 deve aparecer, não NaN"
    4_report:
      format: "checklist de onboarding UX + data quality"
```

---

## Formato do Relatório Final

```markdown
# 🔍 Insight Validator Report — AgenX
**Data:** {date} | **Escopo:** {scope} | **Veredicto:** {verdict}

## 📊 Resumo Executivo
- **Números verificados:** {numbers_tested}
- **Discrepâncias encontradas:** {discrepancies_count}
- **Insights avaliados:** {insights_evaluated}
- **Insights problemáticos:** {problematic_insights}
- **Empty states testados:** {empty_states_tested}
- **Empty states ausentes ou quebrados:** {broken_empty_states}

## 🔴 Bloqueantes (corrigir antes do próximo release)
| Componente | Problema | Esperado | Encontrado | Severidade |
|-----------|---------|---------|-----------|-----------|
| ProfitMetrics.tsx | Lucro exibe NaN quando despesas > receitas | -R$100,00 | NaN | Bloqueante |

## 🟡 Importantes (próximo sprint)
...

## 🟢 Melhorias (backlog)
...

## 🫙 Empty States
| Página | Cenário | Comportamento | Classificação |
|--------|---------|--------------|--------------|
| Finance.tsx | Novo tenant | Exibe R$0,00 + mensagem | ✅ Bom |
| Reports.tsx | Mês sem dados | Tela em branco | ❌ Ausente |

## 🧠 Insights Avaliados
| Fonte | Insight | Dados Reais | Classificação |
|-------|---------|------------|--------------|
| FinancialDoctor | "Seu faturamento cresceu" | Estável há 3 meses | ⚠️ Enganoso |
| ChurnRadar | "3 clientes em risco" | Confirmado nos dados | ✅ Correto |
```

---

## Integrações

| Serviço | Uso | Status |
|---------|-----|--------|
| **Supabase** | Consulta dados reais dos tenants para validação | ✅ Ativo |
| **Gemini API** | Avalia outputs do Financial Doctor e AI Assistant | ✅ Ativo |
| **Recharts** | Testa comportamento com data=[] em cada gráfico | ✅ Ativo |
| **GitHub Issues** | Cria issues para bugs de dados encontrados | ✅ Ativo |
| **UX Audit Squad** | Recebe contexto de problemas visuais que podem mascarar bugs de dados | 📋 Opcional |
| **Build Validation Squad** | Alimenta com critérios de aceite de precisão de dados | ✅ Ativo |

---

## Métricas de Sucesso do Squad

```yaml
success_metrics:
  data_accuracy:
    number_discrepancy_rate: "0 bloqueantes em produção"
    currency_format_compliance: "100%"
    division_by_zero_occurrences: "0"
    nan_in_ui: "0"

  insight_quality:
    misleading_insights_in_prod: "0"
    hallucination_rate: "< 2%"
    generic_insight_rate: "< 20%"  # A maioria deve ser personalizada

  empty_states:
    missing_empty_state_rate: "0 em flows principais"
    crash_on_empty_data: "0"
    user_confusion_rate: "< 10%"   # Medido por suporte/feedback

  coverage:
    components_validated_per_cycle: "> 90%"
    scenarios_covered: "> 80% dos cenários definidos"
    new_tenant_validation: "100% antes de cada release"
```

---

## Domínio de Negócio (Contexto para o Insight Agent)

```yaml
salon_business_context:
  typical_metrics:
    revenue_range: "R$3.000 - R$30.000/mês (salão pequeno a médio)"
    avg_ticket: "R$50 - R$300 por atendimento"
    commission_range: "20% - 40% do valor do serviço"
    churn_threshold_hair: "45-60 dias sem retorno = em risco"
    churn_threshold_beard: "15-21 dias sem retorno = em risco"
    peak_hours: "Sábado manhã, sexta tarde"
    slow_periods: "Segunda-feira, feriados"

  red_flags_for_insight_agent:
    - "Insight sugere crescimento com apenas 2 semanas de dados"
    - "Insight compara mês de dezembro com janeiro (sazonalidade óbvia)"
    - "Insight alerta para queda sem considerar feriados"
    - "Insight personalizado usa nome de serviço que não existe no tenant"
    - "Taxa de churn acima de 80% para salão novo (base pequena distorce)"

  good_insight_patterns:
    - "Seu dia mais lucrativo é sábado — considere abrir mais horários neste dia"
    - "3 clientes não voltam há mais de 45 dias — envie mensagem de reativação"
    - "Serviço X representa 40% da receita — seu carro-chefe"
    - "Comissão de {profissional} aumentou 15% este mês — reconheça o desempenho"
```

---

*Squad criado pelo @squad-creator | AgenX AIOS 2.1 | 09/03/2026*
