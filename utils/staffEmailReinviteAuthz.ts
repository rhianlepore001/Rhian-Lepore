export type StaffReinviteCaller =
  | { kind: 'anon' }
  | { kind: 'authenticated'; uid: string; email: string | null };

export type StaffReinviteInvite = {
  companyId: string;
  memberId: string;
  isOwnerMember: boolean;
  deleted: boolean;
  active: boolean;
  staffUserId: string | null;
};

export type OccupyingAuthUser = {
  id: string;
  email: string;
  boundToActiveMember: boolean;
};

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function isValidUnboundInvite(
  invite: StaffReinviteInvite | null,
  companyId: string,
  memberId: string,
): boolean {
  if (!invite) return false;
  return (
    invite.companyId === companyId
    && invite.memberId === memberId
    && !invite.isOwnerMember
    && !invite.deleted
    && invite.active
    && invite.staffUserId === null
  );
}

export function canReleaseStaffEmailForReinvite(input: {
  caller: StaffReinviteCaller;
  companyId: string;
  memberId: string;
  email: string;
  invite: StaffReinviteInvite | null;
  occupyingUser: OccupyingAuthUser | null;
}): boolean {
  const { caller, companyId, memberId, email, invite, occupyingUser } = input;
  const wantedEmail = normalizeEmail(email);

  if (caller.kind === 'anon') return false;
  if (!wantedEmail || !companyId.trim() || !memberId) return false;

  const isOwner = caller.uid === companyId;
  const isOrphanClaimant = (
    !isOwner
    && normalizeEmail(caller.email) !== ''
    && normalizeEmail(caller.email) === wantedEmail
  );

  if (!isOwner && !isOrphanClaimant) return false;
  if (!isValidUnboundInvite(invite, companyId, memberId)) return false;

  if (!occupyingUser) return true;
  if (normalizeEmail(occupyingUser.email) !== wantedEmail) return true;
  if (occupyingUser.boundToActiveMember) return false;
  if (isOrphanClaimant && occupyingUser.id !== caller.uid) return false;

  return true;
}
