# PR proposto — exige origens exatas no retorno de checkout

Referência temática incluída no escopo consolidado da branch `security/hardening-audit`. Entrega solicitada em PR único em rascunho; nenhum merge/deploy autorizado.

A validação aceitava qualquer domínio Vercel cujo nome contivesse o texto do projeto. Agora successUrl/cancelUrl dependem de origem exata permitida; produção e localhost permanecem, e previews devem ser cadastrados explicitamente.

- Problema: SEC-05. Arquivos: allowlists frontend/Edge, teste antigo de preview e `checkoutOrigins.test.ts`.
- Aceite: domínios semelhantes/userinfo não levam a origem externa; preview configurado funciona; preços e modo de assinatura permanecem.
- Antes/depois: seis falhas de domínio no teste inicial; 21/21 focal após correção. Revisor independente: 9,5/10, mais 20 asserções em memória.
- Risco: preview sem configuração será rejeitado. Sem mudança de banco/permissões.
- Plano futuro de deploy: cadastrar somente previews pertencentes ao projeto em CHECKOUT_ALLOWED_ORIGINS, validar handler em Stripe test e publicar frontend/Edge juntos após aprovação. CSP não foi mudada para enforce.
- Rollback: reverter ambos os arquivos e o contrato de teste, ciente de que isso reabre aceitação ampla. Não liberar domínios por substring como correção de configuração.
