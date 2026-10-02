# Inventário read-only — landing + seed + prints (AgendiX)

**Data:** 15 Set 2026  
**Repo:** `rhianlepore001/Rhian-Lepore`  
**Default:** `origin/main` @ `77baa9f` (`merge: remove forma de pagamento do modal de adicionar à fila (#67)`, 14 Set 2026)  
**Produção:** https://agendixstudio.com (Vercel, HashRouter)  
**Âmbito:** inventário. **Não** reescreve landing. **Não** propõe merge da branch antiga. **Não** contém secrets.

Uso para Bob: coordenar **(A)** rebuild da landing em cima da `main`, **(B)** seed de conta demo, **(C)** prints novos do produto real.

---

## starting_ref (obrigatório)

| Uso | Ref | Por quê |
|---|---|---|
| **Código novo da landing** | `origin/main` (sempre) | Branch antiga está **210 commits atrás** e altera rotas/onboarding/trial em código que a `main` já evoluiu. |
| Assets (vídeo/imagem/copy) | `origin/feat/landing-publica-nichos` — **só leitura / cherry-pick de arquivos** | Vídeos e copy úteis; o TSX da landing é mock CSS, não product shots. |
| Seed / schema | migrations da `main` + banco vivo `BARBER/Beauty OS` | Schema de fila v2, clube, produtos e Pix/MB WAY **não existia** no merge-base da landing (2 Ago 2026). |

**Não usar** `feat/landing-publica-nichos` como base de branch. Recriar `pages/Landing.tsx` a partir da `main`. Copiar assets pontuais se o dono validar.

---

## 1) Branches relacionadas a landing / marketing / sales / demo

Default = `origin/main`. Ahead/behind = `git rev-list --left-right --count origin/main...<branch>` → `main...branch` = (commits só na main / só na branch).

| Branch | Tip | vs `main` | Tipicidade | Notas |
|---|---|---|---|---|
| `origin/feat/landing-publica-nichos` | `2f93389` 6 Set 2026 — *registra critique de design da landing* | **210 atrás / 8 à frente** | **A landing antiga.** Única branch de sales page. | Merge-base `b56a754` (2 Ago 2026). Os 8 commits únicos: 3 de landing + 5 de produto (equipe/comissões/tour) **já superados na main** — não cherry-pickar esses 5. |
| `origin/cursor/planos-assinatura-mvp-eccf` | 11 Set 2026 | 6 atrás / 3 à frente | Pricing SaaS (Solo/Equipe), não LP | Quase na main; a tela `SubscriptionSettings` na main **já tem** os preços. Útil só se Bob for alinhar copy de plano. |
| `origin/cursor/test-accounts-adm-themes-f93f` | 2 Set 2026 | 154 atrás / 3 à frente | Contas de teste / temas para prints | Não é landing. Tooling de e2e/dev. **Não** usar como base. |
| `origin/design/ux-pro-sweep` | 2 Ago 2026 | 212 atrás / 0 à frente | Sweep UX antigo | Ancestral do merge-base da landing. Irrelevante para código novo. |

Nenhuma outra remote (52 no total) tem `landing|marketing|sales|lp|website` no nome. Commits com “landing” no histórico: só os 3 desta feat.

**Commits únicos da landing (não mergear o lote):**

1. `4df37f2` — assets de vídeo + refs Higgsfield + `research/landing-anchor.md`
2. `72e0475` — `pages/Landing.tsx` + `components/landing/*` + trial 20 dias no produto daquela branch
3. `2f93389` — critique Impeccable (`.impeccable/critique/…pages-landing-tsx.md`)

---

## 2) Marketing na `main` hoje (o que o visitante vê)

**Não há sales page.** Visitante anônimo em `/` cai no `ProtectedLayout` → redirect `#/login`.

