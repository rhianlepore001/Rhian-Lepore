import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PhoneInput } from '../components/PhoneInput';
import { Button, Input } from '../components/ui';
import { QueuePayStep } from '../components/queue/QueuePayStep';
import { QueueServiceStep } from '../components/queue/QueueServiceStep';
import { usePublicClient } from '../contexts/PublicClientContext';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
import { usePublicClientMembership, usePublicPixConfig } from '../hooks/useMemberships';
import { detectPixKeyType, generatePixPayload, validatePixKey } from '../lib/pix-generator';
import { generatePixTxid } from '../lib/pix-txid';
import {
  findActiveQueueEntryByPhone,
  joinQueue,
  markQueueQrVisit,
  QueueAlreadyActiveError,
  queueJoinUserMessage,
  storeQueueTicket,
} from '../services/queue';
import { isQueueIdentityPhoneValid } from '../utils/queueIdentity';
import { logger } from '../utils/Logger';
import {
  fetchBusinessProfileBySlug,
  fetchPublicCategories,
  fetchPublicProfessionals,
  fetchPublicServices,
} from '../services/publicBooking';
import { computeSubscriptionDiscount } from '../utils/subscriptionDiscount';
import type { QueuePayOptionId } from '../utils/queuePayOptions';
import { useToast } from '@/components/ui';
import type { CheckoutPaymentMethod } from '@/types/scheduling';
import type { Region } from '../utils/formatters';

type Step = 'service' | 'identity' | 'pay';

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'service', label: 'Serviço' },
  { id: 'identity', label: 'Dados' },
  { id: 'pay', label: 'Pagamento' },
];

