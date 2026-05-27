---
name: playwright-skill
description: Browser automation, web testing, and screenshot capture using Playwright MCP. Use this skill when the user needs to interact with websites, fill forms, take screenshots, run E2E tests, or scrape web pages via the Playwright MCP server.
---

# Playwright MCP Skill

This skill guides the use of the Playwright MCP server (`@playwright/mcp`) for browser automation inside Claude Code.

## When to Use

Activate this skill when the user asks to:
- Open a web page or navigate to a URL
- Take screenshots of web pages or specific elements
- Fill forms, click buttons, or interact with UI elements
- Extract text/content from web pages
- Run end-to-end (E2E) tests or verify web app behavior
- Scrape data from websites
- Debug web pages (console messages, network requests)

## MCP Configuration

The Playwright MCP server should be configured in the project `mcpServers`:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "env": {}
    }
  }
}
```

## Core Workflow

### 1. Navigate
Use `browser_navigate` to open a URL.

### 2. Snapshot (understand the page)
The MCP server returns accessibility tree snapshots automatically after each action. Use these to identify element targets.

### 3. Interact
- `browser_click` — click an element by target reference
- `browser_fill_form` — fill multiple form fields at once
- `browser_hover` — hover over an element
- `browser_drag` / `browser_drop` — drag and drop
- `browser_file_upload` — upload files

### 4. Extract / Observe
- `browser_evaluate` — run JavaScript and return results
- `browser_console_messages` — read console logs
- `browser_network_requests` — inspect network traffic

### 5. Screenshot
- Implicit in most interactions (snapshots), but for visual verification you can use the vision capability if needed.

### 6. Close
- `browser_close` — close the browser/page when done

## Best Practices

1. **Always navigate first** — every session starts with `browser_navigate`.
2. **Use snapshots for targeting** — rely on the accessibility tree references returned by the server instead of guessing selectors.
3. **Batch form fills** — prefer `browser_fill_form` over multiple individual fill calls.
4. **Read console errors** — after interacting with a page, check `browser_console_messages` with level `error` to catch frontend issues.
5. **Clean up** — call `browser_close` when finished to free resources.
6. **Headed vs headless** — by default the MCP runs headed (visible browser). Use `--headless` arg in `mcpServers` config if you want headless mode.

## Example Session

```
User: "Vai no google.com e busca por 'playwright mcp'"

Agent:
1. browser_navigate -> https://google.com
2. (snapshot shows search input target)
3. browser_fill_form -> [{"name": "q", "value": "playwright mcp"}]
4. (snapshot shows search button or results)
5. browser_click -> target of first result or search button
6. browser_console_messages -> level: error (optional cleanup)
7. browser_close
```

## Security Notes

- Playwright MCP is **not a security boundary**.
- The browser can access any URL the user specifies.
- Do not enter real credentials into forms unless the user explicitly requests it and understands the risk.
- Avoid downloading untrusted files.

## Troubleshooting

- **MCP not starting**: Ensure Node.js 18+ is installed and `npx` works.
- **Browser not opening on Windows**: Headed mode needs a display. Add `--headless` to args if running without a GUI.
- **Element not found**: Refresh snapshot after navigation or async loading; use `browser_evaluate` to wait for elements if needed.
