import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { BrutalCard } from '../../components/BrutalCard';
import { BrutalButton } from '../../components/BrutalButton';
import { SettingsLayout } from '../../components/SettingsLayout';
import { Loader2 } from 'lucide-react';
import { logger } from '../../utils/Logger';

export const FinancialSettings: React.FC = () => {
  const { user } = useAuth();
  const { isBeauty, accent } = useBrutalTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [machineFeeEnabled, setMachineFeeEnabled] = useState(false);
  const [debitFee, setDebitFee] = useState<string>('');
  const [creditFee, setCreditFee] = useState<string>('');

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('machine_fee_enabled, debit_fee_percent, credit_fee_percent')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setMachineFeeEnabled(data.machine_fee_enabled ?? false);
        setDebitFee(data.debit_fee_percent?.toString() ?? '');
        setCreditFee(data.credit_fee_percent?.toString() ?? '');
      }
    } catch (err) {
      logger.error('Erro ao carregar configurações financeiras', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('business_settings')
        .upsert({
          user_id: user.id,
          machine_fee_enabled: machineFeeEnabled,
          debit_fee_percent: machineFeeEnabled ? parseFloat(debitFee) || 0 : 0,
          credit_fee_percent: machineFeeEnabled ? parseFloat(creditFee) || 0 : 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      alert('Configurações financeiras salvas!');
    } catch (err) {
      logger.error('Erro ao salvar configurações financeiras', err);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
          <p className="text-neutral-400 text-sm mt-1">
            Configure o repasse de taxa de maquininha para os colaboradores.
          </p>
        </div>

        <BrutalCard>
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-white">Repassar taxa de maquininha ao colaborador?</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Se ativo, a comissão é calculada sobre o valor já descontado da taxa.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  aria-label="Repassar taxa de maquininha ao colaborador?"
                  checked={machineFeeEnabled}
                  onChange={(e) => setMachineFeeEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 bg-white/10 border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isBeauty ? 'peer-checked:bg-beauty-neon' : 'peer-checked:bg-accent-gold'}`}></div>
              </label>
            </div>

            {machineFeeEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <label htmlFor="debit-fee" className="block text-xs font-mono uppercase text-neutral-400 mb-1">
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
                    className={`w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-3 py-2.5 text-white focus:outline-none ${isBeauty ? 'focus:border-beauty-neon' : 'focus:border-accent-gold'}`}
                  />
                </div>
                <div>
                  <label htmlFor="credit-fee" className="block text-xs font-mono uppercase text-neutral-400 mb-1">
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
                    className={`w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-3 py-2.5 text-white focus:outline-none ${isBeauty ? 'focus:border-beauty-neon' : 'focus:border-accent-gold'}`}
                  />
                </div>
              </div>
            )}
          </div>
        </BrutalCard>

        <div className="flex justify-end">
          <BrutalButton variant="primary" onClick={handleSave} loading={saving}>
            Salvar Configurações
          </BrutalButton>
        </div>
      </div>
    </SettingsLayout>
  );
};
