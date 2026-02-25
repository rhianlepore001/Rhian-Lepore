---
description: Implementa a próxima história de usuário baseada no contexto do AIOS Core.
---

# Workflow: /develop-story

Este workflow automatiza a transição de uma história de usuário (User Story) do status de planejamento para execução, garantindo que o agente `@dev` tenha todo o contexto necessário.

## Passo a Passo

1. **Leitura de Contexto:**
   - O Agente DEVE ler `.aios-core/development/stories/` para identificar a história atual ou usar o comando `*status` para pegar o ID.
   - Verificar `project-status.yaml` para validar a fase atual do projeto.

2. **Geração de Plano:**
   - Criar obrigatoriamente um `implementation_plan.md` (Artefato) detalhando os arquivos que serão afetados.
   - O plano DEVE citar o PDR raiz como referência de requisitos.

3. **Execução de Código:**
   - Implementar as mudanças seguindo as regras de Clean Code e SOLID.
   - // turbo
   - Rodar `npm run lint` para garantir que não houve regressão de estilo.

4. **Validação:**
   - O Agente DEVE gerar testes para a nova funcionalidade.
   - Chamar o workflow `/release-check` ao finalizar.

> [!IMPORTANT]
> Nunca inicie a etapa 3 sem aprovação explícita do usuário no Artefato de Plano.
