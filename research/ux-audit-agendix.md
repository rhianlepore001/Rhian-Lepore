# Auditoria Técnica de UX — AgendiX

> **Objetivo:** Auditoria E2E (end-to-end) do produto AgendiX via inspeção de código-fonte, simulando uso real de cada persona (dono, barbeiro, cliente final, recepção).
>
> **Método:** Leitura de 50+ arquivos fonte (páginas, componentes, hooks, services, App.tsx, MEMORY.md, PRODUCT.md, CLAUDE.md). Sem execução runtime.
>
> **Stack:** React 19 + TypeScript 5.8 + Vite 6 + Tailwind (via CDN) + Supabase (Auth + Postgres) + Vercel. HashRouter. Multi-tenant por `company_id`. 263 testes. Tema `barber` (dark) e `beauty` (claro).
>
> **Produção:** https://promptdeelite.com
>
> **Período:** Junho 2026.

---

## Contexto do Produto (de PRODUCT.md)

- **Persona primária:** donos de barbearias e salões de beleza no Brasil (e PT). Mobile-first.
- **Persona secundária:** clientes finais que agendam via link público.
- **Sucesso =** "dono vê de relance: quanto faturou hoje, quem está agendado, se está no lucro ou prejuízo".
- **Anti-referências explícitas:** "planilha Excel com cor", "dashboard genérico de SaaS", "glassmorphism decorativo", "tema lavado", "chatbot lento".
- **Princípios:** mobile-first, ações antes de dados, calma sob pressão, progressive disclosure, consistência cross-tema.

---

## Mapa de Rotas (de App.tsx)

| Rota | Tipo | Componente | Guard |
|---|---|---|---|
| `/#/` | autenticado | Dashboard | sim |
| `/#/agenda` | autenticado | Agenda | sim |
| `/#/fila` | autenticado | QueueManagement | OwnerRouteGuard |
| `/#/clientes`, `/#/clientes/:id` | autenticado | Clients, ClientCRM | sim |
| `/#/produtos` | autenticado | Products | sim |
| `/#/financeiro` | autenticado | Finance | sim |
| `/#/marketing` | autenticado | Marketing | OwnerRouteGuard |
| `/#/insights` | autenticado | Reports | OwnerRouteGuard |
| `/#/meus-insights` | autenticado | StaffInsights | sim |
| `/#/configuracoes/geral` | autenticado | GeneralSettings | OwnerRouteGuard |
| `/#/configuracoes/agendamento` | autenticado | PublicBookingSettings | OwnerRouteGuard |
| `/#/configuracoes/equipe` | autenticado | TeamSettings | OwnerRouteGuard |
| `/#/configuracoes/servicos` | autenticado | ServiceSettings | sim |
| `/#/configuracoes/comissoes` | autenticado | CommissionsSettings | OwnerRouteGuard |
| `/#/configuracoes/assinatura` | autenticado | SubscriptionSettings | OwnerRouteGuard |
| `/#/configuracoes/seguranca` | autenticado | SecuritySettings | OwnerRouteGuard |
| `/#/configuracoes/auditoria` | autenticado | AuditLogs | DevRouteGuard |
| `/#/configuracoes/lixeira` | autenticado | RecycleBin | DevRouteGuard |
| `/#/configuracoes/erros` | autenticado | SystemLogs | DevRouteGuard |
| `/#/configuracoes/ui-preview` | autenticado | UiPreview | DevRouteGuard |
| `/#/configuracoes/notificacoes` | autenticado | **Placeholder** | OwnerRouteGuard |
| `/#/book/:slug` | público | PublicBooking | não |
| `/#/queue/:slug` | público | QueueJoin | não |
| `/#/pro/:slug` | público | ProfessionalPortfolio | não |
| `/#/minha-area/:slug` | público | ClientArea | não |
| `/#/register`, `/#/login` | público | Register, Login | não |
| `/#/onboarding-wizard` | autenticado | OnboardingWizard | sim |
| `/#/onboarding` | autenticado | Onboarding | sim |
| `/#/staff-onboarding` | autenticado | StaffOnboarding | sim |

