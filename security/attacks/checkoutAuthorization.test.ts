import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import * as allowlist from '../../supabase/functions/create-checkout-session/allowlist';
import { loadEdgeHandler } from '../tests/edgeHarness';

const ownerId = 'b0000000-0000-4000-8000-0000000000b0';

function fixture(options: {
  signedIn?: boolean;
  role?: string;
  companyId?: string;
  existingCustomer?: string;
  customerOwner?: string | null;
  deleted?: boolean;
  bindingError?: boolean;
  serviceKey?: string;
  stripeKey?: string;
} = {}) {
  const customer = { id: options.existingCustomer ?? 'cus_NewFixture', deleted: options.deleted ?? false, metadata: options.customerOwner === null ? {} : { supabase_user_id: options.customerOwner ?? ownerId } };
  const customers = {
    list: vi.fn().mockResolvedValue({ data: [{ id: 'cus_ForeignSameEmail', metadata: { supabase_user_id: 'foreign-user' } }] }),
    retrieve: vi.fn().mockResolvedValue(customer),
    create: vi.fn().mockResolvedValue(customer),
  };
  const createSession = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/fictional-session' });
  const profile = { id: ownerId, role: options.role ?? 'owner', company_id: options.companyId ?? ownerId, stripe_customer_id: options.existingCustomer ?? null };
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: profile, error: null }) };
  const rpc = vi.fn().mockResolvedValue({ data: customer.id, error: options.bindingError ? { message: 'fictional-private-database-detail' } : null });
  const userClient = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: options.signedIn === false ? null : { id: ownerId, email: 'fictional-owner@example.invalid' } }, error: null }) },
    from: vi.fn().mockReturnValue(query),
    rpc: vi.fn().mockResolvedValue({ data: customer.id, error: null }),
  };
  const serviceClient = { rpc };
  const createClient = vi.fn().mockImplementation((_url: string, key: string) => key === 'fictional-service-key' ? serviceClient : userClient);
  const env = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_ANON_KEY: 'fictional-anon-key', SUPABASE_SERVICE_ROLE_KEY: options.serviceKey ?? 'fictional-service-key', STRIPE_SECRET_KEY: options.stripeKey ?? 'sk_test_fictional_fixture' };
  const stripeConstruct = vi.fn((key: string) => {
    if (!key) throw new Error('Stripe SDK requires a key');
  });
  const handler = loadEdgeHandler(resolve(__dirname, '../../supabase/functions/create-checkout-session/index.ts'), {
    ...allowlist,
    createClient,
    Stripe: class {
      constructor(key: string) { stripeConstruct(key); }
      customers = customers;
      checkout = { sessions: { create: createSession } };
    },
    Deno: { env: { get: (key: keyof typeof env) => env[key] } },
  });
  const request = (body = {}, method = 'POST') => new Request('http://localhost/checkout', {
    method,
    headers: { Authorization: 'Bearer fictional-user-jwt', 'Content-Type': 'application/json' },
    ...(method === 'POST' ? { body: JSON.stringify({ priceId: allowlist.FALLBACK_STRIPE_PRICE_IDS[0], successUrl: 'http://localhost:3000/#/', cancelUrl: 'http://localhost:3000/#/configuracoes/assinatura', ...body }) } : {}),
  });
  return { handler, request, customers, createSession, rpc, createClient, userClient, stripeConstruct };
}

describe('checkout identity and customer authorization (no Stripe network)', () => {
  it('requires a validated authenticated user', async () => {
    const f = fixture({ signedIn: false });
    expect((await f.handler(f.request())).status).toBe(401);
    expect(f.createSession).not.toHaveBeenCalled();
  });

  it('restricts HTTP methods', async () => {
    const f = fixture();
    expect((await f.handler(f.request({}, 'GET'))).status).toBe(405);
    expect(f.userClient.auth.getUser).not.toHaveBeenCalled();
  });

  it.each([{ role: 'staff' }, { companyId: 'a0000000-0000-4000-8000-0000000000a0' }])('denies non-owner profile %j', async (profile) => {
    const f = fixture(profile);
    expect((await f.handler(f.request())).status).toBe(403);
    expect(f.customers.create).not.toHaveBeenCalled();
    expect(f.createSession).not.toHaveBeenCalled();
  });

  it.each([
    { priceId: 'price_unapproved' },
    { mode: 'payment' },
    { successUrl: 'https://rhian-lepore-attacker.vercel.app/' },
    { cancelUrl: 'javascript:alert(1)' },
  ])('denies unsupported checkout input %j before Stripe effects', async (body) => {
    const f = fixture();
    expect((await f.handler(f.request(body))).status).toBe(400);
    expect(f.customers.create).not.toHaveBeenCalled();
    expect(f.createSession).not.toHaveBeenCalled();
  });

  it.each([
    { customerOwner: 'foreign-user' },
    { customerOwner: null },
    { deleted: true },
  ])('denies an unverified existing customer %j', async (options) => {
    const f = fixture({ existingCustomer: 'cus_ExistingFixture', ...options });
    expect((await f.handler(f.request())).status).toBe(409);
    expect(f.createSession).not.toHaveBeenCalled();
  });

  it('uses a verified existing customer and ignores customer supplied in the body', async () => {
    const f = fixture({ existingCustomer: 'cus_ExistingFixture' });
    expect((await f.handler(f.request({ customerId: 'cus_AttackerFixture' }))).status).toBe(200);
    expect(f.customers.retrieve).toHaveBeenCalledWith('cus_ExistingFixture');
    expect(f.createSession).toHaveBeenCalledWith(expect.objectContaining({ customer: 'cus_ExistingFixture', mode: 'subscription', metadata: { supabase_user_id: ownerId } }));
    expect(f.createSession.mock.calls[0][0]).not.toHaveProperty('automatic_payment_methods');
    expect(f.rpc).not.toHaveBeenCalled();
  });

  it('creates its own customer without adopting another customer with the same email', async () => {
    const f = fixture();
    expect((await f.handler(f.request())).status).toBe(200);
    expect(f.customers.list).not.toHaveBeenCalled();
    expect(f.customers.create).toHaveBeenCalledWith(expect.objectContaining({ metadata: { supabase_user_id: ownerId } }), expect.objectContaining({ idempotencyKey: `agendix-customer-${ownerId}` }));
    expect(f.rpc).toHaveBeenCalledWith('set_stripe_customer_id_for_user', { p_user_id: ownerId, p_customer_id: 'cus_NewFixture' });
    expect(f.userClient.rpc).not.toHaveBeenCalled();
    expect(f.createSession).toHaveBeenCalledWith(expect.objectContaining({ customer: 'cus_NewFixture' }));
  });

  it('requires backend configuration before creating a customer', async () => {
    const f = fixture({ serviceKey: '' });
    expect((await f.handler(f.request())).status).toBe(503);
    expect(f.customers.create).not.toHaveBeenCalled();
  });

  it('registers the handler and returns 503 when the Stripe key is missing', async () => {
    const f = fixture({ stripeKey: '' });
    expect((await f.handler(f.request())).status).toBe(503);
    expect(f.stripeConstruct).not.toHaveBeenCalled();
    expect(f.customers.create).not.toHaveBeenCalled();
  });

  it('fails closed without exposing database error details when binding fails', async () => {
    const f = fixture({ bindingError: true });
    const response = await f.handler(f.request());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('fictional-private-database-detail');
    expect(f.createSession).not.toHaveBeenCalled();
  });
});
