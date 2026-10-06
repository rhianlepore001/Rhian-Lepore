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
import {
  StaffHasOpenAppointmentsError,
  StaffLegacyLinkedRecordsError,
  isStaffHasOpenAppointmentsError,
  isStaffLegacyLinkError,
  openCountFromError,
  type OpenAppointment,
} from '@/utils/staffDelete';
import { TERMINAL_APPOINTMENT_STATUSES, isOpenAppointmentStatus } from '@/utils/appointmentStatus';

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
  if (!companyId) {
    throw new Error('OWNER_OR_MISSING_TEAM_MEMBER');
  }

  const { error } = await supabase.rpc('delete_staff_collaborator', {
    p_member_id: memberId,
  });

  if (error) {
    if ((error.message ?? '').includes('OWNER_OR_MISSING_TEAM_MEMBER')) {
      throw new Error('OWNER_OR_MISSING_TEAM_MEMBER');
    }
    if (isStaffHasOpenAppointmentsError(error)) {
      throw new StaffHasOpenAppointmentsError(openCountFromError(error));
    }
    if (isStaffLegacyLinkError(error)) {
      throw new StaffLegacyLinkedRecordsError();
    }
    throw error;
  }
}

/**
 * Atendimentos em aberto do profissional (mesma regra da guarda do servidor),
 * só do negócio do dono (RLS + user_id). Mais antigos primeiro (atrasados no topo).
 */
export async function fetchOpenAppointmentsForMember(
  companyId: string,
  memberId: string,
  limit = 20,
): Promise<{ items: OpenAppointment[]; total: number }> {
  const terminal = `(${TERMINAL_APPOINTMENT_STATUSES.map((s) => `"${s}"`).join(',')})`;
  const { data, error, count } = await supabase
    .from('appointments')
    .select('id, appointment_time, status, service, duration_minutes, clients(name)', { count: 'exact' })
    .eq('user_id', companyId)
    .eq('professional_id', memberId)
    .not('status', 'in', terminal)
    .order('appointment_time', { ascending: true })
    .limit(limit);

  if (error) throw error;
  const rows = (data ?? []) as Array<{
    id: string;
    appointment_time: string;
    status: string;
    service: string | null;
    duration_minutes: number | null;
    clients: { name: string | null } | { name: string | null }[] | null;
  }>;
  const items = rows
    .filter((row) => isOpenAppointmentStatus(row.status))
    .map((row) => {
      const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
      return {
        id: row.id,
        appointment_time: row.appointment_time,
        status: row.status,
        service: row.service ?? null,
        duration_minutes: row.duration_minutes ?? null,
        client_name: client?.name ?? null,
      };
    });
  const hidden = rows.length - items.length;
  return { items, total: Math.max(items.length, (count ?? rows.length) - hidden) };
}

export function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'membro';
}