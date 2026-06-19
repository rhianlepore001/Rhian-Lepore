# Logic Analyzer — AgendiX (LionClaw)

**Escopo:** race conditions (pagamento/agenda), bypass de validação, IDOR, limites de plano/assinatura, validação só no frontend, fluxos públicos booking/queue, RPCs `SECURITY DEFINER`.

**Data:** 2026-06-13  
**Método:** leitura estática de `pages/`, `services/`, `supabase/migrations/` (evidência `arquivo:linha`).

## Resumo

| Severidade | Qtd |
|---|---|
| CRÍTICO | 4 |
| ALTO | 7 |
| MÉDIO | 6 |
| BAIXO | 3 |

---

## CRÍTICO

### LOGIC-CRIT-001: RPC `mirror_public_client_to_crm` — escrita cross-tenant sem autenticação
- **Severidade:** CRÍTICO
- **Arquivo(s):** `supabase/migrations/20260405_fix_crm_mirror_and_rescheduling.sql:20-52`, `contexts/PublicClientContext.tsx:91-97`
- **Trecho:**
```sql
-- migration: sem validação de quem chama; aceita p_user_id arbitrário
GRANT EXECUTE ON FUNCTION mirror_public_client_to_crm(...) TO anon;
```
```typescript
// PublicClientContext.tsx:91-97 — p_user_id vem do cliente
await supabase.rpc('mirror_public_client_to_crm', {
  p_user_id: data.business_id,
  ...
});
```
- **Impacto:** Qualquer visitante anônimo pode inserir/atualizar registros na tabela `clients` de **qualquer** barbearia informando `p_user_id` alheio. Poluição de CRM, spoofing de clientes, possível confusão operacional/financeira.
- **Solução sugerida:** Remover `GRANT` para `anon`; validar `p_user_id` contra token de sessão pública ou rate-limit + prova de posse do telefone; ou mover espelhamento para trigger pós-`public_bookings` com `business_id` fixo.
- **Esforço:** Médio

---

### LOGIC-CRIT-002: Leitura global de `public_bookings` para role `anon`
- **Severidade:** CRÍTICO
- **Arquivo(s):** `supabase/migrations/20260321_fix_public_bookings_select_anon.sql:13-17`, `services/publicBooking.ts:243-251`
- **Trecho:**
```sql
CREATE POLICY "public_bookings_select_anon"
  ON public.public_bookings FOR SELECT TO anon
  USING (true);
```
```typescript
// fetchPublicBookingById — sem filtro de business_id
.from('public_bookings').select(...).eq('id', bookingId).single();
```
- **Impacto:** IDOR em massa — qualquer pessoa com UUID de booking (ou enumeração) lê nome, telefone, horário, serviços e `business_id` de agendamentos de todos os tenants.
- **Solução sugerida:** Restringir SELECT anon a `id = $id AND customer_phone = $phone` (via RPC `SECURITY DEFINER`) ou revogar policy aberta; nunca `USING (true)`.
- **Esforço:** Baixo

---

### LOGIC-CRIT-003: Fluxo público ignora `create_secure_booking` — sem anti-colisão e preço controlado pelo cliente
- **Severidade:** CRÍTICO
- **Arquivo(s):** `services/publicBooking.ts:99-149`, `pages/PublicBooking.tsx:514-547`, `supabase/migrations/20260217_fix_secure_booking_final.sql:35-58`
- **Trecho:**
```typescript
// publicBooking.ts:132-146 — INSERT direto, total_price do payload
.insert({ business_id, ..., total_price: parsed.totalPrice, ... })
```
```typescript
// PublicBooking.tsx:514-543 — preço calculado no browser
const totalPrice = calculateTotal();
await submitBookingMutation.mutateAsync({ ..., totalPrice, ... });
```
```sql
-- create_secure_booking tem collision check, mas NÃO é usado pelo fluxo público atual
IF v_is_busy THEN RETURN json_build_object('success', false, ...);
```
- **Impacto:** (1) **Race condition / double-booking** — dois submits concorrentes passam sem `EXISTS`/lock; (2) **Bypass de preço** — atacante envia `totalPrice: 0` ou valor arbitrário; (3) **Bypass de duração** — `durationMinutes` client-side afeta slots sem validação server-side no INSERT direto.
- **Solução sugerida:** Rotear **todo** agendamento público por RPC única (`create_secure_booking` ou sucessor) que: recalcula preço/duração a partir de `services`, valida `public_booking_enabled`, lead time, max/dia, e faz `INSERT ... ON CONFLICT`/lock pessimista.
- **Esforço:** Médio

