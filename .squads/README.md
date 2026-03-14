# 🏗️ SQUADS AIOS - Beauty OS

Bem-vindo à estrutura organizacional de squads para o projeto Beauty OS usando AIOS (AI Operating System).

---

## 📂 O que está aqui?

Este diretório contém a **configuração e documentação de squads** - times especializados para diferentes áreas do desenvolvimento.

### Arquivos principais:

| Arquivo | Descrição |
|---------|-----------|
| **SQUADS.md** | 📋 Visão geral de todos os squads (LEIA PRIMEIRO) |
| **SETUP.md** | 🚀 Guia rápido de setup e início |
| **README.md** | Este arquivo |
| `squads/*.yaml` | 🔧 Configurações por squad (Frontend, Backend, etc.) |
| `workflows/*.yaml` | 🔄 Fluxos de trabalho (onboarding, etc.) |

---

## 🎯 Squads Disponíveis

### 1. **Squad Frontend** 🎨
Lead: `@frontend-specialist`
- React 19, TypeScript, Tailwind CSS
- Componentes, páginas, temas
- UI/UX design e responsividade

📄 Config: [squads/frontend.yaml](./squads/frontend.yaml)

### 2. **Squad Backend & Dados** 🗄️
Lead: `@backend-specialist`
- Supabase, PostgreSQL, RLS
- APIs, migrations, data layer
- Multi-tenant architecture

📄 Config: [squads/backend.yaml](./squads/backend.yaml)

### 3. **Squad AI & Features** 🤖
Lead: `@backend-specialist` + `@claude-developer-platform`
- Google Gemini integration
- Finance Doctor module
- Features IA avançadas

📄 Config: [squads/ai-features.yaml](./squads/ai-features.yaml)

### 4. **Squad Segurança** 🔒
Lead: `@security-auditor`
- Multi-tenant isolation
- RLS policies e auth
- Compliance e 2FA

📄 Config: [squads/security.yaml](./squads/security.yaml)

### 5. **Squad DevOps & QA** 🚀
Lead: `@devops-engineer` + `@qa-automation-engineer`
- CI/CD, deployment, Vercel
- Testes (Vitest, Playwright)
- Monitoring e performance

📄 Config: [squads/devops-qa.yaml](./squads/devops-qa.yaml)

### 6. **Squad Produto & Documentação** 📚
Lead: `@product-manager`
- PRDs, ADRs, roadmap
- Documentação técnica
- Comunicação inter-squads

📄 Config: [squads/product.yaml](./squads/product.yaml)

---

## ⚡ Quick Start

### Para um novo membro do squad:

```bash
# 1. Clonar repo e setup
git clone ...
cd beauty-os
npm install
npm run dev

# 2. Ler documentação obrigatória
cat CLAUDE.md              # Instruções globais
cat .agent/rules/GEMINI.md # P0 rules
cat .squads/SQUADS.md      # Estrutura de squads
cat .squads/SETUP.md       # Setup rápido

# 3. Escolher seu squad
# Abrir configuração do seu squad:
cat .squads/squads/frontend.yaml  # Exemplo

# 4. Começar a trabalhar
git checkout -b feature/your-feature
```

### Para um líder de squad:

```bash
# 1. Ativar seu squad
@frontend-specialist      # Por exemplo

# 2. Revisar configuração
cat .squads/squads/frontend.yaml

# 3. Cumprir as responsabilidades:
# - Code reviews de PRs
# - Mentoring de novos membros
# - Manter qualidade de código
# - Roadmap e planning
```

---

## 📊 Estrutura de Diretórios

```
.squads/
├── README.md                      ← Você está aqui
├── SQUADS.md                      ← Leia primeiro
├── SETUP.md                       ← Quick start
├── squads/
│   ├── frontend.yaml              ← Configuração Frontend
│   ├── backend.yaml               ← Configuração Backend
│   ├── ai-features.yaml           ← Configuração AI
│   ├── security.yaml              ← Configuração Segurança
│   ├── devops-qa.yaml             ← Configuração DevOps/QA
│   └── product.yaml               ← Configuração Produto
├── agents/                        ← Agent configs (TBD)
│   └── [squad-specific agents]
├── tasks/                         ← Task definitions (TBD)
│   └── [squad-specific tasks]
└── workflows/
    └── squad-onboarding.yaml      ← Onboarding workflow
```

---

## 🔄 Fluxo Inter-Squads

```
Feature Request
     │
     ▼
Produto Squad (PRD)
     │
     ├──→ Frontend Squad (UI)
     ├──→ Backend Squad (API)
     └──→ AI Squad (if needed)
           │
           ▼
     Security Squad (Review)
           │
           ▼
     DevOps & QA (Test & Deploy)
           │
           ▼
     Production
```

