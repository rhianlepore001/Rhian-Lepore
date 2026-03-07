# 🚀 Squad AIOS Setup Guide

Guia rápido para configurar e usar os squads AIOS no projeto Beauty OS.

---

## 1️⃣ Verificação Inicial

Confirme que você está no diretório raiz do projeto:

```bash
cd /path/to/beauty-os
ls -la
```

Você deve ver:
- `.agent/` (agent system)
- `.aios-core/` (AIOS framework)
- `.squads/` (squad configurations) ← NOVO
- `package.json`
- `CLAUDE.md`

---

## 2️⃣ Estrutura de Squads

```
.squads/
├── SQUADS.md                    # Documentação principal (LEIA PRIMEIRO)
├── SETUP.md                     # Este arquivo
├── squads/
│   ├── frontend.yaml           # Squad Frontend
│   ├── backend.yaml            # Squad Backend & Dados
│   ├── ai-features.yaml        # Squad AI & Features
│   ├── security.yaml           # Squad Segurança
│   ├── devops-qa.yaml          # Squad DevOps & QA
│   └── product.yaml            # Squad Produto & Docs
├── agents/                      # Agent configurations (por squad)
│   └── [examples TBD]
├── tasks/                       # Task definitions (por squad)
│   └── [examples TBD]
└── workflows/
    └── squad-onboarding.yaml   # Onboarding workflow
```

---

## 3️⃣ Acesso Rápido por Squad

### 👨‍💻 Squad Frontend
```bash
# Lead: frontend-specialist
cat .squads/squads/frontend.yaml
```
**Foco**: React 19, Tailwind CSS, componentes, UI/UX

### 🗄️ Squad Backend & Dados
```bash
# Lead: backend-specialist
cat .squads/squads/backend.yaml
```
**Foco**: Supabase, PostgreSQL, RLS, APIs

### 🤖 Squad AI & Features
```bash
# Lead: backend-specialist + claude-developer-platform
cat .squads/squads/ai-features.yaml
```
**Foco**: Gemini, Finance Doctor, features IA

### 🔒 Squad Segurança
```bash
# Lead: security-auditor
cat .squads/squads/security.yaml
```
**Foco**: Multi-tenant, RLS, auth, compliance

### 🚀 Squad DevOps & QA
```bash
# Lead: devops-engineer + qa-automation-engineer
cat .squads/squads/devops-qa.yaml
```
**Foco**: CI/CD, deploy, testes, monitoring

### 📚 Squad Produto & Documentação
```bash
# Lead: product-manager
cat .squads/squads/product.yaml
```
**Foco**: PRDs, ADRs, roadmap, documentação

---

## 4️⃣ Iniciar um Squad

### Passo 1: Ativar o Squad
```bash
# Exemplo: ativar Squad Frontend
@frontend-specialist

# Exemplo: ativar Squad Backend
@backend-specialist
```

### Passo 2: Verificar Responsabilidades
```bash
# Abrir a configuração do squad
cat .squads/squads/frontend.yaml
```

Procure por:
- `responsibilities:` - O que o squad faz
- `technology_stack:` - Tecnologias usadas
- `directories:` - Arquivos principais
- `metrics:` - KPIs do squad

### Passo 3: Começar Trabalho
1. Escolha uma task do backlog
2. Crie um branch: `git checkout -b feature/your-feature`
3. Implemente seguindo as regras do squad
4. Faça commit: `git commit -m "feature: descrição"`
5. Crie PR para code review

---

## 5️⃣ Fluxo Inter-Squads

Quando sua feature **envolve múltiplos squads**:

```
┌─────────────────────────────────┐
│ 1. Produto Squad                │
│    (Define requirements - PRD)   │
└──────────────┬──────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
  ┌─────────────┐  ┌─────────────┐
  │ Frontend    │  │ Backend     │
  │ Squad       │  │ Squad       │
  │ (Implementa)│  │ (Implementa)│
  └─────────────┘  └─────────────┘
       │               │
       └───────┬───────┘
               ▼
       ┌──────────────┐
       │ Security     │
       │ Squad        │
       │ (Valida RLS) │
       └──────────────┘
               │
               ▼
       ┌──────────────┐
       │ DevOps & QA  │
       │ Squad        │
       │ (Testa)      │
       └──────────────┘
```