| Rota (HashRouter: `/#/…`) | Página | Papel marketing |
|---|---|---|
| `/login` | `pages/Login.tsx` | **Gateway público atual.** Copy: *“O sistema que trabalha enquanto você atende.”* Cards Barbearia (Unsplash) × Salão (`/mulher-studio.png`). CTA *“Criar conta — 10 dias grátis”*. |
| `/register` | `pages/Register.tsx` | Cadastro dono (`?type=barber\|beauty`) ou staff (`?company=&member=`). |
| `/termos` `/privacidade` | `pages/Legal.tsx` | LGPD. Termos dizem **10 dias** de teste. |
| `/forgot-password` `/update-password` | auth | — |
| `/book/:slug` | `PublicBooking` | Mini-landing **do salão**, não do SaaS. |
| `/queue/:slug` `/queue-status/:id` | fila pública | Cliente final. |
| `/minha-area/:slug` | `ClientArea` | Área do cliente (tema do estabelecimento). |
| `/clube/:slug` `/clube` | `JoinClub` | Clube público. |
| `/pro/:slug` | portfólio profissional | Depende de `team_members.slug`. |
| `/club-demo` `/dashboard-cockpit-demo` `/finance-chart-demo` | fixtures locais, **sem login** | Demos internas de UI. **Não** usar como sales page (dados mock, rotas não linkadas no gateway). |
| `/configuracoes/notificacoes` | `Placeholder` | “Em desenvolvimento”. |
| `/marketing` | **não existe** na main | Página antiga removida. Tabelas `campaigns` / `content_calendar` / `marketing_assets` existem no banco e estão vazias/quase vazias. |

`index.html` (produção): title *“AgendiX — Gestão do seu salão”*; OG title *“O sistema que faz seu negócio crescer”*; `og:url` ainda aponta para **`https://agendix.app/`** (domínio antigo). Imagem OG: `/logo-agendix-app.png`.

Na branch antiga, `/` **era** a `Landing` e o dashboard autenticado usava path `/dashboard` — incompatível com a main atual (`/` = Dashboard).

---

## 3) MVP feature inventory (o que o app **realmente** faz)

Fonte: `App.tsx`, `constants.ts` (`NAVIGATION_ITEMS` / `SETTINGS_ITEMS`), páginas em `pages/`, Edge Functions, schema vivo.

### Auth e conta

- Supabase Auth (email/senha). Sem Clerk.
- Papéis: **owner** e **staff** (staff via convite `/#/register?company={ownerUserId}&member=`).
- Temas: `barber` (dark industrial) e `beauty` (elegante); modo dark/light; região `BR` (R$) ou `PT` (€).
- Onboarding wizard 6 passos: negócio → serviços → equipe → horários → meta → sucesso (`OnboardingWizard`).
- Staff onboarding separado.
- SetupCopilot no Dashboard (checklist de ativação, inclusive link público).
- Trial **10 dias** gravado em `profiles.trial_ends_at` no `register` (`AuthContext.tsx`). Banner + tela Plano AgendiX. Paywall no layout quando expira.
- Assinatura SaaS via **Stripe Checkout** (`supabase/functions/create-checkout-session`). Planos na UI:

  | Plano | BR | PT |
  |---|---|---|
  | Solo | R$ 34,90/mês | € 9,90/mês |
  | Equipe | R$ 59,90/mês | € 19,90/mês |

  Features listadas na tela: agenda ilimitada, CRM, booking online, relatórios; Equipe adiciona profissionais, comissões, relatórios avançados, Clube. Price IDs hardcoded em `SubscriptionSettings.tsx`.

### Operação (sidebar)

- **Início** `/` — cockpit: receita do dia, meta, agenda de hoje, fila, horários livres, sparkline 7d (dono). Staff vê concluídos/pendentes/comissões.
- **Agenda** `/agenda` — grade por profissional, criar/editar/concluir/cancelar, checkout (Pix/dinheiro/débito/crédito/clube), taxa de maquininha, produtos no atendimento, copiar link público, aceitar/recusar `public_bookings`.
- **Fila Digital** `/fila` + `/fila/historico` — senha, chamada, prazo, checkout, Pix/MB WAY “já paguei”, walk-in ou cliente do CRM, realtime. Público: `/queue/:slug`.
- **Clientes** `/clientes` + `/clientes/:id` — CRM (owner): cadastro, telefone, aniversário, notas, histórico. Sem módulo de marketing/campanhas na UI.
- **Equipe** `/configuracoes/equipe` — profissionais, convite, comissão, exclusão lógica (`deleted_at`).
- **Produtos** `/produtos` — catálogo, estoque, venda no atendimento (`product_sales` / `appointment_product_lines`). Poucas linhas no banco vivo (catálogo raso).

