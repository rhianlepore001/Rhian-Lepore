import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { PixDisplay } from '@/components/membership/PixDisplay';
import { MbwayDisplay } from '@/components/membership/MbwayDisplay';
import { useBrutalTheme, type ThemeVariant } from '@/hooks/useBrutalTheme';
import type { PublicClubPaymentConfig } from '@/services/memberships';
import type { QueuePayOptionId } from '@/utils/queuePayOptions';
import { queuePayOptions } from '@/utils/queuePayOptions';
import { formatCurrency, type Region } from '@/utils/formatters';
import type { PixKeyType } from '@/lib/pix-generator';

interface QueuePayStepProps {
  region: Region;
  themeOverride: ThemeVariant;
  canUseMembership: boolean;
  selected: QueuePayOptionId | '';
  onSelect: (id: QueuePayOptionId) => void;
  onConfirm: () => void;
  onBack?: () => void;
  submitting?: boolean;
  amountCents: number;
  serviceName?: string;
  joinError?: string;
  pixConfig?: PublicClubPaymentConfig | null;
  pixTxid?: string;
  pixConfigLoading?: boolean;
}

export const QueuePayStep: React.FC<QueuePayStepProps> = ({
  region,
  themeOverride,
  canUseMembership,
  selected,
  onSelect,
  onConfirm,
  onBack,
  submitting = false,
  amountCents,
  serviceName,
  joinError,
  pixConfig,
  pixTxid,
  pixConfigLoading = false,
}) => {
  const { colors, accent, font, radius } = useBrutalTheme({ override: themeOverride });
  const digitalAvailable = region === 'PT'
    ? Boolean(pixConfig?.mbway_phone)
    : Boolean(pixConfig?.pix_key_value && pixConfig?.pix_key_type);
  const options = queuePayOptions({ canUseMembership, region, digitalAvailable });
  const digitalSelected = selected === 'pix' || selected === 'mbway';
  const digitalReady = selected === 'pix'
    ? Boolean(pixConfig?.pix_key_value && pixConfig?.pix_key_type)
    : selected === 'mbway'
      ? Boolean(pixConfig?.mbway_phone)
      : true;
  const [confirmArmed, setConfirmArmed] = useState(!digitalSelected);

  useEffect(() => {
    if (!selected) {
      onSelect(canUseMembership ? 'membership' : 'cash');
      return;
    }
    if (pixConfigLoading) return;
    if (!options.some((option) => option.id === selected)) {
      onSelect('cash');
    }
  }, [canUseMembership, onSelect, options, pixConfigLoading, selected]);

  useEffect(() => {
    if (!digitalSelected) {
      setConfirmArmed(true);
      return;
    }
    setConfirmArmed(false);
    const timer = window.setTimeout(() => setConfirmArmed(true), 650);
    return () => window.clearTimeout(timer);
  }, [digitalSelected, selected]);

  const handleSelect = (id: QueuePayOptionId) => {
    onSelect(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-xl md:text-[22px] font-semibold tracking-tight ${font.heading} ${colors.text}`}>
          Como prefere pagar?
        </h2>
        <p className={`text-sm mt-1.5 leading-relaxed ${colors.textMuted}`}>
          Escolha a forma de pagamento para confirmar sua entrada na fila.
        </p>
      </div>

      {serviceName && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 ${radius.card} ${colors.card} ${colors.border} border`}>
          <p className={`text-sm font-medium min-w-0 truncate ${colors.text}`}>{serviceName}</p>
          <p className={`text-sm font-semibold tabular-nums shrink-0 ${accent.text}`}>
            {formatCurrency(amountCents / 100, region)}
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {options.map((option) => {
          const active = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              aria-pressed={active}
              className={`w-full min-h-[64px] text-left px-4 py-3.5 ${radius.card} border transition-colors ${
                active
                  ? `${accent.border} ${accent.bgDim}`
                  : `${colors.card} ${colors.border}`
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                    active
                      ? `${accent.bg} border-transparent text-[var(--color-on-accent)]`
                      : `${colors.border} ${colors.textMuted}`
                  }`}
                  aria-hidden="true"
                >
                  {active && <Check className="w-3.5 h-3.5" />}
                </span>
                <span className="min-w-0">
                  <p className={`font-semibold ${colors.text}`}>{option.label}</p>
                  <p className={`text-sm mt-0.5 leading-relaxed ${colors.textMuted}`}>{option.description}</p>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {pixConfigLoading && (
        <p className={`text-sm ${colors.textMuted}`}>Carregando dados de pagamento do estabelecimento…</p>
      )}

      {selected === 'pix' && pixConfig?.pix_key_value && pixConfig.pix_key_type && (
        <div className="space-y-2" data-testid="queue-pix-pay">
          <PixDisplay
            pixKey={pixConfig.pix_key_value}
            pixKeyType={pixConfig.pix_key_type as PixKeyType}
            merchantName={pixConfig.pix_holder_name || 'Estabelecimento'}
            merchantCity={pixConfig.pix_merchant_city || 'SAO PAULO'}
            amountCents={amountCents}
            txid={pixTxid}
          />
          <p className={`text-sm ${colors.textSecondary}`}>
            Pague pelo app do banco. Depois toque em Já paguei para entrar na fila. A equipe confirma o recebimento.
          </p>
        </div>
      )}

      {selected === 'mbway' && pixConfig?.mbway_phone && (
        <div className="space-y-2" data-testid="queue-mbway-pay">
          <MbwayDisplay
            phone={pixConfig.mbway_phone}
            holderName={pixConfig.mbway_holder_name}
            amountCents={amountCents}
          />
          <p className={`text-sm ${colors.textSecondary}`}>
            Envie o valor pelo MB WAY para o número acima. Depois toque em Já paguei para entrar na fila.
          </p>
        </div>
      )}

      {joinError && (
        <p role="alert" className="text-sm rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] px-4 py-3">
          {joinError}
        </p>
      )}

      <div className="sticky bottom-0 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] space-y-2 bg-theme-bg">
        <Button
          variant="primary"
          className="w-full min-h-[48px]"
          disabled={!selected || submitting || (digitalSelected && (!digitalReady || !confirmArmed))}
          loading={submitting}
          onClick={onConfirm}
        >
          {submitting
            ? 'Confirmando…'
            : digitalSelected
              ? 'Já paguei — entrar na fila'
              : 'Confirmar e entrar na fila'}
        </Button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className={`w-full min-h-[44px] text-sm font-medium ${colors.textMuted}`}
          >
            Voltar
          </button>
        )}
      </div>
    </div>
  );
};
