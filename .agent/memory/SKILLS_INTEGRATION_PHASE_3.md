# Fase 3: Skills Integration (Claude Code ↔ Antigravity)

**Status:** 🟡 Em Planejamento | **Data:** 14 Mar 2026 | **Duração estimada:** 4-6 horas

---

## 🎯 Objetivo

Sincronizar as 38+ skills do Antigravity com o framework AIOX para que:
1. **Ambas ferramentas** (Claude Code + Antigravity) usem o mesmo conjunto de skills
2. **Sem conflitos** com autoridade de agentes (AIOX agent-authority.md)
3. **Contexto persista** quando você muda entre Claude Code ↔ Antigravity
4. **Skills funcionem em ambos** sem duplicação ou contradição

---

## 📊 Descoberta de Skills (Fase 3.1)

### Fonte: Antigravity Brain
Arquivo: `.gemini/antigravity/brain/c118f576.../implementation_plan.md`

Este é o **Banco de Dados Canônico** do projeto:
- 19 tabelas principais (profiles, appointments, clients, finance_records, etc)
- 41+ RPCs (get_finance_stats, create_secure_booking, get_available_slots, etc)
- 6 storage buckets (logos, covers, team_photos, service_images, client_photos, marketing_images)
- 64 migrações SQL (Jan 2024 – Mar 2026)
- Extensões: uuid-ossp, vector (pgvector 768 dims)

**Skills necessárias (mapeadas do banco de dados):**

### Tier 1: Core Skills (ESSENCIAL — sempre carregadas)
| Skill | Descrição | Usado em | Autoridade |
|-------|-----------|----------|-----------|
| **database-design** | Schema design, migrations, RLS policies | `.gemini/antigravity/brain/` | @architect / @data-engineer |
| **backend-development** | RPCs, database functions, business logic | Finance, Booking, Queue | @dev / @backend |
| **api-patterns** | REST vs GraphQL, response formats | 41 RPCs + public booking API | @architect |
| **security-hardening** | RLS, SECURITY DEFINER, rate limiting | Multi-tenant isolation | @architect / @dev |

### Tier 2: Domain-Specific (RECOMENDADO)
| Skill | Contexto | Autoridade |
|-------|----------|-----------|
| **finance-optimization** | `finance_records`, commissions, revenue tracking | @data-engineer / @analyst |
| **booking-system** | `public_bookings`, `appointments`, `queue_entries` | @dev / @pm |
| **client-crm** | `clients`, `client_semantic_memory`, CRM features | @analyst |
| **marketing-ai** | `content_calendar`, `marketing_assets`, AI campaigns | @pm / @analyst |
| **auth-and-permissions** | Clerk integration, RLS, multi-tenant | @architect |

### Tier 3: Operational (OPCIONAL — carregadas conforme necessário)
| Skill | Quando usar | Autoridade |
|-------|------------|-----------|
| **deployment-procedures** | Vercel, database sync, migrations | @devops (EXCLUSIVE) |
| **performance-optimization** | Database indexing, query optimization | @architect / @data-engineer |
| **testing-strategies** | Vitest + React Testing Library | @qa |
| **documentation** | Schema docs, API docs, guides | @sm / @analyst |

---

## 🔄 Fluxo de Integração (Fase 3.2-3.8)

### Fase 3.2: Bridge Layer
**Objetivo:** Criar camada de abstração que ambas ferramentas reconhecem

```yaml
# Novo arquivo: .aiox-core/data/skills-bridge.yaml
bridges:
  # Claude Code skills → Antigravity
  - name: database-design
    aliases: ["DB Design", "Schema", "Data Architecture"]
    applies_to: [claude-code, antigravity]
    primary_agent: "@architect"

  # Antigravity domain skills → Claude Code
  - name: finance-optimization
    context: "Beauty OS salon/barbershop accounting"
    applies_to: [antigravity, claude-code]
    primary_agent: "@data-engineer"
```

### Fase 3.3: Context Persistence
**Arquivo:** `.aiox-core/rules/skill-context-persistence.md`

Quando você muda de ferramenta:
- Contexto de skill é mantido em `.gemini/memory/` e `.claude/memory/`
- Agent handoff protocol preserva skill state
- Não há reaprendizado de contexto ao trocar

### Fase 3.4: Conflict Resolution
**Autoridade de agentes (já definida em `.claude/rules/agent-authority.md`):**

```
EXCLUSIVE Operations (NÃO podem ser delegadas):
├── @devops: git push, gh pr create, MCP management, CI/CD
├── @pm: *execute-epic, *create-epic, requirements gathering
└── @architect: System architecture, technology selection

Delegated Operations:
├── @dev: Implementation (coding, commits)
├── @qa: Testing, QA gate
├── @data-engineer: Database schema (from @architect)
└── @sm: Story creation (from @pm requirements)
```

**Skill não pode violar:** Se um skill tem label "@devops EXCLUSIVE", Antigravity não pode rodar `git push`.

### Fase 3.5: Skill Discovery
**Comando para listar skills do Antigravity:**
```bash
# Verificar disponibilidade de skills em .gemini/
ls -la .gemini/antigravity/ && \
ls -la .gemini/commands/ && \
ls -la .gemini/rules/

# Comparar com Claude Code skills
ls -la .agent/skills/
```

### Fase 3.6: Documentation
Criar matriz de compatibilidade em `SKILLS_MATRIX.md`:

```markdown
| Skill | Claude Code | Antigravity | Conflicts? | Authorized Agent |
|-------|:-:|:-:|:-:|---|
| database-design | ✅ | ✅ | NO | @architect |
| deployment-procedures | ✅ | ✅ | **YES** | @devops (exclusive) |
| ...| ... | ... | ... | ... |
```

### Fase 3.7: Validation & Testing
```bash
npm run lint               # Validar referências em código
grep -r "skill:" .agent/  # Encontrar todos os usos de skill
grep -r "agent:" .gemini/ # Encontrar definições de agente
```

### Fase 3.8: Commit & Archive
- Documenta integração em `docs/guides/SKILLS_INTEGRATION.md`
- Commit: `chore(aiox): skills integration Phase 3`
- Arquivo: Adiciona `.agent/memory/SKILLS_BRIDGE_CONFIG.yaml`

---

## 🚨 Conflitos Conhecidos

### Skill com Autoridade Exclusiva
```yaml
deployment-procedures:
  primary_agent: "@devops"
  exclusive: true
  warning: "Antigravity NÃO pode executar. Redirecionar para @devops."
```

### Skills que precisam sincronização
- **finance-optimization**: @data-engineer pode otimizar query, mas @architect decide schema
- **client-crm**: @analyst sugere, @dev implementa
- **marketing-ai**: @pm orquestra, @dev executa

---

## 📋 Checklist (Fases 3.2-3.8)

- [ ] 3.2: Criar bridge layer (`.aiox-core/data/skills-bridge.yaml`)
- [ ] 3.3: Documentar context persistence (`.aiox-core/rules/skill-context-persistence.md`)
- [ ] 3.4: Validar conflicts contra `agent-authority.md`
- [ ] 3.5: Executar skill discovery (listar Antigravity skills)
- [ ] 3.6: Criar matriz de compatibilidade (`SKILLS_MATRIX.md`)
- [ ] 3.7: Validar com lint + grep (sem conflitos)
- [ ] 3.8: Commit + Archive

**Próximo:** Após Phase 3, **Fase 4: Brownfield Discovery** (mapeamento da arquitetura existente)

---

**Documento Canônico:** `.gemini/antigravity/brain/c118f576.../implementation_plan.md`
(Contém 889 linhas — referência completa do banco de dados e 41 RPCs)
