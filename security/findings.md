# Resultados da auditoria preventiva

Base: `f371508`, execução em 2026-10-18/19. Evidência exclusivamente local. Resultados finais em `tests/results.md` e `reviews/independent.md`. Nenhuma exploração ou configuração de produção foi verificada. CVSS é estimativa do cenário descrito, não uma medição de exposição implantada.

## 1. Problemas confirmados

### SEC-01 — Cliente escolhe vínculo de customer Stripe

- Severidade: alta para integridade de billing. CVSS 3.1: 6.5 (`CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N`). Não há prova de cobrança, tomada de conta Stripe ou ativação indevida de plano.
- Componente/perfil: RPC de billing, proprietário B autenticado com perfil sem customer. Pré-condição: migration de proteção de billing presente.
- Causa: função DEFINER recebe customer arbitrário do cliente e grava como postgres. Regex `cus_*` valida formato, não propriedade. A Edge Function também reaproveita customer por email sem validar metadata.
- Fonte: `supabase/migrations/20261013103427_protect_profile_billing.sql:76`, função `set_stripe_customer_id_for_caller`; `supabase/functions/create-checkout-session/index.ts:112`, bloco de resolução do customer.
- Validação: `PGBIN=... bash security/tests/local-postgres.sh billing-cycle`; teste inicial falha com `BILLING_CLIENT_CAN_BIND_CUSTOMER`. Grants e corpo reais carregados no PostgreSQL 17.11; `billing-original-behavior.sql` também executa o setter e confirma gravação de customer arbitrário fictício. Testes do handler usam Stripe/clientes inteiramente substituídos, sem rede.
- Observado: authenticated possui EXECUTE da RPC; o corpo recebe e grava identificador externo. Esperado: apenas backend confiável vincula customer ao dono autenticado depois de verificar metadata; vínculo existente diferente nunca é substituído.
- Impacto: associação de cadastro a customer indevido e uso desse customer em checkout; inconsistência entre tenants e faturamento.
- Correção implementada: migration `20261018190300_server_owned_stripe_customer.sql:4` revoga setter antigo; nova RPC INVOKER somente service_role, alvo dono, search_path vazio, bloqueio por linha/idempotência/conflito. Edge valida JWT/perfil/metadata, sem adoção por email. Sem alteração de plano/status/preço. Critérios de aceite e impacto em `migrations/README.md`.
- Risco da correção: exige configurar backend service role somente na Edge e publicar migration/Edge coordenadamente; checkout antigo deve falhar fechado até atualização. Rollback reabre comportamento inseguro e não deve ser aplicado isoladamente em produção.
- Status: corrigido e aprovado no escopo local, revisão independente 9,2/10. Handler 16/16; aplicar/testar/reverter/testar/reaplicar/testar e concorrência aprovados. Publicação e teste integrado pendentes.

### SEC-02 — RPC pública revela e altera PII por telefone sem prova de posse

