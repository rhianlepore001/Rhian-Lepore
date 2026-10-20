# Migration SEC-01

Migration oficial: [20261018190300_server_owned_stripe_customer.sql](../../supabase/migrations/20261018190300_server_owned_stripe_customer.sql).

Rollback oficial: [20261018190300_server_owned_stripe_customer.rollback.sql](../../docs/rollbacks/20261018190300_server_owned_stripe_customer.rollback.sql).

Gerada com `supabase migration new server_owned_stripe_customer` (CLI 2.111.1-beta.2). Os arquivos estão nos diretórios oficiais; não manter cópia SQL divergente em security/.

## Justificativa e aceite

O setter antigo permitia que authenticated escolhesse qualquer customer com formato cus_*. A migration revoga esse acesso e cria um setter INVOKER somente para service_role, com alvo explícito de proprietário. Não muda grants de tabelas, policies, planos, status, trial ou identificadores existentes.

Aceite: anon e authenticated não executam nenhum setter; UPDATE/INSERT/UPSERT de billing continuam bloqueados; somente backend vincula dono real ao customer validado na Edge; conflito não sobrescreve; repetição é idempotente; dono continua editando nome comercial; dois vínculos concorrentes diferentes produzem um sucesso e um conflito.

## Implementação e impacto

Função com `search_path=''`, relações qualificadas e `SECURITY INVOKER`. Backend já usa service_role, não precisa de escalada DEFINER. SELECT FOR UPDATE usa a PK de profiles.id e serializa apenas o perfil afetado; não há necessidade de índice novo. Migration transacional, lock_timeout=5s, sem alteração ou exclusão de linhas de negócio. Restrição de papel/tenant impede atribuição a perfil staff. Metadata e existência do customer são conferidas pela Edge, não por regex SQL.

## Validação executada

`PGBIN=... bash security/tests/local-postgres.sh billing-cycle` passou: aplicação 2x, teste de autorização/integridade, rollback, conferência de hash/ACL exatos da função antiga e remoção da nova, reaplicação e corrida concorrente. Rollback restaura também o comportamento inseguro original, comprovado no fixture.

Não foi executado Supabase Advisor contra projeto remoto, nem CLI advisors vinculada a ambiente completo. Revisão de catálogo/ACL local e teste SQL equivalentes cobrem o escopo alterado. Não usar isso como atestado do catálogo completo.

## Publicação futura e rollback

Não executados nesta auditoria. Preparar janela coordenada de migration + Edge, segredo de backend exclusivamente no servidor e teste em Stripe test. Confirmar metadata dos customers legados por fonte confiável; email sozinho não autoriza reconciliação. O código falha fechado quando o vínculo não pode ser verificado.

Para reversão em ambiente autorizado: suspender checkout, reverter a Edge e aplicar o rollback correspondente na janela coordenada; testar com dados fictícios antes de reabrir. **O rollback reabre SEC-01**. Não utilizá-lo isoladamente para contornar customer legado ou configuração ausente. Nenhuma decisão de cobrança ou plano foi alterada.
