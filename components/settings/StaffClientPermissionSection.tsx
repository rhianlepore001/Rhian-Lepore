import React from 'react';
import { Card, useToast } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessSettings, useUpdateStaffCanEditClients } from '../../hooks/useSettings';

export const StaffClientPermissionSection: React.FC = () => {
  const { role } = useAuth();
  const { data: settings, isLoading, isError } = useBusinessSettings();
  const mutation = useUpdateStaffCanEditClients();
  const { showToast } = useToast();
  if (role !== 'owner') return null;
  const available = !!settings && Object.prototype.hasOwnProperty.call(settings, 'staff_can_edit_clients');
  const change = async (enabled: boolean) => {
    try {
      const result = await mutation.mutateAsync(enabled);
      showToast(result === 'saved' ? 'Permissão da equipe atualizada.' : 'Essa opção fica disponível após a próxima atualização do sistema.', result === 'saved' ? 'success' : 'info');
    } catch {
      showToast('Não foi possível salvar a permissão. Tente novamente.', 'error');
    }
  };
  return (
    <Card title="Dados dos clientes">
      <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
        <input type="checkbox" role="switch"
          checked={settings?.staff_can_edit_clients === true}
          disabled={!available || isLoading || isError || mutation.isPending}
          onChange={(event) => void change(event.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
        <span>
          <span className="block text-sm font-semibold">Colaboradores podem editar dados dos clientes</span>
          <span className="block text-sm text-[var(--color-text-secondary)] mt-1">Permite editar nome, telefone, e-mail, aniversário e notas. Colaboradores não podem excluir nem desativar clientes. Desligado por padrão.</span>
        </span>
      </label>
    </Card>
  );
};