---

## Análise por Fluxo

### FLUXO 1 — Onboarding & Cadastro

**Arquivos:** `pages/OnboardingWizard.tsx`, `pages/Login.tsx`, `pages/Register.tsx`, `pages/StaffOnboarding.tsx`, `hooks/useOnboardingState.ts`, `components/onboarding/Step*.tsx`.

**5 passos do wizard** (`OnboardingWizard.tsx:38-88`): (1) Bem-vindo, (2) Serviços, (3) Equipe, (4) Meta Mensal, (5) Sucesso.

**Lacuna grave:** `StepBusinessHours.tsx` existe como componente completo mas **NÃO é referenciado** no wizard — pula de Equipe direto para Meta. O horário só é configurado depois em `/configuracoes/geral`. **Implicação:** link público pode ser gerado sem horário definido, exibindo 24h.

| Critério | Avaliação | Evidência |
|---|---|---|
| Entendimento imediato | Login com gateway "Barbearias / Studios" é **brilhante**; Register é formulário denso único | `Login.tsx:99-165` (gateway), `Register.tsx` |
| Intuitivo | `StepBusinessInfo.tsx:97` é alias de `StepWelcome` — nome engana | `pages/onboarding/StepBusinessInfo.tsx:97` |
| Nível técnico | Baixo, mas exige mover-se por 5 passos para configurar pouco | — |
| Fricção | Validação de senha sem barra visual; `WizardProgress` é desktop-first; CTA final aponta para rota inexistente | `Register.tsx:74-79`; `StepSuccess.tsx:42` |
| Etapas desnecessárias | Step 1 (welcome) dispensável; Step 4 (meta) é pulável | `OnboardingWizard.tsx` |
| Escondidas | `PREDEFINED_SERVICES` em `constants.ts:35-52` não é oferecido no wizard | `constants.ts:35-52` |
| Linguagem | Boa, vernácula | — |
| Confiança | Média-alta | — |
| User-friendly | 7/10 | — |
| Cobertura | **Falha operacional**: sem horários, sem preview do link público | — |

**Bugs/inconsistências:**
- `StepSuccess.tsx:42` — link CTA para `/configuracoes/agendamento-publico` (rota inexistente em `App.tsx:192-207`); cai no `Navigate to="/"`
- `OnboardingWizard.tsx:38-88` — pula horário
- `StepBusinessInfo.tsx:97` — alias de `StepWelcome`, nome enganoso
- `Register.tsx:24` — default `userType='barber'` aceita lixo se `?type=` for inválido

---

### FLUXO 2 — Configurações

**Arquivos:** `pages/settings/GeneralSettings.tsx`, `PublicBookingSettings.tsx`, `TeamSettings.tsx`, `ServiceSettings.tsx`, `CommissionsSettings.tsx`, `SubscriptionSettings.tsx`, `SecuritySettings.tsx`, `components/BusinessHoursEditor.tsx`, `SettingsLayout.tsx`.

**Menu items** (`constants.ts:22-34`): Geral, Agendamento, Equipe, Serviços, Comissões, Assinatura, Segurança + 4 dev-only. **Notificações ausente da lista**, embora a rota `/configuracoes/notificacoes` exista e renderize `<Placeholder title="Notificações" />` (`App.tsx:206`).

| Critério | Avaliação | Evidência |
|---|---|---|
| Imediato | Menu lateral desktop, bottom-sheet horizontal mobile | `SettingsLayout.tsx:35-88`, `:123-144` |
| Intuitivo | Bom | — |
| Nível técnico | `BusinessHoursEditor` é poderoso mas conceitualmente denso (blocos) | `BusinessHoursEditor.tsx` |
| Fricção | 3 templates de política de cancelamento sem ajuda sobre qual escolher; `alert()` nativo para upload > 10MB | `GeneralSettings.tsx:49-53`, `:82-97` |
| Desnecessárias | `useEffect` em `GeneralSettings.tsx:75-79` dispara `setHasChanges(true)` no load — provável bug | `GeneralSettings.tsx:75-79` |
| Escondidas | `BusinessGalleryManager`, `BrandIdentitySection` no scroll longo da Geral; sem índice/seções colapsáveis | `GeneralSettings.tsx:9-10` |
| Linguagem | Vernácula, boa | — |
| Confiança | Média — `alert()` quebra a polidez | — |
| User-friendly | 7/10 | — |
| Cobertura | **Lacuna grave em Notificações** | — |

