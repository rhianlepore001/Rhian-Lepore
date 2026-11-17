# Assets da landing v2

## Cenas criadas para a landing — 17 Nov 2026

As duas fotografias de banco da seção de equipe e de “Nossa história” foram substituídas por imagens originais geradas com a ferramenta OpenAI imagegen para esta revisão do AgendiX. A direção de arte combina luz natural, madeira, branco e azul ardósia com cenas de gestão na rotina da beleza. As pessoas e os estabelecimentos são fictícios; as imagens não retratam Rhian, seus familiares ou clientes reais e não são capturas do produto.

| Arquivos de entrega | Cena | Dimensões |
|---|---|---|
| `story-barbershop-{800,1536}.webp` | Profissional conferindo um tablet na recepção da barbearia | 800×533 / 1536×1024 |
| `team-salon-{800,1448}.webp` | Duas profissionais organizando o dia no salão com um tablet | 800×600 / 1448×1086 |

Originais PNG preservados em `/workspace/generated_images/exec-0be55153-9841-4687-bb44-64825077bb6f.png` (barbearia) e `/workspace/generated_images/exec-57359248-b697-42cb-a774-06cb6d83460f.png` (salão). Versões WebP codificadas com qualidade 87 e metadados removidos. As legendas e o crédito de banco de imagens foram retirados da landing; os avisos de dados fictícios nas demonstrações continuam presentes.

As referências Unsplash abaixo documentam os assets anteriores e as capas que continuam na demonstração. Elas não se aplicam às duas cenas geradas acima.

## Marca no cabeçalho — 17 Nov 2026

`agendix-logo-header.webp` é a versão de entrega, com fundo transparente, preparada a partir da logo horizontal fornecida pelo usuário nesta revisão. O original de trabalho foi preservado em `/workspace/generated_images/`. O WebP tem 640px de largura e aproximadamente 44KB; o cabeçalho escuro preserva a leitura da marca branca/prateada. A marca fica dentro do link identificado como “AgendiX, início”.

## Capturas completas do salão — 17 Nov 2026

As variantes `beauty-{booking,finance,performance,team,queue}-{1440,mobile}.webp` foram capturadas diretamente das rotas `/#/demo/beauty/` correspondentes. Mostram apenas dados fictícios do Studio Aurora. Não houve retoque da interface. Captura Chromium CDP, WebP com qualidade 90 e movimento reduzido. As prévias de barbearia e salão agora acompanham a seleção em toda a landing.

Dimensões desktop/mobile: booking 1000×504 / 366×642; financeiro 1320×600 / 390×468; performance 1144×620 / 390×635; equipe 1320×682 / 390×568; fila 1320×682 / 390×568. Provas, manifesto e script reproduzível foram copiados para a pasta local de revisão em `artifacts/site-v2/`.

## Tipografia local

A landing usa Chivo e Inter em arquivos WOFF2 variáveis locais, sem depender do carregamento do Google Fonts. Os arquivos de peso variável do subconjunto latino vêm de `@fontsource-variable/chivo@5.3.0` e `@fontsource-variable/inter@5.3.0`, distribuídos pelo registro público npm. As famílias CSS `Agendix Chivo` e `Agendix Inter` isolam esta configuração da tipografia do app.

Arquivos: `fonts/chivo-latin-variable.woff2` (33.220 bytes) e `fonts/inter-latin-variable.woff2` (48.256 bytes). Licenças SIL Open Font License 1.1 preservadas em `fonts/CHIVO-LICENSE.txt` e `fonts/INTER-LICENSE.txt`.

## Licença dos assets anteriores de banco