---

### LOGIC-CRIT-004: Assinatura/trial — bloqueio só no frontend (overlay)
- **Severidade:** CRÍTICO
- **Arquivo(s):** `components/PaywallModal.tsx:10-18`, `components/Layout.tsx:43`, `contexts/AuthContext.tsx:371-378`, `App.tsx:58-89`
- **Trecho:**
```typescript
// PaywallModal — retorna null se não expirado; não bloqueia rotas/API
if (isLoading || !isExpired) return null;
```
```typescript
// ProtectedLayout — só checa isAuthenticated + tutorialCompleted
// sem subscription_status
```
- **Impacto:** Conta com trial expirado continua autenticada; overlay pode ser contornado (devtools, chamadas diretas Supabase, staff sem paywall). **Nenhuma RPC/tabela** valida `subscription_status` antes de operar.
- **Solução sugerida:** Gate server-side (RLS helper ou check em RPCs críticas); Edge Function no Stripe webhook como fonte de verdade; bloquear staff quando owner expirado se for requisito comercial.
- **Esforço:** Alto

---

## ALTO

### LOGIC-HIGH-001: `create_secure_booking` — preço não validado + `GRANT` anon
- **Severidade:** ALTO
- **Arquivo(s):** `supabase/migrations/20260217_fix_secure_booking_final.sql:23-24`, `136`, `services/scheduling.ts:111-119`
- **Trecho:**
```sql
p_total_price NUMERIC,  -- aceito sem conferir soma de services
GRANT EXECUTE ... TO authenticated, anon;
```
- **Impacto:** Mesmo quando usado (agenda interna via `createAppointment`), preço é confiado ao caller. Anon pode invocar RPC para qualquer `p_business_id` (sem ownership check na função).
- **Solução sugerida:** Recalcular `p_total_price` no servidor; exigir auth para status `Confirmed`; validar `p_business_id` para anon (ex.: só pending + rate limit).
- **Esforço:** Médio

---

### LOGIC-HIGH-002: Race condition em `complete_appointment` (financeiro duplicado)
- **Severidade:** ALTO
- **Arquivo(s):** `supabase/migrations/20260530_complete_appointment_atomic_price.sql:64-90`, `supabase/migrations/20260301_cleanup_duplicate_finance_records.sql:14-15`
- **Trecho:**
```sql
SELECT COUNT(*) INTO v_existing_finance ...;
-- sem UNIQUE em appointment_id; janela entre COUNT e INSERT
IF v_existing_finance > 0 THEN UPDATE ... ELSE INSERT ...
```
```sql
-- migration de cleanup documenta causa:
-- "duplicatas geradas por multiple calls a complete_appointment"
```
- **Impacto:** Double-click ou retry no checkout gera múltiplos `finance_records` para o mesmo appointment (receita inflada). Guard de idempotência frágil (COUNT não é serializável com INSERT concorrente).
- **Solução sugerida:** `UNIQUE (appointment_id)` parcial + `ON CONFLICT DO UPDATE`; ou flag `completed_at` com early return atômico no mesmo statement.
- **Esforço:** Baixo

---

