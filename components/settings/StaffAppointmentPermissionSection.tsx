import React, { useEffect, useState } from 'react';
import { SettingsSectionHeader } from './SettingsSectionHeader';
import { Check, Loader2 } from 'lucide-react';
import { Card, useToast } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useBusinessSettings, useUpdateStaffAppointmentEditScope, useUpdateStaffAgendaBlockScope } from '../../hooks/useSettings';
import {
  STAFF_APPOINTMENT_EDIT_SCOPE_OPTIONS,
  normalizeStaffAppointmentEditScope,
  type StaffAppointmentEditScope,
} from '../../utils/staffAppointmentPermission';
import {
  STAFF_AGENDA_BLOCK_SCOPE_OPTIONS,
  resolveStaffAgendaBlockScope,
  type StaffAgendaBlockScope,
} from '../../utils/agendaBlockPermission';

/**
 * Configurações › Equipe: o dono escolhe o que os colaboradores podem fazer com
 * os agendamentos. Visível só para o dono (a página já é protegida por
 * OwnerRouteGuard; o banco também só aceita a gravação do dono).
 */
export const StaffAppointmentPermissionSection: React.FC = () => {
  const { role } = useAuth();
  const { colors, accent } = useBrutalTheme();
  const { showToast } = useToast();
  const { data: settings, isLoading } = useBusinessSettings();
  const updateScope = useUpdateStaffAppointmentEditScope();
  const updateBlockScope = useUpdateStaffAgendaBlockScope();

  // Coluna só existe após a migration; antes disso a opção fica travada no padrão.
  const columnMissing = !!settings && !Object.prototype.hasOwnProperty.call(settings, 'staff_appointment_edit_scope');
  const blockColumnMissing = !!settings && !Object.prototype.hasOwnProperty.call(settings, 'staff_agenda_block_scope');
  const saved = normalizeStaffAppointmentEditScope(settings?.staff_appointment_edit_scope);
  // Sem a coluna nova (ou sem linha), vale o booleano antigo: ligado = própria agenda.
  const savedBlockScope = resolveStaffAgendaBlockScope(settings);
  const [selected, setSelected] = useState<StaffAppointmentEditScope>(saved);
  const [blockScope, setBlockScope] = useState<StaffAgendaBlockScope>(savedBlockScope);

  useEffect(() => {
    setSelected(saved);
  }, [saved]);

  useEffect(() => {
    setBlockScope(savedBlockScope);
  }, [savedBlockScope]);

  if (role !== 'owner') return null;

  const handleBlockScopeChange = async (next: StaffAgendaBlockScope) => {
    if (next === blockScope || updateBlockScope.isPending || blockColumnMissing) return;
    const previous = blockScope;
    setBlockScope(next);
    try {
      const result = await updateBlockScope.mutateAsync(next);
      if (result === 'unsupported') {
        setBlockScope(previous);
        showToast('Essa opção fica disponível após a próxima atualização do sistema.', 'info');
        return;
      }
      showToast('Permissão da equipe atualizada.', 'success');
    } catch {
      setBlockScope(previous);
      showToast('Não foi possível salvar a permissão. Tente novamente.', 'error');
    }
  };

  const handleChange = async (next: StaffAppointmentEditScope) => {
    if (next === selected || updateScope.isPending || columnMissing) return;
    const previous = selected;
    setSelected(next);
    try {
      const result = await updateScope.mutateAsync(next);
      if (result === 'unsupported') {
        setSelected(previous);
        showToast('Essa opção fica disponível após a próxima atualização do sistema.', 'info');
        return;
      }
      showToast('Permissão da equipe atualizada.', 'success');
    } catch {
      setSelected(previous);
      showToast('Não foi possível salvar a permissão. Tente novamente.', 'error');
    }
  };

  return (
    <section className="space-y-4 border-t border-[var(--color-divider)] pt-8" data-testid="staff-edit-scope-section">
      <SettingsSectionHeader
        title="Permissões da equipe"
        description="O que os colaboradores podem fazer na agenda."
      />
      <Card title={<span id="staff-edit-scope-title">Edição de agendamentos</span>}>
      <div className="space-y-4">
        <p className={`text-sm ${colors.textMuted}`}>
          O que os colaboradores podem fazer com os agendamentos: editar, reagendar (mudar data, horário ou profissional) e cancelar. Você, como dono, sempre pode tudo.
        </p>

        <div role="radiogroup" aria-labelledby="staff-edit-scope-title" className="grid gap-2">
          {STAFF_APPOINTMENT_EDIT_SCOPE_OPTIONS.map((option) => {
            const checked = selected === option.value;
            return (
              <label
                key={option.value}
                data-testid={`staff-edit-scope-${option.value}`}
                className={[
                  'flex items-start gap-3 rounded-xl border p-3 min-h-[44px] transition-colors',
                  columnMissing || isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                  checked ? `${accent.border} ${accent.bgDim}` : colors.border,
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="staff-edit-scope"
                  value={option.value}
                  checked={checked}
                  disabled={columnMissing || isLoading || updateScope.isPending}
                  onChange={() => handleChange(option.value)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                />
                <span className="min-w-0">
                  <span className={`flex items-center gap-2 text-sm font-semibold ${colors.text}`}>
                    {option.label}
                    {checked && updateScope.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                    {checked && !updateScope.isPending && <Check className={`w-3.5 h-3.5 ${accent.text}`} aria-hidden="true" />}
                  </span>
                  <span className={`block text-xs mt-0.5 ${colors.textMuted}`}>{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>

        <p className={`text-xs ${colors.textMuted}`}>
          {'Criar agendamentos, "Confirmar e cobrar" e marcar "Faltou" continuam liberados para toda a equipe. Atendimentos já finalizados (concluídos, faltas e cancelados) só o dono altera.'}
        </p>
        {columnMissing && (
          <p className={`text-xs ${colors.textMuted}`} data-testid="staff-edit-scope-pending">
            {'Por enquanto vale "Não podem editar". A escolha fica disponível após a próxima atualização do sistema.'}
          </p>
        )}
      </div>
      </Card>
      <Card title={<span id="staff-block-scope-title">Bloqueio de agenda</span>}>
      <div className="space-y-4">
        <p className={`text-sm ${colors.textMuted}`}>
          Quem da equipe pode travar horários na agenda (período no dia, dia inteiro ou vários dias). Você, como dono, sempre pode.
        </p>

        <div role="radiogroup" aria-labelledby="staff-block-scope-title" className="grid gap-2">
          {STAFF_AGENDA_BLOCK_SCOPE_OPTIONS.map((option) => {
            const checked = blockScope === option.value;
            return (
              <label
                key={option.value}
                data-testid={`staff-block-scope-${option.value}`}
                className={[
                  'flex items-start gap-3 rounded-xl border p-3 min-h-[44px] transition-colors',
                  blockColumnMissing || isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                  checked ? `${accent.border} ${accent.bgDim}` : colors.border,
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="staff-block-scope"
                  value={option.value}
                  checked={checked}
                  disabled={blockColumnMissing || isLoading || updateBlockScope.isPending}
                  onChange={() => handleBlockScopeChange(option.value)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                />
                <span className="min-w-0">
                  <span className={`flex items-center gap-2 text-sm font-semibold ${colors.text}`}>
                    {option.label}
                    {checked && updateBlockScope.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                    {checked && !updateBlockScope.isPending && <Check className={`w-3.5 h-3.5 ${accent.text}`} aria-hidden="true" />}
                  </span>
                  <span className={`block text-xs mt-0.5 ${colors.textMuted}`}>{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>

        <p className={`text-xs ${colors.textMuted}`}>
          Os bloqueios que já existem continuam valendo quando você muda esta opção.
        </p>
        {blockColumnMissing && (
          <p className={`text-xs ${colors.textMuted}`} data-testid="staff-block-scope-pending">
            {'Por enquanto vale a escolha anterior. As três opções ficam disponíveis após a próxima atualização do sistema.'}
          </p>
        )}
      </div>
      </Card>
    </section>
  );
};