---

### FLUXO 3 — Dono da Barbearia

**Arquivos:** `pages/Dashboard.tsx`, `Agenda.tsx`, `Finance.tsx`, `Marketing.tsx`, `Reports.tsx`, `components/Sidebar.tsx`, `Header.tsx`, `BottomMobileNav.tsx`, `MoreOptionsDrawer.tsx`, `components/dashboard/*`.

**5 segundos no Dashboard** (`Dashboard.tsx:120-198`): "Olá, [nome]" + data + botão "Agendar" → "Faturamento hoje" (R$ X,XX) → Occupancy Rate → "Agenda de hoje" (N) + "Oportunidades" (N) → Meta mensal + Saúde do negócio.

| Critério | Avaliação |
|---|---|
| Imediato | Sim, "quanto faturei hoje" é o primeiro número. Banner "Amanhã é dia de pagar comissões" (`Dashboard.tsx:202`) útil mas pouco proativo |
| Intuitivo | BOM. Hierarquia: faturamento > ocupação > oportunidades > meta. Ações antes de dados ✓ |
| Nível técnico | Baixo |
| Fricção | "Saúde do negócio" usa score 0-100 (`Dashboard.tsx:105-110`) com fórmula opaca (`avgTicket + topService + repeatClient - churnRisk`) — não explica como melhorar. **Engenhoca de vaidade** |
| Desnecessárias | — |
| Escondidas | `Marketing.tsx` é apenas `EmptyState`; `Reports.tsx:65-88` exige >5 appointments (linha 36) — usuário novo vê tela vazia por semanas |
| Linguagem | Boa: "Oportunidades", "Dica para hoje" |
| Confiança | Alta |
| User-friendly | Dashboard 8/10; Marketing 3/10; Relatórios 6/10 |

**Mobile:** `BottomMobileNav.tsx:28-122` tem 5 destinos (Agenda, Clientes, [+], Financeiro/Insights, Mais). Pílula flutuante com botão central "+". Dono vê "Mais"; **staff NÃO** (`:108`). Drawer (`MoreOptionsDrawer.tsx`) tem 8 itens com `ownerOnly` filtrado por role.

---

### FLUXO 4 — Barbeiro (Staff)

**Arquivos:** `pages/StaffInsights.tsx`, `hooks/useMeuDiaData.ts`, `components/CommissionsManagement.tsx`, `StaffEarningsCard.tsx`, `MeuDiaWidget.tsx`.

**Staff vê no Dashboard** (`Dashboard.tsx:141-145`): apenas `<MeuDiaWidget />` + `<StaffEarningsCard />`. Sem "Olá, [nome]" (`:121` esconde PageHeader para staff).

| Critério | Avaliação |
|---|---|
| Imediato | `StaffInsights.tsx:40-258` tem KPIs: agendamentos, comissão, clientes únicos, top serviços. Se `teamMemberId` for null: "Vinculação pendente" (`:106-120`) — jargão técnico confuso para o staff |
| Intuitivo | Médio. "Meus Resultados" OK, mas fragmentado: staff tem que entrar em `/meus-insights` para ver comissão, embora `StaffEarningsCard` no Dashboard já mostre algo |
| Nível técnico | Baixo |
| Fricção | Staff **NÃO** vê Agenda completa por padrão; ação "Confirmar e cobrar" está dentro do `AppointmentEditModal`, não no fluxo principal. RLS role-based ainda em validação manual |
| Escondidas | `CommissionsManagement.tsx` é só owner |
| Linguagem | Média |
| Confiança | Média — depende de o owner ter configurado |
| User-friendly | 6/10 |
| Cobertura | **Lacunas em confirmar-checkout direto, lista de espera, reagendamento pelo staff** |

