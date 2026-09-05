# SPEC: Clube — formulário em página + área do cliente

**Status:** ready
**Criado:** 2026-09-05
**Prioridade:** alta

## O que o cliente final vê

### Dono — Planos do Clube (`/#/configuracoes/clube`)

1. A lista mostra os planos já criados (ou erro com “Tentar novamente”, nunca vazio silencioso).
2. “Novo plano” e “Editar” abrem o **formulário na própria página**, com **Voltar**.
3. Não há modal solto para criar/editar.
4. Editar e excluir ficam visíveis no toque (sem hover).

### Cliente — Minha área (`/#/minha-area/:slug`)

1. Texto e botões cabem na tela no mobile (sem estourar a margem).
2. Abas em grade de 4 colunas, sem scroll horizontal.
3. “Novo agendamento” vai para `/#/book/:slug?agendar=1`.

### Link público (`/#/book/:slug`)

1. Cliente já logado naquele negócio cai na **área do cliente**.
2. `?agendar=1`, `?edit=` e `?rebook=` continuam no agendamento.

## O que muda no sistema

- `MembershipPlansSettings`: vista lista ↔ formulário (sem `Modal` de create/edit).
- Query de planos: estado de erro explícito; serviços via `useServices`.
- `PlanCard`: compacto, sem gradient; ações do dono sempre visíveis.
- `ClientArea`: hero empilhado, abas em grid, overflow contido.

## O que NÃO muda

- ConfirmModal de exclusão.
- Abas Planos / Pix / Assinantes (`ClubOwnerNav`).
- Redirect `shouldLandOnClientArea` (já em `utils/publicBookingLanding.ts`).
- Schema / RLS das tabelas do clube.

## Edge cases

- Falha ao listar planos → ErrorState + retry, não “Nenhum plano ainda”.
- `service_ids` nulo no plano → formulário abre com lista vazia.
- Form com save em andamento → Voltar não descarta no meio do request (botão desabilitado).

## Teste

1. Lista com fixtures → cards + Editar visível.
2. Clicar Novo plano → heading “Novo plano”, botão Voltar, **sem** `role=dialog`.
3. Voltar → lista de novo.
4. `isError` → “Não foi possível carregar os planos”.

## Arquivos envolvidos

- `pages/settings/MembershipPlansSettings.tsx`
- `components/membership/PlanCard.tsx`
- `pages/ClientArea.tsx`
- `test/pages/MembershipPlansSettings.test.tsx`
- `test/components/PlanCard.test.tsx`

## Done when

- [ ] Create/edit não usa Modal
- [ ] Voltar restaura a lista
- [ ] Erro de fetch não mascara empty state
- [ ] Área do cliente sem overflow nas abas
- [ ] typecheck, lint, build, test
