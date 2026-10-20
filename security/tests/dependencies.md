# Dependências — npm audit

Executado em 2026-10-19 com npm 11.9.0, registry.npmjs.org e lockfile do checkout. Exit 1 significa advisories presentes. Não foi executado audit fix, upgrade major nem código de prova de exploração dessas dependências.

Contagem do scanner: 39 entradas (5 critical, 26 high, 7 moderate, 1 low); entradas transitivas e propagadas não são 39 falhas independentes da aplicação.

| Pacote | Severidade do scanner | Direta | Fix indicado envolve major |
|---|---|---|---|
| `@babel/core` | low | não | não indicado |
| `@babel/plugin-transform-modules-systemjs` | high | não | não indicado |
| `@rollup/plugin-terser` | moderate | não | não indicado |
| `@typescript-eslint/eslint-plugin` | high | sim | sim |
| `@typescript-eslint/parser` | high | sim | sim |
| `@typescript-eslint/type-utils` | high | não | sim |
| `@typescript-eslint/typescript-estree` | high | não | sim |
| `@typescript-eslint/utils` | high | não | sim |
| `@vitest/coverage-v8` | critical | sim | sim |
| `@vitest/mocker` | moderate | não | sim |
| `@vitest/ui` | critical | sim | sim |
| `baseline-browser-mapping` | moderate | sim | não indicado |
| `brace-expansion` | high | não | não indicado |
| `braces` | high | não | sim |
| `browserslist` | high | não | não indicado |
| `esbuild` | moderate | não | sim |
| `fast-glob` | high | não | sim |
| `fast-uri` | high | não | não indicado |
| `fflate` | moderate | não | não indicado |
| `flatted` | high | não | não indicado |
| `form-data` | high | não | não indicado |
| `globby` | high | não | sim |
| `happy-dom` | critical | sim | sim |
| `js-yaml` | high | não | não indicado |
| `lodash` | high | não | não indicado |
| `micromatch` | high | não | sim |
| `nanoid` | high | não | não indicado |
| `picomatch` | high | não | não indicado |
| `postcss` | high | sim | não indicado |
| `react-router` | high | não | não indicado |
| `react-router-dom` | high | sim | não indicado |
| `serialize-javascript` | high | não | não indicado |
| `source-map-js` | high | não | não indicado |
| `tinypool` | critical | não | sim |
| `vite` | high | sim | sim |
| `vite-node` | moderate | não | sim |
| `vitest` | critical | sim | sim |
| `workbox-build` | moderate | não | não indicado |
| `ws` | high | não | não indicado |

## Análise de alcance

- Vitest 2.1.9 / @vitest/ui e Happy DOM 15.11.7 têm alertas críticos de ferramentas de desenvolvimento. Esta auditoria executou Vitest CLI com jsdom; não abriu Vitest UI nem processou conteúdo externo em Happy DOM. Isso limita o alcance observado, sem invalidar a necessidade de atualização.
- Vite 6.4.1 e Vite 5.4.21 transitivo do Vitest têm avisos de servidor de desenvolvimento/arquivos. Não são o servidor estático Vercel; desenvolvimento exposto merece prioridade no PR de atualização. Não executar o servidor dev com dados/segredos reais.
- React Router 7.13.0 apresenta advisories high para SSR/RSC, loaders/actions, redirecionamentos e matching. AgendiX usa HashRouter no cliente, sem servidor SSR/RSC identificado. Nenhum caminho de entrada explorável desses advisories foi reproduzido; revisar navegação dinâmica antes de declarar todos irrelevantes.
- Alertas em glob/brace expansion, browserslist, Babel, terser e parsers pertencem majoritariamente à cadeia de build/lint. A exploração depende de padrões/arquivos maliciosos ou contexto de desenvolvimento; não houve reprodução no produto.
- jsPDF 4.2.1 não apareceu como entrada vulnerável neste resultado. Isso não atesta todas as operações PDF.

Recomendação: PR separado para atualizar ferramentas em conjunto (Vitest/coverage/UI, Vite e parsers), respeitando compatibilidade Node/React e repetindo gates; atualização compatível do Router após teste de HashRouter. Não usar `npm audit fix --force` para alterar a cadeia automaticamente.

Referências principais: [Vitest UI GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp), [Happy DOM GHSA-37j7-fg3j-429f](https://github.com/advisories/GHSA-37j7-fg3j-429f), [Vite GHSA-p9ff-h696-f583](https://github.com/advisories/GHSA-p9ff-h696-f583), [Router GHSA-49rj-9fvp-4h2h](https://github.com/advisories/GHSA-49rj-9fvp-4h2h).

Relatório completo observado (sem segredos): `/workspace/scratch/agendix-audit/evidence/npm-audit.json`.
