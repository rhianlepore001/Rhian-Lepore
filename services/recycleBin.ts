import { supabase } from '@/lib/supabase';
import {
  deletedItemSchema,
  recycleResourceTypeSchema,
  type DeletedItem,
  type RecycleResourceType,
} from '@/types/recycleBin';

const RESTORE_RPC_BY_TYPE: Record<RecycleResourceType, string> = {
  appointments: 'restore_appointment',
  clients: 'restore_client',
  services: 'restore_service',
  financial_records: 'restore_financial_record',
  team_members: 'restore_team_member',
};

export async function fetchDeletedItems(resourceType?: string | null): Promise<DeletedItem[]> {
  const { data, error } = await supabase.rpc('get_deleted_items', {
    p_resource_type: resourceType || null,
  });

  if (error) throw error;
  return (data || []).map(item => deletedItemSchema.parse(item));
}

export async function restoreDeletedItem(resourceType: string, itemId: string): Promise<void> {
  const parsedType = recycleResourceTypeSchema.parse(resourceType);
  const functionName = RESTORE_RPC_BY_TYPE[parsedType];

  const { error } = await supabase.rpc(functionName, {
    p_id: itemId,
  });

  if (error) throw error;
}