### Crescimento

- **Financeiro** `/financeiro` — receitas/despesas (`finance_records.type` = `revenue` \| `expense`), gráfico de fluxo, detalhe do lançamento, aba **Comissões** (acerto, pagamento).
- **Análises** `/insights` (owner) — meta, ranking, cancelamentos, slots vazios, export CSV/PDF. Staff: `/meus-insights`.
- **Clube** — planos do estabelecimento (`membership_plans`), assinantes, Pix BR + MB WAY PT, área pública `/clube/:slug`, CTA no booking. Pix do clube = chave **do negócio** cadastrada pelo dono (não split automático por profissional).

### Superfícies públicas (cliente final)

- Agendamento pelo **link** (`business_slug`), sem app nativo.
- Fila pelo link.
- Minha Área (sessão por WhatsApp/telefone).
- Portfólio `/pro/:slug` se o profissional tiver slug.
- Opt-in de “lembretes por WhatsApp” no booking — **só checkbox**. Envio WhatsApp/e-mail **não** está ligado ao fluxo real.

### Ajustes

- Geral, agendamento público (slug, lead time, cupos), equipe/comissões, serviços + categorias, Clube, Plano AgendiX, segurança.
- Notificações = placeholder.
- Auditoria / lixeira / UI preview = só `VITE_DEV_EMAIL`.

### O que existe em código mas **não** é MVP visível

- `AIAssistantChat` / `useAIAssistant` / `useContentCalendar` / OpenRouter — **não montados** em rota. Pós-MVP.
- `SmartRebooking` — componente existe, **não** está no Dashboard atual.
- Edge `send-appointment-reminder` — consulta tabela `bookings` que **não existe**. Não vender lembrete automático.
- Tabelas RAG / `ai_knowledge_base` / `aios_*` — vazias ou legado.
- Demos `/club-demo` etc. — fixtures, não produto logado.

### Multi-tenant (para seed)

Não há tabela `companies`. O tenant é `profiles.id` (TEXT, UUID-as-text).

| Conceito | Coluna real |
|---|---|
| Dono / empresa | `profiles.id` = `auth.users.id`; `profiles.company_id` do dono = o próprio id |
| Staff | `profiles.company_id` → id do dono; `team_members.staff_user_id` |
| Agenda, CRM, serviços, financeiro, clube | `user_id` = id do dono |
| Fila, booking público, public_clients | `business_id` = id do dono |
| Produtos / product_sales | `company_id` (**uuid**) = id do dono |
| Onboarding | `onboarding_progress.company_id` |

Query sem o filtro de tenant volta vazio (RLS), não erro.

---

## 4) Claims seguros vs o que **não** inventar

Posicionamento pedido pelo Rhian: *“o serviço que faz o seu salão crescer”*. OG já usa variação (*“faz seu negócio crescer”*). Trial futuro: **20 dias** (ainda não no produto).

### Pode afirmar (produto na main)

- Agenda do salão no celular, por profissional, com checkout no fim do atendimento.
- Cliente agenda pelo **link**, no navegador, sem baixar app.
- Fila digital (QR/link) + gestão no painel, inclusive walk-in.
- CRM de clientes do estabelecimento.
- Equipe com convite e comissões.
- Financeiro (entradas/saídas) e acerto de comissão.
- Venda de produto no atendimento.
- Clube de assinatura com Pix (BR) e MB WAY (PT), chave cadastrada pelo dono.
- Dois visual/vocabulários: barbearia e salão; Brasil e Portugal (moeda e método).
- Começar **sem cartão** (cartão só no Stripe, na hora de assinar).
- Planos **por estabelecimento** (Solo vs Equipe), não marketplace.
- Termos/privacidade publicados.

### Só depois de mudar o produto (senão é mentira hoje)

