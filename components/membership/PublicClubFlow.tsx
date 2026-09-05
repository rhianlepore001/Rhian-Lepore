import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, MessageCircle, Store } from 'lucide-react';
import { usePublicMembershipPlans, usePublicPixConfig, useCreatePublicMembershipRequest, useCreatePublicPixPayment } from '../../hooks/useMemberships';
import { useBrutalTheme, ThemeVariant } from '../../hooks/useBrutalTheme';
import { useToast } from '../ui/Toast';
import { PlanCard } from './PlanCard';
import { PixDisplay } from './PixDisplay';
import { MembershipPlan } from '../../services/memberships';
import { generatePixPayload } from '../../lib/pix-generator';
import { generatePixTxid } from '../../lib/pix-txid';
import { formatCurrency, Region } from '../../utils/formatters';

export interface PublicClubFlowProps {
  slug: string;
  businessId: string;
  region?: Region;
  themeOverride?: ThemeVariant;
  embedded?: boolean;
  backHref?: string;
  backLabel?: string;
  prefillName?: string;
  prefillPhone?: string;
}

export const PublicClubFlow: React.FC<PublicClubFlowProps> = ({
  slug,
  businessId,
  region = 'BR',
  themeOverride = 'barber',
  embedded = false,
  backHref,
  backLabel = 'Voltar',
  prefillName = '',
  prefillPhone = '',
}) => {
  const { showToast } = useToast();
  const { colors, classes, accent, font } = useBrutalTheme({ override: themeOverride });
  const { data: plans, isLoading: plansLoading, isError: plansError, refetch } = usePublicMembershipPlans(businessId);
  const { data: pixConfig, isLoading: pixLoading } = usePublicPixConfig(businessId);
  const createMembership = useCreatePublicMembershipRequest(businessId);
  const createPix = useCreatePublicPixPayment(businessId);

  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [step, setStep] = useState<'choose' | 'pay' | 'confirmation'>('choose');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'in_person'>('pix');
  const [clientName, setClientName] = useState(prefillName);
  const [clientPhone, setClientPhone] = useState(prefillPhone);
  const [submitting, setSubmitting] = useState(false);
  const [pixBrCode, setPixBrCode] = useState<string | null>(null);

  useEffect(() => {
    setClientName(prefillName);
    setClientPhone(prefillPhone);
  }, [prefillName, prefillPhone]);

  const merchantName = pixConfig?.pix_holder_name || '';
  const merchantCity = pixConfig?.pix_merchant_city || 'SAO PAULO';
  const pixReady = !!(pixConfig?.pix_key_value && pixConfig?.pix_key_type);

  const handleSelectPlan = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setStep('pay');
  };

  const handleSubmit = async () => {
    if (!selectedPlan) {
      showToast('Escolha um plano.', 'error');
      return;
    }
    if (!clientName.trim() || !clientPhone.trim()) {
      showToast('Preencha nome e WhatsApp.', 'error');
      return;
    }
    if (clientPhone.replace(/\D/g, '').length < 10) {
      showToast('WhatsApp inválido.', 'error');
      return;
    }
    if (paymentMethod === 'pix' && !pixReady) {
      showToast('O Pix ainda não está disponível aqui. Escolha pagar no balcão.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const membershipId = await createMembership.mutateAsync({
        clientName: clientName.trim(),
        clientPhone,
        planId: selectedPlan.id,
        paymentMethod,
      });

      if (paymentMethod === 'pix' && pixReady) {
        const txid = generatePixTxid('AGX');
        const brCode = generatePixPayload({
          pixKey: pixConfig!.pix_key_value!,
          pixKeyType: pixConfig!.pix_key_type!,
          merchantName,
          merchantCity,
          amountCents: selectedPlan.price_cents,
          txid,
        });
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        await createPix.mutateAsync({
          membershipId,
          brCode,
          txid,
          expiresAt,
        });
        setPixBrCode(brCode);
      }

      setStep('confirmation');
      showToast(
        paymentMethod === 'pix'
          ? 'Solicitação criada! Pague o Pix para ativar.'
          : 'Solicitação criada! Pague no balcão na próxima visita.',
        'success',
      );
    } catch (err) {
      const message = (err as Error).message || '';
      if (message.includes('membership_already_exists')) {
        showToast('Este WhatsApp já tem uma assinatura ativa ou pendente aqui. Fale com o estabelecimento.', 'error');
      } else if (message.includes('plan_not_found')) {
        showToast('Este plano não está mais disponível. Escolha outro.', 'error');
      } else if (message.includes('invalid_phone')) {
        showToast('WhatsApp inválido. Confira o número.', 'error');
      } else {
        showToast('Não foi possível enviar sua solicitação. Tente novamente.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={embedded ? 'space-y-4 min-w-0' : 'space-y-5 min-w-0'}>
      {backHref && (
        <Link
          to={backHref}
          className={`inline-flex items-center gap-1.5 text-sm font-medium min-h-[44px] ${colors.textSecondary}`}
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {backLabel}
        </Link>
      )}

      {!embedded && (
        <header className="min-w-0">
          <h1 className={`text-xl ${font.heading} ${colors.text} leading-tight`}>Clube de assinatura</h1>
          <p className={`${colors.textSecondary} text-sm mt-1 leading-snug`}>
            Vantagens exclusivas todo mês, pagando menos por cada serviço.
          </p>
        </header>
      )}

      {embedded && step === 'choose' && (
        <header className="min-w-0">
          <h2 className={`text-base font-semibold ${colors.text}`}>Planos disponíveis</h2>
          <p className={`${colors.textSecondary} text-xs mt-0.5 leading-snug`}>
            Escolha um plano e envie a solicitação pelo mesmo WhatsApp da sua área.
          </p>
        </header>
      )}

      {step === 'choose' && (
        <>
          {plansLoading ? (
            <p className={`${colors.textSecondary} text-sm py-6 text-center`}>Carregando planos...</p>
          ) : plansError ? (
            <div className={`${colors.card} ${colors.border} border rounded-xl p-4 text-center space-y-2`}>
              <p className={`${colors.text} text-sm`}>Não foi possível carregar os planos.</p>
              <button type="button" onClick={() => void refetch()} className={`text-sm font-semibold ${accent.text}`}>
                Tentar de novo
              </button>
            </div>
          ) : plans && plans.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  compact
                  onSelect={handleSelectPlan}
                  actionLabel="Quero assinar"
                  region={region}
                />
              ))}
            </div>
          ) : (
            <div className={`${colors.card} ${colors.border} border rounded-xl p-4 text-center space-y-1`}>
              <p className={`${colors.text} text-sm font-medium`}>Nenhum plano disponível no momento.</p>
              <p className={`${colors.textMuted} text-xs`}>Volte mais tarde ou fale com o estabelecimento.</p>
            </div>
          )}
        </>
      )}

      {step === 'pay' && selectedPlan && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setStep('choose')}
            className={`text-sm ${colors.textSecondary} inline-flex items-center gap-1 min-h-[44px]`}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Escolher outro plano
          </button>

          <div className={`${colors.card} ${colors.border} border rounded-xl p-4 min-w-0`}>
            <h2 className={`text-base font-semibold ${colors.text} break-words`}>{selectedPlan.name}</h2>
            <p className={`${colors.textSecondary} text-sm mb-4`}>
              Mensalidade: {formatCurrency(selectedPlan.price_cents / 100, region)}
            </p>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={`${classes.label} block mb-1.5`}>Seu nome</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="João Silva"
                  className={classes.input}
                />
              </div>
              <div>
                <label className={`${classes.label} block mb-1.5`}>Seu WhatsApp</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className={classes.input}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className={`${classes.label} block mb-2`}>Como prefere pagar?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={[
                    'p-3 rounded-xl border min-h-[44px] text-left',
                    paymentMethod === 'pix' ? `${accent.bgDim} ${accent.border}` : `${colors.inputBg} ${colors.border}`,
                  ].join(' ')}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageCircle className="w-4 h-4 shrink-0 text-[var(--color-accent)]" />
                    <span className={`text-xs font-semibold ${colors.text}`}>Pix agora</span>
                  </div>
                  <p className={`text-xs ${colors.textSecondary} leading-snug`}>
                    {pixReady ? 'Paga e confirma em segundos.' : 'Pix ainda não configurado.'}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('in_person')}
                  className={[
                    'p-3 rounded-xl border min-h-[44px] text-left',
                    paymentMethod === 'in_person' ? `${accent.bgDim} ${accent.border}` : `${colors.inputBg} ${colors.border}`,
                  ].join(' ')}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Store className="w-4 h-4 shrink-0" />
                    <span className={`text-xs font-semibold ${colors.text}`}>No balcão</span>
                  </div>
                  <p className={`text-xs ${colors.textSecondary} leading-snug`}>Na próxima visita.</p>
                </button>
              </div>
            </div>
          </div>

          {paymentMethod === 'pix' && pixReady ? (
            <PixDisplay
              pixKey={pixConfig!.pix_key_value!}
              pixKeyType={pixConfig!.pix_key_type!}
              merchantName={merchantName}
              merchantCity={merchantCity}
              amountCents={selectedPlan.price_cents}
              description="Escaneie o QR Code ou copie o código. A confirmação chega em segundos."
            />
          ) : paymentMethod === 'pix' && !pixReady && !pixLoading ? (
            <div className="bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] rounded-xl p-3 text-[var(--color-warning)] text-sm leading-snug">
              O estabelecimento ainda não configurou o Pix. Escolha pagar no balcão ou aguarde.
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !clientName.trim() || !clientPhone.trim()}
            className={[
              'w-full py-3 rounded-xl font-bold min-h-[44px]',
              'bg-[var(--color-accent)] text-[var(--color-on-accent)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'inline-flex items-center justify-center gap-2',
            ].join(' ')}
          >
            {submitting ? 'Enviando...' : 'Confirmar solicitação'}
            <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        </div>
      )}

      {step === 'confirmation' && selectedPlan && (
        <div className="space-y-4">
          <div className={`${colors.card} ${colors.border} border rounded-xl p-5 text-center space-y-3`}>
            <div className="w-12 h-12 mx-auto rounded-full bg-[var(--color-success-bg)] flex items-center justify-center">
              <Check className="w-6 h-6 text-[var(--color-success)]" />
            </div>
            <h2 className={`text-lg font-semibold ${colors.text}`}>Solicitação enviada</h2>
            <p className={`${colors.textSecondary} text-sm leading-snug`}>
              {paymentMethod === 'pix' && pixBrCode
                ? 'Pague o Pix abaixo. O plano é ativado após a confirmação do estabelecimento.'
                : 'Na próxima visita, pague no balcão. O plano é ativado após a confirmação.'}
            </p>
            {slug && !embedded && (
              <Link
                to={`/minha-area/${slug}`}
                className={`inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold ${accent.bg} text-[var(--color-on-accent)]`}
              >
                Ir para Minha Área
              </Link>
            )}
          </div>
          {paymentMethod === 'pix' && pixBrCode && pixConfig?.pix_key_value && (
            <PixDisplay
              pixKey={pixConfig.pix_key_value}
              pixKeyType={pixConfig.pix_key_type!}
              merchantName={merchantName}
              merchantCity={merchantCity}
              amountCents={selectedPlan.price_cents}
              description="Pague o valor com seu app. A confirmação chega em segundos."
            />
          )}
        </div>
      )}
    </div>
  );
};
