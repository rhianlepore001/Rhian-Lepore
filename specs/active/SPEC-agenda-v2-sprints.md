# Sprints — Agenda v2

**Fonte:** `SPEC-agenda-v2.md` + `PRD-agenda-v2-visao-completa-e-status.md`
**Stack:** React 19 · TypeScript 5.8 · Vite 6 · Tailwind · Supabase · `hooks/useBrutalTheme.ts`

> **Gate por sprint (obrigatório — AGENTS.md):** `npm run typecheck` · `npm run lint` · `npm run build` verdes (+ `npm test` se a suíte tocada existir) + smoke mobile 375px nos temas relevantes (`barber-dark|barber-light|beauty-dark|beauty-light`).
> **Regras duras:** mobile-first (touch ≥44px, `text-xs` mínimo); todo query filtra por `company_id` via `useAuth()`; HashRouter intocado; não tocar RPC/RLS além da coluna `edited_at`; componentes novos seguem o padrão visual moderno (`ui-modernizacao-tema-barber`), não o brutalista antigo.

---

## Mapa de dependências

```
Sprint 1 (fundação) ──┬──→ Sprint 2 (cores/status)  ┐
                      ├──→ Sprint 3 (grid/carrossel) ┼──→ Sprint 5 (regressão + validação)
                      └──→ Sprint 4 (filtro de role) ┘

S2 e S3 podem rodar em paralelo (arquivos majoritariamente distintos; coordenar só o JSX do card).
S4 depende de S1; idealmente após S3 (compartilha o carrossel de avatares).
```

---

## Sprint 1: Fundação — dados, tipos e util de status
**Objetivo:** base de dados/tipos/lógica que todas as outras sprints consomem. Sem isso, cores e badge não têm de onde derivar.
**Dependências:** nenhuma

### Features
- feat-101: migration aditiva
  - [ ] `ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;` em nova migration `supabase/migrations/`
  - [ ] comentário da coluna `status` atualizado com os 5 valores (`Pending`, `Confirmed`, `Completed`, `Cancelled`, `NoShow`)
  - [ ] migration é idempotente (`IF NOT EXISTS`) e não toca RLS/RPC
- feat-102: tipos
  - [ ] `Appointment.status` em `types.ts` = `'Confirmed' | 'Pending' | 'Completed' | 'Cancelled' | 'NoShow'`
  - [ ] `edited_at?: string | null` e `duration_minutes?: number` presentes na interface
  - [ ] interface local `Appointment` em `pages/Agenda.tsx` (25-38) alinhada com os novos campos
  - [ ] `npm run typecheck` verde
- feat-103: util `utils/appointmentStatus.ts` (novo)
  - [ ] `getVisualStatus(apt, now): 'completed'|'overdue'|'normal'|'noshow'|'cancelled'`
  - [ ] precedência: `cancelled`/`noshow`/`completed` vencem `overdue`/`normal`
  - [ ] amarelo (`overdue`): `now > appointment_time + (duration_minutes ?? 30)min + 15min AND status IN ('Pending','Confirmed')`
  - [ ] mapa de cores/classes por tema (4 variantes) + label PT-BR por estado
  - [ ] testes unitários: limite exato de 15min, fallback 30min, precedência de estado terminal, cada cor por estado
  - [ ] `npm test` verde para o novo arquivo de teste

### Hints para o Coder
- Arquivos: `types.ts` (26-47), `pages/Agenda.tsx` (interface 25-38, leitura 667/679), `supabase/migrations/` (padrão de migrations existentes), `hooks/useBrutalTheme.ts` (cores/tema)
- Notas: `status` é TEXT sem CHECK — `NoShow` não precisa de migration de schema. Não introduzir enum. Cores base do PRD §2 (emerald/amber/stone/red); ajustar contraste no tema beauty.

---

## Sprint 2: Cores de status no card + modal + ação NoShow
**Objetivo:** comunicar status por cor no card inteiro, badge "Editado", e ação "Não compareceu", reusando o util de S1 em todos os pontos que mostram status.
**Dependências:** Sprint 1
**Paralelizável com:** Sprint 3 (coordenar só o JSX do card)

### Features
- feat-201: cor no card da Agenda
  - [ ] card inline (`Agenda.tsx` 1360-1401) usa `getVisualStatus` para colorir o corpo inteiro (não só o dot)
  - [ ] cores corretas nos 4 temas; legibilidade do texto preservada (contraste ≥4.5:1)
  - [ ] sem cor hardcoded nova — tudo via util/tokens
- feat-202: badge "Editado"
  - [ ] badge aparece no card quando `edited_at` não nulo
  - [ ] `AppointmentEditModal` (`components/AppointmentEditModal.tsx`) seta `edited_at = now()` ao salvar edição real (horário/serviço/preço/cliente)
  - [ ] concluir/cancelar/NoShow NÃO setam `edited_at` (verificado: badge não aparece após essas transições)
- feat-203: ação "Não compareceu"
  - [ ] botão/ação no modal de detalhes e/ou card seta `status='NoShow'`
  - [ ] guard D-07 respeitado: staff não altera `Completed` (toast de bloqueio)
  - [ ] card reflete cor cinza/marrom imediatamente
