import { describe, expect, it } from 'vitest';
import { getPublicBookingSection, publicBookingProductsPath, shouldLandOnClientArea } from '../../utils/publicBookingLanding';

describe('shouldLandOnClientArea', () => {
  it('leva cliente logado do link público para a área do cliente', () => {
    expect(
      shouldLandOnClientArea({
        isLoggedInForBusiness: true,
        searchParams: new URLSearchParams(),
      }),
    ).toBe(true);
  });

  it('mantém o agendamento quando há intenção explícita', () => {
    expect(
      shouldLandOnClientArea({
        isLoggedInForBusiness: true,
        searchParams: new URLSearchParams('agendar=1'),
      }),
    ).toBe(false);
    expect(
      shouldLandOnClientArea({
        isLoggedInForBusiness: true,
        searchParams: new URLSearchParams('edit=abc'),
      }),
    ).toBe(false);
    expect(
      shouldLandOnClientArea({
        isLoggedInForBusiness: true,
        searchParams: new URLSearchParams('rebook=1'),
      }),
    ).toBe(false);
  });

  it.each(['produtos', 'clube'])('mantém a seção pública %s para clientes com sessão', (section) => {
    const searchParams = new URLSearchParams({ secao: section });
    expect(shouldLandOnClientArea({ isLoggedInForBusiness: true, searchParams })).toBe(false);
  });

  it('reconhece a URL da vitrine pública e mantém o comportamento padrão para seções desconhecidas', () => {
    const url = new URL(publicBookingProductsPath('loja-exemplo'), 'https://example.com');
    expect(url.pathname).toBe('/book/loja-exemplo');
    expect(getPublicBookingSection(url.searchParams)).toBe('products');
    expect(shouldLandOnClientArea({
      isLoggedInForBusiness: true,
      searchParams: new URLSearchParams('secao=desconhecida'),
    })).toBe(true);
  });

  it('não redireciona visitante anônimo', () => {
    expect(
      shouldLandOnClientArea({
        isLoggedInForBusiness: false,
        searchParams: new URLSearchParams(),
      }),
    ).toBe(false);
  });
});
