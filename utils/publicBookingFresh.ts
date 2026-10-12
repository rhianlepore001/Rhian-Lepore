/**
 * Tela de sucesso do link público: o polling (get_public_booking_by_id) devolve só alguns campos
 * (id, status, horário, serviços, profissional, total, duração, nome/telefone). Não substituir o
 * pedido inteiro por essa resposta: is_edit, original_appointment_time, created_at, product_lines…
 * vêm do create/edit e sumiriam (ex.: "alteração enviada" viraria a cópia de pedido novo).
 * Junta só os campos definidos da resposta, e só se for o mesmo pedido.
 */
export type PublicBookingLike = Record<string, unknown> & { id?: unknown };

export function mergeFreshPublicBooking<T extends PublicBookingLike | null>(
  prev: T,
  fresh: PublicBookingLike | null | undefined,
): T | PublicBookingLike | null {
  if (!fresh || typeof fresh !== 'object') return prev;
  if (!prev) return fresh;
  if (fresh.id != null && prev.id != null && String(fresh.id) !== String(prev.id)) return prev;
  const next: PublicBookingLike = { ...prev };
  for (const [k, v] of Object.entries(fresh)) {
    if (v !== undefined && v !== null) next[k] = v;
  }
  return next;
}
