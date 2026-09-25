import React, { useEffect, useState } from 'react';
import { CalendarCog, Check, Loader2 } from 'lucide-react';
import { Card, useToast } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useBusinessSettings, useUpdateStaffAppointmentEditScope } from '../../hooks/useSettings';
import {
  STAFF_APPOINTMENT_EDIT_SCOPE_OPTIONS,
  normalizeStaffAppointmentEditScope,
  type StaffAppointmentEditScope,
} from '../../utils/staffAppointmentPermission';

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

  // Coluna só existe após a migration; antes disso a opção fica travada no padrão.
  const columnMissing = !!settings && !Object.prototype.hasOwnProperty.call(settings, 'staff_appointment_edit_scope');
  const saved = normalizeStaffAppointmentEditScope(settings?.staff_appointment_edit_scope);
  const [selected, setSelected] = useState<StaffAppointmentEditScope>(saved);

  useEffect(() => {
    setSelected(saved);
  }, [saved]);

  if (role !== 'owner') return null;

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
      <div className={`flex items-center gap-2 ${colors.textMuted} font-mono text-xs uppercase tracking-[0.2em] px-1`}>
        <CalendarCog className={`w-4 h-4 ${accent.text}`} aria-hidden="true" />
        Permissões da equipe
      </div>
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
    </section>
  );
};