- Severidade: crítica no contrato de API reproduzido. CVSS 3.1: 9.1 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N`), estimando acesso/alteração repetida de PII; escopo remoto não verificado.
- Componente/perfil: `public_clients`; visitante. Pré-condições: conhecer estabelecimento e telefone/sufixo de oito dígitos, sem sessão ou OTP.
- Fonte: `supabase/migrations/20261013103422_public_clients_anon_lockdown.sql:55`, `get_public_client_by_phone`, e linha 98, `upsert_public_client`; `phones_match` em `20260613_security_s2_public_rls.sql`; frontend em `contexts/PublicClientContext.tsx`.
- Procedimento/evidência anterior: `local-postgres.sh residual-privacy` reproduz o contrato histórico, antes desta correção. O gate atual é `PGBIN=... bash security/tests/private-booking-cycle.sh`: teste inicial vermelho para leitura por telefone, sobrescrita e endpoint privado ausente; aplicar 2x, testar, reverter, testar e reaplicar.
- Observado antes: nome/email/telefone retornados sem prova de posse; upsert altera cadastro por telefone. Esperado: nenhum dado canônico lido por telefone, CRM existente imutável, acesso ao pedido somente com token correto.
- Causa/impacto: DEFINER ignorava RLS e tratava telefone/sufixo como identidade; permitia exposição e alteração de PII. Fechar tabela direta ou exigir telefone completo não resolve a causa.
- Correção implementada: migration `20261020122744_private_booking_access.sql`, wrappers `create_public_booking_private`, `get_public_booking_with_token`, `update_public_booking_with_token`, `cancel_public_booking_with_token`; ACLs legadas revogadas para PUBLIC/anon/authenticated. Hash SHA-256 privada, 244 bits de entropia, expiração de 30 dias ou horário + 7 dias, o que ocorrer por último. Sem OTP/conta. Frontend não consulta nem preenche por telefone; mostra link copiável por pedido. Upsert/mirror/aceite/materialização não sobrescrevem CRM existente; diferenças ficam no pedido.
- Fonte da correção: migration oficial e rollback em `docs/rollbacks/20261020122744_private_booking_access.rollback.sql`; `services/publicBooking.ts` (submit/read/edit/cancel), `pages/PublicBooking.tsx` (formulário/confirmação), `pages/PrivateBookingArea.tsx`, `components/ClientBookingCard.tsx`. Tokens redigidos em `utils/Logger.ts` e `lib/bugReport.ts`.
- Evidência reproduzível: `security/attacks/private-booking-privacy.sql`, `public-client-preservation.sql`, três suítes `supabase/tests/private_booking_*.test.sql` e quatro arquivos Vitest SEC-02. Testes de token incorreto/ausente/expirado/outro ID, leitura/edição/cancelamento, CRM apenas no interno, manual/automático, Realtime e atomicidade passaram. Definições e permissões restauradas no rollback, depois correção reaplicada.
- Risco da correção: frontend antigo incompatível com revokes; pedidos legados sem link e links perdidos precisam do estabelecimento. Lookup de assinatura e recuperação de fila apenas por telefone bloqueados; portal informa a restrição. Não foi implementada nova identidade de Clube/Fila, nem alterada política de senha, preço ou plano. Rollback reabre vulnerabilidades antigas.
- Status: **corrigido/aprovado localmente no escopo de cadastro/booking solicitado em 20/10**, revisões independentes SQL 9,1 e frontend 9,2. **SEC-02 global parcialmente mitigado**: criação/benefícios de Clube e outros acessos de Fila ainda exigem investigação própria; não há aprovação de produção. Critérios, limites e checklist em [reviews/sec02.md](reviews/sec02.md).

### SEC-03 — Colaborador desativado conserva autorização de tenant

- Severidade: alta. CVSS 3.1: 6.5 (`CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N`), impacto comprovado localmente restrito à leitura de clientes.
- Componente/perfil: helpers e RLS; colaborador A com identidade emitida antes de `active=false`, perfil ainda vinculado.
- Fonte: `get_auth_company_id`/`get_auth_role` em `supabase/migrations/20260918190000_p0_public_booking_staff_atomicity.sql:14`; policy `public_clients_tenant_select` em `20261013103422_public_clients_anon_lockdown.sql`.
- Evidência: `residual-privacy.sql` insere staff com active=false e comprova SELECT do cliente A. Não é teste de revogação criptográfica de JWT: simula sub/role aceitos pelo banco e testa autorização com associação desativada.
- Observado: helper resolve a empresa pelo perfil sem checar vínculo ativo. Esperado: desativação bloqueia operações dependentes da associação, mesmo com JWT anterior.
- Causa/impacto: associação em profiles continua sendo autoridade, independentemente de team_members. Policies legadas também podem ler profiles diretamente; mudar apenas o helper pode deixar caminhos alternativos.
- Proposta: gate de membro ativo em todos os caminhos de autorização, auditoria das policies alternativas e RPCs e testes com catálogo de staging fiel. Sessão de owner não deve depender de registro de equipe.
- Risco: mudança transversal de RLS, dependências cíclicas e fallback para auth.uid em RPCs; não aplicar patch parcial nem afirmar cobertura global usando harness mínimo.
- Status: aberto; controle atual reproduzido, correção transversal depende de catálogo local fiel e regressão adicional.

### SEC-04 — Lembrete global usa service role sem autorização do caller

- Severidade: alta. CVSS 3.1: 6.5 (`CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N`) considerando gateway que exige JWT de usuário. Se gateway desativado, o alcance pode ser maior; configuração implantada desconhecida.
- Fonte: `supabase/functions/send-appointment-reminder/index.ts`, handler antes de createClient.
- Perfil/pré-condições: visitante ou usuário comum chega ao handler; configuração necessária de envio/tabelas. O fixture usa conjunto vazio para testar a barreira de autorização, sem envio.
- Validação: `edgeAuthorization.test.ts` transpila o handler real e substitui exclusivamente imports/serviços. Antes, caller sem credencial/com JWT comum recebe 200 e o cliente privilegiado é criado; asserções de 401/405 falham por status, não por erro de harness.
- Esperado: credencial exclusiva de job e método POST verificados antes de consultar dados com service role/enviar. Falta de configuração deve impedir execução.
- Causa/impacto: validade de JWT não autoriza disparo global. Handler também interpola campos em HTML e não marca envios idempotentes; esses caminhos exigem fixtures adicionais.
- Correção implementada: segredo de job obrigatório, autorização local fail-closed e restrição de método em `send-appointment-reminder/index.ts:27`; codificação HTML e erros genéricos relacionados em SEC-06. Sem scheduler/env configurados, handler falha fechado. Aceite: nenhuma consulta/envio em chamada não autorizada; POST autorizado preservado com sender mock.
- Risco: cron anterior precisa ser atualizado pelo operador antes de ativação; schema de lembretes parece legado e não será reinventado nesta correção. Não haverá envio real para validar.
- Status: corrigido/aprovado localmente (13/13 testes do handler; review 9,2/10). Não aprovado como job integrado de produção. Idempotência de envio permanece pendente de contrato/tabela.

### SEC-05 — Origem Vercel não autorizada aceita no checkout

- Severidade: média. CVSS 3.1: 4.6 (`CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:U/C:L/I:L/A:N`). O alvo comprovado é a validação de retorno; não houve criação de sessão Stripe real.
- Perfil/pré-condições: usuário autenticado envia successUrl/cancelUrl de domínio Vercel próprio cujo nome contém o texto do projeto; vítima utiliza o link resultante.
- Fonte: `utils/checkoutAllowlist.ts:57`, `isAllowedReturnUrl`; cópia na Edge em `supabase/functions/create-checkout-session/allowlist.ts:50`.
- Procedimento: `checkoutOrigins.test.ts`, duas implementações, fixtures de domínios semelhantes. Seis asserções falham antes: três domínios não configurados são aceitos em cada implementação.
- Observado: substring do nome do projeto é tratada como propriedade de domínio. Esperado: origens exatas explicitamente permitidas.
- Impacto/causa: retorno do pagamento para site controlado por terceiro; phishing e potencial exposição de parâmetros da URL.
- Correção implementada: removida exceção ampla nas duas allowlists; preview exato em `CHECKOUT_ALLOWED_ORIGINS`. Origens oficiais/localhost preservadas. Aceite: origem semelhante negada, origem exata permitida em ambas as implementações.
- Risco: previews que dependiam da exceção precisarão de configuração explícita. Atualizar o teste anterior que sancionava a exceção, preservando o preview quando configurado.
- Status: corrigido/aprovado localmente; 21/21 testes focais, review 9,5/10 e 20 asserções independentes adicionais. Nenhuma sessão Stripe real criada.

### SEC-06 — Conteúdo externo interpolado em HTML de lembrete e erros internos expostos

- Severidade: média para injeção de marcação e exposição de detalhes; CVSS não atribuído, pois não foi testada execução em cliente de email real.
- Componente/perfil: template e tratamento de erro do job; cliente fictício com nome contendo marcação, job autorizado no fixture.
- Pré-condições: job executado para registro contendo campos externos; erro de consulta/provider para o segundo caminho.
- Procedimento: `edgeAuthorization.test.ts` fornece nome `<img...>`, serviço `<a...>` e nome de negócio com tags, além de erro fictício. Antes do complemento, falhou a asserção que proibia HTML cru e a que proibia detalhe privado. Revisão independente reproduziu o template cru.
- Observado antes: campos viravam marcação no HTML enviado ao sender mock e erro SQL era devolvido ao caller. Esperado: nomes como texto e resposta/log sem PII ou detalhes internos.
- Causa/impacto: interpolação direta em template string e retorno de error.message; possível conteúdo enganoso em lembrete e divulgação de detalhes. Não foi comprovado XSS em email real.
- Fonte: `supabase/functions/send-appointment-reminder/index.ts:21`, campos codificados no loop e catch ao final. Não há policy/RPC associada; Edge usa cliente privilegiado somente após guard SEC-04.
- Correção implementada: encode de `& < > " '` nos três nomes; erro genérico e log sem email/objeto externo. Risco baixo; entidades já existentes passam a aparecer como texto literal, comportamento esperado para nomes.
- Critério/teste: sender mock chamado uma vez no fluxo autorizado, tags codificadas, query error não exposto; 13/13 da suíte e exercícios adicionais do revisor passaram.
- Status: corrigido/aprovado localmente, review 9,2/10 conjunto com SEC-04. Idempotência/entrega e schema continuam pendentes.

