import React from 'react';
import { useDynamicBranding } from '../hooks/useDynamicBranding';

/**
 * Componente que aplica branding dinâmico automaticamente
 * Deve ser montado no root da aplicação (App.tsx)
 */
export const DynamicBranding: React.FC = () => {
    useDynamicBranding();
    return null; // Component sem UI, apenas side effects
};
