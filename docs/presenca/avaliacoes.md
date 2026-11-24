# Presença — avaliação da mescla com Site-Agendix

Data: 24 Nov 2026. Branch `feat/site-estabelecimento`. Referência do fundador: `rhianlepore001/Site-Agendix` (main). Prints: `/opt/cursor/artifacts/presenca/rhian-ref/` (dele) e `/opt/cursor/artifacts/presenca/mesclado/` (resultado).

## O que entrou da versão do Rhian

Direção editorial (pergaminho + header espresso + cobre) e minimal (branco + musgo); hero em split com foto no topo no celular; wordmark empilhado com sublinhado da marca; nav Início / Serviços / Equipe / Localização; faixa de oferta sólida; prova (nota + aberto hoje); cards de serviço sem miniatura de catálogo; antes/depois ao lado dos serviços; FAQ + localização em colunas; CTA final com foto; barra fixa de agendar no celular.

## O que ficou da versão AgendiX

Modelo em `lib/establishment/model.ts` (tudo configurável, seções vazias ocultas); demos Corte Fino / Studio Aurora / cadastro mínimo; painel Meu site no DS do app; iframe de agendamento AgendiX nos CTAs; `openingStatus` com fuso; recorte da foto (`photoFocus`); isolamento de CSS/fontes (sem Inter, sem tokens do produto, sem Gemini, sem `server.ts`).

## Eval independente

Crítico de agência (Composer) sobre as dobras 390/1280 vs a referência: **8,7/10**.

Leitura: na dobra o mesclado já é site de estúdio, não pele de app. Desktop em paridade com a referência (split, nav, CTA). Os pontos que puxam a nota para baixo são, em grande parte, restrições do produto:

- faixa “Demonstração / dados fictícios” — obrigatória nas demos; site publicado de cliente não a exibe
- CTA no header + barra fixa no celular — está na referência do fundador
- crédito discreto AgendiX no rodapé — pedido do produto

Sem a faixa de demo (caso publicado), a dobra 390 fica no mesmo nível visual da versão dele. Tipografia do salão ganhou serif itálico no título para diferenciar do app e aproximar de atelier.

## Verificações

- `npx playwright test --config e2e/establishment/playwright.config.ts` — 24/24
- typecheck, lint e testes de `lib/establishment` + `establishmentSite` passaram
- migration **não aplicada**; login/cadastro/onboarding/Stripe intocados
