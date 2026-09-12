import React, { useEffect, useState } from 'react';
import { QueueManualAddSheet } from '@/components/queue/QueueManualAddSheet';
import { Button } from '@/components/ui/Button';
import type { ServiceItem } from '@/types/serviceSettings';

const SERVICES: ServiceItem[] = [
  {
    id: 'svc-corte',
    name: 'Corte',
    description: '',
    price: 35,
    duration_minutes: 30,
    category_id: 'cat-cabelo',
    image_url: null,
    active: true,
    user_id: 'biz-001',
  },
];

export const PlaywrightQueueManualAddDemo: React.FC = () => {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', 'barber');
    html.setAttribute('data-mode', 'dark');
  }, []);

  return (
    <div className="min-h-screen bg-theme-bg p-6">
      <h1 className="mb-4 text-2xl font-bold text-theme-text">Demo — adicionar à fila</h1>
      {!open && (
        <Button onClick={() => setOpen(true)}>Abrir modal</Button>
      )}
      <QueueManualAddSheet
        open={open}
        companyId="biz-001"
        slug="barbearia-qa"
        businessName="Barbearia QA"
        region="BR"
        mode="shared"
        services={SERVICES}
        teamMembers={[]}
        onClose={() => setOpen(false)}
        onAdded={() => undefined}
      />
    </div>
  );
};
