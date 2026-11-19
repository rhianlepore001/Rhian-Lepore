import React from 'react';
import { Navigate } from 'react-router-dom';
import { readQueueBusinessSlug } from '../services/queue';

export const QueueStatus: React.FC = () => {
  const slug = readQueueBusinessSlug();
  if (slug) {
    return <Navigate to={`/minha-area/${slug}?tab=fila`} replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-theme-bg p-4 text-center text-theme-text sm:p-6">
      <div className="w-full max-w-sm space-y-3 rounded-2xl border border-theme-border bg-theme-card p-5 sm:p-6">
        <h1 className="font-heading text-xl font-bold text-balance">Acompanhe sua posição na fila</h1>
        <p className="text-sm leading-relaxed text-theme-textSecondary">
          Abra o link da fila ou escaneie o QR Code do estabelecimento. Entre com o WhatsApp que você informou ao pegar a senha.
        </p>
      </div>
    </main>
  );
};
