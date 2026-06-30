# SPEC: Clube de Assinatura MVP1 (Pix Direto do Barbeiro)

**Status:** in_progress
**Criado:** 2026-06-29
**Prioridade:** alta (Sprint D do roadmap)

---

## Contexto

Donos de barbearia perdem receita previsível e tempo reativando "sumidos". O clube de assinatura resolve as duas coisas: **receita recorrente garantida** + **retenção automática** (cliente pagou, tem que voltar).

Decisão de CEO (Rhian, 29 Jun 2026): **MVP1 manual com Pix direto do barbeiro** (sem integração bancária). Dono cadastra o Pix dele (CPF, celular ou e-mail), cliente paga direto na conta do barbeiro, sistema lembra e o dono confirma manualmente.

**Diferencial vs. Trinks/Booksy/Barbeiro.app:**
- **Sem Stripe Connect** (zero fricção, zero custo de transação, zero KYC)
- **Pix direto do barbeiro** (cliente paga pra ele, não pra plataforma)
- **Confirmação manual rápida** (1 clique, sem dashboard externo)
- **Comissão híbrida preparada** (assinante vs avulso) — gap do mercado que só modogestor resolve

**Caso de referência:** 4 cadeiras R$15K → R$31.690/mês (BestBarbers); 700+ assinantes em 1 unidade; 40 clientes pagam mensal sem ir.

---

## O que o cliente final vê

### Fluxo 1 — Cliente contrata assinatura (novo)

1. Cliente acessa `/book/:slug` (link público)
2. Vê no topo: card "💎 Clube da Barbearia" com planos disponíveis
3. Clica "Quero ser assinante" → modal com planos (R$90 corte ilimitado, R$130 corte+barba, etc)
4. Escolhe plano → vê QR Code do Pix do barbeiro OU dados copia-cola
5. Paga no app do banco → volta pro AgendiX
6. Vê tela "Pagar no estabelecimento?" com 2 opções:
   - **Já paguei no Pix** (botão que manda mensagem WhatsApp automática pro barbeiro)
   - **Vou pagar no balcão** (botão que marca como "pendente presencial")
7. Aguarda confirmação manual do barbeiro
8. Quando barbeiro confirma, recebe WhatsApp: "✅ Bem-vindo ao clube! Sua próxima mensalidade vence em 15/07"

### Fluxo 2 — Cliente assinante agenda (recorrente)

1. Cliente acessa `/minha-area/:slug` (área do cliente)
2. Vê "💎 Você é assinante — Plano Corte Ilimitado · Vence 15/07"
3. Agenda serviço normalmente → checkout mostra "R$ 0,00 (coberto pelo plano)"
4. Sem fricção de pagamento, sem gorjeta obrigatória

### Fluxo 3 — Cliente inadimplente (5+ dias atrasado)

1. Cliente faz login → vê banner vermelho: "⚠️ Mensalidade atrasada · Pague até 20/06 para manter benefícios"
2. CTA "Pagar agora" → mesmo fluxo do Pix

---

## O que o dono vê

### Tela 1 — Configurações > Clube de Assinatura (NOVO)

- **Seção "Seu Pix para receber":**
  - Tipo: CPF / Celular / E-mail
  - Valor: campo texto com validação
  - Toggle "Usar este Pix para cobranças do clube"
  - QR Code gerado a partir do Pix (qr-code-generator lib)
- **Botão grande "Criar Primeiro Plano"** se não tem nenhum

### Tela 2 — Planos (NOVO, /configuracoes/clube)

- Lista de planos: nome, preço/mês, serviços inclusos, número de assinantes
- Ações: editar, desativar, ver assinantes
- Botão "+ Novo Plano" abre modal:
  - Nome (ex: "Corte Ilimitado")
  - Preço mensal (R$)
  - Serviços inclusos (chips multi-select de services)
  - Limite de uso mensal (null = ilimitado)
  - Descrição visível pro cliente
  - Cor de badge (gold, silver, bronze)

### Tela 3 — Assinantes (NOVO, /clube/assinantes)

- Tabs: Ativos / Vencendo (próximos 7 dias) / Atrasados / Cancelados
- Tabela: nome, plano, status, próximo vencimento, valor, ações
- Ações por linha:
  - "Confirmar pagamento" (1 clique)
  - "Marcar inadimplente"
  - "Cancelar assinatura"
  - "Reenviar cobrança" (gera link WhatsApp)
