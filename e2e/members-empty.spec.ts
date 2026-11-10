import { expect, test } from '@playwright/test';
import { installMocks } from './whatsapp-mocks';

const SHOTS = process.env.CONSENT_SHOTS_DIR;

for (const theme of ['barber', 'beauty'] as const) {
  test(`${theme}: Clube > Assinantes vazio sem espaço antes do ponto`, async ({ page }, info) => {
    await installMocks(page, theme, 'owner');
    await page.goto('/#/clube/assinantes');
    const title = page.getByText(/^Nenhum assinante/);
    await expect(title).toBeVisible();
    await title.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${info.project.name}-${theme}-assinantes-vazio.png` });
    const text = (await title.innerText()).trim();
    expect(text).not.toMatch(/\s[.,!?]/);
  });
}
