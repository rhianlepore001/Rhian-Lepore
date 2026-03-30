# 🏗️ Estrutura do AIOX Core — Guia em Português

**Documento:** Explicação da arquitetura do AIOX Core (Sistema de Orquestração de IA)
**Data:** 18 Mar 2026
**Audience:** Engenheiros, Product Managers, Arquitetos

---

## 📋 Visão Geral

O **AIOX Core** é um meta-framework que orquestra agentes de IA especializados para gerenciar fluxos de trabalho de desenvolvimento complexos. A estrutura é organizada em **4 camadas**:

```
┌─────────────────────────────────────────────────────────┐
│ L4: RUNTIME (Trabalho do Projeto)                       │
│    - docs/stories/ (histórias de desenvolvimento)       │
│    - src/ (código implementado)                         │
│    - tests/ (testes)                                    │
└─────────────────────────────────────────────────────────┘
                           △
                           │
┌─────────────────────────────────────────────────────────┐
│ L3: CONFIGURAÇÃO DO PROJETO (Mutável)                   │
│    - .aiox-core/data/ (dados de projeto)               │
│    - agent memory (MEMORY.md)                          │
│    - core-config.yaml (configuração)                   │
└─────────────────────────────────────────────────────────┘
                           △
                           │
┌─────────────────────────────────────────────────────────┐
│ L2: TEMPLATES DO FRAMEWORK (Somente Extensão)          │
│    - tasks/ (workflows de tarefas)                     │
│    - templates/ (modelos de documentos)                │
│    - checklists/ (listas de verificação)               │
│    - workflows/ (orquestração)                         │
└─────────────────────────────────────────────────────────┘
                           △
                           │
┌─────────────────────────────────────────────────────────┐
│ L1: NÚCLEO DO FRAMEWORK (Nunca Modificar)              │
│    - .aiox-core/core/ (núcleo da orquestração)         │
│    - constitution.md (princípios inegociáveis)         │
│    - bin/aiox.js (CLI)                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🗂️ Estrutura de Diretórios Completa

### `.aiox-core/` — Framework AIOX Core

```
.aiox-core/
│
├── core/                                    # ⚙️ NÚCLEO (L1) — Nunca modificar
│   ├── config/
│   │   ├── config-resolver.js              # Carregador de configuração
│   │   └── schema-validator.js             # Validador de esquema
│   │
│   ├── orchestration/
│   │   ├── bob-orchestrator.js             # Orquestrador Bob (modo assistido)
│   │   ├── terminal-spawner.js             # Spawner de agentes em terminais
│   │   ├── executor-assignment.js          # Atribuição de tarefas a agentes
│   │   └── data-lifecycle-manager.js       # Gerenciador de ciclo de vida
│   │
│   ├── agents/
│   │   ├── agent-factory.js                # Factory para criar agentes
│   │   ├── agent-registry.js               # Registro de agentes disponíveis
│   │   └── permission-enforcer.js          # Verificador de permissões
│   │
│   ├── code-intel/
│   │   ├── provider-interface.js           # Interface para code intelligence
│   │   ├── enricher.js                     # Enriquecedor de análise
│   │   └── client.js                       # Cliente de code intelligence
│   │
│   └── graph-dashboard/
│       ├── cli.js                          # CLI para gráficos de dependência
│       ├── renderers/                      # Renderizadores (ASCII, JSON, etc)
│       └── data-sources/                   # Fontes de dados
│
├── development/                             # 📦 TEMPLATES (L2) — Extensível
│   ├── agents/                             # Definições de personas de agentes
│   │   ├── pm.md                           # Product Manager (Morgan)
│   │   ├── architect.md                    # Arquiteta (Aria)
│   │   ├── dev.md                          # Desenvolvedor (Dex)
│   │   ├── qa.md                           # QA (Quinn)
│   │   ├── data-engineer.md                # Engenheiro de Dados (Dara)
│   │   ├── ux-design-expert.md             # UX Designer (Uma)
│   │   ├── devops.md                       # DevOps (Gage)
│   │   └── ... (outros agentes)
│   │
│   ├── tasks/                              # Workflows executáveis
│   │   ├── create-doc.md                   # Criar documento
│   │   ├── create-next-story.md            # Criar próxima história
│   │   ├── dev-develop-story.md            # Desenvolver história
│   │   ├── qa-gate.md                      # QA Gate
│   │   ├── execute-epic-plan.md            # Executar plano épico
│   │   └── ... (100+ tasks)
│   │
│   ├── templates/                          # Modelos de documentos
│   │   ├── prd-tmpl.yaml                   # Template PRD
│   │   ├── story-tmpl.yaml                 # Template Story
│   │   ├── epic-tmpl.yaml                  # Template Epic
│   │   └── ... (outros templates)
│   │
│   ├── checklists/                         # Listas de verificação
│   │   ├── pm-checklist.md                 # Checklist PM
│   │   ├── qa-checklist.md                 # Checklist QA
│   │   └── ... (outros checklists)
│   │
│   ├── workflows/                          # Orquestrações multi-step
│   │   ├── story-development-cycle.md      # SDC workflow
│   │   ├── qa-loop.md                      # QA Loop
│   │   ├── spec-pipeline.md                # Spec Pipeline
│   │   └── brownfield-discovery.md         # Brownfield Discovery
│   │
│   ├── scripts/
│   │   ├── unified-activation-pipeline.js  # Pipeline de ativação
│   │   └── greeting-builder.js             # Construtor de saudações
│   │
│   └── data/
│       ├── workflow-chains.yaml            # Cadeia de workflows
│       ├── technical-preferences.md        # Preferências técnicas
│       └── mcp-tool-examples.yaml          # Exemplos de ferramentas MCP
│
├── infrastructure/                          # 🔧 Infraestrutura
│   ├── docker/                             # Docker configs
│   ├── ci-cd/                              # Pipelines CI/CD
│   └── deployment/                         # Estratégia de deploy
│
├── data/                                    # 📊 Dados do Framework (L3)
│   ├── projects.json                       # Dados de projetos
│   ├── agents-registry.json                # Registro de agentes
│   └── workflow-chains.yaml                # Cadeias de workflow
│
└── constitution.md                          # 📜 Constitution (Princípios Inegociáveis)
```

### `docs/` — Documentação do Projeto (L4)

```
docs/
├── stories/                                 # 📖 Histórias de Desenvolvimento
│   ├── EPIC-002-Brownfield-Discovery.md    # Epic (grande tarefa)
│   ├── 2026-03-14-US-020-database-audit.md # User Story
│   ├── 2026-03-18-US-023-assessment.md     # User Story
│   └── ... (histórias de desenvolvimento)
│
├── architecture/                            # 🏗️ Arquitetura
│   ├── technical-debt-assessment.md        # Avaliação de débito técnico
│   ├── TECHNICAL-DEBT-REPORT.md            # Relatório executivo
│   ├── system-architecture.md              # Arquitetura do sistema
│   ├── db-specialist-review.md             # Review de DB
│   ├── ux-specialist-review.md             # Review de UX
│   └── ... (documentação arquitetural)
│
├── prd/                                     # 📋 PRDs (Product Requirements)
│   ├── current-prd.md                      # PRD atual
│   └── ... (histórico de PRDs)
│
├── guides/                                  # 📚 Guias
│   ├── user-guide.md                       # Guia de usuário
│   ├── developer-guide.md                  # Guia de desenvolvedor
│   └── ... (guias diversos)
│
├── qa/                                      # ✅ QA
│   ├── qa-review.md                        # Review de QA
│   ├── test-reports/                       # Relatórios de teste
│   └── coverage/                           # Cobertura de testes
│
└── archive/                                 # 📦 Arquivos
    └── ... (documentação antiga/histórica)