- Filtro: por plano, por status, busca por nome

### Tela 4 — Dashboard (ATUALIZADO)

- Novo card: "💎 Clube · X assinantes · R$ Y/mês recorrente"
- Lista dos 5 mais recentes
- CTA "Ver todos"

### Tela 5 — Cliente individual (CRM, ATUALIZADO)

- Badge 💎 se for assinante + plano + status + vencimento
- Histórico de mensalidades
- Botão "Acessar assinatura"

---

## O que muda no sistema

### Banco (Supabase migrations)

**`membership_plans` (planos que o dono cria):**
- `id` UUID
- `company_id` TEXT (multi-tenant)
- `name` TEXT
- `description` TEXT
- `price_cents` INTEGER (em centavos, evita float)
- `service_ids` UUID[] (serviços inclusos)
- `usage_limit_per_month` INTEGER NULL (null = ilimitado)
- `badge_color` TEXT ('gold' | 'silver' | 'bronze')
- `active` BOOLEAN
- `created_at`, `updated_at`
- RLS: `company_id = get_auth_company_id()`

**`client_memberships` (assinatura do cliente):**
- `id` UUID
- `company_id` TEXT
- `client_id` UUID (FK clients)
- `plan_id` UUID (FK membership_plans)
- `status` TEXT ('pending' | 'active' | 'overdue' | 'cancelled')
- `payment_method` TEXT ('pix' | 'in_person')
- `starts_at` TIMESTAMPTZ
- `current_period_start` TIMESTAMPTZ
- `current_period_end` TIMESTAMPTZ
- `next_billing_at` TIMESTAMPTZ
- `last_paid_at` TIMESTAMPTZ NULL
- `cancelled_at` TIMESTAMPTZ NULL
- `notes` TEXT
- `created_at`, `updated_at`
- RLS: idem

**`membership_payments` (histórico de mensalidades pagas):**
- `id` UUID
- `company_id` TEXT
- `membership_id` UUID (FK client_memberships)
- `amount_cents` INTEGER
- `method` TEXT ('pix' | 'cash' | 'card')
- `status` TEXT ('pending' | 'confirmed' | 'failed')
- `paid_at` TIMESTAMPTZ NULL
- `confirmed_at` TIMESTAMPTZ NULL
- `confirmed_by` UUID NULL (user_id que confirmou)
- `created_at`
- RLS: idem

**`business_settings` (ATUALIZADO):**
- Adicionar campo `pix_key_type` TEXT ('cpf' | 'phone' | 'email' | 'random')
- Adicionar campo `pix_key_value` TEXT
- Adicionar campo `pix_holder_name` TEXT

### Frontend (novos arquivos)

**Configurações:**
- `pages/settings/MembershipPlansSettings.tsx` (lista/cria/edita planos)
- `pages/settings/MembershipSettings.tsx` (configura Pix da barbearia)
- Rota: `/#/configuracoes/clube` (lista planos)
- Rota: `/#/configuracoes/clube/pix` (configura Pix)
- Rota: `/#/clube/assinantes` (gerencia assinantes)

**Componentes:**
- `components/membership/PlanCard.tsx` (card de plano no booking)
- `components/membership/PixDisplay.tsx` (QR Code + copia-cola)
- `components/membership/PaymentConfirmation.tsx` (modal "paguei / vou pagar no balcão")
- `components/membership/MembershipBadge.tsx` (badge pequeno)
- `components/membership/MembersTable.tsx` (tabela com filtros)
- `components/membership/PaymentMethodBadge.tsx`

**Cliente (público):**
- `pages/JoinClub.tsx` (rota `/#/clube/:slug` — contratar)
- Adicionar seção clube no `PublicBooking.tsx`

**Hooks:**
- `hooks/useMembershipPlans.ts` (lista/cria/edita)
- `hooks/useClientMemberships.ts` (assinaturas de um cliente ou empresa)
- `hooks/usePixConfig.ts` (configura e gera QR do Pix)

**Services:**
- `services/memberships.ts` (CRUD completo)
- `services/pix.ts` (gera payload Pix + QR via `qrcode` lib)

