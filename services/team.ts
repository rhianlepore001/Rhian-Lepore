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
    .order('is_owner', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return z.array(teamMemberSchema).parse(data ?? []);
}

export async function createTeamMember(
  companyId: string,
  input: TeamMemberInput,
): Promise<TeamMember> {
  const parsed = teamMemberInputSchema.parse(input);
  const slug = parsed.slug || generateSlug(parsed.name);

  const { data, error } = await supabase
    .from('team_members')
    .insert({
      user_id: companyId,
      business_id: companyId,
      name: parsed.name,
      slug,
      role: parsed.role,
      bio: parsed.bio ?? null,
      photo_url: parsed.photo_url ?? null,
      active: parsed.active,
      commission_rate: parsed.commission_rate ?? null,
      commission_percent: parsed.commission_percent ?? null,
    })
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
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', memberId)
    .eq('user_id', companyId);

  if (error) throw error;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}