---
id: US-005
título: Integração Completa do Framework AIOS
status: in-progress
estimativa: 12h
prioridade: high
agente: orchestrator
assignee: "@aios-master"
blockedBy: []
---

# US-005: Integração Completa do Framework AIOS

## Por Quê

O projeto tem `.aios-core/` e `.agent/` montados, mas os workflows e comandos AIOS não estão sendo utilizados no fluxo de desenvolvimento diário. Isso significa:
- Falta rastreabilidade de features
- Novos devs não têm guidance automático
- Quality gates não são enforçados
- Decisões arquiteturais não são documentadas

Integrar AIOS completamente = desenvolvimento escalável e governado.

## O Que

1. **Ativar Workflows:**
   - Criar `/develop-story` como fluxo padrão
   - Mapear `npm run` scripts → `/aios` comandos
   - Testar `/status`, `/orchestrate`, `/audit-arch`

2. **Estruturar Stories:**
   - Converter 4+ features em progresso para formato AIOS (com checkboxes)
   - Atualizar `docs/stories/README.md` com status real
   - Criar `docs/discovery-notes.md` para novos projetos

3. **Ativar Quality Gates:**
   - Rodar `python .agent/scripts/checklist.py` antes de push
   - Validar Lint + Typecheck + Tests automaticamente

4. **Documentar Decisões:**
   - Criar `.ai/decision-logs/` para ADRs (Architecture Decision Records)
   - Documentar por que Clerk ao invés de Supabase Auth
   - Rastrear decisões de tecnologia (Gemini, Stripe, etc.)

## Critérios de Aceitação

- [ ] Arquivo `AIOS_COMMANDS_MAPPING.md` criado (comandos antigos → novos)
- [ ] Todos os scripts npm mapeados para workflows AIOS
- [ ] 4+ stories ativas convertidas para formato AIOS com checkboxes
- [ ] `docs/stories/README.md` atualizado com status real
- [ ] `checklist.py` rodado com sucesso (0 erros críticos)
- [ ] `.ai/decision-logs-index.md` criado com primeiras decisões documentadas
- [ ] Novo dev consegue seguir `/develop-story` do zero

## Arquivos Impactados

- `docs/stories/` (estruturação de 4+ stories)
- `docs/stories/README.md` (atualizar status)
- `AIOS_COMMANDS_MAPPING.md` (novo)
- `AIOS_INTEGRATION_PLAN.md` (novo)
- `.ai/decision-logs-index.md` (novo)
- `.agent/rules/` (validação)

## Progresso Atual

- **Status:** 40% em integração progressiva
- ✅ Backup Manual (US-007) implementado em 01/03/2026
- ✅ 2FA Opcional (US-008) implementado em 01/03/2026
- 🔄 Estruturação de Stories AIOS (Bloco 3 em andamento)
- ⏳ Workflows automáticos de CI/CD (Quality Gates) pendentes
- ⏳ Documentação de ADRs pendente

## Definição de Pronto

- [ ] Lint e Typecheck passam
- [ ] `checklist.py` passa sem bloqueadores críticos
- [ ] Todos os devs conseguem seguir `/develop-story`
- [ ] Stories mostram progresso claro (checkboxes)
- [ ] ADR documenta decisões arquiteturais
