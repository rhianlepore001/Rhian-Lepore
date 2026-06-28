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

    // Workaround de repaint: o fundo geral (html/body) é uma camada grande
    // composta na GPU. Quando apenas a CSS var (--color-bg/--bg-gradient) muda,
    // alguns navegadores não invalidam o paint dessa camada — o fundo fica
    // "preso" na cor antiga até um refresh (intermitente). Forçamos um repaint
    // sincronizado (set → reflow → unset) sem deslocar elementos fixos, já que
    // nenhum frame chega a ser pintado com o transform aplicado.
    const body = document.body;
    if (body) {
      body.style.transform = 'translateZ(0)';
      void body.offsetHeight; // força reflow + invalidação de paint
      body.style.transform = '';
    }
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
