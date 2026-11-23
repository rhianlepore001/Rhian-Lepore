# Spec — Overhaul de agendamento cliente/colaborador

| Campo | Valor |
|---|---|
| Produto | AgendiX |
| Status | aguardando implementação (escopo já aprovado; **não implementado**) |
| Branch de feature | `feat/client-collab-booking-overhaul` |
| Base de orquestração | `/workspace/agendix-booking-overhaul/ORCHESTRATION.md` (2026-09-20) — carregar pacotes A, B, D (wave 1), C, E (wave 2), G |
| Idioma | pt-BR |
| Decisões Rhian | 2026-09-16 → 2026-09-20 |
| Data desta consolidação | 2026-09-24 (WEST) |
| Trial | 20 dias (contexto apenas) |

## 1. Objetivo

UX profissional de agendamento para **cliente** e **colaborador**, com políticas **100% ajustáveis pelo manager** para caber qualquer estabelecimento. Entrega só com relatório testado + screenshots; validator ≥9; Impeccable craft + critique visual Playwright 390×844 e 1280.

Posicionamento: proteger a cadeira (**"recupera a cadeira"**) contra no-show/walk-in bloqueado, com paridade Buk.pt (antecedência + sinal/pré-pagamento) e diferenciação BR (WhatsApp/Pix nativos, fila digital, narrativa de ocupação).

## 2. Decisões confirmadas do Rhian (carregar na implementação)

1. **Tudo flexível** pelo manager (janelas, pagamento, quem aceita, copy).
2. Dor real (barbeiro, 2026-09-16): barbeiros evitam online por no-show e porque walk-in não pode ocupar a cadeira enquanto o agendado não chegou. Soluções como **opções do manager**:
   - antecedência mínima para marcar;
   - pagamento obrigatório no booking (valor total **ou** sinal/depósito fixo).
3. Paridade Buk.pt: antecedência configurável (ex. 8h/16h/24h) + depósito ou pré-pagamento via Stripe; AgendiX diferencia com narrativa "recupera a cadeira", ocupação/walk-in, WhatsApp/Pix BR.
4. Bugs observados (screenshots Rhian 2026-09-20):
   - Após aceite online, cliente só vê **"Confirmado"** depois de reload → precisa **realtime** (como fila digital).
   - Ao marcar **finalizado / não compareceu / cancelado**, área do cliente fica vazia mesmo após reload → estado + mensagem claros (+ realtime).
   - Bug conhecido: copy diz **"confirmado"** enquanto ainda está **pending** → corrigir.
5. Mapa de fluxo: `pedido → aguardando → confirmado → em andamento → finalizado | não compareceu | cancelado`.
6. Defaults: cancelamento cliente até **2h** antes (ajustável); editar horário/profissional **sempre** cria pedido de aceite + notificação imediata ao manager; edição leve só de serviço **opcionalmente** sem aceite; aceite por **manager e profissional atribuído**; mensagens de saída claras.
7. CTA pós-serviço **"Agendar próximo horário"**; se não usado, fim do dia volta para **"Agendar horário"**. Se houver clubes, copy de marketing **adaptativa** por cenário (finalizado, no-show, cancelado, pós-confirmação) — nunca genérica.
8. WhatsApp pré-preenchido com `(nome do estabelecimento)` dinâmico — **nunca** hardcoded.
9. Colaboradores **nunca** veem cards de onboarding do manager ("AVISOS IMPORTANTES", setup checklist) e **recebem** notificações de bookings online.
10. Ordem proposta: UX colaborador → realtime aceite → status de saída → WhatsApp → políticas/pagamento.

> **Nota transcript:** tentativa de recuperar detalhes extras via `ReadTranscript` no agent `ac887ef3-ee74-4072-9d88-e92cc9f18876` — ferramenta **não disponível** neste runtime MCP. Prosseguir com os fatos acima.

## 3. Grounding no repo (re-check pós PRs #88–#90)

