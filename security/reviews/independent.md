# Revisão crítica independente

Realizada por três agentes separados, somente leitura. Sem acesso a produção, pagamentos ou envio real. Pareceres recebidos em 18–19/10/2026; consolidação pelo agente principal. Os revisores não editaram as correções. Nota mede o patch no escopo local, não a segurança completa do produto.

| Patch | Revisor | Nota final | Resultado |
|---|---|---|---|
| SEC-01 customer Stripe + compatibilidade SDK | `/root/review_billing` | 9,2/10 | aprovado localmente |
| SEC-04 autorização, HTML e erros de lembrete | `/root/review_reminders` | 9,2/10 | aprovado localmente |
| SEC-05 origens exatas | `/root/review_urls` | 9,5/10 | aprovado localmente |

## SEC-01

Revisor executou novamente checkoutAuthorization 16/16 e billing-cycle exit 0, incluindo prova original, aplicação duplicada, rollback exato de definição/ACL, reaplicação e corrida com um commit/um conflito. Conferiu o contrato Checkout.SessionCreateParams no pacote oficial Stripe 14.21.0; automatic_payment_methods não pertence à Session. A omissão de payment_method_types mantém escolha configurada no Dashboard, sem nova regra de pagamento.

Problemas encontrados durante review: construção antecipada do Stripe com chave vazia podia impedir registro do handler; parâmetro incompatível com SDK passava nos mocks. Ambos receberam teste inicialmente vermelho e correção; revisão repetida aprovou o resultado.

Checklist: setter antigo sem EXECUTE de clientes; novo setter somente service_role, INVOKER, search_path vazio; parâmetros não concedem identidade ao caller; validação de JWT/perfil/metadata antes de efeitos; sem adoção por email; alteração de perfil serializada por PK; sem GRANT/policy ampliados; direto/INSERT/UPSERT bloqueados; erro externo não exposto. Sem regressão de autorização identificada no escopo. SELECT de metadata no Stripe adiciona uma chamada por checkout de customer existente.

Limites: harness parcial, imports/SDKs substituídos em Vitest; sem Deno, GoTrue, PostgREST, webhook ou Stripe test integrado. Metadata ausente em legado bloqueia checkout e exige reconciliação confiável. Publicação Edge/migration precisa ser coordenada; rollback reabre vulnerabilidade. Sessões de checkout não ganharam deduplicação própria.

## SEC-04

Revisor executou 13/13 testes versionados e exercícios adicionais em memória com provider retornando/lançando erros, caracteres HTML/entidades e configurações/métodos. Antes do complemento, demonstrou HTML cru no email fictício e repetição de envio; followup-before.log registra as falhas do template e erro SQL. Encoding/erros foram corrigidos e reavaliados.

Checklist: método → configuração obrigatória → segredo → cliente privilegiado; JWT comum não autoriza; segredo em Authorization/body/query não substitui header; OPTIONS não acessa dados; configuração vazia falha fechada. escapeHtml protege os três nomes. Logs/respostas não carregam email nem erro do provider. Fluxo autorizado preservado com sender exclusivamente mock. Sem alterações em GRANT/RLS e sem novo acesso público.

Limites: duas execuções autorizadas ainda enviam duas vezes no fixture. Schema/joins legados, domínio de exemplo e cron/gateway/Resend permanecem não integrados. Criar segredo forte e exclusivo no backend/scheduler é requisito antes da ativação. Aprovação não cobre entrega real nem idempotência.

## SEC-05

Revisor reproduziu diretamente do HEAD anterior três origens Vercel semelhantes aceitas em cada implementação. Teste focal 21/21; mais 20 asserções independentes em memória cobriram userinfo, portas, downgrade HTTP, Unicode, host com ponto final e normalização. Userinfo antes de host malicioso foi negado. Não encontrou bypass de origem nas duas implementações.

Checklist: successUrl e cancelUrl verificadas antes de Stripe; nenhum caminho alternativo de checkout encontrado no repo; nenhuma alteração de plano, preço, GRANT ou policy; comparação de origem em Set preserva custo. Preview continua possível se explicitamente cadastrado.

Limites: sem Stripe real, navegador integrado ou configuração implantada. Previews que dependiam de substring precisam ser incluídos em CHECKOUT_ALLOWED_ORIGINS. Documentação histórica descreve o contrato antigo e deve ser lida junto desta correção.

## Aprovação geral

Nenhuma correção recebe aprovação de produção por estes pareceres. Na primeira entrega, SEC-02/SEC-03 e permissões amplas do modelo não foram corrigidos nem aprovados. A atualização SEC-02 de 20/10 está registrada separadamente em [sec02.md](sec02.md); SEC-03 continua aberto. Os 16 itens do checklist do usuário foram considerados quando aplicáveis: HTTP/RPCs/DML/lotes/grants/roles/search_path/erros/fluxos/performance/índices/rollback constam acima e nos testes. Não há equivalente HTTP integrado para afirmar que gateway/PostgREST respeitam todos os métodos; isso permanece pendente.
