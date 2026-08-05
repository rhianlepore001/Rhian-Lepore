import React from 'react';
import { Navigate } from 'react-router-dom';

/** @deprecated Unificado em /configuracoes/equipe (Equipe e Comissões). */
export const CommissionsSettings: React.FC = () => {
  return <Navigate to="/configuracoes/equipe" replace />;
};
