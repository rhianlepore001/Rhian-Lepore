# Meta Pixel e API de Conversões

Implementação proposta em draft, sem deploy e sem alterações remotas no Supabase.

## Configuração

Frontend: definir apenas `VITE_META_PIXEL_ID` junto às variáveis públicas Supabase existentes.
Vazio desativa tanto o carregamento do Pixel quanto os envios CAPI pelo app.

Secrets da Edge Function `meta-capi`:

| Nome | Uso |
| --- | --- |
| `META_PIXEL_ID` | Mesmo ID público configurado no frontend |
| `META_CAPI_TOKEN` | Token da API de Conversões, exclusivamente no servidor |
| `META_ALLOWED_ORIGINS` | Origens exatas separadas por vírgula, sem barra final, inclusive esquema e porta |
| `META_TEST_EVENT_CODE` | Opcional, código temporário da aba Testar eventos |

Sem ID/token/origem permitida a função falha fechada. Nenhum desses secrets usa prefixo `VITE_`.
A função precisa aceitar chamadas anteriores ao login (`verify_jwt = false`).
Para servir localmente, consulte `supabase functions serve --help` e use
`--no-verify-jwt` com um arquivo de secrets local não versionado.
Nenhuma configuração global `supabase/config.toml` é adicionada por este PR.
A origem, o consentimento declarado, o corpo, as rotas e os eventos são validados pelo handler.
Origem e consentimento no payload não constituem autenticação nem prova criptográfica de consentimento.

O código usa Graph API v25.0. Revise a versão no ciclo de manutenção da integração.

## Comportamento

- A landing/entrada existente neste repositório é `/#/login` (`/` redireciona para ela);
  não há outra landing separada.
- PageView nas rotas públicas de aquisição: `/#/login`, `/#/register`, `/#/termos` e
  `/#/privacidade`, uma vez por troca de rota do HashRouter (mudança só de query na mesma
  rota e render duplicado do StrictMode não repetem). Só sem sessão e com consentimento.
- Ficam de fora, de propósito: rotas autenticadas do app (URLs com ids de clientes/agenda),
  `/update-password` (tokens), `/forgot-password`, convites com `company` ou
  `member` e páginas públicas dos clientes dos salões (`/book`, `/queue`, `/pro`,
  `/minha-area`, `/clube`), que carregam slugs/ids de terceiros.
- Lead somente depois que o servidor cria a conta de dono (`signUp` sem erro e com
  `identities` não vazio), uma vez por visita. Abrir a página, enviar o formulário ou
  falhar na validação/Auth não geram Lead. E-mail já existente e convites de colaborador
  não geram Lead.
- CompleteRegistration somente após o fluxo inteiro retornar sucesso: Auth, criação/garantia
  de empresa e perfil e configuração de onboarding. Exige `authData.user.identities?.length > 0`.
  Erro em qualquer etapa, identidade ausente/vazia, e-mail existente e vínculo de colaborador
  não geram o evento. Lead e CompleteRegistration são eventos distintos, com `event_id`
  próprios, e cada um conta uma vez por cadastro; escolha só um deles como evento de
  otimização na campanha.
- O contexto de rastreamento é capturado antes da chamada Auth para suportar a mudança de
  sessão durante o cadastro. Consentimento e URL atual são conferidos novamente no envio.
  Se sair do cadastro enquanto o backend está pendente, o evento tardio é descartado
  no navegador e na CAPI, mesmo que o usuário retorne depois.
- O navegador e a CAPI compartilham `event_name` e `event_id` (UUID) para deduplicação.
- `event_source_url` da CAPI contém apenas origem, caminho e rota permitida, sem query de
  anúncio, de cadastro ou do hash; o contexto capturado pelo tracker segue a mesma URL sanitizada.
- E-mail normalizado, telefone internacional e `external_id` (id do usuário, conhecido só em
  Lead/CompleteRegistration) são convertidos para SHA-256 no servidor.
  IP vem do cabeçalho de encaminhamento do gateway; user agent vem da requisição.
  `_fbp` e `_fbc` são enviados sem hash quando os cookies existem após consentimento.
  Se `_fbc` não existir e a URL tiver `fbclid`, o app gera `fb.1.<timestamp ms>.<fbclid>`
  e grava o cookie `_fbc` (90 dias, `SameSite=Lax`) para manter o mesmo valor nos eventos
  seguintes. Nenhum cookie é gravado sem consentimento.
  O servidor aceita esses identificadores somente no formato `fb.<n>.<timestamp>.<id>`
  e com até 256 caracteres. Nome, senha e dados operacionais não são enviados.
