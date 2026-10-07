# SPEC — Permissão de bloqueio de agenda com 3 opções (igual a “Edição de agendamentos”)

> **Fase 2: implementado no PR (migration ainda NÃO aplicada em prod).** Mapa feito em 2026-10-07 a partir de
> `main` (`ee5502c9`) e de prod (`lcqwrngscsziysyfhpfj`, só leitura). Decisões da Rhian na seção 8.1.

## 0. Pedido

Hoje o card “Bloqueio de agenda” é um liga/desliga (“Colaboradores podem bloquear a própria agenda”). Rhian quer as
mesmas 3 opções do card “Edição de agendamentos” (Configurações › Negócio › Equipe e Comissões):

| Edição (existe) | Bloqueio (novo) |
|---|---|
| Não podem editar | **Não podem bloquear** |
| Só os próprios | **Podem bloquear a própria agenda** |
| Todos os agendamentos | **Podem bloquear todas** |

O dono sempre pode tudo.

## 1. Como a “Edição de agendamentos” funciona hoje (modelo a espelhar)

- **Coluna:** `business_settings.staff_appointment_edit_scope text NOT NULL DEFAULT 'none'`, com
  `CHECK (… IN ('none','own','all'))`. Veio da migration `20260925140000_staff_appointment_edit_scope.sql`.
  - Em prod: 27 negócios `none`, 1 `all`.
- **Gravação:** `services/settings.updateStaffAppointmentEditScope` faz `upsert` (onConflict `user_id`).
  - RLS: “Owner can manage” (`auth.uid() = user_id`) e “Settings: owner update” (`get_auth_role()='owner'`).
  - A equipe só lê (“Settings: company read”).
- **Enforcement no servidor:**
  - `staff_can_modify_appointment(company, old_pro, new_pro, old_status)`, STABLE SECURITY DEFINER:
    - não-staff → true;
    - staff nunca mexe em finalizados;
    - `all` → true;
    - `own` → o profissional antigo e o novo são o próprio colaborador;
    - `none` → false.
  - Trigger `enforce_staff_appointment_edit_scope` (BEFORE UPDATE/DELETE em `appointments`) chama a função quando
    `current_user = 'authenticated'` (escrita direta via PostgREST).
  - RPCs: `reschedule_appointment` chama `staff_can_modify_appointment`; `caller_can_act_on_public_booking` lê o scope
    (`all` libera aceitar pedidos de outros, PR-7).
- **UI:** `components/settings/StaffAppointmentPermissionSection.tsx` (página `pages/settings/TeamSettings.tsx`, só dono).
  - Card “Edição de agendamentos” com `role="radiogroup"` de 3 `label` + `input radio`.
  - Opções em `utils/staffAppointmentPermission.STAFF_APPOINTMENT_EDIT_SCOPE_OPTIONS`.
  - Salva na hora com toast. Ícone de carregando/check. `data-testid="staff-edit-scope-<valor>"`.
  - Se a coluna não existe, fica travado no padrão.
  - Front: `canEditAppointment` etc. em `utils/staffAppointmentPermission.ts` (só UX).

## 2. Como o bloqueio funciona hoje (prod)

- **Tabela** `agenda_blocks(id, user_id text, professional_id uuid NOT NULL → team_members ON DELETE CASCADE, starts_at, ends_at, created_by, created_at)`.
  - Tem `CHECK ends_at > starts_at`. Sem triggers.
  - RLS: só SELECT para a empresa (`user_id = get_auth_company_id()`). Grants: `authenticated: SELECT`.
  - **Toda escrita é por RPC.**
- **RPCs** (SECURITY DEFINER, `authenticated`):
  - `create_agenda_block(p_professional_id, p_starts_at, p_ends_at, p_acknowledge_conflicts, p_confirmed_conflict_ids)`.
    Checa `staff_can_manage_agenda_block(p_professional_id)`, intervalo ≤ 366 dias, início passado, profissional ativo,
    advisory lock, lista de conflitos (appointments Confirmed/Pending + public_bookings pending/confirmed) com
    confirmação e INSERT.
  - `delete_agenda_block(p_block_id)`. Checa `staff_can_manage_agenda_block(professional do bloqueio)`; bloqueio já
    terminado não sai.
  - **Não existe RPC de editar bloqueio.** Editar = remover e criar.