---

### FLUXO 5 — Cliente Final (Agendamento Público)

**Arquivos:** `pages/PublicBooking.tsx` (1.757 linhas), `components/ClientAuthModal.tsx`, `ChatBubble.tsx`, `PublicBusinessHeader.tsx`, `BookingModeToggle.tsx`, `UpsellSection.tsx`, `pages/ProfessionalPortfolio.tsx`, `pages/ClientArea.tsx`.

| Critério | Avaliação |
|---|---|
| Imediato | `PublicBooking.tsx:99-103` detecta `edit` ou `rebook` via query param. **MAS:** fluxo principal tem `bookingMode: 'chat' | 'quick'` (`:143-144`) e o default é `quick`. O chat mode é **gating opcional** mas o componente existe |
| Intuitivo | Calendário + TimeGrid + serviço + profissional + contato. 4 cliques se `quick`, 5+ se chat |
| Nível técnico | Baixo |
| Fricção | (a) Upload de foto opcional (`:108`); (b) Cancelamento só após confirmação; (c) **precisa de telefone** via `ClientAuthModal` (`:23`) com 2 steps |
| Desnecessárias | — |
| Escondidas | `ProfessionalPortfolio` (`App.tsx:157`) — link não está obviamente no fluxo de booking |
| Linguagem | "Olá! Seja bem-vindo à [nome]" — calorosa |
| Confiança | Média. Tema barber/beauty + fotos + Google reviews (`PublicBooking.tsx:62`) |
| User-friendly | 6/10 |
| Cobertura | **Sem confirmação por WhatsApp/SMS pós-agendamento** (apenas `ChatBubble` in-page); sem política de cancelamento visível; sem "agendar de novo" persistente |

**Inconsistência:** `PublicBooking.tsx:475` — `setAcceptedPolicy(true)` hardcoded em modo edit (pula aceite).

---

### FLUXO 6 — Cancelamentos e Reagendamentos

**Arquivos:** `components/AppointmentEditModal.tsx`, `AppointmentWizard.tsx`, `services/queue.ts`, `services/appointments.ts`, `services/publicBooking.ts`.

| Critério | Avaliação |
|---|---|
| Imediato | Cliente pode reagendar via `PublicBooking.tsx:458-487` (com `requestCancelBooking` + `handleCancelBooking`). Dono pode editar via `AppointmentEditModal` |
| Intuitivo | Fluido |
| Nível técnico | Baixo |
| Fricção | `AppointmentEditModal` é separado do `CheckoutModal` — re-registrar pagamento após editar não é claro |
| Escondidas | Política de cancelamento (`GeneralSettings.tsx:49-53`) só aparece se dono configurou `acceptedPolicy` |
| Cobertura | **Sem no-show automático**, **sem impacto visível em comissão quando staff cancela** |

---

### FLUXO 7 — Pagamentos

**Arquivos:** `components/CheckoutModal.tsx` (428 linhas), `services/finance.ts`, `hooks/useFinance.ts`, `hooks/useScheduling.ts`.

`CheckoutModal.tsx:228-425` tem: campo valor final editável, forma de pagamento (PIX/Dinheiro/Débito/Crédito ou MBWay em PT), taxa de maquininha auto, recebido por, produtos opcionais com carrinho.

| Critério | Avaliação |
|---|---|
| Imediato | Sim |
| Intuitivo | BOM. Validações inline (`:148-200`), erros por campo |
| Nível técnico | Médio. Dono precisa entender "taxa de maquininha" (jargão) |
| Fricção | `calcMachineFee` exige input manual se não houver `financialSettings` — flanco para erro humano |
| Escondidas | **Gorjeta não existe**; **split de pagamento não existe**; **recibo por WhatsApp/email não existe** |
| Cobertura | Sem Stripe/Pix integrado (só registro manual); sem integração TEF |

**Veredicto:** 8/10 — melhor fluxo do app.

---

### FLUXO 8 — Notificações

