# 🏪 AgenX Core Context Squad

Squad de **contexto base** do projeto AgenX/Beauty OS.
Não executa features — é o "briefing automático" para qualquer agente que entrar no projeto.

## Por que existe

Sem este squad, cada agente novo precisa ser re-briefado sobre:
- Stack tecnológico (React 19, Supabase, Gemini, dual-theme...)
- Regras críticas (isBeauty prop, company_id do AuthContext, zero jargões)
- Onde ficam os arquivos
- Como implementar corretamente

Com este squad carregado, um `@dev` novo começa a trabalhar imediatamente com contexto completo.

## Como usar

```
Antes de iniciar qualquer story, diga ao agente:
"Carregue o contexto do agenx-core antes de começar"

Ou referencie os arquivos diretamente:
- squads/agenx-core/config/tech-stack.md
- squads/agenx-core/config/coding-standards.md
- squads/agenx-core/config/source-tree.md
- squads/agenx-core/config/dual-theme-guide.md
```

## Conteúdo

| Arquivo | O que contém |
|---------|-------------|
| `config/tech-stack.md` | Stack completo com versões, env vars, path alias |
| `config/coding-standards.md` | 12 regras obrigatórias (dual-theme, multi-tenant, etc.) |
| `config/source-tree.md` | Mapa de arquivos, tabelas Supabase, rotas, tabela de copy |
| `config/dual-theme-guide.md` | Como implementar Brutal/Beauty em qualquer componente |
| `agents/context-provider.yaml` | Agente de briefing automático |
| `tasks/load-context.md` | Task para carregar contexto antes de story |
| `tasks/validate-implementation.md` | Checklist AgenX-específico de validação |
| `checklists/agenx-quality-gate.md` | Quality gate completo (25 checks) |
| `checklists/dual-theme-checklist.md` | Checklist rápido de dual theme |
| `data/component-patterns.md` | Padrões de BrutalCard, BrutalButton, modais, etc. |
| `data/supabase-patterns.md` | Queries, RLS, Edge Functions, migrations |

## Regras mais importantes

1. **`isBeauty: boolean`** → toda prop de componente novo
2. **`company_id` do AuthContext** → nunca de URL/form
3. **Zero jargões na UI** → ver tabela em source-tree.md
4. **Mobile-first** → testar em 375px
5. **Dois temas** → testar Brutal e Beauty

## Mantido por

Squad-creator agent. Atualizar quando houver mudanças arquiteturais significativas no projeto.
