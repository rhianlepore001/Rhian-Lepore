# CEO Business Idea Task

> Task: ceo-business-idea
> Agent: @ceo (Cadu)
> Elicit: true (requires human interaction at checkpoint)

## Objective

Gerar e validar ideias de negócio para a AgendiX, com análise de viabilidade, impacto estimado e checkpoint obrigatório com o humano (fundador) antes de prosseguir.

## Context

A AgendiX é um SaaS B2B/B2C para gestão de barbearias e salões de beleza. O CEO (Cadu) pode GERAR ideias de negócio, mas NÃO pode tomar decisões finais sobre elas — essas são sempre escaladas para o humano via *escalate.

## Workflow

### Phase 1: Opportunity Identification (Interactive - elicit=true)

1. **Elicit: Business Area**
   ```
   QUAL ÁREA DO NEGÓCIO VOCÊ QUER EXPLORAR?

   1. Novo produto/feature — expansão de funcionalidades
   2. Novo mercado — expandir para outros verticais (clínicas, spas, etc.)
   3. Modelo de receita — novas formas de monetizar (marketplace, SaaS, white-label)
   4. Parcerias — canais de distribuição, integrações
   5. Customer success — redução de churn, aumento de LTV
   6. Growth — aquisição de clientes, marketing, GTM
   7. Outro (descrever)

   Digite o número ou descreva:
   ```

2. **Elicit: Problem/Opportunity Description**
   ```
   DESCREVA O PROBLEMA OU OPORTUNIDADE:

   - Que dor dos barbeiros/salões você quer resolver?
   - Que oportunidade de mercado você viu?
   - Que feedback de clientes você recebeu?

   (Descreva livremente ou digite 'sugestão' para eu propor ideias)
   ```

### Phase 2: Idea Generation (Automated)

3. **Generate Business Ideas** based on:
   - Selected area
   - Problem/opportunity described
   - AgendiX's current product stage (base técnica robusta, design premium)
   - B2B2C model (barbershops + end clients)
   - Mobile-first constraint (barbers use phones)
   - Market data (if *competitive-analysis was run before)

4. **For each idea, document:**
   - **Name:** Short, memorable name
   - **One-liner:** What it does in 1 sentence
   - **Problem:** Which pain point it solves
   - **Solution:** How it solves it
   - **Target:** Who benefits (barbershop owner, end client, or both)
   - **Revenue Impact:** Estimated impact on revenue (Low/Medium/High/Critical)
   - **Effort:** Estimated implementation effort (1 week / 1 month / 3 months / 6 months)
   - **Dependencies:** What needs to be in place first
   - **Risk:** Main risk or assumption

### Phase 3: Idea Evaluation (Automated)

5. **Score each idea using ICE/RICE framework:**
   - **Impact:** How much revenue/growth this drives (1-10)
   - **Confidence:** How confident we are in the estimate (1-10)
   - **Ease:** How easy to implement with current team (1-10)
   - **ICE Score:** Impact × Confidence × Ease

6. **Rank ideas by ICE score**

### Phase 4: Human Checkpoint (MANDATORY - elicit=true)

7. **Escalate to human via *escalate**
   ```
   ========================================
   IDEIAS DE NEGÓCIO — AGENDIX
   ========================================

   [Lista ranqueada de ideias com scores ICE]

   TOP 3 RECOMENDADAS:
   1. [Idea #1] — ICE Score: X | Impacto: High | Esforço: 1 month
   2. [Idea #2] — ICE Score: Y | Impacto: Medium | Esforço: 2 weeks
   3. [Idea #3] — ICE Score: Z | Impacto: High | Esforço: 3 months

   DECISÃO NECESSÁRIA:
   Qual ideia você quer prosseguir? Ou quer modificar alguma?

   1. Prosseguir com ideia #___
   2. Quero combinação de ideias (quais?)
   3. Quero uma variação de (qual ideia + qual mudança?)
   4. Nenhuma — quero explorar outra área
   5. Quero mais detalhes sobre ideia #___

   Digite:
   ```

### Phase 5: Post-Approval

8. **Upon human selection:**
   - If product/feature idea → Delegate to @pm (Morgan) via `*delegate @pm "create-product-spec"` 
   - If technical implementation → Delegate to @architect (Aria) via `*delegate @architect "analyze-impact"`
   - If market research needed → Delegate to @analyst (Atlas) via `*delegate @analyst "research"`
   - If financial analysis needed → Use `*financial-review`
   - If GTM needed → Use `*gtm-plan`
   - Update MEMORY.md with approved idea

9. **Track decision in escalation log**

## Output

- Documented business ideas with ICE scores
- Ranked recommendation list
- Human approval checkpoint with selection
- Delegation plan for next steps

## Rules

- NEVER approve a business idea without human escalation
- ALWAYS frame ideas in terms of impact on barbershop owners AND end clients
- ALWAYS include estimated effort based on current team capacity
- ALWAYS consider mobile-first (barbers use phones)
- ALWAYS consider the B2B2C model
- NEVER present an idea without at least rough revenue/impact estimation
- Present options as numbered lists for easy selection
- When in doubt, ESCALATE via *escalate