### LOGIC-HIGH-003: Checkout — venda de produto antes de concluir appointment (estado inconsistente)
- **Severidade:** ALTO
- **Arquivo(s):** `components/CheckoutModal.tsx:167-186`
- **Trecho:**
```typescript
for (const line of cart) {
  await sellProductMutation.mutateAsync({ ... }); // commit imediato
}
await mutateAsync({ appointmentId, finalPrice, ... }); // complete_appointment depois
```
- **Impacto:** Se `complete_appointment` falhar após `sell_product`, estoque e receita de produtos são debitados sem appointment `Completed` — inconsistência pagamento/agenda.
- **Solução sugerida:** RPC única de checkout que vende produtos + completa appointment em uma transação.
- **Esforço:** Médio

---

### LOGIC-HIGH-004: Fila pública — deduplicação só no cliente (TOCTOU)
- **Severidade:** ALTO
- **Arquivo(s):** `services/queue.ts:64-86`, `pages/QueueJoin.tsx:115-121`, `supabase/migrations/20260216_rls_phase3_operational.sql:42-45`
- **Trecho:**
```typescript
const duplicate = await findActiveQueueEntryByPhone(...);
if (duplicate) throw new Error(...);
await supabase.from('queue_entries').insert({ ... });
```
```sql
CREATE POLICY "Public can join queue" ... WITH CHECK (true);
```
- **Impacto:** Duas abas/dispositivos entram na fila com mesmo telefone; spam de fila sem rate limit; `findActiveQueueEntryByPhone` carrega todas entradas ativas do tenant (O(n)) e compara no JS.
- **Solução sugerida:** `UNIQUE` parcial index `(business_id, normalize_phone_digits(client_phone)) WHERE status IN (...)` + RPC `join_queue_atomic`; rate limit por IP/telefone.
- **Esforço:** Médio

---

### LOGIC-HIGH-005: Fila pública — SELECT expõe PII de todos na fila ativa
- **Severidade:** ALTO
- **Arquivo(s):** `supabase/migrations/20260216_rls_phase3_operational.sql:51-55`
- **Trecho:**
```sql
CREATE POLICY "Public can view active queue"
  ON public.queue_entries FOR SELECT
  USING (status NOT IN ('completed', 'cancelled', 'no_show'));
```
- **Impacto:** Qualquer anônimo lista nomes e telefones de quem está na fila de um negócio (enumeração por `business_id`). Violação de privacidade / LGPD.
- **Solução sugerida:** SELECT público apenas pela própria entrada (`id` + prova de telefone) via RPC; painel do dono permanece autenticado.
- **Esforço:** Médio

---

### LOGIC-HIGH-006: `createAgendaAppointment` — bypass de anti-colisão
- **Severidade:** ALTO
- **Arquivo(s):** `services/scheduling.ts:360-374`, `hooks/useScheduling.ts:56`
- **Trecho:**
```typescript
await supabase.from('appointments').insert({
  user_id: parsed.companyId, ..., appointment_time: ..., status: 'Confirmed',
});
```
- **Impacto:** Agenda interna pode criar slots sobrepostos contornando `create_secure_booking` (único caminho com collision check em `scheduling.ts:111`).
- **Solução sugerida:** Unificar criação de appointments em RPC com lock; remover INSERT direto.
- **Esforço:** Médio

---

### LOGIC-HIGH-007: Limites de booking (`max_bookings_per_day`, `lead_time`, `enabled`) — só no schema/UI
- **Severidade:** ALTO
- **Arquivo(s):** `pages/settings/PublicBookingSettings.tsx:39-56`, `supabase/migrations/20260218_full_schema_fix.sql:17-19`, `pages/PublicBooking.tsx:490-547`
- **Trecho:** Colunas existem em `profiles`; `PublicBooking.tsx` não referencia `public_booking_enabled`, `booking_lead_time_hours` nem `max_bookings_per_day` no submit.
- **Impacto:** Dono desabilita booking público ou define lead time — atacante continua inserindo via API/INSERT direto. Limite diário não aplicado server-side.
- **Solução sugerida:** Validar flags na RPC de booking; rejeitar horários dentro do lead time; contar bookings do dia antes do INSERT.
- **Esforço:** Médio

