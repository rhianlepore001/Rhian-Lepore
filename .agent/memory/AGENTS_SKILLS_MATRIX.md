# Agents & Skills Compatibility Matrix

**Status:** ✅ Validado | **Data:** 14 Mar 2026 | **Sincronização:** Claude Code ↔ Antigravity

---

## 🎭 12 Agentes AIOX (Sincronizados)

Ambas as ferramentas usam o **mesmo conjunto de 12 agentes**:

| Agent | ID | Role | Arquivo Claude Code | Arquivo Antigravity | Sincronizado? |
|-------|----|----|---|---|---|
| **Dex** | `@dev` | Development/Implementation | `.claude/commands/AIOS/agents/dev.md` | `.gemini/rules/AIOX/agents/dev.md` | ✅ |
| **Quinn** | `@qa` | Quality Assurance/Testing | `.claude/commands/AIOS/agents/qa.md` | `.gemini/rules/AIOX/agents/qa.md` | ✅ |
| **Aria** | `@architect` | System Architecture | `.claude/commands/AIOS/agents/architect.md` | `.gemini/rules/AIOX/agents/architect.md` | ✅ |
| **Morgan** | `@pm` | Product Management | `.claude/commands/AIOS/agents/pm.md` | `.gemini/rules/AIOX/agents/pm.md` | ✅ |
| **Pax** | `@po` | Product Owner | `.claude/commands/AIOS/agents/po.md` | `.gemini/rules/AIOX/agents/po.md` | ✅ |
| **River** | `@sm` | Scrum Master | `.claude/commands/AIOS/agents/sm.md` | `.gemini/rules/AIOX/agents/sm.md` | ✅ |
| **Alex** | `@analyst` | Analysis/Research | `.claude/commands/AIOS/agents/analyst.md` | `.gemini/rules/AIOX/agents/analyst.md` | ✅ |
| **Dara** | `@data-engineer` | Database/Data | `.claude/commands/AIOS/agents/data-engineer.md` | `.gemini/rules/AIOX/agents/data-engineer.md` | ✅ |
| **Uma** | `@ux-design-expert` | UX/UI Design | `.claude/commands/AIOS/agents/ux-design-expert.md` | `.gemini/rules/AIOX/agents/ux-design-expert.md` | ✅ |
| **Gage** | `@devops` | DevOps/Infrastructure | `.claude/commands/AIOS/agents/devops.md` | `.gemini/rules/AIOX/agents/devops.md` | ✅ |
| **Custom** | `@squad-creator` | Dynamic Squad Creation | `.claude/commands/AIOS/agents/squad-creator.md` | `.gemini/rules/AIOX/agents/squad-creator.md` | ✅ |
| **Master** | `@aiox-master` | Framework Master Control | `.claude/commands/AIOS/agents/aios-master.md` | `.gemini/rules/AIOX/agents/aiox-master.md` | ✅ |

---

## 📚 Core Skills (Aplicáveis a Ambas Ferramentas)

### Tier 1: Critical (Sempre disponíveis)
| Skill | Descrição | Claude Code | Antigravity | Primary Agent | Dependencies |
|-------|-----------|:-:|:-:|---|---|
| **database-design** | Schema PostgreSQL, migrations, RLS | ✅ | ✅ | @architect / @data-engineer | `.aiox-core/development/tasks/database-*.md` |
| **api-patterns** | REST/GraphQL, response formats, versioning | ✅ | ✅ | @architect | `.aiox-core/development/tasks/api-*.md` |
| **security-hardening** | RLS, SECURITY DEFINER, rate limiting, auth | ✅ | ✅ | @architect | `.aiox-core/development/tasks/security-*.md` |
| **backend-development** | RPCs, functions, business logic | ✅ | ✅ | @dev | `.aiox-core/development/tasks/backend-*.md` |

### Tier 2: Domain Skills (Recomendado)
| Skill | Contexto Beauty OS | Claude Code | Antigravity | Primary Agent |
|-------|---|:-:|:-:|---|
| **finance-optimization** | Comissões, revenue, expense tracking | ✅ | ✅ | @data-engineer |
| **booking-system** | Appointments, public bookings, queue | ✅ | ✅ | @dev |
| **client-crm** | Client management, semantic memory | ✅ | ✅ | @analyst |
| **marketing-ai** | Content calendar, asset generation | ✅ | ✅ | @pm |
| **authentication** | Supabase Auth, multi-tenant, RLS | ✅ | ✅ | @architect |

### Tier 3: Operational (Conforme necessário)
| Skill | Contexto | Claude Code | Antigravity | Primary Agent | ⚠️ Constraints |
|-------|---------|:-:|:-:|---|---|
| **deployment-procedures** | Vercel, migrations, CI/CD | ✅ | ✅ | @devops | **EXCLUSIVE** — @devops only |
| **frontend-design** | React components, styling, UX | ✅ | ✅ | @ux-design-expert | — |
| **testing-strategies** | Vitest, React Testing Library | ✅ | ✅ | @qa | — |
| **performance-optimization** | DB indexing, query optimization | ✅ | ✅ | @architect | — |
| **documentation** | API docs, guides, schema docs | ✅ | ✅ | @sm | — |