**Arquivos:** `components/SmartNotifications.tsx`, `hooks/useSmartNotifications.ts`.

`SmartNotifications.tsx:18-157` é **interno** (banner no Dashboard), não transacional. Tipos: `reactivation | gap | vip | upsell | tip` (linha 10-16) + sino `NotificationBell` no header. Botão "Enviar" abre WhatsApp web (`sendWhatsApp` em `useSmartNotifications`).

| Critério | Avaliação |
|---|---|
| Imediato | Aparece no topo do Dashboard como banner expansível |
| Intuitivo | Sim, com cores por tipo |
| Fricção | Sem agendamento/automação — depende do dono abrir o app e clicar manualmente |
| Escondidas | `/configuracoes/notificacoes` é Placeholder (`App.tsx:206`) e **NÃO está em `SETTINGS_ITEMS`** (`constants.ts:22-34`) — invisível na UI mas acessível via URL |
| Cobertura | **Lacuna grave**: zero notificações transacionais (cliente não recebe confirmação por e-mail/WhatsApp/SMS automatizado), zero templates configuráveis, zero cronograma |

---

### FLUXO 9 — Gestão da Agenda

**Arquivos:** `pages/Agenda.tsx` (1.967 linhas), `components/TimeGrid.tsx`, `components/AppointmentEditModal.tsx`, `components/AppointmentWizard.tsx`.

**Versão 2:** mobile = lista cronológica do dia; desktop = grade uniforme; semana fixa; ações staff "Confirmar e cobrar" + "Faltou".

| Critério | Avaliação |
|---|---|
| Imediato | Após fix v2, sim — lista com hora, cliente, serviço, preço, profissional, status |
| Intuitivo | BOM após v2 |
| Fricção | `useFocusTrap` teve bug em `:38-40` do MEMORY corrigido. Staff precisa de permissão de banco para fechar atendimento (pendente) |
| Escondidas | Filtro por profissional, bloqueio de horário estão no código mas descoberta fraca |
| Cobertura | Sem lembrete push ao barbeiro |

**Veredicto:** 8/10.

---

### FLUXO 10 — Relatórios

**Arquivos:** `pages/Reports.tsx`, `StaffInsights.tsx`, `components/ChurnRadar.tsx`, `FinanceInsights.tsx`, `AISemanticInsights.tsx`.

`Reports.tsx:65-88` mostra empty-state "Coletando Dados" enquanto `hasSufficientData` for false (>5 appointments OU profit OU top clients). Após carregar: média por atendimento, crescimento %, top serviços, top clientes.

| Critério | Avaliação |
|---|---|
| Lacunas | **LTV, previsão, comparativo mês-a-mês não implementados** — aparecem no empty-state como promessa |
| Escondidas | `AISemanticInsights` requer OpenRouter (opcional) — degrada silenciosamente sem chave |
| Cobertura | **Lacunas em LTV, comparativo, exportação CSV/PDF, previsão** |

**Veredicto:** 6/10.

---

### FLUXO 11 — Mobile vs Desktop

`Sidebar.tsx` (desktop) vs `BottomMobileNav.tsx` (mobile). `Header.tsx` fixo em ambos. `SettingsLayout.tsx` vira drawer mobile. `MoreOptionsDrawer.tsx` (mobile-only) tem 8 itens.

| Critério | Avaliação |
|---|---|
| Imediato | Bottom nav com 5 destinos (Agenda, Clientes, [+], Financeiro/Insights, Mais) — padrão iOS-like moderno |
| Intuitivo | Sim. Botão "+" central com glow é óbvio |
| Fricção | **Staff não tem "Mais" no bottom nav** (`:108`) — fica sem acesso a Configurações/Produtos no mobile. Precisa descobrir a Sidebar desktop |
| Escondidas | Marketing, Insights, Fila Digital só no Drawer |
| Cobertura | Sem haptic refinado, sem atalho para "Agenda do dia atual" |

**Veredicto:** 8/10 (mas com gap no staff).

---

## Tabela Síntese

