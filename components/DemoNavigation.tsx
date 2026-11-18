import React, { useContext, useMemo } from 'react';
import { UNSAFE_LocationContext, UNSAFE_NavigationContext, UNSAFE_RouteContext, type To } from 'react-router-dom';
import { demoPath, getDemoNiche } from '../lib/demo/mode';

/**
 * Faz as páginas reais enxergarem a simulação como se fossem o app autenticado:
 * `useLocation()` devolve o caminho sem o prefixo `/demo/{nicho}` e toda navegação
 * (Link, navigate, useSearchParams) volta a receber o prefixo antes de tocar o histórico.
 */
export const DemoNavigation = ({ children, pathname }: { children: React.ReactNode; pathname: string }) => {
  const navigation = useContext(UNSAFE_NavigationContext);
  const locationContext = useContext(UNSAFE_LocationContext);
  const niche = getDemoNiche();
  const navigationValue = useMemo(() => {
    const map = (to: To): To => typeof to === 'string' ? demoPath(to, niche) : { ...to, ...(to.pathname ? { pathname: demoPath(to.pathname, niche) } : {}) };
    const navigator = navigation.navigator;
    return { ...navigation, navigator: {
      ...navigator,
      createHref: (to: To) => navigator.createHref(map(to)),
      push: (to: To, state?: any, options?: any) => navigator.push(map(to), state, options),
      replace: (to: To, state?: any, options?: any) => navigator.replace(map(to), state, options),
    } };
  }, [navigation, niche]);
  const locationValue = useMemo(() => ({ ...locationContext, location: { ...locationContext.location, pathname } }), [locationContext, pathname]);
  const routeValue = useMemo(() => ({ outlet: null, matches: [], isDataRoute: false }), []);
  return <UNSAFE_NavigationContext.Provider value={navigationValue}>
    <UNSAFE_LocationContext.Provider value={locationValue}>
      <UNSAFE_RouteContext.Provider value={routeValue}>{children}</UNSAFE_RouteContext.Provider>
    </UNSAFE_LocationContext.Provider>
  </UNSAFE_NavigationContext.Provider>;
};
