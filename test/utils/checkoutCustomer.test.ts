import { describe, expect, it, vi } from 'vitest';
import { resolveCheckoutCustomer, type CheckoutCustomerApi } from '../../supabase/functions/_shared/billing';

const missing = () => Object.assign(new Error("No such customer: 'cus_old'"), { code: 'resource_missing' });

function api(over: Partial<CheckoutCustomerApi> = {}): CheckoutCustomerApi {
  return {
    retrieve: vi.fn(async (id: string) => ({ id })),
    listByEmail: vi.fn(async () => []),
    create: vi.fn(async () => ({ id: 'cus_new' })),
    ...over,
  };
}

describe('resolveCheckoutCustomer', () => {
  it('reaproveita o customer salvo quando ele existe na conta Stripe atual', async () => {
    const a = api();
    await expect(resolveCheckoutCustomer('cus_ok', 'a@example.com', 'u1', a)).resolves.toEqual({ customerId: 'cus_ok', persist: false });
    expect(a.create).not.toHaveBeenCalled();
  });

  it('customer salvo de outra conta/modo (resource_missing): usa/cria um novo e não quebra o checkout', async () => {
    const a = api({ retrieve: vi.fn(async () => { throw missing(); }) });
    await expect(resolveCheckoutCustomer('cus_old', 'a@example.com', 'u1', a)).resolves.toEqual({ customerId: 'cus_new', persist: false });
    expect(a.create).toHaveBeenCalledWith('a@example.com', 'u1');
  });

  it('customer salvo apagado no Stripe também é trocado', async () => {
    const a = api({ retrieve: vi.fn(async (id: string) => ({ id, deleted: true })), listByEmail: vi.fn(async () => [{ id: 'cus_byemail' }]) });
    await expect(resolveCheckoutCustomer('cus_old', 'a@example.com', 'u1', a)).resolves.toEqual({ customerId: 'cus_byemail', persist: false });
  });

  it('sem customer salvo: procura pelo e-mail ou cria, e pede para gravar', async () => {
    await expect(resolveCheckoutCustomer(null, 'a@example.com', 'u1', api({ listByEmail: vi.fn(async () => [{ id: 'cus_e' }]) })))
      .resolves.toEqual({ customerId: 'cus_e', persist: true });
    await expect(resolveCheckoutCustomer(null, 'a@example.com', 'u1', api())).resolves.toEqual({ customerId: 'cus_new', persist: true });
  });

  it('outros erros do Stripe não são engolidos', async () => {
    const a = api({ retrieve: vi.fn(async () => { throw Object.assign(new Error('rate'), { code: 'rate_limit' }); }) });
    await expect(resolveCheckoutCustomer('cus_ok', 'a@example.com', 'u1', a)).rejects.toThrow('rate');
  });
});
