import React, { createContext, useContext, useCallback } from 'react';
import { useColorMode, type ColorMode } from '../hooks/useColorMode';

interface ThemeContextValue {
  mode: ColorMode;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mode = useColorMode();

  const toggleMode = useCallback(() => {
    const next: ColorMode = document.documentElement.getAttribute('data-mode') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-mode', next);
    localStorage.setItem('agendix_color_mode', next);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
