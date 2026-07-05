# Relatório Consolidado — Auditoria 360° AgendiX

**Data**: 2026-07-05
**Frente**: e2e-jornada
**Agentes**: 01 (UI visual), 02 (copy), 03 (fluxo), 04 (design system), 06 (domínio) — **os 5 rodaram**.
**Auditoria anterior referência**: 20260610_120000

## Sumário executivo

**O que está bom**
- A superfície pública multi-tenant foi **fechada**: a migration `20260613_security_s2_public_rls.sql` revogou as policies públicas sem filtro de tenant (`profiles`, `services`, `team_members`, `business_settings`, `queue_entries`). Os dois P0 mais graves do Agente 03 já estão resolvidos.
- Os fluxos financeiros e de fila mais sensíveis rodam por **RPCs SECURITY DEFINER atômicas** (`complete_appointment` v3 com idempotency guard + validação de tenant, `finish_queue_entry` com normalização de telefone). Tom de voz de copy calibrado nas 3 personas.
- Onboarding do dono é robusto (retomada de passo salvo); services filtram por `companyId`; migração Tailwind CDN→build concluída (resolveu UI-005/UI-011 parcialmente).

**O que é crítico agora**
- `deleteFinanceTransaction` (`services/finance.ts:99-144`) faz **2 deletes não-atômicos** → finance_record órfão e números de relatório inconsistentes (P0-03).
- Rota `/configuracoes/servicos` **sem `OwnerRouteGuard`** — staff edita catálogo de serviços (P0-04).
- Interpolação dinâmica Tailwind v4 `bg-${accentColor}` **não gera CSS** em 6 componentes, incluindo a tela pública de conversão `ProfessionalPortfolio` — cor de marca invisível (P0-DS01).
- Erro bruto do Supabase exposto ao dono via `alert()` nativo em `ClientCRM`/`Clients` (P0-C01).

**O que é oportunidade rápida**
- Defesa em profundidade: adicionar `.eq('user_id', companyId)` em `cancelAppointment`/`assignAppointmentProfessional` (30 min).
- Trocar `alert()` nativo por `showToast()` e corrigir toast verde de rejeição em `Agenda.tsx:782` (semântica de cor).
- Definir escala de z-index e mapear `bg-${accentColor}` para classes estáticas (marca visível na hora).

**O que é dívida estrutural**
- Migração `isBeauty + zinc/stone` → tokens de marca (400+ ocorrências, 53 arquivos; `ClientArea` sozinho tem 74x) — sem isso ~40% do produto fica genérico.
- Componentes deprecados `BrutalCard`/`BrutalButton`/`Modal` com 51 imports ativos (persistente desde 20260610: UI-002/UI-003/UI-006).
- Fonte única de tokens (`index.html` vs `tokens.css` duplicados — persistente: UI-001).
- Dois wizards de onboarding coexistindo + estado de fila `no_show` inalcançável (dívida de modelo de domínio).

## Estatísticas

**Achados por lente (bruto)**
| Lente | P0 | P1 | P2 | P3 | Total |
|---|---|---|---|---|---|
| 01 (UI visual) | 1 | 5 | 8 | 4 | 18 |
| 02 (copy) | 1 | 3 | ~13 | 4 | ~21 |
| 03 (fluxo) | 4 | 7 | 10 | 6 | 27 |
| 04 (design system) | 1 | 5 | ~6 | 4 | ~16 |
| 06 (domínio) | 0 | 3 (R-05, R-06, R-09-validar) | ~5 | ~3 | 11 regras |

**Após cruzamento**: ~55 achados brutos → **~40 achados únicos** (2 P0 do Agente 03 rebaixados; ~5 achados compostos agrupados).

**Por severidade (consolidado, pós-reconciliação)**
- 🔴 **P0 abertos**: 3 (P0-03 finance, P0-04 guard servicos, P0-DS01 Tailwind) + 1 copy (P0-C01) = **4**
- 🟠 **P1**: ~12 (incluindo R-05, R-06, R-09-validar do domínio)
- 🟡 **P2**: ~20
- 🟢 **P3**: ~13

