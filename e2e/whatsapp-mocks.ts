import { expect, type Page, type Route } from '@playwright/test';
import type { WhatsAppTemplateOverride } from '../utils/whatsappTemplates';

/** Mocks do Supabase para as suítes de WhatsApp (sem rede real, dados fictícios). */
export interface MockOptions {
  /** Serve equipe, serviço, cliente e a RPC de criar agendamento. */
  agenda?: boolean;
  /** Troca window.open por um gravador (padrão). Desligue para ver a aba real. */
  stubOpen?: boolean;
  /** Atraso da RPC de criar, para simular rede real. */
  createDelayMs?: number;
}

export const OWNER = '00000000-0000-4000-8000-00000000000a';
export const STAFF = '00000000-0000-4000-8000-00000000001a';
export const HOURS = Object.fromEntries(
  ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => [
    day,
    { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
  ]),
);

export async function respond(route: Route, data: unknown) {
  const single = route
    .request()
    .headers()
    .accept?.includes('vnd.pgrst.object+json');
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(
      single && Array.isArray(data) ? (data[0] ?? null) : data,
    ),
  });
}

export async function installMocks(
  page: Page,
  theme: 'barber' | 'beauty',
  role: 'owner' | 'staff' = 'owner',
  withBooking = false,
  options: MockOptions = {},
) {
  const { agenda = false, stubOpen = true, createDelayMs = 0 } = options;
  const id = role === 'owner' ? OWNER : STAFF;
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const session = {
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400 })}.sig`,
    refresh_token: 'local',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id,
      email: 'dono@example.test',
      aud: 'authenticated',
      role: 'authenticated',
      user_metadata: {},
      app_metadata: { provider: 'email' },
      created_at: '2026-01-01T00:00:00Z',
    },
  };
  const templates: WhatsAppTemplateOverride[] = [];
  const writes: WhatsAppTemplateOverride[] = [];
  const opens: string[] = [];
  let accepted = false;
  await page.addInitScript(
    ({ session, theme, stubOpen }) => {
      localStorage.setItem(
        'sb-whatsapp-e2e-auth-token',
        JSON.stringify(session),
      );
      localStorage.setItem(
        'rhian_public_client_00000000-0000-4000-8000-00000000000a',
        JSON.stringify({
          id: 'cliente-exemplo',
          name: 'Cliente Exemplo',
          phone: '00000000000',
          business_id: '00000000-0000-4000-8000-00000000000a',
        }),
      );
      localStorage.setItem(
        'agendix_color_mode',
        theme === 'beauty' ? 'light' : 'dark',
      );
      if (stubOpen) {
        window.open = (url) => {
          window.dispatchEvent(
            new CustomEvent('test-whatsapp-open', { detail: String(url) }),
          );
          return null;
        };
      }
    },
    { session, theme, stubOpen },
  );
  await page.exposeFunction('recordWhatsApp', (url: string) => opens.push(url));
  await page.addInitScript(() =>
    window.addEventListener(
      'test-whatsapp-open',
      (event) =>
        void (
          window as unknown as { recordWhatsApp: (url: string) => void }
        ).recordWhatsApp((event as CustomEvent).detail),
    ),
  );
  // Nenhuma ida real ao WhatsApp: abas novas para wa.me recebem uma página falsa.
  await page.context().route(/^https:\/\/(wa\.me|api\.whatsapp\.com)\//, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp (falso)</title>' }),
  );
  const created: unknown[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      await route.continue();
      return;
    }
    if (url.hostname === 'wa.me' || url.hostname === 'api.whatsapp.com') {
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp (falso)</title>' });
      return;
    }
    if (url.hostname !== 'whatsapp-e2e.supabase.co') {
      await route.abort();
      return;
    }
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
        },
      });
      return;
    }
    const p = url.pathname;
    if (url.hostname === 'whatsapp-e2e.supabase.co' && agenda) {
      if (p.endsWith('/rpc/create_secure_booking')) {
        created.push(route.request().postDataJSON());
        if (createDelayMs) await new Promise((r) => setTimeout(r, createDelayMs));
        await respond(route, { success: true, booking_id: '00000000-0000-4000-8000-0000000000c1' });
        return;
      }
      if (p.endsWith('/team_members')) {
        await respond(route, [{ id: '00000000-0000-4000-8000-0000000000d1', name: 'Dani', photo_url: null, staff_user_id: null, active: true }]);
        return;
      }
      if (p.endsWith('/services')) {
        await respond(route, [{ id: '00000000-0000-4000-8000-0000000000e1', name: 'Atendimento Exemplo', price: 90, duration_minutes: 30, category_id: null, description: null, active: true }]);
        return;
      }
      if (p.endsWith('/clients')) {
        await respond(route, [{ id: '00000000-0000-4000-8000-0000000000f1', name: 'Cliente Exemplo', phone: '+55 11 90000-0001' }]);
        return;
      }
    }
    if (p.endsWith('/rpc/list_company_pending_public_bookings')) {
      await respond(route, withBooking && !accepted ? [{ id: '00000000-0000-4000-8000-0000000000b1', business_id: OWNER, customer_name: 'Cliente Exemplo', customer_phone: '00000000000', status: 'pending', appointment_time: new Date(Date.now() + 3 * 86400_000).toISOString(), total_price: 90, service_ids: [], professional_id: null }] : []);
      return;
    }
    if (p.endsWith('/rpc/accept_public_booking_v2')) {
      accepted = true;
      await respond(route, { appointment_id: '00000000-0000-4000-8000-0000000000b2', service_names: 'Atendimento' });
      return;
    }
    if (p.includes('/auth/v1/user')) {
      await respond(route, session.user);
      return;
    }
    if (p.includes('/auth/v1/')) {
      await respond(route, session);
      return;
    }
    if (p.endsWith('/whatsapp_message_templates')) {
      if (route.request().method() === 'POST') {
        const row = route.request().postDataJSON();
        expect(row.business_id).toBe(OWNER);
        const saved = {
          message_key: row.message_key,
          body: row.body,
          enabled: row.enabled,
        };
        const index = templates.findIndex(
          (item) => item.message_key === row.message_key,
        );
        if (index >= 0) templates[index] = saved;
        else templates.push(saved);
        writes.push(saved);
        await respond(route, saved);
      } else {
        expect(url.searchParams.get('business_id')).toBe(`eq.${OWNER}`);
        await respond(route, templates);
      }
      return;
    }
    if (p.endsWith('/profiles')) {
      await respond(route, [
        {
          id,
          role,
          company_id: OWNER,
          full_name: 'Dani',
          phone: '00000000000',
          business_name: 'Negócio Exemplo',
          business_slug: 'negocio-exemplo',
          user_type: theme,
          region: 'BR',
          subscription_status: 'active',
          tutorial_completed: true,
          public_booking_enabled: true,
        },
      ]);
      return;
    }
    if (p.endsWith('/business_settings')) {
      await respond(route, [
        {
          user_id: OWNER,
          business_hours: HOURS,
          timezone: 'America/Sao_Paulo',
          onboarding_completed: true,
          enable_self_rescheduling: true,
        },
      ]);
      return;
    }
    if (p.endsWith('/onboarding_progress')) {
      await respond(route, [{ is_completed: true }]);
      return;
    }
    if (p.endsWith('/rpc/get_public_whatsapp_templates')) {
      await respond(
        route,
        templates.filter(
          (row) =>
            row.message_key.startsWith('client_') ||
            ['membership_overdue', 'membership_pending'].includes(
              row.message_key,
            ),
        ),
      );
      return;
    }
    if (p.endsWith('/rpc/get_public_profile_by_slug')) {
      await respond(route, {
        id: OWNER,
        business_name: 'Negócio Exemplo',
        business_slug: 'negocio-exemplo',
        user_type: theme,
        region: 'BR',
        phone: '00000000000',
        public_booking_enabled: true,
      });
      return;
    }
    if (p.endsWith('/rpc/get_public_business_settings_json')) {
      await respond(route, {
        business_hours: HOURS,
        timezone: 'America/Sao_Paulo',
        enable_self_rescheduling: true,
        client_cancel_cutoff_hours: 2,
      });
      return;
    }
    if (p.endsWith('/rpc/get_client_bookings_history_v2')) {
      await respond(
        route,
        [
          {
            id: 'booking-pending',
            status: 'pending',
            appointment_time: new Date(
              Date.now() + 3 * 86400_000,
            ).toISOString(),
          },
          {
            id: 'booking-confirmed',
            status: 'confirmed',
            appointment_time: new Date(
              Date.now() + 4 * 86400_000,
            ).toISOString(),
          },
          {
            id: 'booking-near',
            status: 'confirmed',
            appointment_time: new Date(Date.now() + 30 * 60_000).toISOString(),
          },
        ].map((booking) => ({
          ...booking,
          service_names: ['Atendimento'],
          professional_name: 'Dani',
          total_price: 90,
          created_at: new Date(Date.now() - 86400_000).toISOString(),
        })),
      );
      return;
    }
    if (
      p.endsWith('/rpc/get_public_membership_plans') ||
      p.endsWith('/rpc/get_client_booking_cancellations')
    ) {
      await respond(route, []);
      return;
    }
    if (p.includes('/rpc/')) {
      await respond(route, null);
      return;
    }
    await respond(route, []);
  });
  return { templates, writes, opens, created };
}

