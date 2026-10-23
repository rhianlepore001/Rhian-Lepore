# PR proposto — restringe vínculo Stripe ao backend autorizado

Referência temática incluída no escopo consolidado da branch `security/hardening-audit`. Entrega solicitada em PR único em rascunho; nenhum merge/deploy autorizado.

O setter autenticado de customer permitia vínculo arbitrário, e a Edge adotava customer localizado por email. A correção exige proprietário e metadata correspondente, cria vínculo por backend e bloqueia conflitos. Não ativa plano nem muda preço/status/trial.

- Problemas: SEC-01; incompatibilidade de automatic_payment_methods com Checkout.SessionCreateParams; construção do SDK antes da configuração.
- Arquivos: migration `20261018190300_server_owned_stripe_customer.sql`, rollback oficial, `supabase/functions/create-checkout-session/index.ts`, billing.sql/runner e checkoutAuthorization.test.ts. Depende do contrato de origens de SEC-05 ao executar a suíte completa.
- Aceite: cliente não escolhe customer; legado exige metadata confiável; RPC somente service_role; conflito não sobrescreve; edição legítima de perfil preservada.
- Antes/depois: teste inicial de billing falha; handler tinha 11/15 falhas; depois 16/16 e ciclo SQL completo, incluindo concorrência. Testes SDK suplementares inicialmente vermelhos passaram após correção.
- Revisão independente: 9,2/10, escopo local. Gates e limites em `../tests/results.md` e `independent.md`.
- Riscos: metadata ausente bloqueia legado; publicação coordenada; ausência de webhook e deduplicação de sessão permanecem. Não reconciliar pelo email.
- Plano futuro de deploy: ambiente Supabase/Stripe test fiel → configurar segredo backend → conferir contratos/grants → janela coordenada migration/Edge → smoke com fixtures → aprovação do responsável antes de produção.
- Rollback: suspender checkout e coordenar reversão Edge/migration; rollback oficial restaura ACL/corpo anterior e reabre SEC-01. Não usar reversão isolada para liberar acesso.
