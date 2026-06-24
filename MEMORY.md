# MEMORY.md — Estado do Projeto (memória compartilhada)

> Memória de projeto compartilhada entre máquinas/sessões do Claude Code (local + VPS).
> Mantenha atualizado conforme o trabalho avança. Datas em formato absoluto.
>
> ⚠️ **Repo PÚBLICO.** NUNCA coloque aqui segredos, chaves, tokens, connection strings,
> nem detalhes exploráveis de segurança (vetores de RLS, vulnerabilidades específicas).
> Detalhes sensíveis ficam fora do versionamento.

---

## 📊 Status atual (atualizado 20 Jun 2026)

- **Primeiro deploy de produção CONCLUÍDO.** Branch `main` em produção.
- **Produção:** https://promptdeelite.com (Vercel, projeto `rhian-lepore`). Deploy automático via integração GitHub no push para `main`.
- **Vercel env vars configuradas** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) em production + preview + development. Próximos deploys já sobem corretos.
  - ⚠️ Lição: o código exige essas `VITE_*` (não há mais fallback hardcoded). Qualquer ambiente novo precisa delas configuradas, senão `lib/supabase.ts` lança erro e dá tela preta.
- **Banco de produção (Supabase) alinhado ao código:** migrations do release aplicadas; dos RPCs chamados pelo app, todos os críticos existem em produção. (As 2 funções de auditoria `create_audit_log`/`get_audit_logs` não existem em prod, mas a tela `settings/AuditLogs.tsx` trata o erro e mostra lista vazia — não quebra.)
- **Verificações verdes:** `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` (242 testes).

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

## 📋 Pendências / próximos passos

- [ ] **Smoke test manual em produção:** agendar → checkout → fila → confirmar isolamento entre barbearias.
- [ ] **Validar ao vivo a Agenda v2 (clique real):** abrir o modal de detalhes e testar o fluxo staff **"Confirmar e cobrar"**. ⚠️ O staff fechar atendimento depende de permissão de banco — se der erro ao concluir/registrar financeiro como staff, ajustar a policy. (Não foi possível validar via automação: a sessão do navegador caiu durante o teste.)
- [ ] **Hardening pós-deploy** (não bloqueante; detalhes nas notas privadas): checkout transacional único (atendimento + produtos), RLS role-based para staff, rate-limit/captcha em endpoints públicos.
- [ ] **Tela de Auditoria** (`settings/AuditLogs.tsx`): depende de uma migration de sistema de auditoria corrigida. A migration antiga `20260214_audit_system.sql` tem bugs e **NÃO deve ser aplicada como está** (referencia tabela inexistente `financial_records`, trigger com `action='INSERT'` que viola CHECK, join de tipos incompatíveis).

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
