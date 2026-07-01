# Pendências do Sprint D+1 (validação em desktop)

Esta nota documenta processos que ficaram em aberto no final do Sprint D+1
(Clube de Assinatura Funcional End-to-End). É um checkpoint pro Rhian validar
no desktop antes de seguir.

## Migration `pix_payments` ainda não aplicada no Supabase de produção

**Onde:** `supabase/migrations/20260630000001_pix_payments.sql`

**Por que:** a tabela `pix_payments` (mais a função `generate_pix_txid()`) é
pré-requisito para o clube funcionar end-to-end. Cria o registro do Pix gerado
quando o cliente contrata um plano.

**Como aplicar (manual, ~2 min):**
1. Abrir Supabase Dashboard → SQL Editor
   https://supabase.com/dashboard/project/lcqwrngscsziysyfhpfj/sql/new
2. Colar e rodar `supabase/migrations/20260629000003_memberships.sql`
3. Colar e rodar `supabase/migrations/20260630000001_pix_payments.sql`
4. Validar que ambas retornam "Success"

**O que acontece se não aplicar:** o módulo Clube vai carregar as telas, mas
toda contratação (`JoinClub`) vai falhar ao tentar criar o `pix_payment`. A
MembersList também não vai listar Pix pendentes.

**O que acontece se aplicar:** módulo clube funciona end-to-end. Cliente
contrata → gera Pix → barbeiro confirma (botão "Simular Recebido" na
MembersList) → membership vira `active` → bypass do CheckoutModal aplica
desconto nos próximos agendamentos.

## Validação desktop pendente

**Status atual:** validado apenas no meu sandbox via dev server + Cloudflare
Tunnel. Rhian pediu validação no desktop antes de prosseguir.

**Itens críticos a testar visualmente no desktop:**
- [ ] `/club-demo` — fluxo de 5 passos (Plano → Dados → Pix → Ativo → Checkout)
- [ ] `/configuracoes/clube/pix` — chave Pix configurada
- [ ] `/configuracoes/clube` — 3 planos criados (Gold, Silver, Bronze)
- [ ] `/clube/assinantes` — MembersList com PixActions
- [ ] Banner "Clube {Plano}" aparecendo no CheckoutModal quando cliente tem
      assinatura ativa
- [ ] Total = R$ 0 quando serviço está dentro do plano
- [ ] Card "Clube de Assinatura" no Dashboard (aparece só se houver
      assinantes ativos ou pendentes)

## Conta de teste Playwright

**Email:** `bob.teste@gmail.com`
**Senha:** `BobTeste@123`
**Status:** Rhian disponibilizou para QA. Login em `/#/login`.

Após migrations serem aplicadas e validação desktop passar, próxima etapa é
alimentar essa conta com dados aleatórios (clientes, serviços, agendamentos) e
rodar Playwright cobrindo o que foi implementado.

## Sequência sugerida pós-validação

1. ✅ Aplicar migrations no Supabase (Rhian)
2. ✅ Validar visualmente no desktop (Rhian)
3. → Eu: alimentar conta `bob.teste@gmail.com` com seed aleatório
4. → Eu: rodar Playwright cobrindo clube + bypass checkout
5. → Próximo sprint (B: WhatsApp, C: Marketing, ou D+2: usage_limit_per_month
   + cancelamento self-service)

## Mudanças aplicadas neste commit

- Migration `20260630000001_pix_payments.sql` (nova tabela + função txid)
- `services/memberships.ts` — `PixPayment` type, `createPixPayment`,
  `fetchPixPaymentByMembership`, `simulatePixPaid`, `cancelPixPayment`
- `hooks/useMemberships.ts` — `usePixPaymentByMembership`,
  `useCreatePixPayment`, `useSimulatePixPaid`, `useCancelPixPayment`
- `hooks/useSubscriptionDiscount.ts` (novo) — cálculo de bypass no checkout
- `lib/pix-txid.ts` (novo) — gerador de txid BACEN-conformante
- `lib/pix-txid.test.ts` (novo) — 5 testes
- `components/membership/PixActions.tsx` (novo) — botão "Simular Recebido"
  + "Copia-cola" na MembersList
- `components/CheckoutModal.tsx` — banner Clube, bypass de pagamento quando
  fully covered, supressão do step de forma de pagamento, validação
  relaxada
- `pages/MembersList.tsx` — PixActions inline pra cada pending/pix
- `pages/Dashboard.tsx` — card Clube com MRR/Ativos/Pendentes
- `pages/JoinClub.tsx` — gera pix_payment + exibe QR na confirmação
- `pages/ClubDemo.tsx` — reescrito com 5 passos de demo
- `e2e/club-capture.spec.ts` — capturas mobile+desktop dos 5 passos
- `vite.config.ts` — `allowedHosts: true` (libera Cloudflare Tunnel em dev)
- `components/CheckoutModal.test.tsx` — ajuste do teste de RPC falha
  (subscription discount faz query em 'services')

## Métricas

- Typecheck: ✅ 0 erros
- Lint: ✅ 0 erros, 0 warnings
- Build: ✅ OK (17s)
- Testes: ✅ 301/301 (+5 do pix-txid)
