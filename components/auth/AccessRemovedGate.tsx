import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AccessRemovedScreen } from './AccessRemovedScreen';

/**
 * Enquanto o AuthContext sinalizar "acesso removido" (colaborador sem vínculo
 * vivo), nada do app é renderizado por trás: só a tela com o motivo.
 * Precisa estar dentro do Router (App.tsx).
 */
export const AccessRemovedGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessRemoved, dismissAccessRemoved } = useAuth();
  const navigate = useNavigate();
  if (!accessRemoved) return <>{children}</>;
  return (
    <AccessRemovedScreen
      companyName={accessRemoved.companyName}
      onExit={() => {
        dismissAccessRemoved();
        navigate('/login', { replace: true });
      }}
    />
  );
};
