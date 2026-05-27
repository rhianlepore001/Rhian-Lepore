# CEO Pricing Task

> Task: ceo-pricing
> Agent: @ceo (Cadu)
> Elicit: true (MANDATORY — pricing decisions MUST be escalated to human)

## Objective

Definir modelo de precificação, estimar CAC, LTV, burn rate e garantir sustentabilidade financeira da AgendiX.

## Workflow

### Phase 1: Market Benchmarking (Automated)

1. **Research competitor pricing in barbershop/salon SaaS space:**
   - Brazilian market: Fresha, Booksy, Trucale, SalãoVIP
   - International: Square Appointments, GlossGenius, Schedulicity
   - Typical pricing: R$ 49-199/mês per barbearia

2. **Generate pricing model options:**
   - Freemium (free basic + paid premium)
   - Tier (Basic/Pro/Enterprise)
   - Per-user (per barbeiro/cadeira)
   - Flat rate (valor único por barbearia)
   - White-label (premium para parceiros)

### Phase 2: Financial Modeling (Automated)

3. **Estimate key metrics:**
   - **CAC target:** R$ X per barbershop acquired
   - **LTV target:** R$ Y per barbershop over 12 months
   - **LTV:CAC ratio:** Target 3:1 or better
   - **Churn rate target:** < 5% monthly
   - **Break-even:** Month X at Y customers
   - **Burn rate:** R$ Z/month at current team cost

4. **Present pricing recommendation**

### Phase 3: Human Approval (MANDATORY - elicit=true)

5. **Escalate via *escalate**
   ```
   ========================================
   PRECIFICAÇÃO — AGENDIX
   ========================================
   [Pricing options with financial projections]

   DECISÃO NECESSÁRIA:
   Qual modelo de precificação você quer adotar?

   1. Opção A — [description]
   2. Opção B — [description]
   3. Opção C — [description]
   4. Quero customizar (descrever)
   ```

## Rules

- NEVER set final pricing without human approval (*escalate MANDATORY)
- ALWAYS present at least 3 pricing model options
- ALWAYS include financial projections (CAC, LTV, break-even)
- ALWAYS consider Brazilian market reality (barbershop economics)