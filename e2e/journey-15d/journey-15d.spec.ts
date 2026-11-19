import { createServer, type Server } from 'node:http';
import { expect, test, type Page } from '@playwright/test';
import { freshState, mockBackend, EMAIL } from '../helpers/mockBackend';
import { JourneyLedger } from './helpers/journeyLedger';
import { agendaUrl, virtualDayIso, virtualDayTime } from './helpers/virtualCalendar';
import { installJourneyMocks, JOURNEY_SLUG } from './helpers/journeyMocks';
import { isolateNetwork, mockBaseUrl } from './helpers/journeySafety';

const BASE = mockBaseUrl();

async function loginMockOwner(page: Page) {
  await page.goto(`${BASE}/#/login`);
  await page.getByTestId('category-barber').click();
  await page.locator('#login-email').fill(EMAIL);
  await page.locator('#login-password').fill('Senha@Forte1');
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(`${BASE}/#/`, { timeout: 20_000 });
}

test('D1–D15 — cenários mock e smoke de superfícies', async ({ page, context }, testInfo) => {
  const safety = await isolateNetwork(context, BASE);
  const ledger = new JourneyLedger(testInfo.project.name);
  await context.addInitScript(() => {
    localStorage.setItem('agendix:marketing-consent:v1', JSON.stringify({ version: 1, choice: 'rejected', savedAt: Date.now() }));
    localStorage.setItem('agendix_color_mode', 'light');
  });

  const run = async (id: string, day: number, title: string, action: () => Promise<void>) => {
    await ledger.run(id, day, title, async () => {
      await page.clock.setFixedTime(virtualDayTime(day));
      await action();
      expect(await page.evaluate(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }))).toBe(virtualDayIso(day));
      safety.assertClean();
    });
  };

  try {
    const signup = freshState({ userType: 'barber' });
    await mockBackend(page, signup);
    await page.route('**/*', safety.guard);

    await run('D01-cadastro-wizard', 1, 'Cadastro mock abre wizard (não conclui onboarding)', async () => {
      await page.goto(`${BASE}/#/register`);
      await page.getByTestId('category-barber').click();
      await page.locator('#reg-name').fill('Rafael Journey');
      await page.getByLabel('Nome do negócio').fill('Barbearia Journey');
      await page.locator('#reg-email').fill(EMAIL);
      await page.getByLabel(/telefone|whatsapp/i).fill('11987654321');
      await page.getByLabel('Senha', { exact: true }).fill('Senha@Forte1');
      await page.getByLabel('Confirmar senha').fill('Senha@Forte1');
      await page.locator('form button[type="submit"]').click();
      await expect(page).toHaveURL(/#\/onboarding-wizard/, { timeout: 25_000 });
      expect(signup.ensureCalls).toBeGreaterThanOrEqual(1);
    });

    await run('D02-wizard-smoke', 2, 'Smoke: primeiro passo do wizard visível', async () => {
      await expect(page).toHaveURL(/onboarding-wizard/);
      await expect(page.getByRole('heading', { name: /Bem-vindo ao AgendiX Barber/i })).toBeVisible();
    });

    await page.evaluate(() => localStorage.clear());
    await page.unrouteAll({ behavior: 'wait' });
    const state = await installJourneyMocks(page);
    await page.route('**/*', safety.guard);

    await run('D03-link-publico-smoke', 3, 'Smoke: ajustes de agendamento', async () => {
      await loginMockOwner(page);
      await page.goto(`${BASE}/#/configuracoes/agendamento`);
      await expect(page.getByText(/Link de Agendamento|Agendamento online/i).first()).toBeVisible({ timeout: 20_000 });
    });

    await run('D04-agenda-data', 4, 'Agenda abre no dia civil virtual', async () => {
      await page.goto(agendaUrl(BASE, 4));
      await expect(page.getByRole('heading', { name: /^Agenda$/ })).toBeVisible();
      await expect(page).toHaveURL(agendaUrl(BASE, 4));
    });

    await run('D05-criar-atendimento', 5, 'Cria atendimento pela UI e persiste no mock', async () => {
      await page.goto(agendaUrl(BASE, 5));
      await page.locator('#btn-new-appointment').click();
      await page.getByTestId('agenda-choice-new-appointment').click();
      await page.getByRole('button', { name: /Buscar cliente/i }).click();
      await page.getByText('Cliente Journey', { exact: true }).click();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await page.getByText('Corte Masculino', { exact: true }).click();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await page.getByTestId('wizard-pro-list').getByRole('button', { name: /Ana Journey/ }).click();
      await page.getByRole('button', { name: '10:00', exact: true }).click();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await expect(page.getByRole('checkbox', { name: 'Enviar confirmação no WhatsApp' })).not.toBeChecked();
      await page.getByRole('button', { name: 'Confirmar Atendimento' }).click();
      await expect.poll(() => state.tables.appointments.length).toBe(1);
      expect(state.tables.appointments[0]).toMatchObject({ client_id: 'cli-1', price: 45, appointment_time: virtualDayTime(5, '10:00:00').toISOString() });
      await expect(page.getByRole('button', { name: 'Confirmar Atendimento' })).toHaveCount(0);
    });

    await run('D06-booking-smoke', 6, 'Smoke: catálogo público de serviços', async () => {
      await page.goto(`${BASE}/#/book/${JOURNEY_SLUG}`);
      await expect(page.getByRole('heading', { name: /Escolha seus serviços/i })).toBeVisible();
    });

    await run('D07-solicitacoes-online', 7, 'Painel renderiza solicitação online mockada', async () => {
      await page.goto(agendaUrl(BASE, 7));
      const panel = page.getByTestId('agenda-public-bookings');
      await expect(panel).toBeVisible();
      await panel.getByTestId('agenda-online-requests-toggle').click();
      await expect(panel.getByText('Pedido Journey', { exact: true })).toBeVisible();
      await expect(panel).toContainText('Hoje');
    });

    await run('D08-agenda-smoke', 8, 'Smoke: superfície da agenda (sem checkout)', async () => {
      await page.goto(agendaUrl(BASE, 8));
      await expect(page.getByRole('heading', { name: /^Agenda$/ })).toBeVisible();
      await expect(page.getByTestId('agenda-resource-grid')).toBeVisible();
      await expect(page).toHaveURL(agendaUrl(BASE, 8));
    });

    await run('D09-fila-publica-smoke', 9, 'Smoke: fila pública', async () => {
      await page.goto(`${BASE}/#/queue/${JOURNEY_SLUG}`);
      await expect(page.getByText(/Serviço|fila|Entrar na fila/i).first()).toBeVisible();
    });

    await run('D10-fila-smoke', 10, 'Smoke: painel de fila autenticado', async () => {
      await page.goto(`${BASE}/#/fila`);
      await expect(page.getByRole('heading', { name: /Fila Digital|Gestão da Fila/i })).toBeVisible();
    });

    await run('D11-financeiro-smoke', 11, 'Smoke: visão geral financeira', async () => {
      await page.goto(`${BASE}/#/financeiro`);
      await expect(page.getByRole('tab', { name: /Visão geral/i })).toBeVisible();
    });

    await run('D12-comissoes-smoke', 12, 'Smoke: aba de pagamentos de comissão', async () => {
      await page.goto(`${BASE}/#/financeiro?tab=commissions`);
      await expect(page.getByRole('heading', { name: 'Pagamento de comissão' })).toBeVisible();
    });

    await run('D13-relatorio-comissao', 13, 'Abre histórico e relatório de comissão mockada', async () => {
      const viewport = page.viewportSize();
      try {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`${BASE}/#/financeiro?tab=commissions`);
        await page.getByTestId('payout-nothing-due').getByRole('button', { name: /Histórico de pagamentos/i }).click();
        await expect(page.getByTestId('payment-history-card')).toBeVisible();
        await page.getByRole('button', { name: 'Ver relatório' }).click();
        await expect(page.getByTestId('report-mobile-list')).toBeVisible();
        await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).click();
      } finally {
        if (viewport) await page.setViewportSize(viewport);
      }
    });

    await run('D14-insights-smoke', 14, 'Smoke: análises do dono', async () => {
      await page.goto(`${BASE}/#/insights`);
      await expect(page.getByRole('heading', { name: 'Análises' })).toBeVisible();
    });

    await run('D15-navegacao-smoke', 15, 'Smoke: rotas de agenda e financeiro', async () => {
      await page.goto(agendaUrl(BASE, 15));
      await expect(page.getByRole('heading', { name: /^Agenda$/ })).toBeVisible();
      await page.goto(`${BASE}/#/financeiro`);
      await expect(page.getByRole('tab', { name: /Visão geral/i })).toBeVisible();
    });
  } finally {
    try {
      await context.close();
    } finally {
      ledger.flush();
      safety.assertClean();
    }
  }
});