**Comparação com 20260610**
- **Resolvidos**: UI-005 (light mode nas telas migradas), UI-012 (empty state Clients c/ CTA), MÉDIO-005, migração Tailwind CDN→build.
- **Persistentes**: UI-001 (3 fontes de tokens → agora 2), UI-002/003/006 (dual stack Brutal*/ui*, 51 imports), UI-011 (LoadingFull `bg-neutral-900` hardcoded), ALTO-001/ALTO-002 (erro técnico exposto + feedback inconsistente, novas instâncias em `ClientCRM`).
- **Novos**: toda a superfície funcional/RLS/domínio (P0-03, P0-04, P1-01..07, R-01..R-11) — a auditoria anterior foi só visual.

**Reconciliação de severidade (CRÍTICO)**
- **P0-01** (queue SELECT sem filtro `business_id`) e **P0-02** (queue INSERT `WITH CHECK (true)`) do Agente 03 estão **RESOLVIDOS** pela migration `20260613_security_s2_public_rls.sql`, que o Agente 03 não havia auditado (só viu as `20260218_*`). **NÃO listados como P0 abertos.** Ação: validar no banco vivo que as policies foram efetivamente dropadas (ver "Validação necessária → SQL").

## Achados cruzados (compostos)

| # | Título | Lentes | Severidade | Esforço | Sprint |
|---|---|---|---|---|---|
| C1 | **Feedback de erro nativo/inconsistente** — `alert()` do SO expõe erro bruto do Supabase (copy) E é falha de tratamento de erro de fluxo (mensagem técnica, UI bloqueante) em `ClientCRM.tsx:149,206,232,309` / `Clients.tsx:159` | 02 (P0-C01) + 03 (UI-014 persistente) | 🔴 P0 | Baixo | 1 |
| C2 | **Race condition na fila** — INSERT sem `FOR UPDATE`/UNIQUE; dupla entrada do mesmo telefone | 03 (validações) + 06 (Bloco D) | 🟡 P2→trata como P1 quick win | Médio (4h) | 1 |
| C3 | **`resetExpiredCallingEntries`: `calling → waiting` (não `no_show`)** — estado `no_show` inalcançável; decisão de produto pendente (regra D2/D4) | 03 (P2-01) + 06 (R-03/R-04) | 🟡 P2 | Baixo (após decisão) | 2 |
| C4 | **Componentes deprecados + tokens duplicados** — `BrutalCard`/`BrutalButton`/`Modal` (51 imports) e tokens `index.html` vs `tokens.css` | 04 (P1-DS03/DS04) + 20260610 (UI-001/002/003) | 🟠 P1 | Alto | 3 |
| C5 | **`deleteFinanceTransaction` não-atômico + design confuso do fallback** | 03 (P0-03 + P2-02) | 🔴 P0 | Médio | 1 |
| C6 | **Página pública de agendamento 99.9% preta** — `bg-${accentColor}` não gera CSS (design) E confirmado por análise de cores (visual): tela de aquisição de cliente sem marca/texto | 01 (P0-UI01) + 04 (P0-DS01) | 🔴 P0 | Baixo | 1 |
| C7 | **Copy pt-PT na landing/produto BR** — "Bom te ver de novo" (copy) E detectado visualmente na landing (visual) | 01 (P1-UI05) + 02 (P1-C) | 🟠 P1 | Baixo | 2 |
| C8 | **`LoadingFull` hardcoded `bg-neutral-900` + sem skeleton route-level** — persistente desde 20260610 (UI-011) | 01 (P2-UI06/07) + 04 (P1-DS) | 🟠 P1 | Médio | 3 |

## Achados únicos por lente

### Lente 01 (UI visual) — Playwright, 22 screenshots + análise de cores
- 🔴 **P0-UI01** — página pública `/#/book/:slug` é **99.9% preta** (análise PIL: sem accent, 0% texto). Confirma C6/P0-DS01 na tela de aquisição.
- 🟠 **P1-UI01** — light text 0.1-1.1% em desktop → fonte pequena/baixo contraste (pior: `ajustes-servicos` 0.1%, `produtos` 0.4%).
- 🟠 **P1-UI02** — hierarquia H1→H2 rasa (24px→16px, só 8px de diferença). Cruza com UI-004 (20260610).
- 🟠 **P1-UI03** — banner "PERÍODO DE TESTE GRÁTIS" persistente em todas as 10 telas logadas → pressão desnecessária, deveria ser dismissible.
- 🟠 **P1-UI04** — botão "ASSINAR AGORA" `bg-black` sobre fundo `rgb(18,16,14)` → botão de conversão quase invisível.
- 🟠 **P1-UI05** — copy pt-PT ("Bom te ver de novo") na landing BR (composto C7).
- 🟡 **P2-UI01..08** — score de saúde sem cor de status; cards de agenda transparentes; botão de profissional sem estado ativo; empty states rasos (`ajustes-servicos` 87.3% vazio, `produtos` 85.1%); `LoadingFull` hardcoded; sem skeleton route (C8); "14 dias" vs config "10 dias".
- 🟢 **P3-UI01..04** — badge "2" não limpa; iniciais sem separador dono/staff; logo 1024² em tamanho pequeno; touch targets mobile não medidos.

