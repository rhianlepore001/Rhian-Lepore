# 📊 Squad AIOS Overview - Beauty OS

## ✅ O que foi criado

Estrutura completa de **6 squads especializados** para desenvolvimento do Beauty OS usando AIOS (AI Operating System).

---

## 🎯 Os 6 Squads

### 1. **Squad Frontend** 🎨
```yaml
Lead: @frontend-specialist
Tech: React 19, TypeScript, Tailwind CSS, Vite
Focus: UI/UX, Componentes, Temas (Brutal/Beauty)
Areas: pages/, components/, contexts/, styles/
```
**Responsabilidades principais**:
- Desenvolver componentes React 19
- Implementar design system
- Otimizar performance de renderização
- Testes de componentes (Vitest + RTL)

**Métricas**: Test coverage (85%), Bundle size (500KB), LCP (2.5s)

---

### 2. **Squad Backend & Dados** 🗄️
```yaml
Lead: @backend-specialist
Tech: Supabase, PostgreSQL, Node.js, TypeScript
Focus: APIs, RLS, Migrations, Multi-tenant
Areas: lib/supabase.ts, supabase/migrations/, utils/
```
**Responsabilidades principais**:
- Arquitetura de APIs
- Gerenciar schema Supabase
- RLS policies (CRÍTICO)
- Query optimization
- Audit logs

**Métricas**: Query performance (100ms), RLS coverage (100%), Data integrity (95%)

**⚠️ CRITICAL RULES**:
- All queries MUST filter by `company_id` from session
- RLS must be ENABLED on all tenant-accessible tables
- Never accept `company_id` from URL/form input

---

### 3. **Squad AI & Features** 🤖
```yaml
Lead: @backend-specialist + @claude-developer-platform
Tech: Google Gemini, Claude API, Agent SDK
Focus: Finance Doctor, IA avançadas
Areas: lib/gemini.ts, pages/finance/, test/ai/
```
**Responsabilidades principais**:
- Google Generative AI (Gemini) integration
- Finance Doctor module (ativo)
- AIOS Integration (ativo)
- Otimização de prompts
- Logging e monitoring

**Status Ativo**:
- ✅ US-004: Finance Doctor (Fase 1 em progresso)
- ✅ US-005: AIOS Integration (Fase 1 em progresso)

**Métricas**: AI accuracy (90%), API response time (2s), Error rate (<1%)

---

### 4. **Squad Segurança** 🔒
```yaml
Lead: @security-auditor
Tech: Clerk, PostgreSQL RLS, Security tools
Focus: Multi-tenant, RLS, Auth, Compliance
Areas: .agent/rules/, supabase/policies/, contexts/AuthContext.tsx
```
**Responsabilidades principais**:
- Multi-tenant data isolation
- RLS policies implementation
- 2FA e rate limiting
- Criptografia de dados
- Audit logs
- Vulnerability scanning

**Iniciativas Ativas**:
- 🔄 2FA Implementation (Q1 2026)
- 🔄 Rate limiting & DDoS (Q2 2026)
- 🔄 GDPR Compliance (Q3 2026)

**Métricas**: Vulnerabilities fixed (100%), Security test coverage (90%), MTTR (24h)

---

### 5. **Squad DevOps & QA** 🚀
```yaml
Lead: @devops-engineer + @qa-automation-engineer
Tech: GitHub Actions, Vercel, Vitest, Playwright
Focus: CI/CD, Deploy, Testes, Monitoring
Areas: .github/workflows/, test/, vite.config.ts, vitest.config.ts
```
**Responsabilidades principais**:
- CI/CD pipeline (GitHub Actions)
- Deployment em Vercel
- Testes (Unit, Integration, E2E)
- Performance monitoring
- PWA support

**Iniciativas Ativas**:
- 🔄 E2E Test Suite (Q1 2026)
- 🔄 Performance Optimization (Q2 2026)
- 🔄 PWA Offline Mode (Q3 2026)

**CI/CD Pipeline**:
```
Lint → TypeCheck → Unit Tests → Build → E2E → Security → Performance
```

**Métricas**: Deployment frequency (daily), Lead time (<1h), Change failure rate (<5%)

---

### 6. **Squad Produto & Documentação** 📚
```yaml
Lead: @product-manager
Tech: Markdown, YAML, Templates
Focus: PRD, ADR, Roadmap, Docs
Areas: .ai/prd/, .ai/adr/, .squads/, docs/
```
**Responsabilidades principais**:
- Product Requirements Documents (PRDs)
- Architecture Decision Records (ADRs)
- Roadmap planning
- Backlog grooming
- Inter-squad communication

