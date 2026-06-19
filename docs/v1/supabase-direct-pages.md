# G5 — Inventário de Supabase Direto

## Veredito

C3 deve começar por `ServiceSettings`, `RecycleBin`, `Reports` e `QueueStatus`, nessa ordem.

`CommissionsSettings` e `ClientArea` ainda têm chamadas diretas relevantes, mas são melhor tratadas como rodada seguinte: `CommissionsSettings` já usa hooks em parte, e `ClientArea` cruza contexto público, realtime e cadastro de cliente público.

## Tabela de Inventário

| Página | Chamadas diretas | RPC/tabela/storage | Prioridade | Handoff C3 |
|---|---:|---|---|---|
| `pages/settings/ServiceSettings.tsx` + `components/ServiceModal.tsx` | 24 | `service_categories`, `services`, `service_upsells`, `storage.service_images` | P0 | Criar `services/serviceSettings.ts` + `hooks/useServiceSettings.ts`. A página deve consumir hooks; o modal deve receber mutations/handlers ou usar hooks próprios. Usar `companyId` de `useAuth()`, não `user.id`. Cobrir criação/edição/exclusão de categoria, serviço, imagem e upsells. |
| `pages/settings/RecycleBin.tsx` | 4 | RPCs `get_deleted_items`, `restore_appointment`, `restore_client`, `restore_service`, `restore_financial_record`, `restore_team_member` | P1 | Criar `services/recycleBin.ts` + `hooks/useRecycleBin.ts`. Trocar `resourceMap` dinâmico por função tipada que valida `resource_type`. Invalidar lista após restore. |
| `pages/Reports.tsx` | 2 | RPCs `get_dashboard_stats`, `get_client_insights` | P1 | Reusar/estender `services/dashboard.ts` com `fetchClientInsights`; criar `hooks/useReports.ts`. Usar `companyId`/tenant efetivo. Hoje `selectedMonth`/`selectedYear` recarregam a tela, mas as RPCs não recebem mês/ano. C3 deve preservar comportamento atual ou explicitar limitação. |
| `pages/QueueStatus.tsx` | 8 | `queue_entries`, `profiles`, RPC `get_queue_position`, realtime `queue_entries` | P1 | Criar `services/queueStatus.ts` ou estender `services/queue.ts` com `fetchQueueStatus`, `fetchQueueBusinessProfile`, `fetchQueuePosition`. Manter `supabase.channel()` na página se seguir regra v1 de realtime permitido; remover `from/rpc` da página. Avaliar se fallback client-side de posição deve ficar no service. |
| `pages/settings/CommissionsSettings.tsx` | 6 | `business_settings`, `team_members`, RPC `recalculate_pending_commissions` | P2 | Já usa `useTeamMembers()` e `useBusinessSettings()`. Próximo passo é mover mutations para `services/settings.ts`/`services/team.ts` e criar hooks `useUpdateCommissionSettings`, `useUpdateCommissionRate`, `useUpdateMachineFeeSettings`. |
| `pages/ClientArea.tsx` | 10 | `profiles`, `business_settings`, RPC `get_client_bookings_history`, `public_bookings` realtime, `public_clients` | P2 | Usar/estender `services/publicBooking.ts` para business profile, settings, histórico e update de perfil público. Manter realtime na página se permitido; remover queries/RPC diretas. Cuidado extra: rota pública, sem `useAuth()`, depende de `PublicClientContext`. |

## Prioridade Recomendada

1. `ServiceSettings` + `ServiceModal`: maior volume de chamadas, inclui writes, upload e `user.id` como tenant.
2. `RecycleBin`: mutations críticas de restauração, fácil de isolar e tipar.
3. `Reports`: baixo risco de escrita, mas remove RPC direto e reduz lógica de loading manual.
4. `QueueStatus`: fluxo público sensível; migrar queries/RPC para service mantendo realtime na página.
5. `CommissionsSettings`: depois do C3 inicial, porque já está parcialmente em hooks.
6. `ClientArea`: depois do C3 inicial, por ser fluxo público com contexto próprio.

## Critério de Pronto Para C3

- Zero `supabase.from()`/`supabase.rpc()` nas quatro páginas do escopo C3.
- `supabase.channel()` pode permanecer nas páginas de realtime, desde que não contenha leitura/escrita de dados fora do subscription handler.
- `companyId` deve vir de `useAuth()` nas rotas autenticadas.
- Rotas públicas (`QueueStatus`, depois `ClientArea`) não devem aceitar `company_id` de URL como autorização; o service deve buscar pelo identificador público e depender de RLS/RPC segura.
- Mutations devem invalidar queries via TanStack Query quando houver hook existente.