- **Permissão:** `staff_can_manage_agenda_block(p_professional_id)`:
  - sem login → false;
  - o profissional precisa ser do negócio do caller (via `profiles.company_id`);
  - **não-staff → true**;
  - staff: `COALESCE(bs.staff_can_block_agenda, true)` precisa ser true **e** `team_members.staff_user_id = auth.uid()`
    para aquele profissional.
- **Configuração atual:** `business_settings.staff_can_block_agenda boolean NOT NULL DEFAULT true`. Em prod, **as 28
  linhas = true**. Negócio sem linha → true (COALESCE).
- **O que a equipe pode hoje, na prática:**
  - **ligado** (todos os negócios) → cada colaborador cria e remove bloqueios **só na própria coluna**, inclusive
    bloqueio que o dono colocou nela (a regra é pelo profissional, não pelo autor);
  - **desligado** → nenhum.
  - **Nunca** na coluna de outro.
  - Em prod existe 1 bloqueio (Barbearia Silva), criado pelo próprio colaborador na própria coluna.
- **“Dia inteiro para todos” não existe.** `professional_id` é NOT NULL. “Dia inteiro” no `AgendaBlockForm` é só um
  *tipo de período* (Período no dia / Dia inteiro / Vários dias) para **um** profissional.
  - O dono escolhe o profissional no select. O staff não vê o select (vai o próprio).
  - Fechar o negócio inteiro hoje = um bloqueio por profissional.
- **Efeitos colaterais:**
  - Bloqueio impede, nos dois sentidos: appointments (trigger `enforce_agenda_block_on_appointments`), pedidos online
    (`enforce_agenda_block_on_public_bookings`, `public_booking_slot_busy`), slots (`get_available_slots`,
    `get_first_available_professional`, `agenda_any_professional_busy`), `create_secure_booking` e
    `client_edit_request_slot_conflict`.
  - **Fila:** `settle_queue_ticket` grava appointments `Completed`, que o trigger deixa passar (`20261003090000`).
    `create/delete_agenda_block` não mexem na fila.
  - **Não há efeito colateral de fila ligado à permissão.**
  - (`test-sql-agenda-blocks-queue.sh` é a falha já conhecida: harness com assinatura antiga de `create_agenda_block`.)
- **Front:**
  - `utils/agendaBlockPermission.ts`: `normalizeStaffCanBlockAgenda`, `canCreateAgendaBlock`, `canManageAgendaBlock`,
    `agendaBlockBandLabel`.
  - `pages/Agenda.tsx`: `staffCanBlock`, `canOpenBlockFromPlus`, `openEmptySlot`, `AgendaCreateChoice`,
    `AgendaBlockForm showProfessionalSelect={!isStaff && !choiceFromSlot}`, `AgendaBlockDetails canUnlock`.
  - `components/QuickActionsModal.tsx` (atalho “Bloquear agenda”).
  - `services/settings.updateStaffCanBlockAgenda`.
  - `StaffAppointmentPermissionSection` (card “Bloqueio de agenda”, `SettingsSwitch`).

## 3. Desenho proposto

### 3.1 Coluna (aditiva) e padrão que preserva hoje

```sql
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS staff_agenda_block_scope text NOT NULL DEFAULT 'own'
  CONSTRAINT business_settings_staff_agenda_block_scope_check CHECK (staff_agenda_block_scope IN ('none','own','all'));
UPDATE public.business_settings
   SET staff_agenda_block_scope = CASE WHEN staff_can_block_agenda IS FALSE THEN 'none' ELSE 'own' END;
```

- **Padrão = `own`** (“Podem bloquear a própria agenda”). É o que vale hoje para todos: 28/28 ligados, e os sem linha
  ficam ligados por COALESCE.
- ⚠️ **Atenção, diferente da edição:** o padrão da edição é `none`. O do bloqueio precisa ser `own`, senão a equipe
  perde o que já pode fazer.
- **Compatibilidade com a coluna antiga** (front em cache durante o deploy):
  - manter `staff_can_block_agenda`;
  - um trigger BEFORE INSERT/UPDATE em `business_settings` sincroniza:
    - se só o booleano mudou (front antigo): `false → 'none'`, `true → 'own'` (ou mantém `'all'` se já era `all`);
    - se o scope mudou: `staff_can_block_agenda := (scope <> 'none')`.
  - O booleano pode ser removido numa migration futura (Q4).

