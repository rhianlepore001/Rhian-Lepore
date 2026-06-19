/**
 * Shared theme switcher for UI audit artifacts
 */
function initThemeToolbar(defaultTheme = 'barber', defaultMode = 'dark') {
  const html = document.documentElement;
  html.setAttribute('data-theme', defaultTheme);
  html.setAttribute('data-mode', defaultMode);

  const themeSelect = document.getElementById('theme-select');
  const modeSelect = document.getElementById('mode-select');
  const tag = document.getElementById('theme-tag');

  function update() {
    const t = themeSelect?.value || defaultTheme;
    const m = modeSelect?.value || defaultMode;
    html.setAttribute('data-theme', t);
    html.setAttribute('data-mode', m);
    if (tag) tag.textContent = `${t} / ${m}`;
  }

  if (themeSelect) themeSelect.addEventListener('change', update);
  if (modeSelect) modeSelect.addEventListener('change', update);
  update();
}
