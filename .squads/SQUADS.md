# 🏗️ SQUADS AIOS - Beauty OS / AgenX

Estrutura organizacional de squads para desenvolvimento do Beauty OS usando AIOS (AI Operating System).

**Status**: ✅ Ativo (01/03/2026)
**Framework**: AIOS 2.1.0+
**Linguagem**: Português Brasileiro (PT-BR)

---

## 🚨 Squad de Incidente Ativo

- **Finance Squad**: `.squads/FINANCE_SQUAD.md` — 🔴 CRÍTICO — Módulo financeiro sem dados + protocolo Backend Guard

---

## 📋 Squads Ativos

### 1. **Squad Frontend** 🎨
- **Responsabilidade**: UI/UX, React 19, Tailwind CSS, componentes
- **Lead Agent**: `frontend-specialist`
- **Skills**: frontend-design, clean-code, brainstorming
- **Áreas**:
  - Páginas da aplicação (Dashboard, Agenda, Finance, etc.)
  - Componentes reutilizáveis (~50+ componentes)
  - Temas (Brutal, Beauty) e glassmorphism
  - Responsive design (mobile-first)
  - Formulários e validações

**Épicas**:
- US-007: Refactor de componentes (Q1 2026)
- US-008: Tema Dark Mode (Q2 2026)
- US-009: Mobile optimization (Q2 2026)

---

### 2. **Squad Backend & Dados** 🗄️
- **Responsabilidade**: APIs, Supabase, RLS, migrations
- **Lead Agent**: `backend-specialist`
- **Skills**: database-design, api-patterns, clean-code
- **Áreas**:
  - Supabase (PostgreSQL, RLS policies)
  - Database migrations
  - API endpoints
  - Multi-tenant isolation
  - Audit logs

**Épicas**:
- US-010: Otimização de queries (Q1 2026)
- US-011: Backup & disaster recovery (Q2 2026)
- US-012: Replicação de dados (Q3 2026)

---

### 3. **Squad AI & Features** 🤖
- **Responsabilidade**: Google Gemini, Finance Doctor, features IA
- **Lead Agent**: `backend-specialist` + `claude-developer-platform`
- **Skills**: claude-developer-platform, brainstorming, api-patterns
- **Áreas**:
  - Google Generative AI (Gemini) integration
  - Finance Doctor module
  - Análises inteligentes
  - Recomendações baseadas em IA

**Épicas**:
- US-004: Finance Doctor (✅ Ativo - Fase 1)
- US-005: AIOS Integration (✅ Ativo)
- US-013: Gemini v2 Upgrade (Q3 2026)

---

### 4. **Squad Segurança** 🔒
- **Responsabilidade**: Multi-tenant, RLS, Auth, compliance
- **Lead Agent**: `security-auditor`
- **Skills**: vulnerability-scanner, security-testing, clean-code
- **Áreas**:
  - Row Level Security (RLS)
  - Company isolation
  - Autenticação (Clerk)
  - 2FA e rate limiting
  - Audit logs e compliance

**Épicas**:
- US-014: 2FA implementation (Q1 2026)
- US-015: Rate limiting + DDoS protection (Q2 2026)
- US-016: GDPR compliance (Q3 2026)

---

### 5. **Squad DevOps & QA** 🚀
- **Responsabilidade**: CI/CD, deploy, testing, monitoring
- **Lead Agent**: `devops-engineer` + `qa-automation-engineer`
- **Skills**: testing-patterns, performance-profiling, clean-code
- **Áreas**:
  - Vercel deployment
  - GitHub Actions CI/CD
  - Vitest + React Testing Library
  - Performance monitoring
  - E2E testing (Playwright)
  - PWA support

**Épicas**:
- US-017: E2E test suite (Q1 2026)
- US-018: Performance optimization (Q2 2026)
- US-019: PWA offline mode (Q3 2026)

---

