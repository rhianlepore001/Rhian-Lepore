# Site oficial v2 e simulação

## Refinamento mobile 2.0 — 17 Nov 2026

A abertura apresenta o AgendiX como gestão pelo celular. As prévias de agenda, agendamento online, financeiro, hora de cadeira, equipe e fila usam capturas reais em molduras de celular. Barbearia usa o tema Barber escuro e dourado. Salão usa o tema Beauty claro e lilás. Os controles e o fundo da landing mantêm branco e azul ardósia.

A escolha do negócio sincroniza as prévias e os links. Em telas abaixo de 960 px, a ação principal abre a simulação em tela cheia. Em telas maiores, a simulação abre sob demanda dentro da moldura e mantém um link para a versão em tela cheia. O modo incorporado usa `/demo-preview`, rota que aceita apenas telas da simulação e permite incorporação pela mesma origem. A versão autônoma conserva a navegação entre telas e o tour guiado.

As telas reutilizam os componentes e tokens do aplicativo, com dados fictícios. O enquadramento do agendamento incorporado é compacto para expor o primeiro serviço e parte do fluxo sem rolar dentro do celular. A landing continua em `/landing` e `/#/landing`; a raiz direciona visitantes sem sessão para o login.

A revisão heurística alcançou **9,3/10**. O Chromium verificou ambos os temas em 320, 390, 768, 1024 e 1440 px, sem rolagem horizontal na landing. O axe-core não apontou violações WCAG A/AA nas dez combinações. Os 14 testes Playwright passaram no build local com os cabeçalhos do Vercel aplicados, incluindo o agendamento incorporado e a troca de tema. A incorporação também foi conferida com o service worker ativo. Typecheck, lint, build e 2.527 testes Vitest passaram. O executável `graphify` estava indisponível. Relatório e capturas em `/workspace/artifacts/site-v2/mobile-2/`.

## Imagens de barbearia e salão — 17 Nov 2026

As duas fotos de banco da landing foram substituídas por cenas originais geradas para o AgendiX: gestão com tablet na barbearia e colaboração entre profissionais no salão. Os arquivos responsivos WebP preservam a direção visual da página. As legendas de banco e o crédito Unsplash foram retirados da landing. As pessoas são fictícias, sem representar o criador, familiares ou clientes reais; a origem está em `public/landing/ASSETS.md`. Os antigos assets usados pelas capas da demo foram preservados, assim como os avisos de dados fictícios nas telas do produto. A raiz continua no login e a landing em `/#/landing`. Verificações desta troca: typecheck, lint, build e 2.527 testes aprovados; imagens e recortes conferidos em 320/390/768/1440px. Revisão visual independente das imagens: 9,1/10, sem bloqueadores.

## História do criador — texto aprovado em 17 Nov 2026

A seção “Nossa história” foi substituída pela narrativa aprovada pelo usuário: Rhian Lepore cresceu entre barbearias e salões em um ambiente familiar ligado à beleza; a percepção do esforço dos pais e da necessidade de gerir custos e entradas motivou a criação do AgendiX. O relato aparece em primeira pessoa, atribuído ao criador, sem listar familiares. As referências anteriores a terceiros e a seus estabelecimentos foram removidas da seção e da documentação pública dos assets.

Slogan aprovado: **“Você cresce. O AgendiX acompanha você e ajuda seu negócio a ir além.”** Revisão conferida no navegador em 320, 390 e 1440px, sem rolagem horizontal; typecheck, lint, build e os 2.527 testes passaram. A landing continua separada em `/#/landing` (com atalho `/landing`), e a entrada principal do domínio continua no login para visitantes sem sessão.


## Entrada pública e landing de testes — 17 Nov 2026

A pedido do usuário, a landing deixa de ser a entrada principal do domínio. Visitantes sem sessão que abrem `/` ou `/#/` são direcionados para `/#/login`; quem já tem sessão mantém o Dashboard e o Layout originais. A landing e a demonstração são preservadas para testes.

