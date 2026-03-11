# Task: Reformulate

## Metadata
- agent: reformulator
- elicit: true
- inputs: [target_file, target_pattern, scope]
- outputs: [refactored_code, before_after_diff, unification_report]

## Description
Reformulação inteligente de código, padrões ou copy da UI. Rex analisa
o que existe e propõe versões simplificadas, unificadas e mais claras
sem perder funcionalidade.

## Steps

### 1. Escolher Modo
```
elicit:
  question: "Que tipo de reformulação você precisa?"
  options:
    1: "Simplificar um componente complexo"
    2: "Unificar padrões inconsistentes no codebase"
    3: "Reescrever copy/textos da UI"
    4: "Extrair lógica repetida em hooks/utils"
    5: "Reformulação livre (descrever)"
```

### 2. Analisar Estado Atual
- Ler código alvo e seus padrões
- Identificar duplicações e inconsistências
- Mapear dependências que serão afetadas

### 3. Propor Reformulação
Para cada item:
1. **Antes:** Estado atual (com problemas marcados)
2. **Depois:** Versão reformulada
3. **Por quê:** Justificativa da mudança
4. **Impacto:** Arquivos e fluxos afetados

### 4. Validar
- A funcionalidade é preservada?
- Os testes existentes continuam passando?
- A mudança é reversível se necessário?
