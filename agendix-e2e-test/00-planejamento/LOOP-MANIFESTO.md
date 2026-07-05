# Manifesto de Loops — Agendix E2E Test

Por que "loops" e não "prompts"? Porque o entregável não é uma resposta, é um **processo iterativo com correção contínua**. O prompt é o briefing inicial do loop; quem fecha o loop é você, com steer em tempo real.

Este documento define os loops do projeto, os gates de saída (quando pode avançar), os checkpoints (o que precisa estar validado), e como você intervém.

---

## Loop 0 — Setup do ambiente de teste

**Objetivo**: criar um ambiente de produção com 1 mês de dados sintéticos validados (4 colaboradores ativos, clientes variados, agendamentos passados/presentes, faturamento realista).

**Quem roda**: você (decisões de cenário) + Hermes (execução) + Playwright (criação automatizada).

**Checkpoint**:
- [ ] 4 colaboradores ativos (1 dono + 3 funcionários; mistura de comissão fixa e percentual)
- [ ] 20+ clientes recorrentes + 30+ clientes novos no mês
- [ ] 100+ agendamentos (50% passados, 30% presentes, 20% futuros)
- [ ] Serviços variados (corte, barba, combo, VIP)
- [ ] Faturamento realista (R$ 8.000–15.000/mês)
- [ ] Fila digital com pelo menos 1 ciclo completo
- [ ] Pelo menos 1 avaliação NPS respondida

**Gate de saída**: você roda a tela `/reports` e o número "bate com a realidade" (não é zero, não é absurdo).

---

## Loop 1 — Pesquisa de mercado + personas

**Objetivo**: mapear o que o mercado (concorrentes + relatos reais) espera de cada frente (dono, colaborador, cliente), e derivar personas coerentes com o mundo real de barbearias BR+PT.

**Quem roda**: Hermes (orquestração da pesquisa) + você (validação das conclusões).

**Como**:
1. Pesquisa concorrentes: AppBarber (principal), Trinks, Booksy, Simples Agenda, Barbeiro.app, Timezer, Hairfy. Cobrir: jornada de onboarding, dashboards de profissional vs dono, features do app do cliente, copy/tom de voz, NPS/benchmark de retenção.
2. Pesquisa relatos reais: fóruns de barbearia (Reddit r/Barbeiros, fóruns no ReclameAqui), grupos de Facebook, canais YouTube de barbearia, reviews na App Store/Google Play. Capturar **frases literais** de donos, funcionários e clientes sobre o que odeiam, o que amam, o que esperam.
3. Derivar 3 personas (dono, colaborador, cliente) com: nome, idade, contexto, frustrações reais (citadas), objetivos, canais, tom de voz, jornada típica.

**Checkpoint**:
- [ ] `01-pesquisa-mercado/concorrentes/` tem 1 doc por concorrente com template padrão
- [ ] `01-pesquisa-mercado/relatos-reais/` tem pelo menos 20 citações literais categorizadas
- [ ] `02-personas/dono.md`, `colaborador.md`, `cliente.md` estão preenchidos
- [ ] Você revisou e aprovou cada persona

**Gate de saída**: você consegue descrever cada persona em 1 frase e ela bate com a realidade que você vive/ouve.

---

## Loop 2 — Auditoria visual com agentes especialistas (5 em paralelo)

**Objetivo**: rodar 5 agentes em paralelo, cada um com briefing inicial específico e a mesma base de contexto (design system lock, achados anteriores, personas, **regras de domínio**).

**Quem roda**: Claude Code / Codex CLI / OpenCode (você escolhe por sessão, e roda **um por vez** ou todos em paralelo — sua decisão).

**Briefings iniciais**: `01-pesquisa-mercado/prompts/0X-*.md` (5 arquivos):
- `01-agente-ui-visual.md` — UI/UX visual, hierarquia, consistência
- `02-agente-copy.md` — copy, microcopy, tom de voz
- `03-agente-fluxo.md` — fluxo funcional, jornada, estados
- `04-agente-design-system.md` — tokens, cores, espaçamentos
- `06-agente-dominio.md` — regras de domínio / lógica de negócio (buracos, contradições)

O agente 06 é diferente dos outros 4: ele não audita tela por tela, ele **atravessa o produto inteiro caçando regras implícitas** e mantém atualizado o doc `02-personas/regras-dominio.md`. Pode (e deve) rodar em paralelo com os outros.

