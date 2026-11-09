import { expect, test } from '@playwright/test';

for (const theme of ['barber', 'beauty']) for (const mode of ['dark', 'light']) for (const width of [320, 390]) {
  test(`${theme} ${mode} ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route('**/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: `export function useAuth() { return { role: 'owner', userType: '${theme}', teamMemberId: null }; }` }));
    await page.route('**/hooks/useTenantLocale.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `export function useTenantLocale() { return { formatMoney: n => 'R$ ' + n.toFixed(2) }; }` }));
    await page.route('**/hooks/useChairHour.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `const item = { id:'1',name:'Ana Profissional',available_minutes:600,worked_minutes:300,estimated_count:1,revenue_per_worked_hour:100,revenue_per_available_hour:50,occupancy:0.5,cost_per_hour:25,margin_per_hour:25,idle_cost:125 }; export function useChairHour() { return { data: { professionals:[item],total:item,services:[{name:'Corte',status:'loss'},{name:'Barba',status:'low'}] }, status:'ready', retry() {} }; }` }));
    await page.goto(`/e2e/chair-hour-harness/?theme=${theme}&mode=${mode}`);
    await expect(page.getByRole('heading', { name: theme === 'beauty' ? 'Sua hora de atendimento' : 'Sua hora de cadeira' })).toBeVisible();
    await expect(page.getByText('Não cobre o custo da hora')).toBeVisible();
    await expect(page.getByText(/^Sobra pouco/)).toBeVisible();
    await page.getByLabel('O que é "Rende por hora aberta"?').click();
    await expect(page.getByText(/R\$ 600 em 10 horas abertas/)).toBeVisible();
    expect(await page.evaluate(() => [...document.querySelectorAll('button, a, summary')].every(el => { const r = el.getBoundingClientRect(); return r.width === 0 || (r.width >= 44 && r.height >= 44); }))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: `/workspace/artifacts/chair-local-20261108/chair-hour-${theme}-${mode}-${width}.png`, fullPage: true });
  });
}

for (const theme of ['barber', 'beauty']) for (const mode of ['dark', 'light']) for (const width of [320, 390]) {
  test(`checkout ${theme} ${mode} ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route('**/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: `export function useAuth() { return { role:'owner',userType:'${theme}',region:'BR',companyId:'fixture-company',user:{id:'fixture-owner'} }; }` }));
    await page.route('**/hooks/useCatalog.ts*', route => route.fulfill({ contentType:'application/javascript',body:`const data=[];export function useProducts(){return {data};} export function useAppointmentProductLines(){return {data,isFetched:true};}` }));
    await page.route('**/hooks/useSubscriptionDiscount.ts*', route => route.fulfill({ contentType:'application/javascript',body:`export function useSubscriptionDiscount(){return {hasActiveSubscription:false,fullyCovered:false,coveredCents:0};}` }));
    await page.route('**/hooks/useScheduling.ts*', route => route.fulfill({ contentType:'application/javascript',body:`const reset=()=>{};export function useCheckout(){return {isPending:false,reset,mutateAsync:async input=>{window.fixtureCheckout=input;}};}` }));
    await page.goto(`/e2e/chair-hour-harness/?theme=${theme}&mode=${mode}&screen=checkout`);
    await expect(page.getByLabel('Tempo de trabalho')).toHaveValue('40');
    await expect(page.getByText('Estimado pela agenda')).toBeVisible();
    await page.getByRole('button',{name:'Aumentar 10 minutos'}).click();
    await expect(page.getByLabel('Tempo de trabalho')).toHaveValue('50');
    await expect(page.getByText('Ajustado por você')).toBeVisible();
    await page.getByRole('button',{name:'Diminuir 10 minutos'}).click();
    await expect(page.getByText('Estimado pela agenda')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({path:`/workspace/artifacts/chair-local-20261108/checkout-${theme}-${mode}-${width}.png`,fullPage:true});
    await page.getByLabel('Tempo de trabalho').fill('55');
    await page.getByText('PIX',{exact:true}).click();
    await page.getByLabel(/Recebido por/i).selectOption('owner');
    await page.getByRole('button',{name:'Confirmar Pagamento'}).click();
    await expect.poll(()=>page.evaluate(()=>(window as unknown as {fixtureCheckout?:{actualDurationMinutes:number}}).fixtureCheckout?.actualDurationMinutes)).toBe(55);
  });
}
