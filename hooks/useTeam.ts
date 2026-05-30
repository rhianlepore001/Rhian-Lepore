import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from '@/services/team';
import type { TeamMemberInput, TeamMemberUpdate } from '@/types/team';

export function useTeamMembers() {
  const { companyId } = useAuth();

  return useQuery({
    queryKey: ['team', companyId, 'members'],
    queryFn: () => fetchTeamMembers(companyId!),
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateTeamMember() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TeamMemberInput) => createTeamMember(companyId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', companyId, 'members'] });
    },
  });
}

export function useUpdateTeamMember() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TeamMemberUpdate }) =>
      updateTeamMember(id, companyId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', companyId, 'members'] });
    },
  });
}

export function useDeleteTeamMember() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTeamMember(id, companyId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', companyId, 'members'] });
    },
  });
}