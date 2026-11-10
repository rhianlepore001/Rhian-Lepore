import { expect, test, type Page } from '@playwright/test';
import { installMocks } from './whatsapp-mocks';

test.skip(process.env.AGENDIX_WHATSAPP_E2E !== '1', 'Use e2e/whatsapp-ios.config.ts.');

type OpenCall = { url: string; inGesture: boolean };

/**
 * Regra do Safari do iOS: nova aba só se window.open rodar DENTRO do toque.
 * Marcamos "em gesto" durante o despacho do toque/clique e desmarcamos na
 * próxima tarefa; um window.open depois de await de rede fica fora do gesto.
 * `blockPopups` imita o Safari bloqueando (window.open devolve null).
 */
async function instrument(page: Page, { standalone = false, blockPopups = false } = {}) {
  await page.addInitScript(({ standalone, blockPopups }) => {
    const w = window as unknown as { __opens: OpenCall[] };
    w.__opens = [];
    let inGesture = false;
    for (const type of ['touchend', 'pointerup', 'click', 'keydown']) {
      window.addEventListener(type, (event) => {
        if (!event.isTrusted) return;
        inGesture = true;
        setTimeout(() => { inGesture = false; }, 0);
      }, true);
    }
    const original = window.open.bind(window);
    window.open = (url?: string | URL, ...rest: unknown[]) => {
      w.__opens.push({ url: String(url), inGesture });
      if (blockPopups) return null;
      return original(url, ...(rest as [string?, string?]));
    };
    if (standalone) {
      Object.defineProperty(window.navigator, 'standalone', { configurable: true, get: () => true });
      const mm = window.matchMedia.bind(window);
      window.matchMedia = (q: string) => (q.includes('display-mode: standalone')
        ? ({ matches: true, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false } as MediaQueryList)
        : mm(q));
    }
  }, { standalone, blockPopups });
}
const opens = (page: Page) => page.evaluate(() => (window as unknown as { __opens: OpenCall[] }).__opens);

async function wizardToConfirm(page: Page) {
  await page.goto('/#/agenda');
  await page.getByRole('button', { name: /Novo Agendamento/i }).first().tap();
  const choice = page.getByRole('button', { name: /Novo atendimento/ });
  if (await choice.isVisible().catch(() => false)) await choice.tap();
  await page.getByRole('button', { name: /Buscar cliente/i }).tap();
  await page.getByText('Cliente Exemplo', { exact: true }).first().tap();
  await page.getByRole('button', { name: 'Continuar', exact: true }).tap();
  await page.getByText('Atendimento Exemplo', { exact: true }).first().tap();
  await page.getByRole('button', { name: 'Continuar', exact: true }).tap();
  const next = page.getByRole('button', { name: 'Continuar', exact: true });
  if (await next.isDisabled()) {
    const pro = page.getByTestId('wizard-pro-list').getByRole('button').first();
    if (await pro.isVisible().catch(() => false)) await pro.tap();
    if (await next.isDisabled()) await page.locator('button.font-mono:not([disabled])').first().tap();
  }
  await next.tap();
  await expect(page.getByRole('button', { name: 'Confirmar Atendimento' })).toBeVisible();
}

test('Safari iPhone: Novo Atendimento (salva com rede lenta) abre o WhatsApp pelo toque', async ({ page }) => {
  await instrument(page);
  const mock = await installMocks(page, 'barber', 'owner', false, { agenda: true, stubOpen: false, createDelayMs: 1500 });
  mock.templates.push({ message_key: 'wizard_confirm', enabled: true, body: 'Oi {cliente}! {data} às {hora} ✂️\nEndereço & mapa: {estabelecimento}' });
  await wizardToConfirm(page);
  await page.locator('label[for="review-whatsapp-toggle"]').tap();
  await page.getByRole('button', { name: 'Confirmar Atendimento' }).tap();
  await expect.poll(() => mock.created.length, { timeout: 10_000 }).toBe(1);
  const link = page.getByRole('link', { name: /Abrir WhatsApp/ });
  // Espera o fim do salvamento: ou aparece o botão, ou o app tenta abrir sozinho.
  await expect.poll(async () => (await opens(page)).length + (await link.count()), { timeout: 10_000 }).toBeGreaterThan(0);
  // Antes da correção: window.open rodava ~1,5 s depois do toque (fora do gesto) → bloqueado no iPhone.
  expect((await opens(page)).filter((call) => !call.inGesture), 'window.open fora do toque (Safari bloqueia)').toEqual([]);
  await expect(link).toBeVisible();
  const [popup] = await Promise.all([page.waitForEvent('popup'), link.tap()]);
  await popup.waitForURL(/^https:\/\/wa\.me\//);
  const url = new URL(popup.url());
  expect(url.pathname).toBe('/5511900000001');
  expect(url.searchParams.get('text')).toMatch(/^Oi Cliente Exemplo! \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2} ✂️\nEndereço & mapa: Negócio Exemplo$/);
});

