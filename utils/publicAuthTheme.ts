/**
 * Identidade visual das telas públicas de auth (gateway de login).
 * A sessão logada persiste data-theme/data-mode no <html>; sem reset, o
 * gateway herda light/beauty e os cards com overlay escuro ficam ilegíveis.
 * Não mexe em localStorage — a preferência volta ao reentrar.
 */
export const PUBLIC_AUTH_THEME = 'barber' as const;
export const PUBLIC_AUTH_MODE = 'dark' as const;

function forceThemeRepaint(): void {
  const body = document.body;
  if (!body) return;
  // Mesmo workaround do ThemeContext: camada GPU do fundo às vezes não
  // invalida quando só a CSS var muda.
  body.style.transform = 'translateZ(0)';
  void body.offsetHeight;
  body.style.transform = '';
}

export function applyPublicAuthTheme(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', PUBLIC_AUTH_THEME);
  document.documentElement.setAttribute('data-mode', PUBLIC_AUTH_MODE);
  forceThemeRepaint();
}