### Q-01 — Parâmetro incompatível com o contrato de Checkout Session

- Severidade: média de confiabilidade; CVSS não aplicável. Não é vulnerabilidade de pagamento confirmada.
- Componente/perfil: Edge de checkout, proprietário autorizado; dependência Stripe 14.21.0 declarada no deno.json, API 2023-10-16.
- Evidência: pacote oficial local, `types/Checkout/SessionsResource.d.ts`: SessionCreateParams não tem automatic_payment_methods. O handler o enviava e os mocks não denunciavam esse desvio. Teste suplementar inicialmente vermelho exige ausência do campo. Não foi feita requisição para afirmar uma resposta específica da API Stripe.
- Causa/impacto: parâmetro de outro contrato usado em Session e Edge fora do typecheck principal. Pode impedir checkout integrado apesar de build verde.
- Correção: remover campo e manter payment_method_types omitido (configuração de métodos no Dashboard, conforme documentação do SDK). Stripe também passou a ser construído depois do guard para chave ausente retornar 503 sem impedir registro do handler.
- Fonte: `supabase/functions/create-checkout-session/index.ts:109`, construção do SDK, e linha 136, payload checkout.sessions.create; teste `checkoutAuthorization.test.ts`.
- Aceite: sem parâmetro incompatível, chave ausente retorna 503 sem construtor, fluxos autorizados e preços preservados. Risco baixo, sem alteração de método/plano/preço no produto.
- Status: corrigido no código e aprovado no review 9,2/10; 16/16 testes. Deno/Stripe test integrado pendentes.

