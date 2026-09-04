import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from './useBrutalTheme';
import { BusinessCopy, getBusinessCopy, resolveBusinessTheme } from '../utils/businessCopy';

/**
 * Textos que mudam entre barbearia e salão/beleza.
 * Preferir este hook em vez de strings fixas "barbearia" na UI.
 */
export function useBusinessCopy(): BusinessCopy & { theme: 'barber' | 'beauty'; isBeauty: boolean } {
  const { userType } = useAuth();
  const { isBeauty } = useBrutalTheme();
  const theme = resolveBusinessTheme(userType ?? (isBeauty ? 'beauty' : 'barber'));
  return {
    ...getBusinessCopy(theme),
    theme,
    isBeauty: theme === 'beauty',
  };
}

/**
 * Páginas públicas sem sessão: derive do perfil do estabelecimento.
 */
export function usePublicBusinessCopy(userType: string | null | undefined): BusinessCopy & { theme: 'barber' | 'beauty' } {
  const theme = resolveBusinessTheme(userType);
  return { ...getBusinessCopy(theme), theme };
}
