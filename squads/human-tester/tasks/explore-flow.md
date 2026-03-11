# Task: Explore Flow (Navi — Explorer)

## Metadata
- agent: explorer
- elicit: true
- tool: playwright (browser MCP)
- inputs: [flow_name, persona]
- outputs: [exploration_report, screenshots, issues_found]

## Description
Navi navega pelo app como uma usuária de primeiro uso, testando
se cada fluxo é intuitivo e se o happy path funciona sem obstáculos.

## Pre-requisitos
1. Dev server rodando: `npm run dev` (http://localhost:3000)
2. Playwright MCP disponível
3. Dados de teste no banco (ou testar empty states)

## Steps

### 1. Escolher Fluxo
```
elicit:
  question: "Qual fluxo explorar?"
  options:
    1: "Registro + Onboarding (novo owner)"
    2: "Login + Dashboard"
    3: "Booking público (perspectiva cliente)"
    4: "Agenda (criar/editar agendamento)"
    5: "Financeiro (visão geral)"
    6: "Configurações (todas as sub-páginas)"
    7: "CRM de clientes"
    8: "Fila de espera"
    9: "TODOS os fluxos (full exploration)"
```

### 2. Navegar com Playwright
Para cada página do fluxo:
1. **Abrir** a rota no browser
2. **Screenshot** do estado inicial
3. **Verificar** se carregou sem erros (console check)
4. **Interagir** com elementos clicáveis
5. **Preencher** formulários com dados válidos
6. **Submeter** e verificar feedback de sucesso
7. **Screenshot** do resultado final

### 3. Avaliar Intuitividade
Para cada tela, responder:
- O próximo passo é óbvio sem instrução? (sim/não)
- O feedback da ação foi claro? (sim/não)
- O usuário saberia voltar? (sim/não)
- Algo confuso ou inesperado? (descrever)

### 4. Relatório
- Lista de telas visitadas com screenshots
- Problemas de UX encontrados (com severidade)
- Sugestões de melhoria
- Fluxos que funcionaram perfeitamente
