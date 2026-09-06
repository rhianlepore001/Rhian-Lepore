import React from 'react';
import { Button } from '@/components/ui';
import { PixDisplay } from '@/components/membership/PixDisplay';
import { MbwayDisplay } from '@/components/membership/MbwayDisplay';
import { useBrutalTheme, type ThemeVariant } from '@/hooks/useBrutalTheme';
import type { PublicClubPaymentConfig } from '@/services/memberships';
import type { QueuePayOptionId } from '@/utils/queuePayOptions';
import { queuePayOptions } from '@/utils/queuePayOptions';
import type { Region } from '@/utils/formatters';
import type { PixKeyType } from '@/lib/pix-generator';

interface QueuePayStepProps {
  region: Region;
  themeOverride: ThemeVariant;
  canUseMembership: boolean;
  selected: QueuePayOptionId | '';
  onSelect: (id: QueuePayOptionId) => void;
  onConfirm: () => void;
  submitting?: boolean;
  amountCents: number;
  pixConfig?: PublicClubPaymentConfig | null;
  pixTxid?: string;
}

export const QueuePayStep: React.FC<QueuePayStepProps> = ({
  region,
  themeOverride,
  canUseMembership,
  selected,
  onSelect,
  onConfirm,
  submitting = false,
  amountCents,
  pixConfig,
  pixTxid,
}) => {
  const { colors, accent } = useBrutalTheme({ override: themeOverride });
  const options = queuePayOptions({ canUseMembership, region });

  return (
    <div className="space-y-4">
      <div>
        <h2 className={`text-xl font-bold ${colors.text}`}>Como você prefere pagar?</h2>
        <p className={`text-sm ${colors.textMuted}`}>Sua posição na fila já fica reservada em seguida.</p>
      </div>

      <div className="space-y-2">
        {options.map((option) => {
          const active = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`w-full min-h-[44px] text-left p-4 rounded-2xl border ${
                active ? `${accent.border} ${colors.card}` : `${colors.border} ${colors.card}`
              }`}
            >
              <p className={`font-bold ${colors.text}`}>{option.label}</p>
              <p className={`text-xs mt-1 ${colors.textMuted}`}>{option.description}</p>
            </button>
          );
        })}
      </div>

      {selected === 'pix' && pixConfig?.pix_key_value && pixConfig.pix_key_type && (
        <div className="space-y-2">
          <PixDisplay
            pixKey={pixConfig.pix_key_value}
            pixKeyType={pixConfig.pix_key_type as PixKeyType}
            merchantName={pixConfig.pix_holder_name || 'Estabelecimento'}
            merchantCity={pixConfig.pix_merchant_city || 'SAO PAULO'}
            amountCents={amountCents}
            txid={pixTxid}
          />
          <p className={`text-sm ${colors.textSecondary}`}>Aguarde a confirmação do pagamento.</p>
        </div>
      )}

      {selected === 'mbway' && pixConfig?.mbway_phone && (
        <div className="space-y-2">
          <MbwayDisplay
            phone={pixConfig.mbway_phone}
            holderName={pixConfig.mbway_holder_name}
            amountCents={amountCents}
          />
          <p className={`text-sm ${colors.textSecondary}`}>Aguarde a confirmação do pagamento.</p>
        </div>
      )}

      <Button
        variant="primary"
        className="w-full min-h-[44px]"
        disabled={!selected || submitting}
        onClick={onConfirm}
      >
        {submitting ? 'Entrando na fila…' : 'Entrar na fila'}
      </Button>
    </div>
  );
};
