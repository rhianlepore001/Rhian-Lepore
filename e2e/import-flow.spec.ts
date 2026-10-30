import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  await page.goto('/e2e/import-harness/');
});

test('revisa, importa e desfaz clientes em um arquivo fictício Trinks no celular', async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 });
  await page.getByRole('button', { name:'Trinks' }).click();
  await page.getByLabel('Escolher arquivos').setInputFiles({ name:'trinks-clientes.csv', mimeType:'text/csv', buffer:Buffer.from('Nome;Celular;E-mail\nAna Fictícia;11987654321;ana@example.test') });
  await page.getByRole('button', { name:'Analisar arquivos' }).click();
  await page.getByRole('button', { name:'Preparar revisão' }).click();
  await expect(page.getByText(/1 registro pronto/)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { importTestCount: () => number }).importTestCount())).toBe(0);
  await page.getByRole('button', { name:'Confirmar importação' }).click();
  await expect(page.getByText(/1 importado/)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { importTestCount: () => number }).importTestCount())).toBe(1);
  await page.getByRole('button', { name:'Desfazer esta importação' }).click();
  await page.getByRole('button', { name:'Confirmar desfazer' }).click();
  await expect(page.getByRole('status')).toContainText('1 removido');
  expect(await page.evaluate(() => (window as unknown as { importTestCount: () => number }).importTestCount())).toBe(0);
});

test('revisa e importa serviços em um arquivo fictício Fresha', async ({ page }) => {
  await page.getByRole('button', { name:'Fresha' }).click();
  await page.getByLabel('Escolher arquivos').setInputFiles({ name:'fresha-servicos.csv', mimeType:'text/csv', buffer:Buffer.from('Service name,Price,Duration\nServiço Fictício,85.50,90') });
  await page.getByRole('button', { name:'Analisar arquivos' }).click();
  await expect(page.getByLabel('Tipo de dados')).toHaveValue('service');
  await page.getByRole('button', { name:'Preparar revisão' }).click();
  await expect(page.getByText(/1 registro pronto/)).toBeVisible();
  await page.getByRole('button', { name:'Confirmar importação' }).click();
  await expect(page.getByText(/1 importado/)).toBeVisible();
});


test('pede decisão para telefone existente antes de vincular', async ({ page }) => {
  await page.getByRole('button', { name:'Trinks' }).click();
  await page.getByLabel('Escolher arquivos').setInputFiles({ name:'trinks-duplicado.csv', mimeType:'text/csv', buffer:Buffer.from('Nome;Celular\nNome Diferente Fictício;11999998888') });
  await page.getByRole('button', { name:'Analisar arquivos' }).click();
  await page.getByRole('button', { name:'Preparar revisão' }).click();
  await expect(page.getByText(/1 precisam de atenção/)).toBeVisible();
  await page.getByRole('button', { name:'Confirmar importação' }).click();
  await expect(page.getByText(/1 pendente/)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { importTestCount: () => number }).importTestCount())).toBe(0);
  await page.getByRole('button', { name:'Revisar pendências' }).click();
  await page.getByLabel('Como continuar?').selectOption('link:existente-ficticio');
  await page.getByRole('button', { name:'Salvar escolha' }).click();
  await page.getByRole('button', { name:'Confirmar importação' }).click();
  await expect(page.getByText(/1 ignorado/)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { importTestCount: () => number }).importTestCount())).toBe(0);
});
