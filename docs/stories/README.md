# Registro de Stories do AgenX

Este diretório contém todas as User Stories do projeto AgenX, seguindo a metodologia Story-Driven do framework AIOS-Core.

## Status das Stories

| ID | Story | Status | Agente | Prioridade |
|----|-------|--------|--------|------------|
| US-001 | Memória Semântica Individualizada | in-progress | developer | high |
| US-002 | Interface CRM Semântica | pending | developer | high |
| US-003 | Cache Semântico Global | pending | developer | medium |
| **US-004** | **Módulo Doutor Financeiro** | **in-progress** | **frontend-specialist** | **high** |
| **US-005** | **Integração Completa do Framework AIOS** | **in-progress** | **aios-master** | **high** |
| **US-006** | **Migração Completa para Clerk Auth** | **in-progress** | **backend-specialist** | **high** |

## Como Trabalhar com Stories

### ✅ Status Workflow

```
pending → in-progress → ready-for-review → done
```

Cada story tem:
- **Critérios de Aceitação** (checkboxes do que precisa ser feito)
- **Definição de Pronto** (verificações finais antes de mergear)
- **Arquivos Impactados** (lista exata de arquivos que serão modificados)
- **Progresso Atual** (o que já foi feito vs. o que falta)

### 🛠️ Fluxo Padrão

1. **Criar story:** Chame `/develop-story` e siga o workflow
2. **Trabalhar:** Edite os checkboxes conforme implementa
3. **Validar:** Rode `npm run lint && npm run typecheck && npm test`
4. **Revisar:** Rode `python .agent/scripts/checklist.py .`
5. **Mergear:** Atualize status para `done` e faça commit

### 🤖 Comandos AIOS Relacionados

| Comando | O Que Faz |
|---------|-----------|
| `/develop-story` | Cria nova story e guia implementação |
| `/status` | Mostra todas as stories ativas |
| `/audit-arch` | Valida decisões arquiteturais |
| `/orchestrate` | Coordena 3+ agentes em paralelo |

## Convenção de Nomes

- `[YYYY-MM-DD]` = Data de criação
- `[id]` = Número sequencial (US-001, US-002, etc.)
- `[slug]` = Descrição curta em kebab-case

**Exemplo:** `2026-02-22-US-001-adicionar-memoria-semantica.md`