### 3.2 Enforcement no servidor (um só ponto)

`staff_can_manage_agenda_block(p_professional_id)`: `CREATE OR REPLACE` a partir do `pg_get_functiondef` de prod.
Mantém STABLE SECURITY DEFINER, search_path, dono e ACL (`postgres, service_role`).

```
não-staff → true (como hoje)
staff:
  v_scope := COALESCE(bs.staff_agenda_block_scope,
                      CASE WHEN COALESCE(bs.staff_can_block_agenda, true) THEN 'own' ELSE 'none' END,
                      'own')
  o caller precisa ter team_member ATIVO e não excluído no negócio   ← novo (ver risco R2)
  'none' → false
  'own'  → p_professional_id é o team_member do caller (regra de hoje)
  'all'  → true (profissional já validado como do negócio)
```

- `create_agenda_block` e `delete_agenda_block` já chamam essa função: **não precisam mudar** (corpo idêntico, md5
  conferido).
- Não há RPC de update. Se um dia existir, deve chamar a mesma função para o profissional antigo e o novo.
- RLS de `agenda_blocks` continua só SELECT. Nenhuma escrita direta.

### 3.3 Tratamento por tipo de bloqueio

| Bloqueio | none | own | all |
|---|---|---|---|
| Na própria coluna (qualquer tipo: período, dia inteiro, vários dias) | ✗ criar/remover | ✓ criar/remover | ✓ |
| Na própria coluna, **criado pelo dono** | ✗ | ✓ remover (como hoje — ver Q2) | ✓ |
| Na coluna de outro profissional | ✗ | ✗ | ✓ criar/remover |
| “Negócio inteiro” | não existe hoje (é um bloqueio por profissional); com `all`, o staff faria um por profissional — ver Q3 | | |
| Bloqueios existentes ao trocar a opção | continuam valendo (nada é apagado) | | |

### 3.4 UI

- Em `StaffAppointmentPermissionSection`, o card “Bloqueio de agenda” troca o `SettingsSwitch` por um `radiogroup`
  idêntico ao da edição.
  - Novo `STAFF_AGENDA_BLOCK_SCOPE_OPTIONS` em `utils/agendaBlockPermission.ts`.
  - Labels: “Não podem bloquear” / “Podem bloquear a própria agenda” / “Podem bloquear todas”.
  - Descrições curtas, por exemplo “Cada um trava e destrava só a própria coluna.” e “Travam e destravam a agenda de
    qualquer profissional.”
  - Rodapé “Você, como dono, sempre pode. Os bloqueios que já existem continuam valendo.”
  - `data-testid="staff-block-scope-<valor>"`.
- `canCreateAgendaBlock` / `canManageAgendaBlock` / `agendaBlockBandLabel` recebem `scope` em vez de `staffCanBlock`:
  - `none` → false;
  - `own` → regra atual;
  - `all` → true.
- `AgendaBlockForm`: `showProfessionalSelect` passa a ser true também para staff com `all`.
- Slots de outras colunas oferecem “Bloquear a partir daqui”.
- `AgendaBlockDetails` mostra “Desbloquear” conforme a regra.
- `QuickActionsModal` mostra o atalho quando o scope não é `none`.
- `normalize…`: sem coluna/valor inválido → `own`. Coluna ausente → travado em `own`, com aviso igual ao da edição.

## 4. Critérios de aceite

1. Coluna `staff_agenda_block_scope` NOT NULL DEFAULT `'own'`, com CHECK `none/own/all`. Backfill: as 28 linhas atuais =
   `own`. Negócio sem linha → `own`.
2. `none`: staff recebe `forbidden` em `create_agenda_block` e `delete_agenda_block` para qualquer coluna, inclusive a
   própria. Nada é gravado/apagado.
3. `own`: staff cria/remove na própria coluna (os três tipos de período). `forbidden` na coluna de outro. Remover um
   bloqueio do dono na própria coluna segue permitido (comportamento atual).
4. `all`: staff cria/remove em qualquer coluna ativa do próprio negócio. Profissional de outro negócio ou inativo →
   `forbidden`.
