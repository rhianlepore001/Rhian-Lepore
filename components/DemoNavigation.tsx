import React, { useContext, useMemo } from 'react';
import { UNSAFE_NavigationContext, type To } from 'react-router-dom';
import { demoPath, getDemoNiche } from '../lib/demo/mode';

export const DemoNavigation = ({ children }: { children: React.ReactNode }) => {
  const navigation = useContext(UNSAFE_NavigationContext);
  const niche = getDemoNiche();
  const value = useMemo(() => {
    const map = (to: To): To => typeof to === 'string' ? demoPath(to, niche) : { ...to, ...(to.pathname ? { pathname: demoPath(to.pathname, niche) } : {}) };
    const navigator = navigation.navigator;
    return { ...navigation, navigator: {
      ...navigator,
      createHref: (to: To) => navigator.createHref(map(to)),
      push: (to: To, state?: any, options?: any) => navigator.push(map(to), state, options),
      replace: (to: To, state?: any, options?: any) => navigator.replace(map(to), state, options),
    } };
  }, [navigation, niche]);
  return <UNSAFE_NavigationContext.Provider value={value}>{children}</UNSAFE_NavigationContext.Provider>;
};