**Processo**:
1. **Produto**: Cria PRD (`.ai/prd/{feature}.md`)
2. **Frontend + Backend**: Implementam em paralelo
3. **Security**: Revisa RLS e segurança
4. **DevOps/QA**: Testa e faz deploy
5. **Produto**: Cria release notes

---

## 6️⃣ Comandos Essenciais

```bash
# Verificar setup do projeto
npm run aios:doctor

# Rodar testes (DevOps/QA Squad)
npm test                        # Todos
npm test -- src/components      # Específico
npm run test:coverage           # Com coverage
npm run test:ui                 # Com UI

# Verificar qualidade (todos)
npm run lint                    # ESLint
npm run typecheck               # TypeScript
npm run lint --fix              # Auto-fix

# Rodar dev server (Frontend Squad)
npm run dev                     # http://localhost:3000

# Build para produção (DevOps Squad)
npm run build                   # Gera /dist
npm run preview                 # Preview local

# Sincronizar AIOS
npm run sync:ide                # Sync infrastructure
```

---

## 7️⃣ Documentação por Squad

Cada squad tem documentação específica:

```bash
# Frontend Squad
# → Componentes: pages/, components/
# → Estilos: Tailwind CSS + CSS variables
# → Tests: components/*.test.tsx
# → Docs: Storybook (TBD)

# Backend Squad
# → Supabase: lib/supabase.ts
# → Migrations: supabase/migrations/
# → RLS: supabase/policies/
# → Tests: lib/*.test.ts

# AI Squad
# → Gemini: lib/gemini.ts
# → Finance Doctor: pages/finance/
# → Tests: test/ai/

# Security Squad
# → RLS rules: supabase/policies/
# → Auth: contexts/AuthContext.tsx
# → Rules: .agent/rules/ (GEMINI.md priority)

# DevOps & QA Squad
# → CI/CD: .github/workflows/
# → Tests: test/, *.test.tsx
# → Config: vite.config.ts, vitest.config.ts

# Produto Squad
# → PRD: .ai/prd/
# → ADR: .ai/adr/
# → Roadmap: .squads/SQUADS.md (roadmap section)
```

---

## 8️⃣ Checkpoints Críticos

### Antes de Fazer um PR
- [ ] `npm run lint` ✅
- [ ] `npm run typecheck` ✅
- [ ] `npm test -- --run` ✅
- [ ] Código segue CLAUDE.md?
- [ ] Código segue GEMINI.md (P0 rules)?
- [ ] Afeta RLS? → Security squad review
- [ ] Muda infra? → DevOps squad review

### Antes de Merge para Main
- [ ] 2+ squad leads aprovaram
- [ ] CI/CD pipeline passou
- [ ] Security review (se necessário)
- [ ] Performance tests (se aplicável)

### Antes de Deploy
- [ ] Staging deployment OK?
- [ ] QA tests OK?
- [ ] Release notes criadas?
- [ ] Users notificados?

---

## 9️⃣ Troubleshooting

### "npm run dev não funciona"
```bash
npm install
npm run dev
```

### "ESLint errors"
```bash
npm run lint --fix  # Auto-fix
```

### "TypeScript errors"
```bash
npm run typecheck
# Abra tsconfig.json para configurações
```

### "Tests failing"
```bash
npm test -- --run   # Run once
npm run test:ui     # Ver visualmente qual falhou
```

### "AIOS command not found"
```bash
npm run sync:ide    # Sincronizar AIOS
```

---

## 🔟 Próximos Passos

1. ✅ Leia **SQUADS.md** (visão geral)
2. ✅ Leia **CLAUDE.md** (instruções globais)
3. ✅ Leia **GEMINI.md** (P0 rules)
4. ✅ Escolha seu squad e leia a config YAML
5. ✅ Faça setup do ambiente (`npm install` + `npm run dev`)
6. ✅ Escolha uma task do backlog
7. ✅ Crie seu primeiro PR
8. ✅ Celebrate! 🎉

---

## 📞 Suporte

- **Dúvidas sobre squad?** → Leia `SQUADS.md`
- **Dúvidas sobre projeto?** → Leia `CLAUDE.md`
- **Dúvidas sobre AI rules?** → Leia `.agent/rules/GEMINI.md`
- **Dúvidas técnicas?** → Ask squad lead
- **Bugs no AIOS?** → Report em `.aios-core/`

---

**Última atualização**: 01 de março de 2026
**Versão do AIOS**: 2.1.0+

Bem-vindo ao time! 🚀