## 2. Pontos que exigem investigação

- **I-01: policies ALL de equipe/financeiro — prioridade alta.** Fontes `20260307_us015b_multi_user_rls.sql` concedem ALL por tenant. Não há DROP dessas duas policies no histórico identificado. `tenant-matrix.sql` aplica expressões reais com esquema mínimo e comprova que staff pode alterar comissão/financeiro nesse modelo. Não replica todos os triggers: resultado confirmado no modelo de fonte, comportamento do schema implantado ainda não verificado. Necessário catálogo efetivo em cópia de teste antes de patch transversal. Policies restritivas isoladas não corrigem RPCs DEFINER que contornam RLS.
- **I-02: Storage público de screenshots.** `20260626000001_bug_reports.sql` declara bucket público e grava telas/contexto interno. Policy SELECT por pasta não restringe URL pública de bucket público. Sem API Storage local, nenhum download/listagem real foi testado. Avaliar histórico existente antes de tornar bucket privado e trocar URLs por assinadas.
- **I-03: assinatura Stripe.** Sem webhook versionado, não foi validada assinatura/deduplicação/out-of-order/ativação. Retorno de checkout não é prova de pagamento. Solicitar contrato e ambiente Stripe test antes de implementar sincronização.
- **I-04: chaves de IA no browser.** Padrão VITE_* e define do Vite expõem qualquer valor configurado. Nenhuma chave privada real foi lida ou comprovada no bundle; teste com sentinela e migração backend permanecem necessários.
- **I-05: dependências.** `npm audit` executado contra registry público retorna 39 entradas (5 critical, 26 high, 7 moderate, 1 low). É contagem do scanner, não de falhas exploráveis. Vitest UI/Happy DOM são dev tools, React Router usa HashRouter sem SSR/RSC, Vite é servidor de desenvolvimento. Avaliar alcance e atualização em PR separado, sem `npm audit fix --force`.
- **I-06: configuração Auth, AAL2/2FA, secure email change e login rate limit.** Não existe snapshot ativo versionado. Registrar fator TOTP não comprova challenge no login nem RLS que exige AAL2. RPC de rate limit no frontend pode ser evitada chamando Auth direto; investigar limite do GoTrue. Não alterar política de senha.
- **I-07: rate_limits, views de auditoria, funções sem search_path, overloads antigas, FKs entre tenants, MIME/tamanho e logs com URL/PII.** Análise de fontes requer catálogo efetivo e testes específicos; não classificar como exposição implantada automaticamente.

