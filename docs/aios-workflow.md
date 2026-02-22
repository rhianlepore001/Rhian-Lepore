# Workflow AIOS: Story-Driven Development (Brownfield)

Este documento define o processo de desenvolvimento para o AgenX, utilizando o framework `.aios-core`.

## 🛡️ Princípios Fundamentais (Constitution)
1. **Agent Authority**: Nenhuma alteração de código sem autorização de um agente especialista.
2. **Story-Driven**: Toda tarefa de código deve começar com uma STORY definida em `docs/stories/`.
3. **Quality Gates**: O código deve passar por Lint, Typecheck e Teste antes de ser considerado "Done".

## 🚀 Ciclo de Vida de uma Alteração

### 1. Planejamento (Planning Phase)
- **Agente**: `@analyst` + `@pm`
- **Ação**: Atualizar o `PRD.md` e criar uma Spec técnica.
- **Saída**: Um arquivo de arquitetura ou brief aprovado.

### 2. Fragmentação (Story Refinement)
- **Agente**: `@sm` (River)
- **Ação**: Quebrar o plano em pequenas "Stories" atômicas.
- **Formato**: `docs/stories/[id]-[slug].md`
- **Critério**: Cada story deve ser pequena o suficiente para ser implementada e testada em uma única rodada.

### 3. Execução (Implementation)
- **Agente**: `@dev`
- **Ação**: Implementar a lógica baseada EXCLUSIVAMENTE nos critérios de aceitação da Story.
- **Regra**: Não inventar funcionalidades fora da Story.

### 4. Validação (QA)
- **Agente**: `@qa`
- **Ação**: Executar testes automatizados e checklist de UX.
- **Saída**: Aprovação para merge ou solicitação de ajustes.

## 📁 Estrutura de Diretórios
- `.aios-core/`: Governança e ferramentas do framework.
- `.agent/`: Motores de execução agêntica (Antigravity).
- `docs/stories/`: Histórias de usuário ativas e concluídas.
- `supabase/migrations/`: Evolução de banco de dados.

---
*Documento gerado pelo Orion (AIOS Master) para o projeto AgenX.*
