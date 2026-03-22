<!--
## Execution Modes

### 1. YOLO Mode — Fast (0-1 prompts)
- Auto-answer dimensions from story context
- Flag low-confidence answers
- Best for: well-specified stories

### 2. Interactive Mode — Balanced (6-12 prompts) [DEFAULT]
- One elicitation per dimension
- User/agent answers, agent probes if vague
- Best for: most new features

### 3. Socratic Deep Mode — Thorough (15-30 prompts)
- Multiple rounds of probing per dimension
- Devil's advocate position taken on each answer
- Best for: high-risk or ambiguous features

---

## Task Definition (AIOX Task Format V1.0)

```yaml
task: socraticFeatureGate()
responsável: Any agent (@dev, @po, @architect)
responsavel_type: Agente
atomic_layer: Organism

Entrada:
  - campo: story_id
    tipo: string
    origem: User Input
    obrigatório: true

  - campo: story_path
    tipo: string
    origem: Derived from story_id
    obrigatório: true

  - campo: mode
    tipo: enum
    valores: [yolo, interactive, deep]
    obrigatório: false
    default: interactive

Saída:
  - campo: gate_artifact
    tipo: yaml
    destino: '{qa.qaLocation}/gates/socratic-{story-slug}.yaml'
    persistido: true

  - campo: verdict
    tipo: enum
    valores: [CLEARED, REFINED, CHALLENGED, BLOCKED]
    destino: Story file (Dev Agent Record)
    persistido: true
```

---

## Pre-Conditions

```yaml
pre-conditions:
  - [ ] Story file exists at story_path
    blocker: true
  - [ ] Story has title, problem statement, and at least draft AC
    blocker: true
  - [ ] Story status is Draft or Ready (not InProgress)
    blocker: false
```

---

## Post-Conditions

```yaml
post-conditions:
  - [ ] Gate artifact created at qa.qaLocation/gates/
    blocker: true
  - [ ] Verdict recorded in story Dev Agent Record
    blocker: true
  - [ ] Critical gaps listed explicitly (empty list if none)
    blocker: true
```

---

## Metadata

```yaml
story: N/A
version: 1.0.0
tags:
  - quality-assurance
  - pre-development
  - socratic-method
  - feature-validation
updated_at: 2026-03-22
```

Powered by AIOX™ Core -->

---
checklists:
  - socratic-feature-gate.md
execution_mode: interactive
elicit: true
---

# socratic-feature-gate

Apply Socratic questioning to validate a feature before development begins, surfacing hidden assumptions, unclear scope, and unvalidated decisions.

## Purpose

This task prevents rework by ensuring that **before any code is written**, the feature's problem, user, scope, failure modes, approach, and definition of done are clearly understood. It does not rubber-stamp requirements — it actively challenges them.

## When to Run

- Before starting `dev-develop-story.md` for any non-trivial feature
- When the story AC feel vague or assumed
- When the technical approach was not discussed during story creation
- When scope boundaries are unclear

## Workflow

### Step 1 — Load Story Context

Read the target story file completely. Extract:
- Story title and ID
- Problem statement / user need
- Acceptance criteria (current draft)
- Technical notes (if any)
- Existing file list or architecture context

### Step 2 — Run Dimension 1: Por Quê

Present to the user/agent:

> "Antes de começar, vou fazer algumas perguntas para garantir clareza total.
>
> **Dimensão 1 — Por Quê:**
> Qual problema real e específico esta feature resolve? Descreva em termos de impacto no usuário, não em termos de solução."

Wait for answer. If vague, probe:
- "Como sabemos que isso É um problema — qual evidência temos?"
- "Se não construirmos isso, o que acontece concretamente?"

Score dimension 1 (1-5) based on answer quality.

### Step 3 — Run Dimension 2: Para Quem

> "**Dimensão 2 — Para Quem:**
> Quem especificamente se beneficia? Usuário novo ou veterano? Admin, staff, ou dono do negócio?"

Probe if generic: "Um usuário de barbeiro vs. salão — o benefício é igual?"

Score dimension 2.

