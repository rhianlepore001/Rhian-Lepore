# Task: Optimize

## Metadata
- agent: optimizer
- elicit: true
- inputs: [optimization_target, baseline_metrics]
- outputs: [optimization_report, action_items, before_after_metrics]

## Description
Otimização orientada a métricas. Edge identifica bottlenecks reais,
mede baseline, aplica otimizações e comprova o ganho com dados.

## Steps

### 1. Escolher Área
```
elicit:
  question: "O que você quer otimizar?"
  options:
    1: "Performance (renders, queries, load time)"
    2: "Bundle size (deps, imports, tree-shaking)"
    3: "Test coverage (testes estratégicos)"
    4: "Tech debt (código legado, patterns antigos)"
    5: "Scan completo (todas as áreas)"
```

### 2. Estabelecer Baseline
Antes de qualquer mudança:
- Medir estado atual (build size, test count, lint warnings)
- Identificar os top 5 problemas por impacto
- Documentar métricas iniciais

### 3. Plano de Ação Priorizado
Ordenar por impacto/esforço:
1. **P0 - Crítico:** Bugs de performance visíveis ao usuário
2. **P1 - Alto:** Otimizações com ganho >20%
3. **P2 - Médio:** Melhorias incrementais mensuráveis
4. **P3 - Baixo:** Nice-to-have sem urgência

### 4. Executar e Medir
Para cada otimização:
1. **Antes:** Métrica baseline
2. **Mudança:** O que foi feito
3. **Depois:** Métrica pós-otimização
4. **Ganho:** Delta percentual
