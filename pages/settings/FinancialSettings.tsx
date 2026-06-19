import React, { useState } from 'react';
import { Card, Button } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useBusinessSettings, useUpdateBusinessSettings } from '../../hooks/useSettings';
import { SettingsLayout } from '../../components/SettingsLayout';
import { Loader2 } from 'lucide-react';
import { SettingsSwitch } from '../../components/SettingsSwitch';

export const FinancialSettings: React.FC = () => {
  const { companyId } = useAuth();
  const { isBeauty, accent, colors, classes } = useBrutalTheme();
  const { data: settings, isLoading } = useBusinessSettings();
  const updateSettingsMutation = useUpdateBusinessSettings();

  const [machineFeeEnabled, setMachineFeeEnabled] = useState(false);
  const [debitFee, setDebitFee] = useState<string>('');
  const [creditFee, setCreditFee] = useState<string>('');

  React.useEffect(() => {
    if (settings) {
      setMachineFeeEnabled(settings.machine_fee_enabled ?? false);
      setDebitFee(settings.debit_fee_percent?.toString() ?? '');
      setCreditFee(settings.credit_fee_percent?.toString() ?? '');
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettingsMutation.mutateAsync({
        machine_fee_enabled: machineFeeEnabled,
        debit_fee_percent: machineFeeEnabled ? parseFloat(debitFee) || 0 : 0,
        credit_fee_percent: machineFeeEnabled ? parseFloat(creditFee) || 0 : 0,
      });
      alert('Configurações financeiras salvas!');
    } catch (err) {
      console.error('Erro ao salvar configurações financeiras', err);
      alert('Erro ao salvar. Tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
          <h2 className={`text-xl font-bold font-mono ${accent.text}`}>
            Configurações Financeiras
          </h2>
          <p className={`${colors.textMuted} text-sm mt-1`}>
            Configure o repasse de taxa de maquininha para os colaboradores.
          </p>
        </div>

        <Card>
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={`font-medium ${colors.text}`}>Repassar taxa de maquininha ao colaborador?</p>
                <p className={`text-xs ${colors.textMuted} mt-0.5`}>
                  Se ativo, a comissão é calculada sobre o valor já descontado da taxa.
                </p>
              </div>
              <SettingsSwitch
                checked={machineFeeEnabled}
                onChange={setMachineFeeEnabled}
                ariaLabel="Repassar taxa de maquininha ao colaborador?"
              />
            </div>

            {machineFeeEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <label htmlFor="debit-fee" className={classes.label}>
                    Taxa Débito (%)
                  </label>
                  <input
                    id="debit-fee"
                    aria-label="Taxa débito (%)"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 2.5"
                    value={debitFee}
                    onChange={(e) => setDebitFee(e.target.value)}
                    className={classes.input}
                  />
                </div>
                <div>
                  <label htmlFor="credit-fee" className={classes.label}>
                    Taxa Crédito (%)
                  </label>
                  <input
                    id="credit-fee"
                    aria-label="Taxa crédito (%)"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 3.5"
                    value={creditFee}
                    onChange={(e) => setCreditFee(e.target.value)}
                    className={classes.input}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button variant="primary" onClick={handleSave} loading={updateSettingsMutation.isPending}>
            Salvar Configurações
          </Button>
        </div>
      </div>
    </SettingsLayout>
  );
};
