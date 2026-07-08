/**
 * E2E — CICLO DE RECEITA (booking público → agenda → checkout → faturamento)
 *
 * Protege o caminho que gera dinheiro para o dono:
 *   1. Dono garante o link público (Ajustes → Agendamento) — o slug NÃO é gerado
 *      no cadastro, é criado manualmente nessa tela.
 *   2. Cliente final ("João", celular, anônimo, fuso America/Sao_Paulo) agenda
 *      pelo link /#/book/:slug sem criar conta.
 *   3. Dono aceita a solicitação pendente na Agenda e o horário aparece na grade
 *      no horário local correto (o banco guarda UTC).
 *   4. Dono abre o detalhe do agendamento (regressão: o modal fechava no mesmo
 *      clique que o abria — FocusTrap com onDeactivate sob StrictMode) e conclui
 *      o atendimento via "Confirmar e cobrar" (RPC complete_appointment).
 *
 * Pré-requisitos:
 *   - Conta de teste claude.teste@gmail.com com serviço "Corte Masculino",
 *     profissional (dono) e horários seg–sáb cadastrados.
 *   - Migration 20260413_checkout_fields.sql aplicada no banco. Sem ela a RPC
 *     complete_appointment falha com 42703 (column "received_by" does not exist)
 *     e o passo 4 explica exatamente isso na mensagem de erro.
 *
 * Rodar:
 *   E2E_BASE_URL=http://localhost:3001 E2E_OWNER_EMAIL=<email> E2E_OWNER_PASS=<senha> \
 *     npx playwright test e2e/ciclo-de-receita.spec.ts --project=chromium-legacy
 */
import { test, expect, type Browser, type Page } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
// Repo público: credenciais só via env. Ex.: E2E_OWNER_EMAIL=claude.teste@gmail.com E2E_OWNER_PASS=...
const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL ?? '';
const OWNER_PASS = process.env.E2E_OWNER_PASS ?? '';
if (!OWNER_EMAIL || !OWNER_PASS) {
    throw new Error('Defina E2E_OWNER_EMAIL e E2E_OWNER_PASS (conta dona de teste) para rodar este spec.');
}
const TZ = 'America/Sao_Paulo';

// Identidade única por run para achar o agendamento na grade sem ambiguidade
const RUN = Date.now().toString().slice(-6);
const CLIENT_NAME = `João E2E ${RUN}`;
const CLIENT_PHONE = `119${RUN}00`; // 9 dígitos após DDD

/** Dia de amanhã no fuso do negócio (a agenda e o booking usam o mesmo fuso). */
function tomorrowInSaoPaulo(): { dayNumber: string } {
    const fmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: 'numeric' });
    return { dayNumber: fmt.format(new Date(Date.now() + 24 * 60 * 60 * 1000)) };
}

