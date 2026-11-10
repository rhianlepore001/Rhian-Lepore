/**
 * Abre o WhatsApp (wa.me) de forma que funcione no iPhone.
 *
 * O Safari do iOS só permite abrir uma nova aba quando a chamada acontece
 * direto no toque do usuário. Depois de um `await` (salvar no banco, por
 * exemplo), ele bloqueia em silêncio. Por isso:
 * - chame esta função de forma SÍNCRONA dentro do onClick;
 * - para fluxos que salvam antes, use `requestWhatsAppHandoff` (botão
 *   "Abrir WhatsApp" que a pessoa toca);
 * - se mesmo assim a nova aba for bloqueada no iPhone/iPad ou no app instalado
 *   na tela inicial, navega para o wa.me na própria aba (o iOS entrega ao app).
 */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ se identifica como Mac, mas tem tela de toque.
  return /Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

export function isWhatsAppUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ['wa.me', 'api.whatsapp.com'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function openWhatsApp(
  url: string,
  navigate: (href: string) => void = (href) => window.location.assign(href),
): boolean {
  if (!isWhatsAppUrl(url)) return false;
  // Sem 'noopener' nas features: com ele o retorno é sempre null e não dá para
  // saber se o Safari bloqueou. Cortamos o opener logo em seguida.
  const popup = window.open(url, '_blank');
  if (popup) {
    try { popup.opener = null; } catch { /* outra origem */ }
    return true;
  }
  if (isIOSDevice() || isStandaloneDisplay()) {
    navigate(url);
    return true;
  }
  return false;
}