- **“20 dias grátis”** — main = **10 dias** (`AuthContext`, Login, Legal). A landing antiga já pintou 20; a spec dela exigia mudar o produto **junto**. Até o trial no banco ser 20, a LP nova deve dizer 10 **ou** o trial tem que ser alterado no mesmo PR.
- Depoimentos, números de clientes, “+X% faturamento”, “usado por N salões”.
- Lembretes WhatsApp/e-mail automáticos.
- IA, calendário de conteúdo, campanhas de marketing, reativação automática (código morto / não montado).
- App iOS/Android nativo (é PWA web).
- Google Reserve / marketplace / “Reserve with Google”.
- “Pix cai no bolso do profissional, zero intermediação” como está no FAQ da landing antiga: o Pix do Clube/fila é a **chave do estabelecimento**. Comissão é acerto interno, não split Stripe Connect.
- “Sem cobrar por profissional extra” sem ressalva: Equipe custa mais que Solo. Dizer “não cobramos por cadeira à parte; há plano Equipe” é mais honesto.
- Prova social (`SOCIAL_PROOF_ENABLED = false` na branch antiga — deliberado).
- Comparativos jurídicos (“o dobro do Trinks”, “sem pedir cartão” vs concorrente) — `research/landing-anchor.md` já pede validação legal.
- Prints da UI antiga como se fossem o app de Set 2026 (fila v2, agenda overlay, financeiro compacto, clube).

### Copy reutilizável da landing antiga (rascunho, não merge)

Neutro: *“Mais tempo atendendo. Menos tempo operando.”* / *“Agenda, equipe, fila e caixa em um fluxo que acompanha o seu negócio.”*

Barbearia: *“Agenda cheia. Comissão certa. Zero planilha.”*  
Salão: *“Sua equipe agenda. Seu caixa fecha. Você dorme tranquila.”*

FAQ seguro: cliente **não precisa de app**; produtos no balcão; link público. FAQ a **revisar**: Pix “no bolso do profissional”; “lembretes reduzem faltas” (opt-in existe, envio não).

---

## 5) Inventário de assets — `origin/feat/landing-publica-nichos`

Estrutura de seções (só para o brief; **não** reusar o CSS/JS como base):

1. `HeroIntro` — headline + CTA 20 dias + ledger Agenda/Equipe/Caixa + vídeo de atmosfera  
2. `SocialProof` — desligado  
3. `NicheGate` — seletor barbearia × salão  
4. `NicheTrailBarber` / `NicheTrailBeauty` — dores + features com `ProductVisual`  
5. `LandingFaq`  
6. CTA final + `StickyCta`  
7. `SEOHead` (JSON-LD SoftwareApplication + FAQ)

`ProductVisual` **não usa screenshot**. É um mock CSS (“AO VIVO” + barras). Prints reais terão que ser capturados depois do seed.

### 5.1 Só nesta branch (cherry-pick de arquivo, se validado)

| Path | Tamanho | Descrição | Reuso |
|---|---|---|---|
| `public/landing/videos/loop-hero-720.mp4` | 375 KB | Loop atmosfera neutra 720p H.264 | **Sim**, LP (muted loop) |
| `public/landing/videos/loop-hero-720.webm` | 332 KB | Idem VP9 | **Sim** |
| `public/landing/videos/loop-hero-poster.webp` | 48 KB | Poster | **Sim** |
| `public/landing/videos/loop-barber-720.mp4` | 292 KB | Loop barbearia | **Sim**, trilha barber |
| `public/landing/videos/loop-barber-720.webm` | 313 KB | | **Sim** |
| `public/landing/videos/loop-barber-poster.webp` | 55 KB | | **Sim** |
| `public/landing/videos/loop-beauty-720.mp4` | 275 KB | Loop salão | **Sim**, trilha beauty |
| `public/landing/videos/loop-beauty-720.webm` | 300 KB | | **Sim** |
| `public/landing/videos/loop-beauty-poster.webp` | 35 KB | | **Sim** |
| `research/higgsfield-loops/loop-hero-raw.mp4` | 5.2 MB | Master Higgsfield | Pesquisa; não servir na LP |
| `research/higgsfield-loops/loop-barber-raw.mp4` | 4.9 MB | Master | Idem |
| `research/higgsfield-loops/loop-beauty-raw.mp4` | 3.6 MB | Master | Idem |
| `research/agendix_ref_barber_counter_pix_v2.png` | 4.8 MB | Ref IA balcão + Pix (sem marca) | **Pendente validação do dono**; não publicar sem inspeção |
| `research/agendix_ref_beauty_salon_owner_v2.png` | 5.0 MB | Ref IA dona + tablet | Idem |
| `components/landing/content.ts` | — | Copy trilhas + FAQ | Rascunho; alinhar trial e Pix |
| `research/landing-anchor.md` | — | Decisões visuais, prompts, o que **não** usar | Brief |
| `specs/active/SPEC-landing-interativa-nichos.md` | — | Spec (CTA no topo, sem Three.js, sem scroll-jack) | Brief; gates de 20 dias estão desatualizados vs main |
| `.impeccable/critique/2026-08-30T14-28-07Z__pages-landing-tsx.md` | — | Critique de design | Relatório interno |

