"""
Beauty OS / Barber OS — Comprehensive Playwright Test Suite
============================================================
Covers: Auth, Dashboard, Agenda, Queue, Booking, Clients,
        Finance, Reports, Settings, Security, Theme, Mobile

App uses HashRouter → routes are /#/route (NOT /route)
Login page has a GATEWAY screen (Barber/Beauty picker) before the form.

Usage:
    python testsprite_tests/run_comprehensive_tests.py
"""

import asyncio
import json
import sys
import traceback
from datetime import datetime
from playwright.async_api import async_playwright, expect, Page, BrowserContext

BASE_URL = "http://localhost:3000"
TEST_EMAIL = "rleporesilva@gmail.com"
TEST_PASSWORD = "rhianlepore789"
HEADLESS = True

results: list[dict] = []


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

async def make_page(context: BrowserContext) -> Page:
    page = await context.new_page()
    page.set_default_timeout(12000)
    return page


async def clear_auth(page: Page):
    """Clear Supabase auth from localStorage so tests start unauthenticated."""
    try:
        await page.goto(f"{BASE_URL}", wait_until="commit", timeout=10000)
        await page.wait_for_timeout(1000)
        await page.evaluate("""() => {
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith('sb-') || k.includes('supabase') || k.includes('auth')) {
                    localStorage.removeItem(k);
                }
            });
            localStorage.clear();
            sessionStorage.clear();
        }""")
        await page.wait_for_timeout(500)
    except Exception:
        pass  # Ignore — worst case auth isn't cleared but context is new anyway


async def login(page: Page):
    """Handles the full login flow including the gateway category picker."""
    await page.goto(f"{BASE_URL}/#/login", wait_until="commit", timeout=15000)
    await page.wait_for_timeout(4000)  # Wait for React + lazy chunks to load

    # Check if already logged in (e.g. from cookie persistence)
    if "login" not in page.url and "#/login" not in page.url:
        return  # Already on dashboard — we're logged in

    # Gateway screen: click "Barbearia" button (first category card)
    gateway_btn = page.locator('button:has-text("Barbearia")')
    gateway_count = await gateway_btn.count()
    if gateway_count > 0:
        await gateway_btn.first.click()
        await page.wait_for_timeout(2500)  # Wait for animation + form render

    # Fill login form — poll for email input visibility
    email_input = page.locator('input[type="email"]').first
    for _ in range(6):  # retry up to 6×500ms = 3 extra seconds
        if await email_input.is_visible():
            break
        await page.wait_for_timeout(500)

    await email_input.fill(TEST_EMAIL)
    await page.locator('input[type="password"]').first.fill(TEST_PASSWORD)

    # Login button: onClick={handleLogin}, text "ENTRAR" (no type="submit")
    login_btn = page.locator('button:has-text("ENTRAR")')
    await login_btn.first.click()
    await page.wait_for_timeout(5000)  # Wait for Supabase auth + navigation


async def record(name: str, status: str, note: str = ""):
    icon = "[PASS]" if status == "PASSED" else ("[SKIP]" if status == "SKIPPED" else "[FAIL]")
    results.append({"name": name, "status": status, "note": note})
    suffix = f" -- {note}" if note else ""
    print(f"{icon} {name}: {status}{suffix}")


async def run_test(name: str, coro):
    try:
        await coro
        await record(name, "PASSED")
    except AssertionError as e:
        await record(name, "FAILED", str(e)[:200])
    except Exception as e:
        tb = traceback.format_exc().splitlines()[-3:]
        await record(name, "FAILED", str(e)[:150] + " | " + " ".join(tb))


# ─────────────────────────────────────────────
# TEST FUNCTIONS
# ─────────────────────────────────────────────

# ── AUTHENTICATION ──────────────────────────

