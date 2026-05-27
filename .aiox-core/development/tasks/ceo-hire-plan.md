# CEO Hire Plan Task

> Task: ceo-hire-plan
> Agent: @ceo (Cadu)
> Elicit: true (requires human interaction at checkpoint)

## Objective

Estruturar um plano de contratação completo para o time técnico da AgendiX, definindo vagas prioritárias, perfis, custos e cronograma.

## Context

A AgendiX é um SaaS B2B/B2C para gestão de barbearias e salões de beleza. O CEO (Cadu) precisa estruturar o time técnico para escalar o produto, mas qualquer decisão final de contratação DEVE ser aprovada pelo humano (fundador).

## Workflow

### Phase 1: Team Assessment (Automated)

1. **Analyze current team composition**
   - List all available agents and their roles
   - Map current capabilities vs. product needs
   - Identify gaps and bottlenecks

2. **Generate Team Gap Analysis**
   - Create a capability matrix: what we have vs. what we need
   - Categorize gaps: Critical / Important / Nice-to-have
   - Estimate impact of each gap on product delivery

### Phase 2: Hire Plan Structure (Interactive - elicit=true)

3. **Elicit: Priority Definition**
   ```
   QUAL É A PRIORIDADE DE CONTRATAÇÃO AGORA?

   1. CTO/Lider Técnico — para definir arquitetura e liderar o time
   2. Dev Full-Stack — para implementar features e acelerar delivery
   3. Dev Frontend — para melhorar UX e mobile-first
   4. Dev Backend — para escalar API e integrações
   5. QA Engineer — para garantir qualidade antes do launch
   6. DevOps/SRE — para infra e deploy contínuo

   Digite os números na ordem de prioridade (ex: 1,2,5):
   ```

4. **Elicit: Budget Constraints**
   ```
   QUAL O BUDGET MENSAL DISPONÍVEL PARA CONTRATAÇÃO?

   Opções:
   1. Até R$ 15k/mês (1 dev júnior/pleno)
   2. R$ 15k-30k/mês (1 dev sênior ou 2 júnior)
   3. R$ 30k-60k/mês (2-3 devs ou 1 CTO + 1 dev)
   4. R$ 60k+/mês (time completo)
   5. Informar valor específico

   Digite o número ou valor:
   ```

5. **Elicit: Hiring Model**
   ```
   QUAL O MODELO DE CONTRATAÇÃO?

   1. CLT (estabilidade, custo total ~1.8x salário)
   2. PJ (flexibilidade, custo = salário + impostos mínimos)
   3. Freelance/Contrato (projeto-based, maior flexibilidade)
   4. Híbrido (mix de modelos por vaga)

   Digite o número:
   ```

### Phase 3: Generate Hire Plan

6. **Create Hire Plan Document** using `hire-plan-tmpl.yaml` template

7. **For each position, define:**
   - Role title and level (Junior/Pleno/Senior/Lead)
   - Key responsibilities (aligned with AgendiX's product needs)
   - Required skills and experience
   - Nice-to-have skills
   - Estimated monthly cost (salary + taxes/benefits)
   - Agent equivalent (which AIOX agent maps to this role)
   - Priority (P0/Critical, P1/High, P2/Medium)
   - Recommended hiring timeline (Month 1, 2, 3...)

### Phase 4: Escalation Checkpoint (MANDATORY)

8. **Escalate to human via *escalate**
   ```
   ========================================
   PLANO DE CONTRATAÇÃO — AGENDIX
   ========================================

   [Resumo do plano gerado]

   DECISÃO NECESSÁRIA:
   Este plano de contratação está alinhado com sua visão?
   Devo prosseguir com alguma vaga específica?

   1. Aprovar plano completo
   2. Aprovar com modificações (descrever)
   3. Rejeitar e recomeçar
   4. Aprovar apenas vaga(s) específica(s)

   Digite: 
   ```

### Phase 5: Post-Approval

9. **Upon human approval:**
   - Update `.aiox-core/development/agents/ceo/MEMORY.md` with approved positions
   - For each approved position, create a Role Definition via `*role-define`
   - Delegate technical role definition to CTO (@architect) via `*delegate @architect`
   - Create tracking story in `docs/stories/` if applicable

## Output

A structured hire plan following the `hire-plan-tmpl.yaml` template, including:
- Team gap analysis
- Prioritized position list
- Budget breakdown
- Timeline for each hire
- Agent role mapping
- Human approval checkpoint

## Rules

- NEVER approve a hire without human escalation
- ALWAYS include estimated costs (salary + taxes + benefits)
- ALWAYS map roles to existing AIOX agents for delegation context
- ALWAYS consider the B2B2C nature of AgendiX (barbershop owners + end clients)
- ALWAYS factor in mobile-first (barbers use phones)
- Present options as numbered lists for easy selection