### Lente 02 (copy)
- 🟠 **P1-C01** — `ClientCRM.tsx` usa `alert()` nativo para **sucesso** (5 locais) → trocar por `showToast(...,'success')`.
- 🟠 **P1-C02** — `Agenda.tsx:782` `showToast('Solicitação recusada.', 'success')` → toast verde para rejeição; mudar para `'info'`/`'error'`.
- 🟡 **P2** — empty state técnico/frio em `QueueStatus` (seguir tom de `QueueJoin`); inconsistência "agendamento" vs "reserva" no público; "MRR"/"Liquidar" opacos → "Receita recorrente (MRR)"/"Dar baixa".
- 🟢 **P3** — 4 micro-ajustes de gramática/pontuação.

### Lente 03 (fluxo)
- 🔴 **P0-03** — `deleteFinanceTransaction` 2 deletes não-atômicos → mover para RPC transacional (composto C5).
- 🔴 **P0-04** — `/configuracoes/servicos` sem `<OwnerRouteGuard>` (`App.tsx:202`).
- 🟠 **P1-01** — `cancelAppointment`/`assignAppointmentProfessional` sem `.eq('user_id', companyId)` (`services/scheduling.ts:330,339`).
- 🟠 **P1-02** — staff órfão cai em `subscriptionStatus='subscriber'` sem validação (`AuthContext.tsx:106-110`).
- 🟠 **P1-03** — `StaffOnboarding.handleStart` engole erro de `markTutorialCompleted` → risco de redirect loop.
- 🟠 **P1-04** — `OnboardingWizard.tsx:34` chama `navigate()` durante render → mover para `useEffect`.
- 🟠 **P1-05** — `createAcceptedAppointmentFromBooking` INSERT direto sem RPC (`services/publicBooking.ts:218`).
- 🟠 **P1-06** — `AuthContext` inicializa `tutorialCompleted=true` → flash/edge case.
- 🟠 **P1-07** — "Termos"/"Privacidade" como `href="#"` (`Register.tsx:371-373`) → risco LGPD.
- 🟡 **P2-02..P2-10** — fallback confuso do delete, INSERTs sem RPC divergentes, `resolveClientForBookingAcceptance` por 3 formatos de phone, fallback `*`→`/` silencioso, `setLoading(false)` fora de `finally`, dashboard usando `user.id` em vez de `companyId`, bypass `update-password` no hash.
- 🟢 **P3-01..P3-06** — otimizações e hardcodes menores.

### Lente 04 (design system)
- 🔴 **P0-DS01** — `bg-${accentColor}` não gera CSS em `ProfessionalPortfolio`, `SearchableSelect`, `ProfessionalSelector`, `MonthYearSelector`, `BusinessGalleryManager`, `UpsellSection`. **`ProfessionalPortfolio` primeiro** (público).
- 🟠 **P1-DS01** — `ClientArea.tsx` 74x `isBeauty`+zinc/stone (público, sem marca).
- 🟠 **P1-DS02** — 400+ ternários `isBeauty` em 53 arquivos.
- 🟠 **P1-DS03/DS04/DS05** — deprecados (51 imports), tokens duplicados, z-index arbitrários (composto C4).
- 🟡 **P2** — `text-[8px]`, `shadow-2xl`, `duration-300/500/700`, UPPERCASE (274x), `rounded-3xl`, cor WhatsApp sem token.
- 🟢 **P3** — 4 micro-inconsistências.

