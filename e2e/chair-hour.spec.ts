import { expect, test } from '@playwright/test';

for (const theme of ['barber', 'beauty']) for (const mode of ['dark', 'light']) for (const width of [320, 390]) {
  test(`${theme} ${mode} ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route('**/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: `export function useAuth() { return { role: 'owner', userType: '${theme}', teamMemberId: null }; }` }));
    await page.route('**/hooks/useTenantLocale.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `export function useTenantLocale() { return { formatMoney: n => 'R$ ' + n.toFixed(2) }; }` }));
    await page.route('**/hooks/useChairHour.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `const item = { id:'1',name:'Ana Profissional',available_minutes:600,worked_minutes:300,estimated_count:1,revenue_per_worked_hour:100,revenue_per_available_hour:50,occupancy:0.5,cost_per_hour:25,margin_per_hour:75,idle_cost:125 }; export function useChairHour() { return { data: { professionals:[item],total:item,services:[{name:'Corte',status:'loss'},{name:'Barba',status:'low'}] }, status:'ready', retry() {} }; }` }));
    await page.goto(`/e2e/chair-hour-harness/?theme=${theme}&mode=${mode}`);
    await expect(page.getByRole('heading', { name: new RegExp(theme === 'beauty' ? 'hora de atendimento' : 'hora de cadeira') })).toBeVisible();
    await expect(page.getByText('Corte · Dá prejuízo')).toBeVisible();
    await expect(page.getByText('Barba · Rende pouco')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: `test-results/chair-hour-${theme}-${mode}-${width}.png`, fullPage: true });
  });
}