test('isolamento bloqueia e denuncia REST, Auth, Functions e WebSocket externos', async ({ context, page }) => {
  const safety = await isolateNetwork(context, BASE);
  await mockBackend(page, freshState());
  await page.route('**/*', safety.guard);
  const urls = ['https://outside.invalid/rest/v1/clients', 'https://outside.invalid/auth/v1/token', 'https://outside.invalid/functions/v1/test'];
  await page.goto(`${BASE}/icons/favicon-32x32.png`);
  for (const url of urls) {
    expect(await page.evaluate(async (target) => {
      try { await fetch(target); return 'escape'; } catch { return 'blocked'; }
    }, url)).toBe('blocked');
  }
  await page.evaluate(() => new Promise<void>((resolve) => {
    const socket = new WebSocket('wss://outside.invalid/realtime/v1/websocket');
    socket.onclose = () => resolve();
  }));
  expect(() => safety.assertClean()).toThrow(/outside\.invalid\/rest\/v1\/clients/);
  expect(() => safety.assertClean()).toThrow(/outside\.invalid\/auth\/v1\/token/);
  expect(() => safety.assertClean()).toThrow(/outside\.invalid\/functions\/v1\/test/);
  expect(() => safety.assertClean()).toThrow(/wss:\/\/outside\.invalid/);
});

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Servidor local sem porta');
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

test('redirect local não envia requisição para origem fora da base', async ({ browser }) => {
  let escaped = 0;
  const target = createServer((_request, response) => { escaped++; response.end('escape'); });
  const targetUrl = await listen(target);
  const source = createServer((request, response) => {
    if (request.url === '/') response.end('<!doctype html><title>isolado</title>');
    else {
      response.writeHead(302, { Location: `${targetUrl}/blocked` });
      response.end();
    }
  });
  const sourceUrl = await listen(source);
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    const safety = await isolateNetwork(context, sourceUrl);
    const page = await context.newPage();
    await page.goto(sourceUrl);
    expect(await page.evaluate(async () => {
      try { await fetch('/redirect'); return 'escape'; } catch { return 'blocked'; }
    })).toBe('blocked');
    expect(() => safety.assertClean()).toThrow(`${targetUrl}/blocked`);
    expect(escaped).toBe(0);
  } finally {
    await context.close();
    await closeServer(source);
    await closeServer(target);
  }
});