### Lente 06 (domínio) — **todas entram na Sprint 1**
- 🟠 **R-05 (P1)** — `get_commissions_due` não retorna `is_owner`; filtro `!item.is_owner` = `!undefined` = `true` → dono aparece nas comissões devidas (`CommissionsManagement.tsx:151,171`).
- 🟠 **R-06 (P1)** — constraint `CHECK current_step BETWEEN 1 AND 5` vs wizard de 6 passos; `goToStep(6)` viola constraint → wizard trava no passo 5, tela de Sucesso nunca renderiza (`20260320_onboarding_wizard.sql:35`). Fix: constraint `BETWEEN 1 AND 6` OU mapear passo 6 para `completeOnboarding()` sem persistir.
- 🟠 **R-09 (P1-validar)** — FK `onboarding_progress.company_id REFERENCES companies(id)`; tabela `companies` pode não existir → migration teria falhado, bloqueando registro. **Validar no banco vivo urgente.**
- 🟡 **R-01** (`Confirmed` sem passar por `Pending`), **R-02** (cancelamento sem registro financeiro), **R-07** (PascalCase vs lowercase entre `appointments` e `public_bookings`), **R-11** (`markAppointmentComplete` 1 parâmetro sem idempotency → risco de 2º finance_record).
- 🟢 **R-08** (slug staff via `Math.random()` sem UNIQUE), **R-10** (dois wizards coexistindo).

## Top 5 quick wins

| # | O que | Onde | Esforço | Impacto | Risco | Lente |
|---|---|---|---|---|---|---|
| 1 | `.eq('user_id', companyId)` em cancel/assign appointment | `services/scheduling.ts:330,339` | 30 min | Defesa em profundidade RLS | Baixo | 03 |
| 2 | `<OwnerRouteGuard>` em `/configuracoes/servicos` | `App.tsx:202` | 15 min | Bloqueia staff de editar catálogo | Baixo | 03 |
| 3 | `alert()` → `showToast()` + esconder erro bruto do Supabase | `ClientCRM.tsx`, `Clients.tsx` | 1h | Confiança + para de vazar detalhe interno | Baixo | 02+03 |
| 4 | Toast de rejeição `'success'`→`'info'` | `Agenda.tsx:782` | 5 min | Semântica de cor correta | Baixo | 02 |
| 5 | `bg-${accentColor}` → classes estáticas | `ProfessionalPortfolio` (público) | S | Marca visível na tela de conversão | Baixo | 04 |

## Top 3 dívidas estruturais

1. **Migração `isBeauty + zinc/stone` → tokens de marca** (400+ ocorrências, 53 arquivos; `ClientArea` 74x). ~40% do produto genérico, incluindo telas públicas de conversão. 2+ sprints.
2. **Consolidação do dual stack de componentes** (`BrutalCard`/`BrutalButton`/`Modal` legado, 51 imports) + **fonte única de tokens** (`index.html` vs `tokens.css`). Persistente desde 20260610 (UI-001/002/003). Cresce a cada tela nova.
3. **Coerência do modelo de domínio**: dois wizards de onboarding (`/onboarding` legado vs `/onboarding-wizard`), estado de fila `no_show` inalcançável, status PascalCase vs lowercase, INSERTs diretos divergindo das RPCs atômicas. Dívida que gera bugs sutis (R-06 é sintoma).

## Recomendações por persona

### Dono
- **Confiança do dashboard**: fechar P0-03 (finance órfão) e R-05 (dono nas comissões) — números precisam bater.
- **Erro nunca deve ser técnico**: fechar P0-C01/C1. Trocar todo `alert()` nativo por `showToast`.
- **Onboarding não pode travar**: R-06 é bloqueante de ativação (passo 5→6). Prioridade máxima na Sprint 1.

### Colaborador mobile
- Fechar P0-04 (staff não deve editar serviços) e P1-02 (staff órfão sem mensagem clara).
- `text-[8px]` ilegível em tela pequena (P2 design system).
- P1-03: evitar redirect loop silencioso no staff onboarding.

### Cliente final
- **Maior oportunidade de conversão**: P0-DS01 em `ProfessionalPortfolio` + P1-DS01 em `ClientArea` — telas públicas sem identidade de marca no light mode.
- Empty state humano em `QueueStatus` (P2 copy); padronizar "agendamento" vs "reserva".
- Race condition da fila (C2) — dupla entrada com mesmo telefone.

## Validação necessária

### Playwright
- P0-04: logar como staff, navegar `/#/configuracoes/servicos` — confirmar acesso.
- P1-04: StrictMode + console no fluxo de conclusão do onboarding.
- R-06: clicar "Próximo" no passo 5 (Meta) e observar se passo 6 (Sucesso) renderiza ou dá erro de constraint.
- Fluxo cliente ≤3 cliques em `/#/book/:slug`.
- Dupla entrada simultânea na fila (2 browsers, mesmo telefone).

