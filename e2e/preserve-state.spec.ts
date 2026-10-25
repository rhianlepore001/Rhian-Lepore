import { expect, test, type Page } from '@playwright/test';
import { authAction, draftKeys, flushDrafts, installPreserveStateMocks } from './helpers/preserveStateMocks';

test.use({ locale: 'pt-BR', timezoneId: 'Europe/Lisbon' });

async function openWizard(page: Page) {
  await page.goto(`/#/agenda?date=2026-08-24`);
  await page.getByRole('button', { name: 'Novo Agendamento', exact: true }).click();
  const choice = page.getByTestId('agenda-choice-new-appointment');
  if (await choice.isVisible()) await choice.click();
  await expect(page.getByRole('heading', { name: 'Escolha o cliente' })).toBeVisible();
}

async function fillNewClient(page: Page) {
  await page.getByRole('button', { name: 'Cadastrar Novo Cliente' }).click();
  await page.getByPlaceholder('Ex: Maria Silva').fill('Cliente Fictícia Draft');
  await page.locator('input[type=tel]').fill('912345678');
}

async function reviewWizard(page: Page) {
  await page.getByText('Buscar cliente por nome ou telefone...', { exact: false }).click();
  await page.getByText('Aline Lima', { exact: true }).last().click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByText('Corte Masculino', { exact: true }).last().click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByTestId('wizard-pro-list').getByRole('button', { name: /Bob/ }).click();
  await page.getByRole('button', { name: '14:00', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Confira o atendimento' })).toBeVisible();
  await page.locator('textarea').fill('Observação fictícia persistente');
  await page.getByLabel('Preço final', { exact: true }).fill('72.50');
  await page.getByLabel('Desconto (%)', { exact: true }).fill('10');
}

for (const width of [390, 1440]) {
  test(`preserves wizard through visibility, tabs, token refresh and reload (${width}px)`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    const mocks = await installPreserveStateMocks(page);
    await openWizard(page);
    await fillNewClient(page);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const second = await context.newPage();
    await second.goto('about:blank');
    await page.bringToFront();
    await second.close();
    await authAction(page, 'refreshSession');
    await expect(page.getByPlaceholder('Ex: Maria Silva')).toHaveValue('Cliente Fictícia Draft');
    await expect(page.getByText('Carregando agenda...', { exact: true })).toHaveCount(0);
    await flushDrafts(page);
    await page.reload();
    await expect(page.getByPlaceholder('Ex: Maria Silva')).toHaveValue('Cliente Fictícia Draft');
    await expect(page.getByText('Rascunho restaurado', { exact: true }).first()).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar', exact: true }).first().click();
    await expect.poll(() => draftKeys(page)).toEqual([]);
    mocks.assertNoLeak();
  });
}

test('restores all appointment review fields and clears drafts after save', async ({ page }) => {
  const mocks = await installPreserveStateMocks(page);
  await openWizard(page);
  await reviewWizard(page);
  await flushDrafts(page);
  await page.reload();
  await expect(page.locator('textarea')).toHaveValue('Observação fictícia persistente');
  await expect(page.getByLabel('Preço final', { exact: true })).toHaveValue('72.50');
  await expect(page.getByLabel('Desconto (%)', { exact: true })).toHaveValue('10');
  await expect(page.getByRole('heading', { name: 'Confira o atendimento' })).toBeVisible();
  const whatsapp = page.getByRole('checkbox', { name: 'Enviar confirmação no WhatsApp' });
  if (await whatsapp.isChecked()) await whatsapp.uncheck({ force: true });
  await page.getByRole('button', { name: 'Confirmar Atendimento', exact: true }).click();
  await expect.poll(() => draftKeys(page)).toEqual([]);
  mocks.assertNoLeak();
});

test('new client reopens with draft after reload; discard and logout clear storage', async ({ page }) => {
  const mocks = await installPreserveStateMocks(page);
  await page.goto('/#/clientes');
  await page.getByRole('button', { name: 'Adicionar cliente', exact: true }).click();
  await page.getByLabel('Nome completo', { exact: false }).fill('Cliente Fictícia CRM');
  await flushDrafts(page);
  await page.reload();
  await expect(page.getByLabel('Nome completo', { exact: false })).toHaveValue('Cliente Fictícia CRM');
  await expect(page.getByText('Rascunho restaurado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Descartar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => draftKeys(page)).toEqual([]);
  await page.getByRole('button', { name: 'Adicionar cliente', exact: true }).click();
  await page.getByLabel('Nome completo', { exact: false }).fill('Outro Cliente Fictício');
  await flushDrafts(page);
  expect((await draftKeys(page)).length).toBeGreaterThan(0);
  await authAction(page, 'signOut');
  await expect.poll(() => draftKeys(page)).toEqual([]);
  mocks.assertNoLeak();
});
