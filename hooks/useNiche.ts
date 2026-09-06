import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export type LandingNiche = 'barber' | 'beauty';
export type NicheResolutionMethod = 'param' | 'storage' | 'selector' | 'toggle' | 'none';

export const NICHE_STORAGE_KEY = 'agendix_nicho';

function normalizeNiche(value: string | null): LandingNiche | null {
  if (value === 'barber' || value === 'barbearia') return 'barber';
  if (value === 'beauty' || value === 'salao' || value === 'salão') return 'beauty';
  return null;
}

function readStoredNiche(): LandingNiche | null {
  try {
    return normalizeNiche(localStorage.getItem(NICHE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function storeNiche(niche: LandingNiche): void {
  try {
    localStorage.setItem(NICHE_STORAGE_KEY, niche);
  } catch {
    // Storage bloqueado não deve impedir a navegação.
  }
}

export function toPublicNiche(niche: LandingNiche | null): 'barbearia' | 'salao' | 'neutro' {
  if (niche === 'barber') return 'barbearia';
  if (niche === 'beauty') return 'salao';
  return 'neutro';
}

export interface NicheState {
  niche: LandingNiche | null;
  method: NicheResolutionMethod;
  setNicho: (niche: LandingNiche) => void;
  trocarNicho: (niche: LandingNiche) => void;
}

export function useNiche(): NicheState {
  const [searchParams] = useSearchParams();
  const queryNiche = normalizeNiche(searchParams.get('nicho'));
  const [niche, setNiche] = useState<LandingNiche | null>(() => queryNiche ?? readStoredNiche());
  const [method, setMethod] = useState<NicheResolutionMethod>(() => {
    if (queryNiche) return 'param';
    return readStoredNiche() ? 'storage' : 'none';
  });

  useEffect(() => {
    if (!queryNiche) return;
    setNiche(queryNiche);
    setMethod('param');
    storeNiche(queryNiche);
  }, [queryNiche]);

  const chooseNiche = (nextNiche: LandingNiche, nextMethod: NicheResolutionMethod): void => {
    setNiche(nextNiche);
    setMethod(nextMethod);
    storeNiche(nextNiche);
  };

  return {
    niche,
    method,
    setNicho: (nextNiche) => chooseNiche(nextNiche, 'selector'),
    trocarNicho: (nextNiche) => chooseNiche(nextNiche, 'toggle'),
  };
}