**Roadmap**:
- **Q1 2026**: Foundation & Stabilization
- **Q2 2026**: Performance & Scaling
- **Q3 2026**: Advanced Features
- **Q4 2026**: Expansion & Optimization

**Métricas**: Velocity, Lead time for features (<2 weeks), Doc completeness (100%)

---

## 📂 Estrutura de Diretórios

```
.squads/                          ← NOVO DIRETÓRIO
├── README.md                      ← Comece aqui! 📖
├── SQUADS.md                      ← Documentação detalhada
├── SETUP.md                       ← Quick start guide
├── OVERVIEW.md                    ← Este arquivo
├── squads/
│   ├── frontend.yaml             ← Config Frontend Squad
│   ├── backend.yaml              ← Config Backend Squad
│   ├── ai-features.yaml          ← Config AI Squad
│   ├── security.yaml             ← Config Security Squad
│   ├── devops-qa.yaml            ← Config DevOps/QA Squad
│   └── product.yaml              ← Config Product Squad
├── agents/                        ← Agent configs (TBD - Semana 2)
│   └── [squad-specific]
├── tasks/                         ← Task definitions (TBD - Semana 2)
│   └── [squad-specific]
└── workflows/
    └── squad-onboarding.yaml     ← Onboarding para novos membros
```

---

## 🚀 Como Começar

### 1️⃣ Novo membro do squad?
```bash
# Setup inicial
git clone ...
cd beauty-os
npm install
npm run dev

# Ler documentação (em ordem):
cat CLAUDE.md                      # Instruções globais
cat .agent/rules/GEMINI.md         # P0 priority rules
cat .squads/README.md              # Squad overview
cat .squads/SQUADS.md              # Documentação completa
cat .squads/SETUP.md               # Quick start

# Ler config do seu squad
cat .squads/squads/frontend.yaml   # Exemplo: Frontend Squad
```

### 2️⃣ Líder de squad?
```bash
# Ativar seu squad
@frontend-specialist               # Exemplo: Frontend lead

# Revisar configuração
cat .squads/squads/frontend.yaml   # Sua config

# Cumprir responsabilidades
# - Code reviews
# - Mentoring
# - Quality assurance
# - Roadmap planning
```

### 3️⃣ Implementar uma feature?
```bash
# 1. Verificar com Product Squad (PRD)
cat .ai/prd/                       # Procurar PRD relevante

# 2. Implementar com seu squad
git checkout -b feature/your-feature

# 3. Qualidade checks
npm run lint                       # ESLint
npm run typecheck                  # TypeScript
npm test                           # Tests

# 4. PR com 2+ squad leads approval
# (Se afeta RLS → Security review)
# (Se afeta infra → DevOps review)
```

---

## 🔄 Fluxo Inter-Squads

```
Product Squad (Define PRD)
          ↓
    ┌─────┴─────┐
    ↓           ↓
Frontend    Backend
Squad       Squad
    ↓           ↓
    └─────┬─────┘
          ↓
   Security Squad (Review)
          ↓
   DevOps & QA Squad (Test)
          ↓
    Production Deploy
```

---

## 📊 Métricas por Squad

| Squad | Métrica Principal | Target |
|-------|-------------------|--------|
| Frontend | Test Coverage | 85% |
| Backend | Query Performance | 100ms |
| AI | Model Accuracy | 90% |
| Security | Vulnerabilities Fixed | 100% |
| DevOps | Deployment Frequency | Daily |
| Product | Feature Lead Time | < 2 weeks |

---

## 📞 Comunicação

### Sincronização Regular:
- **Daily Standup**: 09:00 (15 min)
- **Weekly Planning**: Seg 10:00 (60 min)
- **Architecture Sync**: Qua 14:00 (45 min)
- **Security Review**: Sex 11:00 (30 min)
- **Sprint Retrospective**: Sex 15:00 (45 min)

### Canais:
- **PRs**: GitHub (2+ leads approval)
- **Issues**: GitHub (labeled by squad)
- **ADRs**: `.ai/adr/` (decisions)
- **Slack**: Channels by squad (TBD)

---

## ✅ Checklist de Qualidade

### Antes de PR:
- [ ] `npm run lint` ✅
- [ ] `npm run typecheck` ✅
- [ ] `npm test` ✅
- [ ] Segue CLAUDE.md?
- [ ] Segue GEMINI.md (P0)?
- [ ] RLS review (se aplicável)?
- [ ] Infra review (se aplicável)?

### Antes de Merge:
- [ ] 2+ squad leads approved
- [ ] CI/CD passed
- [ ] Security review (if needed)
- [ ] Performance tests OK

### Antes de Deploy:
- [ ] Staging OK?
- [ ] QA tests OK?
- [ ] Release notes created?
- [ ] Users notified?

---

## 🌟 Próximas Fases

