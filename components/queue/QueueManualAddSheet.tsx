import React, { useState } from 'react';
import { Button, Input, Modal, Select, useToast } from '@/components/ui';
import { PhoneInput } from '@/components/PhoneInput';
import { useBrutalTheme } from '@/hooks/useBrutalTheme';
import { addManualQueueEntry } from '@/services/queue';
import type { QueueMode } from '@/types/queue';
import type { ServiceItem } from '@/types/serviceSettings';
import type { CheckoutPaymentMethod } from '@/types/scheduling';
import { formatCurrency, type Region } from '@/utils/formatters';

interface TeamOption {
  id: string;
  name: string;
}

interface QueueManualAddSheetProps {
  open: boolean;
  companyId: string;
  region: Region;
  mode: QueueMode;
  services: ServiceItem[];
  teamMembers: TeamOption[];
  onClose: () => void;
  onAdded: () => void;
}

export const QueueManualAddSheet: React.FC<QueueManualAddSheetProps> = ({
  open,
  companyId,
  region,
  mode,
  services,
  teamMembers,
  onClose,
  onAdded,
}) => {
  const { showToast } = useToast();
  const { classes } = useBrutalTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod | ''>('');
  const [saving, setSaving] = useState(false);

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

  const reset = () => {
    setName('');
    setPhone('');
    setServiceId('');
    setProfessionalId('');
    setPaymentMethod('');
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !serviceId) {
      showToast('Preencha nome, telefone e serviço.', 'error');
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
        clientName: name.trim(),
        clientPhone: phone,
        serviceId,
        professionalId: professionalId || null,
        paymentMethod,
      });
      showToast(`${name.trim()} entrou na fila.`, 'success');
      reset();
      onAdded();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível adicionar o cliente à fila.';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Adicionar cliente à fila" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-theme-textSecondary">
          Para quem chegou sem escanear o QR Code. Se o telefone já for cliente, o cadastro é reaproveitado.
        </p>
        <Input
          label="Nome"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome do cliente"
          autoComplete="off"
        />
        <div>
          <span className={`${classes.label} block mb-1.5`}>Telefone</span>
          <PhoneInput value={phone} onChange={setPhone} defaultRegion={region} />
        </div>
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
    </Modal>
  );
};
