# Mapeamento técnico — Site do estabelecimento (Presença)

**Base analisada:** worktree `/workspace/wt-site-estab`, informado como `main` em `888b84f4`. Consulta somente leitura; nenhum arquivo foi alterado. Li `/workspace/presenca-site/PRD.md` e `diagnostico.md`, além do mapa `graphify-out/GRAPH_REPORT.md`. O mapa Graphify foi gerado em `6af8a006`, portanto está defasado em relação à base indicada.

## 1. Roteamento e entrada pública

- O app usa `HashRouter` em [App.tsx:344–363](App.tsx:344), com `Routes` em [App.tsx:208–211](App.tsx:208). Rotas públicas/independentes ficam no primeiro grupo de rotas, antes do grupo autenticado: [App.tsx:212–255](App.tsx:212). O `ProtectedLayout` só envolve as rotas declaradas a partir de [App.tsx:271–273](App.tsx:271).
- `/book/:slug`, `/pro/:slug`, `/minha-area/:slug`, `/clube/:slug`, `/queue/:slug` e `/avaliar/:token` são rotas públicas do HashRouter: [App.tsx:249–255](App.tsx:249).
- Páginas são declaradas com `React.lazy()` em [App.tsx:26–79](App.tsx:26); `AppRoutes` tem `<Suspense>` em [App.tsx:208–211](App.tsx:208), e o conteúdo das rotas também é suspenso em [App.tsx:99–114](App.tsx:99). `PublicBooking` é lazy em [App.tsx:38–39](App.tsx:38).
- Para uma **nova rota pública no padrão atual**, o caminho local é adicionar a importação lazy e um `<Route>` no grupo “Public / Standalone Routes”, fora de `ProtectedLayout`; isso não exige alterar as declarações de login, cadastro ou onboarding. Login/cadastro estão em [App.tsx:215–216](App.tsx:215), onboarding em [App.tsx:257–269](App.tsx:257).
- Esse padrão só resolve rotas no hash, como `/#/book/slug`. Ele **não** torna `/slug` uma rota pública real: o HashRouter lê o fragmento, e o caminho de entrada sem hash não é tratado como rota de estabelecimento. O fallback do app redireciona caminhos não reconhecidos para `/`: [App.tsx:308–310](App.tsx:308).
- O objetivo de usar `agendixstudio.com/<slug>` requer tratamento adicional de caminho na Vercel ou fora do app SPA. Acrescentar apenas um `<Route path="/:slug">` ao HashRouter não é suficiente.

## 2. `PublicBooking`, componentes públicos e contexto de agendamento

### Dados e fluxo

`PublicBooking` obtém o slug com `useParams`, lê query params com `useSearchParams` e carrega perfil, ajustes, serviços, categorias, equipe, galeria e produtos em [pages/PublicBooking.tsx:115–152](pages/PublicBooking.tsx:115). Os hooks são definidos em [hooks/usePublicBooking.ts:54–115](hooks/usePublicBooking.ts:54) e delegam às funções em `services/publicBooking.ts`.

A página já reúne cabeçalho com logo/capa, nota e avaliações, contatos, galeria, navegação de catálogo, serviços, profissionais, horários, política, produtos e clube. O cabeçalho público é [components/PublicBusinessHeader.tsx:31–46](components/PublicBusinessHeader.tsx:31); inclui links para WhatsApp, Instagram e Google Maps em [components/PublicBusinessHeader.tsx:68–76](components/PublicBusinessHeader.tsx:68), além de nota, endereço e galeria.

### Tema barber/beauty

