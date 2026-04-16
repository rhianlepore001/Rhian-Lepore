# DECISIONS.md

Registro de decisões arquiteturais, bloqueios e itens deferidos.
Persiste entre sessões — consulta este arquivo antes de tomar decisões que possam conflitar com escolhas anteriores.

---

## Formato

Cada entrada segue: **[ADR-XXX]** Título — *Data* — *Status*

Status: `aceita` | `deferida` | `revisada` | `obsoleta`

---

## Decisões arquiteturais

### [ADR-001] Multi-tenant via `company_id` com RLS — *2026-02* — `aceita`
Isolamento de dados por `company_id` em todas as tabelas, com Row Level Security no Supabase.
- `company_id` vem exclusivamente do session Supabase via `useAuth()`
- Queries sem `company_id` retornam vazio silenciosamente (RLS, não erro)
- Nunca aceitar `company_id` de URL params ou form inputs

### [ADR-002] HashRouter em vez de BrowserRouter — *2026-02* — `aceita`
Uso de HashRouter (`/#/rota`) para compatibilidade com hosting estático (Vercel) sem necessidade de server-side routing.
- Todos os links internos devem usar `/#/rota`
- `vercel.json` tem rewrite para SPA fallback

### [ADR-003] Tema dual: barber (dark/brutal) e beauty (claro/elegante) — *2026-02* — `aceita`
Dois temas visuais baseados no `user_type` do perfil.
- `isBeauty = userType === 'beauty'` controla classes condicionais
- Componentes base: `BrutalCard`, `BrutalButton` adaptam-se ao tema
- Ícones: `lucide-react` universalmente

### [ADR-004] Queries Supabase diretas (sem camada de serviço) — *2026-02* — `aceita`
Todas as queries ao banco são feitas diretamente em páginas/componentes/hooks via `supabase.from()` e `supabase.rpc()`.
- Sem repository pattern ou service layer
- Vantagem: simplicidade e velocidade de desenvolvimento no MVP
- Desvantagem: acoplamento forte entre UI e banco
- **Revisar quando**: projeto escalar para mais de 2 devs ou queries complexas se tornarem difíceis de manter

### [ADR-005] Supabase Auth (não Clerk) — *2026-02* — `aceita`
Autenticação via Supabase Auth. Qualquer referência a Clerk no código legado deve ser ignorada.

### [ADR-006] RPCs com SECURITY DEFINER para contornar RLS em fluxos públicos — *2026-03* — `aceita`
Fluxos públicos (booking, queue) precisam de acesso anônimo, mas RLS bloqueia silenciosamente.
- Solução: RPCs com `SECURITY DEFINER` (ex: `mirror_public_client_to_crm`, `secure_create_booking`)
- Sempre documentar o motivo do SECURITY DEFINER no comentário da migration

### [ADR-007] Onboarding wizard com 5 steps — *2026-03* — `aceita`
Novo usuário passa por wizard de 5 etapas. Progresso salvo em `onboarding_progress`.
- Referencia `companies(id)` mas tabela `companies` não existe — **possível bug/incompletude**

---

## Decisões técnicas pendentes

### [ADR-008] Tabela `companies` — *2026-03* — `deferida`
Migrations referenciam `companies(id)` mas a tabela nunca foi criada.
- `onboarding_progress` tem FK para `companies(id)`
- `company_id` em `profiles` é TEXT, mas deveria ser UUID referenciando `companies`
- **Impacto**: sem essa tabela, o modelo multi-tenant está incompleto
- **Ação**: definir se criamos `companies` ou removemos a referência

### [ADR-009] Tipos TypeScript centralizados vs. locais — *2026-03* — `deferida`
`types.ts` existe mas está desatualizado em relação ao schema real do banco.
- Várias páginas redeclaram interfaces locais com campos adicionais
- **Ação**: decidir se centralizamos em `types.ts` ou mantemos interfaces locais por página

### [ADR-010] `company_id` TEXT vs UUID — *2026-03* — `deferida`
`profiles.company_id` é TEXT, mas várias migrations e RPCs tratam como UUID.
- `public_bookings.business_id` também é TEXT
- **Impacto**: inconsistência pode causar bugs em JOINs e comparações
- **Ação**: padronizar tipo e criar migration de conversão se necessário

---

## Bloqueios conhecidos

### B-001: RLS em `public_bookings` instável
- **Desde**: 2026-02
- **Impacto**: Agendamento público quebra sem aviso. Policies anônimas e autenticadas interagem mal, causando erro "new row violates policy for table".
- **Workaround atual**: RPCs com SECURITY DEFINER (`secure_create_booking`, `edit_booking_rpc`)
- **Histórico**: Pelo menos 5 migrations de fix (20260226 a 20260321)
- **Risco**: Toda mudança na tabela requer cuidado redobrado. Se adicionar coluna ou policy nova, testar com usuário autenticado E anônimo.
- **Ação sugerida**: Reescrever policies do zero com separação clara entre acesso autenticado e anônimo, ou migrar todo acesso público para RPCs.

