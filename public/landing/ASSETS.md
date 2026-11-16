# Assets da landing v2 — fotos de banco (provisórias)

Licença: [Unsplash License](https://unsplash.com/license) — uso comercial permitido, inclusive em site de produto, sem exclusividade. A atribuição não é obrigatória, mas vamos registrar fonte e trocar com facilidade pelas fotos reais da Moderna / Tales quando o Rhian enviar.

As imagens originais estão em `/workspace/artifacts/site-v2/stock-photos/`. No repositório, copie versões otimizadas (WebP/AVIF, larguras 800/1600) para `public/landing/`, com este arquivo ao lado. Não use as fotos com marca de fabricante visível.

## Usar na v2

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