- O tipo vem de `business.user_type`. `beauty` força o tema beauty; qualquer outro tipo cai em barber: [pages/PublicBooking.tsx:218–220](pages/PublicBooking.tsx:218).
- O hook de tema recebe `override`, e a página aplica atributos de tema e modo ao `<html>`: [pages/PublicBooking.tsx:222–229](pages/PublicBooking.tsx:222). Também adiciona e limpa classes/atributos públicos no body/documento: [pages/PublicBooking.tsx:380–403](pages/PublicBooking.tsx:380).
- O padrão documentado é barber escuro e beauty claro. A implementação de tokens está em [hooks/useBrutalTheme.ts:1–22](hooks/useBrutalTheme.ts:1), e os tokens Tailwind v4 em [styles/tailwind.css:9–47](styles/tailwind.css:9).

### Pré-seleção por query string

- `?pro=` é reconhecido em [pages/PublicBooking.tsx:119–122](pages/PublicBooking.tsx:119) e inicializa o profissional escolhido em [pages/PublicBooking.tsx:169–175](pages/PublicBooking.tsx:169). A página também exibe contexto para links profissionais em [pages/PublicBooking.tsx:1486–1491](pages/PublicBooking.tsx:1486).
- **`?service=` não é reconhecido atualmente.** A seleção de serviços começa vazia em [pages/PublicBooking.tsx:158–164](pages/PublicBooking.tsx:158). O parâmetro de serviço existente é `rebook`, que aceita IDs separados por vírgula e seleciona serviços válidos: [pages/PublicBooking.tsx:456–462](pages/PublicBooking.tsx:456). Outros parâmetros atuais incluem `rebook`, `edit`, `avaliacoes`, `secao` e `agendar`.
- `ProfessionalPortfolio` já monta link com profissional pré-selecionado; o componente da página fica em [pages/ProfessionalPortfolio.tsx](pages/ProfessionalPortfolio.tsx) e a rota em [App.tsx:253](App.tsx:253). O diagnóstico informa que seu link leva a `/book/:slug?pro=...`.

### Embutir o agendamento

Não há um componente independente de fluxo completo pronto para ser montado em outra página. `PublicBooking` depende de hooks de rota e carrega o fluxo inteiro. O projeto tem um `<Modal>` reutilizável em [components/ui/Modal.tsx:10–32](components/ui/Modal.tsx:10), mas isso, sozinho, não transforma a página atual em fluxo embutível. Para o requisito do PRD, seria necessário extrair o fluxo para um componente que receba contexto ou adaptar a página para funcionar dentro de uma rota/modal. Isso é uma conclusão da estrutura atual, não uma impossibilidade técnica.

## 3. RPCs e selects públicos usados pelo `/book`

As chamadas do catálogo ficam em [services/publicBooking.ts:538–635](services/publicBooking.ts:538). A maior parte foi criada em `20260613_security_s2_public_rls.sql` e endurecida em `20260918180100_p0_harden_public_booking_catalogs.sql`. As RPCs públicas usam `SECURITY DEFINER`; preservem as allowlists e grants existentes ao estender retornos.

