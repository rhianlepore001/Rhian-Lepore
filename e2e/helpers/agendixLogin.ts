import type { Page } from '@playwright/test';

export const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

export const ROLES = {
  owner: { email: process.env.E2E_OWNER_EMAIL ?? '', pass: process.env.E2E_OWNER_PASS ?? '' },
  staff: { email: process.env.E2E_STAFF_EMAIL ?? '', pass: process.env.E2E_STAFF_PASS ?? '' },
} as const;

export type Role = keyof typeof ROLES;

export async function login(page: Page, role: Role): Promise<void> {
  const { email, pass } = ROLES[role];
  if (!email || !pass) throw new Error(`Defina E2E_${role.toUpperCase()}_EMAIL/PASS.`);
  await page.goto(`${BASE}/#/login`, { waitUntil: 'load' });
  const entrar = page.getByText('ENTRAR').first();
  await entrar.waitFor({ timeout: 20_000 });
  await page.waitForTimeout(800);
  await entrar.click();
  await page.locator('input[type="email"]').waitFor({ timeout: 20_000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(pass);
  await page.locator('button[type="submit"]').click({ timeout: 5_000 });
  await page.getByText('Olá,').first().waitFor({ timeout: 45_000 });
}