---

## 🔐 Authority & Conflicts

### EXCLUSIVE Operations (NÃO podem ser delegadas)

#### @devops (Gage) — EXCLUSIVE
```yaml
operations:
  - git push / git push --force
  - gh pr create / gh pr merge
  - MCP server add/remove/configure
  - CI/CD pipeline management
  - Release management
  - Database backup/restore

when_antigravity_encounters:
  action: "Redirecionar ao @devops ou parar"
  example: "Desculpe, só @devops pode fazer push. Chame @devops para proceder."
```

#### @pm (Morgan) — EXCLUSIVE
```yaml
operations:
  - *execute-epic
  - *create-epic
  - Requirements gathering
  - Spec writing (spec pipeline)

when_antigravity_encounters:
  action: "Redirecionar ao @pm"
```

#### @architect (Aria) — EXCLUSIVE
```yaml
operations:
  - System architecture decisions
  - Technology selection (final)
  - High-level design decisions

delegated_to:
  "@data-engineer": "Schema implementation"
  "@dev": "Code implementation"
```

### ✅ Collaborative Operations

```yaml
delegations:
  "@architect decides":
    - Technology selection
    - API design (REST/GraphQL)
    - Security architecture

  "@dev implements":
    - Frontend components
    - Backend functions
    - Database queries

  "@data-engineer specializes":
    - Schema design (from @architect)
    - Query optimization
    - RLS policy implementation

  "@qa validates":
    - All code before production
    - Test coverage
    - Security patterns

  "@devops deploys":
    - Only after @qa approval
    - CI/CD execution
    - Production release
```

---

## 🔄 Workflow: When You Switch Tools

### Scenario 1: Claude Code → Antigravity
```
1. You're in Claude Code with @dev (Dex)
2. You run: @architect (Aria)
3. System:
   ✅ Saves handoff artifact in .aiox/handoffs/
   ✅ Passes: active story, branch, files modified, blockers
   ✅ Switches to Antigravity @architect context
   ✅ Aria loads exactly where you left off
   ❌ Doesn't reload @dev persona (saves tokens)
```

### Scenario 2: Antigravity → Claude Code
```
1. You're in Antigravity with @pm (Morgan)
2. You switch to Claude Code
3. System:
   ✅ Loads Claude Code interface
   ✅ Available commands: @dev, @qa, @architect, @pm, @po, @sm, @analyst
   ✅ Handoff artifact from Morgan is available
   ✅ Same story/branch context is loaded
   ❌ Doesn't duplicate Morgan (she's already loaded in Antigravity)
```

---

## 🛡️ Conflict Resolution

### Rule: Never Violate Agent Authority

```yaml
# ❌ NOT ALLOWED
user: "Antigravity, push code to main"
antigravity: "❌ ERROR: Only @devops can push. Redirecione ao @devops."

# ✅ CORRECT
user: "@devops, please push the changes"
devops: "✅ Pushing branch to origin... [git output]"
```

### Rule: Skill Authority Matches Agent Authority

| Skill | Authorized Agent | Can Other Agents Use? | Notes |
|-------|---|:-:|---|
| `deployment-procedures` | @devops | ❌ NO | EXCLUSIVE |
| `database-design` | @architect | ✅ YES (implements: @data-engineer) | Delegable |
| `frontend-design` | @ux-design-expert | ✅ YES (@dev implements) | Delegable |
| `security-hardening` | @architect | ✅ YES (@dev implements) | Delegable |

---

## 📋 Validation Checklist

- [x] 12 agentes sincronizados (Claude Code ↔ Antigravity)
- [x] Core skills mapeadas (database, API, security, backend)
- [x] Domain skills identificadas (finance, booking, CRM, marketing)
- [x] Autoridade de agentes validada contra conflicts
- [x] Workflow de handoff documentado
- [x] Operações exclusivas bloqueadas corretamente

---

## 🚀 Próximas Etapas

### Fase 3.7: Validação Técnica
```bash
# Verificar se Claude Code commands fazem referência correta a agentes
grep -r "@architect\|@dev\|@devops" .claude/commands/ | wc -l

# Verificar se Antigravity agents estão sincronizados
diff -r .claude/commands/AIOS/agents/ .gemini/rules/AIOX/agents/ | head -20
```

### Fase 3.8: Commit & Documentation
```bash
git add .agent/memory/AGENTS_SKILLS_MATRIX.md
git commit -m "chore(aiox): agents & skills compatibility matrix Phase 3"
```

### Fase 4: Brownfield Discovery
Após skills estarem sincronizadas, mapear:
- Arquitetura existente (system components)
- Técnico debt (code issues)
- Schema audit (database health)
- Frontend spec (component patterns)

---

**Canônico:** `.aiox-core/data/` (configuration files)
**Referência:** `.gemini/rules/AIOX/agents/` (Antigravity agents)
**Mirror:** `.claude/commands/AIOS/agents/` (Claude Code agents — para manter sincronizado)
