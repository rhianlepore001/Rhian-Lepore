import { useEffect, useRef } from 'react';

/**
 * Rola e foca o banner de erro quando a mensagem muda — necessário em
 * formulários longos no mobile, onde o submit fica fora da viewport.
 */
export function useScrollToError(error: string | null | undefined) {
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!error) return;

    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      errorRef.current?.focus({ preventScroll: true });
    });
  }, [error]);

  return errorRef;
}
