/**
 * Vínculo do colaborador com a empresa (ACCEPTANCE.md seção E).
 *
 * O banco (get_auth_company_id) só dá acesso à empresa enquanto existir um
 * cadastro vivo em team_members (ativo ou inativo, deleted_at vazio). A tela
 * espelha isso: sem vínculo, mesmo depois do relink_staff_if_unbound, o
 * colaborador vê "acesso removido". Erro de rede NUNCA tranca a pessoa: nesse
 * caso o estado é "unknown" e o app segue como antes (o banco continua sendo a
 * garantia).
 */
export type StaffLinkStatus = 'linked' | 'removed' | 'unknown';

export interface StaffLinkInput {
  memberId: string | null;
  memberError: unknown;
  relinkedId?: string | null;
  relinkError?: unknown;
}

export function resolveStaffLink(input: StaffLinkInput): { status: StaffLinkStatus; memberId: string | null } {
  if (input.memberId) return { status: 'linked', memberId: input.memberId };
  if (input.memberError) return { status: 'unknown', memberId: null };
  if (input.relinkedId) return { status: 'linked', memberId: input.relinkedId };
  if (input.relinkError) return { status: 'unknown', memberId: null };
  return { status: 'removed', memberId: null };
}

export function accessRemovedMessage(companyName: string | null | undefined): string {
  const name = companyName?.trim();
  return name
    ? `Seu acesso a ${name} foi removido. Fale com o dono.`
    : 'Seu acesso foi removido. Fale com o dono.';
}
