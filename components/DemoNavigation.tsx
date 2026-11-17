import React, { useContext, useMemo, useEffect, useRef, useState } from 'react';
import { UNSAFE_NavigationContext, type To } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

export const DemoScreenNavigation = ({ children, locationKey }: { children: React.ReactNode; locationKey: string }) => {
  const navRef = useRef<HTMLElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => {
      setOverflow(nav.scrollWidth > nav.clientWidth + 2);
      setAtEnd(nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 2);
    };
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    nav.addEventListener('scroll', update, { passive: true });
    update();
    return () => { observer.disconnect(); nav.removeEventListener('scroll', update); };
  }, [locationKey]);
  return <div className={`demo-nav-wrap${overflow ? ' has-overflow' : ''}${atEnd ? ' at-end' : ''}`}>
    <nav id="demo-screens" ref={navRef} className="demo-nav" aria-label="Telas da simulação">{children}</nav>
    {overflow && <button className="demo-nav-scroll" aria-label={atEnd ? 'Ver telas anteriores' : 'Ver mais telas'} aria-controls="demo-screens" onClick={() => {
      const nav = navRef.current;
      if (nav) nav.scrollTo({ left: atEnd ? 0 : nav.scrollWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }}>{atEnd ? <ChevronLeft size={20} aria-hidden="true" /> : <ChevronRight size={20} aria-hidden="true" />}</button>}
  </div>;
};