**Modificado:**
- `pages/settings/GeneralSettings.tsx` (link para MembershipSettings)
- `App.tsx` (novas rotas)
- `pages/PublicBooking.tsx` (seção clube no topo)
- `pages/ClientCRM.tsx` (badge + atalho)
- `pages/Dashboard.tsx` (novo card)
- `components/CheckoutModal.tsx` (bypass se assinante ativo)

### Backend

- **Helper Pix:** `lib/pix.ts` gera payload EMV/BR Code seguindo spec do BACEN
- **QR Code:** lib `qrcode` (npm install)
- **Webhook futuro (preparado):** `app/api/whatsapp/webhook` reconhece keyword "paguei" (Sprint B, mas schema já suporta)

---

## O que NÃO muda (escopo cortado do MVP1)

- ❌ Stripe Connect (cobrança automática) → Sprint D+
- ❌ Split com barbeiro específico → Sprint D+
- ❌ Comissão híbrida automática (assinante vs avulso) → Sprint D+
- ❌ App mobile do cliente → Sprint E+
- ❌ Cancelamento self-service pelo cliente → MVP1 só o dono cancela

---

## Edge cases

- **Cliente tem 2 assinaturas ativas:** proibido (UNIQUE em `client_memberships` por `client_id` onde `status='active'`)
- **Cliente assinante cancela e quer voltar:** reativação pelo dono, novo período
- **Dono edita preço do plano:** não afeta assinaturas existentes (cada membership tem `price_cents` snapshot)
- **Dono desativa plano:** assinantes existentes continuam até vencer, não renovam
- **Cliente marca "Vou pagar no balcão" mas não aparece:** status fica `pending` por 7 dias, depois vira `cancelled`
- **Dono confirma pagamento:** atualiza `last_paid_at`, `current_period_end += 1 month`, cria `membership_payments`
- **Cliente vai à barbearia e paga em dinheiro no balcão:** dono usa ação "Confirmar pagamento (presencial)" → method='cash'
- **Pagamento confirmado fora do horário:** vira `next_billing_at` + 30 dias a partir do `last_paid_at`
- **Cliente tem assinatura mas agendamento excede limite do plano:** checkout mostra valor extra (lógica na fase 2)
- **Pix inválido cadastrado:** validação client-side (CPF/email/celular formato) + toast de erro

---

## Decisões técnicas

| Decisão | Escolha | Razão |
|---|---|---|
| Cobrança | Manual (dono confirma) | Sem Stripe Connect = zero custo, zero KYC |
| Pix | Direto do barbeiro (CPF/celular/email) | Mais brasileiro, sem intermediário |
| QR Code | Gerado client-side via `qrcode` lib | Não precisa de servidor Pix |
| Validação de pagamento | Manual (1 clique) | Confiável, sem webhook bancário |
| Renovação | Automática por data (next_billing_at) | Dono não precisa lembrar |
| Status | pending / active / overdue / cancelled | 4 estados cobrem o ciclo de vida |
| Valor | `price_cents` INTEGER | Evita problemas de float |
| Multi-tenant | company_id em todas as tabelas | Padrão AgendiX |
| RLS | Habilitada em todas | Padrão AgendiX |

---

## Teste E2E

### Contratar assinatura (cliente novo)

```
1. Acessa /#/clube/:slug
2. Vê 3 planos (R$90, R$130, R$200)
3. Clica "Contratar" no de R$90
4. Vê QR Code do Pix + copia-cola
5. Clica "Já paguei no Pix"
6. Modal de confirmação fecha
7. Toast: "Solicitação enviada! Aguarde confirmação do barbeiro."
8. /minha-area mostra status "Aguardando confirmação"
```

### Dono confirma pagamento

```
1. Dono acessa /clube/assinantes
2. Vê novo assinante com badge "Pendente"
3. Clica "Confirmar pagamento"
4. Modal: "Confirmar R$ 90,00 via Pix? (Última atividade: há 5 min)"
5. Confirma
6. Status muda para "Ativo"
7. Próximo vencimento = hoje + 30 dias
8. Cliente recebe WhatsApp: "✅ Bem-vindo!"
```

### Agendamento com assinatura ativa

```
1. Cliente assinante acessa /book/:slug
2. Escolhe serviço "Corte" (incluído no plano)
3. Escolhe data/hora
4. Checkout mostra: "💎 Coberto pelo seu plano · R$ 0,00"
5. Botão "Confirmar Agendamento" sem campos de pagamento
6. Agendamento criado normalmente
```

