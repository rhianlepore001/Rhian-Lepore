import { expect, test, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { WhatsAppTemplateOverride } from '../utils/whatsappTemplates';

test.skip(process.env.AGENDIX_WHATSAPP_E2E !== '1', 'Use e2e/whatsapp-templates.config.ts para executar esta suíte isolada.');

const OWNER = '00000000-0000-4000-8000-00000000000a';
const STAFF = '00000000-0000-4000-8000-00000000001a';
const SHOTS =
  process.env.SHOT_DIR ??
  path.join(process.cwd(), 'docs/whatsapp-messages/screenshots');
const HOURS = Object.fromEntries(
  ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => [
    day,
    { isOpen: true, blocks: [{ start: '09:00', end: '19:00' }] },
  ]),
);

async function respond(route: Route, data: unknown) {
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

async function installMocks(
  page: Page,
  theme: 'barber' | 'beauty',
  role: 'owner' | 'staff' = 'owner',
  withBooking = false,
) {
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
    ({ session, theme }) => {
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
      window.open = (url) => {
        window.dispatchEvent(
          new CustomEvent('test-whatsapp-open', { detail: String(url) }),
        );
        return null;
      };
    },
    { session, theme },
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
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      await route.continue();
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
  return { templates, writes, opens };
}

for (const theme of ['barber', 'beauty'] as const) {
  test(`${theme}: edita, salva, recarrega, desliga, restaura e testa`, async ({
    page,
  }, info) => {
    const mock = await installMocks(page, theme);
    await page.goto('/#/configuracoes/whatsapp');
    const edit = page.getByRole('button', { name: 'Editar Horário remarcado' });
    await expect(edit).toBeVisible();
    await expect(page.getByRole('button', { name: /Editar/ })).toHaveCount(14);
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({
      path: path.join(SHOTS, `${theme}-${info.project.name}-cards.png`),
      fullPage: true,
    });
    await edit.click();
    const input = page.getByLabel('Texto da mensagem');
    await input.fill(
      'Oi {cliente}! Seu novo horário em {estabelecimento} é {data} às {hora}.',
    );
    await expect(page.getByTestId('whatsapp-preview')).toHaveText(
      'Oi Cliente Exemplo! Seu novo horário em Negócio Exemplo é 28/10/2026 às 14:30.',
    );
    await input.fill('Oi {senha}');
    await expect(page.getByRole('alert')).toContainText('não está disponível');
    await expect(
      page.getByRole('button', { name: 'Salvar', exact: true }),
    ).toBeDisabled();
    await input.fill(
      'Oi {cliente}! <img src=x> Seu horário em {estabelecimento} é {data}.',
    );
    await expect(
      page.getByTestId('whatsapp-preview').locator('img'),
    ).toHaveCount(0);
    await input.fill('Oi ');
    await page.getByRole('button', { name: '{cliente}', exact: true }).click();
    await expect(input).toHaveValue('Oi {cliente}');
    await input.fill(
      'Oi {cliente}! Seu novo horário em {estabelecimento} é {data} às {hora}.',
    );
    await page.getByRole('button', { name: 'Testar no meu WhatsApp' }).click();
    await expect.poll(() => mock.opens.length).toBe(1);
    expect(new URL(mock.opens[0]).searchParams.get('text')).toBe(
      'Oi Cliente Exemplo! Seu novo horário em Negócio Exemplo é 28/10/2026 às 14:30.',
    );
    await page.screenshot({
      path: path.join(SHOTS, `${theme}-${info.project.name}-editor.png`),
      fullPage: true,
    });
    if (info.project.name === 'mobile') {
      await page.getByTestId('whatsapp-preview').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(SHOTS, `${theme}-mobile-preview.png`),
        fullPage: true,
      });
    }
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByLabel('Texto da mensagem')).toHaveCount(0);
    expect(mock.writes[0]).toMatchObject({
      message_key: 'reschedule',
      enabled: true,
      body: 'Oi {cliente}! Seu novo horário em {estabelecimento} é {data} às {hora}.',
    });
    await page.reload();
    await edit.click();
    await expect(input).toHaveValue(mock.writes[0].body!);
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    await page.locator('label[for="active-reschedule"]').click();
    await expect(
      page.getByRole('checkbox', { name: 'Ativa: Horário remarcado' }),
    ).not.toBeChecked();
    await expect.poll(() => mock.writes.length).toBe(2);
    expect(mock.writes[1].enabled).toBe(false);
    await edit.click();
    await page.getByRole('button', { name: 'Restaurar padrão' }).click();
    const confirm = page.getByRole('dialog', {
      name: 'Restaurar mensagem padrão?',
    });
    await expect(confirm).toBeVisible();
    expect(mock.writes).toHaveLength(2);
    await confirm.getByRole('button', { name: 'Restaurar padrão' }).click();
    await expect(confirm).toHaveCount(0);
    expect(mock.writes[2]).toEqual({
      message_key: 'reschedule',
      enabled: false,
      body: null,
    });
    await expect(input).toHaveValue(
      /Seu horário em \*\{estabelecimento\}\* foi remarcado/,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

for (const enabled of [true, false]) {
  test(`Minha Área usa texto salvo nos envios: ativa=${enabled}`, async ({
    page,
  }) => {
    const mock = await installMocks(page, 'beauty');
    mock.templates.push(
      {
        message_key: 'client_request_confirm',
        enabled,
        body: 'Meu atendimento em {estabelecimento}.',
      },
      { message_key: 'client_question', enabled, body: 'Dúvida de {cliente}.' },
      {
        message_key: 'client_cancel',
        enabled,
        body: 'Cancelar, aqui é {cliente}.',
      },
    );
    await page.goto('/#/minha-area/negocio-exemplo');
    await page
      .getByRole('button', { name: 'Pedir confirmação', exact: true })
      .click();
    await page.getByRole('button', { name: 'WhatsApp', exact: true }).click();
    await page
      .locator('[data-testid="client-cancel-cta"][data-cta="whatsapp"]')
      .click();
    await expect.poll(() => mock.opens.length).toBe(3);
    expect(
      mock.opens.map((url) => new URL(url).searchParams.get('text')),
    ).toEqual(
      enabled
        ? [
            'Meu atendimento em Negócio Exemplo.',
            'Dúvida de Cliente Exemplo.',
            'Cancelar, aqui é Cliente Exemplo.',
          ]
        : [null, null, null],
    );
    expect(mock.writes).toHaveLength(0);
  });
}

test('profissional não acessa a tela nem o item do menu', async ({ page }) => {
  await installMocks(page, 'barber', 'staff');
  await page.goto('/#/configuracoes/whatsapp');
  await expect(page).not.toHaveURL(/configuracoes\/whatsapp/);
  await page.goto('/#/configuracoes/servicos');
  await expect(
    page.getByRole('link', { name: 'Mensagens do WhatsApp' }),
  ).toHaveCount(0);
});

for (const enabled of [true, false]) {
  test(`aceitar pedido usa texto salvo e só pergunta se ativa=${enabled}`, async ({ page }) => {
    const mock = await installMocks(page, 'beauty', 'owner', true);
    mock.templates.push({ message_key: 'booking_accepted', enabled, body: 'Confirmado, {cliente}! Até breve em {estabelecimento}.' });
    await page.goto('/#/agenda');
    await page.getByRole('button', { name: 'Aceitar', exact: true }).click();
    if (enabled) {
      await page.getByRole('button', { name: 'Enviar no WhatsApp', exact: true }).click();
      await expect.poll(() => mock.opens.length).toBe(1);
      expect(new URL(mock.opens[0]).searchParams.get('text')).toBe('Confirmado, Cliente Exemplo! Até breve em Negócio Exemplo.');
    } else {
      await expect(page.getByRole('button', { name: 'Aceitar', exact: true })).toHaveCount(0);
      await expect(page.getByText('Deseja enviar a confirmação para o cliente via WhatsApp?')).toHaveCount(0);
      expect(mock.opens).toHaveLength(0);
    }
  });
}