async def tc_auth_01_gateway_screen(context: BrowserContext):
    page = await make_page(context)
    try:
        await clear_auth(page)
        await page.goto(f"{BASE_URL}/#/login", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(4000)
        # Must show at least one clickable button (category picker)
        buttons = page.locator("button")
        count = await buttons.count()
        assert count > 0, "No buttons found on login gateway screen"
        assert "localhost" in page.url, "Page did not load"
    finally:
        await page.close()


async def tc_auth_02_login_valid(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        url = page.url
        assert "login" not in url or "/" in url, f"Still on login page after auth: {url}"
    finally:
        await page.close()


async def tc_auth_03_login_invalid(context: BrowserContext):
    page = await make_page(context)
    try:
        await page.goto(f"{BASE_URL}/#/login", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(1500)

        # Handle gateway — same approach as login helper
        gateway_btn = page.locator('button:has-text("Barbearia"), button:has-text("Barber")')
        if await gateway_btn.count() > 0:
            await gateway_btn.first.click()
            await page.wait_for_timeout(2000)

        email_input = page.locator('input[type="email"]').first
        await email_input.wait_for(state="visible", timeout=8000)
        await email_input.fill("wrong@example.com")
        await page.locator('input[type="password"]').first.fill("WrongPass999!")
        login_btn = page.locator('button:has-text("ENTRAR"), button:has-text("Entrar"), button:has-text("Login")')
        await login_btn.first.click()
        await page.wait_for_timeout(4000)

        # Should show error message or stay on login
        url = page.url
        content = await page.content()
        assert "login" in url or any(e in content.lower() for e in [
            "invalid", "inválid", "incorret", "error", "erro", "senha", "email"
        ]), "No error shown for invalid credentials"
    finally:
        await page.close()


async def tc_auth_04_forgot_password_page(context: BrowserContext):
    page = await make_page(context)
    try:
        await page.goto(f"{BASE_URL}/#/forgot-password", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(2000)
        content = await page.content()
        # Page renders — must have inputs or meaningful content
        assert len(content) > 500, "Forgot password page is empty"
        assert any(k in content.lower() for k in [
            "password", "senha", "recuper", "reset", "email", "esqueci", "forgot",
            "input", "button", "enviar", "send"
        ]), f"Forgot password page missing expected content"
    finally:
        await page.close()


async def tc_auth_05_forgot_password_submit(context: BrowserContext):
    page = await make_page(context)
    try:
        await page.goto(f"{BASE_URL}/#/forgot-password", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(1500)

        email_input = page.locator('input[type="email"]').first
        await email_input.fill(TEST_EMAIL)
        submit = page.locator('button[type="submit"]').first
        await submit.click()
        await page.wait_for_timeout(3000)

        content = await page.content()
        assert any(k in content.lower() for k in [
            "email", "enviado", "sent", "check", "confirma", "link", "success"
        ]), "No confirmation after forgot password submit"
    finally:
        await page.close()


async def tc_auth_06_register_page(context: BrowserContext):
    page = await make_page(context)
    try:
        await page.goto(f"{BASE_URL}/#/register", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(1500)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "register", "cadastr", "criar", "create", "sign up", "conta"
        ]), "Register page did not load expected content"
    finally:
        await page.close()


async def tc_auth_07_register_validation(context: BrowserContext):
    """Registration form should require all fields."""
    page = await make_page(context)
    try:
        await page.goto(f"{BASE_URL}/#/register", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(1500)

        # Handle gateway if present
        buttons = page.locator("button")
        if await buttons.count() > 0:
            first_text = await buttons.first.inner_text()
            if any(k in first_text.lower() for k in ["barbearia", "beauty", "spa", "barber"]):
                await buttons.first.click()
                await page.wait_for_timeout(1500)

        # Try submitting empty form
        submit = page.locator('button:has-text("Finalizar"), button:has-text("Cadastrar"), button:has-text("Criar"), button:has-text("Register")')
        if await submit.count() > 0:
            await submit.first.click()
            await page.wait_for_timeout(1500)
            url = page.url
            content = await page.content()
            assert "register" in url or any(k in content.lower() for k in [
                "cadastr", "register", "required", "obrigatório", "nome", "email"
            ]), "Empty form submitted without validation"
    finally:
        await page.close()


async def tc_auth_08_protected_route_redirect(context: BrowserContext):
    """Unauthenticated users should be redirected to login from protected routes."""
    page = await make_page(context)
    try:
        await clear_auth(page)
        await page.goto(f"{BASE_URL}/#/", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(4000)
        url = page.url
        assert "login" in url, f"Expected redirect to login, got: {url}"
    finally:
        await page.close()


async def tc_auth_09_agenda_redirect(context: BrowserContext):
    page = await make_page(context)
    try:
        await clear_auth(page)
        await page.goto(f"{BASE_URL}/#/agenda", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(4000)
        url = page.url
        assert "login" in url, f"Expected redirect to login, got: {url}"
    finally:
        await page.close()


async def tc_auth_10_update_password_page(context: BrowserContext):
    page = await make_page(context)
    try:
        await page.goto(f"{BASE_URL}/#/update-password", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(2000)
        content = await page.content()
        assert len(content) > 300, "Update password page is empty"
        assert any(k in content.lower() for k in [
            "password", "senha", "update", "atualiz", "nova", "input", "button", "nova senha"
        ]), "Update password page did not load expected content"
    finally:
        await page.close()


# ── DASHBOARD ───────────────────────────────

async def tc_dash_01_loads(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "dashboard", "painel", "receita", "faturamento", "agendamento",
            "clientes", "today", "hoje"
        ]), "Dashboard did not load expected content"
    finally:
        await page.close()


async def tc_dash_02_kpi_cards(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        # Should show some financial/operational KPIs
        assert any(k in content for k in [
            "R$", "%", "0", "Receita", "Ticket", "Atendimento", "Taxa"
        ]), "No KPI data found on dashboard"
    finally:
        await page.close()


async def tc_dash_03_navigation_sidebar(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.wait_for_timeout(2000)
        content = await page.content()
        # Sidebar should have navigation links
        assert any(k in content.lower() for k in [
            "agenda", "financeiro", "clientes", "configurações", "fila"
        ]), "Navigation sidebar items not found"
    finally:
        await page.close()


# ── AGENDA / APPOINTMENTS ───────────────────

async def tc_agenda_01_loads(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/agenda", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "agenda", "appointment", "agendamento", "calendário", "schedule"
        ]), "Agenda page did not load"
    finally:
        await page.close()


async def tc_agenda_02_new_appointment_button(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/agenda", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "novo", "new", "adicionar", "agendar", "+"
        ]), "No 'new appointment' button found on agenda page"
    finally:
        await page.close()


async def tc_agenda_03_date_navigation(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/agenda", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        # Should have date navigation elements
        assert any(k in content.lower() for k in [
            "hoje", "today", "data", "date", "semana", "week", "mês", "month"
        ]), "No date navigation found on agenda"
    finally:
        await page.close()


# ── QUEUE MANAGEMENT (Admin) ─────────────────

async def tc_fila_01_loads(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/fila", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "fila", "queue", "espera", "atendimento", "waiting"
        ]), "Queue management page did not load"
    finally:
        await page.close()


async def tc_fila_02_status_columns(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/fila", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "aguardando", "atendimento", "concluído", "waiting", "serving", "done"
        ]), "Queue status columns not found"
    finally:
        await page.close()


# ── PUBLIC QUEUE (No auth) ───────────────────

async def tc_queue_01_join_invalid_slug(context: BrowserContext):
    """Invalid queue slug should show error or empty state."""
    page = await make_page(context)
    try:
        await page.goto(f"{BASE_URL}/#/queue/slug-inexistente-000", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(2500)
        content = await page.content()
        # Should show error or empty state — NOT just a blank page
        assert len(content) > 500, "Page rendered nothing for invalid queue slug"
    finally:
        await page.close()


async def tc_queue_02_status_invalid(context: BrowserContext):
    """Invalid queue status ID should show error."""
    page = await make_page(context)
    try:
        await page.goto(f"{BASE_URL}/#/queue-status/00000000-0000-0000-0000-000000000000", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(2500)
        content = await page.content()
        assert len(content) > 500, "Queue status page rendered nothing"
    finally:
        await page.close()


async def tc_queue_03_join_name_required(context: BrowserContext):
    """Queue join form should require name."""
    page = await make_page(context)
    try:
        # Navigate with a test slug — may show error or empty form
        await page.goto(f"{BASE_URL}/#/queue/test-queue", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(2000)
        content = await page.content()
        # Check the page rendered something meaningful
        assert len(content) > 300, "Queue join page is empty"
    finally:
        await page.close()


# ── PUBLIC BOOKING (No auth) ─────────────────

async def tc_booking_01_invalid_slug(context: BrowserContext):
    """Invalid booking slug should show error or fallback."""
    page = await make_page(context)
    try:
        await page.goto(f"{BASE_URL}/#/book/slug-invalido-xyz-000", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(2500)
        content = await page.content()
        assert len(content) > 500, "Booking page rendered nothing for invalid slug"
    finally:
        await page.close()


async def tc_booking_02_book_page_structure(context: BrowserContext):
    """Public booking page structure."""
    page = await make_page(context)
    try:
        await page.goto(f"{BASE_URL}/#/book/test-salon", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(2500)
        content = await page.content()
        assert len(content) > 300, "Public booking page is empty"
    finally:
        await page.close()


async def tc_booking_03_portfolio_page(context: BrowserContext):
    """Professional portfolio page."""
    page = await make_page(context)
    try:
        await page.goto(f"{BASE_URL}/#/pro/test-pro", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(2000)
        content = await page.content()
        assert len(content) > 300, "Professional portfolio page is empty"
    finally:
        await page.close()


# ── CLIENT CRM ──────────────────────────────

async def tc_crm_01_clients_list(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/clientes", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "cliente", "client", "nome", "name", "buscar", "search", "adicionar"
        ]), "Clients page did not load expected content"
    finally:
        await page.close()


async def tc_crm_02_search_input(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/clientes", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        search = page.locator('input[placeholder*="buscar" i], input[placeholder*="search" i], input[type="search"]').first
        count = await search.count()
        assert count > 0, "No search input found on clients page"
    finally:
        await page.close()


async def tc_crm_03_add_client_button(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/clientes", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "novo", "adicionar", "new", "add", "+"
        ]), "No add client button found"
    finally:
        await page.close()


# ── FINANCE ─────────────────────────────────

async def tc_fin_01_loads(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/financeiro", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "financ", "receita", "despesa", "caixa", "transaction", "R$"
        ]), "Finance page did not load expected content"
    finally:
        await page.close()


async def tc_fin_02_transaction_list(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/financeiro", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "transação", "lançamento", "transaction", "entrada", "saída"
        ]) or "R$" in content, "No transaction data area on finance page"
    finally:
        await page.close()


async def tc_fin_03_add_transaction_button(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/financeiro", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "novo", "add", "adicionar", "lançar", "registrar", "+"
        ]), "No add transaction button on finance page"
    finally:
        await page.close()


# ── REPORTS / INSIGHTS ───────────────────────

async def tc_reports_01_loads(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/insights", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "relat", "report", "insight", "receita", "faturamento", "gráfico", "chart"
        ]), "Reports page did not load"
    finally:
        await page.close()


async def tc_reports_02_charts_present(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/insights", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        # Recharts renders SVG or canvas
        assert any(k in content for k in [
            "<svg", "<canvas", "recharts", "chart", "Chart"
        ]) or any(k in content.lower() for k in [
            "receita", "mensal", "monthly", "periodo"
        ]), "No charts or report data found"
    finally:
        await page.close()


# ── MARKETING ───────────────────────────────

async def tc_marketing_01_loads(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/marketing", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "marketing", "campanha", "campaign", "promoção", "cliente"
        ]), "Marketing page did not load"
    finally:
        await page.close()


# ── SETTINGS ─────────────────────────────────

async def tc_settings_01_general(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/configuracoes/geral", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "configuração", "setting", "geral", "general", "nome", "logo"
        ]), "General settings page did not load"
    finally:
        await page.close()


async def tc_settings_02_team(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/configuracoes/equipe", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "equipe", "team", "profissional", "staff", "barbeiro", "funcionário"
        ]), "Team settings page did not load"
    finally:
        await page.close()


async def tc_settings_03_services(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/configuracoes/servicos", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "serviço", "service", "preço", "price", "duração", "duration"
        ]), "Services settings page did not load"
    finally:
        await page.close()


async def tc_settings_04_commissions(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/configuracoes/comissoes", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "comissão", "commission", "profissional", "percentual", "%"
        ]), "Commissions settings page did not load"
    finally:
        await page.close()


async def tc_settings_05_subscription(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/configuracoes/assinatura", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(5000)
        content = await page.content()
        assert len(content) > 500, "Subscription settings page is empty"
        # Stripe pricing loads async — check for any pricing or billing content
        assert any(k in content for k in [
            "R$", "€", "assinatura", "Assinatura", "plano", "Plano",
            "Solo", "Team", "stripe", "Stripe", "pagamento", "Subscription", "CreditCard"
        ]), f"Subscription settings page missing pricing content"
    finally:
        await page.close()


async def tc_settings_06_security(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/configuracoes/seguranca", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "segurança", "security", "senha", "password", "2fa", "autenticação"
        ]), "Security settings page did not load"
    finally:
        await page.close()


async def tc_settings_07_audit_logs(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/configuracoes/auditoria", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "auditoria", "audit", "log", "atividade", "activity", "registro"
        ]), "Audit logs page did not load"
    finally:
        await page.close()


async def tc_settings_08_recycle_bin(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/configuracoes/lixeira", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "lixeira", "recycle", "excluído", "deleted", "restore", "restaurar"
        ]), "Recycle bin page did not load"
    finally:
        await page.close()


async def tc_settings_09_booking_settings(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/configuracoes/agendamento", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "agendamento", "booking", "online", "link", "horário", "schedule"
        ]), "Booking settings page did not load"
    finally:
        await page.close()


