import { expect, test, type Page } from '@playwright/test';

const dir = '/opt/cursor/artifacts/hourly-results-v2';

const metricsData = `const item = { id:'1',name:'Ana',available_minutes:600,worked_minutes:300,estimated_count:1,revenue_per_worked_hour:100,revenue_per_available_hour:50,occupancy:0.5,cost_per_hour:25,margin_per_hour:25,idle_cost:125 };
export function useChairHour() {
  return { data: { month:'2026-11-01', role:'owner', total: item, professionals:[item], services:[{name:'Corte',status:'loss'}] }, status:'ready', retry() {} };
}`;

const metricsEmpty = `const empty = { id:'',available_minutes:null,worked_minutes:null,estimated_count:null,revenue_per_worked_hour:null,revenue_per_available_hour:null,occupancy:null,cost_per_hour:null,margin_per_hour:null,idle_cost:null };
export function useChairHour() {
  return { data: { month:'2026-11-01', role:'owner', total: empty, professionals:[] }, status:'ready', retry() {} };
}`;

async function stubCore(page: Page, theme: string) {
  await page.route('**/services/fixedCosts.ts*', route =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export const fixedCostsApi = { list: async () => ({ costs: [], services: [{ id:'s1', name:'Corte' }], materials: [], professionals: [{ id:'p1', name:'Ana', working_hours: null }], lowMargin: 20, lowMarginSaved: false }) };`,
    }),
  );
  await page.route('**/contexts/AuthContext.tsx*', route =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export function useAuth() { return { role:'owner', userType:'${theme}', region:'BR', companyId:'fixture-company', teamMemberId:null, user:{ id:'fixture-user' } }; }`,
    }),
  );
  await page.route('**/hooks/useTenantLocale.ts*', route =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export function useTenantLocale() { return { formatMoney: n => 'R$ ' + n.toFixed(2).replace('.', ',') }; }`,
    }),
  );
  await page.route('**/hooks/useBusinessCopy.ts*', route =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export function useBusinessCopy() { return { chairHour: '${theme === 'beauty' ? 'hora de atendimento' : 'hora de cadeira'}' }; }`,
    }),
  );
}

const cases: {
  theme: string;
  mode: string;
  width: number;
  height: number;
  state: 'empty' | 'configuring' | 'data';
  screen: string;
  chairHour: string | null;
  shot: string;
}[] = [];

for (const [theme, mode] of [
  ['barber', 'dark'],
  ['beauty', 'light'],
] as const) {
  for (const [width, height] of [
    [390, 844],
    [1440, 900],
  ] as const) {
    for (const state of ['empty', 'configuring', 'data'] as const) {
      cases.push({
        theme,
        mode,
        width,
        height,
        state,
        screen: state === 'configuring' ? 'settings-configuring' : state === 'data' ? 'results-data' : 'results-empty',
        chairHour: state === 'configuring' ? null : state === 'data' ? metricsData : metricsEmpty,
        shot: `${state}-${theme}-${mode}-${width}`,
      });
    }
  }
}

for (const c of cases) {
  test(`${c.shot}`, async ({ page }) => {
    await page.setViewportSize({ width: c.width, height: c.height });
    await stubCore(page, c.theme);
    if (c.chairHour) {
      await page.route('**/hooks/useChairHour.ts*', route => route.fulfill({ contentType: 'application/javascript', body: c.chairHour! }));
    }
    await page.goto(`/e2e/chair-hour-harness/?theme=${c.theme}&mode=${c.mode}&screen=${c.screen}`);
    if (c.state === 'empty') {
      await expect(page.getByRole('heading', { name: 'Resultados por hora', level: 1 })).toBeVisible();
      await expect(page.getByText(/Não é o caixa do dia/i)).toBeVisible();
      await expect(page.getByRole('link', { name: /Voltar à performance da equipe/i })).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/R\$\s*0[,.]00/);
    } else if (c.state === 'data') {
      await expect(page.getByRole('heading', { name: 'Resultados por hora', level: 1 })).toBeVisible();
      await expect(page.getByText(/Cada hora aberta rendeu/i)).toBeVisible();
      await expect(page.getByRole('link', { name: /Voltar à performance da equipe/i })).toBeVisible();
    } else {
      await expect(page.getByText(/\d+ de 4 configurados/)).toBeVisible();
      await expect(page.getByRole('heading', { name: /Contas do mês/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Horários da equipe/i })).toBeVisible();
    }
    if (c.width === 390) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      expect(
        await page.evaluate(() =>
          [...document.querySelectorAll('button, a, summary')].every(el => {
            const r = el.getBoundingClientRect();
            return r.width === 0 || (r.width >= 44 && r.height >= 44);
          }),
        ),
      ).toBe(true);
    }
    await page.screenshot({ path: `${dir}/${c.shot}.png`, fullPage: true });
  });
}