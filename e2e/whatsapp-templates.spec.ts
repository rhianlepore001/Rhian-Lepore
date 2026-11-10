import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installMocks } from './whatsapp-mocks';

test.skip(process.env.AGENDIX_WHATSAPP_E2E !== '1', 'Use e2e/whatsapp-templates.config.ts para executar esta suíte isolada.');

const SHOTS =
  process.env.SHOT_DIR ??
  path.join(process.cwd(), 'docs/whatsapp-messages/screenshots');
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

/** Cliente → serviço → horário → Confirmar, no Novo Atendimento da Agenda. */
async function wizardToConfirm(page: import('@playwright/test').Page) {
  await page.goto('/#/agenda');
  await page.getByRole('button', { name: /Novo Agendamento/i }).first().click();
  const choice = page.getByRole('button', { name: /Novo atendimento/ });
  if (await choice.isVisible().catch(() => false)) await choice.click();
  await page.getByRole('button', { name: /Buscar cliente/i }).click();
  await page.getByText('Cliente Exemplo', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByText('Atendimento Exemplo', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  const next = page.getByRole('button', { name: 'Continuar', exact: true });
  if (await next.isDisabled()) {
    const pro = page.getByTestId('wizard-pro-list').getByRole('button').first();
    if (await pro.isVisible().catch(() => false)) await pro.click();
    if (await next.isDisabled()) await page.locator('button.font-mono:not([disabled])').first().click();
  }
  await next.click();
  await expect(page.getByRole('button', { name: 'Confirmar Atendimento' })).toBeVisible();
}

for (const theme of ['barber', 'beauty'] as const) {
  test(`${theme}: Novo agendamento personalizado em Ajustes chega ao wa.me com as variáveis`, async ({ page }) => {
    const mock = await installMocks(page, theme, 'owner', false, { agenda: true });
    await page.goto('/#/configuracoes/whatsapp');
    await page.getByRole('button', { name: 'Editar Novo agendamento' }).click();
    await page.getByLabel('Texto da mensagem').fill('Oi {cliente}! {data} às {hora} em {estabelecimento}. Até já!');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect.poll(() => mock.writes.length).toBe(1);
    expect(mock.writes[0]).toMatchObject({ message_key: 'wizard_confirm', body: 'Oi {cliente}! {data} às {hora} em {estabelecimento}. Até já!' });

    await wizardToConfirm(page);
    const toggle = page.getByRole('checkbox', { name: 'Enviar confirmação no WhatsApp' });
    await expect(toggle).not.toBeChecked();
    await page.locator('label[for="review-whatsapp-toggle"]').click();
    await expect(toggle).toBeChecked();
    await page.getByRole('button', { name: 'Confirmar Atendimento' }).click();
    await expect.poll(() => mock.created.length).toBe(1);
    const open = page.getByRole('link', { name: /Abrir WhatsApp/ });
    await expect(open).toBeVisible();
    const href = new URL((await open.getAttribute('href'))!);
    expect(href.host).toBe('wa.me');
    expect(href.pathname).toBe('/5511900000001');
    expect(href.searchParams.get('text')).toMatch(/^Oi Cliente Exemplo! \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2} em Negócio Exemplo\. Até já!$/);
    const [popup] = await Promise.all([page.waitForEvent('popup'), open.click()]);
    await popup.waitForURL(/^https:\/\/wa\.me\//);
    expect(new URL(popup.url()).searchParams.get('text')).toBe(href.searchParams.get('text'));
    await expect(open).toHaveCount(0);
    // Nenhum window.open escondido: só o toque no link.
    expect(mock.opens).toHaveLength(0);
  });
}

test('"Personalizar mensagem" no passo Confirmar edita sem perder o atendimento', async ({ page }) => {
  const mock = await installMocks(page, 'barber', 'owner', false, { agenda: true });
  await wizardToConfirm(page);
  await page.getByRole('button', { name: 'Personalizar mensagem' }).click();
  const editor = page.getByRole('dialog', { name: 'Novo agendamento' });
  await editor.getByLabel('Texto da mensagem').fill('Combinado, {cliente}: {data} {hora}.');
  await editor.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Confirmar Atendimento' })).toBeVisible();
  await expect(page.getByText('Cliente Exemplo').first()).toBeVisible();
  await page.locator('label[for="review-whatsapp-toggle"]').click();
  await page.getByRole('button', { name: 'Confirmar Atendimento' }).click();
  const href = new URL((await page.getByRole('link', { name: /Abrir WhatsApp/ }).getAttribute('href'))!);
  expect(href.searchParams.get('text')).toMatch(/^Combinado, Cliente Exemplo: \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}\.$/);
  expect(mock.writes[0]).toMatchObject({ message_key: 'wizard_confirm', enabled: true });
});
