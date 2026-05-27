# CEO Delegate Task

> Task: ceo-delegate
> Agent: @ceo (Cadu)
> Elicit: true

## Objective

Delegar uma tarefa do CEO para outro agente da organização AgendiX, seguindo a hierarquia organizacional.

## Workflow

### Phase 1: Identify Delegation Target (Interactive - elicit=true)

1. **Elicit: Agent Selection**
   ```
   PARA QUAL AGENTE VOCÊ QUER DELEGAR?

   1. 🏛️ @architect (Aria) — CTO: Arquitetura, stack técnico, code review
   2. 💻 @dev (Dex) — Dev Full-Stack: Implementação, debugging
   3. 📋 @pm (Morgan) — PM: Produto, PRDs, roadmap
   4. 🎯 @po (Pax) — PO: Backlog, stories, sprint
   5. 🧪 @qa (Quinn) — QA: Testes, qualidade
   6. 🔧 @devops (Gage) — DevOps: Infra, deploy, CI/CD
   7. 🔍 @analyst (Atlas) — Analyst: Pesquisa de mercado
   8. 🎨 @ux-design-expert (Nova) — UX: Design, interface
   9. 🗄️ @data-engineer — Data: Database, schema, queries

   Digite o número:
   ```

2. **Elicit: Task Description**
   ```
   DESCREVA A TAREFA A SER DELEGADA:

   - O que precisa ser feito?
   - Qual o contexto/deadline?
   - Quais são os critérios de sucesso?

   (Descreva livremente)
   ```

### Phase 2: Prepare Delegation

3. **Format delegation message:**
   - Agent: [selected agent]
   - Context: Why this task matters for AgendiX
   - Task: Clear, actionable description
   - Success criteria: How to verify completion
   - Escalation: When to escalate back to CEO or human

4. **Present delegation plan to human for confirmation**

5. **Execute delegation:**
   - Store delegation in MEMORY.md
   - Present the command the human should run to activate the target agent
   - Example: "Para delegar ao CTO, ative @architect e use: *analyze-impact"

## Delegation Map

| Task Type | Delegate To | Command |
|-----------|-------------|---------|
| Architecture decision | @architect | *analyze-impact |
| Code implementation | @dev | *develop |
| Product strategy | @pm | *create-prd |
| Backlog management | @po | *backlog-review |
| Quality review | @qa | *review |
| Infrastructure | @devops | *deploy |
| Market research | @analyst | *research |
| UX design | @ux-design-expert | *audit-frontend |
| Database schema | @data-engineer | *db-schema-audit |

## Output

Delegation confirmation with target agent, task description, and suggested command.

## Rules

- ALWAYS confirm delegation with human before executing
- NEVER delegate business decisions — those must be escalated via *escalate
- ALWAYS provide context about AgendiX (SaaS B2B/B2C barbershops)
- TRACK all delegations in MEMORY.md