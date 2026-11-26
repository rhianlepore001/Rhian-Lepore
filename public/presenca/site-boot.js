(() => {
  const script = document.currentScript;
  const target = script && script.getAttribute('data-site-target');
  if (!target || !/^\/#\/site\/[a-z0-9][a-z0-9_%-]*(\/servico\/[a-z0-9_%-]+)?$/i.test(target)) return;
  const search = window.location.search || '';
  if (search && !/^\?[a-z0-9_=&%-]*$/i.test(search)) return window.location.replace(target);
  const next = new URL(`${target}${search}`, window.location.origin);
  if (next.origin !== window.location.origin) return;
  window.location.replace(next.href);
})();