Acesso à landing: `/#/landing`, disponível com ou sem sessão. Em produção, o endereço amigável `/landing` tem um redirecionamento temporário para `/#/landing` no `vercel.json`. Esse redirecionamento não intercepta os arquivos de `/landing/`. O logotipo da landing e o retorno da demo apontam para a página separada, sem levar o teste de volta à entrada do sistema. Os testes do site usam a rota nova e cobrem o redirecionamento da raiz para o login em desktop e celular. Verificação desta alteração: typecheck, lint e build aprovados; 2.527 testes Vitest em 333 arquivos e 13 testes E2E aprovados sobre o build de produção local.


## Revisão da landing — 17 Nov 2026

Base atualizada a partir de `main`, commit `fd3c490` (PR #211). A revisão mantém branco, azul ardósia, Chivo e Inter, com a logo horizontal fornecida pelo usuário sobre um cabeçalho escuro. O percurso agora apresenta a proposta, permite experimentar por tarefa e segmento, explica os benefícios e orienta o início em três passos antes das dúvidas e do convite final.

As escolhas de segmento acompanham os links de demonstração e cadastro. No celular, a ação principal da simulação abre a tela completa; no desktop, o iframe é carregado somente após a ação do visitante. O cabeçalho reúne a navegação e o cadastro em uma única faixa. O menu fecha com Escape e devolve o foco ao botão. O zoom permanece liberado apenas nesta superfície, com restauração ao sair. Textos auxiliares têm pelo menos 12px e os parágrafos mobile, 15px. As fontes são locais e têm licenças preservadas.

A demo recebeu ajustes de legibilidade no agendamento público, cartões opacos na agenda e a indicação “Saldo do período / Antes de comissões pendentes” no financeiro, exclusivamente na simulação. Trocar o segmento mantém a tarefa em exploração. Os prints correspondentes foram recapturados da UI fictícia, sem retoques; a origem está em `public/landing/ASSETS.md`. Todas as prévias acompanham o segmento escolhido, incluindo financeiro, agendamento, performance, equipe e fila do salão.

A validação do iframe também identificou canais de notificações sendo criados pela página principal sem sessão. O provider agora só abre os canais após resolver usuário e empresa; o encerramento dos canais continua no cleanup do efeito. Login e Register permanecem protegidos pela verificação SHA-256 existente.

A avaliação independente passou de **7,8 para 9,2/10**, após as rodadas de revisão e benchmarking. Notas finais: proposta 9,3; conversão 9,3; composição 9,2; mobile 9,0; acessibilidade 9,1; credibilidade 9,3. É uma avaliação heurística, sem teste com usuários ou medição de conversão. A nota substitui o status visual anterior descrito no histórico abaixo.

As capturas e auditorias locais ficam em `artifacts/site-v2/review-2026-11-17/` (gitignored). A auditoria axe-core nas oito combinações de segmento e largura (barbearia/salão × 320/390/768/1440px) não encontrou violações automáticas WCAG A/AA. Os nós com análise de contraste inconclusiva foram conferidos pelos pares explícitos de cores: ardósia/branco 6,31:1; texto principal/branco 14,86:1; ardósia/superfície clara 5,82:1. A avaliação inclui teclado, foco, redução de movimento, imagens carregadas e ausência de overflow horizontal.

Resíduos: o hero do salão usa um recorte mais amplo que o da barbearia; a extensão da página deve ser refinada com dados reais de cliques e rolagem. O cabeçalho em 320px já acomoda logo, cadastro e navegação em uma linha. O build mantém o aviso anterior de import estático/dinâmico de `useStaffPerformance`. O comando `graphify update .` continua indisponível neste ambiente. As referências de caminhos e reprovações das seções seguintes registram rodadas históricas.


### Benchmarking e identidade

A rodada adicional consultou as páginas oficiais da [Trinks para barbearias](https://negocios.trinks.com/negocios/barbearias/), [Booksy Business Brasil](https://biz.booksy.com/pt-br), [Fresha Business](https://www.fresha.com/for-business) e [SQUIRE](https://www.getsquire.com/). As referências orientaram padrões de apresentação por tarefa, identificação do público e convites contextuais após demonstrar valor. Não foram importados textos, métricas, depoimentos, preços ou promessas de automação desses produtos.

Aplicações no AgendiX: seleção do segmento desde o hero; demonstração inicialmente no fluxo do cliente, evitando repetir a agenda; orientação curta por tarefa; convite ao cadastro imediatamente após a simulação; dez capturas próprias do salão; logo branca/prateada no cabeçalho, em WebP otimizado. A fonte dos assets está em `public/landing/ASSETS.md`.

A validação do build de produção local passou nos **11 E2E** do site: quatro larguras, demonstração autônoma e embutida, troca de segmento/tarefa, teclado, zoom, recuperação de senha e ausência de integrações externas na simulação. `typecheck`, lint e build passaram; os **44 testes direcionados** de landing, contratos da demo e notificações também passaram. A suíte completa final passou em **333 arquivos e 2.525 testes**, incluindo a nova regressão de personalização.

Superfície de marketing: Persuade. Público: donos de barbearias e salões. Ação principal: criar conta pelo cadastro existente. Paleta aprovada: branco + azul ardósia #536174; Chivo + Inter preservados. Composição editorial: título e introdução em colunas, produto real em largura, história com fotografia e demonstração antes dos benefícios. O briefing prevalece sobre sorteios de tipografia, paleta e efeitos da Taste Skill.

## Isolamento

`lib/supabase.ts` escolhe o cliente por hash em cada acesso. O cliente real é criado apenas fora de `/demo`; a implementação em memória não importa credenciais, não usa fetch e lança em métodos desconhecidos. `lib/demo/seed.ts` mantém dois tenants fictícios separados e se reinicia com o módulo ao recarregar. Nenhuma migration ou alteração de banco.

O AuthProvider escolhe um provider fictício antes de montar a autenticação real. Não chama login/logout e não apaga tokens. As páginas Login e Register têm hashes SHA-256 guardados em teste. As páginas reais são carregadas em lazy + Suspense dentro da casca `/demo/*`, com QueryClient separado e prefixo de tenant fictício nas chaves. Integrações globais ficam fora da demo. WhatsApp e captura automática de bugs retornam sem enviar.

## Direção e assets

As cenas de barbearia e salão da landing são geradas e retratam pessoas fictícias; não representam o criador do AgendiX, sua família ou clientes reais. As fotos de banco anteriores ficam apenas no acervo e nas capas da demo. Origem e substituição: `public/landing/ASSETS.md`. Nenhuma foto TRU, Amaro ou GBS. Prints de produto são capturados da UI local da simulação, com dados fictícios. Os prints públicos de produção preservam o prefixo “DEMO ·”; não foram retocados nem usados como prova autenticada. Não foram tentadas novas senhas das contas do seed.

A landing relaxa o viewport apenas enquanto montada; ao sair, restaura o conteúdo anterior. Não altera o viewport do app autenticado. Movimento reduzido, foco visível e navegação por teclado fazem parte da superfície de marketing.

## Validação

`npx vitest run test/demo` — isolamento, links e guarda dos arquivos de autenticação.

`npx playwright test --config e2e/site-v2/playwright.config.ts` — demo com rede Supabase/Pixel/WhatsApp bloqueada, navegação entre nichos e capturas em 390 e 1440px.

O período de teste não tem duração numérica na landing: a oferta pode variar no banco. CTA oficial: “Crie sua conta grátis”.

## Cobertura e limites da v1

Disponíveis: agenda diária e wizard de novo atendimento, agendamento público (serviços, profissional, horário e pedido fictício), financeiro, performance/hora de cadeira, leitura da fila e troca de status, equipe e tour manual. A demo usa um provider de cliente público próprio, em memória; não hidrata, grava nem remove a sessão pública real. O cliente SDK real tem HTTP protegido por hash e pausa renovação/canais ao entrar na demo, inclusive via navegação programática. A captura do callback de recuperação continua antes do router, fora da demo, sem antecipar createClient.

Operações externas e RPCs não implementadas falham explicitamente; não há fallback. Pagamento de comissões, checkout completo, exclusão de profissionais, convites, upload de fotos, cliente recorrente/área do cliente, grupos de pessoas e configurações avançadas não têm cobertura integral na simulação. Algumas ações reais expostas nessas páginas podem informar indisponibilidade. Valores, capacidade e histórico são ilustrativos, não resultados de clientes. Filtros de período respeitam os registros do seed, que fica concentrado no mês atual.

Nenhuma migration ou alteração no fluxo real de cadastro/login/autenticação. No contexto de cliente público, apenas o tipo e o contexto foram exportados para permitir o provider alternativo; a implementação real permaneceu igual. Login e Register continuam byte a byte iguais à base.

## Situação visual

Após o polimento r4/r5 de 16/11/2026, a crítica independente com as skills impeccable, design-taste-frontend e playwright-visual-critique atribuiu **7,7/10** (landing 8,0 e demo 7,4), ainda **reprovada para publicação** pelo corte >8. Subiu 0,9 em relação aos 6,8 da auditoria em `e64fb371`. As duas rodadas autorizadas neste lote foram consumidas. Pendências: nome da barbearia ilegível no booking desktop, cartão “Lucro” ambíguo frente às comissões, grade da agenda sobre os cartões no mobile. Taste `consistency.mjs` não concluiu nesta revisão; sem aprovação de gate. Detalhamento em `/workspace/artifacts/site-v2/CRITIQUE.md` e `polish-r4/critica-independente-r5.md`. O PR deve permanecer em rascunho.

O executável `graphify` não está instalado neste ambiente: `graphify update .` retornou `command not found`. O grafo não foi atualizado.

A raiz tem teste de regressão com os estados autenticado/deslogado: visitante é direcionado para o login; usuário autenticado continua no Dashboard dentro do Layout original em `/#/`. A landing fica separada em `/#/landing`, com cobertura para visitantes e usuários autenticados. O callback inválido de recuperação também tem e2e próprio, com a rede abortada e sem tokens reais.

## Ambiente de Git e CI

O diretório de metadados do worktree original é somente leitura; os commits para o PR foram preparados em `/workspace/artifacts/site-v2/git-submit`, com a mesma base `ca252dea` e branch `feat/site-oficial-v2`. Os arquivos-fonte implementados permanecem em `/workspace/wt-site-v2`; o HEAD local desse worktree não pode ser avançado neste ambiente. Não houve force-push, reset de histórico remoto ou bypass de hooks.

O GitHub recusou a alteração do workflow por falta do escopo OAuth `workflow`. O workflow original foi preservado byte a byte. O job E2E opcional ficou em `/workspace/artifacts/site-v2/CI_SITE_V2.patch`, sem aplicação remota. Os testes novos e a guarda SHA-256 de Login/Register são executados pelo `npm test` do CI existente; a suíte Playwright nova passou localmente e tem comando próprio versionado.


## Rodada de tema claro — 16 Nov 2026

A demo força `data-mode="light"` para os dois nichos e mantém `data-theme` de cada um. A barbearia usa os tokens reais de modo claro do app; o salão usa os seus tokens reais claros. A casca usa #536174 na navegação, sem modificar `design-system/tokens.css`. O booking público da demo conserva o modo claro e não oferece troca para escuro. Fora da demo, o modo e o botão de troca do agendamento público continuam com o comportamento original.

Hero, pôsteres, imagens de agenda, booking, financeiro, equipe, fila, performance e OG foram recapturados da UI real em modo claro, e de novo após o polimento r2/r3. As capturas são dados fictícios e não representam clientes reais.

## Polimento visual r2/r3 — 16 Nov 2026

Três rodadas anteriores: r1 em `e64fb371`; r2/r3 com recortes, pista de rolagem, casca mais baixa, hierarquia do fechamento e acento ardósia na casca. Uma crítica só com playwright-visual-critique tinha dado landing 8 e demo 8,5; a auditoria com as 3 skills no mesmo `e64fb371` deu 6,8.

## Polimento visual r4/r5 — 16 Nov 2026

r4: acento slate também dentro do produto (Barbearia e Salão) só em `styles/demo.css`, fundo #F6F7F8, dados fictícios plausíveis, contraste AA dos rótulos, CTA após o FAQ, #produto dividido, pôsteres recapturados. r5: cartões tipográficos no agendamento, subtítulo honesto de despesas, lista financeira mobile paginada e selos com contraste reforçado. Crítica independente final com as 3 skills: 7,7/10 (landing 8,0, demo 7,4). Sem merge nem publicação.
