import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import {
  teamMemberSchema,
  teamMemberInputSchema,
  teamMemberUpdateSchema,
  type TeamMember,
  type TeamMemberInput,
  type TeamMemberUpdate,
} from '@/types/team';

export async function fetchTeamMembers(companyId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('user_id', companyId)
    .is('deleted_at', null)
    .order('is_owner', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return z.array(teamMemberSchema).parse(data ?? []);
}

type MemberPayload = {
  user_id: string;
  business_id: string;
  name: string;
  slug: string;
  role: string;
  bio: string | null;
  photo_url: string | null;
  active: boolean;
  is_owner: boolean;
  cpf: string | null;
  specialties?: string[];
  commission_rate?: number | null;
  commission_percent?: number | null;
};

async function findDeletedMember(
  companyId: string,
  input: { slug: string; cpf: string | null; name: string },
): Promise<{ id: string } | null> {
  const filters: Array<{ column: 'slug' | 'cpf' | 'name'; value: string }> = [
    { column: 'slug', value: input.slug },
  ];
  if (input.cpf) filters.push({ column: 'cpf', value: input.cpf });
  filters.push({ column: 'name', value: input.name });

  for (const filter of filters) {
    const { data, error } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', companyId)
      .eq('is_owner', false)
      .eq(filter.column, filter.value)
      .not('deleted_at', 'is', null)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data?.id) return { id: data.id };
  }

  return null;
}

function buildPayload(companyId: string, input: TeamMemberInput): MemberPayload {
  const parsed = teamMemberInputSchema.parse(input);
  const payload: MemberPayload = {
    user_id: companyId,
    business_id: companyId,
    name: parsed.name,
    slug: parsed.slug || generateSlug(parsed.name),
    role: parsed.role,
    bio: parsed.bio ?? null,
    photo_url: parsed.photo_url ?? null,
    active: parsed.active,
    is_owner: parsed.is_owner ?? false,
    cpf: parsed.cpf ?? null,
  };
  if (parsed.specialties) payload.specialties = parsed.specialties;
  if (parsed.commission_rate !== undefined) payload.commission_rate = parsed.commission_rate;
  if (parsed.commission_percent !== undefined) payload.commission_percent = parsed.commission_percent;
  return payload;
}

export async function createTeamMember(
  companyId: string,
  input: TeamMemberInput,
): Promise<TeamMember> {
  const payload = buildPayload(companyId, input);
  const deleted = payload.is_owner
    ? null
    : await findDeletedMember(companyId, {
        slug: payload.slug,
        cpf: payload.cpf,
        name: payload.name,
      });

  if (deleted) {
        const restorePayload: Record<string, unknown> = {
      user_id: payload.user_id,
      business_id: payload.business_id,
      name: payload.name,
      slug: payload.slug,
      role: payload.role,
      bio: payload.bio,
      photo_url: payload.photo_url,
      active: true,
      is_owner: payload.is_owner,
      cpf: payload.cpf,
      deleted_at: null,
      staff_user_id: null,
      updated_at: new Date().toISOString(),
    };
    if (payload.specialties) restorePayload.specialties = payload.specialties;

    const { data, error } = await supabase
      .from('team_members')
      .update(restorePayload)
      .eq('id', deleted.id)
      .eq('user_id', companyId)
      .select()
      .single();

    if (error) throw error;
    return teamMemberSchema.parse(data);
  }

  const { data, error } = await supabase
    .from('team_members')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return teamMemberSchema.parse(data);
}

export async function updateTeamMember(
  memberId: string,
  companyId: string,
  input: TeamMemberUpdate,
): Promise<TeamMember> {
  const parsed = teamMemberUpdateSchema.parse(input);

  const { data, error } = await supabase
    .from('team_members')
    .update(parsed)
    .eq('id', memberId)
    .eq('user_id', companyId)
    .select()
    .single();

  if (error) throw error;
  return teamMemberSchema.parse(data);
}

export async function deleteTeamMember(
  memberId: string,
  companyId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('team_members')
    .update({
      deleted_at: now,
      active: false,
      staff_user_id: null,
      updated_at: now,
    })
    .eq('id', memberId)
    .eq('user_id', companyId)
    .eq('is_owner', false)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('OWNER_OR_MISSING_TEAM_MEMBER');
  }
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
