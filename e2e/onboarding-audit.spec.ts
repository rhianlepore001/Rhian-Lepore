import { test, expect, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { mockBackend, freshState, noProdTraffic, EMAIL, type MockState } from './helpers/mockBackend';

const OUT = process.env.AUDIT_OUT ?? '/workspace/onboarding-audit';
const THEMES = ['barber', 'beauty'] as const;

type Finding = { project: string; theme: string; step: string; problem: string; screenshot: string };
const findings: Finding[] = [];

async function instrument(page: Page) {
  const log = { console: [] as string[], pageErrors: [] as string[], replaceState: 0 };
  await page.addInitScript(() => {
    const w = window as any;
    w.__replaceCount = 0;
    const orig = history.replaceState.bind(history);
    history.replaceState = (...a: Parameters<typeof history.replaceState>) => { w.__replaceCount++; return orig(...a); };
  });
  page.on('console', (m) => { if (m.type() === 'error') log.console.push(m.text()); });
  page.on('pageerror', (e) => log.pageErrors.push(e.message));
  return log;
}

async function shot(page: Page, project: string, theme: string, name: string) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = `${OUT}/${project}__${theme}__${name}.png`;
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function check(page: Page, project: string, theme: string, step: string, log: ReturnType<typeof instrument> extends Promise<infer R> ? R : never) {
  const file = await shot(page, project, theme, step.replace(/[^a-z0-9]+/gi, '-'));
  const problems: string[] = [];
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) problems.push(`rolagem horizontal indevida (${overflow}px a mais que a tela)`);
  const crashed = await page.getByText(/Sistema Interrompido|Algo deu errado/i).count();
  if (crashed) problems.push('tela de erro do sistema apareceu');
  const replaces = await page.evaluate(() => (window as any).__replaceCount as number);
  if (replaces > 20) problems.push(`history.replaceState chamado ${replaces}x (risco do erro do Safari)`);
  const small = await page.evaluate(() => Array.from(document.querySelectorAll('button, a[href], input, [role=button]'))
    .filter((el) => { const r = (el as HTMLElement).getBoundingClientRect(); const vis = r.width > 0 && r.height > 0; return vis && (r.height < 36 || r.width < 36) && (el as HTMLElement).offsetParent !== null; })
    .map((el) => `${el.tagName.toLowerCase()}:${(el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('placeholder') || '').trim().slice(0, 24)}`).slice(0, 6));
  if (small.length && page.viewportSize()!.width < 500) problems.push(`alvos de toque pequenos (<36px): ${small.join(' | ')}`);
  for (const p of problems) findings.push({ project, theme, step, problem: p, screenshot: file });
  return problems;
}

test.afterAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
  const f = `${OUT}/findings-${test.info().project.name}.json`;
  fs.writeFileSync(f, JSON.stringify(findings, null, 2));
});