| Fluxo | Pontos Fortes | Pontos Fracos | Lacunas | Bugs/Inconsistências |
|---|---|---|---|---|
| **Onboarding** | Login segmentado, Register com tema, staff onboarding claro | 5 passos, sem horários, StepBusinessInfo só welcome | Templates não oferecidos, sem preview do link público | `StepSuccess.tsx:42` aponta rota inexistente |
| **Config** | SaveFooter com feedback, BusinessHoursEditor com presets | `alert()` para upload, sem índice de seções | Notificações = Placeholder | `GeneralSettings.tsx:75-79` marca form sujo no load |
| **Dono** | Dashboard faturamento em 5s, comissão banner, SetupCopilot | "Saúde do negócio" com score opaco, Marketing vazio | Relatórios exige >5 appointments, sem LTV, sem comparativo | — |
| **Staff** | MeuDiaWidget + StaffEarningsCard, ação "Confirmar e cobrar" | Sem Agenda completa, navegação limitada | Sem ver "quanto vai receber" no fluxo | RLS role-based ainda em validação |
| **Cliente público** | Detecção de cliente existente, link `rebook`, calendário visual | Chat mode vai contra PRODUCT.md, 4-5 cliques | Sem WhatsApp/SMS confirmação, sem política visível | `acceptedPolicy` hardcoded true em edit |
| **Cancel/Reschedule** | Reagendar via `?edit=`, fluxo claro | Política dependente de config | Sem no-show automático, sem impacto em comissão | — |
| **Pagamentos** | Modal premium, multi-pagamento, taxa de maquininha, carrinho | "Recebido Por" verboso, sem gorjeta | Sem Stripe/Pix integrado, sem recibo, sem split | — |
| **Notificações** | SmartNotifications com cores por tipo, WhatsApp pré-formatado | Manual (não automatizado) | **Zero transacional**, zero templates, settings = Placeholder invisível | `/configuracoes/notificacoes` fora do menu |
| **Agenda v2** | Lista mobile, grade desktop uniforme, fix FocusTrap | Filtros descobertos, bloqueio de horário fraco | Sem lembrete push ao barbeiro | — |
| **Relatórios** | Top serviços, top clientes, gráficos | Empty state longo | LTV, comparativo, exportação | `hasSufficientData` exclui usuário novo |
| **Mobile/Desktop** | Bottom nav pílula, Drawer com swipe-to-close | Staff sem "Mais" | Sem haptic refinado | — |

---

## Bugs e Inconsistências Catalogadas

1. `pages/onboarding/StepSuccess.tsx:42` — link para rota inexistente
2. `pages/OnboardingWizard.tsx:38-88` — pula horário (componente existe)
3. `pages/onboarding/StepBusinessInfo.tsx:97` — alias de StepWelcome; nome engana
4. `App.tsx:206` — rota `/configuracoes/notificacoes` existe mas não está em `SETTINGS_ITEMS`
5. `pages/settings/GeneralSettings.tsx:75-79` — `setHasChanges(true)` no load
6. `pages/settings/GeneralSettings.tsx:82-97` — `alert()` nativo para erro de upload
7. `pages/PublicBooking.tsx:475` — `setAcceptedPolicy(true)` hardcoded em modo edit
8. `pages/Marketing.tsx` — só EmptyState; rota existe, sem funcionalidade
9. `components/BottomMobileNav.tsx:108` — staff não vê "Mais"
10. `pages/Register.tsx:24` — default `userType='barber'` aceita lixo se `?type=` for inválido

---

## Conclusão da Auditoria Técnica

O produto tem **fundação sólida**: Login segmentado, Dashboard focado em ação, CheckoutModal premium, Agenda v2 estável, Design System com tokens.

**Calcanhar de Aquiles:** o **back-office incompleto** (Marketing, Notificações, Relatórios parciais) e o **fluxo público dependente de chat** que contradiz o próprio manifesto.

Para um SaaS de gestão, o dono tem que ver **valor todos os dias** — e sem notificações transacionais + reativação automática + relatórios exportáveis, o "valor" some depois da primeira semana.
