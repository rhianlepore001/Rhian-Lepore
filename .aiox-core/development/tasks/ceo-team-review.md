# CEO Team Review Task

> Task: ceo-team-review
> Agent: @ceo (Cadu)
> Elicit: false (automated analysis)

## Objective

Avaliar a composição atual do time (agents AIOX + humanos) vs. as necessidades do produto AgendiX, identificando gaps e recomendações.

## Workflow

### Phase 1: Current State Analysis (Automated)

1. **Map current team capabilities:**
   - Available AIOX agents and their roles
   - Human team members (from MEMORY.md)
   - Current work capacity and bottlenecks

2. **Analyze product needs based on AgendiX context:**
   - B2B product (barbershop management) — needs robust backend, scheduling, payments
   - B2C component (client booking) — needs mobile-first UI, notifications
   - SaaS model — needs billing, onboarding, analytics
   - Growth stage — needs GTM, sales, customer success

3. **Generate capability matrix:**

   | Capability | Current | Needed | Gap | Priority |
   |-----------|---------|--------|-----|----------|
   | Frontend (React) | @dev | 2 devs | -1 | P0 |
   | Backend (API) | @dev | 1-2 devs | -0.5 | P1 |
   | Architecture | @architect | 1 CTO | -1 | P0 |
   | QA | @qa | 1 QA | 0 | P2 |
   | DevOps | @devops | 1 DevOps | 0 | P2 |
   | Product | @pm | 1 PM | 0 | P2 |
   | UX/UI | @ux-expert | 1 Designer | 0 | P2 |
   | Customer Success | N/A | 1 CS | -1 | P1 |
   | Sales/Growth | N/A | 1 Growth | -1 | P1 |

### Phase 2: Recommendations (Automated)

4. **Generate prioritized recommendations:**
   - P0 (Critical): Must hire within 30 days
   - P1 (High): Must hire within 60 days
   - P2 (Medium): Should hire within 90 days
   - P3 (Nice-to-have): Can delay beyond 90 days

5. **Estimate budget impact:**
   - Total monthly cost for recommended hires
   - Compare against current budget (if known)
   - ROI estimation for each position

### Phase 3: Output

6. **Present team review report with:**
   - Current team map
   - Capability matrix with gaps
   - Prioritized hire recommendations
   - Budget projection
   - Suggest running `*hire-plan` to create detailed plan

## Rules

- This is an analysis task — NO human approval needed
- ALWAYS suggest running `*hire-plan` for detailed planning
- Consider AIOX agents as "virtual team members" that complement humans
- NEVER recommend hiring where an agent can handle the work