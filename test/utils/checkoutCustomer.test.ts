import { describe, expect, it, vi } from 'vitest';
import { resolveCheckoutCustomer, type CheckoutCustomerApi } from '../../supabase/functions/_shared/billing';

const ownCustomer = (id: string) => ({ id, metadata: { supabase_user_id: 'user_a' } });
const otherCustomer = (id: string) => ({ id, metadata: { supabase_user_id: 'user_b' } });

function api(over: Partial<CheckoutCustomerApi> = {}): CheckoutCustomerApi {
  return {
    retrieve: vi.fn(async (id: string) => ownCustomer(id)),
    listByEmail: vi.fn(async () => []),
    create: vi.fn(async () => ({ id: 'cus_new' })),
    ...over,
  };
}

describe('resolveCheckoutCustomer', () => {
  it('reaproveita o customer salvo quando o Stripe confirma a titularidade', async () => {
    const stripe = api();
    await expect(resolveCheckoutCustomer('cus_owned', 'a@example.test', 'user_a', stripe)).resolves.toBe('cus_owned');
    expect(stripe.create).not.toHaveBeenCalled();
  });

  it('ignora o customer salvo de outra conta ou modo', async () => {
    const stripe = api({ retrieve: vi.fn(async () => { throw Object.assign(new Error('Missing'), { code: 'resource_missing' }); }) });
    await expect(resolveCheckoutCustomer('cus_old', 'a@example.test', 'user_a', stripe)).resolves.toBe('cus_new');
    expect(stripe.create).toHaveBeenCalledWith('a@example.test', 'user_a', expect.stringMatching(/^agendix-checkout-customer-v1-[a-f0-9]{64}$/));
  });

  it('ignora o customer apagado e busca o primeiro customer da mesma conta', async () => {
    const stripe = api({
      retrieve: vi.fn(async () => null),
      listByEmail: vi.fn(async () => [otherCustomer('cus_other'), ownCustomer('cus_owned')]),
    });
    await expect(resolveCheckoutCustomer('cus_old', 'a@example.test', 'user_a', stripe)).resolves.toBe('cus_owned');
  });

  it('cria um customer quando o ID salvo pertence a outra conta e os resultados por e-mail não têm vínculo', async () => {
    const stripe = api({
      retrieve: vi.fn(async (id: string) => otherCustomer(id)),
      listByEmail: vi.fn(async () => [{ id: 'cus_legacy' }, otherCustomer('cus_other')]),
    });
    await expect(resolveCheckoutCustomer('cus_other', 'a@example.test', 'user_a', stripe)).resolves.toBe('cus_new');
  });

  it('usa a mesma chave em tentativas simultâneas e distingue alterações na conta ou no e-mail', async () => {
    const stripe = api();
    await Promise.all([
      resolveCheckoutCustomer(null, 'a@example.test', 'user_a', stripe),
      resolveCheckoutCustomer(null, 'a@example.test', 'user_a', stripe),
    ]);
    await resolveCheckoutCustomer(null, 'b@example.test', 'user_a', stripe);
    await resolveCheckoutCustomer(null, 'a@example.test', 'user_b', stripe);

    const keys = vi.mocked(stripe.create).mock.calls.map(([, , key]) => key);
    expect(keys[0]).toBe(keys[1]);
    expect(new Set(keys).size).toBe(3);
    expect(keys[0]).not.toContain('a@example.test');
  });

  it('propaga erros temporários do Stripe', async () => {
    const stripe = api({ retrieve: vi.fn(async () => { throw Object.assign(new Error('rate'), { code: 'rate_limit' }); }) });
    await expect(resolveCheckoutCustomer('cus_owned', 'a@example.test', 'user_a', stripe)).rejects.toThrow('rate');
  });
});