/** Login do dono pela UI (a tela de login tem o seletor Barbearias/Studios antes do form). */
async function loginOwner(page: Page): Promise<void> {
    await page.goto(`${BASE}/#/login`, { waitUntil: 'load' });
    const entrar = page.getByText('ENTRAR').first();
    await entrar.waitFor({ timeout: 20_000 });
    await page.waitForTimeout(1000); // hidratação do seletor de negócio
    await entrar.click();
    const email = page.locator('input[type="email"]');
    await email.waitFor({ timeout: 20_000 });
    await email.fill(OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(OWNER_PASS);
    await page.locator('button[type="submit"]').click({ timeout: 5_000 });
    // Dashboard carregado = sessão e profile prontos
    await page.getByText('Olá,').first().waitFor({ timeout: 30_000 });
}

/**
 * Navegação SPA a partir do dashboard. Deep-link direto (goto /#/agenda) em boot
 * frio redireciona o dono ao wizard de onboarding (corrida no gate — bug conhecido),
 * então navegamos sempre pelo menu.
 */
async function navTo(page: Page, label: string): Promise<void> {
    await page.getByText(label, { exact: true }).locator('visible=true').first().click({ timeout: 10_000 });
    await page.waitForTimeout(1500);
}

test.describe('Ciclo de receita', () => {
    test('João agenda pelo link público e o dono aceita, cobra e fatura', async ({ browser }: { browser: Browser }) => {
        test.setTimeout(300_000);

        // ------------------------------------------------------------------
        // Contexto do DONO (desktop, fuso do negócio)
        // ------------------------------------------------------------------
        const ownerCtx = await browser.newContext({ timezoneId: TZ, locale: 'pt-BR', viewport: { width: 1440, height: 900 } });
        const owner = await ownerCtx.newPage();
        await loginOwner(owner);

        let slug = '';
        await test.step('1. Dono garante o link público de agendamento', async () => {
            // O card do link vive em Ajustes → /configuracoes/agendamento (OwnerRouteGuard).
            // Navegação por hash não recarrega o app, então o deep-link aqui é seguro.
            await owner.goto(`${BASE}/#/configuracoes/agendamento`);
            const codeEl = owner.locator('code', { hasText: '/#/book/' }).first();
            const setupCard = owner.getByText('Configure seu Link de Agendamento');
            await Promise.race([
                codeEl.waitFor({ timeout: 20_000 }),
                setupCard.waitFor({ timeout: 20_000 }),
            ]);

            if (await setupCard.isVisible().catch(() => false)) {
                // Primeira vez: cria o slug (fricção real do produto — nada gera isso no cadastro)
                await owner.locator('input[placeholder="minha-barbearia"]').fill('barbearia-claude-teste');
                await owner.waitForTimeout(2500); // debounce da checagem de disponibilidade
                await owner.getByRole('button', { name: /Criar Link/i }).click({ timeout: 5_000 });
                await owner.waitForTimeout(6000); // a tela usa window.location.reload()
            }
            await codeEl.waitFor({ timeout: 20_000 });
            const link = (await codeEl.innerText()).trim();
            slug = link.split('/#/book/')[1];
            expect(slug, 'o link público precisa existir para o cliente agendar').toBeTruthy();
        });

        // ------------------------------------------------------------------
        // Contexto do JOÃO (celular, anônimo, mesmo fuso)
        // ------------------------------------------------------------------
        const { dayNumber } = tomorrowInSaoPaulo();
        let bookedTime = '';

        await test.step('2. João agenda pelo link público sem criar conta', async () => {
            const joaoCtx = await browser.newContext({
                timezoneId: TZ,
                locale: 'pt-BR',
                viewport: { width: 390, height: 844 },
                isMobile: true,
                hasTouch: true,
            });
            // finally garante que o contexto não vaza se uma assertion falhar no meio
            try {
                const joao = await joaoCtx.newPage();

                await joao.goto(`${BASE}/#/book/${slug}`, { waitUntil: 'load' });
                const servico = joao.getByText('Corte Masculino').first();
                await servico.waitFor({ timeout: 20_000 });
                await servico.click();
                await joao.getByRole('button', { name: /Continuar/i }).click({ timeout: 5_000 });

                // Profissional: o card usa o primeiro nome em caixa alta; "qualquer um" também serve
                const prof = joao.getByText(/^CLAUDE$/i).first().or(joao.getByText(/QUALQUER PROFISSIONAL/i).first()).first();
                await prof.waitFor({ timeout: 15_000 });
                await prof.click();
                const cont = joao.getByRole('button', { name: /Continuar/i });
                if (await cont.isVisible().catch(() => false)) await cont.click({ timeout: 5_000 });

                // Data: amanhã; se não houver slot (domingo/lotado), avança um dia
                await joao.getByText(/^JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO/i).first()
                    .waitFor({ timeout: 15_000 }).catch(() => { /* cabeçalho do calendário é informativo */ });
                await joao.getByText(dayNumber, { exact: true }).first().click({ timeout: 10_000 });
                await joao.waitForTimeout(3000); // busca de slots
                let slot = joao.getByText(/^\d{2}:\d{2}$/).first();
                if (!(await slot.isVisible().catch(() => false))) {
                    const nextDay = String(Number(dayNumber) + 1);
                    await joao.getByText(nextDay, { exact: true }).first().click({ timeout: 10_000 });
                    await joao.waitForTimeout(3000);
                    slot = joao.getByText(/^\d{2}:\d{2}$/).first();
                }
                await slot.waitFor({ timeout: 10_000 });
                bookedTime = (await slot.innerText()).trim();
                await slot.click();
                await joao.getByRole('button', { name: /Continuar/i }).click({ timeout: 5_000 });

                // Contato + consentimentos
                await joao.locator('input[type="text"], input:not([type])').first().fill(CLIENT_NAME, { timeout: 10_000 });
                await joao.locator('input[type="tel"]').first().fill(CLIENT_PHONE);
                const checks = joao.locator('input[type="checkbox"]');
                const n = await checks.count();
                for (let i = 0; i < n; i++) await checks.nth(i).check({ timeout: 3_000 }).catch(() => { /* opcional */ });

                await joao.getByRole('button', { name: /Confirmar & Agendar/i }).click({ timeout: 5_000 });
                await expect(joao.getByText('AGENDAMENTO CONFIRMADO')).toBeVisible({ timeout: 20_000 });
            } finally {
                await joaoCtx.close();
            }
        });

        await test.step('3. Dono aceita a solicitação e ela aparece na grade no horário local', async () => {
            // A tela de Configurações troca a sidebar pelo menu próprio; voltamos por hash
            // (mesmo documento — não reinicia o app nem cai no gate de onboarding)
            await owner.goto(`${BASE}/#/`);
            await owner.getByText('Olá,').first().waitFor({ timeout: 20_000 });
            await navTo(owner, 'Agenda');

            // Painel "Solicitações Pendentes" — aceita SÓ a deste run (a conta de teste é
            // compartilhada; aceitar tudo aprovaria solicitações que não são deste teste)
            const cardPendente = owner
                .locator('div')
                .filter({ hasText: CLIENT_NAME })
                .filter({ has: owner.getByRole('button', { name: /^Aceitar$/i }) })
                .last(); // .last() = o container mais interno que tem nome + botão
            const aceitar = cardPendente.getByRole('button', { name: /^Aceitar$/i }).first();
            await aceitar.waitFor({ timeout: 20_000 });
            await aceitar.click({ timeout: 5_000 });
            // Modal pós-aceite oferece confirmar por WhatsApp
            const agoraNao = owner.getByRole('button', { name: /Agora não/i });
            await agoraNao.waitFor({ timeout: 10_000 });
            await agoraNao.click();

            // Grade do dia escolhido, no fuso do negócio
            await owner.getByText(dayNumber, { exact: true }).locator('visible=true').first().click({ timeout: 10_000 });
            const cardGrade = owner.locator('div.cursor-pointer').filter({ hasText: CLIENT_NAME }).locator('visible=true').first();
            await expect(cardGrade, 'agendamento aceito deve aparecer na grade do profissional').toBeVisible({ timeout: 20_000 });
        });

        await test.step('4. Dono abre o detalhe e conclui com "Confirmar e cobrar" (PIX)', async () => {
            const cardGrade = owner.locator('div.cursor-pointer').filter({ hasText: CLIENT_NAME }).locator('visible=true').first();
            await cardGrade.click({ timeout: 10_000 });

            // REGRESSÃO: o modal fechava no mesmo clique que o abria (FocusTrap.onDeactivate
            // disparado pelo cleanup do StrictMode). Se esta espera falhar, o bug voltou.
            const detalhe = owner.locator('[role="dialog"]');
            await expect(detalhe, 'modal de detalhes deve permanecer aberto após o clique').toBeVisible({ timeout: 10_000 });
            await expect(detalhe.getByText(CLIENT_NAME)).toBeVisible();
            // O banco grava UTC; "Data e Hora" do modal deve exibir o horário que João
            // escolheu (BRT). O card da grade não mostra o horário — a verificação vive aqui.
            await expect(detalhe, 'horário no detalhe deve ser o que João escolheu (fuso UTC→local)').toContainText(bookedTime);

            await owner.getByRole('button', { name: /Confirmar e cobrar/i }).click({ timeout: 5_000 });
            await owner.getByText('Concluir Atendimento').waitFor({ timeout: 10_000 });
            await owner.getByText('PIX', { exact: true }).locator('visible=true').first().click({ timeout: 5_000 });
            const recebidoPor = owner.locator('select:visible').first();
            if (await recebidoPor.count()) {
                await recebidoPor.selectOption({ index: 1 }).catch(() => { /* já pré-selecionado */ });
            }

            const rpcResposta = owner.waitForResponse(r => r.url().includes('rpc/complete_appointment'), { timeout: 20_000 });
            await owner.getByRole('button', { name: /Confirmar Pagamento/i }).click({ timeout: 5_000 });
            const resposta = await rpcResposta;
            const corpo = resposta.ok() ? null : await resposta.json().catch(() => null);
            expect(
                resposta.status(),
                `complete_appointment falhou (${JSON.stringify(corpo)}). ` +
                'Se o erro for 42703/received_by, aplique supabase/migrations/20260413_checkout_fields.sql no banco.'
            ).toBeLessThan(300);
        });

        await test.step('5. Receita registrada — Financeiro reflete o atendimento', async () => {
            await navTo(owner, 'Dashboard');
            await navTo(owner, 'Financeiro');
            // O serviço concluído (R$ 45,00 no seed da conta de teste) deve constar no financeiro
            await expect(owner.getByText('R$ 45,00').first()).toBeVisible({ timeout: 20_000 });
        });

        await ownerCtx.close();
    });
});
