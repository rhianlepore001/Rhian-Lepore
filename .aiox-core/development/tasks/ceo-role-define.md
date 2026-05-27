# CEO Role Define Task

> Task: ceo-role-define
> Agent: @ceo (Cadu)
> Elicit: true

## Objective

Definir perfil detalhado de uma vaga na equipe da AgendiX, incluindo responsabilidades, requisitos, expectativas e estimativa de custo.

## Workflow

### Phase 1: Role Context (Interactive - elicit=true)

1. **Elicit: Role Selection**
   ```
   QUAL VAGA VOCÊ QUER DEFINIR?

   1. CTO / Líder Técnico
   2. Dev Full-Stack (Senior)
   3. Dev Full-Stack (Pleno)
   4. Dev Frontend (Mobile-first)
   5. Dev Backend (API/Integrations)
   6. QA Engineer
   7. DevOps / SRE
   8. Product Manager
   9. UX/UI Designer
   10. Customer Success
   11. Sales / Growth
   12. Outro (descrever)

   Digite o número:
   ```

2. **Elicit: Seniority Level**
   ```
   QUAL O LEVEL DE SENIORITY?

   1. Junior (0-2 anos) — R$ 3k-6k/mês
   2. Pleno (2-5 anos) — R$ 6k-12k/mês
   3. Senior (5+ anos) — R$ 12k-20k/mês
   4. Lead/Staff (7+ anos) — R$ 20k-35k/mês

   Digite o número:
   ```

### Phase 2: Generate Role Definition

3. **Create comprehensive role definition:**

   **Role Title:** [Title]
   **Level:** [Junior/Pleno/Senior/Lead]
   **Department:** [Engineering/Product/Growth]
   **Reports to:** [CEO / CTO / etc.]
   **Location:** [Remoto / Híbrido / Presencial]

   **Key Responsibilities (5-7):**
   - [Responsibility 1 aligned with AgendiX's needs]
   - ...

   **Required Skills:**
   - [Skills specific to barbershop/salon SaaS context]
   - ...

   **Nice-to-Have Skills:**
   - [Skills that would be valuable but not required]
   - ...

   **AgendiX Context:**
   - B2B product (barbershop/salon management)
   - B2C component (client appointment booking)
   - Mobile-first (barbers use phones)
   - Supabase backend
   - React frontend with HashRouter

   **Cultural Fit:**
   - Entrepreneurial mindset
   - Comfortable with startup ambiguity
   - Customer-obsessed (barbershop owners are the primary user)

   **Estimated Cost:**
   - Monthly salary: R$ X
   - Taxes + benefits (~80% on CLT, ~15% on PJ): R$ Y
   - Total monthly cost: R$ Z
   - Annual cost: R$ W

   **AIOX Mapping:**
   - Maps to agent: @[agent]
   - Delegation context: [what the human in this role would do that the agent currently handles]

   **Hiring Timeline:**
   - Job posting: Week 1
   - Screening: Week 2-3
   - Technical assessment: Week 3-4
   - Offer: Week 4-5

### Phase 3: Human Approval (MANDATORY - elicit=true)

4. **Escalate for approval:**
   ```
   ========================================
   DEFINIÇÃO DE VAGA — AGENDIX
   ========================================

   [Role definition gerada]

   DECISÃO NECESSÁRIA:
   Esta definição de vaga está correta?

   1. Aprovar e publicar
   2. Aprovar com modificações (descrever)
   3. Rejeitar — recomeçar
   4. Salvar draft para revisar depois

   Digite:
   ```

## Output

Complete role definition document ready for job posting or further refinement.

## Rules

- ALWAYS include AgendiX-specific context in responsibilities
- ALWAYS include estimated total cost (salary + taxes + benefits)
- ALWAYS map the role to an AIOX agent for delegation context
- NEVER approve a role definition without human escalation
- Consider mobile-first constraint in technical requirements