---

## MÉDIO

### LOGIC-MED-001: `complete_appointment` aceita `p_final_price` arbitrário (só ≥ 0)
- **Severidade:** MÉDIO
- **Arquivo(s):** `supabase/migrations/20260530_complete_appointment_atomic_price.sql:54-58`, `components/CheckoutModal.tsx:74`, `146-186`
- **Trecho:**
```sql
v_final_price := COALESCE(p_final_price, v_appointment.price);
IF v_final_price < 0 THEN RAISE EXCEPTION ...
```
```typescript
setFinalPrice(appointment.price ?? 0); // editável no modal
```
- **Impacto:** Staff/owner pode registrar receita menor (desconto legítimo) ou, se RLS falhar, valor zerado. Sem teto vs preço do serviço/agendamento.
- **Solução sugerida:** Registrar `original_price` + `discount_reason`; opcional teto/alerta se `p_final_price << appointment.price`.
- **Esforço:** Baixo

---

### LOGIC-MED-002: `cancelAppointment` / `assignAppointmentProfessional` sem `company_id` explícito
- **Severidade:** MÉDIO
- **Arquivo(s):** `services/scheduling.ts:342-357`
- **Trecho:**
```typescript
.update({ status: 'Cancelled' }).eq('id', parsed.appointmentId);
.update({ professional_id: ... }).eq('id', parsed.appointmentId);
```
- **Impacto:** Depende 100% de RLS em `appointments`. Se policy regredir (histórico de 91 migrations RLS), vira IDOR de cancelamento/reassign cross-tenant.
- **Solução sugerida:** Sempre filtrar `.eq('user_id', companyId)` + RPC com `get_auth_company_id()`.
- **Esforço:** Baixo

---

### LOGIC-MED-003: Edição de booking público — UPDATE sem `business_id` no WHERE
- **Severidade:** MÉDIO
- **Arquivo(s):** `services/publicBooking.ts:102-118`
- **Trecho:**
```typescript
.update({ ... }).eq('id', parsed.editingBookingId);
// business_id ausente no filtro
```
- **Impacto:** Se policy de UPDATE para anon/authenticated for permissiva, IDOR de reagendamento em booking alheio. Hoje anon não tem GRANT UPDATE (só INSERT), mas owner policy `FOR ALL` usa `auth.uid() = business_id` — risco em evoluções de RLS.
- **Solução sugerida:** `.eq('business_id', parsed.businessId)` + RPC `reschedule_public_booking` com validação de telefone.
- **Esforço:** Baixo

---

### LOGIC-MED-004: `delete_appointment_with_finance` usa `auth.uid()` em vez de `get_auth_company_id()`
- **Severidade:** MÉDIO
- **Arquivo(s):** `supabase/migrations/20260607_delete_appointment_with_finance.sql:25-41`
- **Trecho:**
```sql
v_auth_user_id := auth.uid()::TEXT;
IF v_appointment_user_id <> v_auth_user_id THEN RAISE EXCEPTION ...
```
- **Impacto:** Staff autenticado com `company_id` no JWT pode falhar ao deletar histórico do tenant (lógica de negócio inconsistente com `complete_appointment` que usa `get_auth_company_id()`).
- **Solução sugerida:** Alinhar com `COALESCE(get_auth_company_id(), auth.uid()::TEXT)`.
- **Esforço:** Baixo

---

### LOGIC-MED-005: `createFinanceRecord` — INSERT direto com valores do cliente
- **Severidade:** MÉDIO
- **Arquivo(s):** `services/finance.ts:154-187`, `pages/Finance.tsx:21`
- **Trecho:**
```typescript
const record = { user_id: input.companyId, amount: input.amount, ... };
await supabase.from('finance_records').insert(record);
```
- **Impacto:** Validação de tipo/valor só no Zod do frontend; RLS deve impedir cross-tenant, mas não impede valores financeiros incoerentes (receita negativa se schema permitir).
- **Solução sugerida:** RPC `create_finance_record` com validação de role (owner) e limites.
- **Esforço:** Baixo