```

### `.claude/` — Configuração do Claude Code (L3)

```
.claude/
├── settings.json                            # Configurações do Claude Code
├── rules/                                   # Regras contextuais
│   ├── agent-authority.md                  # Matriz de autoridade de agentes
│   ├── agent-handoff.md                    # Protocolo de handoff
│   ├── workflow-execution.md               # Execução de workflows
│   ├── story-lifecycle.md                  # Ciclo de vida de stories
│   └── ... (outras regras)
│
└── CLAUDE.md                                # Instruções do projeto (L3)
```

### `.agent/` — Regras Customizadas do Projeto (L3)

```
.agent/
├── rules/
│   ├── GEMINI.md                           # Regras master (P0 priority)
│   ├── CROSS_SYNC.md                       # Sincronização cruzada
│   ├── rule-*.md                           # Regras específicas
│   └── ... (regras customizadas)
│
├── memory/
│   ├── MEMORY.md                           # Memória autossalva do agente
│   ├── PROJECT_MEMORY.md                   # Memória do projeto
│   └── SESSION-*.md                        # Memória de sessão
│
└── agents/                                  # Perfis customizados de agentes
    └── ... (personas customizadas)
```

---

## 🔄 Fluxo de Trabalho (Ciclo Completo)

### 1️⃣ **Criação de História (Story)**

```
User Request
    ↓
@pm (Morgan) — Cria Epic/PRD
    ↓
@sm (River) — Cria User Stories a partir da Epic
    ↓
@po (Pax) — Valida a Story (10-point checklist)
    ↓
Story pronta para desenvolvimento
```

### 2️⃣ **Desenvolvimento**

```
Story em desenvolvimento
    ↓
@dev (Dex) — Implementa a funcionalidade
    ↓
