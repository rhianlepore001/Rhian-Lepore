import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const local = process.env.VITE_SUPABASE_URL!;
const anon = process.env.VITE_SUPABASE_ANON_KEY!;
const email = process.env.IMPORT_TEST_EMAIL!;
const password = process.env.IMPORT_TEST_PASSWORD!;

test.skip(!local || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(local) || !anon || !email || !password || !process.env.IMPORT_TEST_OTHER_EMAIL, 'Exige Supabase local e usuários fictícios.');

test('importa CSV, XLSX e VCF no Supabase local, revisa duplicados e desfaz o lote', async ({ page }) => {
  const db = createClient(local, anon, { auth: { persistSession: false } });
  const login = await db.auth.signInWithPassword({ email, password });
  expect(login.error).toBeNull();
  const company = login.data.user!.id;
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.goto('/e2e/import-live-harness/');
  await page.getByLabel('E-mail de teste').fill(email);
  await page.getByLabel('Senha de teste').fill(password);
  await page.getByRole('button', { name:'Entrar no teste' }).click();
  await page.getByRole('button', { name:'Trinks' }).click();
  await page.getByLabel('Escolher arquivos').setInputFiles([
    { name:'trinks-clientes.csv', mimeType:'text/csv', buffer:Buffer.from('Nome;Celular;ID\nBruno Fictício;11987650001;csv-1\nOutra Pessoa;11999998888;csv-2') },
    { name:'planilha-ficticia-real.xlsx', mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer:readFileSync('test/fixtures/import/planilha-ficticia-real.xlsx') },
    { name:'contatos-ficticios.vcf', mimeType:'text/vcard', buffer:Buffer.from('BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Carla Fictícia\r\nTEL;TYPE=CELL:+5511987650002\r\nUID:vcf-1\r\nEND:VCARD\r\n') },
  ]);
  await page.getByRole('button', { name:'Analisar arquivos' }).click();
  await page.getByRole('button', { name:'Preparar revisão' }).click();
  await expect(page.getByText(/4 linhas prontas/)).toBeVisible();
  await expect(page.getByText(/1 precisa de atenção/)).toBeVisible();
  const before = await db.from('clients').select('name').eq('user_id', company);
  expect(before.error).toBeNull();
  expect(before.data!.map(row => row.name)).toEqual(['Cliente Existente Fictício']);
  await page.getByRole('button', { name:'Confirmar importação' }).click();
  await expect(page.getByRole('heading', { name:'Resultado da importação' })).toBeVisible();
  const csv = page.locator('section').filter({ has:page.getByRole('heading', { name:'trinks-clientes.csv' }) });
  await expect(csv).toContainText('1 importado');
  await expect(csv).toContainText('1 pendente');
  await expect(page.locator('section').filter({ has:page.getByRole('heading', { name:'planilha-ficticia-real.xlsx — Clientes' }) })).toContainText('1 importado');
  await expect(page.locator('section').filter({ has:page.getByRole('heading', { name:'planilha-ficticia-real.xlsx — Serviços' }) })).toContainText('1 importado');
  await expect(page.locator('section').filter({ hasText:'contatos-ficticios.vcf' })).toContainText('1 importado');
  const imported = await db.from('clients').select('name').eq('user_id', company).order('name');
  expect(imported.error).toBeNull();
  expect(imported.data!.map(row => row.name)).toEqual(['Ana Fictícia', 'Bruno Fictício', 'Carla Fictícia', 'Cliente Existente Fictício']);
  const services = await db.from('services').select('name,price,duration_minutes').eq('user_id', company);
  expect(services.error).toBeNull();
  expect(services.data).toEqual([{ name:'Serviço fictício', price:85.5, duration_minutes:90 }]);
  const other = createClient(local, anon, { auth: { persistSession: false } });
  const otherLogin = await other.auth.signInWithPassword({ email: process.env.IMPORT_TEST_OTHER_EMAIL!, password });
  expect(otherLogin.error).toBeNull();
  const foreign = await other.from('import_batches').select('id').eq('company_id', company);
  expect(foreign.error).toBeNull();
  expect(foreign.data).toEqual([]);
  const batches = await db.from('import_batches').select('id').eq('company_id', company).eq('file_name', 'trinks-clientes.csv').single();
  expect(batches.error).toBeNull();
  const forbidden = await other.rpc('undo_import_batch', { p_batch_id: batches.data!.id });
  expect(forbidden.error).not.toBeNull();
  await csv.getByRole('button', { name:'Revisar pendências' }).click();
  await page.getByLabel('Como continuar?').selectOption({ label:'Vincular a Cliente Existente Fictício · 11999998888' });
  await page.getByRole('button', { name:'Salvar escolha' }).click();
  await page.getByRole('button', { name:'Confirmar importação' }).click();
  await expect(csv).toContainText('1 ignorado');
  await csv.getByRole('button', { name:'Desfazer esta importação' }).click();
  await csv.getByRole('button', { name:'Confirmar desfazer' }).click();
  await expect(page.getByRole('status')).toContainText('2 removidos ou desvinculados');
  const after = await db.from('clients').select('name').eq('user_id', company).order('name');
  expect(after.error).toBeNull();
  expect(after.data!.map(row => row.name)).toEqual(['Ana Fictícia', 'Carla Fictícia', 'Cliente Existente Fictício']);
});
