# Task: Stress Flow (Flash — Speedster)

## Metadata
- agent: speedster
- elicit: true
- tool: playwright (browser MCP)
- inputs: [test_type]
- outputs: [performance_report, console_errors, timing_data]

## Description
Flash testa velocidade e resiliência do app com navegação rápida,
ações em sequência e monitoramento de console errors.

## Steps

### 1. Escolher Teste
```
elicit:
  question: "Qual teste de performance?"
  options:
    1: "Speed test (tempo de carregamento de todas as páginas)"
    2: "Console audit (verificar erros em todas as rotas)"
    3: "Stress test (ações rápidas em sequência)"
    4: "Navegação intensiva (50+ transições)"
    5: "TESTE COMPLETO (tudo)"
```

### 2. Speed Test — Tempo de Carregamento
Via Playwright, medir tempo de cada rota:

```
Rotas a medir:
PUBLIC:
  - #/login
  - #/register
  - #/book/:slug
  - #/queue/:slug

AUTHENTICATED:
  - #/ (Dashboard)
  - #/agenda
  - #/clientes
  - #/financeiro
  - #/marketing
  - #/insights
  - #/fila
  - #/configuracoes/geral
  - #/configuracoes/servicos
  - #/configuracoes/equipe
  - #/configuracoes/comissoes
  - #/configuracoes/seguranca
  - #/configuracoes/auditoria
  - #/configuracoes/lixeira
  - #/configuracoes/erros
```

Para cada rota:
1. Navegar com timestamp inicial
2. Aguardar networkidle
3. Registrar tempo total
4. Classificar: OK (< 2s) | WARN (2-4s) | CRITICAL (> 4s)

### 3. Console Audit
Para cada página:
1. Abrir DevTools console
2. Navegar para a rota
3. Interagir com elementos principais
4. Registrar TODOS os console.error e console.warn
5. Classificar: Error (bug real) | Warning (atenção) | Info (ignorar)

### 4. Stress Test
Sequências rápidas:
1. Navegar Dashboard → Agenda → Clientes → Financeiro → Dashboard (5x)
2. Abrir/fechar cada modal 3x rápido
3. Trocar filtros de mês 10x seguidas no financeiro
4. Digitar e apagar busca de cliente 10x
5. Verificar: app travou? Dados corromperam? Erros no console?

### 5. Relatório de Performance
| Página | Tempo | Console Errors | Status |
|--------|-------|---------------|--------|
| ...    | Xs    | N erros       | OK/WARN/FAIL |

- Total de erros no console
- Páginas mais lentas (ranking)
- Ações que causaram problemas
- Recomendações de melhoria
