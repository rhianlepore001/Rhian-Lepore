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
A função é pública porque PageView e Lead precedem o login (`verify_jwt = false`).
A origem, o consentimento declarado, o corpo, as rotas e os eventos são validados pelo handler.
Origem e consentimento no payload não constituem autenticação nem prova criptográfica de consentimento.

O código usa Graph API v25.0. Revise a versão no ciclo de manutenção da integração.

## Comportamento

- A landing/entrada existente neste repositório é `/#/login`; não há outra landing separada.
- PageView somente em `/#/login` e cadastro de nova conta `/#/register`.
  Alterações de rota do HashRouter geram novo evento; render duplicado do StrictMode não.
- Convites com `company` ou `member`, qualquer rota autenticada,
  onboarding e páginas públicas de clientes ficam excluídos.
- Lead na abertura do cadastro com consentimento; o primeiro submit é uma proteção adicional,
  sem duplicar o evento da abertura.
- CompleteRegistration após `supabase.auth.signUp` confirmar um novo usuário,
  inclusive quando o e-mail precisa de confirmação. Não depende do envio do formulário ou do
  redirecionamento. Erro, usuário ausente, identidades vazias/e-mail existente e vínculo de
  colaborador não contam. Se a conta foi criada, uma falha posterior no perfil/onboarding
  não desfaz esse fato.
- O contexto de rastreamento é capturado antes da chamada Auth para suportar a mudança de
  sessão durante o cadastro. O consentimento é conferido novamente no envio.
- O navegador e a CAPI compartilham `event_name` e `event_id` (UUID) para deduplicação.
- URLs enviadas pela CAPI contêm apenas origem, caminho e rota; sem query de cadastro,
  tokens de convite, senha, nome ou informações do negócio.
- E-mail normalizado e telefone internacional são convertidos para SHA-256 no servidor.
  IP vem do cabeçalho de encaminhamento do gateway; user agent vem da requisição.
  Nome, senha e dados operacionais não são enviados.
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
   Sirva a função localmente com a configuração pública de `supabase/config.toml`.
   Antes de usar o CLI instalado, consulte `supabase functions serve --help`.
   O frontend deve apontar para esse mesmo Supabase, com suas chaves públicas locais.
   Não execute deploy para realizar esta revisão.
3. Inicie o Vite com o mesmo Pixel ID e abra `/#/login` em navegador limpo.
   Antes da escolha e após Recusar, a aba Network não deve mostrar fbevents.js,
   facebook.com/tr nem meta-capi.
4. Abra Preferências de cookies e aceite. Confirme PageView. Navegue pelo próprio app
   ao cadastro: confirme novo PageView e um Lead, sem duplicação ao enviar o formulário.
5. Envie um cadastro inválido ou com e-mail já existente: nenhum CompleteRegistration.
   Crie uma nova conta de teste com dados de teste: somente após o Auth confirmar o usuário
   deve aparecer CompleteRegistration. Não use dados pessoais reais.
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

Rate limit básico de 30 requisições por IP por minuto, em memória por instância aquecida,
com limite de 10 mil chaves e expiração. Reinício e outras instâncias têm contadores próprios.
O gateway Supabase precisa fornecer um cabeçalho de IP confiável; não exponha o handler
diretamente sem sanitizar esse cabeçalho. Para tráfego maior, substituir por contador
compartilhado/gateway antes de escalar.

Payload limitado a 8 KiB inclusive em streaming; nomes/rotas/UUID/data/contatos/origem
validados. Timeout Graph de 5 s. Erros externos são genéricos, sem logar token ou contatos.
Sem fila nem retry automático: uma falha de rede pode perder o evento, sem bloquear cadastro.

O consentimento é uma preferência do navegador, não um cadastro de prova de consentimento no
banco. Hash SHA-256 é pseudonimização, não anonimização. O texto de privacidade descreve
o compartilhamento e o potencial processamento internacional.