### Step 4 — Run Dimension 3: O Quê

> "**Dimensão 3 — O Quê:**
> O que está explicitamente FORA do escopo? Liste pelo menos 2 coisas que um desenvolvedor poderia assumir que estão incluídas, mas não estão."

Probe if only positives listed: "E as dependências? O que precisa existir antes?"

Score dimension 3.

### Step 5 — Run Dimension 4: E Se

> "**Dimensão 4 — E Se:**
> O que acontece quando isso falha? Estado de rede offline, dado inválido, usuário sem permissão, dois usuários editando ao mesmo tempo?"

Probe: "Como o isolamento multi-tenant é garantido aqui?"

Score dimension 4.

### Step 6 — Run Dimension 5: Como

> "**Dimensão 5 — Como:**
> Por que esta implementação e não as alternativas? Quais alternativas foram consideradas e descartadas?"

Probe: "A solução mais simples possível seria o quê? Por que não fazemos isso?"

Score dimension 5.

### Step 7 — Run Dimension 6: Quando

> "**Dimensão 6 — Quando:**
> Como saberemos, sem dúvida, que está pronto? Dê um cenário de teste positivo e um negativo específicos."

Probe if vague: "'Funciona corretamente' não é um critério. O que você testaria primeiro?"

Score dimension 6.

### Step 8 — Calculate Verdict

Average the 6 dimension scores. Apply verdict logic:

| Average | No 1s | No 2s | Verdict |
|---------|-------|-------|---------|
| >= 4.0 | ✓ | — | CLEARED |
| 3.0-3.9 | ✓ | ✓ | REFINED |
| 3.0-3.9 | ✓ | ✗ | REFINED |
| 2.0-2.9 | ✓ | — | CHALLENGED |
| Any | ✗ | — | BLOCKED |

Present verdict with full explanation:

```
VERDICT: [CLEARED/REFINED/CHALLENGED/BLOCKED]
Average Score: X.X/5.0

Dimensions:
  Por Quê:    X/5 — [brief note]
  Para Quem:  X/5 — [brief note]
  O Quê:      X/5 — [brief note]
  E Se:       X/5 — [brief note]
  Como:       X/5 — [brief note]
  Quando:     X/5 — [brief note]

Critical Gaps:
  - [gap 1]
  - [gap 2]

Next Action: [specific instruction]
```

### Step 9 — Write Gate Artifact

Create YAML file at `{qa.qaLocation}/gates/socratic-{story-slug}.yaml`:

```yaml
schema: 1
gate_type: socratic
story: '{epic}.{story}'
executed_by: '{agent}'
timestamp: '{ISO-8601}'
dimensions:
  why:       { score: X, gaps: [] }
  for_whom:  { score: X, gaps: [] }
  what:      { score: X, gaps: [] }
  what_if:   { score: X, gaps: [] }
  how:       { score: X, gaps: [] }
  when:      { score: X, gaps: [] }
average_score: X.X
verdict: CLEARED
critical_gaps: []
next_action: 'Proceed to dev-develop-story'
```

### Step 10 — Update Story File

In the story's Dev Agent Record section, append:

```markdown
### Socratic Gate
- **Date:** {ISO date}
- **Verdict:** CLEARED/REFINED/CHALLENGED/BLOCKED
- **Average Score:** X.X/5.0
- **Gate File:** `{path}/socratic-{story-slug}.yaml`
- **Critical Gaps:** None / [list]
```

## Verdict Actions

| Verdict | Agent Action |
|---------|-------------|
| CLEARED | Proceed immediately to `dev-develop-story` |
| REFINED | List items, update AC, re-run affected dimensions only |
| CHALLENGED | Return story to `@po *validate-story-draft` with gap list |
| BLOCKED | Escalate to `@pm` — story needs full spec cycle |

## Notes

- This gate is **advisory** for trivial bug fixes and copy changes
- This gate is **mandatory** for any feature touching new UI, data models, or user flows
- In YOLO mode, auto-score based on story content; flag low-confidence scores explicitly
- The `@po` agent may override a CHALLENGED verdict with documented justification