Paths confirmados em `main` (2026-09-24):

| Área | Paths |
|---|---|
| Cliente | `pages/ClientArea.tsx`, `components/ClientBookingCard.tsx`, `components/ClientWhatsAppFAB.tsx` |
| Copy | `utils/publicBookingCopy.ts` (existe) |
| Público | `pages/PublicBooking.tsx`, `services/publicBooking.ts`, `pages/settings/PublicBookingSettings.tsx` |
| Agenda / aceite | `pages/Agenda.tsx`, `services/scheduling.ts`, RPC `accept_public_booking` |
| Colaborador / onboarding | `pages/Dashboard.tsx` (`SetupCopilot` só `!isStaff` — verificar outros cards), `pages/StaffOnboarding.tsx`, `components/dashboard/SetupCopilot.tsx`, `hooks/useOnboardingState.ts`, `hooks/useSmartNotifications.ts`, `components/SmartNotifications.tsx` |
| Fila realtime (padrão) | `hooks/useQueueRealtime.ts`, `pages/QueueStatus.tsx`, `pages/QueueManagement.tsx` |
| Notificações DB | `notifications` (`user_id`, `title`, `message`, `type`, `read`) |
| Stripe atual | `supabase/functions/create-checkout-session` — **só assinatura SaaS** (`profiles.stripe_customer_id`, `mode=subscription`). **Não há** Stripe Connect / PaymentIntent de depósito de cliente ainda |
| Políticas já existentes | `profiles.booking_lead_time_hours` (UI em PublicBookingSettings), `business_settings.lead_time_hours`, `business_settings.enable_self_rescheduling`, `business_settings.cancellation_policy` (texto legado `flexible`) |
| Status appointments | prod: `Confirmed`, `Completed`, `Cancelled`, `Pending`, `NoShow` (Agenda já marca NoShow). `types/scheduling.ts` ainda **omite** `NoShow` — alinhar |
| Status public_bookings | lowercase: `pending`, `confirmed`, `cancelled` (+ completed observado em queries históricas). **Sem** `no_show` / `in_progress` / `completed` canônicos na UI do cliente |
| Realtime publication | **Só `queue_entries`** está em `supabase_realtime`. `public_bookings` **NÃO** está publicado → explica bug do reload mesmo com `postgres_changes` já escrito em `ClientArea.tsx` (linhas ~166–194) |
| Serviços recentes | PRs #88–#90 tocaram Services / ServiceModal / Agenda / PublicBooking / constants — **revalidar imports** antes de editar |

## 4. Mapa de estados (canônico)

### 4.1 `public_bookings.status` (cliente)

| Estado UI (pt-BR) | Valor persistido (proposto) | Quem muda |
|---|---|---|
| Pedido / Aguardando | `pending` | create_public_booking; edit que exige aceite |
| Confirmado | `confirmed` | `accept_public_booking` (manager/pro) |
| Em andamento | `in_progress` (**additive** — novo) | staff inicia atendimento (Agenda/Fila) |
| Finalizado | `completed` (**additive** se ainda não escrito no accept/complete path) | checkout / complete |
| Não compareceu | `no_show` (**additive**) | manager/pro marca no-show; sincronizar com `appointments.NoShow` |
| Cancelado | `cancelled` | cliente (dentro da janela) ou staff |

**Regra de sync:** toda transição relevante em `appointments` ligada a `public_booking_id` deve espelhar `public_bookings.status` (RPC `_v2` ou trigger additive). Hoje o aceite já seta `public_bookings.status='confirmed'`; complete/no-show pelo lado Agenda pode atualizar só `appointments` — **raiz do bug de saída vazia**.

### 4.2 Copy de badge (ClientBookingCard)

Corrigir mapeamento:

- `pending` → **Aguardando** (nunca “Confirmado”)
- `confirmed` → Confirmado
- `in_progress` → Em andamento
- `completed` → Finalizado
- `no_show` → Não compareceu (+ mensagem de saída)
- `cancelled` → Cancelado (+ mensagem)

