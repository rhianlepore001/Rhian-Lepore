import type { Page, Route } from '@playwright/test';

/** Mesmo project ref de produção; as rotas nunca chegam na rede. */
export const PROJECT_REF = 'lcqwrngscsziysyfhpfj';
export const OWNER_ID = '00000000-0000-4000-8000-00000000000a';
export const STAFF_ID = '00000000-0000-4000-8000-00000000001a';
export const PRO_BOB = '10000000-0000-4000-8000-000000000001';
export const PRO_BRUNA = '10000000-0000-4000-8000-000000000002';
export const PRO_QUIM = '10000000-0000-4000-8000-0000000000aa';
export const APT_ID = '50000000-0000-4000-8000-000000000001';
export const APT_BUSY_ID = '50000000-0000-4000-8000-0000000000b1';
export const APT_QUEUE_ID = '50000000-0000-4000-8000-0000000000q1';
export const CLIENT_ID = '30000000-0000-4000-8000-000000000001';
export const CLIENT_BUSY_ID = '30000000-0000-4000-8000-0000000000b1';
export const AGENDA_DATE = '2026-08-23';
/** 23/08/2026 06:00 em Lisboa (WEST). */
export const APT_TIME_ISO = '2026-08-23T05:00:00.000Z';
/** 23/08/2026 10:00 em Lisboa — ocupa 10:00–11:00. */
export const APT_BUSY_TIME_ISO = '2026-08-23T09:00:00.000Z';
export const BOOKING_ID = '70000000-0000-4000-8000-000000000001';

export type RemarcarRole = 'owner' | 'staff';
export type StaffScope = 'none' | 'own' | 'all';

export type RpcStub = {
  status?: number;
  body?: unknown;
};

export interface RemarcarMockHandle {
  setRpc: (stub: RpcStub) => void;
  leaked: { method: string; url: string }[];
  assertNoLeak: () => void;
}

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function fakeJwt(sub: string): string {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      email: sub === OWNER_ID ? 'bob.owner@example.test' : 'quim.staff@example.test',
  });
  return `${header}.${payload}.e2e-fake-sig`;
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  const accept = route.request().headers()['accept'] || '';
  const wantsObject = accept.includes('vnd.pgrst.object+json');
  const payload = wantsObject && Array.isArray(body) ? (body[0] ?? null) : body;
  await route.fulfill({
    status: wantsObject && payload === null ? 406 : status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(payload),
  });
}

