(function () {
  var hash = window.location.hash || '';
  if (/^#\/(login|register|forgot-password)\/?(\?|$)/.test(hash)) {
    document.documentElement.setAttribute('data-theme', 'barber');
    document.documentElement.setAttribute('data-mode', 'dark');
    return;
  }
  var mode = localStorage.getItem('agendix_color_mode') || 'dark';
  document.documentElement.setAttribute('data-mode', mode);
})();

(function () {
  var hash = window.location.hash;
  // Rotas públicas usam HashRouter: #/book/, #/queue/, #/pro/, #/minha-area/
  if (/^#\/(book|queue|queue-status|pro|minha-area|avaliar)\//.test(hash)) {
    document.documentElement.setAttribute('data-public-theme', 'obsidian');
    document.documentElement.style.backgroundColor = '#12100E';
    document.body && (document.body.style.backgroundColor = '#12100E');
    // Em rotas públicas, não aplicar data-mode do usuário
    document.documentElement.removeAttribute('data-mode');
  }
})();
