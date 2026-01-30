import asyncio
from playwright import async_api

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

        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)

        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass

        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:3000
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # -> Navigate directly to a likely public booking URL (try /booking). If that fails, try /public or /book.
        await page.goto("http://localhost:3000/booking", wait_until="commit", timeout=10000)
        
        # -> Navigate to http://localhost:3000/public and check the page for booking UI elements (service list, calendar/time slots, client info form). If none found, try /book or other likely public booking URLs.
        await page.goto("http://localhost:3000/public", wait_until="commit", timeout=10000)
        
        # -> Fetch the client-side entry script at /index.tsx to inspect HTTP response (status, 404, build error text) and any console/build error output.
        await page.goto("http://localhost:3000/index.tsx", wait_until="commit", timeout=10000)
        
        # -> Open and inspect the App source at /App.tsx to find runtime errors or problematic code that might prevent the SPA from mounting (look for references to missing DOM elements, runtime-only imports, or code that throws on load).
        await page.goto("http://localhost:3000/App.tsx", wait_until="commit", timeout=10000)
        
        # -> Open the PublicBooking page source (/pages/PublicBooking.tsx) to inspect for code that could block public booking (runtime errors, required env, redirects, or assumptions that prevent the public booking UI from mounting).
        await page.goto("http://localhost:3000/pages/PublicBooking.tsx", wait_until="commit", timeout=10000)
        
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    