### 5.2 Já na `main` (não precisa da branch antiga)

| Path | Tamanho | Uso atual | Reuso LP |
|---|---|---|---|
| `public/logo-agendix-icon.png` | 369 KB | Logo dark (sidebar) | Header LP |
| `public/logo-agendix-light.png` | 1.3 MB | Logo claro | Header light |
| `public/logo-agendix-app.png` | 1.3 MB | Favicon / OG | OG; pesado — gerar versão 1200×630 |
| `public/logo icon.png` | 1.5 MB | (espaço no nome) | Evitar; preferir os outros |
| `public/mulher-studio.png` | 1.9 MB | Card Salão no gateway de login | Possível hero beauty **se** o dono quiser a mesma foto |
| `public/assets/barber/icon-minimal.svg` | — | Ícone nicho | Sim |
| `public/assets/beauty/icon-minimal.svg` | — | Ícone nicho | Sim |

Login **barbearia** usa Unsplash (`photo-1503951914875-…`) — stock, não asset próprio.

PWA: `vite.config.ts` cita `pwa-192x192.png` / `pwa-512x512.png` / `favicon.ico` — **não estão** em `public/` na main.

### 5.3 Screenshots de produto (main) — **não** publicar direto

`agendix-e2e-test/03-testes/e2e-jornada/screenshots/` (22 PNG, desktop+mobile): dashboard, agenda, fila, CRM, produtos, financeiro, insights, ajustes (geral/equipe/serviços), public-booking.

- UI **anterior** a fila v2 / polish de agenda-financeiro / clube (captura de jornada antiga).
- Podem vazar nomes/valores da conta de teste.
- Uso: referência de *quais telas* fotografar de novo, não hero da LP.

`docs/ux-pro/` na main tem centenas de PNG de auditoria (barber/beauty × dark/light × 390/1440). Mesmo problema: UI de Ago/2026 + dados de teste. A landing-anchor cita `e2e/screenshots/landing-refs/light-beauty-strategic/` — **esse diretório não está no git**.

JPGs citados no anchor (`vip_subscription_club_*`, `hero_app_barber_*`, etc.) **não estão no git**.

---

## 6) Schema para conta demo + gaps de seed

Banco de produção inspecionado (projeto Supabase **BARBER/Beauty OS**, read-only). Staging `AgendiX Staging` está **INACTIVE**.

### 6.1 Tabelas que a demo precisa

Ordem prática (FKs):

1. `auth.users` + `profiles` (dono: `role=owner`, `company_id=id`, `user_type`, `region`, `business_name`, **`business_slug`**, `public_booking_enabled`, `subscription_status`, `trial_ends_at` ou `active`)
2. `onboarding_progress` (`is_completed=true`) + `business_settings` (horários JSON, fila, Pix/MB WAY, taxas)
3. `team_members` (incluir `is_owner=true` para o dono + 2–3 ativos; `slug` se for mostrar `/pro/:slug`; não esquecer `deleted_at` null)
4. `service_categories` + `services` (`active`, `duration_minutes`, `price`, `category_id`)
5. `clients` (`phone` realista, alguns com `birth_date`)
6. `appointments` — **hoje + passado + futuro**; status `Confirmed|Pending|Completed|Cancelled|NoShow`; `professional_id`, `origin` (`agenda`/`booking`/`queue`)
7. `finance_records` — `type` `revenue`/`expense`, vários meses, `payment_method` pix/cash/debit/credit
8. `products` (`company_id`) + 1–2 `product_sales` se quiser financeiro de produto
9. `membership_plans` (1 ativo + 1 inativo) + `client_memberships` (active/pending/overdue)
10. `public_bookings` **pending** (banner de solicitações na Agenda/Dashboard)
11. `public_clients` (Minha Área / booking)
12. `queue_entries` **de hoje** com schema **v2**: `payment_status`, `ticket_status`, `duration_minutes`, `service_id`, `client_id` opcional; 1–2 `queue_payments` se for mostrar Pix
13. `goal_settings` (meta do mês) — senão Análises/Dashboard ficam vazios
14. Opcional prints: `commission_payments`, `pix_payments` (clube)

