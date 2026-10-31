import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Cenários de ponta a ponta no Supabase local (dados fictícios). Exige IMPORT_LOCAL_SERVICE_KEY, a chave de serviço do projeto LOCAL,
// usada só para criar um atendimento fictício e consultar o resultado. Rode em uma base recém-preparada (veja import-live.md).
const local = process.env.VITE_SUPABASE_URL!;
const anon = process.env.VITE_SUPABASE_ANON_KEY!;
const service = process.env.IMPORT_LOCAL_SERVICE_KEY!;
const email = process.env.IMPORT_TEST_OTHER_EMAIL!;
const password = process.env.IMPORT_TEST_PASSWORD!;

test.skip(!local || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(local) || !anon || !service || !email || !password, 'Exige Supabase local e usuários fictícios.');

test('importa arquivo latin1 com IDs repetidos, telefones duplicados e preserva o que já foi usado ao desfazer', async ({ page }) => {
  const admin = createClient(local, service, { auth: { persistSession: false } });
  const userId = (await createClient(local, anon, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password })).data.user!.id;
  await page.goto('/e2e/import-live-harness/');
  await page.getByLabel('E-mail de teste').fill(email);
  await page.getByLabel('Senha de teste').fill(password);
  await page.getByRole('button', { name:'Entrar no teste' }).click();
  await page.getByRole('button', { name:'Trinks' }).click();
  await page.getByLabel('Escolher arquivos').setInputFiles([
    { name:'clientes-latin1.csv', mimeType:'text/csv', buffer:Buffer.from('Nome;Celular;ID\nJoão Conceição;11987651111;c-1\nMaria Antônia;11987652222;c-2\nMaria Antonia Repetida;11987652222;c-2\nZé Sem DDD;987653333;c-3\nZé Com DDD;(11) 98765-3333;c-4\nJosé Açaí;+55 11 98765-4444;c-5\n', 'latin1') },
    { name:'servicos.csv', mimeType:'text/csv', buffer:Buffer.from('Nome;Preço;Duração;ID\nCorte Feminino;50;45;s-1\nBarba Terapêutica;35;30;s-2\nCorte Feminino Repetido;60;60;s-1\n', 'utf-8') },
  ]);
  await page.getByRole('button', { name:'Analisar arquivos' }).click();
  await page.getByRole('button', { name:'Preparar revisão' }).click();
  await expect(page.getByText(/7 linhas prontas · 2 precisam de atenção/)).toBeVisible();
  await page.getByRole('button', { name:'Confirmar importação' }).click();
  await expect(page.getByRole('heading', { name:'Resultado da importação' })).toBeVisible();
  const csv = page.locator('section').filter({ has:page.getByRole('heading', { name:'clientes-latin1.csv' }) });
  const services = page.locator('section').filter({ has:page.getByRole('heading', { name:'servicos.csv' }) });
  await expect(csv).toContainText('6 linhas · 4 importados · 0 atualizados · 0 ignorados · 2 pendentes');
  await expect(services).toContainText('3 linhas · 2 importados · 0 atualizados · 1 ignorado · 0 pendentes');

  const clients = await admin.from('clients').select('id,name,phone').eq('user_id', userId).order('name');
  expect(clients.error).toBeNull();
  expect(clients.data!.map(row => [row.name, row.phone])).toEqual([['João Conceição', '+5511987651111'], ['José Açaí', '+5511987654444'], ['Maria Antônia', '+5511987652222'], ['Zé Com DDD', '+5511987653333']]);
  const svc = await admin.from('services').select('id,name,price,duration_minutes').eq('user_id', userId).order('name');
  expect(svc.error).toBeNull();
  expect(svc.data!.map(row => [row.name, Number(row.price), row.duration_minutes])).toEqual([['Barba Terapêutica', 35, 30], ['Corte Feminino', 50, 45]]);

  // Um atendimento fictício passa a usar um cliente e um serviço importados (o serviço é citado sem acento e em minúsculas).
  const joao = clients.data!.find(row => row.name === 'João Conceição')!;
  const appointment = await admin.from('appointments').insert({ user_id: userId, client_id: joao.id, service: 'barba terapeutica' }).select('id').single();
  expect(appointment.error).toBeNull();

  await csv.getByRole('button', { name:'Desfazer esta importação' }).click();
  await csv.getByRole('button', { name:'Confirmar desfazer' }).click();
  await expect(page.getByRole('status')).toContainText(/3 removidos ou desvinculados\. 1 preservado por ter sido alterado ou utilizado\./);
  await services.getByRole('button', { name:'Desfazer esta importação' }).click();
  await services.getByRole('button', { name:'Confirmar desfazer' }).click();
  await expect(page.getByRole('status')).toContainText(/1 removido ou desvinculado\. 1 preservado por ter sido alterado ou utilizado\./);

  const afterClients = await admin.from('clients').select('name').eq('user_id', userId).order('name');
  expect(afterClients.data!.map(row => row.name)).toEqual(['João Conceição']);
  const afterServices = await admin.from('services').select('name').eq('user_id', userId);
  expect(afterServices.data!.map(row => row.name)).toEqual(['Barba Terapêutica']);
  const kept = await admin.from('appointments').select('id').eq('id', appointment.data!.id);
  expect(kept.data).toHaveLength(1);
});
