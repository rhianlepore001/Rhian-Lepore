import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = { role: 'staff', enabled: true as boolean | undefined, isLoading: false, isError: false };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ role: state.role }) }));
vi.mock('@/hooks/useSettings', () => ({
  useBusinessSettings: () => ({ data: { staff_can_edit_clients: state.enabled }, isLoading: state.isLoading, isError: state.isError }),
}));
import { useStaffClientPermission } from '@/hooks/useStaffClientPermission';

describe('useStaffClientPermission', () => {
  beforeEach(() => Object.assign(state, { role: 'staff', enabled: true, isLoading: false, isError: false }));
  it('reage à chave do gestor', () => {
    const { result, rerender } = renderHook(() => useStaffClientPermission());
    expect(result.current).toEqual({ isStaff: true, canEdit: true });
    state.enabled = false;
    rerender();
    expect(result.current.canEdit).toBe(false);
  });
  it.each(['isLoading', 'isError'] as const)('fecha a edição durante %s mesmo com cache ligado', (flag) => {
    state[flag] = true;
    const { result } = renderHook(() => useStaffClientPermission());
    expect(result.current.canEdit).toBe(false);
  });
  it('coluna ausente fecha a edição', () => {
    state.enabled = undefined;
    const { result } = renderHook(() => useStaffClientPermission());
    expect(result.current.canEdit).toBe(false);
  });
  it('dono preserva edição com chave desligada', () => {
    state.role = 'owner'; state.enabled = false;
    const { result } = renderHook(() => useStaffClientPermission());
    expect(result.current).toEqual({ isStaff: false, canEdit: true });
  });
});
