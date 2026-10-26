export const STAFF_CLIENT_EDIT_FORBIDDEN_MESSAGE = 'Sua permissão não permite editar este cliente. Fale com o gestor.';

export function canEditClient(role: string | null | undefined, enabled: unknown): boolean {
  return role === 'owner' || (role === 'staff' && enabled === true);
}

export function isStaffClientEditForbiddenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  return e.code === '42501' || !!e.message?.includes('staff_client_edit_forbidden');
}