- feat-204: reuso em outros consumidores
  - [ ] badge do modal de detalhes (`Agenda.tsx` 1448-1450) usa a paleta do util
  - [ ] `components/dashboard/modals/AllAppointmentsModal.tsx` usa a mesma paleta
- feat-205: `handleAcceptBooking` popula duração
  - [ ] o INSERT/UPDATE de appointment no aceite de booking público grava `duration_minutes` (soma dos serviços), igual à RPC `create_secure_booking`

### Hints para o Coder
- Arquivos: `pages/Agenda.tsx` (card 1360-1401, modal 1448-1450, `handleAcceptBooking`), `components/AppointmentEditModal.tsx`, `components/dashboard/modals/AllAppointmentsModal.tsx`, `utils/appointmentStatus.ts` (S1)
- Notas: dot de status atual (1395-1398) é substituído por cor no corpo. Não recriar lógica de cor — só consumir o util. `complete_appointment`/cancelamento intocados (eles têm `completed_at` próprio).

---

## Sprint 3: Grid compacto + carrossel unificado
**Objetivo:** o dia inteiro cabe em 375px; um único carrossel horizontal.
**Dependências:** Sprint 1
**Paralelizável com:** Sprint 2

### Features
- feat-301: densidade do grid
  - [ ] altura do slot reduzida (densidade por tema) — substitui `min-h-[90px]` (1329) / `min-h-[75px]` (1369)
  - [ ] em 375×667, ≥8h visíveis sem scroll vertical; em desktop 1280×800, 12h visíveis
  - [ ] legibilidade mantida: cliente, serviço, hora e status visíveis no bloco; touch ≥44px
- feat-302: carrossel unificado
  - [ ] date strip (1115-1152) + avatares (1154-1194) unificados numa única área de scroll horizontal
  - [ ] não há dois `overflow-x-auto` competindo pelo mesmo gesto
  - [ ] sem perda de funcionalidade (navegação de data + seleção de profissional preservadas)

### Hints para o Coder
- Arquivos: `pages/Agenda.tsx` (grid 1310-1410, slot 1329/1369, date strip 1115-1152, avatares 1154-1194), `hooks/useBrutalTheme.ts` (densidade por tema)
- Notas: coordenar com SPEC-mobile-first-audit (touch ≥44px). Posicionamento atual é flexbox inline; manter performático. Largura mínima por coluna para >8 profissionais.

---

## Sprint 4: Filtro consciente de role (R27)
**Objetivo:** staff vê só os seus; "Todos" só para owner; multi-select de colegas.
**Dependências:** Sprint 1 (idealmente após Sprint 3 — compartilha o carrossel de avatares)

### Features
- feat-401: default por role
  - [ ] estado inicial do filtro: se `role === 'staff'`, default no próprio `teamMemberId`; se owner, "Todos"
  - [ ] `fetchTeamMembers` (333-341) e `displayedMembers` (937-939) conscientes de role
  - [ ] botão "Todos" (1158-1166) renderizado só para owner
- feat-402: multi-select
  - [ ] filtro de profissional passa de string única (`selectedProfessionalFilter`, 101) para conjunto de IDs
  - [ ] staff pode incluir/remover colegas via avatares; owner mantém comportamento atual
- feat-403: fallback seguro
  - [ ] staff sem `teamMemberId` → mostra vazio + aviso, nunca "todos"

### Hints para o Coder
- Arquivos: `pages/Agenda.tsx` (101, 333-341, 937-939, 1154-1194), `contexts/AuthContext.tsx` (`teamMemberId` já existe em :121, exposto 381/402)
- Notas: NÃO alterar AuthContext (só consumir). RLS isola por `company_id`, não por `professional_id` — o filtro é de UI/query, não de segurança de banco. Multi-tenant intocado.

---

## Sprint 5: Regressão + validação mobile
**Objetivo:** garantir zero regressão e fechar o DoD do PRD.
**Dependências:** Sprint 2, Sprint 3, Sprint 4

### Features
- feat-501: smoke de regressão
  - [ ] booking público (`/#/booking/:id`), fila digital (`/#/queue/:id`), checkout e wizard funcionam sem regressão
  - [ ] navegação histórica: dia anterior exibe blocos com as cores de status corretas
- feat-502: validação cross-tema/mobile
  - [ ] Chrome Android 375px nos 4 temas
  - [ ] gates finais verdes: `npm run typecheck && npm run lint && npm run build` (+ `npm test`)
  - [ ] checklist "Done when" da `SPEC-agenda-v2.md` totalmente marcado

### Hints para o Coder
- Arquivos: rotas públicas, `pages/Agenda.tsx`, `components/CheckoutModal.tsx`, `components/AppointmentWizard.tsx` (apenas smoke — não modificar)
- Notas: rodar `graphify update .` após fechar (AGENTS.md). Validar com usuário real (gotcha de RLS).

---

## Notas transversais
- **Cores:** paleta única em `utils/appointmentStatus.ts`; zero hardcode espalhado.
- **Tema:** componentes novos seguem `ui-modernizacao-tema-barber` (border 1px, hover brightness), não o brutalista antigo.
- **Mobile:** touch ≥44px, `text-xs` mínimo (nunca `text-[10px]` novo).
- **Regressão:** não tocar RPC/RLS além de `edited_at`; `status` continua TEXT; real-time/i18n/notificações fora de escopo.
