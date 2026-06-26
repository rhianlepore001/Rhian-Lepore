# MEMORY.md — Estado do Projeto (memória compartilhada)

> Memória de projeto compartilhada entre máquinas/sessões do Claude Code (local + VPS).
> Mantenha atualizado conforme o trabalho avança. Datas em formato absoluto.
>
> ⚠️ **Repo PÚBLICO.** NUNCA coloque aqui segredos, chaves, tokens, connection strings,
> nem detalhes exploráveis de segurança (vetores de RLS, vulnerabilidades específicas).
> Detalhes sensíveis ficam fora do versionamento.

---

## 📊 Status atual (atualizado 26 Jun 2026)

- **Primeiro deploy de produção CONCLUÍDO.** Branch `main` em produção.
- **Produção:** https://promptdeelite.com (Vercel, projeto `rhian-lepore`). Deploy automático via integração GitHub no push para `main`.
- **Vercel env vars configuradas** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) em production + preview + development. Próximos deploys já sobem corretos.
  - ⚠️ Lição: o código exige essas `VITE_*` (não há mais fallback hardcoded). Qualquer ambiente novo precisa delas configuradas, senão `lib/supabase.ts` lança erro e dá tela preta.
- **Banco de produção (Supabase) alinhado ao código:** migrations do release aplicadas; dos RPCs chamados pelo app, todos os críticos existem em produção. (As 2 funções de auditoria `create_audit_log`/`get_audit_logs` não existem em prod, mas a tela `settings/AuditLogs.tsx` trata o erro e mostra lista vazia — não quebra.)
- **Verificações verdes:** `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` (**263 testes**).

## 🧱 Arquitetura (resumo — detalhes em CLAUDE.md)

- React 19 + TypeScript + Vite + Tailwind + Supabase (Auth + Postgres) + Vercel (PWA).
- **Multi-tenant** isolado por `user_id` (TEXT) como chave de tenant, via RLS no banco. Tabela financeira é `finance_records`. Produtos usam `company_id` (UUID).
- HashRouter (`/#/rota`); páginas com `React.lazy()` dentro de `<Suspense>`.
- IA via OpenRouter (`VITE_OPENROUTER_API_KEY`) — opcional/pós-MVP; ausência degrada sem quebrar.

## 🛠️ Trabalho recente

