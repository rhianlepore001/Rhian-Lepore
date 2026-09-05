import { describe, expect, it } from 'vitest';
import {
  CLUB_OWNER_NAV,
  NAVIGATION_ITEMS,
  SETTINGS_ITEMS,
  findActiveSettingsItem,
  isPathActive,
} from '@/constants';

describe('navegação do Clube (dono)', () => {
  it('expõe Clube em Ajustes, distinto de Plano AgendiX', () => {
    const clube = SETTINGS_ITEMS.find((item) => item.path === '/configuracoes/clube');
    const agendix = SETTINGS_ITEMS.find((item) => item.path === '/configuracoes/assinatura');
    expect(clube?.label).toBe('Clube');
    expect(clube?.group).toBe('Negócio');
    expect(agendix?.label).toBe('Plano AgendiX');
    expect(agendix?.group).toBe('Financeiro');
  });

  it('expõe Clube no menu principal só para dono', () => {
    const clube = NAVIGATION_ITEMS.find((item) => item.path === '/clube/assinantes');
    expect(clube?.name).toBe('Clube');
    expect(clube?.ownerOnly).toBe(true);
    expect(clube?.group).toBe('Crescimento');
  });

  it('mantém abas Planos, Pix e Assinantes', () => {
    expect(CLUB_OWNER_NAV.map((item) => item.label)).toEqual(['Planos', 'Pix', 'Assinantes']);
  });

  it('marca Clube ativo em /configuracoes/clube/pix', () => {
    expect(isPathActive('/configuracoes/clube/pix', '/configuracoes/clube')).toBe(true);
    expect(isPathActive('/configuracoes/clube/pix', '/configuracoes/clube', true)).toBe(false);
    expect(findActiveSettingsItem(SETTINGS_ITEMS, '/configuracoes/clube/pix')?.label).toBe('Clube');
  });

  it('não confunde Ajustes com a rota pública /clube/:slug', () => {
    expect(isPathActive('/clube/minha-barbearia', '/clube/assinantes')).toBe(false);
  });
});