| RPC e assinatura usada | Retorno relevante observado | Definição / versão relevante |
|---|---|---|
| `get_public_profile_by_slug(p_slug text)` | Um objeto com `id`, `business_name`, `user_type`, `google_rating`, `total_reviews`, `phone`, `enable_upsells`, `enable_professional_selection`, `logo_url`, `cover_photo_url`, `address_street`, `instagram_handle`, `region`, `business_slug`. | `20260613_security_s2_public_rls.sql:246–278`; grants a `anon, authenticated` em `:358–363`. |
| `get_public_business_settings_json(p_business_id uuid)` | JSON com `business_hours`, `cancellation_policy`, `enable_self_rescheduling`, `public_products_enabled`, `queue_mode`, `queue_allow_leave`, `queue_late_minutes`, `timezone`, `client_cancel_cutoff_hours`, `client_cancel_note`, `client_cancel_policy_text`, `online_booking_auto_confirm`. | Definição mais recente localizada: `20261013141521_client_cancel_policy_text.sql:24–54`, que incorpora os campos introduzidos em `20260925120000_business_timezone.sql`, `20261004082633_client_cancel_cutoff.sql` e `20261011161117_auto_confirm_online_bookings.sql`. |
| `get_public_services_catalog(p_business_id uuid)` | Array de serviços ativos: `id`, `name`, `description`, `price`, `duration_minutes`, `category_id`, `image_url`, `active`; ordenado por preço. | `20260918180100_p0_harden_public_booking_catalogs.sql:70–95`. |
| `get_public_categories_catalog(p_business_id uuid)` | Array de `{ id, name }`, ordenado por `display_order`. | `20260613_security_s2_public_rls.sql:314–326`. |
| `get_public_team_catalog(p_business_id uuid)` | Array com `id`, `name`, `full_name`, `slug`, `role`, `bio`, `photo_url`, `active`, `display_order`, `is_owner`. Filtra `active = true` e `deleted_at IS NULL`. | `20260918180100_p0_harden_public_booking_catalogs.sql:97–125`. |
| `get_public_gallery_catalog(p_business_id uuid)` | Array com `id`, `image_url`, `display_order`; somente imagens ativas. | `20260918180100_p0_harden_public_booking_catalogs.sql:127–147`. |
| `get_public_products_catalog(p_business_id uuid)` | Array com `id`, `name`, `description`, `sale_price`, `image_url`; só retorna itens se `public_products_enabled`, e filtra produto ativo, visível publicamente e com estoque. | `20261120120000_public_products_showcase.sql:117–164`. |
| `get_public_customer_reviews(p_business_id text, p_offset integer default 0)` | JSONB com `average`, `total`, `reviews`; cada avaliação tem `id`, `rating`, `comment`, `created_at`. Página de seis avaliações, somente visitas completas verificadas; não retorna nome/telefone de cliente. | `20261121083646_verified_booking_reviews.sql:248–273`; schema de validação no cliente em `services/customerReviews.ts:19–28`. |

**Equipe vigente:** confirmado para o catálogo público. A RPC usada em `services/publicBooking.ts:602–609` é `get_public_team_catalog`; a definição endurecida testa tanto `tm.active = true` quanto `tm.deleted_at IS NULL` (`20260918180100_p0_harden_public_booking_catalogs.sql:121–124`). A RPC do portfólio individual também exige equipe ativa e não removida: `20261120131356_public_professional_portfolio.sql:20–25`.

**Avaliações:** o hook busca `get_public_customer_reviews` via paginação infinita em [hooks/useCustomerReviews.ts:11–21](hooks/useCustomerReviews.ts:11), e o cliente valida `average`, `total` e as quatro propriedades da avaliação em [services/customerReviews.ts:19–42](services/customerReviews.ts:19). O cabeçalho combina o resumo dessas avaliações internas: [pages/PublicBooking.tsx:995](pages/PublicBooking.tsx:995).

**Horários:** o fluxo chama `get_available_slots_v2(p_business_id, p_date, p_professional_id, p_duration_min, p_is_professional)`; retorno JSON com `slots`, `lead_time_hours`, `lead_time_minutes`, `empty_reason` (`20261013141528_booking_lead_time_minutes.sql:53–110`). Para datas lotadas, `get_full_dates_v2(p_business_id, p_start_date, p_end_date, p_professional_id, p_duration_min)` retorna `date[]` (`20261003152759_public_booking_lead_time.sql:157–187`). Os wrappers chamam primeiro as versões `_v2` e só fazem fallback para funções antigas se a RPC não existir: [services/publicBooking.ts:486–518](services/publicBooking.ts:486).

A página também carrega planos do clube via `get_public_membership_plans(p_business_id text)`, através de [services/memberships.ts:127–130](services/memberships.ts:127) e [hooks/useMemberships.ts:196–203](hooks/useMemberships.ts:196); definição em `20260905120000_public_club_plans_rpc.sql`.

**Select público direto:** não encontrei select direto nas tabelas de catálogo dentro de `PublicBooking`; a leitura passa pelas RPCs acima. A administração autenticada da galeria usa select direto filtrado por `user_id` em [components/BusinessGalleryManager.tsx:33–46](components/BusinessGalleryManager.tsx:33), mas esse não é o caminho público.

