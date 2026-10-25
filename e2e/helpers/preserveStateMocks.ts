import { expect, type Page } from '@playwright/test';
import { APT_ID, OWNER_ID, installRemarcarMocks } from './remarcarMocks';

export const DRAFT_PROJECT = 'draft-fixture';
export const DRAFT_PREFIX = `agendix:draft:v1:${OWNER_ID}:${OWNER_ID}:`;

export async function installPreserveStateMocks(page: Page) {
  const unexpected: string[] = [];
  await page.context().route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    unexpected.push(url.origin);
    return route.abort('blockedbyclient');
  });
  const handle = await installRemarcarMocks(page, { role: 'owner', projectRef: DRAFT_PROJECT });
  await page.route('**/rest/v1/rpc/create_secure_booking', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, booking_id: APT_ID }),
  }));
  await page.route('**/auth/v1/logout*', route => route.fulfill({ status: 204, body: '' }));
  return { assertNoLeak: () => { handle.assertNoLeak(); expect(unexpected.filter(origin => origin.includes('supabase'))).toEqual([]); } };
}

export async function authAction(page: Page, action: 'refreshSession' | 'signOut') {
  await page.evaluate(async ({ path, action }) => {
    const { supabase } = await import(path);
    const { error } = await supabase.auth[action]();
    if (error) throw error;
  }, { path: '/lib/supabase.ts', action });
}

export async function draftKeys(page: Page) {
  return page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('agendix:draft:')));
}

export async function flushDrafts(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
}