- `fbq.disablePushState = true` e `fbq.allowDuplicatePageViews = true` são definidos antes
  do init e da inserção do script. PageViews são explícitos e deduplicados pelo app.
  O script só é inserido nas rotas públicas acima, com consentimento. O Pixel envia a URL
  inteira do documento (`dl`), por isso a URL real é validada novamente a cada chamada.
  Parâmetros de query desconhecidos (`utm_id`, `ad_id`, `campaign_id`, `adset_id`,
  `placement`, `site_source_name`, `ref`, `gclid`...) **não** bloqueiam o rastreamento.
  Bloqueiam: nomes sensíveis (`token`, `access_token`, `refresh_token`, `token_hash`, `code`,
  `state`, `password`, `senha`, `email`, `phone`, `cpf`, `session`, `key`, `error*`, `fluxo`,
  `company`, `member`, `invite`, `next`, `redirect*`...), `type` diferente de `barber|beauty`
  (ex.: `type=recovery`), valores que parecem e-mail, JWT, caminho interno (`/...`, `#`) ou
  maiores que 200 caracteres, e um segundo `#` no hash (`#/x#access_token=...`).
  A mesma regra vale para a query externa ao hash e para a query dentro do hash.
  Ao sair, a fila é esvaziada no próprio array, chamadas tardias são descartadas e o elemento
  script é removido.
## Eventos de remarketing

Tudo abaixo exige consentimento, usa o mesmo `event_id` (UUID v4) no navegador e na CAPI
e dispara no máximo uma vez por visita (aba), exceto onde indicado. Os disparos são passivos:
não alteram telas, formulários, navegação nem o banco.

| Página | Evento | Tipo | Parâmetros |
| --- | --- | --- | --- |
| `/#/login` (landing) | `PageView` | padrão | |
| `/#/login` | `ViewContent` | padrão | `content_category` = nicho escolhido (`barber`/`beauty`...), `content_name=landing` |
| `/#/login` | `Scroll75` | custom | 75% da página (só se a página rola) |
| `/#/login` | `TimeOnPage30s` | custom | 30 s com a aba visível |
| `/#/login` | `CTAClick` | custom | `cta_id` = `free_trial_gateway` ou `free_trial_login` (um por `cta_id`) |
| `/#/register` | `PageView` | padrão | |
| `/#/register` | `StartRegistration` | custom | primeiro foco/digitação feito por pessoa em campo do formulário |
| `/#/register` | `Lead`, `CompleteRegistration` | padrão | já existiam; agora também enviam nome/sobrenome/país |
| `/#/termos`, `/#/privacidade` | `PageView` | padrão | |
| `/#/onboarding-wizard` (logado, dono) | `OnboardingStep` | custom | `step` 1..6, `total_steps` |

- `StartTrial` não existe: o teste grátis começa no cadastro, já marcado por `CompleteRegistration`
  (evento de otimização recomendado). `OnboardingStep` mede ativação.
- `InitiateCheckout` não é usado (não há checkout no cadastro).
- Não há páginas separadas de home/preços no `main`; para incluir uma nova página de marketing,
  adicione a rota em `META_PUBLIC_PATHS` (`lib/metaTracking.ts`) e em `EVENT_ROUTES` da Edge Function.
- `OnboardingStep` usa o mesmo escopo transitório de `CompleteRegistration`: com consentimento,
  carrega o Pixel, envia e revoga o consentimento em seguida. Nenhum outro evento sai de rotas
  autenticadas.
- `custom_data` só aceita tokens `[a-z][a-z0-9_-]{0,31}` e inteiros 1..20; qualquer outra coisa é
  ignorada no navegador e rejeitada (400) na CAPI.

### Advanced Matching

`em`, `ph`, `fn`, `ln`, `ct`, `country` e `external_id` são normalizados conforme as regras da Meta
e enviados em SHA-256: na CAPI (hash no servidor, `user_data` recebido do navegador apenas por HTTPS
para a nossa função) e no `fbq('init')` (hash no navegador, `lib/sha256.ts`, só junto de um evento com
consentimento). Só `Lead`, `CompleteRegistration` e `OnboardingStep` carregam esses dados
(PageView e eventos de landing, não). Cidade (`ct`) e data de nascimento não são coletadas hoje; `ct` é
suportado pela cadeia mas só será enviado se o cadastro passar a coletar a cidade.
`first_name`/`last_name` vêm de `full_name` (primeira e última palavra).

### Ordem de publicação

1. Publicar (deploy) a Edge Function `meta-capi` **antes** do frontend. A versão antiga rejeita com 400
   os novos eventos e o `user_data` estendido de Lead/CompleteRegistration (eventos CAPI perdidos).
2. Publicar o frontend.

- Autoconfiguração do Pixel é desativada. **Desative também os eventos automáticos e
  regras criadas na ferramenta de configuração de eventos no Gerenciador de Eventos**,
  para manter somente os eventos explícitos desta integração.
- Sem consentimento prévio não existe script, beacon noscript nem chamada CAPI.
  Aceitar/recusar fica salvo neste navegador por 180 dias. Preferências podem ser revistas
  nas páginas de entrada/cadastro e em Privacidade/Termos.
