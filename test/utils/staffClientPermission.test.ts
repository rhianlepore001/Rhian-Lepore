import { describe, expect, it } from 'vitest';
import { canEditClient, isStaffClientEditForbiddenError } from '@/utils/staffClientPermission';

describe('edição de clientes', () => {
  it.each([
    ['owner', false, true], ['owner', undefined, true], ['staff', false, false],
    ['staff', true, true], ['staff', undefined, false], ['staff', 'true', false],
    [undefined, true, false], ['unknown', true, false],
  ])('role %s + chave %s = %s', (role, enabled, expected) => {
    expect(canEditClient(role as string | undefined, enabled)).toBe(expected);
  });
  it('reconhece RLS e trigger', () => {
    expect(isStaffClientEditForbiddenError({ code: '42501' })).toBe(true);
    expect(isStaffClientEditForbiddenError({ message: 'staff_client_edit_forbidden' })).toBe(true);
    expect(isStaffClientEditForbiddenError(new Error('network'))).toBe(false);
  });
});
