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
import { joinQueue } from '../services/queue';
import { isQueueIdentityPhoneValid } from '../utils/queueIdentity';
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
  const { colors, font, shadow } = useBrutalTheme({ override: themeOverride });
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
    if (!business) return;
    document.documentElement.setAttribute('data-theme', isBeauty ? 'beauty' : 'barber');
    document.documentElement.setAttribute('data-mode', isBeauty ? 'light' : 'dark');
    hydrateFromStorage(business.id);
  }, [business, hydrateFromStorage, isBeauty]);

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
      const message = 'Informe um WhatsApp válido.';
      setIdentityError(message);
      showToast(message, 'error');
      return;
    }
    setIdentitySubmitting(true);
    try {
      const existing = await login(phone, business.id);
      if (existing) {
        setStep('pay');
        return;
      }
      if (!name.trim()) {
        const message = 'Informe seu nome.';
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
      const message = error instanceof Error ? error.message : 'Não foi possível salvar seus dados.';
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
      showToast('Não foi possível gerar o Pix. Tente pagar no balcão.', 'error');
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
        professionalId: preSelectedPro,
        paymentMethod: payMethod as CheckoutPaymentMethod,
        brCode: payMethod === 'pix' ? pixBrCode : undefined,
        txid: payMethod === 'pix' ? pixTxid : undefined,
        mbwayPhone: payMethod === 'mbway' ? pixConfig?.mbway_phone ?? undefined : undefined,
      });
      navigate(`/minha-area/${slug}?tab=fila`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível entrar na fila.';
      setJoinError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${colors.bg} ${colors.text} flex items-center justify-center`}>
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className={`min-h-screen ${colors.bg} ${colors.text} flex items-center justify-center p-6 text-center`}>
        Estabelecimento não encontrado.
      </div>
    );
  }

  if (preSelectedPro && proActive === false) {
    return (
      <div className={`min-h-screen ${colors.bg} ${colors.text} flex items-center justify-center p-6 text-center`}>
        Este QR não está ativo. Peça o QR da casa.
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.text} px-4 py-6 pb-10`}>
      <div className="max-w-md mx-auto space-y-6">
        <header className="space-y-1">
          <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${colors.textMuted}`}>
            {business.business_name}
          </p>
          <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${font.heading}`}>Fila digital</h1>
          <p className={`text-sm ${colors.textSecondary}`}>
            {preSelectedPro && lockedProName
              ? `Fila de ${lockedProName}. Acompanhe sua vez pelo celular.`
              : 'Escolha o serviço e acompanhe sua vez pelo celular.'}
          </p>
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
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleIdentityContinue();
            }}
          >
            <div>
              <h2 className={`text-xl md:text-2xl font-bold tracking-tight ${font.heading}`}>Seus dados</h2>
              <p className={`text-sm mt-1 ${colors.textMuted}`}>Usamos o WhatsApp para guardar sua senha nesta casa.</p>
            </div>
            <div className={`p-4 space-y-4 rounded-2xl border ${colors.card} ${colors.border} ${shadow.card}`}>
              <div className="space-y-1.5">
                <label className={`text-xs font-semibold uppercase tracking-wide ${colors.textMuted}`}>
                  WhatsApp
                </label>
                <PhoneInput value={phone} onChange={setPhone} defaultRegion={region} forceTheme={themeOverride} />
              </div>
              <Input
                label="Nome completo"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nome completo"
                autoComplete="name"
                forceTheme={themeOverride}
              />
              {identityError && (
                <p role="alert" className="text-sm text-[var(--color-danger)]">{identityError}</p>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full min-h-[44px]"
              loading={identitySubmitting}
            >
              Continuar
            </Button>
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
            submitting={submitting}
            amountCents={Math.round(selectedService.price * 100)}
            pixConfig={pixConfig}
            pixTxid={pixTxid}
          />
        )}

        {joinError && <p className="text-sm text-[var(--color-danger)]">{joinError}</p>}
      </div>
    </div>
  );
};