### B-002: `finance_records` teve duplicação
- **Desde**: 2026-03
- **Impacto**: Dados financeiros duplicados — receita e comissão infladas nos relatórios.
- **Workaround atual**: Migration de cleanup `20260301_cleanup_duplicate_finance_records.sql`
- **Risco**: Race condition ou double-click pode gerar duplicação novamente. Sem UNIQUE constraint em `appointment_id`.
- **Ação sugerida**: Adicionar UNIQUE constraint em `finance_records.appointment_id` + debounce no botão de concluir agendamento.

### B-003: Soft delete referencia tabela errada
- **Desde**: 2026-03
- **Impacto**: CRÍTICO — migration de soft delete referencia `financial_records` mas a tabela é `finance_records`.
  - A migration provavelmente **falhou** para essa tabela.
  - `deleted_at` nunca foi adicionado a `finance_records`.
  - Registros financeiros deletados são removidos permanentemente, sem possibilidade de recovery.
  - Se o sistema usa soft delete em alguma query de `finance_records`, está ignorando registros que já foram deletados fisicamente.
- **Diagnóstico pendente**: verificar no banco se `finance_records` tem coluna `deleted_at`.
- **Ação sugerida**: criar migration corretiva que adiciona `deleted_at` a `finance_records`.

### B-004: Pagamento de comissão misturado com despesas
- **Desde**: 2026-03
- **Impacto**: Relatórios financeiros incluem comissões pagas como despesas genéricas. Impossível distinguir "despesas operacionais" (aluguel, produtos) de "pagamento de comissão" sem lógica adicional.
- **Workaround atual**: `mark_commissions_as_paid` cria `finance_record` com `type='expense'`.
- **Risco**: Dono não consegue ver despesas reais vs comissões pagas separadamente.
- **Ação sugerida**: adicionar coluna `expense_category` ou valor distinto em `type` (ex: `type='commission_payment'`) para diferenciar.

### B-005: Tabela `companies` referenciada mas inexistente
- **Desde**: 2026-03
- **Impacto**: CRÍTICO — `onboarding_progress` tem FK para `companies(id)` que não existe em nenhuma migration.
  - Se a FK foi criada: todo insert em `onboarding_progress` deve falhar (a não ser que `companies` exista no Supabase via criação manual).
  - Se a FK não foi criada (migration falhou): dados órfãos, sem relação real entre onboarding e empresa.
  - O modelo multi-tenant está incompleto sem essa tabela.
- **Diagnóstico pendente**: verificar no banco se `companies` existe (criação manual?) e se a FK está ativa.
- **Ação sugerida**: criar tabela `companies` com schema definido, migrar `company_id` para UUID, ou remover referência se não for necessária.

### B-006: `company_id` TEXT vs UUID — inconsistência de tipos
- **Desde**: 2026-03
- **Impacto**: ALTO — `profiles.company_id` é TEXT mas várias tabelas e RPCs tratam como UUID.
  - `public_bookings.business_id` também é TEXT.
  - JOINs entre tipos diferentes podem funcionar por cast implícito do Postgres, mas não é garantido.
  - RPCs que recebem `p_business_id UUID` mas a coluna é TEXT podem falhar em edge cases.
  - Performance: cast implícito em JOINs impede uso eficiente de índices.
- **Ação sugerida**: padronizar `company_id` como UUID em todas as tabelas. Criar migration de conversão com cuidado (dados existentes).

---

## Itens deferidos (backlog do agente)

| Item | Prioridade | Contexto | Ação sugerida |
|---|---|---|---|
| Investigar se tabela `companies` existe no banco | **crítica** | B-005 | Verificar no Supabase Dashboard ou via query |
| Verificar se `deleted_at` existe em `finance_records` | **crítica** | B-003 | `SELECT column_name FROM information_schema.columns WHERE table_name = 'finance_records'` |
| Padronizar `company_id` como UUID | alta | B-006, ADR-010 | Migration de conversão + atualizar código TS |
| Criar tabela `companies` (ou remover referência) | alta | B-005, ADR-008 | Definir schema e criar migration |
| Adicionar UNIQUE em `finance_records.appointment_id` | alta | B-002 | Migration + verificar dados duplicados existentes |
| Separar comissões de despesas | média | B-004 | Adicionar `expense_category` ou `type='commission_payment'` |
| Atualizar `types.ts` para refletir schema real | média | ADR-009 | Gerar tipos a partir do schema do Supabase |
| Reescrever policies RLS de `public_bookings` | média | B-001 | Separar claramente acesso autenticado vs anônimo |
| Criar camada de serviço para queries Supabase | baixa | ADR-004 | Revisar quando projeto escalar |
