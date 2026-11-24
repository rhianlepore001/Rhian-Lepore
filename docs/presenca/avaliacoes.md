# Presença — avaliação da mescla com Site-Agendix

Data: 24 Nov 2026. Branch `feat/site-estabelecimento`. PR #256 (draft). Referência do fundador: `rhianlepore001/Site-Agendix` (main). Prints: `/opt/cursor/artifacts/presenca/rhian-ref/` (dele) e `/opt/cursor/artifacts/presenca/comparacao/` (dele vs mesclado).

## Rodada Bob (16:49 Lisboa) — meta ≥9,5

Revisão sobre os prints da mescla (nota anterior 8,7). Seis achados tratados neste commit, mesmo PR, sem merge e sem migration.

1. **Desktop 1280:** hero e título Serviços encostavam na borda. `--es-inline` agora acompanha o gutter do header (48px no desktop). Teste Playwright confere `wordmark.x ≈ hero.x ≈ serviços.x`.
2. **Oferta do salão:** copy quebrada/redundante substituída por «Hidratação de presente na primeira visita» + «Ao agendar corte ou coloração.». `offerDisplay()` no modelo omite a condição quando ela repete o título.
3. **Faixa de demo:** permanece (dados fictícios rotulados), agora em caixa alta discreta, sem fundo. O eval **desconsidera** esta faixa — ela não existe no site publicado do cliente.
4. **CTA duplo no celular:** botão do header some quando a barra fixa está visível (`data-sticky-twin`). No desktop o CTA do header volta.
5. **Wordmark:** nome completo numa linha, maior, com sublinhado da marca. «Corte Fino» / «Studio Aurora» deixam de ser prefixo miúdo + sobrenome.
6. **Dobra mobile:** foto um pouco mais alta + copy mais curta para o título Serviços (e o começo do primeiro card) aparecerem acima da barra fixa.

## Eval independente

Crítico de agência (Composer) sobre as dobras 390/1280 vs a referência, **ignorando a faixa de demonstração**:

| | Nota |
|---|---|
| Referência Rhian | 8,9/10 |
| Mesclado (após os 6 achados) | **9,5/10** |
| Comparação | mesclado ≥ referência |

Leitura: a dobra já é site de estúdio. Desktop em paridade ou melhor (alinhamento do container, oferta do salão limpa). Mobile: um CTA, wordmark com presença, indício de Serviços, prova social no tom de casa aberta.

O que impede 10 (teto honesto, não bloqueador):

- lockup empilhado da referência («Barbearia / do Carmo») vs uma linha — presença ganhou corpo, perdeu o empilhamento editorial
- cards de serviço ainda têm moldura de catálogo (preço + badge), não só vitrine
- no salão 390 a barra fixa encosta no teaser do primeiro card — é o recorte da dobra, não um segundo CTA

Sem a faixa de demo (caso publicado), a dobra 390 fica no mesmo nível visual da versão dele, com as correções acima.

## O que entrou da versão do Rhian

Direção editorial (pergaminho + header espresso + cobre) e minimal (branco + musgo); hero em split com foto no topo no celular; wordmark com sublinhado da marca; nav Início / Serviços / Equipe / Localização; faixa de oferta sólida; prova (nota + aberto hoje); cards de serviço sem miniatura de catálogo; antes/depois ao lado dos serviços; FAQ + localização em colunas; CTA final com foto; barra fixa de agendar no celular.

## O que ficou da versão AgendiX

Modelo em `lib/establishment/model.ts` (tudo configurável, seções vazias ocultas, `offerDisplay`); demos Corte Fino / Studio Aurora / cadastro mínimo; painel Meu site no DS do app; iframe de agendamento AgendiX nos CTAs; `openingStatus` com fuso; recorte da foto (`photoFocus`); isolamento de CSS/fontes (sem Inter, sem tokens do produto, sem Gemini, sem `server.ts`).

## Verificações

- `npx playwright test --config e2e/establishment/playwright.config.ts` — 24/24 (390 e 1280), incluindo alinhamento do container, CTA único no celular e indício de Serviços
- typecheck, lint, build
- Vitest 2777 testes
- migration **não aplicada**; login/cadastro/onboarding/Stripe intocados