for (const theme of THEMES) {
  test(`cadastro -> onboarding completo -> primeiro acesso (${theme})`, async ({ page }, info) => {
    const project = info.project.name;
    const state: MockState = freshState({ userType: theme });
    await mockBackend(page, state);
    const log = await instrument(page);

    await page.goto('/#/register');
    await page.getByTestId(`category-${theme}`).click();
    await check(page, project, theme, '01-cadastro-vazio', log);

    await page.locator('#reg-name').fill('Rafael Teste');
    await page.getByLabel('Nome do negócio').fill('Oliveira Cortes');
    await page.locator('#reg-email').fill(EMAIL);
    const phone = page.getByLabel(/whatsapp/i).first();
    if (await phone.count()) await phone.fill('11999999999');
    await page.getByLabel('Senha', { exact: true }).fill('Senha@Forte1');
    await page.getByLabel('Confirmar senha').fill('Senha@Forte1');
    const terms = page.getByRole('checkbox');
    if (await terms.count()) await terms.first().check();
    await check(page, project, theme, '02-cadastro-preenchido', log);
    // O aviso de cookies cobre o botão "Finalizar cadastro"? (hit-test no centro do botão, já rolado até ele)
    const submit = page.locator('form button[type="submit"]');
    await submit.scrollIntoViewIfNeeded();
    const covered = await submit.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !(top && (top === el || el.contains(top)));
    });
    if (covered) {
      const f = await shot(page, project, theme, '02b-botao-finalizar-coberto-pelo-aviso-de-cookies');
      findings.push({ project, theme, step: '02b-cadastro-botao-coberto', problem: 'o aviso de cookies fica por cima do botão "Finalizar cadastro" (e de parte do formulário) até a pessoa aceitar ou recusar', screenshot: f });
    }
    const banner = page.getByRole('button', { name: 'Recusar' });
    if (await banner.count()) await banner.first().click();
    await submit.scrollIntoViewIfNeeded();
    await submit.click();

    await expect(page).toHaveURL(/onboarding-wizard/, { timeout: 20000 });
    await page.waitForTimeout(800);
    await check(page, project, theme, '03-onboarding-passo1-boas-vindas', log);
    expect(state.directProfileInserts).toBe(0);

    // Passo 1 -> Serviços
    await page.getByRole('button', { name: /Começar configuração/ }).click();
    await expect(page.locator('#wizard-add-service')).toBeVisible();
    await check(page, project, theme, '04-onboarding-passo2-servicos-vazio', log);
    await page.locator('#wizard-add-service').click();
    await page.locator('#service-name').waitFor();
    await check(page, project, theme, '05-onboarding-passo2-modal-servico', log);
    await page.locator('#service-name').fill('Corte Teste');
    await page.locator('#service-price').fill('40');
    const cat = page.locator('#service-category');
    if (await cat.count()) { const opts = await cat.locator('option').allInnerTexts(); if (opts.length > 1) await cat.selectOption({ index: 1 }); }
    await page.getByRole('button', { name: 'Salvar Serviço' }).click();
    await expect(page.getByText('Corte Teste')).toBeVisible({ timeout: 10000 });
    await check(page, project, theme, '06-onboarding-passo2-servico-salvo', log);
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Passo 3 Equipe
    await expect(page.locator('#wizard-add-team')).toBeVisible();
    await check(page, project, theme, '07-onboarding-passo3-equipe-vazio', log);
    await page.locator('#wizard-add-team').click();
    await page.locator('#team-member-name').waitFor();
    await check(page, project, theme, '08-onboarding-passo3-modal-equipe', log);
    if (!(await page.locator('#team-member-name').inputValue())) await page.locator('#team-member-name').fill('Rafael Teste');
    const role = page.locator('#team-member-role');
    if (await role.count() && !(await role.inputValue())) await role.fill('Profissional');
    await page.locator('form button[type="submit"]').last().click();
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeEnabled({ timeout: 10000 });
    await check(page, project, theme, '09-onboarding-passo3-equipe-salva', log);
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Passo 4 Horários
    await page.waitForTimeout(600);
    await check(page, project, theme, '10-onboarding-passo4-horarios', log);
    await page.getByRole('button', { name: /Continuar|Salvar|Próximo/ }).last().click();

    // Passo 5 Meta
    await page.waitForTimeout(800);
    await check(page, project, theme, '11-onboarding-passo5-meta', log);
    await page.locator('input[type="number"]').fill('5000');
    await page.getByRole('button', { name: /Definir Meta/ }).click();

    // Tudo pronto
    await page.waitForTimeout(800);
    await check(page, project, theme, '12-onboarding-tudo-pronto', log);
    await page.getByRole('button', { name: /Dashboard/ }).click();

    // Primeiro acesso
    await expect(page).not.toHaveURL(/onboarding-wizard/, { timeout: 15000 });
    await page.waitForTimeout(1500);
    await check(page, project, theme, '13-primeiro-acesso-dashboard', log);

    expect(state.progress?.is_completed, 'onboarding_progress.is_completed gravado').toBe(true);
    expect(state.profile?.tutorial_completed, 'profiles.tutorial_completed gravado').toBe(true);
    expect(state.businessSettings?.onboarding_completed, 'business_settings.onboarding_completed gravado').toBe(true);
    expect(state.tables.services.length).toBeGreaterThan(0);
    expect(noProdTraffic(state)).toEqual([]);
    expect(log.pageErrors).toEqual([]);
  });
}
