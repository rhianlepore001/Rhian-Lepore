import React from 'react';
import { Navigate } from 'react-router-dom';
import { readQueueBusinessSlug } from '../services/queue';

export const QueueStatus: React.FC = () => {
  const slug = readQueueBusinessSlug();
  if (slug) {
    return <Navigate to={`/minha-area/${slug}?tab=fila`} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center text-theme-text">
      <div className="max-w-sm space-y-2">
        <h1 className="text-xl font-bold">Acompanhe sua posição na fila</h1>
        <p className="text-sm text-theme-textSecondary">
          Abra o link da fila ou escaneie o QR Code do estabelecimento. Entre com o WhatsApp que você informou ao pegar a senha.
        </p>
      </div>
    </div>
  );
};