## 3. Controles validados

Executados no PostgreSQL local, com fixtures históricos do repositório, sem certificar produção:

- `crit_public_clients_billing`: 12/12 após migrations antigas (anon sem DML direto, tenant SELECT e UPDATE direto de billing bloqueados). O teste de setter antigo passava pelo contrato anterior e não cobria SEC-01.
- A-01 fotos: 8/8; A-02 Storage: 7/7 nas policies modeladas.
- Lockdown de public_bookings e regressão auto-confirm: 77 checks na suíte de auto-confirm.
- Cadastro owner: 21 checks, erro de signup limitado, idempotência e rollback da RPC de erro.
- Exclusão/purge de staff, leitura de categorias e escopo de edição: scripts retornaram zero; categorias 10/10.
- RPCs recentes de comissão negam staff/ex-staff e anon; funções internas sem EXECUTE para clientes no harness. Exclusão financeira nega staff e outro tenant.
- Antecedência em minutos: 18 checks; cancel cutoff executado com fluxo v1→v2 preservado.
- Matriz: 210 verificações RLS em dez fixtures, incluindo SELECT/INSERT/UPDATE/DELETE externos, troca de tenant, UPSERT externo/legítimo e lote atômico. Owner mantém CRUD legítimo no modelo.
- Identidade: alterações próprias de role/company/id, INSERT/UPSERT/DELETE e perfil externo bloqueadas, com UPDATE legítimo de dono preservado. Não confundir identidade imutável com desativação efetiva de staff (SEC-03 permanece aberto).

Logs detalhados/contagens finais em `tests/results.md`. Compilar não substitui esses testes.

## 4. Verificações não executadas por limitações

Não executados: acesso real de três contas ao GoTrue/PostgREST/Storage de um Supabase de teste completo; bootstrap de todas as migrations; inventário do catálogo implantado; envio e entrega de email/OTP; pagamentos/webhooks Stripe reais/test; revogação/refresh real de JWT após desativação; comportamento HTTP da Vercel; navegador com backend integrado; recuperação/email change end-to-end; limites MIME/tamanho/URLs assinadas; concorrência completa de produção; validação móvel visual. Chromium não está instalado. graphify update retornou 127 (ferramenta ausente). O bloqueio anterior do CLI GitHub foi documentado em tests/results.md; em 20/10 a entrega foi autorizada em PR draft consolidado via integração disponível.

A-05 continua como risco previamente aceito. Configuração Auth, recursos pagos, identidade dos fluxos residuais de Clube/Fila, CSP enforce e operação de billing/job exigem decisões/configuração do responsável. Nenhum risco novo foi aceito em nome do proprietário.
