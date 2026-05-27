# CEO Escalate Task

> Task: ceo-escalate
> Agent: @ceo (Cadu)
> Elicit: true (ALWAYS requires human interaction)

## Objective

Escalar uma decisão estratégica para o humano (fundador). Este é o canal obrigatório para qualquer decisão que vá além de estruturar time técnico e gerar ideias.

## MANDATORY ESCALATION RULES

The following decisions MUST be escalated via this task:

1. **Precificação** — Quanto cobrar, modelo de pricing, mudanças de preço
2. **Investimento** — Aceitar ou não capital, rodadas, valuation
3. **Pivot** — Mudar direção do produto, novo mercado, rebranding
4. **Parcerias estratégicas** — Aceitar/recusar parcerias, white-label, integrações
5. **Contratação final** — Aprovar vaga, escolher candidato, definir salário
6. **Compromisso financeiro** — Qualquer despesa ou custo real

## Workflow

### Phase 1: Identify Decision Context

1. **Classify the decision:**
   - Category: [Pricing | Investment | Pivot | Partnership | Hiring | Financial | Other]
   - Urgency: [Critical (today) | High (this week) | Medium (this month) | Low (when possible)]
   - Reversibility: [Irreversible | Hard to reverse | Easy to reverse]

2. **Prepare escalation brief:**
   - **Decision needed:** [Clear, one-sentence description]
   - **Context:** [Why this decision matters for AgendiX]
   - **Options:** [2-3 recommended options with pros/cons]
   - **CEO Recommendation:** [What Cadu recommends and why]
   - **Impact:** [Estimated impact on revenue, costs, timeline]
   - **Deadline:** [When this decision must be made]

### Phase 2: Present to Human (MANDATORY - elicit=true)

3. **Escalate:**
   ```
   ========================================
   ESCALAMENTO — DECISÃO ESTRATÉGICA
   ========================================

   Categoria: [Pricing/Investment/Pivot/etc.]
   Urgência: [Critical/High/Medium/Low]
   Reversibilidade: [Irreversible/etc.]

   DECISÃO NECESSÁRIA:
   [One-sentence decision description]

   CONTEXTO:
   [Why this matters for AgendiX]

   OPÇÕES:
   1. [Option A] — Pros: ... | Cons: ... | Impacto: ...
   2. [Option B] — Pros: ... | Cons: ... | Impacto: ...
   3. [Option C] — Pros: ... | Cons: ... | Impacto: ...

   RECOMENDAÇÃO DO CEO:
   [Cadu's recommendation with rationale]

   PRAZO: [When this decision must be made]

   ========================================
   SUA DECISÃO:
   1. Aprovar Opção #___
   2. Aprovar com modificações (descrever)
   3. Rejeitar todas — quero outra opção
   4. Preciso de mais informações sobre (qual?)
   5. Adiar — voltar a este assunto depois

   Digite:
   ```

### Phase 3: Record Decision

4. **Upon human decision:**
   - Record the decision in MEMORY.md under "Key Decisions"
   - Note who made the decision, when, and rationale
   - Update any related hire plans, business ideas, etc.

5. **Execute follow-up:**
   - If approved → Delegate to appropriate agent
   - If modified → Adjust proposal and re-escalate
   - If rejected → Generate alternative and re-escalate
   - If more info needed → Delegate research to @analyst

## Output

Recorded decision with full context, rationale, and follow-up actions.

## Rules

- NEVER make the final business decision yourself — ALWAYS escalate
- ALWAYS present at least 2 options with pros/cons
- ALWAYS include your recommendation with rationale
- ALWAYS record the decision in MEMORY.md
- NEVER skip the human checkpoint, even for "small" decisions that fall in the mandatory categories