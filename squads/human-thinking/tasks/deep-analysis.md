# Task: Deep Analysis

## Metadata
- agent: thinker
- elicit: true
- inputs: [target_component, target_decision, target_pattern]
- outputs: [analysis_report, questions_list, recommendations]

## Description
Análise profunda usando pensamento socrático. O Thinker (Sophia) examina
um componente, decisão arquitetural ou padrão de código, gerando perguntas
críticas e identificando premissas ocultas.

## Steps

### 1. Identificar o Alvo
```
elicit:
  question: "O que você quer analisar profundamente?"
  options:
    1: "Um componente específico"
    2: "Uma decisão arquitetural"
    3: "Um padrão de código recorrente"
    4: "Um fluxo de usuário"
    5: "Outro (descrever)"
```

### 2. Coletar Contexto
- Ler o código/arquivo alvo
- Identificar dependências e relacionamentos
- Mapear decisões implícitas no código

### 3. Aplicar Pensamento Socrático
Para cada aspecto encontrado, aplicar:
1. **O que é?** — Descrever sem julgamento
2. **Por que assim?** — Identificar a razão (ou falta dela)
3. **E se diferente?** — Explorar alternativas
4. **Qual o custo?** — Trade-offs da escolha atual
5. **Vale mudar?** — Recomendação com justificativa

### 4. Gerar Relatório
Output com:
- Premissas ocultas encontradas
- Perguntas sem resposta clara
- Trade-offs identificados
- Recomendações priorizadas (impacto vs esforço)
