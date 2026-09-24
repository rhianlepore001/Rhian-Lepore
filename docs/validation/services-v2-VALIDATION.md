# Validação — services cleanup + sidebar + inactive bookable

Branch: `feat/services-cleanup-sidebar-visibility`  
PR: https://github.com/rhianlepore001/Rhian-Lepore/pull/90  
Preview: https://rhian-lepore-git-feat-services-3e5808-rhians-projects-df168429.vercel.app  
Provas locais: preview Vite `127.0.0.1:4173` contra o mesmo Supabase prod (conta Bob).

## Session 1 — Remover upsells da UI — **9/10**

### O que mudou
- `components/ServiceModal.tsx`: removida seção "🚀 Upsells (Sugestões)" e estado/hooks.
- `pages/PublicBooking.tsx`: removido import morto de `UpsellSection`.
- `components/UpsellSection.tsx`: removido.
- `services/serviceSettings.ts`: `saveService` **não** apaga/reescreve `service_upsells`.
- `hooks/useServiceSettings.ts`: removido `useServiceUpsellIds`.
- `types/serviceSettings.ts`: `upsellIds` opcional e ignorado.
- Schema DB intocado. `setServiceActive` intacto.

### Prova
- Texto do modal (desktop/mobile) sem "Upsells" (`servicemodal-*-text.txt`).
- Vitest `ServiceModal` sem seção de upsells.

### Justificativa
Correto; sem wipe. −1: dados legados em `service_upsells` ficam órfãos na UI (intencional). `ActionCenter`/`SmartNotifications` mantêm tipo `upsell` de oportunidade (não é UI de serviço).

---

## Session 2 — Serviços no sidebar/mobile — **9/10**

### O que mudou
- `NAVIGATION_ITEMS`: **Serviços** (`Scissors`, `/configuracoes/servicos`, `ownerOnly`, Operação, entre Equipe e Produtos).
- `MoreOptionsDrawer`: mesma entrada.
- Gate: `ownerOnly` + `OwnerRouteGuard`.

### Prova
- `/workspace/services-v2-shots/01-sidebar-desktop-1280.png` — Serviços no sidebar principal.
- `/workspace/services-v2-shots/06-mobile-mais-menu-servicos-390.png` — Serviços no menu Mais.

### Justificativa
Hierarquia limpa. −1: bottom nav sem atalho direto (só no drawer, padrão existente).

---

## Session 3 — Header ServiceModal (mobile) — **9/10**

### O que mudou
- Título **não** sticky; rola com o formulário.
- X absoluto `z-20`, fundo sólido `bg-[var(--color-card)]` + borda, `aria-label="Fechar"`.

### Prova
- `/workspace/services-v2-shots/08-servicemodal-top-mobile-390.png` — título no topo.
- `/workspace/services-v2-shots/09-servicemodal-scrolled-x-fixed-mobile-390.png` — título sumiu; X permanece.
- Desktop: `03`/`04` sem regressão.

### Justificativa
Comportamento pedido atingido. −1: no desktop o conteúdo cabe sem scroll longo (prova de “título some” é mais clara no mobile).

---

## Session 4 — Inativos/excluídos nunca bookable — **9/10**

### O que mudou
- Helper `utils/filterBookableServices.ts` (+ Vitest).
- Filtros em: `fetchPublicServices`, `fetchAgendaServices`, `Agenda.fetchServices`, `QueueManagement`, `MembershipPlansSettings`.
- RPC live `get_public_services_catalog` já tem `AND s.active = true` (MCP `pg_get_functiondef`). **Nenhuma migration aplicada.**
- `services.deleted_at` **não existe** no DB prod; exclusão = hard delete.

### Prova (conta Bob, slug `barbeariasilva`)
- Criado `ZZ Teste Inativo` → desativado → ausente do picker interno e do booking público.
- Criado `ZZ Teste Excluir` → excluído → ausente.
- Cleanup confirmado (SELECT vazio no DB).
- Shots: `10`–`16`, `14`/`15` public booking.

### Produção (antes do merge)
- RPC pública já filtrava `active=true` — inativos já não vazavam no booking público via RPC.
- Gap principal era consistência client-side + listas internas/fila/clube + defesa em profundidade.

### Justificativa
Cobertura client + RPC. −1: o shot do wizard interno (`13`) não avançou até a lista completa de serviços (fluxo depende de cliente); ausência dos ZZ foi confirmada no texto da página + booking público + settings.

---

## Verificação automatizada

| Check | Resultado |
|-------|-----------|
| `npm run typecheck` | pass |
| `npx vitest run` | 108 files / 672 tests pass |
| `npm run lint` | pass |
| `npm run build` | pass |
| CI PR #90 | Lint/Typecheck/Tests + Vercel pass |

## Screenshots (absolutos)

| Arquivo | Prova |
|---------|-------|
| `/workspace/services-v2-shots/01-sidebar-desktop-1280.png` | Serviços no sidebar desktop |
| `/workspace/services-v2-shots/02-servicos-via-main-nav-desktop-1280.png` | Navegação para settings via item Serviços |
| `/workspace/services-v2-shots/03-servicemodal-no-upsells-desktop-1280.png` | Modal sem upsells (desktop) |
| `/workspace/services-v2-shots/04-servicemodal-scrolled-x-fixed-desktop-1280.png` | Modal desktop após scroll |
| `/workspace/services-v2-shots/05-internal-appointment-picker-desktop-1280.png` | Agenda / fluxo interno |
| `/workspace/services-v2-shots/06-mobile-mais-menu-servicos-390.png` | Menu Mais com Serviços |
| `/workspace/services-v2-shots/07-servicos-settings-mobile-390.png` | Settings Serviços mobile |
| `/workspace/services-v2-shots/08-servicemodal-top-mobile-390.png` | Modal topo (título + X) |
| `/workspace/services-v2-shots/09-servicemodal-scrolled-x-fixed-mobile-390.png` | Título rolou; X fixo |
| `/workspace/services-v2-shots/10-created-zz-inativo-before-deactivate-390.png` | ZZ criado |
| `/workspace/services-v2-shots/11-zz-inativo-deactivated-list-390.png` | ZZ marcado INATIVO |
| `/workspace/services-v2-shots/12-after-delete-zz-excluir-390.png` | Após excluir ZZ Excluir |
| `/workspace/services-v2-shots/13-internal-picker-after-deactivate-390.png` | Pós-desativar (agenda) |
| `/workspace/services-v2-shots/14-public-booking-services-390.png` | Booking público mobile sem ZZ |
| `/workspace/services-v2-shots/15-public-booking-services-1280.png` | Booking público desktop |
| `/workspace/services-v2-shots/16-cleanup-done-390.png` | Cleanup |

## Queries/RPCs de listagem de serviços

| Fonte | Filtro agora |
|-------|----------------|
| `get_public_services_catalog` (RPC) | SQL `active = true` (já em prod) |
| `fetchPublicServices` | RPC + `filterBookableServices` |
| `Agenda.fetchServices` / `fetchAgendaServices` | `.eq('active', true)` + helper |
| `QueueManagement` (via `fetchServices`) | `filterBookableServices` pós-fetch |
| `QueueManualAddSheet` / `QueueCheckoutSheet` | `.filter(s => s.active)` (já existia) |
| `MembershipPlansSettings` | `filterBookableServices` |
| `fetchServices` (settings) | **sem** filtro active (lista gestão — correto) |
| Price maps histórico (Agenda) | **sem** filtro (histórico — correto) |

## Migration preparada mas NÃO aplicada
Nenhuma. RPC pública já filtra `active`.
