---
task: Load AgenX Context
responsavel: "@dev | @qa | @architect | @ux-design-expert"
responsavel_type: any-agent
atomic_layer: task
elicit: false
Entrada:
  - agent: Agente que está iniciando trabalho no AgenX
Saida:
  - context_loaded: true
  - ready_to_work: Confirmação que o agente tem contexto completo
---

# Task: Carregar Contexto do AgenX

## Descrição
Execute esta task ANTES de iniciar qualquer story ou implementação no AgenX.
Garante que o agente tem contexto completo do projeto sem re-briefing manual.

## Steps

### 1. Ler Tech Stack
Ler: `squads/agenx-core/config/tech-stack.md`
Internalizar: versões, integrações, variáveis de ambiente, path alias.

### 2. Ler Coding Standards
Ler: `squads/agenx-core/config/coding-standards.md`
Internalizar: dual theme, multi-tenant, error handling, nomenclatura, idioma.

### 3. Ler Source Tree
Ler: `squads/agenx-core/config/source-tree.md`
Internalizar: onde ficam os arquivos, tabelas Supabase, rotas, tabela de substituições de copy.

### 4. Ler Dual Theme Guide
Ler: `squads/agenx-core/config/dual-theme-guide.md`
Internalizar: como usar isBeauty, mapa de classes, exemplo de componente.

### 5. Ler Component Patterns
Ler: `squads/agenx-core/data/component-patterns.md`
Internalizar: padrões de BrutalCard, BrutalButton, modais, loading states.

### 6. Confirmar Contexto
Responder internamente:
- [ ] Sei qual é o path alias (`@/`)
- [ ] Sei como extrair `company_id` (do AuthContext, nunca da URL)
- [ ] Sei como implementar dual theme (isBeauty prop)
- [ ] Sei onde ficam os arquivos que vou modificar
- [ ] Sei a tabela de substituições de copy (zero jargões)

## Output
`✅ Contexto AgenX carregado. Pronto para implementar [NOME DA STORY].`
