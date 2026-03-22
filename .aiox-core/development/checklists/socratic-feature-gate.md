# Socratic Feature Gate Checklist

## Purpose

This checklist applies the Socratic method to validate a feature **before** development begins. Instead of pass/fail criteria, it uses probing questions to surface hidden assumptions, unclear scope, and unvalidated decisions — preventing rework by catching problems at the idea stage.

**When to use:** Before writing code for any new feature, especially when:
- Requirements feel incomplete or assumed
- The "why" behind the feature isn't clear
- Multiple interpretations of scope exist
- Technical approach was decided without exploring alternatives

---

[[LLM: INITIALIZATION INSTRUCTIONS — SOCRATIC FEATURE GATE

This checklist drives a DIALECTICAL DIALOGUE, not a checkbox exercise.

Your role is to question, not to validate. For each dimension:

1. Read the Socratic question
2. Ask the user/agent to answer it
3. Apply the follow-up probes if the answer is vague or assumed
4. Score the dimension 1-5 (see scoring guide below)
5. Identify any GAPS — things that were not answered or assumed

SCORING GUIDE:
- 5 = Clear, specific, validated answer with evidence
- 4 = Clear answer, reasonable assumptions, no critical gaps
- 3 = Acceptable answer but contains unvalidated assumptions
- 2 = Vague or incomplete — needs probing
- 1 = No answer or contradictory — BLOCK

VERDICT LOGIC:
- Average >= 4.0 AND no dimension scored 1 → CLEARED
- Average 3.0-3.9 OR one dimension scored 2 → REFINED
- Average 2.0-2.9 OR two dimensions scored 2 → CHALLENGED
- Average < 2.0 OR any dimension scored 1 → BLOCKED

Do NOT rush to completion. The goal is CLARITY, not approval.]]

---

## Dimension 1 — Por Quê (Problem Clarity)

**Socratic Question:** *"Qual problema real e específico esta feature resolve?"*

[[LLM: FOLLOW-UP PROBES FOR DIMENSION 1

If the answer is vague (e.g., "melhora a experiência"), probe with:

- "Para QUEM exatamente essa experiência melhora?"
- "Como sabemos que isso É um problema — qual evidência temos?"
- "Se não construirmos isso, o que acontece concretamente?"
- "Existe uma workaround atual? Se sim, por que ela não é suficiente?"

Red flags that suggest score 1-2:
- "Os usuários querem" without evidence
- "Seria legal ter" without problem link
- Solving a symptom, not a root cause
- Feature described in terms of solution, not problem]]

- [ ] O problema foi descrito em termos de impacto no usuário, não em termos de solução
- [ ] Existe evidência (feedback, dado, observação) de que este problema existe
- [ ] O problema ocorre com frequência suficiente para justificar o investimento
- [ ] O problema não é resolvido por uma feature já existente

**Score (1-5):** ___
**Gaps identified:** ___

---

## Dimension 2 — Para Quem (User Clarity)

**Socratic Question:** *"Quem especificamente se beneficia, e como sabemos que eles precisam disso?"*

[[LLM: FOLLOW-UP PROBES FOR DIMENSION 2

If the answer is "todos os usuários" or generic, probe with:

- "Qual tipo de usuário se beneficia MAIS — barbeiro, salão, admin, staff?"
- "Um usuário novo se beneficia da mesma forma que um usuário veterano?"
- "Você falou com pelo menos um usuário real sobre esse problema?"
- "Quem NÃO se beneficia desta feature?"

Red flags:
- "Todos os usuários" without segmentation
- No direct user feedback cited
- Feature built from internal assumption only]]

- [ ] O usuário beneficiário foi identificado com especificidade (tipo, contexto, frequência de uso)
- [ ] Há evidência de que este usuário enfrenta o problema descrito
- [ ] O caso de uso do usuário foi descrito em forma de narrativa ("Como X, quando Y, quero Z")
- [ ] Usuários que NÃO se beneficiam foram considerados

**Score (1-5):** ___
**Gaps identified:** ___

---

## Dimension 3 — O Quê (Scope Definition)

**Socratic Question:** *"O que está explicitamente FORA do escopo desta feature?"*

[[LLM: FOLLOW-UP PROBES FOR DIMENSION 3

This dimension surfaces scope creep. Probe with:

- "O que um desenvolvedor poderia ASSUMIR que está incluído, mas não está?"
- "Se alguém implementar 20% a mais do que pedido, o que seria esse 20%?"
- "Esta feature tem dependências que precisam ser construídas antes?"
- "Quais edge cases existem que intencionalmente NÃO serão tratados agora?"

Red flags:
- Scope described only in terms of what IS included
- No explicit exclusions listed
- "E também..." appears more than twice in the requirements]]

- [ ] Exclusões explícitas foram listadas (o que não será feito)
- [ ] Dependências externas foram identificadas
- [ ] Edge cases que serão ignorados nesta versão foram documentados
- [ ] O escopo cabe em uma única story (não é um épico disfarçado)

**Score (1-5):** ___
**Gaps identified:** ___

---

## Dimension 4 — E Se (Failure Modes)

**Socratic Question:** *"O que acontece quando essa feature falha, é abusada, ou recebe dados inesperados?"*