### Semana 2 (6-12 Mar)
- [ ] Agent assignments específicos
- [ ] Task definitions por squad
- [ ] Sprint planning inicial
- [ ] Setup de métricas
- [ ] ADRs das principais decisões

### Semana 3+ (13+ Mar)
- [ ] Implementação de stories US-004 & US-005
- [ ] Testes de integração
- [ ] Documentação de APIs

### Q2 2026 (Apr+)
- [ ] Escalação conforme necessário
- [ ] Subteams especializados
- [ ] Autonomia operacional

---

## 📚 Documentação por Squad

Cada squad tem:
1. **Config YAML** (`.squads/squads/{squad}.yaml`)
   - Descrição, lead, members
   - Responsabilidades
   - Tech stack
   - Diretórios principais
   - Métricas
   - Regras críticas

2. **Workflows** (`.squads/workflows/`)
   - Processes e fluxos
   - Onboarding
   - Release processes

3. **Documentação Adicional**
   - CLAUDE.md (global)
   - GEMINI.md (P0 rules)
   - README.md (projeto)

---

## 🎯 O que cada squad precisa fazer AGORA

### Frontend Squad 🎨
- [ ] Ler config: `.squads/squads/frontend.yaml`
- [ ] Entender tech stack (React 19, Tailwind)
- [ ] Revisar componentes em `components/`
- [ ] Iniciar trabalho em refactor (US-007)

### Backend Squad 🗄️
- [ ] Ler config: `.squads/squads/backend.yaml`
- [ ] Entender RLS architecture
- [ ] Revisar migrations em `supabase/migrations/`
- [ ] Iniciar otimização de queries (US-010)

### AI Squad 🤖
- [ ] Ler config: `.squads/squads/ai-features.yaml`
- [ ] Entender Gemini integration (`lib/gemini.ts`)
- [ ] Revisitar Finance Doctor (US-004)
- [ ] Implementar Phase 2

### Security Squad 🔒
- [ ] Ler config: `.squads/squads/security.yaml`
- [ ] Revisar RLS policies
- [ ] Planejar 2FA (US-014)
- [ ] Audit security posture

### DevOps Squad 🚀
- [ ] Ler config: `.squads/squads/devops-qa.yaml`
- [ ] Revisar CI/CD (`.github/workflows/`)
- [ ] Implementar E2E tests (US-017)
- [ ] Setup monitoring

### Product Squad 📚
- [ ] Ler config: `.squads/squads/product.yaml`
- [ ] Revisar PRD structure (`.ai/prd/`)
- [ ] Criar ADRs de decisões
- [ ] Comunicar roadmap

---

## 🔧 Comandos AIOS Úteis

```bash
# Verificar saúde do projeto
npm run aios:doctor

# Sincronizar AIOS
npm run sync:ide

# Development
npm run dev                  # Start dev server
npm run build                # Production build

# Quality
npm run lint                 # ESLint
npm run typecheck            # TypeScript
npm test                     # All tests
npm run test:ui              # Test UI
npm run test:coverage        # Coverage report
```

---

## 📌 Referências Rápidas

| Arquivo | O quê | Leia quando |
|---------|-------|------------|
| `CLAUDE.md` | Instruções globais | Primeiro! |
| `.agent/rules/GEMINI.md` | P0 priority rules | Segundo! |
| `.squads/README.md` | Squad overview | Terceiro! |
| `.squads/SQUADS.md` | Documentação completa | Detalhes |
| `.squads/SETUP.md` | Quick start | Quick start |
| `.squads/squads/{squad}.yaml` | Config do squad | Para seu squad |

---

## 💡 Tips

1. **Novo no projeto?** → Leia na ordem: CLAUDE.md → GEMINI.md → SQUADS.md → SETUP.md
2. **Implementar feature?** → Trabalhe com seu squad, respeite responsabilidades
3. **Cross-squad issue?** → Escalate para Product Squad
4. **Dúvida sobre RLS?** → Security Squad é responsável
5. **Problema de deploy?** → DevOps Squad é responsável

---

## 🎉 Status Final

✅ **Squad AIOS Structure Complete**
- 6 squads definidos
- 6 arquivos YAML de configuração
- Documentação completa
- Workflows definidos
- Métricas estabelecidas
- Roadmap planejado

📋 **Ready for**:
- Onboarding de novos membros
- Sprint planning
- Feature development
- Cross-squad coordination
- Metrics tracking

🚀 **Próximo**: Semana 2 — Detalhes de agents + tasks + primeiro sprint

---

**Última atualização**: 01 de março de 2026
**Versão AIOS**: 2.1.0+
**Status**: ✅ ATIVO

Bem-vindo aos squads AIOS! 🎊
