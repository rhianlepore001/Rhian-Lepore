import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Button, Input, Modal, Select, useToast } from '@/components/ui';
import { PhoneInput } from '@/components/PhoneInput';
import { useBrutalTheme } from '@/hooks/useBrutalTheme';
import { ensureClientFromQueue, listActiveClientsForPicker } from '@/services/crm';
import { addManualQueueEntry, queueJoinUserMessage } from '@/services/queue';
import type { QueueMode } from '@/types/queue';
import type { ServiceItem } from '@/types/serviceSettings';
import type { CheckoutPaymentMethod } from '@/types/scheduling';
import { buildWhatsAppLink, formatCurrency, formatPhone, type Region } from '@/utils/formatters';
import {
  buildQueueTrackingMessage,
  buildQueueTrackingUrl,
} from '@/utils/queueShare';

interface TeamOption {
  id: string;
  name: string;
}

type ClientSource = 'list' | 'walkin';
type SheetStep = 'form' | 'done';

interface QueueManualAddSheetProps {
  open: boolean;
  companyId: string;
  slug?: string | null;
  businessName?: string;
  region: Region;
  mode: QueueMode;
  services: ServiceItem[];
  teamMembers: TeamOption[];
  onClose: () => void;
  onAdded: () => void;
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fallback abaixo
  }
  try {
    const el = document.createElement('textarea');
    el.value = value;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export const QueueManualAddSheet: React.FC<QueueManualAddSheetProps> = ({
  open,
  companyId,
  slug = null,
  businessName = '',
  region,
  mode,
  services,
  teamMembers,
  onClose,
  onAdded,
}) => {
  const { showToast } = useToast();
  const { classes } = useBrutalTheme();
  const [step, setStep] = useState<SheetStep>('form');
  const [source, setSource] = useState<ClientSource>('list');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod | ''>('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addedName, setAddedName] = useState('');
  const [addedPhone, setAddedPhone] = useState('');

  const { data: clients = [], isError: clientsError } = useQuery({
    queryKey: ['queue', 'picker-clients', companyId],
    queryFn: () => listActiveClientsForPicker(companyId),
    enabled: open && Boolean(companyId),
    staleTime: 30_000,
  });

  const paymentOptions = region === 'PT'
    ? [
      { value: 'cash', label: 'Dinheiro' },
      { value: 'mbway', label: 'MB WAY' },
      { value: 'debit', label: 'Débito' },
      { value: 'credit', label: 'Crédito' },
    ]
    : [
      { value: 'pix', label: 'Pix' },
      { value: 'cash', label: 'Dinheiro' },
      { value: 'debit', label: 'Débito' },
      { value: 'credit', label: 'Crédito' },
    ];

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const trackingUrl = slug ? buildQueueTrackingUrl(slug) : '';
  const trackingMessage = trackingUrl
    ? buildQueueTrackingMessage({
      clientName: addedName,
      businessName: businessName || 'nossa casa',
      url: trackingUrl,
    })
    : '';

  const reset = () => {
    setStep('form');
    setSource('list');
    setSelectedClientId('');
    setName('');
    setPhone('');
    setServiceId('');
    setProfessionalId('');
    setPaymentMethod('');
    setCopied(false);
    setAddedName('');
    setAddedPhone('');
  };

  useEffect(() => {
    if (!open) return;
    setStep('form');
    setSource('list');
    setSelectedClientId('');
    setName('');
    setPhone('');
    setServiceId('');
    setProfessionalId('');
    setPaymentMethod('');
    setCopied(false);
    setAddedName('');
    setAddedPhone('');
  }, [open]);

  const handleSelectClient = (id: string) => {
    setSelectedClientId(id);
    const client = clients.find((item) => item.id === id);
    if (!client) return;
    setName(client.name);
    setPhone(client.phone || '');
  };

  const handleSource = (next: ClientSource) => {
    setSource(next);
    setSelectedClientId('');
    setName('');
    setPhone('');
  };

  const handleSubmit = async () => {
    const clientName = source === 'list' ? (selectedClient?.name ?? '').trim() : name.trim();
    const clientPhone = source === 'list' ? (selectedClient?.phone ?? '') : phone;
    if (!clientName || !clientPhone.trim() || !serviceId) {
      showToast(
        source === 'list' && selectedClient && !selectedClient.phone
          ? 'Este cliente não tem telefone cadastrado. Complete o cadastro ou use a opção sem cadastro.'
          : 'Preencha cliente, serviço e forma de pagamento.',
        'error',
      );
      return;
    }
    if (mode === 'per_professional' && !professionalId) {
      showToast('Escolha em qual fila o cliente vai entrar.', 'error');
      return;
    }
    if (!paymentMethod) {
      showToast('Informe como o cliente vai pagar.', 'error');
      return;
    }
    setSaving(true);
    try {
      await addManualQueueEntry({
        businessId: companyId,
        clientName,
        clientPhone,
        serviceId,
        professionalId: professionalId || null,
        paymentMethod,
      });
      if (source === 'walkin') {
        void ensureClientFromQueue(companyId, clientName, clientPhone);
      }
      setAddedName(clientName);
      setAddedPhone(clientPhone);
      setStep('done');
      onAdded();
    } catch (error) {
      showToast(queueJoinUserMessage(error, 'Não foi possível adicionar o cliente à fila. Tente de novo.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!trackingUrl) return;
    const ok = await copyText(trackingUrl);
    if (!ok) {
      showToast('Não foi possível copiar o link. Selecione e copie na mão.', 'error');
      return;
    }
    setCopied(true);
    showToast('Link copiado.', 'success');
    window.setTimeout(() => setCopied(false), 2000);
  };

  const whatsappHref = trackingMessage && addedPhone
    ? buildWhatsAppLink(addedPhone, region, trackingMessage)
    : '';

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={step === 'done' ? 'Cliente na fila' : 'Adicionar cliente à fila'}
      size="md"
    >
      {step === 'done' ? (
        <div className="space-y-4" data-testid="queue-manual-success">
          <div className="flex items-start gap-3 rounded-xl border border-theme-border bg-theme-surface px-3 py-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-theme-accent/15 text-theme-accent">
              <Check className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-theme-text">{addedName} entrou na fila.</p>
              <p className="mt-1 text-sm text-theme-textSecondary">
                Envie o link para acompanhar a senha no celular.
              </p>
            </div>
          </div>

          {trackingUrl ? (
            <>
              <div className="space-y-2">
                <p className={`${classes.label} mb-1.5 block`}>Link para acompanhar</p>
                <input
                  data-testid="queue-tracking-url"
                  readOnly
                  value={trackingUrl}
                  className="w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-theme-text"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => void handleCopy()}
                  icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                >
                  {copied ? 'Copiado' : 'Copiar link'}
                </Button>
              </div>
              <p className="text-sm text-theme-textSecondary">
                Se ainda não tiver Minha Área, o link pede o mesmo WhatsApp e libera a senha automaticamente.
              </p>
              {whatsappHref && (
                <Button
                  variant="primary"
                  fullWidth
                  data-testid="queue-tracking-whatsapp"
                  icon={<MessageCircle className="h-4 w-4" />}
                  onClick={() => window.open(whatsappHref, '_blank', 'noopener,noreferrer')}
                >
                  Enviar no WhatsApp
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-theme-textSecondary">
              A senha já está na fila. Para enviar o acompanhamento, configure o link público em Ajustes → Agendamento.
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={handleClose}>
              Fechar
            </Button>
            <Button variant="ghost" fullWidth onClick={reset}>
              Adicionar outro
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4" data-testid="queue-manual-form">
          <p className="text-sm text-theme-textSecondary">
            Escolha alguém da sua lista ou cadastre quem chegou sem QR Code. No final, você envia o link da senha.
          </p>

          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Origem do cliente">
            <button
              type="button"
              data-testid="queue-source-list"
              aria-pressed={source === 'list'}
              onClick={() => handleSource('list')}
              className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                source === 'list'
                  ? 'border-theme-accent bg-theme-accent/10 text-theme-text'
                  : 'border-theme-border bg-theme-surface text-theme-textSecondary'
              }`}
            >
              Da minha lista
            </button>
            <button
              type="button"
              data-testid="queue-source-walkin"
              aria-pressed={source === 'walkin'}
              onClick={() => handleSource('walkin')}
              className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                source === 'walkin'
                  ? 'border-theme-accent bg-theme-accent/10 text-theme-text'
                  : 'border-theme-border bg-theme-surface text-theme-textSecondary'
              }`}
            >
              Sem cadastro
            </button>
          </div>

          {source === 'list' ? (
            <div className="space-y-3">
              {clientsError ? (
                <p className="text-sm text-theme-textSecondary">
                  Não foi possível carregar a lista. Use a opção sem cadastro.
                </p>
              ) : (
                <SearchableSelect
                  label="Cliente"
                  placeholder="Buscar por nome ou telefone"
                  options={clients.map((client) => ({
                    id: client.id,
                    name: client.name,
                    subtext: client.phone ? formatPhone(client.phone, region) : 'Sem telefone',
                  }))}
                  value={selectedClientId}
                  onChange={(id: string) => handleSelectClient(id)}
                  accentColor="text-theme-accent"
                />
              )}
              {selectedClient && !selectedClient.phone && (
                <p className="text-sm text-[var(--color-danger)]">
                  Este cliente não tem telefone. Complete o cadastro ou adicione como walk-in.
                </p>
              )}
              {clients.length === 0 && !clientsError && (
                <p className="text-sm text-theme-textSecondary">
                  Ainda não há clientes na lista. Use sem cadastro para o primeiro.
                </p>
              )}
            </div>
          ) : (
            <>
              <Input
                label="Nome"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nome do cliente"
                autoComplete="off"
              />
              <div>
                <span className={`${classes.label} mb-1.5 block`}>Telefone</span>
                <PhoneInput value={phone} onChange={setPhone} defaultRegion={region} />
              </div>
            </>
          )}

          <Select
            label="Serviço"
            placeholder="Escolha o serviço"
            value={serviceId}
            options={services.filter((service) => service.active).map((service) => ({
              value: service.id,
              label: `${service.name} · ${formatCurrency(service.price, region)}`,
            }))}
            onChange={(event) => setServiceId(event.target.value)}
          />
          {mode === 'per_professional' && (
            <Select
              label="Profissional"
              placeholder="Escolha a fila"
              value={professionalId}
              options={teamMembers.map((member) => ({ value: member.id, label: member.name }))}
              onChange={(event) => setProfessionalId(event.target.value)}
            />
          )}
          <Select
            label="Forma de pagamento"
            placeholder="Como o cliente vai pagar"
            value={paymentMethod}
            options={paymentOptions}
            onChange={(event) => setPaymentMethod(event.target.value as CheckoutPaymentMethod)}
          />
          <Button variant="primary" fullWidth loading={saving} onClick={() => void handleSubmit()}>
            Adicionar à fila
          </Button>
        </div>
      )}
    </Modal>
  );
};