## 4. Ajustes → “Meu site”

- Ajustes não são uma única tela com abas. São páginas em rotas, com menu agrupado por Negócio, Financeiro, Conta e Sistema em [components/SettingsLayout.tsx:13](components/SettingsLayout.tsx:13) e [components/SettingsLayout.tsx:22–30](components/SettingsLayout.tsx:22). O menu lateral/mobile vem de `settingsItemsForRole`: [components/SettingsLayout.tsx:138–147](components/SettingsLayout.tsx:138).
- A lista e os grupos estão em [constants.ts:46–69](constants.ts:46). Uma entrada “Meu site” exigiria item em `SETTINGS_ITEMS` e rota em `App.tsx` dentro do grupo autenticado de Settings, com `OwnerRouteGuard`; veja [App.tsx:286–305](App.tsx:286). Para manter acesso só do proprietário, `settingsItemsForRole` já limita staff a Serviços: [constants.ts:85–93](constants.ts:85).
- A lista de cartões de ajustes para owner fica separada em `OWNER_SETTINGS_CARD_LABELS` em [constants.ts:71–83](constants.ts:71). Se essa lista for usada no ponto de entrada correspondente, também precisaria ser avaliada.
- Há um componente `Tabs` acessível em [components/ui/Tabs.tsx:4–18](components/ui/Tabs.tsx:4), mas não é o padrão estrutural do menu Settings atual.
- Upload existente de identidade visual: [components/BrandIdentitySection.tsx:5–21](components/BrandIdentitySection.tsx:5). Ele recebe previews e callbacks para logo/capa, enquanto [pages/settings/GeneralSettings.tsx:210–217](pages/settings/GeneralSettings.tsx:210) envia arquivos para buckets `logos` e `covers`, obtém URL pública e salva perfil em [pages/settings/GeneralSettings.tsx:219–249](pages/settings/GeneralSettings.tsx:219).
- Upload de galeria é gerido em [components/BusinessGalleryManager.tsx:50–92](components/BusinessGalleryManager.tsx:50): limite de 5 MB, bucket `galleries`, URL pública e insert em `business_galleries`. Não identifiquei um único uploader genérico compartilhado entre esses componentes; há padrões reutilizáveis, mas cada fluxo implementa sua persistência.
- Padrão de salvar em Geral: estado de alteração e status, mutações de perfil/ajustes e rodapé `SaveFooter` em [pages/settings/GeneralSettings.tsx:219–250](pages/settings/GeneralSettings.tsx:219) e [pages/settings/GeneralSettings.tsx:552–556](pages/settings/GeneralSettings.tsx:552). Agendamento também tem `handleSave`: [pages/settings/PublicBookingSettings.tsx:119](pages/settings/PublicBookingSettings.tsx:119).

## 5. Design system, fontes e convenções

