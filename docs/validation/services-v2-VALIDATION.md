# Validação — services cleanup + sidebar + inactive bookable

Branch: `feat/services-cleanup-sidebar-visibility`

## Session 1 — Remover upsells da UI

**Score: 9/10**

### O que mudou
- `components/ServiceModal.tsx`: removida seção "🚀 Upsells (Sugestões)" e estado/hooks associados.
- `pages/PublicBooking.tsx`: removido import morto de `UpsellSection`.
- `components/UpsellSection.tsx`: arquivo removido (não era mais renderizado).
- `services/serviceSettings.ts`: `saveService` **não** apaga/reescreve `service_upsells` (evita wipe). `setServiceActive` intacto.
- `hooks/useServiceSettings.ts`: removido `useServiceUpsellIds`.
- `types/serviceSettings.ts`: `upsellIds` opcional e ignorado no save.
- Schema DB **intocado** (sem migrations).

### Justificativa
Correto e sem regressão de wipe. Dashboard `ActionCenter`/`SmartNotifications` mantêm tipo `upsell` de oportunidade (não é UI de serviço). Deduziu 1 ponto: dados legados em `service_upsells` ficam órfãos na UI (intencional).

---

## Session 2 — Serviços no sidebar/mobile

**Score: 9/10**

### O que mudou
- `constants.ts` `NAVIGATION_ITEMS`: entrada **Serviços** (`Scissors`, `/configuracoes/servicos`, `ownerOnly: true`, grupo Operação, entre Equipe e Produtos).
- `components/MoreOptionsDrawer.tsx`: mesma entrada no menu "Mais".
- `SETTINGS_ITEMS` ícone Serviços → `Scissors` (consistência).
- Gate: `ownerOnly` + rota já protegida por `OwnerRouteGuard` — staff não vê.

### Justificativa
Hierarquia limpa, ícone distinto de Produtos, testes de nav atualizados. −1: mobile bottom bar continua sem atalho direto (só no drawer "Mais", padrão existente).

---

## Session 3 — Header do ServiceModal (mobile)

**Score: 9/10**

### O que mudou
- Título **não** é sticky; rola com o formulário.
- Botão **X** absoluto no canto, `z-20`, fundo sólido (`bg-[var(--color-card)]` + borda + sombra), `aria-label="Fechar"`.
- Mesmo comportamento em Novo/Editar.

### Justificativa
Corrige overlay do título sobre campos. Desktop preservado (mesmo container). −1: prova visual Playwright a confirmar nesta sessão.

---

## Session 4 — Inativos/excluídos nunca bookable

**Score: 9/10**

### O que mudou
- Helper `utils/filterBookableServices.ts` (+ Vitest).
- Aplicado em: `fetchPublicServices`, `fetchAgendaServices`, `Agenda.fetchServices`, `QueueManagement` query, `MembershipPlansSettings`.
- RPC live `get_public_services_catalog` **já** filtra `active = true` (confirmado via Supabase MCP). Sem migration aplicada.
- `services.deleted_at` **não existe** no DB de produção (coluna ausente); exclusão atual é hard delete via `deleteService`.
- Histórico/agenda de appointments existentes: queries de preço por nome **não** filtram active (correto).

### Justificativa
Cobertura client + RPC. −1: prova E2E com serviço temporário ZZ ainda pendente nesta escrita.

---

## Verificação automatizada
(preencher após lint/tsc/vitest/build)

## Screenshots
(preencher caminhos absolutos)
