import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:3000
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # -> Navigate to http://localhost:4173/#/login, wait for the gateway with cards to appear, then click the 'Barbearia' card.
        await page.goto("http://localhost:4173/#/login", wait_until="commit", timeout=10000)
        
        # -> Navigate to the base app URL http://localhost:4173/#/ (same tab) to try loading the gateway/cards ('Barbearia'). If the base renders the gateway, next action will be to click the 'Barbearia' card.
        await page.goto("http://localhost:4173/#/", wait_until="commit", timeout=10000)
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Barbearia').first).to_be_visible(timeout=3000)
        await expect(frame.locator('text=Email').first).to_be_visible(timeout=3000)
        await expect(frame.locator("xpath=//input[@type='email' or contains(@placeholder,'Email') or contains(@name,'email')]").first).to_have_value('rleporesilva@gmail.com', timeout=3000)
        await expect(frame.locator("xpath=//input[@type='password' or contains(@placeholder,'Senha') or contains(@name,'password')]").first).to_have_value('rhianlepore789', timeout=3000)
        await expect(frame.locator('text=Agenda').first).to_be_visible(timeout=3000)
        assert '/#/agenda' in frame.url
        await expect(frame.locator('text=Criar agendamento').first).to_be_visible(timeout=3000)
        await expect(frame.locator("xpath=//input[contains(@placeholder,'Cliente') or contains(@name,'cliente') or contains(@aria-label,'Cliente')]").first).to_have_value('Cliente Teste', timeout=3000)
        await expect(frame.locator('text=Serviço').first).to_be_visible(timeout=3000)
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    