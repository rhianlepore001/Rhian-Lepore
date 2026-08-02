import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function parseHash(): { pathname: string; search: string } {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const qIndex = raw.indexOf('?');
  const pathname = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const search = qIndex === -1 ? '' : raw.slice(qIndex);
  return {
    pathname: pathname.startsWith('/') ? pathname : `/${pathname}`,
    search,
  };
}

/**
 * Mantém React Router alinhado ao hash do browser (rede de segurança).
 * O fix principal de rolatividade é `HashRouter unstable_useTransitions={false}`.
 */
export function HashRouterSync() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;

  useEffect(() => {
    const syncFromHash = () => {
      const { pathname, search } = parseHash();
      const current = locationRef.current;
      if (pathname !== current.pathname || search !== current.search) {
        navigate(`${pathname}${search}`, { replace: true });
      }
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    window.addEventListener('popstate', syncFromHash);
    return () => {
      window.removeEventListener('hashchange', syncFromHash);
      window.removeEventListener('popstate', syncFromHash);
    };
  }, [navigate]);

  return null;
}