- Recusar/revogar interrompe próximos envios, aborta requisições pendentes quando possível
  e remove os cookies Meta acessíveis no domínio. Não desfaz o que já foi enviado.
  Requisições concluídas antes da revogação não podem ser recuperadas.

## Testar sem publicar

As verificações automatizadas usam stubs de Meta/Supabase, não criam contas nem enviam dados reais.

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm test -- --run
npx playwright install chromium
npx playwright test --config e2e/meta-pixel.config.ts
```

Os prints 393×852 e 1280×900 ficam anexados ao relatório Playwright e no artefato
`meta-banner-393-1280` do CI. Nenhuma conta de produção é necessária.
Para a checagem Deno: `deno check --config supabase/functions/meta-capi/deno.json supabase/functions/meta-capi/index.ts`.

## Test Events (manual, ambiente de teste)

Estes passos são instruções para validação futura; não foram executados em produção neste PR.

1. No Gerenciador de Eventos da Meta, selecione a fonte de dados correspondente ao Pixel
   e abra **Testar eventos / Test Events**. Copie o código de teste da seção de servidor.
2. Em um Supabase local ou de desenvolvimento, configure os secrets acima, incluindo
   `META_TEST_EVENT_CODE`. Para desenvolvimento local, use uma origem como
   `http://localhost:3000` em `META_ALLOWED_ORIGINS`.
   Antes de usar o CLI instalado, consulte `supabase functions serve --help`.
   Sirva somente esta função com `--no-verify-jwt` e seus secrets locais.
   O projeto local pode usar a configuração gerada pelo próprio CLI; este PR não adiciona
   nem altera configuração global do Supabase.
   O frontend deve apontar para esse mesmo Supabase, com suas chaves públicas locais.
   Não execute deploy para realizar esta revisão.
3. Inicie o Vite com o mesmo Pixel ID e abra `/#/login` em navegador limpo.
   Antes da escolha e após Recusar, a aba Network não deve mostrar fbevents.js,
   facebook.com/tr nem meta-capi.
4. Abra Preferências de cookies e aceite. Confirme PageView. Navegue pelo próprio app
   ao cadastro, aos Termos e à Privacidade: um PageView por troca de rota e nenhum Lead.
   Teste também `/?utm_id=1&ad_id=2&fbclid=teste#/login`: o PageView deve sair normalmente.
   Enviar o formulário com erro de validação não gera Lead; o Lead só sai quando a conta de
   teste é criada, uma vez por visita.
5. Envie um cadastro inválido ou com e-mail já existente: nenhum CompleteRegistration.
   Crie uma nova conta de teste com dados de teste: CompleteRegistration só aparece após
   Auth, empresa/perfil e onboarding concluírem com sucesso, com identidades não vazias. Não use dados pessoais reais.
6. Em Test Events, inspecione navegador/servidor. Os pares precisam compartilhar nome
   e ID do evento e aparecer como deduplicados. O código de teste pertence ao corpo CAPI,
   não ao frontend. A ferramenta de teste do navegador/Meta Pixel Helper pode ajudar a
   inspecionar a origem Browser.
7. Entre no painel (nenhum PageView dentro do app autenticado) e abra páginas `/#/book/...` e demais páginas de clientes:
   nenhum evento adicional. Volte à Política de Privacidade, recuse e repita o fluxo:
   nenhum novo envio. Recarregue para conferir a persistência.
8. Remova `META_TEST_EVENT_CODE` ao concluir a validação do ambiente de teste.

Não foi feito deploy nem configuração de secrets como parte deste PR.

Ordem de publicação: faça o deploy da Edge Function `meta-capi` **antes** de publicar o
frontend. O frontend novo envia `external_id` e PageView em `#/termos`/`#/privacidade`, que a
versão antiga da função rejeita com 400 (o Pixel do navegador continuaria funcionando, mas a
CAPI perderia esses eventos).

## Limites operacionais

Rate limit básico de 30 requisições por IP por minuto, em memória **por isolate** aquecido,
com limite de 10 mil chaves e expiração. Reinícios e outros isolates têm contadores próprios;
não existe limite global compartilhado entre instâncias.
O gateway Supabase precisa fornecer um cabeçalho de IP confiável; não exponha o handler
diretamente sem sanitizar esse cabeçalho. Para tráfego maior, substituir por contador
compartilhado/gateway antes de escalar.

Payload limitado a 8 KiB inclusive em streaming; nomes/rotas/UUID/data/contatos/origem
validados. Timeout Graph de 5 s. Erros externos são genéricos, sem logar token ou contatos.
Sem fila nem retry automático: uma falha de rede pode perder o evento, sem bloquear cadastro.

O consentimento é uma preferência do navegador, não um cadastro de prova de consentimento no
banco. Hash SHA-256 é pseudonimização, não anonimização. O texto de privacidade descreve
o compartilhamento e o potencial processamento internacional.
