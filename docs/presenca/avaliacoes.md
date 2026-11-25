# Presença — avaliação e evolução do módulo

Data mais recente: 25 Nov 2026. Branch `feat/presenca-site-completo`.

## Rodada 25 Nov 2026 — site completo do estabelecimento + editor para donos leigos + logo

Implementação completa dos requisitos do PRD do módulo Presença em duas frentes integradas:

1. **Site público desconectado do AgendiX (visão do cliente final):**
   - Zero referências à marca AgendiX no site público, metadados e diálogos legais próprios (`Privacidade` e `Termos` permanecem na página do estabelecimento, sem redirecionar para rotas globais).
   - Suporte completo a **logo do estabelecimento** com modos **Logo + nome** (`both`), **Só o logo** (`logo`), fallback em erro de carregamento e monograma automático quando sem logo.
   - Três estilos independentes do nicho (**Urbano preciso**, **Editorial clássico**, **Salão luminoso**), filtros de categoria horizontais no mobile, galeria com lightbox navegável, seção **Clube e planos** com diálogo de detalhes, mapa cartográfico interativo com rota externa sem `<iframe>` externo (preservando CSP global), e embed de agendamento herdando paleta e serviço selecionado.
2. **Painel Ajustes → Meu site (visão do dono leigo + tema claro/escuro):**
   - Gerenciador dedicado de **logo** (`LogoPicker` + `uploadSiteLogo` no bucket `logos`, até 5 MB e 512 px preservando transparência PNG/WebP) e galeria visual sem edição manual de URLs.
   - Checklist interativo de completude com progresso e atalhos para blocos pendentes, prévia ao vivo celular/computador/tela cheia, sem jargão técnico (sem `#hex` exposto na edição rápida, sem nomes duplicados de estilo).
   - Prévia fiel do resultado no Google, conferência de dados locais, links de compartilhamento (WhatsApp, Instagram, Google, link direto) e **QR Code** com download e plaquinha para impressão.

### Eval UI/UX independente (Rodada 3 — mobile 320/390 primeiro, 768 e 1280, claro e escuro)

| Superfície | Nota | Leitura |
|---|---|---|
| Site público — Barber / Editorial (`320`, `390`, `768`, `1280` + serviço) | **9,6/10** | Wordmark sem barra cortada, monograma, mapa cartográfico, banner final contrastado, grade do clube e dobra mobile completa. |
| Site público — Beauty (`320`, `390`, `768`, `1280` + serviço) | **9,6/10** | Paleta clara luminosa sem vazamento de outros nichos, chips de categoria sem quebra e card do clube equilibrado. |
| Site público — Cadastro Mínimo (`390`, `1280`) | **9,6/10** | Foto nítida, monograma de marca, texto direto sem repetição de bairro e mapa escuro coerente. |
| Fluxo de Agendamento Embutido (`390`, `1280` — Barber & Beauty) | **9,6/10** | Tokens por estilo e nicho preservados na reserva sem cortar chips nem ocultar o resumo inferior. |
| Painel "Meu site" — Editor Demo e Autenticado Claro/Escuro (`390`, `1280`) | **9,6/10** | Mobile rola livremente (tela cheia sob demanda), logo contido no fundo quadriculado, zero `#hex` cru, prévia sticky no desktop e QR Code completo. |

**Média final:** **9,6/10** (**APROVADO**).

### Revisões independentes e verificações

- **Revisor de eficiência** e **validador crítico** concluídos antes da rodada final (hardening de validação de upload, isolamento `company_id`, sanitização de URLs/JSON-LD, diálogo nativo próprio para documentos legais e otimização de `postMessage` e memoizações).
- `npm run typecheck`, `npm run lint`, `npm test -- --run` (365 arquivos, 2819 testes), `npm run build` (`check-bundle-strings` incluso).
- `npx playwright test --config e2e/establishment/playwright.config.ts` — 26/26 (320, 390, 768 e 1280; demo e autenticado claro/escuro).
- `scripts/test-sql-establishment-sites.sh` no PostgreSQL 17 local — PASS (isolamento multi-tenant, permissões, entitlement, allowlist e rollback 2x).
- Migration `supabase/migrations/20261124133813_establishment_sites.sql` **não aplicada em produção**; `Login`, `Register`, onboarding e Stripe intocados.

---

# Presença — avaliação da mescla com Site-Agendix