### Inspeção SQL direta
- **Reconciliação P0-01/P0-02**: `SELECT polname, polcmd, qual, with_check FROM pg_policies WHERE tablename='queue_entries';` — confirmar que S2 dropou as policies permissivas. Rodar `SELECT ... FROM queue_entries` como anon e `INSERT` como anon: devem falhar.
- **P1-01**: `SELECT polname, polcmd, qual, with_check FROM pg_policies WHERE tablename='appointments';` — se UPDATE não tem `USING (auth.uid()::text = user_id)`, P1-01 vira P0.
- **R-09**: `\d onboarding_progress` — verificar se FK `companies(id)` existe ou foi substituída.
- **R-05**: `SELECT name, commission_rate, is_owner FROM team_members WHERE is_owner=true AND commission_rate>0;`

### Navegação humana
- Onboarding end-to-end (dono real, 6 passos, medir ≤5 min).
- Jornada staff completa (MeuDia → confirmar atendimento → comissão).
- Jornada cliente completa (agendar anon, WhatsApp, cancelar, reagendar, contar cliques).
- Empty state de `QueueStatus` — soa acolhedor?
- `alert()` nativo vs `showToast` em produção.

## Gaps de cobertura
- **Agente 01 rodou** (Playwright, 22 screenshots desktop+mobile), mas com limitações: **sem inspeção visual humana** (vision provider indisponível — análise foi por cores/PIL + DOM, pegou o P0 mas pode ter perdido nuances de espaçamento/alinhamento/overlay). **Não capturou**: tela de login, onboarding wizard, staff view, estados de erro/empty/loading reais. Recomenda-se revisão humana dos PNGs em `screenshots/`.
- Os relatórios 02/03/04/06 são **estáticos** (leitura de código). Todos os P0/P1 de RLS precisam de confirmação SQL no banco vivo antes de merge.
- Reconciliação P0-01/P0-02 depende de confirmar policies dropadas no banco vivo (Agente 06 leu a migration, mas ninguém validou o estado real).
- R-09 (FK `companies`) pode ser falso-positivo ou bloqueador total de registro — depende do estado real do banco.
- Callers de `createAcceptedAppointmentFromBooking` (P1-05) não foram mapeados exaustivamente.

## Sugestão de quebra em sprints

### Sprint 1 (P0 + quick wins + TODAS as regras de domínio)
- 🔴 P0-03 / C5 (RPC transacional para delete finance)
- 🔴 P0-04 (OwnerRouteGuard em servicos)
- 🔴 P0-DS01 (`ProfessionalPortfolio` classes estáticas)
- 🔴 P0-C01 / C1 (alert→showToast, esconder erro bruto)
- 🟠 R-05 (is_owner nas comissões), R-06 (constraint onboarding), R-09 (validar FK companies) — **regras de domínio, todas aqui**
- Quick wins 1-4 (eq user_id, guard, toast rejeição)
- 🟠 P1-UI04 (botão "ASSINAR AGORA" preto → accent), P1-UI03 (banner trial só no dashboard), P2-UI08 ("14 dias" vs "10 dias") — quick wins visuais
- Validação SQL de reconciliação (P0-01/P0-02) + P1-01

### Sprint 2 (P1 restantes + quick wins P2)
- P1-01..P1-07 restantes (staff órfão, onboarding navigate, INSERT sem RPC, termos/privacidade LGPD)
- R-11 (idempotency markAppointmentComplete), R-01/R-02/R-07
- C2 (race condition fila — UNIQUE/RPC atômica)
- C3 (decisão de produto `no_show` vs `waiting` + implementação)
- P0-DS01 nos 5 componentes restantes
- Quick wins P2 de copy (MRR/Liquidar, agendamento/reserva, empty state QueueStatus)

### Sprint 3+ (P2/P3 + estruturais)
- 🏗️ C4: consolidar `BrutalCard`/`BrutalButton`/`Modal` (51 imports) + fonte única de tokens
- 🏗️ Migração `isBeauty + zinc/stone` → tokens de marca (400+ ocorrências)
- 🏗️ Remover wizard legado `/onboarding` (R-10)
- P2/P3 de design (z-index scale, durations, text-[8px], UPPERCASE) e fluxo (fallback 404, setLoading finally, dashboard companyId)
