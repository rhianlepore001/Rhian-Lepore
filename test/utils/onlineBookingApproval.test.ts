import { describe, expect, it } from 'vitest';
import {
  AUTO_CONFIRM_CANCEL_GRACE_MINUTES,
  ONLINE_BOOKING_APPROVAL_LABEL,
  ONLINE_BOOKING_APPROVAL_PENDING_NOTE,
  hasOnlineBookingApprovalColumn,
  isPublicBookingAutoConfirm,
  resolveOnlineBookingRequiresApproval,
} from '@/utils/onlineBookingApproval';

describe('onlineBookingApproval — padrão manual', () => {
  it('rótulo e nota exatos', () => {
    expect(ONLINE_BOOKING_APPROVAL_LABEL).toBe('Aprovar agendamentos online');
    expect(ONLINE_BOOKING_APPROVAL_PENDING_NOTE).toBe('Pedidos que já chegaram continuam esperando sua resposta.');
    expect(AUTO_CONFIRM_CANCEL_GRACE_MINUTES).toBe(15);
  });

  it.each([
    [null, true],
    [undefined, true],
    [{}, true],
    [{ online_booking_requires_approval: null }, true],
    [{ online_booking_requires_approval: true }, true],
    [{ online_booking_requires_approval: false }, false],
  ])('resolveOnlineBookingRequiresApproval(%j) = %s', (settings, expected) => {
    expect(resolveOnlineBookingRequiresApproval(settings as never)).toBe(expected);
  });

  it.each([
    [null, false],
    [undefined, false],
    ['x', false],
    [{}, false],
    [{ online_booking_auto_confirm: 'true' }, false],
    [{ online_booking_auto_confirm: 1 }, false],
    [{ online_booking_auto_confirm: false }, false],
    [{ online_booking_auto_confirm: true }, true],
  ])('isPublicBookingAutoConfirm(%j) = %s (só true explícito liga)', (json, expected) => {
    expect(isPublicBookingAutoConfirm(json)).toBe(expected);
  });

  it('detecta se a coluna veio na linha (front antes da migration)', () => {
    expect(hasOnlineBookingApprovalColumn(null)).toBe(false);
    expect(hasOnlineBookingApprovalColumn({ user_id: 'a' })).toBe(false);
    expect(hasOnlineBookingApprovalColumn({ online_booking_requires_approval: true })).toBe(true);
  });
});
