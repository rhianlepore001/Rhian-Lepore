import React from 'react';
import { ThemeProvider } from './ThemeContext';

/**
 * DesignSystemProvider — Orquestra o design system end-to-end.
 *
 * Combina:
 * - ThemeProvider: toggle dark/light + persistência
 *
 * Deve ser montado no root da aplicação, ANTES de AuthProvider.
 */
export const DesignSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
};