test('Safari iPhone: aceitar pedido → "Enviar no WhatsApp" abre dentro do toque', async ({ page }) => {
  await instrument(page);
  const mock = await installMocks(page, 'beauty', 'owner', true, { stubOpen: false });
  mock.templates.push({ message_key: 'booking_accepted', enabled: true, body: 'Confirmado, {cliente}!' });
  await page.goto('/#/agenda');
  await page.getByRole('button', { name: 'Aceitar', exact: true }).tap();
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Enviar no WhatsApp', exact: true }).tap(),
  ]);
  await popup.waitForURL(/^https:\/\/wa\.me\//);
  expect(new URL(popup.url()).searchParams.get('text')).toBe('Confirmado, Cliente Exemplo!');
  const calls = await opens(page);
  expect(calls).toHaveLength(1);
  expect(calls[0].inGesture).toBe(true);
});

test('Safari iPhone: Minha Área do cliente abre o WhatsApp dentro do toque', async ({ page }) => {
  await instrument(page);
  await installMocks(page, 'beauty', 'owner', false, { stubOpen: false });
  await page.goto('/#/minha-area/negocio-exemplo');
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'WhatsApp', exact: true }).tap(),
  ]);
  await popup.waitForURL(/^https:\/\/wa\.me\//);
  const calls = await opens(page);
  expect(calls.length).toBeGreaterThan(0);
  expect(calls.every((call) => call.inGesture)).toBe(true);
});

test('App na tela inicial (standalone) com nova aba bloqueada: cai para a própria aba no wa.me', async ({ page }) => {
  await instrument(page, { standalone: true, blockPopups: true });
  const mock = await installMocks(page, 'barber', 'owner', true, { stubOpen: false });
  mock.templates.push({ message_key: 'booking_accepted', enabled: true, body: 'Confirmado, {cliente}!' });
  await page.goto('/#/agenda');
  await page.getByRole('button', { name: 'Aceitar', exact: true }).tap();
  await page.getByRole('button', { name: 'Enviar no WhatsApp', exact: true }).tap();
  await page.waitForURL(/^https:\/\/wa\.me\//);
  expect(new URL(page.url()).searchParams.get('text')).toBe('Confirmado, Cliente Exemplo!');
});

test('App na tela inicial (standalone): "Abrir WhatsApp" depois de salvar é link real (não depende de window.open)', async ({ page }) => {
  await instrument(page, { standalone: true, blockPopups: true });
  const mock = await installMocks(page, 'beauty', 'owner', false, { agenda: true, stubOpen: false, createDelayMs: 1500 });
  await wizardToConfirm(page);
  await page.locator('label[for="review-whatsapp-toggle"]').tap();
  await page.getByRole('button', { name: 'Confirmar Atendimento' }).tap();
  await expect.poll(() => mock.created.length, { timeout: 10_000 }).toBe(1);
  const link = page.getByRole('link', { name: /Abrir WhatsApp/ });
  await expect(link).toHaveAttribute('href', /^https:\/\/wa\.me\/5511900000001\?text=/);
  const [popup] = await Promise.all([page.waitForEvent('popup'), link.tap()]);
  await popup.waitForURL(/^https:\/\/wa\.me\//);
  expect(await opens(page)).toEqual([]);
});
