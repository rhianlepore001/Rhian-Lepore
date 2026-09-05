import { describe, expect, it } from 'vitest';
import { shouldLandOnClientArea } from '../../utils/publicBookingLanding';

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

  it('não redireciona visitante anônimo', () => {
    expect(
      shouldLandOnClientArea({
        isLoggedInForBusiness: false,
        searchParams: new URLSearchParams(),
      }),
    ).toBe(false);
  });
});
