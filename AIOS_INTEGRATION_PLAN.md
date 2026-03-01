# AIOS Integration Plan — AgenX

> **Objetivo Final:** Transformar AgenX em um projeto 100% governado por AIOS com rastreabilidade completa, quality gates automáticos e escalabilidade pra múltiplos devs.

---

## 📊 Status Atual vs. Alvo

### Hoje (28 Feb 2026)
```
✅ Constitution.md        — Definida
✅ 20+ Agentes            — Criados
✅ Workflows AIOS         — Estruturados
❌ Stories em uso         — Apenas 3 exemplos
❌ Quality gates          — Manuais (rodar scripts 1 por 1)
❌ ADRs documentados      — Não existe
❌ Dev novo consegue seguir fluxo — Pode, mas sem mentorship
```

### Alvo (7 Março 2026 — "GO LIVE" de AIOS)
```
✅ Constitution.md        — Mantida
✅ 20+ Agentes            — Utilizados
✅ Workflows AIOS         — Ativados via /develop-story
✅ Stories em uso         — 4+ com checkboxes de progresso
✅ Quality gates          — Integrados em CI/CD
✅ ADRs documentados      — .ai/decision-logs-index.md
✅ Dev novo consegue seguir fluxo — `/develop-story` guia 100%
```

---

## 🎯 4 Fases de Integração

### ✅ Fase 1: Estruturação (HOJE — 28 Fev, 2h)

**O Quê:** Criar base de stories + manuais

| Item | Status | Responsável | Deadline |
|------|--------|-------------|----------|
| Criar US-004 (Finance Doctor) | ✅ FEITO | @frontend-specialist | 28 Fev |
| Criar US-005 (AIOS Integration) | ✅ FEITO | @aios-master | 28 Fev |
| ~~Criar US-006 (Clerk Migration)~~ | ❌ DESCARTADO | N/A | 1 Mar |
| Atualizar `docs/stories/README.md` | ✅ FEITO | @orchestrator | 28 Fev |
| Criar `AIOS_COMMANDS_MAPPING.md` | ✅ FEITO | @aios-master | 28 Fev |
| Criar `.ai/CLERK_DECISION.md` (ADR) | ✅ FEITO | @aios-master | 1 Mar |
| Corrigir Logger.log() (TypeScript) | ✅ FEITO | Você | 28 Fev |
| Configurar .eslintignore | ✅ FEITO | Você | 28 Fev |

**Saída:** Stories estruturadas + manuais criados

---

### 🔄 Fase 2: Estrutura de Stories (1 Semana — 1-7 Mar)

**O Quê:** Converter 4+ features em progresso para stories AIOS com checkboxes

**Subtarefas:**

```markdown
## 2.1: Converter Finance Doctor (US-004)
- [ ] Abrir US-004
- [ ] Preencher seção "Progresso Atual" com status real
- [ ] Adicionar checkboxes em "Critérios de Aceitação"
- [ ] Rodar lint + typecheck + tests
- [ ] Atualizar status para "done"

## 2.2: Converter AIOS Integration (US-005)
- [ ] Estruturar tasks do AIOS Integration
- [ ] Quebrar em sub-tarefas de 30-60min
- [ ] Rastrear blockedBy (dependências)
- [ ] Começar implementação

## 2.3: Converter Clerk Migration (US-006)
- [ ] Verificar branch clerk-migration
- [ ] Documentar o que já foi feito
- [ ] Listar o que falta
- [ ] Plannear merge para main

## 2.4: Estruturar 2+ stories de bugs/tech debt
- [ ] Listar issues conhecidas
- [ ] Criar stories pra cada uma
- [ ] Priorizar
```

**Saída:** 6+ stories com progresso visível + checkboxes atualizados

---

### 🛠️ Fase 3: Quality Gates (Semana 2 — 8-14 Mar)

**O Quê:** Integrar `checklist.py` no workflow diário + documentar decisões arquiteturais

**Subtarefas:**

```markdown
## 3.1: Validação Manual
- [ ] Rodar `python .agent/scripts/checklist.py .` localmente
- [ ] Corrigir quaisquer erros críticos
- [ ] Documentar o que foi encontrado

## 3.2: Documentar Decisões Arquiteturais (ADRs)
- [ ] Criar `.ai/decision-logs-index.md`
- [ ] Documentar: Por que Clerk vs. Supabase Auth?
- [ ] Documentar: Por que Gemini vs. outras IAs?
- [ ] Documentar: Por que Stripe pra payments?
- [ ] Documentar: Por que React 19 vs. Vue/Svelte?

## 3.3: Integrar checklist.py em CI/CD (Futuro)
- [ ] Criar GitHub Actions workflow que roda checklist.py
- [ ] BLOCK PRs que falharem em security ou lint
- [ ] WARN PRs que falharem em UX checks
```