@qa (Quinn) — Revisa o código
    ↓
Correções conforme feedback
    ↓
Story concluída
```

### 3️⃣ **Ciclo QA Iterativo**

```
QA encontra problemas
    ↓
@qa determina: PASS / CONCERNS / FAIL / WAIVED
    ↓
Se CONCERNS/FAIL → @dev corrige
    ↓
Re-review (máx 5 iterações)
    ↓
APPROVED ou ESCALATED
```

---

## 👥 Sistema de Agentes (9 Personas)

| Agent | Persona | Especialidade | Sigla |
|-------|---------|---------------|-------|
| **@pm** | Morgan (Estrategista) | PRDs, Epics, Roadmap | 📋 |
| **@po** | Pax (Dono de Produto) | Validação de Stories | 📊 |
| **@sm** | River (Scrum Master) | Criação de Stories | 🌊 |
| **@architect** | Aria (Visionária) | Arquitetura, Design | 🏛️ |
| **@dev** | Dex (Implementador) | Código, Implementação | 💻 |
| **@qa** | Quinn (Guardião) | Testes, Quality Gates | ✅ |
| **@data-engineer** | Dara (Especialista BD) | Banco de Dados, RLS | 🗄️ |
| **@ux-design-expert** | Uma (Especialista UX) | UX/UI, Acessibilidade | 🎨 |
| **@devops** | Gage (DevOps) | CI/CD, Deploy, Git Push | 🚀 |

---

## 📝 4 Workflows Principais

### 1. **Story Development Cycle (SDC)** — Desenvolvimento Normal

```
Fase 1: Criar (Weeks 0-1)
  @sm cria story a partir de epic
    ↓
Fase 2: Validar (Week 1)
  @po valida com checklist de 10 pontos
    ↓
Fase 3: Implementar (Weeks 2-4)
  @dev desenvolve
  CodeRabbit review automático
    ↓
Fase 4: QA Gate (Week 4)
  @qa valida: PASS/CONCERNS/FAIL/WAIVED
  Se CONCERNS → volta para @dev (máx 5 tentativas)
```

### 2. **QA Loop** — Iterativo

```
@qa revisa → VERDICT
    ↓
Se FAIL → @dev corrige
    ↓
@qa revisa novamente
    ↓
Máx 5 iterações → Escalate se bloqueia
```

### 3. **Spec Pipeline** — Pré-Implementação

```
Gather (Requisitos)
    ↓
Assess (Complexidade)
    ↓
Research (se needed)
    ↓
Write Spec (Especificação)
    ↓
Critique (Validação)
    ↓
Plan (Plano de implementação)
```

### 4. **Brownfield Discovery** — Auditoria Técnica (10 fases)

```
Fases 1-3: Coleta de Dados
  @architect → arquitetura
  @data-engineer → schema
  @ux-design-expert → frontend

Fases 4-7: Draft & Validação
  @architect → draft consolidado
  @data-engineer → review BD
  @ux-design-expert → review UX
  @qa → QA Gate

Fases 8-10: Finalização
  @architect → avaliação final
  @analyst → relatório executivo
  @pm → geração de épicas
```

---

## 🔐 Princípios Inegociáveis (Constitution)

**Artigo I: CLI First**
- Sempre usar CLIs quando disponível
- Preferir `aiox` CLI em vez de UI

**Artigo II: Autoridade de Agentes**
- Cada agente tem responsabilidades específicas
- Não há sobreposição de autoridade
- Escalação clara para @aiox-master

**Artigo III: Desenvolvimento Orientado por Stories**
- Todo trabalho começa com uma story
- Stories rastreiam progresso
- Checkboxes indicam conclusão

**Artigo IV: Sem Invenção**
- Não inventar recursos fora do escopo
- Tudo deve rastrear para requirements

**Artigo V: Qualidade Primeiro**
- CodeRabbit valida antes de merge
- QA Gate valida antes de produção
- Testes para tudo crítico

**Artigo VI: Imports Absolutos**
- Use paths absolutos em imports
- Evite imports relativos

---

## 🎯 Ciclo de Vida de Uma Story

```
┌─────────────────────────────┐
│ 1. DRAFT                    │ @sm cria, @po valida
│    status: draft            │
└────────────┬────────────────┘
             ↓
┌─────────────────────────────┐
│ 2. READY FOR DEV            │ @po aprova, @dev pega
│    status: ready            │
└────────────┬────────────────┘
             ↓
┌─────────────────────────────┐
│ 3. IN PROGRESS              │ @dev trabalha
│    status: in_progress      │
└────────────┬────────────────┘
             ↓
┌─────────────────────────────┐
│ 4. READY FOR REVIEW         │ Code pronto
│    status: in_review        │
└────────────┬────────────────┘
             ↓