Licença: [Unsplash License](https://unsplash.com/license) — uso comercial permitido, inclusive em site de produto, sem exclusividade. A atribuição não é obrigatória, mas vamos registrar fonte e trocar com facilidade pelas fotos reais que o criador do AgendiX enviar.

As imagens originais estão em `/workspace/artifacts/site-v2/stock-photos/`. No repositório, copie versões otimizadas (WebP/AVIF, larguras 800/1600) para `public/landing/`, com este arquivo ao lado. Não use as fotos com marca de fabricante visível.

## Acervo anterior de banco de imagens

| Arquivo local | ID Unsplash (`images.unsplash.com/<id>`) | Uso sugerido | Notas de direção |
|---|---|---|---|
| `barber-interior-1.jpg` | `photo-1503951914875-452162b0f3f1` | Ofício / storytelling barbearia | Editorial, escuro, artesanal. Tom um pouco quente; recorte com a paleta ardósia. |
| `barber-shop-2.jpg` | `photo-1585747860715-2ba37e788b70` | Atmosfera de barbearia (interior) | Três cadeiras, tijolo, luz pontual. Um pouco “stock”, mas profissional. |
| `salon-interior-1.jpg` | `photo-1560066984-138dadb4c035` | Atmosfera de salão (editorial) | Preto e branco, claro, sóbrio. Combina com referência Rolex. |
| `salon-station-3.jpg` | `photo-1633681926022-84c23e8cb2d6` | Interior de salão premium | Claro, contemporâneo, bom com #536174. |
| `salon-hairdresser-4.jpg` | `photo-1562322140-8baeececf3df` | Ofício / storytelling salão | Luz natural, trabalho real. Evitar cara de banco sorridente demais no hero. |

## Não usar (marca visível ou menos premium)

| Arquivo local | ID | Motivo |
|---|---|---|
| `barber-cut-1.jpg` | `photo-1599351431202-1e0f0137899a` | Pente com a marca “TRU” visível. |
| `barber-tools-3.jpg` | `photo-1621605815971-fbc98d665033` | Marcas Amaro / GBS nas máquinas. |
| `salon-wash-2.jpg` | `photo-1521590832167-7bcbfaa6381f` | Visual datado, pôsteres, menos premium. |

## Já existentes no app (login gateway)

- `public/img/barbearia-800.webp`
- `public/img/mulher-studio-800.webp` e `.avif`

Podem ser reutilizadas se combinarem com a paleta, mas o hero do site deve privilegiar produto real (prints / demo) em vez de foto de estoque.

## Crédito dos fotógrafos

Neste ambiente as páginas do Unsplash redirecionam para um desafio anti-bot, e os JPEG vieram sem EXIF. Antes de publicar no ar, completar nesta tabela o nome e o link `@usuario` de cada foto (busca visual no Unsplash pelo ID). Enquanto isso, manter o link da licença e o ID.

Troca pelas fotos reais: substituir os arquivos em `public/landing/` mantendo os mesmos nomes, ou atualizar um mapa único (ex. `public/landing/manifest.json`).

## Capturas locais do produto

`agenda`, `beauty`, `finance`, `performance`, `queue`, `team` e `booking`, em variantes `1440` e `mobile`, vêm dos componentes reais montados nas rotas `/demo`. São recortes da área de conteúdo capturados localmente com Playwright, sem retocar nomes ou dados. Não representam métricas de um cliente real. Originais completos em `/workspace/artifacts/site-v2/demo-shots/`.

## Rodada de tema claro

As imagens de `agenda`, `beauty`, `hero-agenda`, `booking`, `finance`, `performance`, `queue` e `team` foram recapturadas em modo claro usando os tokens reais dos dois temas. A imagem OG foi atualizada a partir da agenda clara. As imagens de produto preservam textos, estados e dados fictícios da UI; o recorte do pôster mobile ainda precisa de revisão visual.

## Polimento r2 — 16/11/2026

Recaptura local das sete telas da demo clara em 390 e 1440px; acentos da barbearia usam azul ardósia apenas na demo. O agendamento mostra a primeira linha de serviços completa (nome, preço e duração). A performance enquadra título, filtros e a visão principal de hora de cadeira até a ocupação; o mobile vem da UI responsiva com o botão Filtrar. Capturas sem alterações nos dados fictícios.

Fontes PNG, provas e script reproduzível: `/workspace/artifacts/site-v2/polish-r2/`. Avaliação independente pendente; esta rodada não atribui nota nem autoriza publicação.

## Revisão da experiência — 17/11/2026

`booking-1440`, `booking-mobile`, `finance-1440`, `finance-mobile`, `agenda-mobile` e `hero-agenda-mobile` foram recapturados diretamente da demonstração local após a revisão de legibilidade. O financeiro apresenta “Saldo do período” antes de comissões pendentes; os cartões da agenda têm fundos opacos. O recorte do agendamento privilegia a escolha de serviços. Arquivos WebP gerados pelo próprio Chromium (CDP `Page.captureScreenshot`), sem retoque de nomes, valores ou pixels; continuam sendo dados fictícios, sem representar clientes reais.
