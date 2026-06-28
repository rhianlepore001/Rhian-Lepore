# Tech Debt — descoberto durante execução das sprints

> Itens fora do escopo das sprints em andamento. Registrados para não bloquear a entrega.

## Agenda v2

### TD-01 — `AppointmentEditModal` não recalcula `duration_minutes` ao editar serviços
- **Onde:** `components/AppointmentEditModal.tsx` (`handleSave`, ~linha 232).
- **Problema:** ao editar um agendamento e trocar os serviços, o `UPDATE` grava `service`/`price`/`appointment_time` mas **não** atualiza `duration_minutes`. Se a nova combinação de serviços tiver duração diferente, o cálculo de "atrasado" (amarelo) em `utils/appointmentStatus.ts` usará a duração antiga.
- **Impacto:** baixo — só afeta o limiar do amarelo (15min de tolerância já absorve pequenas diferenças); status terminais (Completed/Cancelled/NoShow) não são afetados.
- **Correção sugerida:** somar `duration_minutes` dos `selectedServicesDetails` e incluir no `update`. Não feito agora por estar fora do escopo da SPEC-agenda-v2 (que só pede `edited_at` no EditModal).

### TD-02 — `alert()`/`confirm()` nativos nos handlers de status da Agenda
- **Onde:** `pages/Agenda.tsx` (`handleCompleteAppointment`, `handleCancelAppointment`, `handleNoShowAppointment`).
- **Problema:** uso de `alert`/`confirm` nativos em vez de modal/toast do design system.
- **Nota:** débito **pré-existente** já catalogado em `SPEC-ui-audit.md`. O novo `handleNoShowAppointment` seguiu o padrão local por consistência (AGENTS.md: mimetizar o vizinho). Resolver junto com o O1 do ui-audit.
