import { expect, test, type Page } from '@playwright/test';

const dir = process.env.CHAIR_SHOTS_DIR || '/workspace/artifacts/chair-polish-20261109/after';
const owner = `{ id:'',available_minutes:3600,worked_minutes:2520,estimated_count:3,revenue_per_worked_hour:85,revenue_per_available_hour:59.5,occupancy:0.7,cost_per_hour:38,margin_per_hour:21.5,idle_cost:684 }`;
const ana = `{ id:'tm-1',name:'Ana Souza',available_minutes:1800,worked_minutes:1440,estimated_count:1,revenue_per_worked_hour:90,revenue_per_available_hour:72,occupancy:0.8,cost_per_hour:38,margin_per_hour:34,idle_cost:228 }`;
const bruno = `{ id:'tm-2',name:'Bruno Lima',available_minutes:1800,worked_minutes:1080,estimated_count:2,revenue_per_worked_hour:78,revenue_per_available_hour:46.8,occupancy:0.6,cost_per_hour:38,margin_per_hour:8.8,idle_cost:456 }`;
const staffNow = `{ id:'tm-1',available_minutes:1800,worked_minutes:1260,estimated_count:2,revenue_per_worked_hour:85,revenue_per_available_hour:59.5,occupancy:0.7 }`;
const staffPrev = `{ id:'tm-1',available_minutes:1800,worked_minutes:1116,estimated_count:0,revenue_per_worked_hour:78,revenue_per_available_hour:48.36,occupancy:0.62 }`;
const chairHourModule = `export function useChairHour(month, professionalId, endDate, options) {
  if (options && options.enabled === false) return { data: null, status: 'ready', retry() {} };
  const previous = month < '2026-10-01';
  const role = window.__fixtureRole;
  const data = role === 'staff'
    ? { month, role, professionals: [previous ? ${staffPrev} : ${staffNow}] }
    : { month, role, total: ${owner}, professionals: [${ana}, ${bruno}], services: [{ name:'Hidratação', status:'loss' }, { name:'Corte degradê', status:'low' }], services_pending_count: 2 };
  return { data, status: 'ready', retry() {} };
}`;

async function mockAuth(page: Page, theme: string, role: string) {
  await page.addInitScript(r => { (window as unknown as { __fixtureRole: string }).__fixtureRole = r; }, role);
  await page.route('**/contexts/AuthContext.tsx*', route => route.fulfill({ contentType: 'application/javascript', body: `export function useAuth() { return { role:'${role}', userType:'${theme}', region:'BR', companyId:'fixture-company', teamMemberId:${role === 'staff' ? "'tm-1'" : 'null'}, user:{ id:'fixture-user' } }; }` }));
  await page.route('**/hooks/useChairHour.ts*', route => route.fulfill({ contentType: 'application/javascript', body: chairHourModule }));
  await page.route('**/hooks/useCatalog.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `const data=[];export function useProducts(){return {data};} export function useAppointmentProductLines(){return {data,isFetched:true};}` }));
  await page.route('**/hooks/useSubscriptionDiscount.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `export function useSubscriptionDiscount(){return {hasActiveSubscription:false,fullyCovered:false,coveredCents:0};}` }));
  await page.route('**/hooks/useScheduling.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `const reset=()=>{};export function useCheckout(){return {isPending:false,reset,mutateAsync:async()=>{}};}` }));
}

const shots: [string, string][] = [['card', 'owner'], ['card', 'staff'], ['checkout', 'owner'], ['settings', 'owner']];
for (const [screen, role] of shots) for (const theme of ['barber', 'beauty']) for (const mode of ['light', 'dark']) for (const width of [390, 320]) {
  test(`${screen} ${role} ${theme} ${mode} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await mockAuth(page, theme, role);
    await page.goto(`/e2e/chair-hour-harness/?theme=${theme}&mode=${mode}&screen=${screen}`);
    await page.waitForLoadState('networkidle');
    if (screen === 'checkout') await expect(page.getByRole('dialog')).toBeVisible(); else await expect(page.locator('main')).not.toBeEmpty();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    // Contraste AA de todo texto visível (fundo efetivo = primeiro ancestral opaco).
    const low = await page.evaluate(() => {
      const rgb = (c: string) => (c.match(/[\d.]+/g) || []).map(Number);
      const lum = ([r, g, b]: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const bgOf = (el: Element | null): number[] => { let base = [255, 255, 255]; const stack: number[][] = []; for (let n = el; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > 0) { stack.push(c); if ((c[3] ?? 1) >= 1) break; } } for (const c of stack.reverse()) { const a = c[3] ?? 1; base = base.map((v, i) => v * (1 - a) + c[i] * a); } return base; };
      const out: string[] = [];
      document.querySelectorAll('main *, [role=dialog] *').forEach(el => {
        if (!(el instanceof HTMLElement) || el.closest('[aria-hidden=true]') || !el.offsetParent) return;
        const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim());
        if (!own) return;
        const st = getComputedStyle(el); const fg = rgb(st.color); const bg = bgOf(el);
        const a = fg[3] ?? 1; const mixed = fg.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a));
        const [l1, l2] = [lum(mixed), lum(bg)].sort((x, y) => y - x); const ratio = (l1 + 0.05) / (l2 + 0.05);
        const large = parseFloat(st.fontSize) >= 24 || (parseFloat(st.fontSize) >= 18.66 && Number(st.fontWeight) >= 700);
        if (ratio < (large ? 3 : 4.5) && !el.closest('input,select,option,[disabled]') && st.opacity !== '0') out.push(`${el.textContent!.trim().slice(0, 40)} ${ratio.toFixed(2)}`);
      });
      return out;
    });
    if (screen === 'card') expect(low).toEqual([]);
    else if (low.length) console.log(`contraste ${screen}`, low);
    const name = screen === 'card' ? `${role === 'staff' ? 'colaborador' : 'gestor'}` : screen === 'checkout' ? 'fechamento' : 'custos';
    await page.screenshot({ path: `${dir}/${name}-${theme}-${mode}-${width}.png`, fullPage: true });
  });
}
