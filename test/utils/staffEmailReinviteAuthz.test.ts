import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  canReleaseStaffEmailForReinvite,
  type OccupyingAuthUser,
  type StaffReinviteInvite,
} from '@/utils/staffEmailReinviteAuthz';

const OWNER_ID = '7baee43b-a3b0-4d96-b566-62bc88224f5c';
const ORPHAN_ID = '78052ac0-f285-4419-9434-bfcf52f35cae';
const RANDOM_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NEW_MEMBER_ID = 'dff1d15d-8595-432d-b1e3-de3fdc467764';
const STAFF_EMAIL = 'colab@example.com';

const validInvite: StaffReinviteInvite = {
  companyId: OWNER_ID,
  memberId: NEW_MEMBER_ID,
  isOwnerMember: false,
  deleted: false,
  active: true,
  staffUserId: null,
};

const occupyingOrphan: OccupyingAuthUser = {
  id: ORPHAN_ID,
  email: STAFF_EMAIL,
  boundToActiveMember: false,
};

describe('canReleaseStaffEmailForReinvite', () => {
  it('dono da casa libera e-mail órfão com convite unbound válido', () => {
    expect(canReleaseStaffEmailForReinvite({
      caller: { kind: 'authenticated', uid: OWNER_ID, email: 'owner@example.com' },
      companyId: OWNER_ID,
      memberId: NEW_MEMBER_ID,
      email: STAFF_EMAIL,
      invite: validInvite,
      occupyingUser: occupyingOrphan,
    })).toBe(true);
  });

  it('órfão autenticado com e-mail do convite unbound libera a própria conta', () => {
    expect(canReleaseStaffEmailForReinvite({
      caller: { kind: 'authenticated', uid: ORPHAN_ID, email: STAFF_EMAIL },
      companyId: OWNER_ID,
      memberId: NEW_MEMBER_ID,
      email: STAFF_EMAIL,
      invite: validInvite,
      occupyingUser: occupyingOrphan,
    })).toBe(true);
  });

  it('usuário autenticado aleatório é negado mesmo com member_id do convite', () => {
    expect(canReleaseStaffEmailForReinvite({
      caller: { kind: 'authenticated', uid: RANDOM_ID, email: 'intruso@example.com' },
      companyId: OWNER_ID,
      memberId: NEW_MEMBER_ID,
      email: STAFF_EMAIL,
      invite: validInvite,
      occupyingUser: occupyingOrphan,
    })).toBe(false);
  });

  it('anon é negado', () => {
    expect(canReleaseStaffEmailForReinvite({
      caller: { kind: 'anon' },
      companyId: OWNER_ID,
      memberId: NEW_MEMBER_ID,
      email: STAFF_EMAIL,
      invite: validInvite,
      occupyingUser: occupyingOrphan,
    })).toBe(false);
  });

  it('órfão não libera convite inválido ou staff ainda vinculado', () => {
    expect(canReleaseStaffEmailForReinvite({
      caller: { kind: 'authenticated', uid: ORPHAN_ID, email: STAFF_EMAIL },
      companyId: OWNER_ID,
      memberId: NEW_MEMBER_ID,
      email: STAFF_EMAIL,
      invite: { ...validInvite, deleted: true },
      occupyingUser: occupyingOrphan,
    })).toBe(false);

    expect(canReleaseStaffEmailForReinvite({
      caller: { kind: 'authenticated', uid: ORPHAN_ID, email: STAFF_EMAIL },
      companyId: OWNER_ID,
      memberId: NEW_MEMBER_ID,
      email: STAFF_EMAIL,
      invite: validInvite,
      occupyingUser: { ...occupyingOrphan, boundToActiveMember: true },
    })).toBe(false);
  });
});

describe('migration 20260918200000 — contrato SQL', () => {
  const sql = readFileSync(
    path.join(process.cwd(), 'supabase/migrations/20260918200000_staff_reinvite_orphan_or_owner_release.sql'),
    'utf8',
  );

  it('autoriza dono ou órfão com prova de e-mail; anon retorna false', () => {
    expect(sql).toContain('v_uid := auth.uid();');
    expect(sql).toContain('IF v_uid IS NULL THEN');
    expect(sql).toContain('v_is_owner := (v_uid::text = p_company_id);');
    expect(sql).toContain('v_caller_email = lower(btrim(p_email))');
    expect(sql).toContain('IF NOT v_is_owner AND NOT v_is_orphan_claimant THEN');
    expect(sql).not.toContain(
      'IF auth.uid() IS NULL OR auth.uid()::text IS DISTINCT FROM p_company_id THEN',
    );
  });

  it('não reabre EXECUTE de purge/delete para anon', () => {
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.release_staff_email_for_reinvite\(text, uuid, text\) FROM PUBLIC, anon;/,
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.release_staff_email_for_reinvite\(text, uuid, text\) TO authenticated;/,
    );
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.purge_staff_auth_user\(uuid, text\) FROM PUBLIC, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.delete_staff_collaborator\(uuid\) FROM PUBLIC, anon;/,
    );
    expect(sql).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.purge_staff_auth_user\(uuid, text\) TO (anon|authenticated)/,
    );
    expect(sql).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.release_staff_email_for_reinvite\(text, uuid, text\) TO anon/,
    );
  });

  it('permite auto-purge do órfão só via GUC do reconvite', () => {
    expect(sql).toContain("set_config('agendix.allow_orphan_reinvite_purge', 'on', true)");
    expect(sql).toContain("current_setting('agendix.allow_orphan_reinvite_purge', true)");
  });
});