Data: 24 Nov 2026. Branch `feat/site-estabelecimento`. PR #256 (draft). Referência do fundador: `rhianlepore001/Site-Agendix` (main). Prints: `/opt/cursor/artifacts/presenca/rhian-ref/` (dele), `/opt/cursor/artifacts/presenca/comparacao/` (dele vs mesclado) e `/opt/cursor/artifacts/presenca/painel/` (Meu site + prévia).

## Rodada Rhian (18:49 Lisboa) — prévia maior no celular + tela cheia

A faixa de ~150 px no topo do celular do dono era curta demais para julgar o site. A prévia agora ocupa uma porção significativa da dobra (headline e lede visíveis) e ganhou **Ver em tela cheia**: o template real em 1:1, com **Voltar ao editor** claro. Os controles continuam no painel; a iframe é a mesma, então a atualização ao vivo segue. Desktop: split intacto, só o atalho de tela cheia na barra da prévia.

### Eval UI/UX (começando pelo mobile)

| Superfície | Nota | Leitura |
|---|---|---|
| Meu site 390 — prévia maior + controles | **9,6/10** | Header, foto, frase e lede cabem na prévia. Ver em tela cheia à vista. Cores e controles embaixo. |
| Meu site 390 — tela cheia | **9,7/10** | O site de verdade, dobra completa, botão Voltar ao editor no topo. |
| Painel autenticado 390 | **9,5/10** | A prévia deixa de ser faixa: mostra a frase. O chrome do app ainda compete (título, salvar, aviso). |
| Desktop 1280 | **9,5/10** | Split igual ao da rodada anterior; atalho de tela cheia na barra, sem reorganizar o layout. |

**Média desta rodada: 9,6/10.**

O que impede 10:

- no celular autenticado o chrome do AgendiX (header + Ajustes) ainda come a dobra — a prévia cresceu dentro do editor, não substitui o shell
- nome longo continua truncando no wordmark da prévia compacta

Prints: `editor-390-preview.png`, `editor-390-fullscreen.png`, `editor-1280-preview.png`, `owner-editor-390-preview.png`, `owner-editor-1280-preview.png`.

## Rodada Rhian (17:24 Lisboa) — cor de fundo e prévia ao vivo

Primeira versão do site aprovada. Pedidos no painel Meu site, mesmo PR, sem merge e sem migration aplicada.

1. **Cor de fundo:** paleta recomendada pelo AgendiX com os padrões atuais de cada estilo (Urbano `#09090B`, Editorial `#FBF7F0`, Salão `#FFFFFF`) em destaque; opção personalizada com seletor e código. `siteSurface()` escolhe tinta legível (WCAG AA) e avisa quando precisa ajustar o texto.
2. **Prévia ao vivo:** o template real atualiza enquanto o dono edita (cor, textos, fotos, oferta, seções). Alternar celular/computador no painel. No celular do dono a prévia fica no topo do espaço de trabalho e os controles rolam embaixo — sem modal que esconda o editor.
3. **Visual:** painel embutido herda tokens do app; a prévia continua isolada no CSS do estabelecimento.

### Eval UI/UX do painel (começando pelo mobile)

| Superfície | Nota | Leitura |
|---|---|---|
| Meu site 390 — prévia + cores + controles | **9,6/10** | A prévia é o site de verdade. Amostras Recomendada aparecem na mesma tela, com celular/computador no topo. |
| Meu site 1280 — split + cores recomendadas | **9,6/10** | Swatches em destaque à esquerda; o template à direita acompanha frase e fundo. |
| Painel autenticado no DS do app | **9,5/10** | Header, sidebar e botões do AgendiX; a prévia não empresta o visual do produto. |

**Média do painel: 9,6/10.**

O que impede 10 (teto honesto, não bloqueador):

- nome longo (`Casa Mock (fictícia)`) trunca no wordmark da prévia compacta — é o template real a 390 px, não um recorte do painel
- a prévia compacta corta a lede no meio da frase — indício de continuação, não página inteira

Prints: `editor-390-preview.png`, `editor-390-colors.png`, `editor-1280-preview.png`, `editor-1280-colors.png`, `owner-editor-390-preview.png`, `owner-editor-1280-preview.png`.

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

- `npx playwright test --config e2e/establishment/playwright.config.ts` — 24/24 (390 e 1280), incluindo prévia ao vivo, cores recomendadas e contraste
- typecheck, lint, build
- Vitest 2786 testes
- migration **não aplicada**; login/cadastro/onboarding/Stripe/tracking intocados