---

### LOGIC-MED-006: RPC `get_booking_by_id` — coluna errada (`phone` vs `customer_phone`)
- **Severidade:** MÉDIO
- **Arquivo(s):** `supabase/migrations/20260316_fix_edit_booking_rpc.sql:24-28`
- **Trecho:**
```sql
WHERE id = p_booking_id
  AND (phone = p_phone OR regexp_replace(phone, ...) = ...)
```
- **Impacto:** RPC não funciona (coluna inexistente em `public_bookings`) — fluxo de edição seguro planejado está morto; app usa `fetchEditBooking` com `business_id` mas sem validação forte de telefone no UPDATE path.
- **Solução sugerida:** Corrigir para `customer_phone`; usar no lugar de SELECT aberto.
- **Esforço:** Baixo

---

## BAIXO

### LOGIC-LOW-001: Rate limiting apenas em login
- **Severidade:** BAIXO
- **Arquivo(s):** `supabase/migrations/20260214_rate_limiting.sql:82-89`, `contexts/AuthContext.tsx:202`
- **Impacto:** Booking/queue públicos sem throttle — abuso de spam/DoS contra INSERT abertos.
- **Esforço:** Baixo

---

### LOGIC-LOW-002: Staff isento do paywall visual
- **Severidade:** BAIXO
- **Arquivo(s):** `components/PaywallModal.tsx:15-16`
- **Trecho:** `if (role === 'staff') return null;`
- **Impacto:** Com trial do owner expirado, staff opera app sem incentivo de assinatura (pode ser intencional).
- **Esforço:** Baixo (decisão de produto)

---

### LOGIC-LOW-003: Padrões positivos (referência)
- **Severidade:** BAIXO (informativo)
- **Arquivo(s):** `supabase/migrations/20260530_complete_appointment_atomic_price.sql:40-44` (`FOR UPDATE`), `supabase/migrations/20260603_products_v1.sql:103-108` (`sell_product` com `FOR UPDATE` de estoque), `supabase/migrations/20260602_harden_queue_phone_dedup.sql:43-47` (`finish_queue_entry` com ownership)
- **Impacto:** Modelo correto para outras RPCs replicarem.

---

## Matriz rápida (pedido do pipeline)

| Categoria | Achado principal | ID |
|---|---|---|
| Race condition (agenda) | INSERT público sem lock; `createAgendaAppointment` direto | CRIT-003, HIGH-006 |
| Race condition (pagamento) | `complete_appointment` duplica finance; checkout não atômico | HIGH-002, HIGH-003 |
| Bypass validação | Preço/duração client-side no booking público | CRIT-003, HIGH-001 |
| IDOR | SELECT anon em `public_bookings`; fila pública SELECT ampla | CRIT-002, HIGH-005 |
| Limites plano/assinatura | Trial/ativo só no React; sem enforcement DB | CRIT-004 |
| Validação só frontend | `totalPrice`, `finalPrice`, limites booking, paywall | CRIT-003, CRIT-004, HIGH-007 |
| Fluxos públicos booking/queue | INSERT `WITH CHECK (true)`; CRM mirror anon | CRIT-001, CRIT-003, HIGH-004 |
| RPC SECURITY DEFINER | `mirror_public_client_to_crm` sem auth; `create_secure_booking` GRANT anon | CRIT-001, HIGH-001 |

---

## Não verificado nesta passagem
- Comportamento runtime com Supabase live (RLS efetiva após ordem das 91+ migrations)
- Webhook Stripe atualizando `subscription_status`
- Edge cases de `get_auth_company_id()` com JWT legado