[[LLM: FOLLOW-UP PROBES FOR DIMENSION 4

Probe failure scenarios:

- "O que acontece se a API/banco retornar vazio?"
- "O que acontece se um usuário com permissão insuficiente tentar usar isso?"
- "Como um usuário malicioso poderia explorar esta feature?"
- "O que acontece em mobile vs. desktop — o comportamento é consistente?"
- "O que acontece se dois usuários editarem o mesmo dado simultaneamente?"

Red flags:
- "Vai funcionar normalmente" without specific handling
- No error states described
- No mobile/responsive consideration
- Multi-tenant isolation not mentioned for data features]]

- [ ] Estado de erro (empty state, erro de rede, dado inválido) foi descrito
- [ ] Casos de abuso ou uso inesperado foram considerados
- [ ] Isolamento multi-tenant foi verificado (se a feature acessa dados de negócio)
- [ ] Comportamento mobile foi considerado

**Score (1-5):** ___
**Gaps identified:** ___

---

## Dimension 5 — Como (Approach Validation)

**Socratic Question:** *"Por que esta abordagem de implementação e não as alternativas?"*

[[LLM: FOLLOW-UP PROBES FOR DIMENSION 5

Prevent over-engineering and blind spots:

- "Quais alternativas de implementação foram consideradas?"
- "Por que um componente novo em vez de estender um existente?"
- "Esta solução reutiliza padrões já existentes no codebase?"
- "O que a solução mais simples possível seria? Por que não fazemos isso?"
- "Qual é o impacto no bundle size, performance, e manutenibilidade?"

Red flags:
- "Vou criar um novo componente/serviço/tabela" without justification
- No reference to existing patterns
- Solution adds significant complexity without proportional value]]

- [ ] Pelo menos uma alternativa de implementação foi considerada e descartada com justificativa
- [ ] A solução reutiliza padrões e componentes existentes onde possível
- [ ] A solução mais simples possível foi avaliada
- [ ] Impacto em performance e bundle size foi considerado

**Score (1-5):** ___
**Gaps identified:** ___

---

## Dimension 6 — Quando (Definition of Done)

**Socratic Question:** *"Como saberemos, sem dúvida alguma, que esta feature está pronta e funcionando?"*

[[LLM: FOLLOW-UP PROBES FOR DIMENSION 6

Surface vague acceptance criteria:

- "Se eu testar isso agora sem saber o requisito, como saberei que passou?"
- "Existe um critério mensurável (número, porcentagem, tempo de resposta)?"
- "Quais cenários de teste cobrem os casos feliz e os casos de erro?"
- "Quem aprova — o desenvolvedor, o PO, ou o usuário final?"

Red flags:
- "Funciona corretamente" without specific criteria
- No test scenarios described
- Acceptance depends on subjective evaluation only
- No negative test case (what should NOT happen)]]

- [ ] Critérios de aceitação são específicos e mensuráveis (não "funciona bem")
- [ ] Pelo menos um cenário de teste positivo foi descrito
- [ ] Pelo menos um cenário de teste negativo foi descrito
- [ ] Critério de aprovação e responsável foram definidos

**Score (1-5):** ___
**Gaps identified:** ___

---

## Verdict Determination

[[LLM: VERDICT CALCULATION

1. Calculate average score across all 6 dimensions
2. Check for any dimension scored 1
3. Apply verdict logic:

CLEARED (avg >= 4.0, no score of 1):
→ All dimensions answered clearly. Proceed with development.
→ Output: Gate artifact with CLEARED status

REFINED (avg 3.0-3.9, or one score of 2):
→ Minor gaps need clarification before starting.
→ Output: List specific items to resolve, then re-run affected dimensions

CHALLENGED (avg 2.0-2.9, or two scores of 2):
→ Core assumptions questioned. Return to @po/@pm for spec revision.
→ Output: List of fundamental questions that must be answered

BLOCKED (avg < 2.0, or any score of 1):
→ Feature not ready for development. Requires new spec cycle.
→ Output: Blocking gaps that prevent any progress]]

| Dimension | Score |
|-----------|-------|
| 1. Por Quê | ___ |
| 2. Para Quem | ___ |
| 3. O Quê | ___ |
| 4. E Se | ___ |
| 5. Como | ___ |
| 6. Quando | ___ |
| **Average** | ___ |

**Verdict:** `CLEARED` / `REFINED` / `CHALLENGED` / `BLOCKED`

**Critical Gaps:**
- ___

**Next Action:**
- CLEARED → Proceed to `dev-develop-story.md`
- REFINED → Clarify listed items, update story AC, re-run gate
- CHALLENGED → Return story to `@po *validate-story-draft`
- BLOCKED → Escalate to `@pm *create-epic` for full spec cycle

---

## YAML Output Schema

```yaml
schema: 1
gate_type: socratic
story: '{epic}.{story}'
executed_by: '{agent}'
timestamp: '{ISO-8601}'
dimensions:
  why:       { score: 0, gaps: [] }
  for_whom:  { score: 0, gaps: [] }
  what:      { score: 0, gaps: [] }
  what_if:   { score: 0, gaps: [] }
  how:       { score: 0, gaps: [] }
  when:      { score: 0, gaps: [] }
average_score: 0.0
verdict: CLEARED | REFINED | CHALLENGED | BLOCKED
critical_gaps: []
next_action: ''
```

Save to: `{qa.qaLocation}/gates/socratic-{story-slug}.yaml`

---

*Socratic Feature Gate v1.0 — Synkra AIOX Development Framework*