---

## 📞 Comunicação

### Canais principais:
- **PRs**: GitHub (2+ leads para approve)
- **Issues**: GitHub (etiquetadas por squad)
- **ADRs**: `.ai/adr/` (Architecture Decision Records)
- **Slack**: Canais por squad (TBD)
- **Meetings**: Weekly planning, security review

### Sincronização:
- **Daily Standup**: 09:00 (15 min)
- **Weekly Planning**: Seg 10:00 (60 min)
- **Architecture Sync**: Qua 14:00 (45 min)
- **Security Review**: Sex 11:00 (30 min)

---

## 🚀 Como usar os squads

### 1. Se você é **novo no projeto**:
```
CLAUDE.md → GEMINI.md → SQUADS.md → SETUP.md → [Squad Config]
```

### 2. Se você é **líder de squad**:
```
SQUADS.md → [Squad Config] → Responsabilidades → Code Reviews
```

### 3. Se você está **implementando feature**:
```
[Squad Config] → Responsibilities → [Squad Tech Stack] → Code
```

### 4. Se você precisa de **cross-squad work**:
```
Produto Squad (PRD) → Múltiplos Squads → Security → DevOps
```

---

## ✅ Checklist de Contribuição

Antes de fazer PR:
- [ ] Leu CLAUDE.md?
- [ ] Leu GEMINI.md (P0 rules)?
- [ ] Entende seu squad?
- [ ] npm run lint ✅
- [ ] npm run typecheck ✅
- [ ] npm test ✅
- [ ] Segue padrões do squad?

Antes de merge:
- [ ] 2+ squad leads aprovaram?
- [ ] CI/CD passou?
- [ ] Security review (se necessário)?
- [ ] Performance OK?

---

## 📚 Referências Rápidas

| Referência | Localização |
|-----------|-----------|
| Project Overview | `CLAUDE.md` |
| P0 Priority Rules | `.agent/rules/GEMINI.md` |
| Squad Structure | `SQUADS.md` |
| Quick Start | `SETUP.md` |
| Frontend Config | `squads/frontend.yaml` |
| Backend Config | `squads/backend.yaml` |
| AI Config | `squads/ai-features.yaml` |
| Security Config | `squads/security.yaml` |
| DevOps Config | `squads/devops-qa.yaml` |
| Product Config | `squads/product.yaml` |

---

## 🔧 Configuração de Squads

Cada squad tem um arquivo YAML com:

- **Descrição**: O que o squad faz
- **Lead Agent**: Especialista AIOS responsável
- **Members**: Agents envolvidos
- **Responsibilities**: Tarefas e áreas
- **Technology Stack**: Tecnologias utilizadas
- **Directories**: Arquivos principais
- **Metrics**: KPIs do squad
- **Critical Rules**: Regras obrigatórias

### Exemplo de leitura:
```bash
# Ver configuração do Squad Frontend
cat .squads/squads/frontend.yaml

# Procurar por:
# - responsibilities: (tarefas)
# - technology_stack: (tools)
# - directories: (arquivos)
# - metrics: (KPIs)
```

---

## 🌟 Próximas Fases

### Fase 2 (Semana 2)
- [ ] Estruturar stories com checkboxes
- [ ] Definir sprints (2 semanas)
- [ ] Criar ADRs para decisões
- [ ] Setup de métricas

### Fase 3 (Semana 3)
- [ ] Implementação de stories
- [ ] Testes de integração
- [ ] Documentação de APIs

### Fase 4+ (Q2 2026)
- [ ] Escalação de squads
- [ ] Subteams especializados
- [ ] Autonomia operacional

---

## 🤝 Contribuindo

1. Escolha seu squad
2. Leia sua configuração YAML
3. Entenda as responsabilidades
4. Cumpra os requisitos de qualidade
5. Faça PR com approval de 2+ leads
6. Merge e celebre! 🎉

---

## 📋 Última Atualização

- **Data**: 01 de março de 2026
- **Versão AIOS**: 2.1.0+
- **Status**: ✅ Ativo
- **Próxima Revisão**: 08 de março de 2026

---

## 📞 Suporte

- **Dúvidas sobre estrutura?** → Leia `SQUADS.md`
- **Primeiros passos?** → Leia `SETUP.md`
- **Dúvidas técnicas?** → Ask squad lead
- **Problemas no AIOS?** → Check `.aiox-core/`

---

**Bem-vindo aos squads AIOS! 🚀**
