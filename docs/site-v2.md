# Site oficial v2 e simulação

Superfície de marketing: Persuade. Público: donos de barbearias e salões. Ação principal: criar conta pelo cadastro existente. Paleta aprovada: branco + azul ardósia #536174; Chivo + Inter preservados. Composição editorial: título e introdução em colunas, produto real em largura, história com fotografia e demonstração antes dos benefícios. O briefing prevalece sobre sorteios de tipografia, paleta e efeitos da Taste Skill.

## Isolamento

`lib/supabase.ts` escolhe o cliente por hash em cada acesso. O cliente real é criado apenas fora de `/demo`; a implementação em memória não importa credenciais, não usa fetch e lança em métodos desconhecidos. `lib/demo/seed.ts` mantém dois tenants fictícios separados e se reinicia com o módulo ao recarregar. Nenhuma migration ou alteração de banco.

O AuthProvider escolhe um provider fictício antes de montar a autenticação real. Não chama login/logout e não apaga tokens. As páginas Login e Register têm hashes SHA-256 guardados em teste. As páginas reais são carregadas em lazy + Suspense dentro da casca `/demo/*`, com QueryClient separado e prefixo de tenant fictício nas chaves. Integrações globais ficam fora da demo. WhatsApp e captura automática de bugs retornam sem enviar.

## Direção e assets

Fotos provisórias de banco não representam a Moderna nem o Tales. Fontes e substituição: `public/landing/ASSETS.md`. Nenhuma foto TRU, Amaro ou GBS. Prints de produto são capturados da UI local da simulação, com dados fictícios. Os prints públicos de produção preservam o prefixo “DEMO ·”; não foram retocados nem usados como prova autenticada. Não foram tentadas novas senhas das contas do seed.

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

Após o polimento r2/r3 de 16/11/2026, a crítica independente atribuiu **landing 8/10** e **demo 8,5/10**. A landing permanece **reprovada para publicação** pelo corte >8; as três rodadas foram consumidas. Pendências: legendas menores do Financeiro em 390px e verificação do CTA fixo mobile em mais posições de rolagem. Taste Gate histórico: `FAIL 34`; sem aprovação declarada. Detalhamento em `/workspace/artifacts/site-v2/CRITIQUE.md`. O PR deve permanecer em rascunho.

O executável `graphify` não está instalado neste ambiente: `graphify update .` retornou `command not found`. O grafo não foi atualizado.

A raiz tem teste de regressão com os estados autenticado/deslogado: visitante vê a landing; usuário autenticado continua no Dashboard dentro do Layout original em `/#/`. O callback inválido de recuperação também tem e2e próprio, com a rede abortada e sem tokens reais.

## Ambiente de Git e CI

O diretório de metadados do worktree original é somente leitura; os commits para o PR foram preparados em `/workspace/artifacts/site-v2/git-submit`, com a mesma base `ca252dea` e branch `feat/site-oficial-v2`. Os arquivos-fonte implementados permanecem em `/workspace/wt-site-v2`; o HEAD local desse worktree não pode ser avançado neste ambiente. Não houve force-push, reset de histórico remoto ou bypass de hooks.

O GitHub recusou a alteração do workflow por falta do escopo OAuth `workflow`. O workflow original foi preservado byte a byte. O job E2E opcional ficou em `/workspace/artifacts/site-v2/CI_SITE_V2.patch`, sem aplicação remota. Os testes novos e a guarda SHA-256 de Login/Register são executados pelo `npm test` do CI existente; a suíte Playwright nova passou localmente e tem comando próprio versionado.


## Rodada de tema claro — 16 Nov 2026

A demo força `data-mode="light"` para os dois nichos e mantém `data-theme` de cada um. A barbearia usa os tokens reais de modo claro do app; o salão usa os seus tokens reais claros. A casca usa #536174 na navegação, sem modificar `design-system/tokens.css`. O booking público da demo conserva o modo claro e não oferece troca para escuro. Fora da demo, o modo e o botão de troca do agendamento público continuam com o comportamento original.

Hero, pôsteres, imagens de agenda, booking, financeiro, equipe, fila, performance e OG foram recapturados da UI real em modo claro, e de novo após o polimento r2/r3. As capturas são dados fictícios e não representam clientes reais.

## Polimento visual r2/r3 — 16 Nov 2026

Três rodadas: r1 já em `e64fb371`; r2 com recortes, pista de rolagem, casca mais baixa e acento ardósia só na demo; r3 com hierarquia do fechamento, contraste dos “+” e CTA mobile abaixo do menu. Crítica independente final: landing 8/10, demo 8,5/10. A landing não superou o corte. Sem merge nem publicação.