### 4.3 Políticas default (ajustáveis)

| Política | Default | Onde guardar (proposto, additive) |
|---|---|---|
| Antecedência mínima | já existe ~2h (`booking_lead_time_hours`); oferecer presets 8/16/24h na UI | `profiles.booking_lead_time_hours` (manter) |
| Cancelamento cliente | até 2h antes | nova col `client_cancel_cutoff_hours int default 2` em `business_settings` |
| Edição horário/profissional | sempre cria `pending` + notifica | flag `edit_requires_acceptance bool default true` |
| Edição só serviço | opcional sem aceite | `service_only_edit_skip_acceptance bool default false` |
| Quem aceita | manager **e** profissional atribuído | `booking_accept_roles text[] default '{owner,assigned_staff}'` |
| Pagamento no booking | off | `booking_payment_mode enum: none\|deposit\|full` + `booking_deposit_amount numeric` / `booking_deposit_percent` |
| No-show: sinal | manager escolhe: reter / reembolsar parcial / reembolsar total | `no_show_deposit_policy` |
| Cancelamento com sinal | idem | `cancel_deposit_policy` |

## 5. Pacotes (sem overlap de arquivos)

Herdado do ORCHESTRATION.md; critérios de aceite **detalhados** abaixo. Ordem de merge wave 1: A → B → D (ou paralelo se ownership respeitado). Wave 2: C → E. G em paralelo desde o início.

### Pacote A — Higiene colaborador + notificações de booking online (Wave 1)

**OWN ONLY:**
- `pages/Dashboard.tsx` (seções staff)
- `pages/StaffOnboarding.tsx` / `pages/StaffInsights.tsx` se gatearem onboarding
- `hooks/useSmartNotifications.ts`
- `components/SmartNotifications.tsx` / qualquer “AVISOS IMPORTANTES” / setup checklist
- `components/dashboard/SetupCopilot.tsx` (já gated `!isStaff` — auditar vazamentos)
- Criação de linhas em `notifications` para bookings online → colaboradores

**NÃO TOCAR:** ClientArea, ClientBookingCard, WhatsApp FAB, migrations de política cancel/edit.

**Acceptance:**
1. Role `staff` **nunca** vê onboarding/setup do manager (serviços, equipe, Stripe, capa, SetupCopilot, banners de comissão do dono) — inclusive conta nova.
2. Ao chegar `public_bookings` pending (online), colaborador atribuído recebe notificação in-app; preferir setting “todos os staff vs só atribuído” (default: **atribuído + owner**).
3. Manager continua vendo onboarding quando apropriado.
4. Teste: login staff em tenant com onboarding incompleto → zero cards de setup; criar booking público → notification row com `user_id` do staff (`team_members.staff_user_id`) ou canal equivalente documentado.
5. Screenshots 390 staff dashboard.

**Nota de canal hoje:** tabela `notifications.user_id` é text do tenant/owner em vários fluxos — Package A deve **definir** modelo additive (ex. `recipient_user_id` ou `notifications` por `staff_user_id`) sem quebrar owner.

### Pacote B — Realtime aceite → confirmado (Wave 1)

**OWN ONLY:**
- `pages/ClientArea.tsx` (subscription / display de status — coordenar via hook compartilhado)
- `components/ClientBookingCard.tsx` (badge + updates)
- `hooks/useClientAppointmentRealtime.ts` (**CREATE OK**)
- Migration additive: `ALTER PUBLICATION supabase_realtime ADD TABLE public_bookings;` (+ RLS SELECT para o cliente autenticado por telefone/session existente)
- Reusar padrões de `hooks/useQueueRealtime.ts`

**NÃO TOCAR:** WhatsApp builders, onboarding collab, policy settings UI.