**Como cada loop individual funciona**:
```
[briefing inicial carregado no agente]
   ↓
agente navega AgendiX (browser real em produção)
   ↓
agente cataloga achados por severidade (P0/P1/P2/P3)
   ↓
você revisa, marca com [], aprofunda ou descarta
   ↓
agente refina (volta numa tela, re-avalia, expande)
   ↓
relatório parcial finalizado em 03-testes/<frente>/relatorio-<lente>.md
   ↓
loop fecha quando você tá satisfeito
```

**Checkpoint por agente**:
- [ ] Pelo menos 1 achado P0 OU justificação explícita de "nada P0 encontrado"
- [ ] Cada achado tem: tela/rota, severidade, descrição, evidência (screenshot/citação), sugestão de fix
- [ ] Cruzamento com achados anteriores (`/root/projetos/Rhian-Lepore/.ui-audit/20260610_120000/findings-consolidated.md`) — não duplicar
- [ ] Você revisou e marcou com [OK] os achados que valem

**Gate de saída**: 4 relatórios parciais (1 por lente) prontos e revisados.

---

## Loop 3 — Consolidação cruzada (orquestrador)

**Objetivo**: gerar o relatório mestre que cruza os **5** relatórios parciais, identifica "achados compostos" (ex: card com cor errada + texto com tom errado = 1 P1 em vez de 2 P3), e sugere o que vai pra qual sprint.

**Quem roda**: agente orquestrador (briefing em `01-pesquisa-mercado/prompts/05-orquestrador.md`).

**Checkpoint**:
- [ ] `04-bugs-e-achados/consolidado.md` com sumário executivo + achados cruzados
- [ ] Top 5 quick wins (≤ 1 dia cada)
- [ ] Top 3 dívidas estruturais (2+ sprints pra resolver)
- [ ] Recomendações por persona (dono, colaborador, cliente)
- [ ] **Regras de domínio descobertas pelo agente 06** integradas como P0/P1 backlog (e o `regras-dominio.md` atualizado)
- [ ] Validação que precisa ser manual vs automatizável (Playwright)

**Gate de saída**: o consolidado serve de input direto pra quebrar em sprints.

---

## Loop 4 — Sprints

**Objetivo**: quebrar os achados em sprints com tasks, critérios de aceite e estimativa.

**Quem roda**: você (decisão de agrupamento) + Hermes (formatação).

**Formato de sprint** (em `05-sprints/sprint-N/`):
- `00-scope.md` — objetivo da sprint, critérios de aceite da sprint como um todo
- `tasks/TASK-NNN-*.md` — uma task por arquivo, com: descrição, DoD (Definition of Done), estimativa, dependências, referências aos achados

**Gate de saída**: cada sprint tem scope claro e tasks com DoD verificável.

---

## Como você intervém (steer)

Você tem 3 alavancas:

1. **Steer em tempo real** (Claude Code/Codex TUI): você acompanha o raciocínio do agente e freia/corrige no meio. "Para. Esse achado tá errado, olha de novo a linha 142" — funciona.
2. **Steer por revisão**: deixa o agente terminar, lê o relatório, marca com [REVISAR] ou [DESCARTAR] e pede rodada 2. Bom quando você quer ver o output cru.
3. **Steer por ajuste de briefing**: você lê o briefing inicial e percebe que faltou contexto. Edita o briefing, sobe de novo. Bom pra calibrar pra próxima frente.

A maioria dos steers vai ser do tipo 2 e 3. O tipo 1 é pra quando o agente tá viajando muito.

---

## Anti-temPtation (o que NÃO fazer)

- **Não ignore cosmético que causa má impressão.** Um card com cor diferente do colega, uma borda branca que não existe nos outros, uma fonte trocada num botão, um traço demarcado em volta de um card que os outros não têm — isso **não é P3**. É P1 ou P2. O usuário olha aquilo e pensa "esse produto é meia-boca". O cosmético técnico (1px de sombra, 50ms de animação) é que é P3.
- **Não encha de achados micro.** 50 achados de "esse hex tá 0x01 mais escuro" = 0 valor. Quality > quantity. Cosmético só vale se quebra **consistência** ou causa **impressão de descuido**.
- **Não misture lente.** Se for problema de copy, é lente de copy. Se for problema de cor, é lente de design system. Misturar polui o sprint backlog.
- **Não puxe do nada.** Cada sugestão de fix tem que ter base em código real (leu o arquivo) ou padrão real (viu no concorrente). Sem "tenta isso aqui".
