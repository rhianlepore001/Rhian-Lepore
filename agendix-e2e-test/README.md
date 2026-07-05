# Agendix E2E Test — Plano de Auditoria 360°

Teste end-to-end do AgendiX (produção), cobrindo 4 frentes: **dono (onboarding → primeira impressão → retenção)**, **colaborador (dashboard + KPIs)**, **cliente final (jornada de agendamento)**, e **jornada E2E completa** (smoke + happy path + edge cases).

## Estrutura

```
agendix-e2e-test/
├── 00-planejamento/          # plano macro, manifesto de loops, critérios de aceite
├── 01-pesquisa-mercado/      # concorrentes, personas, benchmarks
│   ├── concorrentes/         # análise de AppBarber, Trinks, Booksy, etc.
│   ├── relatos-reais/        # relatos de barbearias em fóruns, YouTube, ReclameAqui
│   └── prompts/              # briefings dos agentes (4 especialistas + 1 orquestrador)
├── 02-personas/              # personas dono, colaborador, cliente final
├── 03-testes/                # resultados por frente
│   ├── dono-onboarding/
│   ├── colaborador-dashboard/
│   ├── cliente-final/
│   └── e2e-jornada/
├── 04-bugs-e-achados/        # issues encontrados (P0/P1/P2/P3) com evidência
├── 05-sprints/               # sprints/ com tasks, critérios de aceite, estimativa
├── 06-template-setup/        # ambiente de teste com 1 mês de dados validados
└── assets/                   # screenshots, vídeos, exports
```

## Como rodar (resumo)

1. Leia `00-planejamento/LOOP-MANIFESTO.md` — define o que é cada loop, como você intervém, e os gates de saída.
2. Popule `06-template-setup/` com o ambiente (1 mês de dados, 4 colaboradores ativos).
3. Rode a pesquisa de mercado em `01-pesquisa-mercado/` (deep research com concorrência + relatos reais).
4. Derive as personas em `02-personas/`.
5. Execute os 4 agentes especialistas (prompts em `01-pesquisa-mercado/prompts/`) em paralelo.
6. Rode o orquestrador pra consolidar em `04-bugs-e-achados/consolidado.md`.
7. Quebre em sprints em `05-sprints/sprint-N/`.

## Princípios

- **Rigor com bom senso, sem exagero**: vazamento entre tenants é P0, copy em inglês em público pt-BR é P0. **Cosmético NÃO é automaticamente P3** — uma cor hardcoded num card, uma borda branca que outros cards não têm, uma fonte diferente num botão, uma sombra irregular — tudo isso dá impressão de produto barato/desleixado e **deve ser P1 ou P2**. P3 é só micro-ajuste invisível pro usuário comum (1px de sombra, animação 50ms mais lenta, alinhamento sub-pixel).
- **Consistência entre componentes do mesmo tipo é lei**: se existe um card "Serviço" e um card "Cliente" na mesma tela, e um tem borda e o outro não, isso é P1. Consistência visual > criatividade individual por componente.
- **Impressão > tecnicalidade**: 5 cards com cor levemente diferente da dos colegas causa a mesma sensação negativa que um botão quebrado. O olho do usuário não diferencia "defeito" de "feiura" — ele só sente "isso aqui é duvidoso".
- **Olhar 360**: 4 lentes (UI/UX visual, copy/microcopy, fluxo/funcional, design system). Nenhuma tela escapa de pelo menos 2.
- **Loops > prompts**: o briefing inicial abre o loop; quem fecha é você, com steer em tempo real.
- **Produção real**: a conta `bob.teste@gmail.com` tem dados validados, e a gente cria mais 1 mês sintético pra ter densidade de teste.
- **Documentação como produto**: cada achado tem Issue Card. Cada sprint tem tasks com critério de aceite. Qualquer agente (Claude/Codex/OpenCode) consegue ler e continuar.