---

## Arquivos envolvidos

### Criados

- `supabase/migrations/20260629000003_memberships.sql` (tabelas + RLS)
- `supabase/migrations/20260629000004_business_settings_pix.sql`
- `pages/settings/MembershipPlansSettings.tsx`
- `pages/settings/MembershipSettings.tsx` (config Pix)
- `pages/JoinClub.tsx` (público)
- `pages/MembersList.tsx` (dono)
- `components/membership/PlanCard.tsx`
- `components/membership/PixDisplay.tsx`
- `components/membership/PaymentConfirmation.tsx`
- `components/membership/MembershipBadge.tsx`
- `components/membership/MembersTable.tsx`
- `components/membership/PaymentMethodBadge.tsx`
- `hooks/useMembershipPlans.ts`
- `hooks/useClientMemberships.ts`
- `hooks/usePixConfig.ts`
- `services/memberships.ts`
- `services/pix.ts`
- `lib/pix-generator.ts` (helper EMV/BR Code)
- `lib/pix-generator.test.ts`
- `test/services/memberships.test.ts`

### Modificados

- `App.tsx` (rotas `/configuracoes/clube`, `/configuracoes/clube/pix`, `/clube/:slug`, `/clube/assinantes`)
- `pages/settings/GeneralSettings.tsx` (link para Membership)
- `pages/PublicBooking.tsx` (seção clube no topo)
- `pages/ClientCRM.tsx` (badge)
- `pages/Dashboard.tsx` (card clube)
- `components/CheckoutModal.tsx` (bypass)
- `package.json` (`qrcode` + `@types/qrcode`)

---

## Critérios de aceite

- [ ] Dono cadastra Pix (CPF/celular/email) em Configurações > Clube
- [ ] Dono cria plano com nome, preço, serviços inclusos
- [ ] Cliente vê planos no booking público
- [ ] Cliente contrata via Pix (QR + copia-cola)
- [ ] Dono vê "pendente" na lista de assinantes
- [ ] Dono confirma pagamento com 1 clique
- [ ] Status muda para "Ativo" + cria histórico
- [ ] Próximo vencimento = hoje + 30 dias
- [ ] Cliente assinante agenda sem pagar (bypass)
- [ ] Badge 💎 aparece no CRM do cliente
- [ ] Card do dashboard mostra total de assinantes + receita recorrente
- [ ] Renovação automática por data (Vercel Cron diário)
- [ ] Inadimplente: banner "atrasado" após 5 dias
- [ ] Cancelamento: status cancelled, sem renovação
- [ ] 282+ testes (não regredir) + novos testes para memberships e pix-generator
- [ ] typecheck, lint, build OK
- [ ] PR merged

---

## Métricas de sucesso

| Métrica | Meta Sprint D (3 meses) |
|---|---|
| Barbearias com clube ativo | 20+ |
| Planos criados | 50+ |
| Assinaturas ativas | 100+ |
| Receita recorrente média | R$ 90-200/mês por barbearia |
| Taxa de inadimplência | < 15% |
| Renovação automática | > 70% |

---

## Riscos e mitigação

| Risco | Severidade | Mitigação |
|---|---|---|
| Dono esquece de confirmar pagamento | Média | Badge "pendente" vermelho + toast de alerta diário |
| Cliente paga e esquece de clicar "paguei" | Média | Botão grande + WhatsApp automático como lembrete |
| Inadimplência alta | Alta | Banner de aviso + notificação pro dono |
| QR Code Pix inválido | Baixa | Validação client-side + teste com sandbox |
| Comissão errada (assinante vs avulso) | Média | MVP1 cobra normalmente; lógica híbrida no Sprint D+ |

---

## Roadmap D+

- **D+1 (2 semanas):** Comissão híbrida (assinante 50% comissão, avulso 60%)
- **D+2 (2 semanas):** Integração Mercado Pago/Asaas (link externo que volta webhook)
- **D+3 (4 semanas):** Stripe Connect real (cobrança automática + split)

---

## Done when

- [ ] Todas as migrations aplicadas em dev
- [ ] Todos os arquivos criados/modificados commitados
- [ ] Gate verde: typecheck, lint, build, 282+ testes
- [ ] PR mergeado em main
- [ ] Documentação `docs/clube-assinatura.md` publicada
