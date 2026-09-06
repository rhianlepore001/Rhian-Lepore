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
      Para ver sua posição, abra Minha Área pelo QR da casa.
    </div>
  );
};
