import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useSettings';
import { canEditClient } from '@/utils/staffClientPermission';

export function useStaffClientPermission() {
  const { role } = useAuth();
  const { data: settings, isError, isLoading } = useBusinessSettings();
  return {
    isStaff: role === 'staff',
    canEdit: canEditClient(role, !isError && !isLoading && settings?.staff_can_edit_clients),
  };
}