5. O dono cria/remove sempre, em qualquer opção.
6. Colaborador excluído/inativo (login ainda existente, `profiles.role='staff'`) → `forbidden` em qualquer opção.
7. Trocar a opção não altera nem apaga bloqueios existentes.
8. Compat: o front antigo gravando `staff_can_block_agenda=false/true` → o scope vira `none`/`own` (`all` é preservado
   com `true`). Gravar o scope atualiza o booleano.
9. Só o dono grava o scope (staff → erro de RLS; anon sem acesso).
10. `staff_can_manage_agenda_block` mantém SECURITY DEFINER, `search_path=public`, dono postgres e ACL
    `{postgres,service_role}`. `create_agenda_block`/`delete_agenda_block` intocados (md5 = prod).
11. **Regressão:**
    - bloqueio continua impedindo appointment/pedido online/slots;
    - fila (`settle_queue_ticket`) continua finalizando dentro de bloqueio;
    - conflitos e confirmação de lista sem mudança;
    - `test-sql-agenda-blocks*.sh`, `staff-edit-scope`, `booking-*` passam (exceto o conhecido `agenda-blocks-queue`).
12. **UI:**
    - radiogroup com as 3 opções, mesmo visual do card de edição, salva com toast;
    - light/dark, barber/beauty, 375 px sem corte;
    - staff com `all` vê o select de profissional no formulário e o “Desbloquear” em qualquer coluna;
    - staff com `none` não vê “Bloquear agenda” no + / atalhos / slots.

## 5. Plano de testes

- **SQL:** `scripts/test-sql-agenda-block-scope.sh` + `supabase/tests/agenda_block_scope.{harness,test}.sql`.
  - Postgres 17 descartável, harness de `agenda_blocks` + `staff_edit_scope`.
  - md5 de `create/delete_agenda_block` e `staff_can_manage_agenda_block` = prod antes; TDD (falha antes, passa
    depois; migration 2x).
  - Matriz {dono, staff próprio, staff outro, staff excluído} × {none, own, all} × {criar, remover};
  - backfill;
  - trigger de compat;
  - `--rollback`.
- **Vitest:**
  - `agendaBlockPermission` (matriz scope × caso);
  - `StaffAppointmentPermissionSection` (radio, salvar, coluna ausente);
  - `AgendaBlockForm` (select visível para staff `all`);
  - Agenda/QuickActions (atalho conforme scope).
- **Playwright** (prod só leitura com guard + mocks de `business_settings`/RPC):
  - card novo;
  - formulário como dono e como staff (`none`/`own`/`all`);
  - telas “depois” em `/workspace/screens/block-perms/after/`.
- **Prova em prod com rollback:** no bloco `DO`, scope `all` para o negócio de teste. O staff de teste cria e remove um
  bloqueio na coluna de outro; com `none`, recebe `forbidden`. `RAISE` final; conferir que nada persistiu.

## 6. Migration e rollback

- **`supabase/migrations/<versão>_agenda_block_scope.sql`:**
  - ADD COLUMN + CHECK;
  - backfill;
  - função/trigger de sincronização em `business_settings`;
  - `CREATE OR REPLACE staff_can_manage_agenda_block`;
  - `COMMENT`. Sem GRANT novo.
- **`docs/rollbacks/<versão>_agenda_block_scope.rollback.sql`:**
  - restaura `staff_can_manage_agenda_block` exata de prod;
  - `DROP TRIGGER/FUNCTION` de sincronização;
  - acerta `staff_can_block_agenda = (scope <> 'none')` (preserva a escolha);
  - `DROP COLUMN` opcional/comentado.
  - Quem estava em `all` volta a `own` (perde só o “todas”).
- **Ordem:** pré-checks md5 → prova com rollback → `apply_migration` → md5/ACL → renomear para a versão de prod → front
  (tolera coluna ausente) → CI → merge → Vercel.

## 7. Riscos

- **R1. Padrão errado:** copiar o `none` da edição tiraria de todo mundo o bloqueio da própria agenda. O padrão tem que
  ser `own`.
- **R2. Login órfão de colaborador:** hoje `staff_can_manage_agenda_block` só olha `profiles.company_id`/`role`. Com
  `all`, um colaborador **excluído cujo login ainda existe** poderia bloquear/desbloquear qualquer coluna.
  - Caso real: CAIQUE XAVIER, MODERNA BARBEARIA, membro excluído em 2026-09-11 com login ainda vivo.
  - Por isso a exigência nova de team_member ativo (critério 6).