### 6. **Squad Produto & Documentação** 📚
- **Responsabilidade**: PRDs, ADRs, documentação, comunicação
- **Lead Agent**: `product-manager` + `documentation-writer`
- **Skills**: plan-writing, brainstorming, clean-code
- **Áreas**:
  - Product requirements documents (PRDs)
  - Architecture decision records (ADRs)
  - Documentação técnica
  - Roadmap planning
  - Comunicação entre squads

**Épicas**:
- US-020: Knowledge base (Q2 2026)
- US-021: API documentation (Q2 2026)
- US-022: User guides (Q3 2026)

---

## 🔄 Fluxo de Trabalho Inter-Squads

```
┌─────────────────────────────────────────────────────┐
│ User Request / Feature                              │
└──────────────────────┬────────────────────────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │  Product Squad      │
            │ (Refine & Plan)     │
            └──────────┬──────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    Frontend      Backend         Security
    Squad         Squad           Squad
        │              │              │
        └──────────────┼──────────────┘
                       │
                       ▼
                   AI Squad
                (if needed)
                       │
                       ▼
            ┌─────────────────────┐
            │   DevOps & QA       │
            │   (Testing & Merge) │
            └─────────────────────┘
```

---

## 📞 Comunicação Entre Squads

### Canais de Sincronização

1. **Daily Standup** (09:00): Status breve (15 min)
2. **Weekly Planning** (seg 10:00): Próximas sprints (60 min)
3. **Architecture Sync** (qua 14:00): Decisões técnicas (45 min)
4. **Security Review** (sex 11:00): Questões de segurança (30 min)

### Convenções de Comunicação

- **Language**: Português Brasileiro (PT-BR)
- **PRs**: Requer aprovação de 2+ squads relevantes
- **Issues**: Etiquetadas por squad (`squad/frontend`, `squad/backend`, etc.)
- **ADRs**: Arquivo em `.ai/adr/` com padrão: `ADR-{number}-{slug}.md`

---

## 🛠️ Stack Tecnológico por Squad

| Squad           | Tecnologias                                    |
|-----------------|------------------------------------------------|
| Frontend        | React 19, TypeScript, Tailwind, Vite, Vitest  |
| Backend/Dados   | Supabase, PostgreSQL, Node.js, RLS            |
| AI/Features     | Gemini API, Claude API, Agent SDK              |
| Segurança       | Clerk Auth, RLS policies, audit logs           |
| DevOps/QA       | Vercel, GitHub Actions, Playwright, Lighthouse |

---

## 📊 Métricas de Squad

Cada squad deve rastrear:

- **Velocity**: Story points completados por sprint
- **Quality**: Bugs por story, coverage de testes
- **Performance**: Time to merge, deployment frequency
- **Segurança**: Vulnerabilidades encontradas/fixadas

---

## 🚀 Próximas Fases

### Fase 2 (Semana 2)
- [ ] Estruturar stories com checkboxes por squad
- [ ] Definir sprints (2 semanas)
- [ ] Criar ADRs para decisões arquiteturais
- [ ] Setup de métricas

### Fase 3 (Semana 3)
- [ ] Implementação de stories US-004 (Finance Doctor)
- [ ] Testes de integração squad-wide
- [ ] Documentação de APIs

### Fase 4+ (Q2 2026)
- [ ] Escalação de squads conforme crescimento
- [ ] Subteams especializados (ex: Mobile team dentro de Frontend)
- [ ] Autonomia operacional por squad

---

## 📌 Referências

- **AIOS Core**: `.aios-core/` (Framework)
- **Agents**: `.agent/agents/` (Especialistas)
- **Rules**: `.agent/rules/GEMINI.md` (P0 priorities)
- **Memory**: `.claude/projects/.../memory/MEMORY.md` (Contexto)
- **CLAUDE.md**: Instruções globais do projeto

---

**Última atualização**: 01 de março de 2026
**Próxima revisão**: 08 de março de 2026