- Não encontrei `tailwind.config.*`; o projeto usa Tailwind CSS v4 pelo `@tailwindcss/vite` em `package.json:43–73` e CSS-first config em [styles/tailwind.css:1–9](styles/tailwind.css:1). As cores/fontes Tailwind são definidas via `@theme`.
- Tokens incluem barber/beauty e fontes em [styles/tailwind.css:9–47](styles/tailwind.css:9). Os hex canônicos e especificação do sistema estão em [DESIGN.md:1–60](DESIGN.md:1), com princípios em [DESIGN.md:164–180](DESIGN.md:164). O hook público orienta a usar `override: 'barber' | 'beauty'`: [hooks/useBrutalTheme.ts:1–22](hooks/useBrutalTheme.ts:1).
- `index.html` importa Google Fonts: Chivo 700/900, Inter 400/500/600 e JetBrains Mono 400/500/700 em [index.html:38–43](index.html:38). O CSS define Inter no body em [index.html:58–63](index.html:58).
- Componentes base exportados: `Button`, `Input`, `Select`, `Card`, `Modal`, `Tabs`, `Badge`, `EmptyState`, `Skeleton`, `ErrorState`, `ToastProvider` e `ConfirmModal`: [components/ui/index.ts:1–20](components/ui/index.ts:1). `Button` aceita `forceTheme` e documenta alvos de toque em [components/ui/Button.tsx:8–23](components/ui/Button.tsx:8); `Input` aceita label, erro, dica e `forceTheme` em [components/ui/Input.tsx:4–13](components/ui/Input.tsx:4).
- Convenções relevantes: separação `pages/`, `components/`, `hooks/`, `services/` está documentada em [CLAUDE.md:29–44](CLAUDE.md:29). Rotas lazy, HashRouter, RLS/multi-tenant e regras de tema em [CLAUDE.md:48–80](CLAUDE.md:48); instruções do repo reforçam padrões de implementação e segurança em [AGENTS.md:37–49](AGENTS.md:37) e [AGENTS.md:92–114](AGENTS.md:92).

## 6. Vitest, Playwright e CI

- Vitest usa `jsdom`, `test/setup.ts`, globals e exclui `e2e/`: [vitest.config.ts:7–29](vitest.config.ts:7). Script `npm test` roda `vitest` (watch por padrão); CI usa `npm test -- --run`. Scripts npm: [package.json:7–23](package.json:7).
- Login e Register têm testes unitários em [test/pages/Login.test.tsx:1–86](test/pages/Login.test.tsx:1) e [test/pages/Register.test.tsx:1–180](test/pages/Register.test.tsx:1). A proteção byte-a-byte está em [test/demo/landing.test.tsx:21–25](test/demo/landing.test.tsx:21), via SHA-256 dos dois arquivos `pages/Login.tsx` e `pages/Register.tsx`.
- Playwright principal roda em `e2e/`, Chromium, um worker, `http://localhost:3000`, sem paralelismo; inicia `npm run dev`: [playwright.config.ts:3–17](playwright.config.ts:3) e [playwright.config.ts:46–70](playwright.config.ts:46). Existem configs específicas para jornadas e crítica visual; scripts em [package.json:21–23](package.json:21).
- Exemplo de mock e2e em [e2e/whatsapp-mocks.ts:1–45](e2e/whatsapp-mocks.ts:1): dados fictícios, sessão local simulada, bloqueio de host externo e respostas roteadas para Supabase. O mock instala handlers em [e2e/whatsapp-mocks.ts:69–145](e2e/whatsapp-mocks.ts:69); é referência para montar catálogo público falso sem rede real.
- CI em [.github/workflows/ci.yml:1–57](.github/workflows/ci.yml:1) roda `npm ci`, typecheck, lint, build, Vitest, verificação Deno e cobertura. Em seguida há job Playwright Meta consent para 393px/1280px em [.github/workflows/ci.yml:59–80](.github/workflows/ci.yml:59).
- O workflow de WhatsApp roda validação PostgreSQL/rollback e Playwright desktop/mobile em [.github/workflows/whatsapp-templates.yml:1–36](.github/workflows/whatsapp-templates.yml:1).
- Embora os `AGENTS.md` fornecidos imponham verificações para implementação, esta tarefa foi de mapeamento somente leitura; não executei testes nem comandos de verificação.

## 7. Vercel, CSP e SEO

