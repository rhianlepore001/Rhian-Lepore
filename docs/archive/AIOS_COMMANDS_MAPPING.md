# AIOS Commands Mapping — AgenX

> **Objetivo:** Substituir gradualmente comandos antigos por workflows AIOS, mantendo rastreabilidade e governança.

---

## 📋 Mapeamento de Comandos

### Build & Development

| Comando Antigo | Comando AIOS | Tipo | Descrição |
|---|---|---|---|
| `npm run dev` | `npm run dev` | ✅ Mantém | Inicia servidor dev (sem mudança) |
| `npm run build` | `/aios build-saas` | 🔄 Novo | Build + gera documentação PRD |
| `npm run lint` | `npm run lint` | ✅ Mantém | ESLint check (sem mudança) |
| `npm run typecheck` | `npm run typecheck` | ✅ Mantém | TypeScript check (sem mudança) |
| `npm test` | `npm test` | ✅ Mantém | Vitest check (sem mudança) |

### Story & Feature Development

| Comando Antigo | Comando AIOS | Tipo | Descrição |
|---|---|---|---|
| "Nova feature X" | `/develop-story` | 🔄 Novo | Cria story, rastreia checkboxes, guia implementação |
| "Qual é o status?" | `/status` | 🔄 Novo | Mostra projeto status, stories ativas, blockedBy |
| "Revisar código" | `/audit-arch` | 🔄 Novo | Valida contra Constitution.md, identifica violações |
| "Coordenar 3+ pessoas" | `/orchestrate` | 🔄 Novo | Dispara múltiplos agentes em paralelo |

### Quality & Validation

| Comando Antigo | Comando AIOS | Tipo | Descrição |
|---|---|---|---|
| "Verificar tudo antes de push" | `python .agent/scripts/checklist.py .` | 🔄 Novo | Lint → Typecheck → Tests → Security → UX → Accessibility |
| "Security scan" | `python .agent/scripts/security_scan.py` | 🔄 Novo | Encontra vulnerabilidades, dependency issues |
| "Performance check" | `python .agent/scripts/lighthouse_audit.py` | 🔄 Novo | Core Web Vitals, bundle size, performance |

### Deploy & Release

| Comando Antigo | Comando AIOS | Tipo | Descrição |
|---|---|---|---|
| "Deploy em staging" | `/deploy staging` | 🔄 Novo | Valida tudo, faz deploy automático |
| "Deploy em prod" | `/deploy production` | 🔄 Novo | Passa por 5-phase deployment validation |
| "Git push" | `@devops` | 🔄 Novo | APENAS @devops pode fazer push (agent authority) |
| "Criar PR" | `@devops` | 🔄 Novo | APENAS @devops pode criar PR (agent authority) |

### Debugging & Troubleshooting

| Comando Antigo | Comando AIOS | Tipo | Descrição |
|---|---|---|---|
| "Debugar issue X" | `/debug` | 🔄 Novo | Usa @debugger para análise estruturada |
| "Analisar logs" | `cat .aiox-core/logs` | ✅ Mantém | Histórico de execuções AIOS |
| "Verificar squad" | `/sync-squad` | 🔄 Novo | Valida integridade de squad |

---

## 🚀 Migração Faseada (Recomendado)

### Fase 1: HOJE (2h)
- ✅ Criar stories US-004, US-005, US-006 (FEITO!)
- Atualizar `docs/stories/README.md` com workflow (FEITO!)
- Rodar `/status` uma vez (testar)
- Rodar `python .agent/scripts/checklist.py .` uma vez (validar setup)

### Fase 2: Semana 1
- Usar `/develop-story` como fluxo padrão para features novas
- Manter stories com checkboxes atualizados
- Rodar `checklist.py` antes de QUALQUER git push

### Fase 3: Semana 2
- Usar `/audit-arch` antes de decisões arquiteturais grandes
- Documentar decisões em `.ai/decision-logs/`
- Treinar novo dev no fluxo `/develop-story`

### Fase 4: Semana 3+
- `/orchestrate` para features complexas (3+ agentes)
- Integração com CI/CD (rodar `checklist.py` automaticamente)
- n8n para automações (WhatsApp, CRM, etc.)

---

## 🎯 Resultado Esperado (Pós Migração)

### Hoje (Sem AIOS)
```
Dev começa feature:
1. "O que já foi feito?"
2. "Quais critérios de aceite?"
3. "Qual arquivo mexer?"
→ Demora 30min pra descobrir
→ Alto risco de rework
```

### Após AIOS (Com Stories)
```
Dev abre docs/stories/US-005:
1. Critérios de Aceite (já está lá)
2. Arquivos Impactados (lista exata)
3. Checkboxes de Progresso (vê o que falta)
4. Definição de Pronto (sabe quando terminar)
→ Demora 5min pra entender
→ Zero rework
```

---

## 📚 Referência Rápida

### Todos os Scripts Python Disponíveis

```bash
# Security
python .agent/scripts/security_scan.py              # Encontra vulnerabilidades
python .agent/scripts/dependency_analyzer.py       # Atualiza dependências

# Code Quality
python .agent/scripts/lint_runner.py                # ESLint (alternativo ao npm run lint)
python .agent/scripts/test_runner.py               # Vitest (alternativo ao npm test)
python .agent/scripts/schema_validator.py          # Valida Supabase schema

# Performance & UX
python .agent/scripts/ux_audit.py                  # Accessibility check
python .agent/scripts/accessibility_checker.py     # A11y detailed
python .agent/scripts/seo_checker.py               # SEO validation
python .agent/scripts/bundle_analyzer.py           # Bundle size check
python .agent/scripts/lighthouse_audit.py          # Core Web Vitals

# E2E & Mobile
python .agent/scripts/playwright_runner.py         # E2E tests
python .agent/scripts/mobile_audit.py              # Mobile-specific validation

# MASTER CHECKLIST (roda tudo em ordem)
python .agent/scripts/checklist.py .               # Security → Lint → Schema → Tests → UX
```

---

## ⚠️ Regras Críticas Durante Migração

1. **Nunca skipear `checklist.py`** — É seu guardrail contra bugs
2. **Todos os PRs precisam de story** — Rastreabilidade
3. **Lint + Typecheck + Tests SEMPRE passam** — Non-negotiable
4. **Apenas `@devops` faz git push** — Agent authority
5. **Stories com checkboxes atualizados** — Source of truth do progresso

---

**Versão:** 1.0.0
**Data:** 2026-02-28
**Próxima Review:** 2026-03-07
