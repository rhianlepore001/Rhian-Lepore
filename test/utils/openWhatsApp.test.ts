import { afterEach, describe, expect, it, vi } from 'vitest';
import { isIOSDevice, isStandaloneDisplay, openWhatsApp } from '../../utils/openWhatsApp';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const url = 'https://wa.me/5511900000001?text=Oi';

function setUA(ua: string, maxTouchPoints = 0) {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(ua);
  Object.defineProperty(window.navigator, 'maxTouchPoints', { configurable: true, get: () => maxTouchPoints });
}

describe('openWhatsApp', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (window.navigator as { standalone?: boolean }).standalone;
  });

  it('detecta iPhone e iPad (iPadOS se apresenta como Mac com toque)', () => {
    setUA(IPHONE);
    expect(isIOSDevice()).toBe(true);
    setUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 5);
    expect(isIOSDevice()).toBe(true);
    setUA(DESKTOP);
    expect(isIOSDevice()).toBe(false);
  });

  it('detecta app instalado na tela inicial (navigator.standalone do iOS)', () => {
    expect(isStandaloneDisplay()).toBe(false);
    Object.defineProperty(window.navigator, 'standalone', { configurable: true, value: true });
    expect(isStandaloneDisplay()).toBe(true);
  });

  it('abre em nova aba de forma síncrona e corta o window.opener', () => {
    setUA(DESKTOP);
    const popup = { opener: window } as unknown as Window;
    const open = vi.spyOn(window, 'open').mockReturnValue(popup);
    expect(openWhatsApp(url)).toBe(true);
    expect(open).toHaveBeenCalledWith(url, '_blank');
    expect(popup.opener).toBeNull();
  });

  it('no iPhone, se o Safari bloquear a nova aba, navega para o wa.me na própria aba', () => {
    setUA(IPHONE);
    vi.spyOn(window, 'open').mockReturnValue(null);
    const navigate = vi.fn();
    expect(openWhatsApp(url, navigate)).toBe(true);
    expect(navigate).toHaveBeenCalledWith(url);
  });

  it('no computador, bloqueio não tira o usuário da tela (o navegador avisa do pop-up)', () => {
    setUA(DESKTOP);
    vi.spyOn(window, 'open').mockReturnValue(null);
    const navigate = vi.fn();
    expect(openWhatsApp(url, navigate)).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('recusa URL que não é do WhatsApp', () => {
    const open = vi.spyOn(window, 'open');
    expect(openWhatsApp('javascript:alert(1)')).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});
