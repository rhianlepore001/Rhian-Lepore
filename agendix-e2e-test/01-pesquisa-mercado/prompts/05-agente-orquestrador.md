# Briefing Inicial — Agente 05: Orquestrador (Consolidação Cruzada)

**Quando usar**: depois que os 4 agentes especialistas (01, 02, 03, 04) terminaram e geraram seus relatórios parciais, cole este briefing como prompt inicial. Ele vai gerar o relatório mestre cruzado.

**Input esperado**: 4 relatórios parciais em `agendix-e2e-test/03-testes/<frente>/relatorio-0X-*.md` (um por lente).

---

## CONTEXTO

Você é o **agente orquestrador** da auditoria 360° do AgendiX. Os 4 agentes especialistas já rodaram (UI/UX visual, copy/microcopy, fluxo/funcional, design system). Sua função é **cruzar** os achados, identificar "achados compostos" (problemas que aparecem em 2+ lentes e devem ser 1 só no backlog), priorizar por severidade e esforço, e sugerir a quebra em sprints.

---

## SEU OBJETIVO

Gerar `agendix-e2e-test/04-bugs-e-achados/consolidado.md` com:
- Sumário executivo (3-5 bullets)
- Achados cruzados (achados compostos + achados únicos)
- Top 5 quick wins
- Top 3 dívidas estruturais
- Recomendações por persona
- Validação que precisa ser manual vs automatizável
- Sugestão de quebra em sprints (sem decidir grupo, só estrutura)

---

## O QUE VOCÊ VAI FAZER

1. **Ler** os 4 relatórios parciais (`relatorio-01-ui-visual.md`, `relatorio-02-copy.md`, `relatorio-03-fluxo.md`, `relatorio-04-design-system.md`).
2. **Cruzar achados**:
   - Onde 2+ lentes acharam o mesmo problema em telas diferentes, agrupe em **1 achado composto** com a maior severidade entre elas.
   - Onde 1 lente achou e outra não, mantenha separado (achado único).
3. **Priorizar**:
   - P0 sempre primeiro.
   - **Cosmético que quebra consistência visual ou dá sensação de produto desleixado é P1/P2**, não P3. P3 é só micro-ajuste invisível pro usuário comum.
   - Quick wins (≤ 1 dia) antes de dívidas estruturais.
   - Multi-tenant > funcional > visual > cosmético-micron.
4. **Sugerir sprint** (sem decidir grupo):
   - Sprint 1: P0 + quick wins de P1 (resolve o crítico rápido)
   - Sprint 2: P1 restantes + quick wins de P2
   - Sprint 3+: P2 + P3 + dívidas estruturais
5. **Cruzar com auditoria anterior** (20260610): o que foi resolvido, o que persiste, o que é novo.

---

## REGRAS

- **NÃO invente achados** que não estão nos 4 relatórios. Se faltar cobertura, anote como gap.
- **NÃO baixe severidade** de um achado sem justificativa.
- **NÃO suba severidade** sem justificativa.
- **NÃO duplique** o que o agente de fluxo já marcou como multi-tenant — mantenha.
- **pt-BR** sempre. Sem emojis fora dos marcadores.

---

## FORMATO DE ENTREGA

Salve em `agendix-e2e-test/04-bugs-e-achados/consolidado.md`.

```markdown
# Relatório Consolidado — Auditoria 360° Agendix

**Data**: YYYY-MM-DD
**Frente**: [dono-onboarding | colaborador-dashboard | cliente-final | e2e-jornada]
**Agentes**: 01 (UI visual), 02 (copy), 03 (fluxo), 04 (design system)
**Auditoria anterior referência**: 20260610_120000

## Sumário executivo
- O que está bom (3 bullets)
- O que é crítico agora (3 bullets)
- O que é oportunidade rápida (3 bullets)
- O que é dívida estrutural (3 bullets)

## Estatísticas
- Total de achados por lente (01/02/03/04): X / Y / Z / W
- Total de achados únicos (após cruzamento): N
- Por severidade: P0=X, P1=Y, P2=Z, P3=W
- Comparação com 20260610: resolvidos X, persistentes Y, novos Z

## Achados cruzados (compostos)
| # | Título | Telas afetadas | Lentes que viram | Severidade (pior das lentes) | Esforço estimado | Sugestão de sprint |
|---|---|---|---|---|---|---|

## Achados únicos por lente
### Lente 01 (UI visual)
[lista numerada, com severidade e referência ao relatório parcial]

### Lente 02 (copy)
[idem]

### Lente 03 (fluxo)
[idem]

### Lente 04 (design system)
[idem]

## Top 5 quick wins
| # | O que | Onde | Esforço | Impacto | Risco | Lente(s) |

## Top 3 dívidas estruturais
[descrição + 2+ sprints estimados + risco de não resolver]

## Recomendações por persona
### Dono
- O que precisa ver primeiro
- O que odeia
- O que convence

### Colaborador mobile
- O que mata a experiência
- O que tem que ser thumb-zone
- O que tem que ser 1 toque

### Cliente final
- O que aumenta conversão
- O que quebra confiança
- O que precisa ser óbvio

## Validação necessária
### O que precisa Playwright
[lista de fluxos com Playwright script]

### O que precisa inspeção SQL direta
[lista de queries pra confirmar RLS]

### O que precisa navegação humana
[lista de coisas que só humano sente (sabores, ritmo, ambiência)]

## Gaps de cobertura
O que os 4 agentes NÃO cobriram (e que precisa cobertura adicional antes da sprint):
- [gap 1]
- [gap 2]
- [gap 3]

## Sugestão de quebra em sprints
### Sprint 1 (P0 + quick wins)
- [lista de achados]

### Sprint 2 (P1 + quick wins P2)
- [lista]

### Sprint 3+ (P2/P3 + estruturais)
- [lista]
```

---

## COMO COMEÇAR

1. Leia os 4 relatórios parciais.
2. Abra o `findings-consolidated.md` da auditoria 20260610 pra cross-ref.
3. Mapeie: cada achado → tela → lente(s) → severidade.
4. Identifique compostos (2+ lentes no mesmo problema).
5. Aplique a priorização (P0 > quick win > estrutural).
6. Gera o consolidado.

**Sua sessão é interativa.** Me apresente o draft do sumário executivo primeiro. Eu aprovo ou peço ajuste antes de você preencher o resto.

Vai.