- **R3. Dois controles para a mesma coisa** durante a transição (booleano + scope): mitigado pelo trigger de
  sincronização; remover o booleano depois.
- **R4. Front antigo em cache** mostra o switch e grava o booleano: coberto pelo trigger (`all` não é rebaixado por
  `true`).
- **R5.** Com `all`, um colaborador pode bloquear o dia de um colega com atendimentos. A confirmação de conflitos já
  existente mostra a lista; os atendimentos não são cancelados (comportamento atual do bloqueio).

## 8. Perguntas para a Rhian

- **Q1.** Padrão para todos os negócios = **“Podem bloquear a própria agenda”** (é o que vale hoje para 100% dos
  negócios). Confirma?
- **Q2.** Com “própria agenda”, o colaborador pode **remover um bloqueio que o dono colocou** na coluna dele? Hoje pode.
  Manter, ou bloquear só os que ele mesmo criou?
- **Q3.** Quer uma opção “**Todos os profissionais**” no formulário (fechar o negócio inteiro de uma vez = um bloqueio
  por profissional)? Hoje não existe nem para o dono. Se sim, só dono, ou também staff com “todas”?
- **Q4.** Depois de estabilizar, podemos remover a coluna antiga `staff_can_block_agenda`?
- **Q5.** Com “todas”, o colaborador vê no formulário o select de profissional com todos (inclusive o dono)?

### 8.1 Decisões da Rhian (2026-10-07) — valem sobre as perguntas acima

- **Q1:** padrão `own` para todos (inclusive negócio sem linha em `business_settings`), backfill a partir de
  `staff_can_block_agenda`.
- **Q2:** mantém a regra de hoje: com “própria agenda”, o colaborador remove bloqueio que o dono pôs na coluna dele.
- **Q3:** sem bloqueio de “negócio inteiro” por enquanto.
- **Q4:** a coluna antiga **não** é removida; trigger de sincronia.
- **Q5:** com “todas”, o colaborador vê no select todos os profissionais ativos, inclusive o dono.
- Exigir membro **ativo e não excluído** (risco R2).
- Labels: “Não podem bloquear” / “Podem bloquear a própria agenda” / “Podem bloquear todas”.

### 8.2 Implementação

- Migration `supabase/migrations/20261007140000_agenda_block_scope.sql`; rollback
  `docs/rollbacks/20261007140000_agenda_block_scope.rollback.sql`.
- Testes SQL: `scripts/test-sql-agenda-block-scope.sh` (+ `--rollback`), com as funções reais de prod (md5 conferido).
- Front: `utils/agendaBlockPermission.ts` (`StaffAgendaBlockScope`, `resolveStaffAgendaBlockScope`,
  `canPickAgendaBlockProfessional`, `STAFF_AGENDA_BLOCK_SCOPE_OPTIONS`), `services/settings.updateStaffAgendaBlockScope`,
  `StaffAppointmentPermissionSection` (radiogroup), `pages/Agenda.tsx`, `QuickActionsModal`.
- Mudança de comportamento intencional (decisão “membro ativo”): colaborador **inativo e não excluído** deixa de
  remover bloqueio da própria coluna. Em prod hoje: 0 colaboradores nessa situação.

## 9. Telas “antes”

Em `/workspace/screens/block-perms/before/` (prod só leitura, dono de teste; geradas por
`e2e/auto-confirm-before.shots.spec.ts`).

- `settings-permissoes-equipe-{desktop-light,desktop-dark,mobile-375-dark}.png`: cards “Edição de agendamentos”
  (3 opções) e “Bloqueio de agenda” (switch).
- `agenda-escolha-novo-ou-bloquear-*.png`: escolha “Novo atendimento / Bloquear agenda” (botão +).
- `agenda-form-bloqueio-dono-*.png`: formulário “Bloquear agenda” do dono (select Profissional + Período no dia / Dia
  inteiro / Vários dias).
- **Sem telas como staff:** não há credencial de colaborador de teste disponível. Pelo código, o formulário do staff é
  o mesmo sem o select de profissional, e só aparece na própria coluna.