┌─────────────────────────────┐
│ 5. QA GATE                  │ @qa avalia
│    verdict: PASS/CONCERNS   │
│            /FAIL/WAIVED     │
└────────────┬────────────────┘
             ↓
┌─────────────────────────────┐
│ 6. DONE                     │ Merged to main
│    status: done             │ Ready for deploy
│    verdict: APPROVED        │
└─────────────────────────────┘
```

---

## 🚀 Como Começar a Usar AIOX

### Passo 1: Ativar um Agente
```bash
# Ativar Morgan (PM)
@pm

# Ativar Aria (Architect)
@architect

# Ativar Dex (Developer)
@dev
```

### Passo 2: Usar Comando do Agente
```bash
# PM cria epic
*create-epic

# Dev desenvolve story
*develop

# QA faz gate review
*gate
```

### Passo 3: Seguir o Workflow
- Cada agente tem workflows específicos
- Workflows encadeiam agentes
- Stories rastreiam o progresso

### Passo 4: Executar Epic Completo
```bash
# PM orquestra execução de 12 semanas
*execute-epic EPIC-003-S1

# Paralleliza trabalho de @dev, @data-engineer, @ux-design-expert
# Coordena handoffs entre agentes
```

---

## 📚 Documentação Essencial

| Documento | Propósito |
|-----------|-----------|
| `.aiox-core/constitution.md` | Princípios inegociáveis |
| `.claude/CLAUDE.md` | Instruções do projeto |
| `.claude/rules/agent-authority.md` | Matriz de autoridade |
| `.claude/rules/workflow-execution.md` | Execução de workflows |
| `docs/architecture/technical-debt-assessment.md` | Avaliação técnica |
| `MEMORY.md` (em `.agent/memory/`) | Memória de longo prazo |

---

## 💡 Dicas Práticas

### Para criar uma epic nova:
```
1. @pm *create-epic "Nome da Epic"
2. Define goals, timeline, esforço
3. @sm quebra em stories
4. @dev executa
5. @qa valida
```

### Para trabalhar em story:
```
1. Abrir story em docs/stories/
2. @dev *develop STORY-ID
3. Implementar
4. @qa *gate STORY-ID
5. Se CONCERNS → volta para @dev
```

### Para executar epic completa:
```
1. @pm *execute-epic path/to/epic.md --mode=interactive
2. Morgan orquestra agentes
3. Trabalho paralelo quando possível
4. Handoffs automáticos entre agentes
5. Status updates semanais
```

---

## 🔗 Relacionamentos Entre Agentes

```
@pm (Morgan) — Orquestra
    ├── Envia para: @sm, @architect, @po
    └── Recebe de: @analyst

@sm (River) — Cria Stories
    ├── Recebe de: @pm
    ├── Envia para: @po
    └── Coordena com: @dev

@po (Pax) — Valida
    ├── Recebe de: @sm
    └── Envia para: @dev

@dev (Dex) — Implementa
    ├── Recebe de: @po
    ├── Coordena com: @architect
    └── Envia para: @qa

@qa (Quinn) — Revisa
    ├── Recebe de: @dev
    └── Envia para: @devops (se PASS)

@devops (Gage) — Deploy
    ├── Recebe de: @qa
    └── Controla: git push, CI/CD
```

---

## 📊 Exemplo Prático: EPIC-003 (12 Semanas)

```
Morgan (@pm) cria EPIC-003
    ↓
Morgan cria 3 sprints:
  - EPIC-003-S1 (P0 críticos)
  - EPIC-003-S2 (P1 altos)
  - EPIC-003-S3 (P2 médios)
    ↓
River (@sm) quebra cada sprint em 10-15 stories
    ↓
Dex (@dev) implementa stories em paralelo
  com coordenação de Dara (@data-engineer) e Uma (@ux-design-expert)
    ↓
Quinn (@qa) revisa cada story (máx 5 iterações)
    ↓
Gage (@devops) faz deploy ao final de cada sprint
    ↓
Resultado: App 5x mais rápido, 75% acessível, 100% seguro
```

---

## ✅ Checklist de Implementação

- [ ] Ler constitution.md (inegociável)
- [ ] Entender 4 workflows principais
- [ ] Conhecer 9 agentes e suas responsabilidades
- [ ] Saber como ativar agentes (@agent-name)
- [ ] Saber como usar comandos de agentes (*command)
- [ ] Entender ciclo de vida de story
- [ ] Saber como abrir issues do QA Gate
- [ ] Ser capaz de executar epic completa

---

**Pronto para começar? Ative um agente:**

```
@pm    # Para criar épicas e planejar
@dev   # Para implementar código
@qa    # Para revisar qualidade
```

---

*Documento de referência: AIOX Core Structure in Portuguese*
*Last updated: 18 Mar 2026*