export const QueueJoin: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const preSelectedPro = searchParams.get('pro');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { client, login, register, hydrateFromStorage } = usePublicClient();

  const [business, setBusiness] = useState<{
    id: string;
    business_name: string;
    user_type: string;
    region?: Region;
  } | null>(null);
  const [services, setServices] = useState<Array<{
    id: string;
    name: string;
    duration_minutes: number;
    price: number;
    category_id?: string;
  }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [proActive, setProActive] = useState<boolean | null>(preSelectedPro ? null : true);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('service');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [payMethod, setPayMethod] = useState<QueuePayOptionId | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [identityError, setIdentityError] = useState('');
  const [identitySubmitting, setIdentitySubmitting] = useState(false);
  const [lockedProName, setLockedProName] = useState<string | null>(null);
  const [pixTxid, setPixTxid] = useState<string>();
  const [pixBrCode, setPixBrCode] = useState<string>();

  const isBeauty = business?.user_type === 'beauty';
  const themeOverride: ThemeVariant = isBeauty ? 'beauty' : 'barber';
  const { colors, font, radius, accent } = useBrutalTheme({ override: themeOverride });
  const region: Region = business?.region === 'PT' ? 'PT' : 'BR';

  const sessionClient = client && business && client.business_id === business.id ? client : null;
  const { data: membership } = usePublicClientMembership(business?.id ?? null, sessionClient?.phone ?? phone);
  const { data: pixConfig } = usePublicPixConfig(business?.id ?? null);

  const selectedService = services.find((service) => service.id === selectedServiceId);
  const discount = computeSubscriptionDiscount({
    isActive: membership?.effective_status === 'active',
    planName: membership?.plan_name,
    planServiceIds: membership?.service_ids ?? [],
    services: selectedService ? [{ id: selectedService.id, price: selectedService.price }] : [],
    usageLimit: membership?.usage_limit_per_month,
    usageThisPeriod: membership?.usage_this_period,
  });

  useEffect(() => {
    if (slug) markQueueQrVisit(slug);
  }, [slug]);

  useEffect(() => {
    if (!business) return;
    document.documentElement.setAttribute('data-theme', isBeauty ? 'beauty' : 'barber');
    document.documentElement.setAttribute('data-mode', isBeauty ? 'light' : 'dark');
    hydrateFromStorage(business.id);
  }, [business, hydrateFromStorage, isBeauty]);

  const openExistingTicket = React.useCallback((entryId: string, entryPhone: string) => {
    if (!business || !slug) return;
    storeQueueTicket({ businessId: business.id, entryId, phone: entryPhone, slug });
    showToast('Você já está nesta fila. Abrindo sua senha.', 'info');
    navigate(`/minha-area/${slug}?tab=fila`, { replace: true });
  }, [business, navigate, showToast, slug]);

  // Quem já tem senha ativa não escolhe serviço/pagamento de novo: vai direto acompanhar.
  const redirectIfAlreadyInQueue = React.useCallback(async (lookupPhone: string): Promise<boolean> => {
    if (!business || !lookupPhone) return false;
    try {
      const active = await findActiveQueueEntryByPhone(business.id, lookupPhone);
      if (!active) return false;
      openExistingTicket(active.id, lookupPhone);
      return true;
    } catch {
      return false;
    }
  }, [business, openExistingTicket]);

  const sessionPhone = sessionClient?.phone ?? null;
  useEffect(() => {
    if (!sessionPhone) return;
    void redirectIfAlreadyInQueue(sessionPhone);
  }, [redirectIfAlreadyInQueue, sessionPhone]);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      try {
        const profile = await fetchBusinessProfileBySlug(slug);
        setBusiness({
          id: profile.id,
          business_name: profile.business_name,
          user_type: profile.user_type,
          region: profile.region as Region | undefined,
        });
        const [serviceRows, categoryRows, proRows] = await Promise.all([
          fetchPublicServices(profile.id),
          fetchPublicCategories(profile.id),
          fetchPublicProfessionals(profile.id),
        ]);
        setServices(serviceRows || []);
        setCategories(categoryRows || []);
        if (preSelectedPro) {
          const found = (proRows || []).find((pro: { id: string; name?: string }) => pro.id === preSelectedPro);
          setProActive(Boolean(found));
          setLockedProName(found?.name?.split(' ')[0] ?? 'profissional');
        }
      } catch {
        setBusiness(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [preSelectedPro, slug]);

  useEffect(() => {
    if (payMethod !== 'pix' || !pixConfig?.pix_key_value || !pixConfig.pix_key_type || !selectedService || !business) {
      return;
    }
    try {
      const resolvedType =
        (validatePixKey(pixConfig.pix_key_value, pixConfig.pix_key_type)
          ? pixConfig.pix_key_type
          : detectPixKeyType(pixConfig.pix_key_value)) ?? pixConfig.pix_key_type;
      const txid = generatePixTxid('FIL');
      const brCode = generatePixPayload({
        pixKey: pixConfig.pix_key_value,
        pixKeyType: resolvedType,
        merchantName: pixConfig.pix_holder_name || business.business_name,
        merchantCity: pixConfig.pix_merchant_city || 'SAO PAULO',
        amountCents: Math.round(selectedService.price * 100),
        txid,
      });
      setPixTxid(txid);
      setPixBrCode(brCode);
    } catch {
      setPixTxid(undefined);
      setPixBrCode(undefined);
    }
  }, [business, payMethod, pixConfig, selectedService]);

  const handleIdentityContinue = async () => {
    if (!business) return;
    setIdentityError('');
    if (sessionClient) {
      setStep('pay');
      return;
    }
    if (!isQueueIdentityPhoneValid(phone, region)) {
      const message = 'Informe um número de WhatsApp válido.';
      setIdentityError(message);
      showToast(message, 'error');
      return;
    }
    setIdentitySubmitting(true);
    try {
      if (await redirectIfAlreadyInQueue(phone)) return;
      const existing = await login(phone, business.id);
      if (existing) {
        setStep('pay');
        return;
      }
      if (!name.trim()) {
        const message = 'Primeira visita? Informe seu nome para continuar.';
        setIdentityError(message);
        showToast(message, 'error');
        return;
      }
      await register({
        name: name.trim(),
        phone,
        business_id: business.id,
      });
      setStep('pay');
    } catch (error) {
      const message = queueJoinUserMessage(error, 'Não foi possível salvar seus dados. Tente de novo.');
      logger.error('QueueJoin identity failed', error);
      setIdentityError(message);
      showToast(message, 'error');
    } finally {
      setIdentitySubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!business || !slug || !selectedService || !payMethod) return;
    const payer = sessionClient;
    const clientName = payer?.name || name.trim();
    const clientPhone = payer?.phone || phone;
    if (!clientName || !clientPhone) {
      setStep('identity');
      return;
    }

    if (payMethod === 'pix' && (!pixBrCode || !pixTxid)) {
      showToast('Não foi possível gerar o Pix agora. Escolha pagar no balcão.', 'error');
      return;
    }

    setSubmitting(true);
    setJoinError('');
    try {
      await joinQueue({
        businessId: business.id,
        slug,
        clientName,
        clientPhone,
        serviceId: selectedService.id,
        professionalId: preSelectedPro || null,
        paymentMethod: payMethod as CheckoutPaymentMethod,
        brCode: payMethod === 'pix' ? pixBrCode : undefined,
        txid: payMethod === 'pix' ? pixTxid : undefined,
        mbwayPhone: payMethod === 'mbway' ? pixConfig?.mbway_phone ?? undefined : undefined,
      });
      navigate(`/minha-area/${slug}?tab=fila`);
    } catch (error) {
      if (error instanceof QueueAlreadyActiveError) {
        openExistingTicket(error.entry.id, clientPhone);
        return;
      }
      logger.error('QueueJoin join failed', error);
      const message = queueJoinUserMessage(error);
      setJoinError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${colors.bg} ${colors.text} flex items-center justify-center`}>
        <Loader2 className="animate-spin" aria-label="Carregando" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className={`min-h-screen ${colors.bg} ${colors.text} flex flex-col items-center justify-center p-6 text-center gap-2`}>
        <p className={`text-lg font-semibold ${font.heading}`}>Não encontramos este estabelecimento</p>
        <p className={`text-sm ${colors.textSecondary}`}>Confira o link ou peça um novo QR Code no balcão.</p>
      </div>
    );
  }

  if (preSelectedPro && proActive === false) {
    return (
      <div className={`min-h-screen ${colors.bg} ${colors.text} flex flex-col items-center justify-center p-6 text-center gap-4`}>
        <div className="space-y-2">
          <p className={`text-lg font-semibold ${font.heading}`}>Este QR Code não está mais ativo</p>
          <p className={`text-sm ${colors.textSecondary}`}>
            O profissional deste QR não está atendendo hoje. Use o QR Code geral do estabelecimento.
          </p>
        </div>
        {slug && (
          <Button variant="primary" className="min-h-[48px]" onClick={() => navigate(`/queue/${slug}`)}>
            Entrar na fila geral
          </Button>
        )}
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text}`}>
      <div className="mx-auto w-full max-w-lg md:max-w-xl px-4 py-8 md:py-14 pb-12">
        <header className="space-y-3 mb-8">
          <h1 className={`text-[1.75rem] md:text-4xl font-bold tracking-tight leading-[1.15] ${font.heading}`}>
            {business.business_name}
          </h1>
          <p className={`text-sm md:text-base leading-relaxed ${colors.textSecondary}`}>
            {preSelectedPro && lockedProName
              ? `Fila de ${lockedProName}. Escolha o serviço e acompanhe sua vez pelo celular.`
              : 'Escolha o serviço, entre na fila e acompanhe sua vez pelo celular.'}
          </p>
          <ol className="flex items-center gap-2 pt-1" aria-label="Passos para entrar na fila">
            {STEPS.map((item, index) => {
              const current = index === stepIndex;
              const done = index < stepIndex;
              return (
                <li key={item.id} className="flex-1 min-w-0">
                  <span
                    className={`block h-1 rounded-full ${
                      current || done ? accent.bg : 'bg-[var(--color-divider)]'
                    }`}
                  />
                  <span className={`mt-2 block text-xs font-medium ${current ? colors.text : colors.textMuted}`}>
                    {item.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </header>

        {step === 'service' && (
          <QueueServiceStep
            services={services}
            categories={categories}
            region={region}
            themeOverride={themeOverride}
            selectedServiceId={selectedServiceId}
            onSelect={setSelectedServiceId}
            onContinue={() => setStep(sessionClient ? 'pay' : 'identity')}
          />
        )}

        {step === 'identity' && (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleIdentityContinue();
            }}
          >
            <div>
              <h2 className={`text-xl md:text-[22px] font-semibold tracking-tight ${font.heading}`}>
                Seus dados
              </h2>
              <p className={`text-sm mt-1.5 leading-relaxed ${colors.textMuted}`}>
                Usamos seu WhatsApp para identificar sua senha. Se já for cliente, basta o número.
              </p>
            </div>
            <div className={`p-4 md:p-5 space-y-4 ${radius.card} border ${colors.card} ${colors.border}`}>
              <div className="space-y-1.5">
                <label className={`text-sm font-medium ${colors.textSecondary}`}>
                  WhatsApp
                </label>
                <PhoneInput value={phone} onChange={setPhone} defaultRegion={region} forceTheme={themeOverride} />
              </div>
              <Input
                label="Nome"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Como quer ser chamado"
                autoComplete="name"
                hint="Obrigatório apenas na primeira visita."
                forceTheme={themeOverride}
              />
              {identityError && (
                <p role="alert" className="text-sm text-[var(--color-danger)]">{identityError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full min-h-[48px]"
                loading={identitySubmitting}
              >
                Continuar
              </Button>
              <button
                type="button"
                onClick={() => setStep('service')}
                className={`w-full min-h-[44px] text-sm font-medium ${colors.textMuted}`}
              >
                Voltar
              </button>
            </div>
          </form>
        )}

        {step === 'pay' && selectedService && (
          <QueuePayStep
            region={region}
            themeOverride={themeOverride}
            canUseMembership={discount.canUseMembership}
            selected={payMethod}
            onSelect={setPayMethod}
            onConfirm={handleJoin}
            onBack={() => setStep(sessionClient ? 'service' : 'identity')}
            submitting={submitting}
            amountCents={Math.round(selectedService.price * 100)}
            serviceName={selectedService.name}
            joinError={joinError}
            pixConfig={pixConfig}
            pixTxid={pixTxid}
          />
        )}
      </div>
    </div>
  );
};
