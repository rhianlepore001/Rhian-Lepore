import React, { useState } from 'react';
import { Button, Modal, Select, useToast } from '@/components/ui';
import { PhoneInput } from '@/components/PhoneInput';
import { addManualQueueEntry } from '@/services/queue';
import type { QueueMode } from '@/types/queue';
import type { ServiceItem } from '@/types/serviceSettings';
import type { CheckoutPaymentMethod } from '@/types/scheduling';
import type { Region } from '@/utils/formatters';

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
      showToast('Nome, telefone e serviço são obrigatórios.', 'error');
      return;
    }
    if (mode === 'per_professional' && !professionalId) {
      showToast('Escolha o profissional da fila.', 'error');
      return;
    }
    if (!paymentMethod) {
      showToast('Selecione a forma de pagamento.', 'error');
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
      reset();
      onAdded();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível adicionar à fila.';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Adicionar na fila" size="sm">
      <div className="space-y-4">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome completo"
          className="w-full min-h-[44px] px-4 rounded-xl border border-theme-border bg-theme-surface text-theme-text"
        />
        <PhoneInput value={phone} onChange={setPhone} defaultRegion={region} />
        <Select
          label="Serviço"
          placeholder="Escolha o serviço"
          value={serviceId}
          options={services.filter((service) => service.active).map((service) => ({
            value: service.id,
            label: service.name,
          }))}
          onChange={(event) => setServiceId(event.target.value)}
        />
        {mode === 'per_professional' && (
          <Select
            label="Profissional"
            placeholder="Fila do profissional"
            value={professionalId}
            options={teamMembers.map((member) => ({ value: member.id, label: member.name }))}
            onChange={(event) => setProfessionalId(event.target.value)}
          />
        )}
        <Select
          label="Pagamento"
          placeholder="Como vai pagar"
          value={paymentMethod}
          options={paymentOptions}
          onChange={(event) => setPaymentMethod(event.target.value as CheckoutPaymentMethod)}
        />
        <Button variant="primary" fullWidth loading={saving} onClick={() => void handleSubmit()}>
          Adicionar na fila
        </Button>
      </div>
    </Modal>
  );
};