const HOURS = {
  mon: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
  tue: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
  wed: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
  thu: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
  fri: { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
  sat: { isOpen: true, blocks: [{ start: '09:00', end: '14:00' }] },
  sun: { isOpen: false, blocks: [] as { start: string; end: string }[] },
};

/**
 * Sessão + REST 100% mockados. Nenhuma escrita (nem GET) chega em produção.
 */
export async function installRemarcarMocks(
  page: Page,
  opts: { role: RemarcarRole; scope?: StaffScope } = { role: 'owner' },
): Promise<RemarcarMockHandle> {
  const role = opts.role;
  const scope = opts.scope ?? 'none';
  const userId = role === 'owner' ? OWNER_ID : STAFF_ID;
  const staffIsOwn = role === 'staff' && scope === 'own';
  const staffMemberId = staffIsOwn ? PRO_BOB : PRO_QUIM;
  const staffName = staffIsOwn ? 'Bob' : 'Quim';
  let rpc: RpcStub = { status: 200, body: { success: true, id: APT_ID, appointment_time: '2026-08-23T09:30:00.000Z', professional_id: PRO_BOB } };
  let aptTime = APT_TIME_ISO;
  const leaked: { method: string; url: string }[] = [];

  const accessToken = fakeJwt(userId);
  const session = {
    access_token: accessToken,
    refresh_token: 'e2e-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: userId,
      email: role === 'owner' ? 'bob.owner@example.test' : 'quim.staff@example.test',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: role === 'owner' || staffIsOwn ? 'Bob' : 'Quim' },
      created_at: '2026-01-01T00:00:00.000Z',
    },
  };

  const handle: RemarcarMockHandle = {
    setRpc: (stub) => {
      rpc = stub;
      const body = stub.body as { appointment_time?: string } | undefined;
      if (body?.appointment_time) aptTime = body.appointment_time;
    },
    leaked,
    assertNoLeak: () => {
      if (leaked.length > 0) throw new Error(`Escrita/GET vazou para prod: ${JSON.stringify(leaked)}`);
    },
  };

  await page.addInitScript(
    ({ authKey, sessionValue, clientKey, clientValue }) => {
      localStorage.setItem(authKey, JSON.stringify(sessionValue));
      localStorage.setItem(clientKey, JSON.stringify(clientValue));
    },
    {
      authKey: `sb-${PROJECT_REF}-auth-token`,
      sessionValue: session,
      clientKey: `rhian_public_client_${OWNER_ID}`,
      clientValue: {
        id: 'pc-aline',
        name: 'Aline Lima',
        phone: '+351619923489',
        business_id: OWNER_ID,
      },
    },
  );

  await page.route(`**/${PROJECT_REF}.supabase.co/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;
    const search = url.search;
    const method = req.method();

    if (pathname.includes('/auth/v1/user')) {
      await fulfillJson(route, session.user);
      return;
    }
    if (pathname.includes('/auth/v1/token') || pathname.includes('/auth/v1/session')) {
      await fulfillJson(route, session);
      return;
    }

    if (pathname.includes('/rest/v1/rpc/reschedule_appointment')) {
      const status = rpc.status ?? 200;
      if (status >= 400) {
        await route.fulfill({
          status,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify(rpc.body ?? { message: 'error', hint: 'reschedule_slot_busy' }),
        });
        return;
      }
      const body = (rpc.body ?? {}) as { appointment_time?: string };
      if (body.appointment_time) aptTime = body.appointment_time;
      await fulfillJson(route, rpc.body ?? { success: true });
      return;
    }

    if (pathname.includes('/rest/v1/rpc/get_public_profile_by_slug')) {
      await fulfillJson(route, {
        id: OWNER_ID,
        business_name: 'Barbearia Bob',
        user_type: 'barber',
        region: 'PT',
        business_slug: 'barbearia-bob',
        public_booking_enabled: true,
        phone: '+351210000000',
      });
      return;
    }
    if (pathname.includes('/rest/v1/rpc/get_public_business_settings_json')) {
      await fulfillJson(route, {
        timezone: 'Europe/Lisbon',
        enable_self_rescheduling: true,
        business_hours: HOURS,
      });
      return;
    }
    if (pathname.includes('/rest/v1/rpc/get_client_bookings_history')) {
      await fulfillJson(route, [{
        id: BOOKING_ID,
        appointment_time: aptTime,
        status: 'confirmed',
        service_ids: ['svc-1'],
        service_names: ['Corte Masculino'],
        professional_id: PRO_BOB,
        professional_name: 'Bob',
        total_price: 45,
        duration_minutes: 30,
        created_at: '2026-08-22T10:00:00.000Z',
      }]);
      return;
    }
    if (pathname.includes('/rest/v1/rpc/get_client_booking_cancellations')) {
      await fulfillJson(route, []);
      return;
    }

    if (pathname.includes('/rest/v1/rpc/')) {
      await fulfillJson(route, null);
      return;
    }

    if (pathname.includes('/rest/v1/profiles')) {
      const ownerProfile = {
        id: OWNER_ID,
        role: 'owner',
        company_id: OWNER_ID,
        full_name: 'Bob',
        business_name: 'Barbearia Bob',
        user_type: 'barber',
        region: 'PT',
        subscription_status: 'active',
        trial_ends_at: null,
        tutorial_completed: true,
        aios_enabled: false,
        photo_url: null,
      };
      if (role === 'owner' || search.includes(`id=eq.${OWNER_ID}`)) {
        await fulfillJson(route, [ownerProfile]);
        return;
      }
      await fulfillJson(route, [{
        id: STAFF_ID,
        role: 'staff',
        company_id: OWNER_ID,
        full_name: staffName,
        business_name: null,
        user_type: 'barber',
        region: 'PT',
        subscription_status: 'active',
        trial_ends_at: null,
        tutorial_completed: true,
        aios_enabled: false,
        photo_url: null,
      }]);
      return;
    }

    if (pathname.includes('/rest/v1/team_members')) {
      if (search.includes('staff_user_id=eq.')) {
        await fulfillJson(route, [{ id: staffMemberId, name: staffName }]);
        return;
      }
      await fulfillJson(route, [
        { id: PRO_BOB, name: 'Bob', photo_url: null, staff_user_id: scope === 'own' ? STAFF_ID : OWNER_ID, active: true, user_id: OWNER_ID },
        { id: PRO_BRUNA, name: 'Bruna', photo_url: null, staff_user_id: null, active: true, user_id: OWNER_ID },
        { id: PRO_QUIM, name: 'Quim', photo_url: null, staff_user_id: scope === 'own' ? null : STAFF_ID, active: true, user_id: OWNER_ID },
      ]);
      return;
    }

    if (pathname.includes('/rest/v1/onboarding_progress')) {
      await fulfillJson(route, [{ is_completed: true, company_id: OWNER_ID }]);
      return;
    }

    if (pathname.includes('/rest/v1/business_settings')) {
      await fulfillJson(route, [{
        user_id: OWNER_ID,
        timezone: 'Europe/Lisbon',
        business_hours: HOURS,
        public_booking_enabled: true,
        staff_appointment_edit_scope: scope,
        staff_can_block_agenda: true,
        machine_fee_enabled: false,
        debit_fee_percent: 0,
        credit_fee_percent: 0,
      }]);
      return;
    }

    if (pathname.includes('/rest/v1/appointments')) {
      const rows = [
        {
          id: APT_ID,
          user_id: OWNER_ID,
          client_id: CLIENT_ID,
          professional_id: PRO_BOB,
          service: 'Corte Masculino',
          appointment_time: aptTime,
          status: 'Confirmed',
          duration_minutes: 30,
          price: 45,
          notes: null,
          payment_method: 'cash',
          origin: 'agenda',
          edited_at: null,
          clients: { id: CLIENT_ID, name: 'Aline Lima', phone: '+351619923489' },
        },
        {
          id: APT_BUSY_ID,
          user_id: OWNER_ID,
          client_id: CLIENT_BUSY_ID,
          professional_id: PRO_BOB,
          service: 'Barba',
          appointment_time: APT_BUSY_TIME_ISO,
          status: 'Confirmed',
          duration_minutes: 60,
          price: 25,
          notes: null,
          payment_method: 'cash',
          origin: 'agenda',
          edited_at: null,
          clients: { id: CLIENT_BUSY_ID, name: 'Carla Costa', phone: '+351619923490' },
        },
        {
          id: APT_QUEUE_ID,
          user_id: OWNER_ID,
          client_id: CLIENT_BUSY_ID,
          professional_id: PRO_BOB,
          service: 'Fila',
          appointment_time: '2026-08-23T14:00:00.000Z',
          status: 'Completed',
          duration_minutes: 30,
          price: 0,
          notes: null,
          payment_method: 'cash',
          origin: 'queue',
          edited_at: null,
          clients: { id: CLIENT_BUSY_ID, name: 'Carla Costa', phone: '+351619923490' },
        },
      ];
      const idEq = search.match(/(?:^|[?&])id=eq\.([0-9a-f-]+)/i)?.[1];
      const proEq = search.match(/(?:^|[?&])professional_id=eq\.([0-9a-f-]+)/i)?.[1];
      const originNeq = search.match(/(?:^|[?&])origin=neq\.([^&]+)/i)?.[1];
      let out = rows;
      if (idEq) out = out.filter((r) => r.id === idEq);
      if (proEq) out = out.filter((r) => r.professional_id === proEq);
      if (originNeq) out = out.filter((r) => r.origin !== originNeq);
      await fulfillJson(route, out);
      return;
    }

    if (pathname.includes('/rest/v1/services')) {
      await fulfillJson(route, [{ id: 'svc-1', name: 'Corte Masculino', price: 45, duration_minutes: 30, user_id: OWNER_ID, active: true }]);
      return;
    }

    if (pathname.includes('/rest/v1/clients')) {
      await fulfillJson(route, [
        { id: CLIENT_ID, name: 'Aline Lima', phone: '+351619923489' },
        { id: CLIENT_BUSY_ID, name: 'Carla Costa', phone: '+351619923490' },
      ]);
      return;
    }

    if (pathname.includes('/rest/v1/categories')) {
      await fulfillJson(route, []);
      return;
    }

    if (pathname.includes('/rest/v1/public_bookings')) {
      const proEq = search.match(/(?:^|[?&])professional_id=eq\.([0-9a-f-]+)/i)?.[1];
      const rows = [{
        id: 'pb-busy-1',
        business_id: OWNER_ID,
        professional_id: PRO_BOB,
        appointment_time: '2026-08-23T15:00:00.000Z',
        duration_minutes: 30,
        status: 'pending',
      }];
      await fulfillJson(route, proEq ? rows.filter((r) => r.professional_id === proEq) : rows);
      return;
    }

    if (pathname.includes('/rest/v1/agenda_blocks')) {
      await fulfillJson(route, [{
        id: 'block-1',
        user_id: OWNER_ID,
        professional_id: PRO_BOB,
        starts_at: '2026-08-23T11:00:00.000Z',
        ends_at: '2026-08-23T12:00:00.000Z',
      }]);
      return;
    }

    if (pathname.includes('/rest/v1/appointment_reschedules')) {
      await fulfillJson(route, [{
        created_at: '2026-08-22T10:00:00.000Z',
        created_by: OWNER_ID,
        old_appointment_time: '2026-08-23T04:00:00.000Z',
      }]);
      return;
    }

    if (pathname.includes('/rest/v1/')) {
      await fulfillJson(route, method === 'GET' || method === 'HEAD' ? [] : null);
      return;
    }

    if (req.url().includes('realtime') || pathname.includes('/realtime')) {
      await route.abort('blockedbyclient');
      return;
    }

    leaked.push({ method, url: req.url() });
    await route.abort('blockedbyclient');
  });

  return handle;
}