**Saída:** ADRs documentados + CI/CD preparado para gates

---

### 🚀 Fase 4: Escalabilidade (Semana 3+ — 15+ Mar)

**O Quê:** Preparar para crescimento (novos devs, features complexas, automações)

**Subtarefas:**

```markdown
## 4.1: Onboarding de Novo Dev
- [ ] Novo dev segue `/develop-story` do zero
- [ ] Consegue criar feature simples em 2h (sem mentorship)
- [ ] Consegue fazer PR sem help (story + quality gates)

## 4.2: Orchestration Complexa
- [ ] Feature que precisa 3+ agentes usa `/orchestrate`
- [ ] Exemplo: "Implementar novo módulo de CRM"
  - @backend-specialist (schema)
  - @frontend-specialist (UI)
  - @qa (testes)
  - @devops (deploy)

## 4.3: Integrações n8n (Automações)
- [ ] Criar fluxo n8n para notificações de agendamento
- [ ] Criar fluxo n8n para envio de recibos financeiros
- [ ] Documentar em `docs/n8n-workflows/`

## 4.4: Analytics & Reporting
- [ ] Dashboard de project status (rodando `*status` diariamente)
- [ ] Velocity de stories (quantas por semana)
- [ ] Coverage de testes (não cai abaixo de X%)
```

**Saída:** Projeto escalável, pronto pra equipe de 3-5 devs

---

## 📈 Métricas de Sucesso

### Semana 1 (7 Mar)
- ✅ 4+ stories estruturadas (Finance Doctor, AIOS Integration, + 2 novas)
- ✅ 0 stories bloqueadas (nada esperando por dependência)
- ✅ `.ai/CLERK_DECISION.md` documentado (decisão arquitetural clara)
- ✅ Backup automático ativado no Supabase
- ✅ Todas as regras GEMINI.md são respeitadas

### Semana 2 (14 Mar)
- ✅ 10+ ADRs documentados
- ✅ CI/CD rodando `checklist.py` automaticamente
- ✅ 100% das PRs têm story associada
- ✅ 0 bugs em produção por violação de RLS

### Semana 3+ (21+ Mar)
- ✅ Novo dev consegue contribuir sem mentorship
- ✅ Velocity stable (X features/semana)
- ✅ 0 breaking changes sem story
- ✅ Time consegue trabalhar em paralelo sem conflicts

---

## 🎓 Training Roadmap

### Para Devs Antigos (Você)
```
Day 1: Ler Constitution.md + GEMINI.md
Day 2: Rodar `/develop-story` para US-004
Day 3: Usar `/orchestrate` para coordenar 2 agentes
Day 4: Implementar story complexa usando AIOS
Day 5: Treinar novo dev no fluxo
```

### Para Novo Dev
```
Hour 1: Ler CLAUDE.md + AIOS_COMMANDS_MAPPING.md
Hour 2: Rodar `/develop-story` com mentorship
Hour 4: Criar story simples sem mentorship
Hour 8: PR simples sem mentorship
```

---

## 🚫 Riscos & Mitigação

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Time esquece de usar `/develop-story` | Alto | Checklist pré-push valida story |
| Stories viram "backlog morto" | Médio | Revisar weekly, atualizar checkboxes |
| `checklist.py` é muito lento | Médio | Rodar em CI/CD, não localmente sempre |
| RLS é violada silenciosamente | **Crítico** | `security_scan.py` detecta |

---

## 📅 Timeline Visual

```
FEB 28         MAR 7          MAR 14         MAR 21
  |             |              |              |
  V             V              V              V
Phase 1      Phase 2        Phase 3        Phase 4
(TODAY)      (Stories)      (Gates)        (Escalate)
  |             |              |              |
  +--2h--+      |              |              |
         +-----7d-----+        |              |
                      +-------7d-------+     |
                                       +----7d----+

GO LIVE AIOS: 7 de Março
```

---

## 🔗 Checklist Final (Para Hoje)

- [x] Criar US-004, US-005, US-006
- [x] Atualizar `docs/stories/README.md`
- [x] Criar `AIOS_COMMANDS_MAPPING.md`
- [ ] Rodar `/status` e validar saída
- [ ] Rodar `python .agent/scripts/checklist.py .`
- [ ] Comprometer com timeline (assinar abaixo)

---

## ✍️ Commitment

**Eu, [seu nome], cometo-me com:**

- Usar `/develop-story` para TODAS as features novas a partir de 1º de Março
- Manter stories com checkboxes atualizados
- Rodar `checklist.py` antes de QUALQUER push
- Documentar decisões arquiteturais em ADRs

**Assinado:** ___________
**Data:** 28 Fev 2026

---

**Versão:** 1.0.0
**Criado:** 2026-02-28
**Próxima Review:** 2026-03-07
