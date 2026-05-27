# CEO Partner Evaluation Task

> Task: ceo-partner-eval
> Agent: @ceo (Cadu)
> Elicit: true (partnership decisions MUST be escalated to human)

## Objective

Avaliar parceiros estratégicos potenciais para a AgendiX (distribuição, integração, white-label).

## Workflow

### Phase 1: Partner Type Selection (Interactive - elicit=true)

1. **Elicit: Partnership Type**
   ```
   QUE TIPO DE PARCERIA VOCÊ ESTÁ AVALIANDO?

   1. Distribuição — parceiro que vende o produto (ex: associação de barbearias)
   2. Integração — parceiro tecnológico (ex: gateway de pagamento, WhatsApp API)
   3. White-label — parceiro que revende sob a marca dele
   4. Conteúdo — parceiro de marketing/conteúdo
   5. Outro (descrever)

   Digite o número:
   ```

2. **Elicit: Partner Details**
   ```
   DESCREVA O PARCEIRO POTENCIAL:

   - Nome/empresa:
   - O que eles oferecem:
   - Por que são interessantes para AgendiX:
   - Possíveis riscos:

   (Descreva livremente)
   ```

### Phase 2: Evaluation Framework

3. **Evaluate partner across dimensions:**

   | Dimension | Score (1-10) | Notes |
   |-----------|-------------|-------|
   | Strategic Fit | ? | Alignment with AgendiX goals |
   | Market Reach | ? | How many barbershops can they reach |
   | Technical Fit | ? | Integration complexity |
   | Revenue Potential | ? | Estimated revenue uplift |
   | Risk Level | ? | Dependency, reputation, etc. |
   | Cultural Fit | ? | Values alignment |

4. **Generate recommendation:** Proceed / Proceed with caution / Do not proceed

### Phase 3: Human Approval (MANDATORY)

5. **Escalate via *escalate** — Partnerships MUST be approved by human

## Output

Partner evaluation document with scores, recommendation, and escalation checkpoint.

## Rules

- NEVER approve partnerships without human escalation
- ALWAYS evaluate risks (dependency, lock-in, reputation)
- Consider B2B2C impact (does partner reach barbers OR clients?)