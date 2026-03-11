# Task: Full Test Cycle

## Metadata
- agents: [explorer, destroyer, meticulous, speedster, guardian]
- elicit: true
- tool: playwright (browser MCP)
- inputs: [target_area]
- outputs: [comprehensive_test_report]

## Description
Ciclo completo de testes humanos. Os 5 agentes testam a mesma área
do app, cada um com sua perspectiva e abordagem única.

## Steps

### 1. Definir Área Alvo
```
elicit:
  question: "Qual área do app testar com o ciclo completo?"
  options:
    1: "Fluxo de autenticação (login, registro, onboarding)"
    2: "Sistema de agendamento (agenda + booking público)"
    3: "Módulo financeiro (dashboard + comissões + transações)"
    4: "CRM de clientes (lista + detalhes + ações)"
    5: "Configurações (todas as sub-páginas)"
    6: "APP INTEIRO (todas as áreas)"
```

### 2. Ciclo de 5 Fases

**Fase 1 — Navi (Explorer):** Happy path
- Navegar pelo fluxo como primeiro uso
- Verificar intuitividade
- Documentar se tudo funciona no caminho feliz

**Fase 2 — Havoc (Destroyer):** Testes negativos
- Tentar quebrar com inputs inválidos
- Interromper fluxos
- Testar permissões

**Fase 3 — Pixel (Meticulous):** Inspeção visual
- Verificar UI em 3 breakpoints
- Checar todos os estados (loading, empty, error)
- Comparar consistência entre temas

**Fase 4 — Flash (Speedster):** Performance
- Medir tempos de carregamento
- Verificar console errors
- Testar ações rápidas em sequência

**Fase 5 — Shield (Guardian):** Segurança
- Verificar autenticação e autorização
- Testar isolamento multi-tenant
- Checar sanitização de inputs

### 3. Consolidação
Relatório unificado com:
- Total de bugs por severidade (Critical/High/Medium/Low)
- Total de bugs por agente (quem encontrou)
- Top 10 issues prioritárias
- Quick fixes (resolver hoje)
- Melhorias planejadas (backlog)
- Score geral da área testada (1-10)

### 4. Salvar Relatório
- Formato: Markdown
- Local: `docs/test-reports/{data}-{area}-full-cycle.md`