**Acceptance:**
1. Manager/pro aceita → UI cliente muda para **Confirmado** **sem reload** (espelhar fila).
2. Root-cause fix: publication realtime (hoje ausente) + verificar se filtro `customer_phone=eq.` normaliza dígitos igual à session.
3. Mobile 390×844 ok; sem regressão abas histórico/clube.
4. Copy pending ≠ confirmado (bug histórico corrigido neste pacote se ainda aparecer no card).
5. Teste Playwright: mock/realtime ou wait por status após RPC accept.

### Pacote D — WhatsApp pré-fill dinâmico (Wave 1)

**OWN ONLY:**
- `components/ClientWhatsAppFAB.tsx`
- `utils/publicBookingCopy.ts` e/ou `utils/clientWhatsAppCopy.ts` (**CREATE OK**)
- Touch mínimo em ClientBookingCard/ClientArea só para props do CTA

**Acceptance:**
1. Prefill usa `profiles.business_name` (ou nome carregado na session) — **nunca** “Barbearia Silva” hardcoded.
2. Texto base (ajustar pt-BR à voz do produto):  
   `Olá! Acabei de agendar online em {establishmentName} — {service} com {professional} em {date} às {time}. Pode confirmar o meu horário, por favor?`
3. `wa.me` com encode; tom profissional.
4. Unit test do builder com nomes com acentos/emoji.

### Pacote C — Estados de saída + CTA próximo horário + copy clube + clear EOD (Wave 2)

**OWN:** ClientArea messaging pós-status, helpers de copy, clear agendado do CTA “próximo horário”.

**Acceptance:**
1. Estados Finalizado / Não compareceu / Cancelado visíveis com mensagem clara (preferencialmente realtime).
2. CTA **Agendar próximo horário** após finalizado; se não usado, job/EOD (client-local midnight tenant TZ **ou** flag `next_cta_expires_on date`) volta para **Agendar horário**.
3. Se `membership_plans` ativos no tenant: copy adaptativa por cenário (4 variantes mínimas) — sem lorem/genérico.
4. Sync `appointments` → `public_bookings` para complete/NoShow/cancel (RPC `_v2` additive).
5. Screenshots dos 4 estados + CTA.

### Pacote E — Políticas ajustáveis + pay-upfront/depósito (Wave 2)

**OWN:** settings UI (`pages/settings/PublicBookingSettings.tsx` + possíveis novos), migrations additive, RPCs cancel/edit acceptance queue, payment gate no `PublicBooking` / `create_public_booking`.

**Stripe approach (depósitos):**
1. Hoje Stripe = checkout de **assinatura AgendiX** apenas.
2. Para depósitos de cliente: nova Edge Function `create-booking-deposit-session` (CREATE) usando Stripe Checkout `mode=payment` (ou PaymentIntent), metadata `{ public_booking_id, company_id, mode: deposit|full }`.
3. Preferência BR fase 1: se Stripe Connect do salão **não** existir, oferecer **Pix manual** (chave já em `business_settings.pix_*`) como garantia “marcar como sinal recebido” pelo manager — e Stripe card quando Connect estiver pronto.
4. **Decisão aberta:** Stripe Connect Express por salão vs cobrança na plataforma com transfer — default recomendado: **Connect Express** (salão é merchant); até lá, gate “sinal via Pix” + flag paid em `public_bookings`.
5. Colunas additive sugeridas em `public_bookings`: `payment_status text default 'none'`, `deposit_amount numeric`, `stripe_checkout_session_id text`, `paid_at timestamptz`.
6. Regras manager: no-show forfeit / cancel refund — enums acima; documentar no settings com copy clara.
7. Antecedência: reutilizar `booking_lead_time_hours` + UI presets 8/16/24 + custom.

**Acceptance:**
1. Manager configura modo none/deposit/full + valor; cliente bloqueado de confirmar slot sem pagar quando exigido.
2. Cancel/edit respeitam janelas; edit time/pro → pending + notify.
3. Testes RPC + Playwright happy path; sem regressão create_secure_booking.
4. Sem secrets no client; webhook Stripe verifica assinatura.