- [vercel.json:7–18](vercel.json:7) redireciona `/landing` para `/#/landing` e reescreve caminhos não asset para `/index.html`. Isso explica por que uma URL como `/slug` pode retornar a SPA sem que o HashRouter saiba exibir o salão.
- Headers de segurança e CSP são configurados em [vercel.json:20–47](vercel.json:20). A CSP **enforced** em `Content-Security-Policy` explicita `script-src`, `script-src-attr`, `frame-ancestors`, `base-uri` e `object-src`, mas não declara diretivas `font-src` ou `img-src`. A política **Report-Only** declara `font-src 'self' https://fonts.gstatic.com data:` e `img-src 'self' data: blob: https:`; é report-only, portanto não equivale a permissão efetiva imposta pelo header. Imagens externas já são usadas nos catálogos públicos, então a política efetiva merece atenção ao adicionar fontes de imagem.
- O documento base contém título, descrição e OG genéricos em [index.html:10–34](index.html:10). Não encontrei `og:*`, `application/ld+json` nem canonical por estabelecimento em `PublicBooking`; a única alteração dinâmica de título localizada é da landing em [pages/Landing.tsx:114–129](pages/Landing.tsx:114).
- O diagnóstico relata que caminho `/book/teste` entrega o HTML SPA, mas mostra os metadados genéricos. O app não apresenta diretório `api/` nem `middleware.ts` no repositório (busca sem resultados; ausência observada na árvore consultada).
- **SEO/OG por salão:** tags alteradas no React depois de carregar não atendem de forma confiável a crawlers e scrapers que leem o HTML inicial. Para o requisito do PRD, a resposta HTTP em `/<slug>` precisa entregar ou pré-renderizar HTML com título, descrição, OG, canonical e JSON-LD do estabelecimento. Isso exige solução no servidor/borda ou geração estática compatível com os rewrites. O HashRouter e os links `/#/book/:slug` podem continuar em paralelo; a política de reserva de slugs e fallback para estabelecimentos sem Presença são decisões de produto/roteamento ainda abertas.

## 8. Riscos e armadilhas observados

- **SEO não decorre de adicionar uma rota React:** HashRouter, rewrite de SPA e OG genérico não geram HTML indexável próprio por salão.
- **A equipe pública tem contrato explícito de privacidade/vigência:** manter `active = true` e `deleted_at IS NULL`, sem substituir a RPC restrita por select amplo de `team_members`.
- **As consultas públicas usam IDs do perfil como `p_business_id`, enquanto as avaliações recebem `company_id` como texto.** Verificar os tipos e a correspondência de IDs ao agregar dados de site.
- **Campos omitidos nas RPCs não podem ser inferidos como disponíveis:** `get_public_profile_by_slug` retorna a lista allowlisted acima; não inclui cidade/bairro separados, FAQ, texto “sobre”, cor de marca ou configurações de site.
- **`?service=` ainda não existe**; não confundir com `rebook=`. `?pro=` já está ativo e é bom modelo de entrada contextual.
- **A página é grande e tem dependências de fluxo:** `PublicBooking.tsx` tem 2.244 linhas segundo o diagnóstico; extrair agendamento ou usar o bundle inteiro pode afetar desempenho e acoplamento.
- **Tema e estilos dependem de tokens estáticos:** o hook documenta que classes Tailwind dinâmicas como `bg-${color}` não são processadas; use os mapeamentos estáticos existentes: [hooks/useBrutalTheme.ts:5–9](hooks/useBrutalTheme.ts:5).
- **A CSP enforced e a Report-Only diferem:** mudanças em imagens/fontes devem considerar a política que realmente bloqueia conteúdo, além do relatório.
- **Ajustes têm mais de um registro de navegação:** menu `SETTINGS_ITEMS` e lista de cartões `OWNER_SETTINGS_CARD_LABELS`; avaliar ambos para a entrada “Meu site”.
- **O `AGENTS.md` do repositório menciona query de banco sempre por `company_id`;** os catálogos públicos existentes são exceções intencionais via RPC `SECURITY DEFINER` com argumentos explícitos e campos allowlisted. Uma nova RPC precisa manter escopo de tenant, saída mínima e grants controlados.
- **Decisões do PRD ainda em aberto:** slugs reservados, comportamento de links antigos quando Presença ativo, publish versus salvamento direto e redirecionamento de slug antigo. Não são resolvidas pela infraestrutura atual.