Não precisa (e não deve poluir demo): `bug_reports`, `system_errors`, RAG, `aios_*`, `campaigns`, `hair_records` (0 linhas no prod).

### 6.2 Scripts que já existem (incompletos)

| Artefato | Estado | Furo vs produto atual |
|---|---|---|
| `agendix-e2e-test/06-template-setup/scripts/seed.mjs` | Idempotente; login anon+RLS; cria team/services/clients/appointments/fila rasa | Hardcoded `bob.teste@gmail.com`. **Não** seta slug. **Não** semeia financeiro, clube, produtos, `public_bookings`, categorias, horários, onboarding completo, campos fila v2. Agendamentos aleatórios (não garante grade de hoje). Fila sem `payment_status`/`ticket_status` pode quebrar insert. |
| `docs/ux-pro/SEED.md` | Plano (Ago 2026), **não executado** | Melhor spec de gaps. Ainda não cobre fila v2, Pix/MB WAY, `origin`, dois temas (barber+beauty). |
| `scripts/check-test-account.mjs` | Diagnóstico | Seleciona `profiles.business_type` (coluna real é `user_type`) — script stale. |

**Aviso:** `.env.local` do time aponta para o **Supabase de produção**. Seed sem tenant dedicado mistura dado fictício com salões reais. Não rodar `seed.mjs` “na conta que aparecer”.

### 6.3 Gaps para seed fictício **consistente** (checklist Bob)

- [ ] Conta demo **separada** (não tenant de cliente). Preferível **duas**: `user_type=barber` e `user_type=beauty` (prints 4 combos tema×modo precisam de `VITE_DEV_EMAIL` ou dois profiles).
- [ ] `business_slug` estável e único (`ex.: studio-demo-barber`) — sem isso booking/fila/minha-área/clube públicos 404.
- [ ] `public_booking_enabled=true` + horários em `business_settings.business_hours` alinhados à grade da Agenda.
- [ ] `onboarding_progress.is_completed` + `profiles.tutorial_completed` + `activation_completed` — senão o wizard/copilot cobrem os prints.
- [ ] Agendamentos **de hoje** 08h–19h com mistura de status (incluir `NoShow`). Passado para Análises; futuro para a grade não parecer morta.
- [ ] `finance_records` em ≥2 meses; `payment_method` variado.
- [ ] 1 plano de clube ativo + 1 assinante `active` (e um `pending` se for mostrar Pix).
- [ ] Chave Pix **fictícia** em `business_settings` (BR) **ou** `mbway_phone` (PT) — nunca chave real de cliente.
- [ ] Fila **só de hoje**, status `waiting`/`calling`/`serving`, `payment_status` válido (`unpaid`/`paid`/`membership`).
- [ ] 2–3 `public_bookings` `pending` para o fluxo Aceitar.
- [ ] Produtos ≥3 se a LP falar de balcão (hoje o prod tem catálogo raso).
- [ ] Nomes/fotos **fictícios**; nada de PII de produção nos prints.
- [ ] `team_members.slug` se for printar `/pro/:slug`.
- [ ] Não depender de `nps_responses` (não existe).
- [ ] Assinatura: `subscription_status='active'` na demo evita Paywall/banner de trial nos prints.

Seed antigo (`seed.mjs`) **não** fecha essa lista. Tratar como ponto de partida, não como entregável.

---

## 7) Como rodar localmente / preview

Não há `supabase/config.toml` no repo — **não** há stack local documentada. O app fala com o projeto Supabase configurado nas env.

```bash
# Node 18+ (package.json não pinna engines)
npm install
cp .env.example .env.local   # preencher; NUNCA commitar
npm run dev                  # Vite --host → http://localhost:3000
npm run preview              # depois de build; porta default Vite 4173
```

