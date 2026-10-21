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

- A landing/entrada existente neste repositório é `/#/login`; não há outra landing separada.
- PageView somente em `/#/login` e cadastro de nova conta `/#/register`.
  Alterações de rota do HashRouter geram novo evento; render duplicado do StrictMode não.
- Convites com `company` ou `member`, qualquer rota autenticada,
  onboarding e páginas públicas de clientes ficam excluídos.
- Lead somente no início do envio do formulário com consentimento, uma vez por visita ao
  cadastro. Abrir a página não gera Lead.
- CompleteRegistration somente após o fluxo inteiro retornar sucesso: Auth, criação/garantia
  de empresa e perfil e configuração de onboarding. Exige `authData.user.identities?.length > 0`.
  Erro em qualquer etapa, identidade ausente/vazia, e-mail existente e vínculo de colaborador
  não geram o evento. Não há evento em sucesso parcial.
- O contexto de rastreamento é capturado antes da chamada Auth para suportar a mudança de
  sessão durante o cadastro. Consentimento e URL atual são conferidos novamente no envio.
  Se sair do cadastro enquanto o backend está pendente, o evento tardio é descartado
  no navegador e na CAPI, mesmo que o usuário retorne depois.
- O navegador e a CAPI compartilham `event_name` e `event_id` (UUID) para deduplicação.
- `event_source_url` da CAPI contém apenas origem, caminho e rota permitida, sem query de
  anúncio ou de cadastro; o contexto capturado pelo tracker segue a mesma URL sanitizada.
- E-mail normalizado e telefone internacional são convertidos para SHA-256 no servidor.
  IP vem do cabeçalho de encaminhamento do gateway; user agent vem da requisição.
  `_fbp` e `_fbc` são enviados sem hash quando os cookies existem após consentimento.
  Se `_fbc` não existir e a URL tiver `fbclid`, o app gera `fb.1.<timestamp ms>.<fbclid>`.
  O servidor aceita esses identificadores somente no formato `fb.<n>.<timestamp>.<id>`
  e com até 256 caracteres. Nome, senha e dados operacionais não são enviados.
- `fbq.disablePushState = true` e `fbq.allowDuplicatePageViews = true` são definidos antes
  do init e da inserção do script. PageViews são explícitos e deduplicados pelo app.
  O script só é inserido em /login e /register com consentimento. A URL real do documento
  é validada novamente a cada chamada: queries desconhecidas, tokens, convites e caminhos
  públicos/privados impedem o envio. Somente `type=barber|beauty` é aceito no cadastro.
  Na query externa ao hash, são permitidos apenas `fbclid`, `utm_source`, `utm_medium`,
  `utm_campaign`, `utm_content` e `utm_term`; qualquer outro parâmetro bloqueia rastreamento.
  Ao sair, a fila é esvaziada no próprio array, chamadas tardias são descartadas e o elemento
  script é removido.
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
   ao cadastro: confirme novo PageView e nenhum Lead até iniciar o envio. O primeiro envio
   gera um Lead; tentativas repetidas na mesma visita não duplicam o evento.
5. Envie um cadastro inválido ou com e-mail já existente: nenhum CompleteRegistration.
   Crie uma nova conta de teste com dados de teste: CompleteRegistration só aparece após
   Auth, empresa/perfil e onboarding concluírem com sucesso, com identidades não vazias. Não use dados pessoais reais.
6. Em Test Events, inspecione navegador/servidor. Os pares precisam compartilhar nome
   e ID do evento e aparecer como deduplicados. O código de teste pertence ao corpo CAPI,
   não ao frontend. A ferramenta de teste do navegador/Meta Pixel Helper pode ajudar a
   inspecionar a origem Browser.
7. Entre no painel e abra páginas `/#/book/...` e demais páginas de clientes:
   nenhum evento adicional. Volte à Política de Privacidade, recuse e repita o fluxo:
   nenhum novo envio. Recarregue para conferir a persistência.
8. Remova `META_TEST_EVENT_CODE` ao concluir a validação do ambiente de teste.

Não foi feito deploy nem configuração de secrets como parte deste PR.

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