### Pacote G — Regression guard (paralelo, obrigatório)

**OWN:** análise read-only + `REGRESSION_GUARD.md` na feature branch.

**Deve verificar:** Agenda, Fila digital, Public booking, Financeiro, Clube, CRM, Auth/roles, Stripe subscription, RLS existentes, Services (PRs #88–#90).

**Block merge** em qualquer NO-GO de DB/cross-area.

## 6. Canais de notificação disponíveis hoje

| Canal | Estado | Uso neste overhaul |
|---|---|---|
| In-app `notifications` | Existe | Pacote A (staff) + aceite/edit |
| SmartNotifications (oportunidades CRM) | Existe; owner-oriented | Não reutilizar para booking ops |
| WhatsApp wa.me pré-fill | Existe (cliente) | Pacote D |
| Edge `send-appointment-reminder` | Existe | Fora do escopo imediato; não quebrar |
| Email/SMS nativo | Não productizado | Fora |
| Realtime Supabase | Só `queue_entries` publicado | Pacote B adiciona `public_bookings` |
| Stripe webhook | Assinatura | Pacote E estende com cuidado |

## 7. Plano de testes

| Pacote | Testes |
|---|---|
| A | Unit role gating; e2e staff dashboard sem SetupCopilot; notification insert |
| B | e2e accept → badge Confirmed sem reload; publication presente; pending copy |
| D | unit copy builder; e2e abre wa.me URL com nome correto |
| C | e2e estados saída; CTA EOD clear (clock mock); club copy variants |
| E | unit policy math; RPC cancel fora da janela falha; deposit session metadata; refund policy flags |
| G | smoke Agenda/Fila/Finance/Clube/PublicBooking |

Visual: Playwright critique 390×844 e 1280; temas barber/beauty.

## 8. Validator (≥9) e code review

Herdado do ORCHESTRATION:
- Correção vs acceptance
- Sem role leakage
- Mobile polish Impeccable
- Testes green
- Sem secrets; copy PT na voz
- PR lista files + QA steps
- Reviewer separado → BLOCKERS → fix loop até GO + validator ≥9
- DB additive-only; `_v2` / optional params; nunca touch schemas alheios

## 9. Decisões abertas (máx. ~5) + default

1. **Stripe Connect vs Pix-first para sinal?** → **Pix-first + flag manual no MVP do Pacote E**; Stripe Connect na sequência (evita bloquear BR sem KYC).
2. **Quem recebe notificação de booking online?** → **Owner + profissional atribuído** (setting para “toda a equipe” off por default).
3. **Como modelar `in_progress` no cliente?** → **Sim no MVP wave 2 (C)**; wave 1 pode mapear só pending/confirmed + exit states se Agenda ainda não emite started.
4. **Clear do CTA “próximo horário”:** client midnight no TZ do tenant (`profiles.region`/locale) vs cron server → **client-side por data local do estabelecimento** no MVP (simples); cron v2.
5. **Edição só de serviço sem aceite:** default **false** (sempre aceite) para reduzir surpresa operacional; manager pode ligar.

## 10. Ordem de entrega sugerida

1. Abrir `feat/client-collab-booking-overhaul` de `main`.
2. Wave 1 paralelo: A, B, D + G.
3. Integrar, validator, review.
4. Wave 2: C depois E (E depende de estados estáveis e settings).
5. Regression GO → merge `main` (orquestrador; **não** neste PR de docs).

## 11. Self-review

| Critério | Nota |
|---|---|
| Clareza | 9 — fluxo, bugs, pacotes e decisões Rhian carregados |
| Implementabilidade | 9 — ownership, acceptance, Stripe approach, gaps realtime |
| Grounding | 9 — paths pós #88–#90; publication realtime verificada; Stripe só SaaS |
| Completude vs ORCHESTRATION | 9 — A/B/C/D/E/G preservados |

**Score: 9/10.** Residual: Connect Stripe detalhe de conta por tenant fica para spike curto no início do Pacote E.