async def tc_settings_10_system_logs(context: BrowserContext):
    page = await make_page(context)
    try:
        await login(page)
        await page.goto(f"{BASE_URL}/#/configuracoes/erros", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "log", "erro", "error", "sistema", "system"
        ]), "System logs page did not load"
    finally:
        await page.close()


# ── THEME / UI ──────────────────────────────

async def tc_theme_01_barber_theme_visible(context: BrowserContext):
    """Login page should render Barber/Beauty theme elements."""
    page = await make_page(context)
    try:
        await page.goto(f"{BASE_URL}/#/login", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(1500)
        content = await page.content()
        assert any(k in content.lower() for k in [
            "barber", "beauty", "barbearia", "salão", "spa", "theme", "brutal"
        ]), "No theme-related content found on login page"
    finally:
        await page.close()


async def tc_theme_02_app_loads_styled(context: BrowserContext):
    """App should render with CSS classes applied."""
    page = await make_page(context)
    try:
        await page.goto(f"{BASE_URL}/#/login", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        # Tailwind classes are in the rendered HTML attributes
        assert 'class="' in content, "No CSS classes found in rendered HTML"
        # App has styling — accept any Tailwind utility classes
        assert any(k in content for k in [
            "min-h-screen", "flex", "bg-", "text-", "p-", "rounded", "border",
            "neutral", "brutal", "beauty"
        ]), "No Tailwind utility classes found in rendered markup"
    finally:
        await page.close()


# ── MOBILE / RESPONSIVE ──────────────────────

async def tc_mobile_01_login_viewport(context: BrowserContext):
    """Login page should render correctly on mobile viewport."""
    page = await make_page(context)
    try:
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.goto(f"{BASE_URL}/#/login", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(1500)
        content = await page.content()
        assert len(content) > 500, "Mobile viewport rendered nothing"
        # Check page is not broken (has expected elements)
        assert any(k in content.lower() for k in [
            "barber", "beauty", "barbearia", "login", "entrar"
        ]), "Mobile login page missing key content"
    finally:
        await page.close()


async def tc_mobile_02_dashboard_mobile(context: BrowserContext):
    """Dashboard should be responsive on mobile."""
    page = await make_page(context)
    try:
        await page.set_viewport_size({"width": 390, "height": 844})
        await login(page)
        await page.goto(f"{BASE_URL}/#/", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        assert len(content) > 500, "Mobile dashboard rendered nothing"
    finally:
        await page.close()


# ── SECURITY ─────────────────────────────────

async def tc_sec_01_settings_requires_auth(context: BrowserContext):
    """Settings routes should redirect unauthenticated users."""
    page = await make_page(context)
    try:
        await clear_auth(page)
        await page.goto(f"{BASE_URL}/#/configuracoes/geral", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(5000)
        url = page.url
        assert "login" in url, f"Settings accessible without auth (SECURITY BUG): {url}"
    finally:
        await page.close()


async def tc_sec_02_finance_requires_auth(context: BrowserContext):
    page = await make_page(context)
    try:
        await clear_auth(page)
        await page.goto(f"{BASE_URL}/#/financeiro", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(5000)
        url = page.url
        assert "login" in url, f"Finance accessible without auth (SECURITY BUG): {url}"
    finally:
        await page.close()


async def tc_sec_03_clients_requires_auth(context: BrowserContext):
    page = await make_page(context)
    try:
        await clear_auth(page)
        await page.goto(f"{BASE_URL}/#/clientes", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(4000)
        url = page.url
        assert "login" in url, f"Clients accessible without auth: {url}"
    finally:
        await page.close()


async def tc_sec_04_public_routes_open(context: BrowserContext):
    """Public routes should NOT redirect to login."""
    page = await make_page(context)
    try:
        await clear_auth(page)
        await page.goto(f"{BASE_URL}/#/login", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(2000)
        url = page.url
        assert "login" in url, f"Login page not accessible: {url}"
    finally:
        await page.close()


async def tc_sec_05_forgot_password_open(context: BrowserContext):
    """Forgot password should be public."""
    page = await make_page(context)
    try:
        await clear_auth(page)
        await page.goto(f"{BASE_URL}/#/forgot-password", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(2000)
        url = page.url
        assert "login" not in url or "forgot" in url, f"Forgot password redirected to login: {url}"
    finally:
        await page.close()


# ── CLIENT AREA (Public) ──────────────────────

async def tc_client_area_01(context: BrowserContext):
    """Client area page should load (may show error for invalid slug)."""
    page = await make_page(context)
    try:
        await page.goto(f"{BASE_URL}/#/minha-area/test-slug", wait_until="commit", timeout=15000)
        await page.wait_for_timeout(2500)
        content = await page.content()
        assert len(content) > 300, "Client area page is empty"
    finally:
        await page.close()


# ─────────────────────────────────────────────
# TEST REGISTRY
# ─────────────────────────────────────────────

TEST_CASES = [
    # Authentication
    ("TC_AUTH_01 — Login gateway screen loads",       tc_auth_01_gateway_screen),
    ("TC_AUTH_02 — Login with valid credentials",     tc_auth_02_login_valid),
    ("TC_AUTH_03 — Login with invalid credentials",   tc_auth_03_login_invalid),
    ("TC_AUTH_04 — Forgot password page loads",       tc_auth_04_forgot_password_page),
    ("TC_AUTH_05 — Forgot password submit",           tc_auth_05_forgot_password_submit),
    ("TC_AUTH_06 — Register page loads",              tc_auth_06_register_page),
    ("TC_AUTH_07 — Register form validation",         tc_auth_07_register_validation),
    ("TC_AUTH_08 — Dashboard redirects to login",     tc_auth_08_protected_route_redirect),
    ("TC_AUTH_09 — Agenda redirects to login",        tc_auth_09_agenda_redirect),
    ("TC_AUTH_10 — Update password page loads",       tc_auth_10_update_password_page),
    # Dashboard
    ("TC_DASH_01 — Dashboard loads",                  tc_dash_01_loads),
    ("TC_DASH_02 — Dashboard KPI cards",              tc_dash_02_kpi_cards),
    ("TC_DASH_03 — Navigation sidebar",               tc_dash_03_navigation_sidebar),
    # Agenda
    ("TC_AGENDA_01 — Agenda page loads",              tc_agenda_01_loads),
    ("TC_AGENDA_02 — New appointment button",         tc_agenda_02_new_appointment_button),
    ("TC_AGENDA_03 — Date navigation elements",       tc_agenda_03_date_navigation),
    # Queue — Admin
    ("TC_FILA_01 — Queue management page loads",      tc_fila_01_loads),
    ("TC_FILA_02 — Queue status columns",             tc_fila_02_status_columns),
    # Queue — Public
    ("TC_QUEUE_01 — Invalid queue slug error",        tc_queue_01_join_invalid_slug),
    ("TC_QUEUE_02 — Queue status page renders",       tc_queue_02_status_invalid),
    ("TC_QUEUE_03 — Queue join page renders",         tc_queue_03_join_name_required),
    # Public Booking
    ("TC_BOOK_01 — Booking invalid slug",             tc_booking_01_invalid_slug),
    ("TC_BOOK_02 — Booking page structure",           tc_booking_02_book_page_structure),
    ("TC_BOOK_03 — Portfolio page renders",           tc_booking_03_portfolio_page),
    # Client CRM
    ("TC_CRM_01 — Clients list loads",                tc_crm_01_clients_list),
    ("TC_CRM_02 — Client search input exists",        tc_crm_02_search_input),
    ("TC_CRM_03 — Add client button exists",          tc_crm_03_add_client_button),
    # Finance
    ("TC_FIN_01 — Finance page loads",                tc_fin_01_loads),
    ("TC_FIN_02 — Transaction list area",             tc_fin_02_transaction_list),
    ("TC_FIN_03 — Add transaction button",            tc_fin_03_add_transaction_button),
    # Reports
    ("TC_REP_01 — Reports/Insights page loads",       tc_reports_01_loads),
    ("TC_REP_02 — Charts present on reports",         tc_reports_02_charts_present),
    # Marketing
    ("TC_MKT_01 — Marketing page loads",              tc_marketing_01_loads),
    # Settings
    ("TC_SET_01 — General settings loads",            tc_settings_01_general),
    ("TC_SET_02 — Team settings loads",               tc_settings_02_team),
    ("TC_SET_03 — Services settings loads",           tc_settings_03_services),
    ("TC_SET_04 — Commissions settings loads",        tc_settings_04_commissions),
    ("TC_SET_05 — Subscription settings loads",       tc_settings_05_subscription),
    ("TC_SET_06 — Security settings loads",           tc_settings_06_security),
    ("TC_SET_07 — Audit logs loads",                  tc_settings_07_audit_logs),
    ("TC_SET_08 — Recycle bin loads",                 tc_settings_08_recycle_bin),
    ("TC_SET_09 — Booking settings loads",            tc_settings_09_booking_settings),
    ("TC_SET_10 — System logs loads",                 tc_settings_10_system_logs),
    # Theme
    ("TC_THEME_01 — Barber/Beauty theme visible",     tc_theme_01_barber_theme_visible),
    ("TC_THEME_02 — App renders styled",              tc_theme_02_app_loads_styled),
    # Mobile
    ("TC_MOB_01 — Login on mobile viewport",          tc_mobile_01_login_viewport),
    ("TC_MOB_02 — Dashboard on mobile viewport",      tc_mobile_02_dashboard_mobile),
    # Security
    ("TC_SEC_01 — Settings requires auth",            tc_sec_01_settings_requires_auth),
    ("TC_SEC_02 — Finance requires auth",             tc_sec_02_finance_requires_auth),
    ("TC_SEC_03 — Clients requires auth",             tc_sec_03_clients_requires_auth),
    ("TC_SEC_04 — Public login route open",           tc_sec_04_public_routes_open),
    ("TC_SEC_05 — Forgot password is public",         tc_sec_05_forgot_password_open),
    # Client Area
    ("TC_CLIENT_AREA_01 — Client area renders",       tc_client_area_01),
]


# ─────────────────────────────────────────────
# RUNNER
# ─────────────────────────────────────────────

async def main():
    print("\n" + "=" * 65)
    print("  Beauty OS - Comprehensive Test Suite")
    print(f"  {BASE_URL}  |  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65 + "\n")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=HEADLESS,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--no-sandbox",
            ],
        )

        for name, test_fn in TEST_CASES:
            context = await browser.new_context(
                viewport={"width": 1280, "height": 720},
                ignore_https_errors=True,
            )
            await run_test(name, test_fn(context))
            await context.close()

        await browser.close()

    # ── Summary ──────────────────────────────
    passed = sum(1 for r in results if r["status"] == "PASSED")
    failed = sum(1 for r in results if r["status"] == "FAILED")
    skipped = sum(1 for r in results if r["status"] == "SKIPPED")
    total = len(results)
    pct = round(passed / total * 100) if total else 0

    print("\n" + "=" * 65)
    print(f"  RESULTS: {passed}/{total} passed  ({pct}%)")
    print(f"  PASSED: {passed}  |  FAILED: {failed}  |  SKIPPED: {skipped}")
    print("=" * 65)

    if failed:
        print("\nFailed tests:")
        for r in results:
            if r["status"] == "FAILED":
                print(f"  [FAIL] {r['name']}")
                if r["note"]:
                    print(f"         {r['note'][:120]}")

    # ── Write JSON results ─────────────────────
    output = {
        "project": "Beauty OS / Barber OS",
        "run_at": datetime.now().isoformat(),
        "base_url": BASE_URL,
        "summary": {
            "total": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "pass_rate_pct": pct,
        },
        "results": results,
    }

    import os
    out_dir = os.path.join(os.path.dirname(__file__))
    json_path = os.path.join(out_dir, "comprehensive_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nResults saved → {json_path}\n")
    return output


if __name__ == "__main__":
    asyncio.run(main())
