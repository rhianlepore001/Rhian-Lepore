# Task: Full Thinking Cycle

## Metadata
- agents: [thinker, reformulator, reviewer, ideator, optimizer]
- elicit: true
- inputs: [target_area]
- outputs: [comprehensive_report, action_plan]

## Description
Ciclo completo de pensamento humano. Todos os 5 agentes analisam a mesma
área do projeto em sequência, cada um com sua perspectiva cognitiva única.

## Steps

### 1. Definir Alvo
```
elicit:
  question: "Qual área do projeto passar pelo ciclo completo?"
  options:
    1: "Dashboard e métricas"
    2: "Sistema de agendamento"
    3: "Módulo financeiro"
    4: "Fluxo de onboarding"
    5: "Booking público"
    6: "Arquitetura geral"
    7: "Outra área (especificar)"
```

### 2. Ciclo de 5 Fases

**Fase 1 — Thinker (Sophia):** Análise crítica
- Questionar premissas do design atual
- Identificar falhas lógicas e trade-offs

**Fase 2 — Reviewer (Luna):** Perspectiva do usuário
- Avaliar UX do ponto de vista de cada persona
- Mapear friction points e carga cognitiva

**Fase 3 — Ideator (Spark):** Possibilidades
- Brainstorm de melhorias e features
- Conexões com tecnologias disponíveis

**Fase 4 — Reformulator (Rex):** Reformulação
- Propor simplificações e unificações
- Redesenhar padrões problemáticos

**Fase 5 — Optimizer (Edge):** Otimização
- Medir performance atual
- Plano de otimização priorizado

### 3. Síntese Final
Consolidar os 5 relatórios em:
- Top 10 ações priorizadas (impacto x esforço)
- Quick wins (implementar imediatamente)
- Big bets (planejar em stories)
- Decisões que precisam de input do owner
