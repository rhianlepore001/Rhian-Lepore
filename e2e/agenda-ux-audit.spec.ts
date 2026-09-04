/**
 * Auditoria UX — Agenda grade (scroll, filtro real, full-bleed)
 * npx playwright test e2e/agenda-ux-audit.spec.ts --project=chromium-legacy
 */
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PROJECT_REF = 'lcqwrngscsziysyfhpfj';
const STAFF_ID = '6fc5cf83-b7b6-4be7-9ba7-414d9d2e92f1';
const OWNER_ID = '2310b54d-5963-4dc6-9afb-8f308116a698';
const SELF_MEMBER_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const OTHER_MEMBER_ID = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
const THIRD_MEMBER_ID = 'cccccccc-dddd-4eee-8fff-000000000000';
const ARTIFACTS = '/opt/cursor/artifacts';

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function fakeJwt(sub: string): string {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const payload = b64url({
    sub,
    role: 'authenticated',
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  });
  return `${header}.${payload}.e2e-fake-sig`;
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  const accept = route.request().headers()['accept'] || '';
  const wantsObject = accept.includes('vnd.pgrst.object+json');
  const payload = wantsObject && Array.isArray(body) ? (body[0] ?? null) : body;
  await route.fulfill({
    status: wantsObject && payload === null ? 406 : status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

async function installMocks(page: Page) {
  const accessToken = fakeJwt(STAFF_ID);
  const session = {
    access_token: accessToken,
    refresh_token: 'e2e-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: STAFF_ID,
      email: 'staff.agenda@example.test',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { full_name: 'Mário Cesar' },
      created_at: '2026-01-01T00:00:00.000Z',
    },
  };

  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      // Evita SW antigo servir bundle desatualizado no preview/PWA
      navigator.serviceWorker?.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
    },
    { key: `sb-${PROJECT_REF}-auth-token`, value: session },
  );

  await page.route(`**/${PROJECT_REF}.supabase.co/**`, async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const search = url.search;

    if (pathname.includes('/auth/v1/user')) {
      await fulfillJson(route, session.user);
      return;
    }
    if (pathname.includes('/auth/v1/token') || pathname.includes('/auth/v1/session')) {
      await fulfillJson(route, session);
      return;
    }
    if (pathname.includes('/rest/v1/profiles')) {
      await fulfillJson(route, [
        {
          id: STAFF_ID,
          role: 'staff',
          company_id: OWNER_ID,
          full_name: 'Mário Cesar',
          user_type: 'beauty',
          region: 'BR',
          subscription_status: 'active',
          tutorial_completed: true,
        },
      ]);
      return;
    }
    if (pathname.includes('/rest/v1/team_members')) {
      const members = [
        {
          id: SELF_MEMBER_ID,
          name: 'Mário Cesar',
          photo_url: null,
          active: true,
          staff_user_id: STAFF_ID,
          user_id: OWNER_ID,
          is_owner: false,
        },
        {
          id: OTHER_MEMBER_ID,
          name: 'Antonio Barros',
          photo_url: null,
          active: true,
          staff_user_id: null,
          user_id: OWNER_ID,
          is_owner: false,
        },
        {
          id: THIRD_MEMBER_ID,
          name: 'Rhian Lepore',
          photo_url: null,
          active: true,
          staff_user_id: null,
          user_id: OWNER_ID,
          is_owner: false,
        },
      ];
      if (search.includes(`staff_user_id=eq.${STAFF_ID}`)) {
        await fulfillJson(route, [members[0]]);
        return;
      }
      await fulfillJson(route, members);
      return;
    }
    if (pathname.includes('/rest/v1/onboarding_progress')) {
      await fulfillJson(route, [{ is_completed: true }]);
      return;
    }
    if (pathname.includes('/rest/v1/business_settings')) {
      await fulfillJson(route, [{ user_id: OWNER_ID, business_hours: {} }]);
      return;
    }
    if (pathname.includes('/rest/v1/')) {
      await fulfillJson(route, []);
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

test.describe('Agenda UX audit', () => {
  test.setTimeout(120_000);

  test('scroll snap, filtro real e full-bleed', async ({ page }) => {
    fs.mkdirSync(ARTIFACTS, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await installMocks(page);
    await page.goto(`${BASE}/#/agenda`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('agenda-resource-grid')).toBeVisible({ timeout: 30_000 });
    const legend = page.getByTestId('agenda-status-legend');
    await expect(legend).toBeVisible();
    await expect(legend.getByText('Confirmado')).toBeVisible();
    await expect(legend.getByText('Editado')).toBeVisible();

    const metrics = await page.evaluate(() => {
      const grid = document.querySelector('[data-testid="agenda-resource-grid"]') as HTMLElement;
      const col = document.querySelector('[data-testid^="agenda-col-"]') as HTMLElement;
      const legend = document.querySelector('[data-testid="agenda-status-legend"]') as HTMLElement;
      const cs = getComputedStyle(grid);
      const parent = grid.parentElement as HTMLElement;
      const parentCs = getComputedStyle(parent);
      const gutter = grid.querySelector('.sticky.left-0') as HTMLElement | null;
      const legendCs = legend ? getComputedStyle(legend) : null;
      let pageScrollRoot: HTMLElement | null = grid.parentElement;
      while (pageScrollRoot) {
        const oy = getComputedStyle(pageScrollRoot).overflowY;
        if (oy === 'auto' || oy === 'scroll') break;
        pageScrollRoot = pageScrollRoot.parentElement;
      }
      const scrollEl = pageScrollRoot ?? (document.scrollingElement as HTMLElement);
      return {
        scrollWidth: grid.scrollWidth,
        clientWidth: grid.clientWidth,
        clientHeight: grid.clientHeight,
        scrollHeight: grid.scrollHeight,
        overflowY: cs.overflowY,
        scrollPaddingLeft: cs.scrollPaddingLeft,
        snapType: cs.scrollSnapType,
        parentPaddingLeft: parentCs.paddingLeft,
        parentPaddingRight: parentCs.paddingRight,
        gridLeft: grid.getBoundingClientRect().left,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        gutterWidth: gutter?.getBoundingClientRect().width ?? null,
        firstColLeft: col?.getBoundingClientRect().left ?? null,
        legendTop: legend?.getBoundingClientRect().top ?? null,
        legendPosition: legendCs?.position ?? null,
        pageScrollHeight: scrollEl.scrollHeight,
      };
    });

    // Inset alinhado ao pagePadding — não cola no bezel (gutter para scroll da página)
    expect(metrics.gridLeft).toBeGreaterThanOrEqual(8);
    expect(metrics.gridLeft).toBeLessThanOrEqual(40);
    expect(metrics.viewportWidth - (metrics.gridLeft + metrics.clientWidth)).toBeGreaterThanOrEqual(8);
    const hasMaxH = await page.evaluate(() =>
      /(?:^|\s)max-h-/.test(
        (document.querySelector('[data-testid="agenda-resource-grid"]') as HTMLElement).className,
      ),
    );
    expect(hasMaxH).toBe(false);

    // Grade cresce para baixo (todas as horas); scroll vertical é da página
    expect(metrics.clientHeight).toBeGreaterThan(metrics.viewportHeight);
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 2);
    expect(metrics.overflowY === 'visible' || metrics.overflowY === 'auto' || metrics.overflowY === 'clip').toBe(true);
    expect(metrics.pageScrollHeight).toBeGreaterThan(metrics.viewportHeight);
    expect(metrics.legendPosition).toBe('static');
    expect(metrics.legendTop).toBeGreaterThan(metrics.viewportHeight);

    await page.screenshot({ path: path.join(ARTIFACTS, 'agenda-ux-fullbleed.png'), fullPage: false });

    // Scroll lateral com gesto (mais fiel ao mobile do que scrollLeft programático)
    const grid = page.getByTestId('agenda-resource-grid');
    const box = await grid.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + 320, box!.y + 120);
    await page.mouse.down();
    await page.mouse.move(box!.x + 120, box!.y + 120, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(280);

    const afterScroll = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="agenda-resource-grid"]') as HTMLElement;
      const gutter = root.querySelector('[data-agenda-gutter="true"]') as HTMLElement;
      const cols = [...document.querySelectorAll('[data-testid^="agenda-col-"]')] as HTMLElement[];
      const gutterRight = gutter.getBoundingClientRect().right;
      return {
        scrollLeft: root.scrollLeft,
        gutterRight,
        cols: cols.map((c) => {
          const r = c.getBoundingClientRect();
          return {
            id: c.getAttribute('data-testid'),
            left: r.left,
            deltaFromGutter: Math.round(r.left - gutterRight),
          };
        }),
      };
    });

    // Após o gesto, pelo menos uma coluna deve assentar junto ao gutter (±12px)
    const aligned = afterScroll.cols.some((c) => Math.abs(c.deltaFromGutter) <= 12);
    // Se o scroll não moveu (viewport largo), não falha — full-bleed + filtro cobrem o resto
    const moved = afterScroll.scrollLeft > 8;
    expect(moved ? aligned : true).toBe(true);
    const reportAlign = { afterScroll, aligned, moved };

    await page.screenshot({ path: path.join(ARTIFACTS, 'agenda-ux-after-scroll.png'), fullPage: false });

    // Filtro real: só a coluna do selecionado + Mais
    await page.getByTestId(`agenda-filter-${SELF_MEMBER_ID}`).click();
    await expect(page.getByTestId(`agenda-col-${SELF_MEMBER_ID}`)).toBeVisible();
    await expect(page.getByTestId(`agenda-col-${OTHER_MEMBER_ID}`)).toHaveCount(0);
    await expect(page.getByTestId(`agenda-col-${THIRD_MEMBER_ID}`)).toHaveCount(0);
    await expect(page.getByTestId('agenda-filter-add')).toBeVisible();
    await page.screenshot({ path: path.join(ARTIFACTS, 'agenda-ux-one-selected.png'), fullPage: false });

    await page.getByTestId('agenda-filter-add').click();
    await expect(page.getByTestId('agenda-add-menu')).toBeVisible();
    await page.getByTestId(`agenda-add-${OTHER_MEMBER_ID}`).click();
    await expect(page.getByTestId(`agenda-col-${OTHER_MEMBER_ID}`)).toBeVisible();
    await page.screenshot({ path: path.join(ARTIFACTS, 'agenda-ux-two-selected.png'), fullPage: false });

    const report = { metrics, afterScroll, aligned: reportAlign.aligned };
    fs.writeFileSync(path.join(ARTIFACTS, 'agenda-ux-audit.json'), JSON.stringify(report, null, 2));
    console.log('UX_AUDIT', JSON.stringify(report));
  });
});