- **Fases 0–8:** migração da camada de dados para TanStack Query (services/hooks/types) — team, settings, dashboard, fila, agendamento, finanças.
- **Auditoria UX writing + visual:** cores (roxo/dourado/modais), correção de textos, mojibake, links mortos.
- **Go-live hardening (20 Jun 2026):** validação completa, correções de release, blindagem multi-tenant, aplicação de migrations pendentes em produção e verificação no banco vivo.
- **Migration `edited_at` aplicada em produção (24 Jun 2026):** coluna `appointments.edited_at` (badge "Editado" da Agenda v2) criada no banco vivo via MCP/SQL Editor; status `NoShow` documentado.
- **Agenda v2 redesign (24 Jun 2026):**
  - **Mobile:** grade multi-coluna virou **lista cronológica do dia** (acaba o scroll lateral; cada linha: hora · cliente · serviço · preço · profissional · status).
  - **Desktop:** grade com **alturas de linha uniformes** (corrige espaçamento irregular).
  - **Faixa de datas:** vira **semana fixa** (clicar num dia seleciona sem "deslizar"; setas mudam de semana) + **empty state** "Nenhum agendamento neste dia".
  - **Bug "clico no agendamento e nada abre" — corrigido (2 causas):** (1) célula vazia transbordada sobrepunha o card e roubava o clique → alturas uniformes; (2) `FocusTrap` com `clickOutsideDeactivates: true` fechava o modal no mesmo clique que o abria → trocado para `false` + fechar pelo fundo/Esc.
  - **Colaborador (staff):** ganhou ações **"Confirmar e cobrar"** (abre o checkout) e **"Faltou"**; "Editar"/excluir seguem só do dono.
  - Verde em `typecheck`/`lint`/**263 testes**.
- **Fix tema dark/light quebrado + refatoração (26 Jun 2026):**
  - **Causa raiz:** `useBrutalTheme` lia `data-mode` do DOM em `getMode()` estático, então componentes não re-renderizavam no toggle; `ThemeContext` e `useBrutalTheme` duplicavam o `MutationObserver`.
  - **Solução:** extraído `hooks/useColorMode.ts` (fonte única com `getModeSnapshot`/`subscribeMode`/`useColorMode` via `useSyncExternalStore`); `ThemeContext` e `useBrutalTheme` agora delegam. Toggle reflete em **todos** os componentes sem precisar refresh.
  - **Cores hardcoded substituídas por tokens** do design system em: `MoreOptionsDrawer` (menu mobile), `AppointmentEditModal`, `Header`, `BottomMobileNav`, `DashboardHero`, `AIOSDiagnosticCard`, `SaveFooter`, `CalendarPicker`, `SmartNotifications`, `AIAssistantChat`, `CommissionsManagement`, `BookingModeToggle`, `Finance`, `ClientCRM`, `Agenda`, `ServiceSettings`, modais do dashboard.
  - **Opacidade:** `bg-neutral-900/80` → `bg-[color-mix(in_srgb,var(--color-card)_80%,transparent)]` (Tailwind v3 CDN perdia `/80` sobre `var()`).
  - **Token semântico:** `bg-[var(--color-text-muted)]` → `bg-[var(--color-divider)]` no handle do `MoreOptionsDrawer`.
  - **Mojibake do euro:** `pages/Agenda.tsx:147` tinha string literal `'â¬'` (UTF-8 lido como Latin-1) → `'€'`.
  - **Textos em pt-BR corrigidos:** "Email" → "E-mail" (Login, Register, Clients, ClientArea, `mapError`); acentuação completa em `services/crm`, `services/queue`, `services/finance`, `pages/settings/UiPreview`.
  - **Testes ajustados:** Login.test, crm.test, queue.test para refletir textos corretos.
  - **4 commits atômicos** no `main`: `d66a2bd` (fix tema+textos), `d9aa67c` (refactor useColorMode), `1c69583` (foundation bug-reporter), `afef118` (UI bug-reporter).
- **Bug Reporter in-app — Sprint 1 (26 Jun 2026):**
  - **Botão "?" no header** (entre `Bell` e avatar), visível para todo user autenticado. Ícone `HelpCircle` do Lucide, aria-label="Ajuda e reportar problema".
  - **Click → mini-dropdown** com 3 opções: Reportar problema, Sugerir melhoria, Falar com suporte. Cada opção é um card com token do design system (cores/hover funcionam em dark/light + barber/beauty).
  - **Modal simples** (bottom-sheet mobile, centralizado desktop): print auto via `html2canvas` (import dinâmico), textarea opcional, resumo do contexto técnico (rota, viewport, userAgent, tema, console errors, build SHA). Submit faz upload do screenshot pro bucket `bug-screenshots` e insert na tabela `bug_reports`.
  - **Console error buffer:** singleton IIFE que envolve `console.error` e guarda últimos 10 com stack. Incluído no `BugContext` automaticamente.
  - **Supabase:** tabela `bug_reports` com RLS via `get_auth_company_id()` (mesmo padrão do projeto), bucket `bug-screenshots` com policies isolando por pasta `(storage.foldername(name))[1] = get_auth_company_id()`. Migration: `supabase/migrations/20260626000001_bug_reports.sql`.
  - **Multi-tenant:** `company_id` (TEXT) sempre exigido; INSERT só passa com `auth.uid()` correto. Modo avançado (com anotações, crop, network errors) e botão flutuante DEV ficam pra **Sprint 2**. Pipeline cron Bob pra triagem/fix/PR fica pra **Sprint 3**.

## 📋 Pendências / próximos passos

- [ ] **Smoke test manual em produção:** agendar → checkout → fila → confirmar isolamento entre barbearias.
- [ ] **Validar ao vivo a Agenda v2 (clique real):** abrir o modal de detalhes e testar o fluxo staff **"Confirmar e cobrar"**. ⚠️ O staff fechar atendimento depende de permissão de banco — se der erro ao concluir/registrar financeiro como staff, ajustar a policy. (Não foi possível validar via automação: a sessão do navegador caiu durante o teste.)
- [ ] **Hardening pós-deploy** (não bloqueante; detalhes nas notas privadas): checkout transacional único (atendimento + produtos), RLS role-based para staff, rate-limit/captcha em endpoints públicos.
- [ ] **Tela de Auditoria** (`settings/AuditLogs.tsx`): depende de uma migration de sistema de auditoria corrigida. A migration antiga `20260214_audit_system.sql` tem bugs e **NÃO deve ser aplicada como está** (referencia tabela inexistente `financial_records`, trigger com `action='INSERT'` que viola CHECK, join de tipos incompatíveis).
- [ ] **Bug Reporter — Sprint 2:** modal avançado (anotações com caneta/texto/retângulo, crop por área, network errors, performance metrics, component stack) + botão flutuante DEV (`isDev=true`, atalho `Ctrl+Shift+B`).
- [ ] **Bug Reporter — Sprint 3:** pipeline cron Bob (lê `bug_reports` WHERE status='new', triagem Lionclaw, plano de fix, branch por sprint, PR, atualização de status). Skills em `~/.hermes/skills/agendix/bug-report-flow.md` e `lionclaw-sprint.md`.
- [ ] **Aplicar migration `20260626000001_bug_reports.sql` no Supabase de produção** + criar bucket `bug-screenshots` via service role (a migration tem DO block com instrução).
- [ ] **Preencher WhatsApp/email de suporte** no `BugReportButton.tsx` (atualmente placeholder `#`).
- [ ] **Dívida técnica (registrada por Claude Code review):** comentário em `useBrutalTheme.ts` diz "NUNCA use interpolação dinâmica — Tailwind não processa". Hoje funciona por causa do CDN (`cdn.tailwindcss.com` no `index.html`). Se migrarem para o build estático do Vite (Tailwind v4 no `package.json`), dezenas de `hover:${...}` espalhados pelo código quebram. Vai precisar de tokens `*Hover` no design system antes da migração.

## 🔑 Comandos essenciais

```bash
npm run dev          # dev server → localhost:3000
npm run build        # build produção
npm run lint         # ESLint (strict — falha em warnings)
npm run typecheck    # TypeScript check
npm test             # Vitest
```

## 🚀 Deploy / Vercel

- Push em `main` → deploy de produção automático.
- Env vars `VITE_*` são embutidas em **build-time** → mudança de env exige **redeploy**.
- Rollback seguro: Vercel Dashboard → Deployments → deploy anterior → Promote/Instant Rollback.
- CLI: `vercel ls rhian-lepore`, `vercel env ls`, `vercel redeploy <url>`.

---

*Para detalhes de segurança/auditoria sensíveis, consultar as notas privadas (fora do repo). Este arquivo é público.*