| Script | Função |
|---|---|
| `npm run dev` | Dev server, `host: 0.0.0.0`, porta **3000** (`vite.config.ts`) |
| `npm run build` | `vite build` → `dist/` |
| `npm run preview` | Preview do bundle |
| `npm run typecheck` / `lint` / `test` | Gates (lint falha em warning) |
| Playwright | `npx playwright test` — `playwright.config.ts` sobe `npm run dev` em `:3000` |

### Env (nomes apenas — sem valores)

**Obrigatório para o app abrir** (senão `lib/supabase.ts` joga erro / tela preta):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Stripe (checkout real):** `VITE_STRIPE_PUBLISHABLE_KEY` (front) · `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (só Edge, nunca no bundle).

**Opcional / pós-MVP:** `VITE_OPENROUTER_API_KEY`, `VITE_GEMINI_API_KEY`.

**Só scripts Node / Edge — nunca `VITE_`:** `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.

**Dev UI** (auditoria, lixeira, switcher de tema): `VITE_DEV_EMAIL` (e-mail da sessão). Sem isso, prints “como o dono vê” não mostram chrome de dev — o que é **melhor** para marketing.

**E2E:** `E2E_BASE_URL` (default `http://localhost:3000`), `E2E_OWNER_EMAIL` / `E2E_OWNER_PASS`, `E2E_STAFF_*`. Seed legado: `SEED_PASSWORD` (não commitar).

Deploy: Vercel, push em `main`. Preview de PR é o caminho certo para a landing nova. Hash nas rotas: links `/#/login`, `/#/register`, `/#/book/:slug`.

---

## 8) Recomendações para Bob (ordem, sem implementar aqui)

1. **Branch de implementação** a partir de `origin/main` (não da feat de landing).
2. **Trial:** decidir 10 (copy honesta hoje) vs 20 (mudar `AuthContext` + Legal + Login **no mesmo PR** da LP). Spec antiga assume 20; produto não.
3. **Cherry-pick só arquivos de mídia** `public/landing/videos/*` (+ posters). Recusar merge do TSX. Reescrever `Landing` com tokens/DS atuais; `ProductVisual` mock **não** substitui print.
4. **Seed em tenant demo isolado** cobrindo a checklist §6.3. Não usar `seed.mjs` contra produção sem filtro de tenant novo.
5. **Prints novos** (mobile 390 + desktop 1440, barber e beauty): Dashboard, Agenda com grade de hoje, Fila, Booking público (`/#/book/{slug}`), Financeiro, Clube. Anonimizar. Não reciclar PNGs de `agendix-e2e-test` nem `docs/ux-pro` na LP.
6. **Validar** loops Higgsfield e as duas refs `agendix_ref_*_v2.png` com o dono antes de uso público (IA, sem texto — ainda assim inspecionar).
7. **SEO:** trocar `og:url` `agendix.app` → `agendixstudio.com` quando a LP existir; OG image dedicada (logo 1.3 MB não é card).
8. **Não** ligar prova social até ter depoimento real. Manter `SOCIAL_PROOF` off.
9. Gateway de login pode continuar como passo 2; a LP deve ser `/` para anônimo e o Dashboard `/` só autenticado (padrão da feat antiga, mas reimplementado na main).

---

## Apêndice A — Rotas autenticadas (mapa rápido)

`/` Início · `/agenda` · `/fila` · `/fila/historico` · `/clientes` · `/clientes/:id` · `/produtos` · `/financeiro` · `/insights` · `/meus-insights` · `/configuracoes/geral|agendamento|equipe|servicos|assinatura|clube|clube/pix|seguranca` · `/clube/assinantes`

Owner-only: clientes, financeiro, insights, ajustes. Staff: início, agenda, fila, produtos, meus-insights.

## Apêndice B — Como puxar um asset da branch antiga sem merge

```bash
git fetch origin feat/landing-publica-nichos
git checkout origin/main -- # estar na branch nova
git checkout origin/feat/landing-publica-nichos -- public/landing/videos/
```

Não checkout de `pages/Landing.tsx` / `App.tsx` / `AuthContext.tsx` dessa branch.
