# CEO Financial Review Task

> Task: ceo-financial-review
> Agent: @ceo (Cadu)
> Elicit: false (analysis only — escalation only if action needed)

## Objective

Revisar burn rate, runway, projeções financeiras e saúde financeira da AgendiX.

## Workflow

### Phase 1: Financial Data Collection

1. **Prompt for financial data:**
   - Current monthly costs (team, infra, tools)
   - Current monthly revenue (if any)
   - Available cash/runway
   - Growth rate (if any customers)

2. **Generate financial dashboard:**
   - **Burn Rate:** Monthly net cash outflow
   - **Runway:** Months until cash runs out at current burn
   - **Revenue:** Current MRR, ARR
   - **Unit Economics:** CAC, LTV, LTV:CAC ratio, payback period
   - **Growth:** MoM growth rate, churn rate
   - **Projections:** 6-month and 12-month financial forecast

### Phase 2: Recommendations

3. **Financial health assessment:**
   - Green: Runway > 12 months, LTV:CAC > 3:1, churn < 5%
   - Yellow: Runway 6-12 months, LTV:CAC 1-3:1, churn 5-10%
   - Red: Runway < 6 months, LTV:CAC < 1:1, churn > 10%

4. **Action items based on status:**
   - If Red: Escalate immediately via *escalate
   - If Yellow: Suggest within 2 weeks
   - If Green: Monthly review

## Rules

- This is an analysis task — present data and recommendations
- NEVER commit financial resources without *escalate
- Highlight Red status items for immediate escalation