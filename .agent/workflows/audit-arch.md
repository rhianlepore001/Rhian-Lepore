---
description: Realiza uma auditoria arquitetural nos componentes do projeto.
---

# Workflow: /audit-arch

Este workflow ativa o agente `@architect` para validar a integridade estrutural e adesão aos padrões AIOS.

## Passo a Passo

1. **Mapeamento:**
   - Analisar `ARCHITECTURE.md` e a estrutura de pastas atual.
   - Verificar inconsistências entre o PRD e a implementação real.

2. **Análise de Dependências:**
   - Identificar acoplamento excessivo ou violação de camadas (ex: lógica de negócio no componente de UI).

3. **Relatório de Auditoria:**
   - Gerar um Artefato `architectural_audit.md` com:
     - Pontos Críticos.
     - Recomendações de Refatoração.
     - Score de Saúde Arquitetural.

4. **Execução de Correções (Opcional):**
   - Se o usuário aprovar, iniciar refatorações em lotes pequenos.

> [!TIP]
> Use este comando antes de grandes refatorações ou após a implementação de novas features core.
